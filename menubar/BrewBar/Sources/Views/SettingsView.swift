import SwiftUI
import ServiceManagement

struct SettingsView: View {
    private static let isRunningForPreviews = ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1"

    let scheduler: SchedulerService

    @State private var launchAtLogin: Bool
    @State private var loginError: String?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.legibilityWeight) private var legibilityWeight
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    init(scheduler: SchedulerService, launchAtLogin: Bool? = nil) {
        self.scheduler = scheduler
        let resolvedLaunchAtLogin = launchAtLogin ?? (Self.isRunningForPreviews ? false : SMAppService.mainApp.status == .enabled)
        _launchAtLogin = State(initialValue: resolvedLaunchAtLogin)
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("BrewBar Settings")
                .font(.headline)
                .fontWeight(legibilityWeight == .bold ? .bold : .semibold)
                .accessibilityAddTraits(.isHeader)

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
                        .foregroundStyle(colorSchemeContrast == .increased ? Color(red: 0.8, green: 0.4, blue: 0) : .orange)
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
                            loginError = error.localizedDescription
                            launchAtLogin = !newValue
                        }
                    }
            }
            .formStyle(.grouped)
            .alert(String(localized: "Login Item Error"), isPresented: Binding(
                get: { loginError != nil },
                set: { if !$0 { loginError = nil } }
            )) {
                Button(String(localized: "OK")) { loginError = nil }
            } message: {
                Text(loginError ?? "")
            }

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
