import SwiftUI
import ServiceManagement

struct SettingsView: View {
    private static let isRunningForPreviews = ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1"

    let scheduler: SchedulerService

    @State private var launchAtLogin: Bool
    @Environment(\.dismiss) private var dismiss

    init(scheduler: SchedulerService, launchAtLogin: Bool? = nil) {
        self.scheduler = scheduler
        let resolvedLaunchAtLogin = launchAtLogin ?? (Self.isRunningForPreviews ? false : SMAppService.mainApp.status == .enabled)
        _launchAtLogin = State(initialValue: resolvedLaunchAtLogin)
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("BrewBar Settings")
                .font(.headline)

            Form {
                Picker("Check interval", selection: Binding(
                    get: { scheduler.interval },
                    set: { scheduler.interval = $0 }
                )) {
                    ForEach(SchedulerService.Interval.allCases, id: \.self) { interval in
                        Text(interval.label).tag(interval)
                    }
                }

                Toggle("Notifications", isOn: Binding(
                    get: { scheduler.notificationsEnabled },
                    set: { newValue in
                        scheduler.notificationsEnabled = newValue
                        if newValue {
                            // Re-sync after toggling on — if system denied, it will flip back off
                            Task { await scheduler.syncNotificationPermission() }
                        }
                    }
                ))
                .disabled(scheduler.notificationsDenied)

                if scheduler.notificationsDenied {
                    Text("Notifications are disabled in System Settings. Enable them in System Settings > Notifications > BrewBar.")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }

                Toggle("Launch at login", isOn: $launchAtLogin)
                    .onChange(of: launchAtLogin) { _, newValue in
                        guard !Self.isRunningForPreviews else { return }

                        do {
                            if newValue {
                                try SMAppService.mainApp.register()
                            } else {
                                try SMAppService.mainApp.unregister()
                            }
                        } catch {
                            launchAtLogin = !newValue
                        }
                    }
            }
            .formStyle(.grouped)

            HStack {
                Spacer()
                Button("Done") { dismiss() }
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding()
        .frame(width: 300)
        .task {
            await scheduler.syncNotificationPermission()
        }
    }
}

// MARK: - Previews

#Preview("Settings") {
    SettingsView(scheduler: PreviewData.makeScheduler(), launchAtLogin: false)
}

#Preview("Spanish") {
    SettingsView(scheduler: PreviewData.makeScheduler(), launchAtLogin: false)
        .environment(\.locale, Locale(identifier: "es"))
}
