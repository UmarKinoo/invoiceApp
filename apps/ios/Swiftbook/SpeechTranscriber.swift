import AVFoundation
import Combine
import Speech

@MainActor
final class SpeechTranscriber: NSObject, ObservableObject {
    @Published private(set) var isRecording = false
    @Published private(set) var authorizationDenied = false

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))

    func requestPermissions() async {
        let speechStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
        if speechStatus != .authorized {
            authorizationDenied = true
            return
        }

        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        let micGranted = await withCheckedContinuation { continuation in
            session.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        if !micGranted {
            authorizationDenied = true
        }
        #endif
    }

    func startRecording(onPartial: @escaping (String) -> Void) throws {
        guard !isRecording else { return }
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            throw TranscriberError.unavailable
        }

        recognitionTask?.cancel()
        recognitionTask = nil

        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)
        #endif

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()
        isRecording = true

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest!) { result, error in
            if let result {
                onPartial(result.bestTranscription.formattedString)
            }
            if error != nil || (result?.isFinal ?? false) {
                Task { @MainActor in
                    self.stopRecording()
                }
            }
        }
    }

    func stopRecording() {
        guard isRecording else { return }
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isRecording = false

        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false)
        #endif
    }

    enum TranscriberError: LocalizedError {
        case unavailable

        var errorDescription: String? {
            "Speech recognition is unavailable."
        }
    }
}
