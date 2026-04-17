import SwiftUI
import ServiceManagement

struct SettingsView: View {
    let scheduler: SchedulerService

    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled
    @Environment(\.dismiss) private var dismiss

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
    SettingsView(scheduler: SchedulerService())
}

#Preview("Spanish") {
    SettingsView(scheduler: SchedulerService())
        .environment(\.locale, Locale(identifier: "es"))
}
