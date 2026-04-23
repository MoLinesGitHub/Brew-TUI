import Foundation
import UserNotifications

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

    private static let hasLaunchedKey = "hasLaunchedBefore"

    init(isPreview: Bool? = nil) {
        let resolvedIsPreview = isPreview ?? (ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1")
        self.isPreview = resolvedIsPreview

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

        self.state = state
        restartTimer()
        // Sync toggle with actual system permission on each launch
        Task { await syncNotificationPermission() }
    }

    func stop() {
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
        let previousCount = state.outdatedCount
        await state.refresh()
        let newCount = state.outdatedCount

        if notificationsEnabled && newCount > previousCount {
            // Re-check permission before sending
            await syncNotificationPermission()
            if notificationsEnabled {
                sendNotification(count: newCount)
            }
        }
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
        let content = UNMutableNotificationContent()
        content.title = String(localized: "Homebrew Updates")
        content.body = String(format: String(localized: "%lld packages can be updated."), Int64(count))
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "brewbar-outdated",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }
}
