import Foundation

struct BrewChecker: Sendable {
    /// Resolved at init time so every call uses the same executable.
    private let brewPath: String

    init() {
        // Apple Silicon default; fall back to Intel/Homebrew-on-Linux paths.
        let candidates = [
            "/opt/homebrew/bin/brew",
            "/usr/local/bin/brew",
            "/home/linuxbrew/.linuxbrew/bin/brew",
        ]
        brewPath = candidates.first {
            FileManager.default.isExecutableFile(atPath: $0)
        } ?? candidates[0]
    }

    private static let processTimeout: TimeInterval = 60 // seconds

    private func run(_ arguments: [String]) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            let process = Process()
            let pipe = Pipe()
            var resumed = false
            let lock = NSLock()

            func resumeOnce(with result: Result<Data, Error>) {
                lock.lock()
                defer { lock.unlock() }
                guard !resumed else { return }
                resumed = true
                switch result {
                case .success(let data): continuation.resume(returning: data)
                case .failure(let error): continuation.resume(throwing: error)
                }
            }

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
                    resumeOnce(with: .success(data))
                } else {
                    resumeOnce(with: .failure(BrewError.processExited(proc.terminationStatus)))
                }
            }

            do {
                try process.run()
            } catch let error as CocoaError where error.code == .fileNoSuchFile || error.code == .fileReadNoSuchFile {
                resumeOnce(with: .failure(BrewError.brewNotInstalled))
                return
            } catch {
                resumeOnce(with: .failure(error))
                return
            }

            // Timeout: kill the process if it takes too long
            DispatchQueue.global().asyncAfter(deadline: .now() + Self.processTimeout) {
                if process.isRunning {
                    process.terminate()
                    resumeOnce(with: .failure(BrewError.timeout))
                }
            }
        }
    }

    func checkOutdated() async throws -> OutdatedResponse {
        let data = try await run(["outdated", "--json=v2"])
        return try JSONDecoder().decode(OutdatedResponse.self, from: data)
    }

    func checkServices() async throws -> [BrewService] {
        let data = try await run(["services", "list", "--json"])
        return try JSONDecoder().decode([BrewService].self, from: data)
    }

    func upgradePackage(_ name: String) async throws {
        _ = try await run(["upgrade", name])
    }

    func upgradeAll() async throws {
        _ = try await run(["upgrade"])
    }
}

enum BrewError: LocalizedError {
    case processExited(Int32)
    case brewNotInstalled
    case timeout

    var errorDescription: String? {
        switch self {
        case .processExited(let code):
            String(format: String(localized: "brew exited with code %lld"), Int64(code))
        case .brewNotInstalled:
            String(localized: "Homebrew is not installed. Install it from https://brew.sh")
        case .timeout:
            String(localized: "brew command timed out")
        }
    }
}
