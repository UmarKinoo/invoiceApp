import SwiftUI

@main
struct SwiftbookApp: App {
    init() {
        #if canImport(WatchConnectivity)
        let bridge = WatchConnectivityBridge.shared
        bridge.startSession()
        bridge.onTranscribeRequest = { data, reply in
            Task {
                do {
                    let text = try await PhoneTranscriptionService.transcribe(audioData: data)
                    reply(.success(text))
                } catch {
                    reply(.failure(error))
                }
            }
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .onAppear { SwiftbookTheme.configureTabBarAppearance() }
        }
    }
}
