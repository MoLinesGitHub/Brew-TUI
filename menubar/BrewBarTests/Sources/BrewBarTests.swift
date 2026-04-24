import Testing
import Foundation
@testable import BrewBar

// MARK: - OutdatedPackage Tests

@Suite("OutdatedPackage Model")
struct OutdatedPackageTests {
    @Test("installedVersion returns first version")
    func installedVersionReturnsFirst() {
        let pkg = OutdatedPackage(
            name: "wget",
            installedVersions: ["1.21", "1.20"],
            currentVersion: "1.22",
            pinned: false,
            pinnedVersion: nil
        )
        #expect(pkg.installedVersion == "1.21")
    }

    @Test("installedVersion returns ? when empty")
    func installedVersionFallback() {
        let pkg = OutdatedPackage(
            name: "curl",
            installedVersions: [],
            currentVersion: "8.0",
            pinned: false,
            pinnedVersion: nil
        )
        #expect(pkg.installedVersion == "?")
    }

    @Test("id is derived from name")
    func idIsName() {
        let pkg = OutdatedPackage(
            name: "node",
            installedVersions: ["20.0"],
            currentVersion: "22.0",
            pinned: false,
            pinnedVersion: nil
        )
        #expect(pkg.id == "node")
    }

    @Test("JSON decoding with snake_case keys")
    func jsonDecoding() throws {
        let json = """
        {
            "name": "python@3.11",
            "installed_versions": ["3.11.8"],
            "current_version": "3.11.9",
            "pinned": true,
            "pinned_version": "3.11.8"
        }
        """.data(using: .utf8)!

        let pkg = try JSONDecoder().decode(OutdatedPackage.self, from: json)
        #expect(pkg.name == "python@3.11")
        #expect(pkg.pinned == true)
        #expect(pkg.pinnedVersion == "3.11.8")
        #expect(pkg.currentVersion == "3.11.9")
    }
}

// MARK: - OutdatedResponse Tests

@Suite("OutdatedResponse Model")
struct OutdatedResponseTests {
    @Test("decodes formulae and casks arrays")
    func decodesResponse() throws {
        let json = """
        {
            "formulae": [
                {
                    "name": "wget",
                    "installed_versions": ["1.21"],
                    "current_version": "1.22",
                    "pinned": false,
                    "pinned_version": null
                }
            ],
            "casks": []
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(OutdatedResponse.self, from: json)
        #expect(response.formulae.count == 1)
        #expect(response.casks.isEmpty)
        #expect(response.formulae[0].name == "wget")
    }
}

// MARK: - BrewService Tests

@Suite("BrewService Model")
struct BrewServiceTests {
    @Test("JSON decoding")
    func jsonDecoding() throws {
        let json = """
        {
            "name": "postgresql@14",
            "status": "started",
            "user": "testuser",
            "file": "/usr/local/opt/postgresql@14/homebrew.mxcl.postgresql@14.plist",
            "exit_code": 0
        }
        """.data(using: .utf8)!

        let service = try JSONDecoder().decode(BrewService.self, from: json)
        #expect(service.name == "postgresql@14")
        #expect(service.status == "started")
        #expect(service.user == "testuser")
    }
}
