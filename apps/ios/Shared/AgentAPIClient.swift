import Foundation

enum AgentAPIError: LocalizedError, Sendable {
    case unauthorized
    case http(status: Int, message: String)
    case invalidResponse
    case notSignedIn

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Session expired. Please sign in again."
        case .http(let status, let message):
            return message.isEmpty ? "Request failed (\(status))" : message
        case .invalidResponse:
            return "Unexpected server response."
        case .notSignedIn:
            return "Sign in required."
        }
    }
}

struct LoginResult: Sendable {
    let token: String
    let email: String
}

actor AgentAPIClient {
    static let shared = AgentAPIClient()

    func login(email: String, password: String) async throws -> LoginResult {
        let url = APIConfiguration.baseURL.appending(path: "/api/users/login")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTP(response: response, data: data)

        guard
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let token = json["token"] as? String,
            let user = json["user"] as? [String: Any],
            let userEmail = user["email"] as? String
        else {
            throw AgentAPIError.invalidResponse
        }

        AuthStore.save(token: token, email: userEmail)
        return LoginResult(token: token, email: userEmail)
    }

    func logout() {
        AuthStore.clear()
    }

    func fetchSessions() async throws -> [AgentSession] {
        let data = try await authorizedData(path: "/api/agent/sessions")
        let decoded = try JSONDecoder().decode(AgentSessionsResponse.self, from: data)
        return decoded.sessions
    }

    func fetchHistory(threadId: String) async throws -> ThreadHistoryResponse {
        let data = try await authorizedData(path: "/api/agent/sessions/\(threadId)/history")
        return try JSONDecoder().decode(ThreadHistoryResponse.self, from: data)
    }

    func streamChat(
        message: String,
        threadId: String?,
        resume: Bool
    ) -> AsyncThrowingStream<AgentStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    guard let token = AuthStore.token else {
                        throw AgentAPIError.notSignedIn
                    }
                    let url = APIConfiguration.baseURL.appending(path: "/api/agent/chat")
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.setValue("JWT \(token)", forHTTPHeaderField: "Authorization")
                    request.setValue("text/event-stream", forHTTPHeaderField: "Accept")

                    var body: [String: Any] = [
                        "messages": [["role": "user", "content": message]],
                        "resume": resume,
                    ]
                    if let threadId { body["threadId"] = threadId }

                    request.httpBody = try JSONSerialization.data(withJSONObject: body)
                    request.timeoutInterval = 120

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    if let http = response as? HTTPURLResponse, http.statusCode == 401 {
                        AuthStore.clear()
                        throw AgentAPIError.unauthorized
                    }
                    if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
                        var errData = Data()
                        for try await byte in bytes { errData.append(byte) }
                        let message = Self.errorMessage(from: errData, status: http.statusCode)
                        throw AgentAPIError.http(status: http.statusCode, message: message)
                    }

                    // Match web client: split on "\n\n" (SSE event delimiter). `bytes.lines` often
                    // drops empty lines, so line-based parsing never flushed events.
                    var buffer = Data()
                    for try await byte in bytes {
                        buffer.append(byte)
                        guard let text = String(data: buffer, encoding: .utf8) else { continue }
                        var remainder = text
                        while let range = remainder.range(of: "\n\n") {
                            let block = String(remainder[..<range.lowerBound])
                            remainder = String(remainder[range.upperBound...])
                            if let event = AgentStreamParser.parse(line: block) {
                                continuation.yield(event)
                            }
                        }
                        buffer = Data(remainder.utf8)
                    }
                    if let tail = String(data: buffer, encoding: .utf8),
                       !tail.isEmpty,
                       let event = AgentStreamParser.parse(line: tail) {
                        continuation.yield(event)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    func authorizedData(path: String, query: [URLQueryItem] = []) async throws -> Data {
        try await authorizedRequest(path: path, method: "GET", query: query, body: nil)
    }

    func authorizedRequest(
        path: String,
        method: String,
        query: [URLQueryItem] = [],
        body: Data? = nil
    ) async throws -> Data {
        guard let token = AuthStore.token else { throw AgentAPIError.notSignedIn }
        var components = URLComponents(url: APIConfiguration.baseURL.appending(path: path), resolvingAgainstBaseURL: false)
        if !query.isEmpty { components?.queryItems = query }
        guard let url = components?.url else { throw AgentAPIError.invalidResponse }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("JWT \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            AuthStore.clear()
            throw AgentAPIError.unauthorized
        }
        try validateHTTP(response: response, data: data)
        return data
    }

    private func validateHTTP(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw AgentAPIError.invalidResponse
        }
        guard (200 ... 299).contains(http.statusCode) else {
            let message = Self.errorMessage(from: data, status: http.statusCode)
            if http.statusCode == 401 || http.statusCode == 403 {
                AuthStore.clear()
                throw AgentAPIError.unauthorized
            }
            throw AgentAPIError.http(status: http.statusCode, message: message)
        }
    }

    private static func errorMessage(from data: Data, status: Int) -> String {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return fallbackHTTPMessage(status: status)
        }
        if let error = json["error"] as? String, !error.isEmpty {
            return error
        }
        if let errors = json["errors"] as? [[String: Any]] {
            let messages = errors.compactMap { $0["message"] as? String }.filter { !$0.isEmpty }
            if let first = messages.first {
                return first
            }
        }
        if let message = json["message"] as? String, !message.isEmpty {
            return message
        }
        return fallbackHTTPMessage(status: status)
    }

    private static func fallbackHTTPMessage(status: Int) -> String {
        switch status {
        case 401, 403:
            return "Session expired or not allowed. Sign in again."
        case 404:
            return "API not found. Check SWIFTBOOK_API_BASE_URL points at your dev server."
        default:
            return "Request failed (\(status))"
        }
    }
}
