import AVFoundation
import Speech

/// Transcribes audio blobs received from the Watch companion.
enum PhoneTranscriptionService {
    static func transcribe(audioData: Data) async throws -> String {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("m4a")
        try audioData.write(to: tempURL)
        defer { try? FileManager.default.removeItem(at: tempURL) }

        let auth = await requestSpeechAuthorization()
        guard auth == .authorized else {
            throw TranscriptionError.notAuthorized
        }

        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")), recognizer.isAvailable else {
            throw TranscriptionError.unavailable
        }

        let request = SFSpeechURLRecognitionRequest(url: tempURL)
        request.shouldReportPartialResults = false

        return try await withCheckedThrowingContinuation { continuation in
            recognizer.recognitionTask(with: request) { result, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                if let result, result.isFinal {
                    let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
                    if text.isEmpty {
                        continuation.resume(throwing: TranscriptionError.empty)
                    } else {
                        continuation.resume(returning: text)
                    }
                }
            }
        }
    }

    private static func requestSpeechAuthorization() async -> SFSpeechRecognizerAuthorizationStatus {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }

    enum TranscriptionError: LocalizedError {
        case notAuthorized
        case unavailable
        case empty

        var errorDescription: String? {
            switch self {
            case .notAuthorized:
                return "Speech recognition permission is required on iPhone."
            case .unavailable:
                return "Speech recognition is unavailable."
            case .empty:
                return "Could not understand the recording."
            }
        }
    }
}
