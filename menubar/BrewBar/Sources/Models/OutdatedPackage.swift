import Foundation

struct OutdatedPackage: Identifiable, Codable, Sendable {
    var id: String { name }
    let name: String
    let installedVersions: [String]
    let currentVersion: String
    let pinned: Bool
    let pinnedVersion: String?

    enum CodingKeys: String, CodingKey {
        case name
        case installedVersions = "installed_versions"
        case currentVersion = "current_version"
        case pinned
        case pinnedVersion = "pinned_version"
    }

    var installedVersion: String {
        installedVersions.first ?? "?"
    }
}

struct OutdatedResponse: Codable, Sendable {
    let formulae: [OutdatedPackage]
    let casks: [OutdatedPackage]
}
