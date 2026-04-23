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

    private let checker = BrewChecker()

    var outdatedCount: Int { outdatedPackages.count }
    var errorServices: [BrewService] { services.filter(\.hasError) }

    func refresh(force: Bool = false) async {
        guard force || !isLoading else { return }
        isLoading = true
        error = nil
        defer {
            isLoading = false
            onRefreshComplete?()
        }

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
