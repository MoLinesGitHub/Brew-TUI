import AppKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private let appState = AppState()
    private let scheduler = SchedulerService()
    private var badgeTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        Task {
            guard await checkBrewTuiInstalled() else {
                showBrewTuiRequired()
                return
            }

            setupStatusItem()
            setupPopover()

            scheduler.start(state: appState)
            await appState.refresh()

            badgeTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
                Task { @MainActor in self?.updateBadge() }
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
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

    // MARK: - Status item

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = NSImage(
                systemSymbolName: "mug.fill",
                accessibilityDescription: String(localized: "BrewBar")
            )
            button.image?.isTemplate = true
            button.action = #selector(togglePopover)
            button.target = self
        }
    }

    private func setupPopover() {
        popover = NSPopover()
        popover.contentSize = NSSize(width: 340, height: 420)
        popover.behavior = .transient
        // contentViewController is set fresh on each open in togglePopover()
        // to ensure SwiftUI @State is initialised correctly each time.
    }

    private func updateBadge() {
        guard let button = statusItem.button else { return }

        let count = appState.outdatedCount
        button.title = count > 0 ? " \(count)" : ""
        button.image = NSImage(
            systemSymbolName: "mug.fill",
            accessibilityDescription: count > 0 ? String(format: String(localized: "BrewBar — %lld updates"), Int64(count)) : String(localized: "BrewBar")
        )
        button.image?.isTemplate = true
    }

    @objc private func togglePopover() {
        guard let button = statusItem.button else { return }

        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.contentViewController = NSHostingController(
                rootView: PopoverView(appState: appState, scheduler: scheduler)
            )
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            popover.contentViewController?.view.window?.makeKey()
        }
    }
}
