// Root Gradle build for the native Android workspace.
import com.android.build.api.dsl.ApplicationExtension
import com.android.build.api.dsl.LibraryExtension

plugins {
    id("com.android.application") version "8.6.1" apply false
    id("com.android.library") version "8.6.1" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}

val currentJvmMajor = JavaVersion.current().majorVersion.toIntOrNull() ?: 0
val disableReleaseLintOnCurrentJvm = currentJvmMajor >= 24

subprojects {
    plugins.withId("com.android.application") {
        extensions.configure<ApplicationExtension>("android") {
            lint {
                // AGP 8.6.1 lint crashes on JVM 24+ (for example 25.0.2). Keep
                // release lint on supported JVMs while unblocking release builds
                // on newer runtimes.
                checkReleaseBuilds = !disableReleaseLintOnCurrentJvm
            }
        }
    }
    plugins.withId("com.android.library") {
        extensions.configure<LibraryExtension>("android") {
            lint {
                checkReleaseBuilds = !disableReleaseLintOnCurrentJvm
            }
        }
    }
}
