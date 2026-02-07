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
        .library(name: "FeatureHistory", targets: ["FeatureHistory"])
    ],
    dependencies: [],
    targets: [
        .target(name: "CoreCrypto"),
        .target(name: "CoreNetworking"),
        .target(name: "CoreStorage"),
        .target(name: "FeatureUpload", dependencies: ["CoreCrypto", "CoreNetworking", "CoreStorage"]),
        .target(name: "FeatureView", dependencies: ["CoreCrypto", "CoreNetworking"]),
        .target(name: "FeatureHistory", dependencies: ["CoreStorage"]),
        .testTarget(name: "CoreCryptoTests", dependencies: ["CoreCrypto"]),
        .testTarget(name: "CoreNetworkingTests", dependencies: ["CoreNetworking"])
    ]
)
