import AVFoundation
import Combine
import Foundation

@MainActor
final class WatchAudioRecorder: ObservableObject {
    @Published private(set) var isRecording = false

    private var recorder: AVAudioRecorder?
    private var fileURL: URL?
    private var maxDurationTask: Task<Void, Never>?

    /// Short clips only — matches the original working `sendMessage` path (~65 KB cap).
    private let maxRecordingSeconds: TimeInterval = 10

    func start() throws {
        guard !isRecording else { return }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default)
        try session.setActive(true)

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("m4a")
        fileURL = url

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16_000,
            AVNumberOfChannelsKey: 1,
            AVEncoderBitRateKey: 16_000,
            AVEncoderAudioQualityKey: AVAudioQuality.low.rawValue,
        ]

        recorder = try AVAudioRecorder(url: url, settings: settings)
        recorder?.record()
        isRecording = true

        maxDurationTask?.cancel()
        maxDurationTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(maxRecordingSeconds))
            await MainActor.run {
                guard let self, self.isRecording else { return }
                _ = self.stop()
            }
        }
    }

    /// Returns the recording file URL. Caller must delete after use.
    func stop() -> URL? {
        guard isRecording else { return nil }
        maxDurationTask?.cancel()
        maxDurationTask = nil
        recorder?.stop()
        recorder = nil
        isRecording = false
        try? AVAudioSession.sharedInstance().setActive(false)

        let url = fileURL
        fileURL = nil
        return url
    }
}
