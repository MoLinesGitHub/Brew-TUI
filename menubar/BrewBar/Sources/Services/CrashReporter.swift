import Foundation
import os

private let crashLogger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "CrashReporter")

/// Opt-in crash reporting that posts JSON to a user-configured endpoint
/// (typically a self-hosted dashboard on the user's NAS).
///
/// Configuration is read from UserDefaults — set via Settings UI or
/// programmatically:
///   defaults write com.molinesdesigns.brewbar crashReporterEndpoint https://nas.local:port/crash
///   defaults write com.molinesdesigns.brewbar crashReporterEnabled -bool YES
///   defaults write com.molinesdesigns.brewbar crashReporterToken some-shared-secret
///
/// Note: this captures Objective-C `NSException` and explicitly reported
/// errors. Pure-Swift `fatalError` / runtime traps cannot be intercepted
/// without a native crash SDK.
enum CrashReporter {
    private static let endpointKey = "crashReporterEndpoint"
    private static let enabledKey = "crashReporterEnabled"
    private static let tokenKey = "crashReporterToken"
    private static let postTimeout: TimeInterval = 5

    private struct Report: Encodable {
        let app: String
        let version: String
        let platform: String
        let os: String
        let arch: String
        let machineId: String
        let timestamp: String
        let level: String
        let message: String
        let stack: String?
        let context: [String: String]
    }

    private static var endpoint: URL? {
        guard let raw = UserDefaults.standard.string(forKey: endpointKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty
        else { return nil }
        return URL(string: raw)
    }

    private static var token: String? {
        UserDefaults.standard.string(forKey: tokenKey)
    }

    private static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: enabledKey) && endpoint != nil
    }

    /// Install global handlers. Safe to call from `applicationDidFinishLaunching`.
    static func install() {
        guard isEnabled else { return }
        NSSetUncaughtExceptionHandler { exception in
            CrashReporter.send(
                level: "fatal",
                message: exception.reason ?? exception.name.rawValue,
                stack: exception.callStackSymbols.joined(separator: "\n"),
                context: ["kind": "NSException"]
            )
        }
        crashLogger.info("CrashReporter enabled")
    }

    /// Manually report a non-fatal error.
    static func report(_ error: Error, context: [String: String] = [:]) {
        guard isEnabled else { return }
        send(
            level: "error",
            message: error.localizedDescription,
            stack: Thread.callStackSymbols.joined(separator: "\n"),
            context: context
        )
    }

    // MARK: - Internal

    private static func send(level: String, message: String, stack: String?, context: [String: String]) {
        guard let endpoint, isAllowedHost(endpoint) else { return }

        let report = Report(
            app: "brewbar",
            version: marketingVersion(),
            platform: "macos",
            os: ProcessInfo.processInfo.operatingSystemVersionString,
            arch: hardwareArch(),
            machineId: machineId(),
            timestamp: ISO8601DateFormatter().string(from: Date()),
            level: level,
            message: message,
            stack: stack,
            context: context
        )

        guard let body = try? JSONEncoder().encode(report) else { return }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = postTimeout
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = body

        // Fire-and-forget. Synchronous wait would block the host process.
        URLSession.shared.dataTask(with: request) { _, _, error in
            if let error {
                crashLogger.warning("crash POST failed: \(error.localizedDescription, privacy: .public)")
            }
        }.resume()
    }

    private static func isAllowedHost(_ url: URL) -> Bool {
        if url.scheme == "https" { return true }
        if url.scheme == "http", let host = url.host {
            // Allow plain http only for loopback / private LAN destinations.
            return host == "localhost"
                || host.hasPrefix("127.")
                || host.hasPrefix("10.")
                || host.hasPrefix("192.168.")
                || host.hasPrefix("172.16.") || host.hasPrefix("172.17.")
                || host.hasPrefix("172.18.") || host.hasPrefix("172.19.")
                || host.hasPrefix("172.20.") || host.hasPrefix("172.21.")
                || host.hasPrefix("172.22.") || host.hasPrefix("172.23.")
                || host.hasPrefix("172.24.") || host.hasPrefix("172.25.")
                || host.hasPrefix("172.26.") || host.hasPrefix("172.27.")
                || host.hasPrefix("172.28.") || host.hasPrefix("172.29.")
                || host.hasPrefix("172.30.") || host.hasPrefix("172.31.")
                || host == "::1"
        }
        return false
    }

    private static func machineId() -> String {
        let path = NSHomeDirectory() + "/.brew-tui/machine-id"
        if let raw = try? String(contentsOfFile: path, encoding: .utf8) {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty { return trimmed }
        }
        return "unknown"
    }

    private static func marketingVersion() -> String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
    }

    private static func hardwareArch() -> String {
        var size: Int = 0
        sysctlbyname("hw.machine", nil, &size, nil, 0)
        var machine = [CChar](repeating: 0, count: size)
        sysctlbyname("hw.machine", &machine, &size, nil, 0)
        return String(cString: machine)
    }
}
