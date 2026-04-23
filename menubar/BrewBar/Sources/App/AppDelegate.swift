import AppKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private let appState = AppState()
    private let scheduler = SchedulerService()
    private var badgeTimer: Timer?
    private var launchTask: Task<Void, Never>?
    private var lastBadgeCount = -1
    private var hostingController: NSHostingController<PopoverView>?

    func applicationDidFinishLaunching(_ notification: Notification) {
        launchTask = Task {
            guard await checkBrewTuiInstalled() else {
                showBrewTuiRequired()
                return
            }

            // Check Pro license
            let licenseStatus = LicenseChecker.checkLicense()
            switch licenseStatus {
            case .pro:
                appState.canUpgrade = true
                break // Continue normal startup
            case .expired:
                appState.canUpgrade = false
                showLicenseExpired()
                // Continue in degraded mode — app stays open without Pro badge
            case .notFound:
                showProRequired()
                return
            }

            setupStatusItem()
            setupPopover()
            appState.onRefreshComplete = { [weak self] in
                self?.updateBadge()
            }

            scheduler.start(state: appState)
            await appState.refresh()
            updateBadge()

            badgeTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
                Task { @MainActor in self?.updateBadge() }
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        launchTask?.cancel()
        launchTask = nil
        appState.onRefreshComplete = nil
        badgeTimer?.invalidate()
        badgeTimer = nil
        scheduler.stop()
    }

    // MARK: - brew-tui dependency check

    private func checkBrewTuiInstalled() async -> Bool {
        let paths = [
            "/usr/local/bin/brew-tui",
            "/opt/homebrew/bin/brew-tui",
            "\(NSHomeDirectory())/.npm/bin/brew-tui",
        ]

        // Check known paths
        for path in paths {
            if FileManager.default.isExecutableFile(atPath: path) {
                return true
            }
        }

        // Fallback: check via shell PATH (non-blocking via terminationHandler)
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = ["brew-tui"]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        do {
            let found = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Bool, Error>) in
                process.terminationHandler = { proc in
                    cont.resume(returning: proc.terminationStatus == 0)
                }
                do {
                    try process.run()
                } catch {
                    cont.resume(throwing: error)
                }
            }
            return found
        } catch {
            return false
        }
    }

    private func showBrewTuiRequired() {
        let alert = NSAlert()
        alert.messageText = String(localized: "Brew-TUI is required")
        alert.informativeText = String(localized: "BrewBar requires Brew-TUI to be installed.\n\nInstall it with:\n  npm install -g brew-tui\n\nThen relaunch BrewBar.")
        alert.alertStyle = .critical
        alert.addButton(withTitle: String(localized: "Copy Install Command"))
        alert.addButton(withTitle: String(localized: "Quit"))

        let response = alert.runModal()

        if response == .alertFirstButtonReturn {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString("npm install -g brew-tui", forType: .string)
        }

        NSApp.terminate(nil)
    }

    private func showProRequired() {
        let alert = NSAlert()
        alert.messageText = String(localized: "BrewBar requires Pro")
        alert.informativeText = String(localized: "BrewBar is a Pro feature. Activate your license with:\n\n  brew-tui activate <your-key>\n\nThen relaunch BrewBar.")
        alert.alertStyle = .informational
        alert.addButton(withTitle: String(localized: "Quit"))
        alert.runModal()
        NSApp.terminate(nil)
    }

    private func showLicenseExpired() {
        let alert = NSAlert()
        alert.messageText = String(localized: "Pro license expired")
        alert.informativeText = String(localized: "Your Pro license has expired or needs revalidation.\n\nRun `brew-tui revalidate` in the terminal, or renew your subscription.\n\nThe app will continue in basic mode.")
        alert.alertStyle = .warning
        alert.addButton(withTitle: String(localized: "Continue"))
        alert.runModal()
    }

    // MARK: - Status item

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            let icon = NSImage(named: "MenuBarIcon")
            icon?.isTemplate = true
            button.image = icon
            button.image?.accessibilityDescription = String(localized: "BrewBar")
            button.action = #selector(togglePopover)
            button.target = self
        }
    }

    private func setupPopover() {
        popover = NSPopover()
        popover.contentSize = NSSize(width: 340, height: 420)
        popover.behavior = .transient
        // Create the hosting controller once and reuse on each popover open
        hostingController = NSHostingController(
            rootView: PopoverView(appState: appState, scheduler: scheduler)
        )
        popover.contentViewController = hostingController
    }

    private func updateBadge() {
        guard let button = statusItem.button else { return }

        let count = appState.outdatedCount
        guard count != lastBadgeCount else { return } // Skip if unchanged
        lastBadgeCount = count

        button.title = count > 0 ? " \(count)" : ""
        let icon = NSImage(named: "MenuBarIcon")
        icon?.isTemplate = true
        icon?.accessibilityDescription = count > 0 ? String(format: String(localized: "BrewBar — %lld updates"), Int64(count)) : String(localized: "BrewBar")
        button.image = icon
    }

    @objc private func togglePopover() {
        guard let button = statusItem.button else { return }

        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            popover.contentViewController?.view.window?.makeKey()
        }
    }
}
