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

    private var timer: Timer?
    private weak var state: AppState?

    init() {
        let saved = UserDefaults.standard.integer(forKey: "checkInterval")
        interval = Interval(rawValue: saved) ?? .oneHour
        notificationsEnabled = UserDefaults.standard.bool(forKey: "notificationsEnabled")
    }

    func start(state: AppState) {
        self.state = state
        restartTimer()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    private func restartTimer() {
        timer?.invalidate()
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
            sendNotification(count: newCount)
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
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
