import Foundation

struct AgentSession: Codable, Identifiable, Sendable {
    let id: String
    let title: String
    let lastMessageAt: String?
}

struct AgentSessionsResponse: Codable, Sendable {
    let sessions: [AgentSession]
}

struct ThreadHistoryResponse: Codable, Sendable {
    let messages: [AgentHistoryMessage]
    let pendingInterrupt: String?
}

enum AgentHistoryMessage: Codable, Sendable {
    case user(content: String)
    case assistant(content: String)
    case interrupt(question: String)
    case draftLink(url: String, invoiceId: Int, invoiceNumber: String)

    enum CodingKeys: String, CodingKey {
        case role, content, question, url, invoiceId, invoiceNumber
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let role = try c.decode(String.self, forKey: .role)
        switch role {
        case "user":
            self = .user(content: try c.decode(String.self, forKey: .content))
        case "assistant":
            self = .assistant(content: try c.decode(String.self, forKey: .content))
        case "interrupt":
            self = .interrupt(question: try c.decode(String.self, forKey: .question))
        case "draft_link":
            self = .draftLink(
                url: try c.decode(String.self, forKey: .url),
                invoiceId: decodeJSONInt(c, key: .invoiceId),
                invoiceNumber: try c.decode(String.self, forKey: .invoiceNumber)
            )
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .role,
                in: c,
                debugDescription: "Unknown role \(role)"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .user(let content):
            try c.encode("user", forKey: .role)
            try c.encode(content, forKey: .content)
        case .assistant(let content):
            try c.encode("assistant", forKey: .role)
            try c.encode(content, forKey: .content)
        case .interrupt(let question):
            try c.encode("interrupt", forKey: .role)
            try c.encode(question, forKey: .question)
        case .draftLink(let url, let invoiceId, let invoiceNumber):
            try c.encode("draft_link", forKey: .role)
            try c.encode(url, forKey: .url)
            try c.encode(invoiceId, forKey: .invoiceId)
            try c.encode(invoiceNumber, forKey: .invoiceNumber)
        }
    }
}

struct ChatBubble: Identifiable, Sendable {
    let id: String
    enum Role: Sendable {
        case user
        case assistant
        case system
        case draftLink
    }
    let role: Role
    var text: String
    var isStreaming: Bool
    var draftInvoiceId: String? = nil
    var draftInvoiceNumber: String? = nil
}

private func decodeJSONInt<K: CodingKey>(_ c: KeyedDecodingContainer<K>, key: K) -> Int {
    if let value = try? c.decode(Int.self, forKey: key) { return value }
    if let value = try? c.decode(String.self, forKey: key), let intValue = Int(value) { return intValue }
    return 0
}

enum AgentStreamEvent: Sendable {
    case session(threadId: String)
    case status(message: String)
    case token(content: String)
    case assistant(content: String)
    case final(content: String)
    case interrupt(question: String)
    case draftLink(url: String, invoiceId: Int, invoiceNumber: String)
    case error(message: String)
    case done
}
