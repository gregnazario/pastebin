/// SwiftUI iOS app entry point for the native Apple host-shell demo.
import AppShellDemo
import SwiftUI

@main
struct SecurePastebinDemoApp: App {
    var body: some Scene {
        WindowGroup {
            DemoAppFactory.makeRootView()
        }
    }
}
