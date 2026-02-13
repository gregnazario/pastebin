// Gradle settings for the native Android multi-module workspace.

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "secure-pastebin-native-android"

include(
    ":app",
    ":core:crypto",
    ":core:network",
    ":core:storage",
    ":feature:upload",
    ":feature:view",
    ":feature:history"
)
