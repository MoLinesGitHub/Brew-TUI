import SwiftUI

struct OutdatedListView: View {
    let appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(String(format: String(localized: "%lld updates available"), Int64(appState.outdatedCount)))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Upgrade All") {
                    Task { await appState.upgradeAll() }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .disabled(appState.isLoading)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(appState.outdatedPackages) { pkg in
                        packageRow(pkg)
                        Divider().padding(.leading, 12)
                    }
                }
            }
        }
    }

    private func packageRow(_ pkg: OutdatedPackage) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(pkg.name)
                    .font(.system(.body, design: .monospaced))
                    .fontWeight(.medium)
                HStack(spacing: 4) {
                    Text(pkg.installedVersion)
                        .foregroundStyle(.red)
                    Image(systemName: "arrow.right")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(pkg.currentVersion)
                        .foregroundStyle(.green)
                }
                .font(.caption)
            }

            Spacer()

            if pkg.pinned {
                Image(systemName: "pin.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            Button {
                Task { await appState.upgrade(package: pkg.name) }
            } label: {
                Image(systemName: "arrow.up.circle")
            }
            .buttonStyle(.borderless)
            .disabled(appState.isLoading || pkg.pinned)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }
}
