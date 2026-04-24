import SwiftUI

struct OutdatedListView: View {
    let appState: AppState
    @State private var showUpgradeAllConfirm = false
    @State private var packageToConfirm: OutdatedPackage?
    @State private var upgradeTask: Task<Void, Never>?
    @Environment(\.legibilityWeight) private var legibilityWeight
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    private let installedVersionColor = Color.orange
    private let currentVersionColor = Color.cyan

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(String(format: String(localized: "%lld updates available"), Int64(appState.outdatedCount)))
                    .font(.subheadline)
                    .fontWeight(legibilityWeight == .bold ? .bold : .regular)
                    .foregroundStyle(.secondary)
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                if appState.canUpgrade {
                    Button("Upgrade All") {
                        showUpgradeAllConfirm = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(appState.isLoading)
                    .accessibilityLabel(String(localized: "Upgrade All"))
                    .confirmationDialog(
                        String(localized: "Upgrade all packages?"),
                        isPresented: $showUpgradeAllConfirm,
                        titleVisibility: .visible
                    ) {
                        Button(String(localized: "Upgrade All"), role: .destructive) {
                            upgradeTask = Task { await appState.upgradeAll() }
                        }
                        Button(String(localized: "Cancel"), role: .cancel) {}
                    }
                }
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
        .onDisappear { upgradeTask?.cancel() }
    }

    private func packageRow(_ pkg: OutdatedPackage) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(pkg.name)
                    .font(.system(.body, design: .monospaced))
                    .fontWeight(.medium)
                HStack(spacing: 4) {
                    Text(pkg.installedVersion)
                        .foregroundStyle(colorSchemeContrast == .increased ? Color(red: 0.8, green: 0.4, blue: 0) : installedVersionColor)
                    Image(systemName: "arrow.right")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .accessibilityHidden(true)
                    Text(pkg.currentVersion)
                        .foregroundStyle(colorSchemeContrast == .increased ? Color(red: 0, green: 0.5, blue: 0.7) : currentVersionColor)
                }
                .font(.caption)
            }

            Spacer()

            if pkg.pinned {
                Image(systemName: "pin.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            // Note: Task in button action — .task modifier not applicable here
            if appState.canUpgrade {
                Button {
                    packageToConfirm = pkg
                } label: {
                    Image(systemName: "arrow.up.circle")
                }
                .buttonStyle(.borderless)
                .disabled(appState.isLoading || pkg.pinned)
                .accessibilityLabel(
                    String(format: String(localized: "Upgrade %@", comment: "Accessibility label for upgrading a single package"), pkg.name)
                )
                .confirmationDialog(
                    String(format: String(localized: "Upgrade %@?"), pkg.name),
                    isPresented: Binding(
                        get: { packageToConfirm?.id == pkg.id },
                        set: { isPresented in
                            if !isPresented {
                                packageToConfirm = nil
                            }
                        }
                    ),
                    titleVisibility: .visible
                ) {
                    Button(String(localized: "Upgrade"), role: .destructive) {
                        upgradeTask = Task { await appState.upgrade(package: pkg.name) }
                    }
                    Button(String(localized: "Cancel"), role: .cancel) {}
                }
            } else {
                Image(systemName: "lock.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }
}

// MARK: - Previews

#Preview("5 Packages") {
    OutdatedListView(appState: PreviewData.makeAppState())
        .frame(width: 340, height: 300)
}

#Preview("1 Package") {
    OutdatedListView(
        appState: PreviewData.makeAppState(packages: [PreviewData.outdatedPackages[0]])
    )
    .frame(width: 340, height: 200)
}

#Preview("Pinned Package") {
    OutdatedListView(
        appState: PreviewData.makeAppState(packages: [PreviewData.outdatedPackages[2]])
    )
    .frame(width: 340, height: 200)
}

#Preview("Spanish") {
    OutdatedListView(appState: PreviewData.makeAppState())
        .frame(width: 340, height: 300)
        .environment(\.locale, Locale(identifier: "es"))
}
