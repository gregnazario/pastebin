/// Demo app root container with runtime API-base configuration controls.
import AppShellDemo
import Foundation
import SwiftUI

struct DemoRootContainerView: View {
    @AppStorage("secure_pastebin_demo_api_base_url") private var apiBaseURLString: String = "https://pastebin.sed.fyi"
    @State private var isSettingsPresented: Bool = false
    @State private var rebuildToken: Int = 0

    var body: some View {
        ZStack(alignment: .topTrailing) {
            DemoAppFactory.makeRootView(apiBaseURL: resolvedAPIBaseURL)
                .id(rebuildToken)

            Button {
                mutateFlowState { state in
                    state.presentSettings()
                }
            } label: {
                PremiumMinimalCard {
                    Image(systemName: "slider.horizontal.3")
                        .font(.headline)
                        .foregroundStyle(PremiumMinimalPalette.accent)
                }
            }
            .padding(.top, 12)
            .padding(.trailing, 16)
            .accessibilityLabel("Demo Settings")
        }
        .sheet(isPresented: $isSettingsPresented) {
            DemoSettingsView(
                currentAPIBaseURLString: apiBaseURLString,
                onApply: { updatedValue in
                    mutateFlowState { state in
                        state.applySettings(apiBaseURLString: updatedValue)
                    }
                }
            )
        }
    }

    private var resolvedAPIBaseURL: URL {
        HostRuntimeSettingsState(apiBaseURLString: apiBaseURLString)
            .resolvedAPIBaseURL()
    }

    private func mutateFlowState(_ update: (inout DemoRootFlowState) -> Void) {
        var state = DemoRootFlowState(
            runtimeSettings: HostRuntimeSettingsState(
                apiBaseURLString: apiBaseURLString,
                rebuildToken: rebuildToken
            ),
            isSettingsPresented: isSettingsPresented
        )
        update(&state)
        apiBaseURLString = state.runtimeSettings.apiBaseURLString
        rebuildToken = state.runtimeSettings.rebuildToken
        isSettingsPresented = state.isSettingsPresented
    }
}
