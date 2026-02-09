/// Demo app root container with runtime API-base configuration controls.
import AppShellDemo
import Foundation
import SwiftUI

struct DemoRootContainerView: View {
    @AppStorage("secure_pastebin_demo_api_base_url") private var apiBaseURLString: String = "http://127.0.0.1:3000"
    @State private var isSettingsPresented: Bool = false
    @State private var rebuildToken: Int = 0

    var body: some View {
        ZStack(alignment: .topTrailing) {
            DemoAppFactory.makeRootView(apiBaseURL: resolvedAPIBaseURL)
                .id(rebuildToken)

            Button {
                isSettingsPresented = true
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.title3)
                    .padding(10)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding(.top, 12)
            .padding(.trailing, 16)
            .accessibilityLabel("Demo Settings")
        }
        .sheet(isPresented: $isSettingsPresented) {
            DemoSettingsView(
                currentAPIBaseURLString: apiBaseURLString,
                onApply: { updatedValue in
                    let nextState = HostRuntimeSettingsState(
                        apiBaseURLString: apiBaseURLString,
                        rebuildToken: rebuildToken
                    ).applying(apiBaseURLString: updatedValue)
                    apiBaseURLString = nextState.apiBaseURLString
                    rebuildToken = nextState.rebuildToken
                }
            )
        }
    }

    private var resolvedAPIBaseURL: URL {
        HostRuntimeSettingsState(apiBaseURLString: apiBaseURLString)
            .resolvedAPIBaseURL()
    }
}
