import SwiftUI

#if os(iOS)
import UIKit
#endif

/// Visual tokens aligned with the web mobile dashboard (dark shell, glass tab bar).
enum SwiftbookTheme {
    static let background = Color(red: 0.07, green: 0.07, blue: 0.08)
    static let card = Color(red: 0.11, green: 0.11, blue: 0.12)
    static let cardBorder = Color.white.opacity(0.08)
    static let foreground = Color(red: 0.97, green: 0.97, blue: 0.98)
    static let muted = Color(red: 0.55, green: 0.55, blue: 0.58)
    static let primary = Color(red: 0.98, green: 0.98, blue: 0.98)
    static let primaryForeground = Color(red: 0.12, green: 0.12, blue: 0.12)
    static let destructive = Color(red: 0.94, green: 0.27, blue: 0.27)

    static func configureTabBarAppearance() {
        #if os(iOS)
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(red: 0.13, green: 0.13, blue: 0.14, alpha: 0.92)
        appearance.shadowColor = UIColor.white.withAlphaComponent(0.08)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().tintColor = UIColor(primary)
        UITabBar.appearance().unselectedItemTintColor = UIColor(muted)
        #endif
    }
}

struct SwiftbookScreenBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(SwiftbookTheme.background)
            .foregroundStyle(SwiftbookTheme.foreground)
    }
}

extension View {
    func swiftbookScreen() -> some View {
        modifier(SwiftbookScreenBackground())
    }
}

struct SwiftbookCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SwiftbookTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(SwiftbookTheme.cardBorder, lineWidth: 1)
            )
    }
}
