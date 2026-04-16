import ProjectDescription

let project = Project(
    name: "BrewBar",
    settings: .settings(
        base: [
            "SWIFT_VERSION": "6.0",
            "MACOSX_DEPLOYMENT_TARGET": "14.0",
        ],
        configurations: [
            .debug(name: "Debug"),
            .release(name: "Release"),
        ]
    ),
    targets: [
        .target(
            name: "BrewBar",
            destinations: .macOS,
            product: .app,
            bundleId: "com.molinesdesigns.brewbar",
            deploymentTargets: .macOS("14.0"),
            infoPlist: .extendingDefault(with: [
                "LSUIElement": true,
                "CFBundleDisplayName": "BrewBar",
                "NSHumanReadableCopyright": "MoLines Designs",
            ]),
            sources: ["BrewBar/Sources/**"],
            resources: ["BrewBar/Resources/**"]
        ),
    ]
)
