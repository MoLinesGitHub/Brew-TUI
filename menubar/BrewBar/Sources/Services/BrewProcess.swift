import Foundation
import os

private let brewProcessLogger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "BrewProcess")

enum BrewProcessError: LocalizedError {
    case brewNotInstalled
    case processExited(Int32)
    case timeout

    var errorDescription: String? {
        switch self {
        case .brewNotInstalled:
            String(localized: "Homebrew is not installed. Install it from https://brew.sh")
        case .processExited(let code):
            String(format: String(localized: "brew exited with code %lld"), Int64(code))
        case .timeout:
            String(localized: "brew command timed out")
        }
    }
}

/// Resolves the Homebrew executable. Apple Silicon default with Intel/Linux fallbacks.
enum BrewExecutable {
    static let path: String = {
        let candidates = [
            "/opt/homebrew/bin/brew",
            "/usr/local/bin/brew",
            "/home/linuxbrew/.linuxbrew/bin/brew",
        ]
        return candidates.first {
            FileManager.default.isExecutableFile(atPath: $0)
        } ?? candidates[0]
    }()
}

/// Shared brew process runner. Spawns `brew` with the given arguments, enforces a
/// timeout, and returns stdout as `Data`. The timeout `Task` is cancelled when the
/// process terminates normally so it does not outlive the call.
enum BrewProcess {
    static let defaultTimeout: TimeInterval = 60

    static func run(
        _ arguments: [String],
        suppressAutoUpdate: Bool = true,
        timeout: TimeInterval = BrewProcess.defaultTimeout,
        executable: String = BrewExecutable.path
    ) async throws -> Data {
        brewProcessLogger.info("Running brew \(arguments.joined(separator: " "), privacy: .public)")

        // Thread-safe exactly-once continuation wrapper. The continuation, the
        // Process and the Pipe all cross actor boundaries via the termination
        // handler (GCD thread) and the timeout Task. The lock guarantees a
        // single resume(...) regardless of which path wins the race.
        final class OnceGuard: @unchecked Sendable {
            private var resumed = false
            private let lock = NSLock()
            private let continuation: CheckedContinuation<Data, Error>

            init(_ continuation: CheckedContinuation<Data, Error>) {
                self.continuation = continuation
            }

            func resume(with result: Result<Data, Error>) -> Bool {
                lock.lock()
                defer { lock.unlock() }
                guard !resumed else { return false }
                resumed = true
                switch result {
                case .success(let data): continuation.resume(returning: data)
                case .failure(let error): continuation.resume(throwing: error)
                }
                return true
            }
        }

        // Box the timeout task reference so the termination handler can cancel
        // it. Using a class avoids capturing a `var` in the @Sendable closure.
        final class TimeoutBox: @unchecked Sendable {
            var task: Task<Void, Never>?
        }
        let timeoutBox = TimeoutBox()

        return try await withCheckedThrowingContinuation { continuation in
            let process = Process()
            let pipe = Pipe()
            let guard_ = OnceGuard(continuation)

            process.executableURL = URL(fileURLWithPath: executable)
            process.arguments = arguments
            process.standardOutput = pipe
            process.standardError = FileHandle.nullDevice

            var extraEnv: [String: String] = [:]
            if suppressAutoUpdate { extraEnv["HOMEBREW_NO_AUTO_UPDATE"] = "1" }
            process.environment = ProcessInfo.processInfo.environment.merging(extraEnv) { _, new in new }

            process.terminationHandler = { proc in
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let result: Result<Data, Error> = proc.terminationStatus == 0
                    ? .success(data)
                    : .failure(BrewProcessError.processExited(proc.terminationStatus))
                if guard_.resume(with: result) {
                    // Process finished first — cancel the pending timeout so it
                    // does not stay alive sleeping until the deadline.
                    timeoutBox.task?.cancel()
                }
            }

            do {
                try process.run()
            } catch let error as CocoaError where error.code == .fileNoSuchFile || error.code == .fileReadNoSuchFile {
                brewProcessLogger.error("Homebrew not found at \(executable, privacy: .public)")
                _ = guard_.resume(with: .failure(BrewProcessError.brewNotInstalled))
                return
            } catch {
                brewProcessLogger.error("Failed to launch brew: \(error.localizedDescription, privacy: .public)")
                _ = guard_.resume(with: .failure(error))
                return
            }

            timeoutBox.task = Task {
                do {
                    try await Task.sleep(for: .seconds(timeout))
                } catch {
                    return // cancelled — process completed normally
                }
                if process.isRunning {
                    brewProcessLogger.error("brew command timed out after \(timeout, privacy: .public)s")
                    process.terminate()
                    _ = guard_.resume(with: .failure(BrewProcessError.timeout))
                }
            }
        }
    }

    /// String convenience: decodes stdout as UTF-8 (replaces invalid bytes).
    static func runString(
        _ arguments: [String],
        suppressAutoUpdate: Bool = true,
        timeout: TimeInterval = BrewProcess.defaultTimeout
    ) async throws -> String {
        let data = try await run(arguments, suppressAutoUpdate: suppressAutoUpdate, timeout: timeout)
        return String(data: data, encoding: .utf8) ?? ""
    }
}
