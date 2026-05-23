import SwiftUI

struct SwiftbookLogo: View {
    var size: CGFloat = 48

    var body: some View {
        HStack(spacing: size * 0.2) {
            Image("SwiftbookIcon")
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
            Text("Swiftbook")
                .font(.system(size: size * 0.55, weight: .semibold, design: .default))
                .tracking(-0.5)
                .foregroundStyle(SwiftbookTheme.foreground)
        }
    }
}
