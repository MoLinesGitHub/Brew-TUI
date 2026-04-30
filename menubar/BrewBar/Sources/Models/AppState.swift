import Foundation
import SwiftUI

@MainActor
@Observable
final class AppState {
    var outdatedPackages: [OutdatedPackage] = []
    var services: [BrewService] = []
    var lastChecked: Date?
    var isLoading = false
    var error: String?
    var servicesError: String?
    var canUpgrade = true
    var onRefreshComplete: (() -> Void)?
    var cveAlerts: [CVEAlert] = []
    var cveCheckError: String?
    var syncActivity = false
    var syncMachineCount = 0

    private let checker: any BrewChecking

    init(checker: any BrewChecking = BrewChecker()) {
        self.checker = checker
    }

    var outdatedCount: Int { outdatedPackages.count }
    var errorServices: [BrewService] { services.filter(\.hasError) }
    var criticalCveCount: Int { cveAlerts.filter { $0.severity == .critical || $0.severity == .high }.count }

    var lastSchedulerError: (message: String, date: String)? {
        guard let dict = UserDefaults.standard.dictionary(forKey: "lastSchedulerError"),
              let message = dict["message"] as? String,
              let date = dict["date"] as? String
        else { return nil }
        return (message, date)
    }

    func refresh(force: Bool = false) async {
        guard force || !isLoading else { return }
        isLoading = true
        error = nil
        defer {
            isLoading = false
            onRefreshComplete?()
        }

        // Refresh formula index so outdated check reflects current versions
        await checker.updateIndex()

        // Run both checks in parallel using async let
        async let outdatedResult = checker.checkOutdated()
        async let servicesResult = checker.checkServices()

        do {
            let result = try await outdatedResult
            outdatedPackages = result.formulae + result.casks
            lastChecked = Date()
        } catch {
            self.error = error.localizedDescription
        }

        do {
            services = try await servicesResult
            servicesError = nil
        } catch {
            servicesError = error.localizedDescription
        }
    }

    func updateCVEAlerts(_ alerts: [CVEAlert]) {
        cveAlerts = alerts.sorted { $0.severity.sortOrder < $1.severity.sortOrder }
    }

    func updateSyncStatus(hasActivity: Bool, machineCount: Int) {
        syncActivity = hasActivity
        syncMachineCount = machineCount
    }

    func upgrade(package name: String) async {
        guard !isLoading else { return }
        guard canUpgrade else {
            error = String(localized: "Pro license expired")
            return
        }
        isLoading = true
        error = nil
        do {
            try await checker.upgradePackage(name)
        } catch {
            self.error = String(format: String(localized: "Upgrade failed: %@"), error.localizedDescription)
            isLoading = false
            return
        }
        // Stay in loading state — refresh(force:) bypasses the guard
        await refresh(force: true)
    }

    func upgradeAll() async {
        guard !isLoading else { return }
        guard canUpgrade else {
            error = String(localized: "Pro license expired")
            return
        }
        isLoading = true
        error = nil
        do {
            try await checker.upgradeAll()
        } catch {
            self.error = String(format: String(localized: "Upgrade all failed: %@"), error.localizedDescription)
            isLoading = false
            return
        }
        // Stay in loading state — refresh(force:) bypasses the guard
        await refresh(force: true)
    }
}
