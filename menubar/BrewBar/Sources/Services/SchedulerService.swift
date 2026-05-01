import Foundation
import UserNotifications
import os

private let schedulerLogger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "SchedulerService")

@MainActor
@Observable
final class SchedulerService {
    enum Interval: Int, CaseIterable, Sendable {
        case oneHour = 3600
        case fourHours = 14400
        case eightHours = 28800

        var label: String {
            switch self {
            case .oneHour: String(localized: "Every hour")
            case .fourHours: String(localized: "Every 4 hours")
            case .eightHours: String(localized: "Every 8 hours")
            }
        }
    }

    var interval: Interval {
        didSet {
            UserDefaults.standard.set(interval.rawValue, forKey: "checkInterval")
            restartTimer()
        }
    }

    var notificationsEnabled: Bool {
        didSet {
            UserDefaults.standard.set(notificationsEnabled, forKey: "notificationsEnabled")
            if notificationsEnabled { requestNotificationPermission() }
        }
    }

    /// True when the OS has denied notification permission — shown in Settings UI
    var notificationsDenied = false

    private var timer: Timer?
    private weak var state: AppState?
    private let isPreview: Bool
    private let security: any SecurityChecking

    private static let hasLaunchedKey = "hasLaunchedBefore"

    init(isPreview: Bool? = nil, security: any SecurityChecking = SecurityMonitor.shared) {
        let resolvedIsPreview = isPreview ?? (ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1")
        self.isPreview = resolvedIsPreview
        self.security = security

        if resolvedIsPreview {
            interval = .oneHour
            notificationsEnabled = false
            notificationsDenied = false
            return
        }

        let saved = UserDefaults.standard.integer(forKey: "checkInterval")
        interval = Interval(rawValue: saved) ?? .oneHour

        if !UserDefaults.standard.bool(forKey: Self.hasLaunchedKey) {
            UserDefaults.standard.set(true, forKey: Self.hasLaunchedKey)
            notificationsEnabled = true
            UserDefaults.standard.set(true, forKey: "notificationsEnabled")
            requestNotificationPermission()
        } else {
            notificationsEnabled = UserDefaults.standard.bool(forKey: "notificationsEnabled")
        }
    }

    func start(state: AppState) {
        guard !isPreview else { return }

        schedulerLogger.info("Starting scheduler with interval: \(self.interval.rawValue)s")
        self.state = state
        restartTimer()
        // Sync toggle with actual system permission on each launch
        Task { await syncNotificationPermission() }
    }

    func stop() {
        schedulerLogger.info("Stopping scheduler")
        timer?.invalidate()
        timer = nil
    }

    /// Query the OS for the actual notification authorization status.
    /// If the user denied permission, turn off the toggle and flag it.
    func syncNotificationPermission() async {
        guard !isPreview else {
            notificationsDenied = false
            return
        }

        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .denied:
            notificationsDenied = true
            if notificationsEnabled {
                notificationsEnabled = false
                UserDefaults.standard.set(false, forKey: "notificationsEnabled")
            }
        case .authorized, .provisional, .ephemeral:
            notificationsDenied = false
        case .notDetermined:
            notificationsDenied = false
        @unknown default:
            notificationsDenied = false
        }
    }

    private func restartTimer() {
        timer?.invalidate()
        guard !isPreview else { return }

        schedulerLogger.info("Restarting timer with interval: \(self.interval.rawValue)s")
        timer = Timer.scheduledTimer(
            withTimeInterval: TimeInterval(interval.rawValue),
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.check()
            }
        }
    }

    private func check() async {
        guard let state else { return }
        schedulerLogger.info("Scheduled check starting")
        let previousCount = state.outdatedCount
        await state.refresh()
        let newCount = state.outdatedCount

        if let error = state.error {
            schedulerLogger.error("Scheduler check failed: \(error, privacy: .public)")
            UserDefaults.standard.set(["message": error, "date": Date().ISO8601Format()], forKey: "lastSchedulerError")
        } else {
            schedulerLogger.info("Scheduled check completed: \(newCount) outdated packages")
        }

        if notificationsEnabled && newCount > previousCount {
            // Re-check permission before sending
            await syncNotificationPermission()
            if notificationsEnabled {
                sendNotification(count: newCount)
            }
        }

        // CVE check (runs on same schedule as outdated check)
        let newCVEs = await security.checkForNewVulnerabilities()
        if !newCVEs.isEmpty {
            let allAlerts = await security.loadCachedAlerts()
            state.updateCVEAlerts(allAlerts)
            if notificationsEnabled {
                await syncNotificationPermission()
                if notificationsEnabled {
                    sendCVENotification(alerts: newCVEs)
                }
            }
        }

        // Sync activity monitor
        let hasSyncActivity = await SyncMonitor.shared.checkForSyncActivity()
        let machineCount = await SyncMonitor.shared.getKnownMachineCount()
        state.updateSyncStatus(hasActivity: hasSyncActivity, machineCount: machineCount)
        if hasSyncActivity && notificationsEnabled {
            await syncNotificationPermission()
            if notificationsEnabled {
                sendSyncNotification(machineCount: machineCount)
            }
        }
    }

    private func sendSyncNotification(machineCount: Int) {
        schedulerLogger.info("Sending sync notification, machineCount: \(machineCount)")
        let content = UNMutableNotificationContent()
        content.title = String(localized: "Brew-TUI Sync")
        content.body = machineCount > 1
            ? String(format: String(localized: "Changes from %lld machine(s) available. Open Brew-TUI to sync."), Int64(machineCount - 1))
            : String(localized: "Sync activity detected. Open Brew-TUI to review.")
        content.sound = .default
        let request = UNNotificationRequest(identifier: "brewbar-sync", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }

    private func requestNotificationPermission() {
        guard !isPreview else { return }

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { [weak self] granted, _ in
            Task { @MainActor in
                if !granted {
                    self?.notificationsDenied = true
                    self?.notificationsEnabled = false
                    UserDefaults.standard.set(false, forKey: "notificationsEnabled")
                } else {
                    self?.notificationsDenied = false
                }
            }
        }
    }

    private func sendNotification(count: Int) {
        schedulerLogger.info("Sending notification for \(count) outdated packages")
        let content = UNMutableNotificationContent()
        content.title = String(localized: "Homebrew Updates")
        content.body = String(format: String(localized: "%lld packages can be updated."), Int64(count))
        content.sound = .default

        // Identifier único por disparo: macOS reemplaza notifs con el mismo identifier
        // en silencio (sin banner ni sonido), lo que ocultaría notifs consecutivas.
        let request = UNNotificationRequest(
            identifier: "brewbar-outdated-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }

    private func sendCVENotification(alerts: [CVEAlert]) {
        guard !alerts.isEmpty else { return }

        let sorted = alerts.sorted { $0.severity.sortOrder < $1.severity.sortOrder }
        let hasCriticalOrHigh = sorted.first.map { $0.severity == .critical || $0.severity == .high } ?? false
        let count = alerts.count

        schedulerLogger.info("Sending CVE notification for \(count) new vulnerabilities")

        let content = UNMutableNotificationContent()
        content.sound = .default

        if hasCriticalOrHigh, let worst = sorted.first {
            content.title = String(localized: "Security Alert — Brew-TUI")
            content.body = String(
                format: String(localized: "%lld vulnerable packages found, including %@"),
                Int64(count),
                worst.packageName
            )
            content.userInfo = ["cveId": worst.id]
        } else {
            content.title = String(localized: "Security Notice — Brew-TUI")
            content.body = String(
                format: String(localized: "%lld vulnerable packages found"),
                Int64(count)
            )
            if let worst = sorted.first {
                content.userInfo = ["cveId": worst.id]
            }
        }

        let request = UNNotificationRequest(
            identifier: "brewbar-cve",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }
}
