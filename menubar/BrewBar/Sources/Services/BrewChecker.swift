import Foundation

struct BrewChecker: Sendable {
    private static let brewPath = "/opt/homebrew/bin/brew"

    private func run(_ arguments: [String]) async throws -> Data {
        let process = Process()
        let pipe = Pipe()

        process.executableURL = URL(fileURLWithPath: Self.brewPath)
        process.arguments = arguments
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice
        process.environment = ProcessInfo.processInfo.environment.merging(
            ["HOMEBREW_NO_AUTO_UPDATE": "1"]
        ) { _, new in new }

        try process.run()
        process.waitUntilExit()

        let data = pipe.fileHandleForReading.readDataToEndOfFile()

        guard process.terminationStatus == 0 else {
            throw BrewError.processExited(process.terminationStatus)
        }

        return data
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

    var errorDescription: String? {
        switch self {
        case .processExited(let code):
            "brew exited with code \(code)"
        }
    }
}
