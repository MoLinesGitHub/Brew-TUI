import Foundation
import os

private let syncLogger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "SyncMonitor")

// Reads the iCloud sync.json to detect if other machines have pushed changes.
// Does NOT decrypt — only reads the plaintext `updatedAt` field.
actor SyncMonitor {
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

    // Returns true if iCloud sync.json exists and has changed since last check
    func checkForSyncActivity() async -> Bool {
        do {
            let data = try Data(contentsOf: syncPath)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let updatedAt = json?["updatedAt"] as? String else {
                syncLogger.debug("sync.json has no updatedAt field")
                return false
            }
            let lastKnown = UserDefaults.standard.string(forKey: lastKnownKey)
            let changed = updatedAt != lastKnown
            syncLogger.debug("checkForSyncActivity: updatedAt=\(updatedAt, privacy: .public) lastKnown=\(lastKnown ?? "nil", privacy: .public) changed=\(changed)")
            return changed
        } catch {
            syncLogger.debug("checkForSyncActivity error (expected if no sync): \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    // Returns number of distinct machines in the sync envelope (0 if not available)
    func getKnownMachineCount() async -> Int {
        do {
            let data = try Data(contentsOf: syncPath)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let machines = json?["machines"] as? [String: Any]
            let count = machines?.count ?? 0
            syncLogger.debug("getKnownMachineCount: \(count)")
            return count
        } catch {
            syncLogger.debug("getKnownMachineCount error: \(error.localizedDescription, privacy: .public)")
            return 0
        }
    }

    // Marks current updatedAt as seen
    func acknowledgeSync() async {
        do {
            let data = try Data(contentsOf: syncPath)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let updatedAt = json?["updatedAt"] as? String else { return }
            UserDefaults.standard.set(updatedAt, forKey: lastKnownKey)
            syncLogger.info("acknowledgeSync: stored updatedAt=\(updatedAt, privacy: .public)")
        } catch {
            syncLogger.debug("acknowledgeSync error: \(error.localizedDescription, privacy: .public)")
        }
    }
}
