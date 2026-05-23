import SwiftUI

struct ChatView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var isSignedIn: Bool
    @StateObject private var viewModel = ChatViewModel()
    @StateObject private var transcriber = SpeechTranscriber()
    @State private var input = ""
    @State private var voiceDraft = ""
    @State private var invoiceRoute: InvoiceRoute?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(viewModel.messages) { message in
                                bubble(message)
                                    .id(message.id)
                            }
                        }
                        .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .onChange(of: viewModel.messages.map(\.id)) { _, _ in
                        scrollToBottom(proxy: proxy)
                    }
                    .onChange(of: viewModel.messages.map(\.text)) { _, _ in
                        scrollToBottom(proxy: proxy)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                if let status = viewModel.status {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                composer
            }
            .navigationTitle("CRM Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        dismissChat()
                    }
                }
            }
            .swiftbookScreen()
            .navigationDestination(item: $invoiceRoute) { route in
                InvoiceDetailView(invoiceId: route.id)
            }
            .task {
                await transcriber.requestPermissions()
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        if let last = viewModel.messages.last {
            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
        }
    }

    @ViewBuilder
    private func bubble(_ message: ChatBubble) -> some View {
        switch message.role {
        case .draftLink:
            draftLinkBubble(message)
        default:
            textBubble(message)
        }
    }

    @ViewBuilder
    private func draftLinkBubble(_ message: ChatBubble) -> some View {
        HStack {
            Spacer(minLength: 40)
            VStack(alignment: .leading, spacing: 8) {
                Text("Draft invoice ready")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SwiftbookTheme.foreground)
                if let invoiceId = message.draftInvoiceId {
                    Button {
                        invoiceRoute = InvoiceRoute(id: invoiceId)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.text.fill")
                            Text("Review draft \(message.draftInvoiceNumber ?? invoiceId)")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 14)
                        .background(SwiftbookTheme.primary)
                        .foregroundStyle(SwiftbookTheme.primaryForeground)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(12)
            .background(SwiftbookTheme.card)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(SwiftbookTheme.cardBorder, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    @ViewBuilder
    private func textBubble(_ message: ChatBubble) -> some View {
        let isUser = message.role == .user
        let isSystem = message.role == .system
        HStack {
            if isUser { Spacer(minLength: 40) }
            Text(message.text.isEmpty && message.isStreaming ? "…" : message.text)
                .padding(12)
                .background(
                    isUser
                        ? SwiftbookTheme.primary.opacity(0.18)
                        : isSystem
                            ? Color.orange.opacity(0.15)
                            : SwiftbookTheme.card
                )
                .foregroundStyle(SwiftbookTheme.foreground)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            if !isUser { Spacer(minLength: 40) }
        }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Message", text: $input, axis: .vertical)
                .lineLimit(1 ... 5)
                .textFieldStyle(.roundedBorder)

            Button {
                toggleRecording()
            } label: {
                Image(systemName: transcriber.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                    .font(.title2)
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(transcriber.isRecording ? .red : .accentColor)
            }
            .accessibilityLabel(transcriber.isRecording ? "Stop recording" : "Record voice message")

            Button {
                sendText()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
            }
            .disabled(viewModel.isStreaming || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding()
        .background(SwiftbookTheme.card)
    }

    private func dismissChat() {
        dismiss()
    }

    private func sendText() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        input = ""
        Task { await viewModel.send(text) }
    }

    private func toggleRecording() {
        if transcriber.isRecording {
            transcriber.stopRecording()
            let text = voiceDraft.trimmingCharacters(in: .whitespacesAndNewlines)
            voiceDraft = ""
            if !text.isEmpty {
                input = text
                sendText()
            }
            return
        }

        voiceDraft = ""
        do {
            try transcriber.startRecording { partial in
                voiceDraft = partial
                input = partial
            }
        } catch {
            viewModel.errorMessage = error.localizedDescription
        }
    }
}
