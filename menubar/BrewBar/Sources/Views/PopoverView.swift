import SwiftUI

struct PopoverView: View {
    let appState: AppState
    let scheduler: SchedulerService

    @State private var showSettings = false
    @State private var refreshTask: Task<Void, Never>?
    @Environment(\.legibilityWeight) private var legibilityWeight
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    var body: some View {
        VStack(spacing: 0) {
            headerView
            Divider()

            if appState.isLoading && appState.outdatedPackages.isEmpty {
                loadingView
            } else if let error = appState.error {
                errorView(error)
            } else if appState.outdatedPackages.isEmpty {
                upToDateView
            } else {
                OutdatedListView(appState: appState)
            }

            if !appState.errorServices.isEmpty || appState.servicesError != nil {
                Divider()
                servicesErrorView
            }

            if !appState.canUpgrade {
                Divider()
                basicModeView
            }

            Divider()
            footerView
        }
        .frame(minWidth: 340, maxWidth: 340, minHeight: 420)
        .onDisappear { refreshTask?.cancel() }
        .sheet(isPresented: $showSettings) {
            SettingsView(scheduler: scheduler)
        }
    }

    private var headerView: some View {
        HStack {
            Image(systemName: "mug.fill")
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text("Homebrew Updates")
                .font(.headline)
                .fontWeight(legibilityWeight == .bold ? .bold : .semibold)
                .accessibilityAddTraits(.isHeader)

            Spacer()

            if appState.isLoading {
                ProgressView()
                    .scaleEffect(0.6)
                    .frame(width: 16, height: 16)
            }

            Button {
                refreshTask = Task { await appState.refresh() }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.borderless)
            .disabled(appState.isLoading)
            .accessibilityLabel(String(localized: "Refresh"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }

    private var loadingView: some View {
        VStack(spacing: 8) {
            Spacer()
            ProgressView("Checking for updates...")
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 8) {
            Spacer()
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.largeTitle)
                .foregroundStyle(.yellow)
                .accessibilityHidden(true)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                refreshTask = Task { await appState.refresh() }
            }
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var upToDateView: some View {
        VStack(spacing: 8) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.largeTitle)
                .foregroundStyle(colorSchemeContrast == .increased ? Color(red: 0, green: 0.6, blue: 0) : .green)
                .accessibilityHidden(true)
            Text("All packages up to date")
                .font(.headline)
                .foregroundStyle(.secondary)
            if let last = appState.lastChecked {
                Text(String(format: String(localized: "Last checked %@"), last.formatted(.relative(presentation: .named))))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var servicesErrorView: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("Service Errors", systemImage: "exclamationmark.triangle")
                .font(.caption)
                .foregroundStyle(colorSchemeContrast == .increased ? Color(red: 0.8, green: 0.4, blue: 0) : .orange)
                .accessibilityAddTraits(.isHeader)
            if let servicesError = appState.servicesError {
                Text(servicesError)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
            ForEach(appState.errorServices) { svc in
                HStack {
                    Text(svc.name)
                        .font(.caption2)
                    Spacer()
                    if let code = svc.exitCode {
                        Text(String(format: String(localized: "exit %lld"), Int64(code)))
                            .font(.caption2)
                            .foregroundStyle(.red)
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    private var footerView: some View {
        HStack {
            Button {
                openBrewTUI()
            } label: {
                Label("Open Brew-TUI", systemImage: "terminal")
                    .font(.caption)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(String(localized: "Open Brew-TUI"))

            Spacer()

            if let last = appState.lastChecked, !appState.outdatedPackages.isEmpty {
                Text(last.formatted(.relative(presentation: .named)))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            Button {
                showSettings = true
            } label: {
                Image(systemName: "gear")
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(String(localized: "Settings"))

            Button {
                NSApp.terminate(nil)
            } label: {
                Image(systemName: "power")
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(String(localized: "Quit"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private var basicModeView: some View {
        HStack(spacing: 6) {
            Image(systemName: "lock.fill")
                .foregroundStyle(.orange)
                .accessibilityHidden(true)
            Text(String(localized: "Pro license expired"))
                .font(.caption)
                .foregroundStyle(.orange)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    private func openBrewTUI() {
        do {
            let scriptURL = try makeLaunchScript()
            guard NSWorkspace.shared.open(scriptURL) else {
                throw NSError(
                    domain: "BrewBar",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: String(localized: "Could not open Brew-TUI in your terminal app.")]
                )
            }
        } catch {
            let alert = NSAlert()
            alert.messageText = String(localized: "Could not open Brew-TUI")
            alert.informativeText = error.localizedDescription
            alert.alertStyle = .warning
            alert.addButton(withTitle: String(localized: "Continue"))
            alert.runModal()
        }
    }

    private func makeLaunchScript() throws -> URL {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("brew-tui-launch", isDirectory: true)
        try FileManager.default.createDirectory(at: tempURL, withIntermediateDirectories: true, attributes: nil)

        let scriptURL = tempURL.appendingPathComponent("brew-tui.command")
        let script = """
        #!/bin/zsh
        exec brew-tui
        """

        try script.write(to: scriptURL, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes(
            [.posixPermissions: 0o755],
            ofItemAtPath: scriptURL.path
        )
        return scriptURL
    }
}

// MARK: - Previews

#Preview("Outdated Packages") {
    PopoverView(
        appState: PreviewData.makeAppState(),
        scheduler: PreviewData.makeScheduler()
    )
}

#Preview("Up to Date") {
    PopoverView(
        appState: PreviewData.makeAppState(packages: []),
        scheduler: PreviewData.makeScheduler()
    )
}

#Preview("Loading") {
    PopoverView(
        appState: PreviewData.makeAppState(packages: [], isLoading: true),
        scheduler: PreviewData.makeScheduler()
    )
}

#Preview("Error") {
    PopoverView(
        appState: PreviewData.makeAppState(
            packages: [],
            error: "Homebrew is not installed. Install it from https://brew.sh"
        ),
        scheduler: PreviewData.makeScheduler()
    )
}

#Preview("Service Errors") {
    PopoverView(
        appState: PreviewData.makeAppState(
            services: PreviewData.errorServices
        ),
        scheduler: PreviewData.makeScheduler()
    )
}

#Preview("Spanish / Outdated") {
    PopoverView(
        appState: PreviewData.makeAppState(),
        scheduler: PreviewData.makeScheduler()
    )
    .environment(\.locale, Locale(identifier: "es"))
}

#Preview("Spanish / Up to Date") {
    PopoverView(
        appState: PreviewData.makeAppState(packages: []),
        scheduler: PreviewData.makeScheduler()
    )
    .environment(\.locale, Locale(identifier: "es"))
}
