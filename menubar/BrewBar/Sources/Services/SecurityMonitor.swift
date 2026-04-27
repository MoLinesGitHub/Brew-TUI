import Foundation
import os

private let securityLogger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "SecurityMonitor")

actor SecurityMonitor {
    static let shared = SecurityMonitor()

    private let brewPath: String
    private let cachePath: String

    private static let cacheMaxAge: TimeInterval = 3600 // 1 hora
    private static let batchSize = 100
    private static let osvBatchURL = "https://api.osv.dev/v1/querybatch"

    private init() {
        let candidates = [
            "/opt/homebrew/bin/brew",
            "/usr/local/bin/brew",
            "/home/linuxbrew/.linuxbrew/bin/brew",
        ]
        brewPath = candidates.first {
            FileManager.default.isExecutableFile(atPath: $0)
        } ?? candidates[0]

        cachePath = NSHomeDirectory() + "/.brew-tui/cve-cache.json"
    }

    // MARK: - Public API

    /// Retorna SOLO los CVEs nuevos desde el último check.
    /// Si el cache es válido (< 1h), retorna vacío sin consultar OSV.
    func checkForNewVulnerabilities() async -> [CVEAlert] {
        let existingCache = await loadCache()

        // Si el cache es reciente, no re-consultar
        if let cache = existingCache,
           Date().timeIntervalSince(cache.checkedAt) < Self.cacheMaxAge {
            securityLogger.info("CVE cache is fresh, skipping OSV query")
            return []
        }

        let previousIds: Set<String> = existingCache.map { Set($0.alerts.map(\.id)) } ?? []

        do {
            let packages = try await fetchInstalledPackages()
            guard !packages.isEmpty else {
                securityLogger.info("No installed packages found, skipping CVE check")
                return []
            }

            let alerts = try await queryOSV(packages: packages)
            let newCache = CVECache(checkedAt: Date(), alerts: alerts)
            await saveCache(newCache)

            let newAlerts = alerts.filter { !previousIds.contains($0.id) }
            securityLogger.info("CVE check complete: \(alerts.count) total, \(newAlerts.count) new")
            return newAlerts
        } catch {
            securityLogger.error("CVE check failed: \(error.localizedDescription, privacy: .public)")
            return []
        }
    }

    /// Lee todos los CVEs actuales del cache (sin red).
    func loadCachedAlerts() async -> [CVEAlert] {
        await loadCache()?.alerts ?? []
    }

    // MARK: - Private: Brew

    private func fetchInstalledPackages() async throws -> [(name: String, version: String)] {
        async let formulaData = runBrew(["list", "--versions", "--formula"])
        async let caskData = runBrew(["list", "--cask", "--versions"])

        let (formulaOutput, caskOutput) = try await (formulaData, caskData)

        var packages: [(name: String, version: String)] = []

        // Parseo: cada línea es "name v1 v2 ..." — tomar última versión
        for line in formulaOutput.components(separatedBy: "\n") {
            let parts = line.trimmingCharacters(in: .whitespaces)
                .components(separatedBy: .whitespaces)
                .filter { !$0.isEmpty }
            guard parts.count >= 2 else { continue }
            packages.append((name: parts[0], version: parts[parts.count - 1]))
        }

        for line in caskOutput.components(separatedBy: "\n") {
            let parts = line.trimmingCharacters(in: .whitespaces)
                .components(separatedBy: .whitespaces)
                .filter { !$0.isEmpty }
            guard parts.count >= 2 else { continue }
            packages.append((name: parts[0], version: parts[parts.count - 1]))
        }

        securityLogger.info("Fetched \(packages.count) installed packages for CVE check")
        return packages
    }

    private func runBrew(_ arguments: [String]) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            let process = Process()
            let pipe = Pipe()

            // Thread-safe exactly-once continuation wrapper
            final class OnceGuard: @unchecked Sendable {
                private var resumed = false
                private let lock = NSLock()
                private let continuation: CheckedContinuation<String, Error>

                init(_ continuation: CheckedContinuation<String, Error>) {
                    self.continuation = continuation
                }

                func resume(with result: Result<String, Error>) {
                    lock.lock()
                    defer { lock.unlock() }
                    guard !resumed else { return }
                    resumed = true
                    switch result {
                    case .success(let output): continuation.resume(returning: output)
                    case .failure(let error): continuation.resume(throwing: error)
                    }
                }
            }

            let guard_ = OnceGuard(continuation)

            process.executableURL = URL(fileURLWithPath: brewPath)
            process.arguments = arguments
            process.standardOutput = pipe
            process.standardError = FileHandle.nullDevice
            process.environment = ProcessInfo.processInfo.environment.merging(
                ["HOMEBREW_NO_AUTO_UPDATE": "1"]
            ) { _, new in new }

            process.terminationHandler = { proc in
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if proc.terminationStatus == 0 {
                    let output = String(data: data, encoding: .utf8) ?? ""
                    guard_.resume(with: .success(output))
                } else {
                    guard_.resume(with: .failure(SecurityMonitorError.brewExited(proc.terminationStatus)))
                }
            }

            do {
                try process.run()
            } catch {
                guard_.resume(with: .failure(error))
                return
            }

            Task {
                try? await Task.sleep(for: .seconds(60))
                if process.isRunning {
                    process.terminate()
                    guard_.resume(with: .failure(SecurityMonitorError.timeout))
                }
            }
        }
    }

    // MARK: - Private: OSV

    private func queryOSV(packages: [(name: String, version: String)]) async throws -> [CVEAlert] {
        var allAlerts: [CVEAlert] = []

        // Procesar en batches de 100
        var offset = 0
        while offset < packages.count {
            let end = min(offset + Self.batchSize, packages.count)
            let batch = Array(packages[offset..<end])
            let batchAlerts = try await queryOSVBatch(batch)
            allAlerts.append(contentsOf: batchAlerts)
            offset = end
        }

        return allAlerts
    }

    private func queryOSVBatch(_ packages: [(name: String, version: String)]) async throws -> [CVEAlert] {
        let queries: [[String: Any]] = packages.map { pkg in
            ["package": ["name": pkg.name, "ecosystem": "Homebrew"], "version": pkg.version]
        }
        let body: [String: Any] = ["queries": queries]
        let bodyData = try JSONSerialization.data(withJSONObject: body)

        guard let url = URL(string: Self.osvBatchURL) else {
            throw SecurityMonitorError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SecurityMonitorError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw SecurityMonitorError.httpError(httpResponse.statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let results = json["results"] as? [[String: Any]] else {
            throw SecurityMonitorError.invalidResponseFormat
        }

        guard results.count == packages.count else {
            securityLogger.error("OSV response count mismatch: expected \(packages.count), got \(results.count)")
            throw SecurityMonitorError.responseMismatch
        }

        var alerts: [CVEAlert] = []
        let now = Date()

        for (index, result) in results.enumerated() {
            guard let vulns = result["vulns"] as? [[String: Any]], !vulns.isEmpty else {
                continue
            }

            let packageName = packages[index].name

            for vuln in vulns {
                guard let id = vuln["id"] as? String else { continue }

                let summary = vuln["summary"] as? String ?? "No description available"
                let severity = parseSeverity(from: vuln)
                let fixedVersion = parseFixedVersion(from: vuln)
                let url = parseFirstReference(from: vuln)

                // Parsear fecha published si está disponible
                var publishedAt = now
                if let publishedStr = vuln["published"] as? String {
                    let formatter = ISO8601DateFormatter()
                    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    if let date = formatter.date(from: publishedStr) {
                        publishedAt = date
                    } else {
                        let plainFormatter = ISO8601DateFormatter()
                        plainFormatter.formatOptions = [.withInternetDateTime]
                        publishedAt = plainFormatter.date(from: publishedStr) ?? now
                    }
                }

                let alert = CVEAlert(
                    id: id,
                    packageName: packageName,
                    severity: severity,
                    summary: summary,
                    publishedAt: publishedAt,
                    fixedVersion: fixedVersion,
                    url: url
                )
                alerts.append(alert)
            }
        }

        return alerts
    }

    private func parseSeverity(from vuln: [String: Any]) -> CVEAlert.Severity {
        // 1. database_specific.severity
        if let dbSpecific = vuln["database_specific"] as? [String: Any],
           let sevStr = dbSpecific["severity"] as? String {
            switch sevStr.uppercased() {
            case "CRITICAL": return .critical
            case "HIGH":     return .high
            case "MEDIUM":   return .medium
            case "LOW":      return .low
            default: break
            }
        }

        // 2. CVSS_V3 score
        if let severityArray = vuln["severity"] as? [[String: Any]] {
            for sev in severityArray {
                guard let type = sev["type"] as? String,
                      type == "CVSS_V3",
                      let scoreStr = sev["score"] as? String,
                      let score = Double(scoreStr) else { continue }
                if score >= 9.0 { return .critical }
                if score >= 7.0 { return .high }
                if score >= 4.0 { return .medium }
                return .low
            }
        }

        return .unknown
    }

    private func parseFixedVersion(from vuln: [String: Any]) -> String? {
        guard let affectedArray = vuln["affected"] as? [[String: Any]] else { return nil }
        for affected in affectedArray {
            guard let ranges = affected["ranges"] as? [[String: Any]] else { continue }
            for range in ranges {
                guard let events = range["events"] as? [[String: Any]] else { continue }
                for event in events {
                    if let fixed = event["fixed"] as? String {
                        return fixed
                    }
                }
            }
        }
        return nil
    }

    private func parseFirstReference(from vuln: [String: Any]) -> String? {
        guard let references = vuln["references"] as? [[String: Any]],
              let first = references.first,
              let urlStr = first["url"] as? String else { return nil }
        return urlStr
    }

    // MARK: - Private: Cache

    private func loadCache() async -> CVECache? {
        guard let data = FileManager.default.contents(atPath: cachePath) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(CVECache.self, from: data)
        } catch {
            securityLogger.error("Failed to decode CVE cache: \(error.localizedDescription, privacy: .public)")
            return nil
        }
    }

    private func saveCache(_ cache: CVECache) async {
        let dir = (cachePath as NSString).deletingLastPathComponent
        do {
            try FileManager.default.createDirectory(
                atPath: dir,
                withIntermediateDirectories: true,
                attributes: nil
            )
            let data = try JSONEncoder().encode(cache)
            try data.write(to: URL(fileURLWithPath: cachePath), options: .atomic)
            securityLogger.info("CVE cache saved with \(cache.alerts.count) alerts")
        } catch {
            securityLogger.error("Failed to save CVE cache: \(error.localizedDescription, privacy: .public)")
        }
    }
}

// MARK: - Errors

private enum SecurityMonitorError: LocalizedError {
    case brewExited(Int32)
    case timeout
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case invalidResponseFormat
    case responseMismatch

    var errorDescription: String? {
        switch self {
        case .brewExited(let code): "brew exited with code \(code)"
        case .timeout:              "brew command timed out"
        case .invalidURL:           "Invalid OSV API URL"
        case .invalidResponse:      "Invalid HTTP response"
        case .httpError(let code):  "OSV API returned HTTP \(code)"
        case .invalidResponseFormat: "Unexpected OSV API response format"
        case .responseMismatch:     "OSV API response count mismatch"
        }
    }
}
