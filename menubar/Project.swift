import ProjectDescription

let project = Project(
    name: "BrewBar",
    options: .options(
        defaultKnownRegions: ["en", "es"],
        developmentRegion: "en"
    ),
    settings: .settings(
        base: [
            "SWIFT_VERSION": "6.0",
            "MACOSX_DEPLOYMENT_TARGET": "14.0",
            "MARKETING_VERSION": "$(MARKETING_VERSION:default=0.2.0)",
            "DEAD_CODE_STRIPPING": "YES",
            "ENABLE_USER_SCRIPT_SANDBOXING": "YES",
            "STRING_CATALOG_GENERATE_SYMBOLS": "NO",
            "ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS": "YES",
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
                "CFBundleDevelopmentRegion": "en",
                "NSHumanReadableCopyright": "MoLines Designs",
            ]),
            sources: ["BrewBar/Sources/**"],
            resources: ["BrewBar/Resources/**"]
        ),
    ]
)
