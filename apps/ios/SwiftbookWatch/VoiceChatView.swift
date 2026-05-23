import SwiftUI

/// watchOS companion: voice input only (no keyboard composer).
struct VoiceChatView: View {
    @Binding var isSignedIn: Bool
    @StateObject private var viewModel = ChatViewModel()
    @StateObject private var recorder = WatchAudioRecorder()
    @ObservedObject private var bridge = WatchConnectivityBridge.shared

    private var displayMessages: [ChatBubble] {
        viewModel.messages.suffix(5)
    }

    private var interruptQuestion: String? {
        viewModel.messages.last(where: { $0.role == .system })?.text
    }

    var body: some View {
        VStack(spacing: 6) {
            messageList
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            if viewModel.awaitingResume {
                confirmationBar
            }

            footerSection
        }
        .padding(.horizontal, 6)
        .navigationTitle("Agent")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Sign out") {
                    Task {
                        await viewModel.signOut()
                        isSignedIn = false
                    }
                }
                .font(.caption2)
            }
        }
        .onAppear { bridge.beginConnectionMonitoring() }
        .onDisappear { bridge.stopConnectionMonitoring() }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    if displayMessages.isEmpty, !viewModel.isStreaming {
                        Text("Tap Talk to ask the agent.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    ForEach(displayMessages) { message in
                        messageRow(message)
                            .id(message.id)
                    }
                }
                .padding(.vertical, 4)
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                scrollToBottom(proxy: proxy)
            }
            .onChange(of: viewModel.messages.last?.text) { _, _ in
                scrollToBottom(proxy: proxy)
            }
        }
    }

    private var confirmationBar: some View {
        VStack(spacing: 8) {
            if let interruptQuestion, !interruptQuestion.isEmpty {
                Text(interruptQuestion)
                    .font(.footnote)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 8) {
                Button("Cancel") {
                    Task { await viewModel.cancelPending() }
                }
                .buttonStyle(.bordered)
                .tint(.red)

                Button("Confirm") {
                    Task { await viewModel.confirmPending() }
                }
                .buttonStyle(.borderedProminent)
            }
            .controlSize(.large)
        }
        .padding(8)
        .background(Color.orange.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .disabled(viewModel.isStreaming)
    }

    private var footerSection: some View {
        VStack(spacing: 6) {
            if let status = viewModel.status {
                Text(status)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            if !viewModel.awaitingResume, let message = bridge.connectionStatusMessage {
                Text(message)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }

            Button {
                toggleRecording()
            } label: {
                Label(
                    recorder.isRecording ? "Stop" : "Talk",
                    systemImage: recorder.isRecording ? "stop.fill" : "mic.fill"
                )
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(viewModel.isStreaming)
        }
    }

    @ViewBuilder
    private func messageRow(_ message: ChatBubble) -> some View {
        switch message.role {
        case .system:
            VStack(alignment: .leading, spacing: 4) {
                Text("Confirmation required")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.orange)
                Text(message.text)
                    .font(.footnote)
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

        case .assistant:
            Text(message.text.isEmpty && message.isStreaming ? "…" : message.text)
                .font(.footnote)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)

        case .user:
            Text(message.text)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .lineLimit(3)

        case .draftLink:
            Text("Draft \(message.draftInvoiceNumber ?? "ready") — review on iPhone")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let last = viewModel.messages.last else { return }
        withAnimation(.easeOut(duration: 0.2)) {
            proxy.scrollTo(last.id, anchor: .bottom)
        }
    }

    private func toggleRecording() {
        if recorder.isRecording {
            guard let fileURL = recorder.stop() else { return }
            Task {
                defer { try? FileManager.default.removeItem(at: fileURL) }
                do {
                    let data = try Data(contentsOf: fileURL)
                    let text = try await bridge.requestTranscription(audioData: data)
                    await viewModel.send(text)
                } catch {
                    viewModel.errorMessage = error.localizedDescription
                }
            }
            return
        }

        do {
            try recorder.start()
        } catch {
            viewModel.errorMessage = error.localizedDescription
        }
    }
}
