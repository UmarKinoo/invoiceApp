import SwiftUI

struct RootView: View {
    @State private var isSignedIn = AuthStore.isSignedIn

    var body: some View {
        Group {
            if isSignedIn {
                MainTabView(isSignedIn: $isSignedIn)
            } else {
                LoginView(isSignedIn: $isSignedIn)
            }
        }
        .preferredColorScheme(.dark)
    }
}
