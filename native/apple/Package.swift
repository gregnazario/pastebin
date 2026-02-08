// swift-tools-version: 5.10

// Package manifest for shared Swift native modules used by iOS/iPadOS/macOS clients.

import PackageDescription

let package = Package(
    name: "SecurePastebinNativeApple",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "CoreCrypto", targets: ["CoreCrypto"]),
        .library(name: "CoreNetworking", targets: ["CoreNetworking"]),
        .library(name: "CoreStorage", targets: ["CoreStorage"]),
        .library(name: "FeatureUpload", targets: ["FeatureUpload"]),
        .library(name: "FeatureView", targets: ["FeatureView"]),
        .library(name: "FeatureHistory", targets: ["FeatureHistory"]),
        .library(name: "AppShellDemo", targets: ["AppShellDemo"])
    ],
    dependencies: [
        .package(url: "https://github.com/leif-ibsen/SwiftKyber", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "CArgon2",
            path: "Vendor/Argon2",
            publicHeadersPath: "include",
            cSettings: [
                .headerSearchPath("src"),
                .headerSearchPath("src/blake2"),
                .headerSearchPath("include")
            ]
        ),
        .target(
            name: "CoreCrypto",
            dependencies: [
                .product(name: "SwiftKyber", package: "SwiftKyber"),
                "CArgon2"
            ]
        ),
        .target(name: "CoreNetworking"),
        .target(name: "CoreStorage"),
        .target(name: "FeatureUpload", dependencies: ["CoreCrypto", "CoreNetworking", "CoreStorage"]),
        .target(name: "FeatureView", dependencies: ["CoreCrypto", "CoreNetworking", "CoreStorage"]),
        .target(name: "FeatureHistory", dependencies: ["CoreStorage"]),
        .target(
            name: "AppShellDemo",
            dependencies: [
                "CoreCrypto",
                "CoreNetworking",
                "CoreStorage",
                "FeatureUpload",
                "FeatureView",
                "FeatureHistory"
            ]
        ),
        .testTarget(name: "CoreCryptoTests", dependencies: ["CoreCrypto"]),
        .testTarget(name: "CoreNetworkingTests", dependencies: ["CoreNetworking"]),
        .testTarget(name: "FeatureUploadTests", dependencies: ["FeatureUpload", "CoreCrypto", "CoreNetworking"]),
        .testTarget(name: "FeatureViewTests", dependencies: ["FeatureView", "CoreCrypto", "CoreNetworking"]),
        .testTarget(name: "FeatureHistoryTests", dependencies: ["FeatureHistory", "CoreStorage"]),
        .testTarget(name: "AppShellDemoTests", dependencies: ["AppShellDemo"])
    ]
)
