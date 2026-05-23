import Combine
import Foundation

#if canImport(WatchConnectivity)
import WatchConnectivity

enum WatchVoiceMessage {
    static let transcribeRequest = "transcribe_request"
    static let transcribeResponse = "transcribe_response"
    static let transcribeError = "transcribe_error"
}

/// Watch ↔ iPhone bridge. Intentionally not `@MainActor` so `WCSessionDelegate` callbacks fire reliably.
final class WatchConnectivityBridge: NSObject, ObservableObject {
    static let shared = WatchConnectivityBridge()

    @Published private(set) var activationState: WCSessionActivationState = .notActivated
    @Published private(set) var isReachable = false
    #if os(watchOS)
    @Published private(set) var isCompanionAppInstalled = false
    #endif

    var isActivated: Bool { activationState == .activated }

    #if os(watchOS)
    /// User-facing hint for the watch voice screen.
    var connectionStatusMessage: String? {
        switch activationState {
        case .notActivated:
            return "Starting iPhone link…"
        case .inactive:
            return "Open Swiftbook on your paired iPhone."
        case .activated:
            if !isCompanionAppInstalled {
                return "Install Swiftbook on the paired iPhone (run the Swiftbook scheme, not SwiftbookWatch alone)."
            }
            if !isReachable {
                return "Keep Swiftbook open on iPhone (app in foreground)."
            }
            return nil
        @unknown default:
            return "Connecting to iPhone…"
        }
    }
    #endif

    #if os(iOS)
    var onTranscribeRequest: ((Data, @escaping (Result<String, Error>) -> Void) -> Void)?
    #endif

    private let session: WCSession? = WCSession.isSupported() ? WCSession.default : nil
    private var monitorTask: Task<Void, Never>?

    override private init() {
        super.init()
        startSession()
    }

    /// Sets delegate, activates, and copies live session flags onto the main queue.
    func startSession() {
        guard let session else { return }
        session.delegate = self
        session.activate()
        applySessionState(session)
    }

    func beginConnectionMonitoring() {
        monitorTask?.cancel()
        startSession()
        monitorTask = Task { [weak self] in
            guard let self else { return }
            for _ in 0 ..< 45 {
                if Task.isCancelled { return }
                self.startSession()
                if await MainActor.run(body: { self.isActivated }) {
                    return
                }
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    func stopConnectionMonitoring() {
        monitorTask?.cancel()
        monitorTask = nil
    }

    /// Waits until `WCSession.activate()` finishes (avoids "WCSession has not been activated").
    func ensureActivated(timeoutSeconds: TimeInterval = 20) async throws {
        guard let session else {
            throw BridgeError.sessionUnsupported
        }
        if session.activationState == .activated {
            applySessionState(session)
            return
        }

        let deadline = Date().addingTimeInterval(timeoutSeconds)
        while Date() < deadline {
            applySessionState(session)
            if session.activationState == .activated {
                return
            }
            try await Task.sleep(for: .milliseconds(250))
        }

        throw BridgeError.sessionNotActivated(Self.sessionNotActivatedMessage(for: self))
    }

    private static func sessionNotActivatedMessage(for bridge: WatchConnectivityBridge) -> String {
        #if os(watchOS)
        return bridge.connectionStatusMessage
            ?? "Could not link to iPhone. Run the Swiftbook scheme on the paired iPhone simulator, then open the watch app."
        #else
        return "Watch session did not activate."
        #endif
    }

    #if os(watchOS)
    func requestTranscription(audioData: Data) async throws -> String {
        try await ensureActivated()
        guard let session else {
            throw BridgeError.sessionUnsupported
        }
        applySessionState(session)
        guard session.isCompanionAppInstalled else {
            throw BridgeError.sessionNotActivated(
                "Swiftbook is not installed on the paired iPhone. Run the Swiftbook (iPhone) scheme first."
            )
        }
        guard session.isReachable else {
            throw BridgeError.phoneUnreachable
        }
        return try await withCheckedThrowingContinuation { continuation in
            session.sendMessage(
                [WatchVoiceMessage.transcribeRequest: audioData],
                replyHandler: { reply in
                    if let text = reply[WatchVoiceMessage.transcribeResponse] as? String {
                        continuation.resume(returning: text)
                    } else if let error = reply[WatchVoiceMessage.transcribeError] as? String {
                        continuation.resume(throwing: BridgeError.transcriptionFailed(error))
                    } else {
                        continuation.resume(throwing: BridgeError.invalidReply)
                    }
                },
                errorHandler: { error in
                    continuation.resume(throwing: error)
                }
            )
        }
    }
    #endif

    enum BridgeError: LocalizedError {
        case sessionUnsupported
        case sessionNotActivated(String)
        case phoneUnreachable
        case transcriptionFailed(String)
        case invalidReply

        var errorDescription: String? {
            switch self {
            case .sessionUnsupported:
                return "Watch connectivity is not available on this device."
            case .sessionNotActivated(let message):
                return message
            case .phoneUnreachable:
                return "Open Swiftbook on your iPhone (unlocked and in the foreground) to use voice."
            case .transcriptionFailed(let message):
                return message
            case .invalidReply:
                return "Unexpected response from iPhone."
            }
        }
    }

    private func applySessionState(_ session: WCSession) {
        let state = session.activationState
        let reachable = session.isReachable
        #if os(watchOS)
        let companion = session.isCompanionAppInstalled
        #endif
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.activationState = state
            self.isReachable = reachable
            #if os(watchOS)
            self.isCompanionAppInstalled = companion
            #endif
        }
    }
}

extension WatchConnectivityBridge: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if let error {
                self.activationState = .notActivated
            } else {
                self.activationState = activationState
            }
            self.isReachable = session.isReachable
            #if os(watchOS)
            self.isCompanionAppInstalled = session.isCompanionAppInstalled
            #endif
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.isReachable = session.isReachable
            #if os(watchOS)
            self.isCompanionAppInstalled = session.isCompanionAppInstalled
            #endif
        }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {
        applySessionState(session)
    }

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
        applySessionState(session)
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        guard message[WatchVoiceMessage.transcribeRequest] != nil else {
            replyHandler([WatchVoiceMessage.transcribeError: "Unknown request"])
            return
        }
        guard let audioData = message[WatchVoiceMessage.transcribeRequest] as? Data else {
            replyHandler([WatchVoiceMessage.transcribeError: "Missing audio data"])
            return
        }

        DispatchQueue.main.async {
            guard let handler = WatchConnectivityBridge.shared.onTranscribeRequest else {
                replyHandler([WatchVoiceMessage.transcribeError: "iPhone transcriber not ready"])
                return
            }
            handler(audioData) { result in
                switch result {
                case .success(let text):
                    replyHandler([WatchVoiceMessage.transcribeResponse: text])
                case .failure(let error):
                    replyHandler([WatchVoiceMessage.transcribeError: error.localizedDescription])
                }
            }
        }
    }
    #endif
}
#endif
