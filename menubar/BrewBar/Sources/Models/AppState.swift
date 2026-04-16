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

    private let checker = BrewChecker()

    var outdatedCount: Int { outdatedPackages.count }
    var errorServices: [BrewService] { services.filter(\.hasError) }

    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let result = try await checker.checkOutdated()
            outdatedPackages = result.formulae + result.casks
            lastChecked = Date()
        } catch {
            self.error = error.localizedDescription
        }

        do {
            services = try await checker.checkServices()
        } catch {
            // Services are non-critical
        }

        isLoading = false
    }

    func upgrade(package name: String) async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        do {
            try await checker.upgradePackage(name)
        } catch {
            self.error = String(localized: "Upgrade failed: \(error.localizedDescription)")
            isLoading = false
            return
        }
        isLoading = false
        await refresh()
    }

    func upgradeAll() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        do {
            try await checker.upgradeAll()
        } catch {
            self.error = String(localized: "Upgrade all failed: \(error.localizedDescription)")
            isLoading = false
            return
        }
        isLoading = false
        await refresh()
    }
}
