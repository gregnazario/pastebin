/// Premium minimal design tokens and view modifiers for Apple native host-shell screens.
import SwiftUI

/// Shared palette values used by the Apple premium minimal shell.
public enum PremiumMinimalPalette {
    public static let accent = Color(red: 0.11, green: 0.34, blue: 0.47)
    public static let backgroundStart = Color(red: 0.95, green: 0.96, blue: 0.98)
    public static let backgroundEnd = Color(red: 0.88, green: 0.91, blue: 0.94)
    public static let cardFill = Color.white.opacity(0.96)
    public static let cardStroke = Color.black.opacity(0.10)
}

/// Shared premium minimal gradient background.
public struct PremiumMinimalBackground: View {
    public init() {}

    public var body: some View {
        LinearGradient(
            colors: [
                PremiumMinimalPalette.backgroundStart,
                PremiumMinimalPalette.backgroundEnd
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

/// Wraps card-like surfaces used for elevated shell controls.
public struct PremiumMinimalCard<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(PremiumMinimalPalette.cardFill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(PremiumMinimalPalette.cardStroke, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.07), radius: 16, x: 0, y: 8)
    }
}

private struct PremiumMinimalRootStyleModifier: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            PremiumMinimalBackground()
            content
        }
        .tint(PremiumMinimalPalette.accent)
        .fontDesign(.rounded)
    }
}

private struct PremiumMinimalFormStyleModifier: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 16.0, macOS 13.0, *) {
            content
                .scrollContentBackground(.hidden)
                .listRowBackground(PremiumMinimalPalette.cardFill)
                .background(PremiumMinimalBackground())
                .tint(PremiumMinimalPalette.accent)
                .fontDesign(.rounded)
        } else {
            content
                .background(PremiumMinimalBackground())
                .tint(PremiumMinimalPalette.accent)
                .fontDesign(.rounded)
        }
    }
}

public extension View {
    /// Applies premium minimal global styling for root container hosts.
    func premiumMinimalRootStyle() -> some View {
        modifier(PremiumMinimalRootStyleModifier())
    }

    /// Applies premium minimal styling for form-driven feature screens.
    func premiumMinimalFormStyle() -> some View {
        modifier(PremiumMinimalFormStyleModifier())
    }
}
