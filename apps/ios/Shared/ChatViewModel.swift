import Combine
import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatBubble] = []
    @Published var status: String?
    @Published var isStreaming = false
    @Published var threadId: String?
    @Published var awaitingResume = false
    @Published var errorMessage: String?

    private let api = AgentAPIClient.shared

    func loadHistory(threadId: String) async {
        do {
            let history = try await api.fetchHistory(threadId: threadId)
            messages = history.messages.map { mapHistory($0) }
            self.threadId = threadId
            awaitingResume = history.pendingInterrupt != nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Resume a human-in-the-loop interrupt (same as typing confirm on web).
    func confirmPending() async {
        await send("Yes, confirm.")
    }

    func cancelPending() async {
        await send("No, cancel.")
    }

    func send(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isStreaming else { return }

        errorMessage = nil
        isStreaming = true
        status = "Sending…"

        let userId = UUID().uuidString
        messages.append(ChatBubble(id: userId, role: .user, text: trimmed, isStreaming: false))

        let assistantId = UUID().uuidString
        messages.append(ChatBubble(id: assistantId, role: .assistant, text: "", isStreaming: true))

        let resume = awaitingResume
        awaitingResume = false

        do {
            let stream = await api.streamChat(message: trimmed, threadId: threadId, resume: resume)
            for try await event in stream {
                apply(event, assistantId: assistantId)
            }
        } catch is CancellationError {
            patchAssistant(id: assistantId, text: "Cancelled.", streaming: false)
        } catch {
            errorMessage = error.localizedDescription
            patchAssistant(id: assistantId, text: "Error: \(error.localizedDescription)", streaming: false)
        }

        isStreaming = false
        status = nil
    }

    func signOut() async {
        await api.logout()
        messages = []
        threadId = nil
        awaitingResume = false
        status = nil
        errorMessage = nil
    }

    private func apply(_ event: AgentStreamEvent, assistantId: String) {
        switch event {
        case .session(let id):
            threadId = id
        case .status(let message):
            status = message
        case .token(let content):
            status = nil
            appendAssistant(id: assistantId, content: content)
        case .assistant(let content):
            status = nil
            fillAssistantIfEmpty(id: assistantId, content: content, streaming: true)
        case .final(let content):
            status = nil
            fillAssistantIfEmpty(id: assistantId, content: content, streaming: false)
        case .interrupt(let question):
            status = "Waiting for your reply"
            awaitingResume = true
            patchAssistant(id: assistantId, text: "", streaming: false)
            messages.append(ChatBubble(id: UUID().uuidString, role: .system, text: question, isStreaming: false))
        case .draftLink(_, let invoiceId, let invoiceNumber):
            messages.append(
                ChatBubble(
                    id: UUID().uuidString,
                    role: .draftLink,
                    text: "",
                    isStreaming: false,
                    draftInvoiceId: String(invoiceId),
                    draftInvoiceNumber: invoiceNumber
                )
            )
        case .error(let message):
            patchAssistant(id: assistantId, text: "Error: \(message)", streaming: false)
        case .done:
            status = nil
            if let idx = messages.firstIndex(where: { $0.id == assistantId }) {
                var bubble = messages[idx]
                if bubble.text.isEmpty {
                    bubble.text = "(No text reply — check tool steps on web.)"
                }
                bubble.isStreaming = false
                messages[idx] = bubble
            }
        }
    }

    private func appendAssistant(id: String, content: String) {
        guard let idx = messages.firstIndex(where: { $0.id == id }) else { return }
        var bubble = messages[idx]
        bubble.text += content
        messages[idx] = bubble
    }

    private func patchAssistant(id: String, text: String, streaming: Bool) {
        guard let idx = messages.firstIndex(where: { $0.id == id }) else { return }
        var bubble = messages[idx]
        bubble.text = text
        bubble.isStreaming = streaming
        messages[idx] = bubble
    }

    /// Same as web: only fill from assistant/final when tokens did not already stream text.
    private func fillAssistantIfEmpty(id: String, content: String, streaming: Bool) {
        guard let idx = messages.firstIndex(where: { $0.id == id }) else { return }
        var bubble = messages[idx]
        if bubble.text.isEmpty {
            bubble.text = content
        }
        bubble.isStreaming = streaming
        messages[idx] = bubble
    }

    private func mapHistory(_ message: AgentHistoryMessage) -> ChatBubble {
        switch message {
        case .user(let content):
            return ChatBubble(id: UUID().uuidString, role: .user, text: content, isStreaming: false)
        case .assistant(let content):
            return ChatBubble(id: UUID().uuidString, role: .assistant, text: content, isStreaming: false)
        case .interrupt(let question):
            return ChatBubble(id: UUID().uuidString, role: .system, text: question, isStreaming: false)
        case .draftLink(_, let invoiceId, let invoiceNumber):
            return ChatBubble(
                id: UUID().uuidString,
                role: .draftLink,
                text: "",
                isStreaming: false,
                draftInvoiceId: String(invoiceId),
                draftInvoiceNumber: invoiceNumber
            )
        }
    }
}
