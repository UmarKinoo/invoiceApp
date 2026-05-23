import Foundation

enum AgentStreamParser {
    private static func parseJSONInt(_ value: Any?) -> Int {
        if let n = value as? Int { return n }
        if let n = value as? Double { return Int(n) }
        if let s = value as? String, let n = Int(s) { return n }
        return 0
    }

    static func parse(line: String) -> AgentStreamEvent? {
        let normalized = line.replacingOccurrences(of: "\r", with: "")
        let trimmed = normalized.hasPrefix("data: ")
            ? String(normalized.dropFirst(6))
            : normalized.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let data = trimmed.data(using: .utf8) else { return nil }
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let type = json["type"] as? String
        else { return nil }

        switch type {
        case "session":
            guard let threadId = json["threadId"] as? String else { return nil }
            return .session(threadId: threadId)
        case "status":
            guard let message = json["message"] as? String else { return nil }
            return .status(message: message)
        case "token":
            guard let content = json["content"] as? String else { return nil }
            return .token(content: content)
        case "assistant":
            guard let content = json["content"] as? String else { return nil }
            return .assistant(content: content)
        case "final":
            guard let content = json["content"] as? String else { return nil }
            return .final(content: content)
        case "interrupt":
            guard let question = json["question"] as? String else { return nil }
            return .interrupt(question: question)
        case "draft_link":
            guard
                let url = json["url"] as? String,
                let invoiceNumber = json["invoiceNumber"] as? String
            else { return nil }
            let invoiceId = parseJSONInt(json["invoiceId"])
            guard invoiceId > 0 else { return nil }
            return .draftLink(url: url, invoiceId: invoiceId, invoiceNumber: invoiceNumber)
        case "error":
            guard let error = json["error"] as? String else { return nil }
            return .error(message: error)
        case "done":
            return .done
        default:
            return nil
        }
    }
}
