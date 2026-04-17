import SwiftUI

struct PopoverView: View {
    let appState: AppState
    let scheduler: SchedulerService

    @State private var showSettings = false

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

            Divider()
            footerView
        }
        .frame(width: 340, height: 420)
        .sheet(isPresented: $showSettings) {
            SettingsView(scheduler: scheduler)
        }
    }

    private var headerView: some View {
        HStack {
            Image(systemName: "mug.fill")
                .foregroundStyle(.secondary)
            Text("Homebrew Updates")
                .font(.headline)

            Spacer()

            if appState.isLoading {
                ProgressView()
                    .scaleEffect(0.6)
                    .frame(width: 16, height: 16)
            }

            Button {
                Task { await appState.refresh() }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.borderless)
            .disabled(appState.isLoading)
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
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                Task { await appState.refresh() }
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
                .font(.system(size: 40))
                .foregroundStyle(.green)
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
                .foregroundStyle(.orange)
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

            Button {
                NSApp.terminate(nil)
            } label: {
                Image(systemName: "power")
            }
            .buttonStyle(.borderless)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private func openBrewTUI() {
        let script = "tell application \"Terminal\" to do script \"brew-tui\""
        guard let appleScript = NSAppleScript(source: script) else { return }
        var errorInfo: NSDictionary?
        appleScript.executeAndReturnError(&errorInfo)
        if let errorInfo {
            NSLog("[BrewBar] Failed to open Brew-TUI: %@", errorInfo.description)
        }
    }
}
