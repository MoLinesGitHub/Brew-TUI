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
        guard checkBrewTuiInstalled() else {
            showBrewTuiRequired()
            return
        }

        setupStatusItem()
        setupPopover()

        scheduler.start(state: appState)
        Task { await appState.refresh() }

        badgeTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.updateBadge() }
        }
    }

    // MARK: - brew-tui dependency check

    private func checkBrewTuiInstalled() -> Bool {
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

        // Fallback: check via shell PATH
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = ["brew-tui"]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            process.waitUntilExit()
            return process.terminationStatus == 0
        } catch {
            return false
        }
    }

    private func showBrewTuiRequired() {
        let alert = NSAlert()
        alert.messageText = "Brew-TUI is required"
        alert.informativeText = """
            BrewBar requires Brew-TUI to be installed.

            Install it with:
              npm install -g brew-tui

            Then relaunch BrewBar.
            """
        alert.alertStyle = .critical
        alert.addButton(withTitle: "Copy Install Command")
        alert.addButton(withTitle: "Quit")

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
                accessibilityDescription: "BrewBar"
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
        popover.contentViewController = NSHostingController(
            rootView: PopoverView(appState: appState, scheduler: scheduler)
        )
    }

    private func updateBadge() {
        guard let button = statusItem.button else { return }

        let count = appState.outdatedCount
        button.title = count > 0 ? " \(count)" : ""
        button.image = NSImage(
            systemSymbolName: "mug.fill",
            accessibilityDescription: count > 0 ? "BrewBar — \(count) updates" : "BrewBar"
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
