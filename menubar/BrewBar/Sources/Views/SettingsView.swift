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
                    set: { scheduler.notificationsEnabled = $0 }
                ))

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
    }
}
