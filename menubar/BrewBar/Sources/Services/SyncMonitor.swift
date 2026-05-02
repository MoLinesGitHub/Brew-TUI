import Foundation
import os

private let syncLogger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "SyncMonitor")

// ARQ-003: protocol seam for tests. Production gets SyncMonitor.shared, tests
// register a stub that returns deterministic values without touching iCloud.
protocol SyncMonitoring: Sendable {
    func checkForSyncActivity() async -> Bool
    func getKnownMachineCount() async -> Int
    func acknowledgeSync() async
}

// Reads the iCloud sync.json to detect if other machines have pushed changes.
// Does NOT decrypt — only reads the plaintext `updatedAt` field.
actor SyncMonitor: SyncMonitoring {
    static let shared = SyncMonitor()

    private let syncPath: URL = {
        let icloud = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
            .first?
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("Mobile Documents/com~apple~CloudDocs/BrewTUI/sync.json")
        return icloud ?? URL(fileURLWithPath: "/dev/null")
    }()

    private let lastKnownKey = "syncLastKnownUpdatedAt"

    // PERF-015: parse the envelope once per tick instead of three separate
    // file reads. checkForSyncActivity, getKnownMachineCount and acknowledgeSync
    // shared the same JSON; the helper below is the single read+parse path.
    // BK-013: also serves as the seam for moving off synchronous Data(contentsOf:)
    // — readEnvelope() can be swapped for an async URLSession call without
    // touching call sites.
    private struct Snapshot {
        let updatedAt: String?
        let machineCount: Int
    }

    private func readEnvelope() -> Snapshot? {
        do {
            let data = try Data(contentsOf: syncPath)
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return nil
            }
            let updatedAt = json["updatedAt"] as? String
            let machines = json["machines"] as? [String: Any]
            return Snapshot(updatedAt: updatedAt, machineCount: machines?.count ?? 0)
        } catch {
            syncLogger.debug("readEnvelope error (expected if no sync): \(error.localizedDescription, privacy: .public)")
            return nil
        }
    }

    func checkForSyncActivity() async -> Bool {
        guard let snapshot = readEnvelope(), let updatedAt = snapshot.updatedAt else {
            return false
        }
        let lastKnown = UserDefaults.standard.string(forKey: lastKnownKey)
        let changed = updatedAt != lastKnown
        syncLogger.debug("checkForSyncActivity: updatedAt=\(updatedAt, privacy: .public) lastKnown=\(lastKnown ?? "nil", privacy: .public) changed=\(changed)")
        return changed
    }

    func getKnownMachineCount() async -> Int {
        guard let snapshot = readEnvelope() else { return 0 }
        syncLogger.debug("getKnownMachineCount: \(snapshot.machineCount)")
        return snapshot.machineCount
    }

    func acknowledgeSync() async {
        guard let updatedAt = readEnvelope()?.updatedAt else { return }
        UserDefaults.standard.set(updatedAt, forKey: lastKnownKey)
        syncLogger.info("acknowledgeSync: stored updatedAt=\(updatedAt, privacy: .public)")
    }
}
