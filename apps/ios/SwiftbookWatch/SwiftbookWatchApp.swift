import SwiftUI

@main
struct SwiftbookWatchApp: App {
    @State private var isSignedIn = AuthStore.isSignedIn

    init() {
        #if canImport(WatchConnectivity)
        WatchConnectivityBridge.shared.startSession()
        #endif
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                if isSignedIn {
                    VoiceChatView(isSignedIn: $isSignedIn)
                } else {
                    WatchLoginView(isSignedIn: $isSignedIn)
                }
            }
        }
    }
}
