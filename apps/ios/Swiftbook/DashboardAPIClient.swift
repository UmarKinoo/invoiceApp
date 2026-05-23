import Foundation

extension AgentAPIClient {
    private static let pageSize = 100

    func fetchSettings() async throws -> AppSettings {
        let data = try await authorizedData(path: "/api/globals/settings")
        return try JSONDecoder().decode(AppSettings.self, from: data)
    }

    func fetchAllInvoices() async throws -> [InvoiceRow] {
        try await fetchAllPages(path: "/api/invoices", sort: "-updatedAt")
    }

    func fetchAllClients() async throws -> [ClientRow] {
        try await fetchAllPages(path: "/api/clients")
    }

    func fetchAllTransactions() async throws -> [TransactionRow] {
        try await fetchAllPages(path: "/api/transactions")
    }

    func fetchInvoices(limit: Int = 100) async throws -> [InvoiceRow] {
        if limit >= 100 {
            return try await fetchAllInvoices()
        }
        let data = try await authorizedData(
            path: "/api/invoices",
            query: [
                URLQueryItem(name: "limit", value: String(limit)),
                URLQueryItem(name: "depth", value: "0"),
                URLQueryItem(name: "sort", value: "-updatedAt"),
            ]
        )
        return try JSONDecoder().decode(PayloadListResponse<InvoiceRow>.self, from: data).docs
    }

    func fetchClients(limit: Int = 100) async throws -> [ClientRow] {
        if limit >= 100 {
            return try await fetchAllClients()
        }
        let data = try await authorizedData(
            path: "/api/clients",
            query: [
                URLQueryItem(name: "limit", value: String(limit)),
                URLQueryItem(name: "depth", value: "0"),
            ]
        )
        return try JSONDecoder().decode(PayloadListResponse<ClientRow>.self, from: data).docs
    }

    func fetchTasks(limit: Int = 100) async throws -> [TaskRow] {
        try await fetchAllPages(path: "/api/tasks", maxPages: 5)
    }

    func fetchInvoice(id: String) async throws -> InvoiceDetail {
        let data = try await authorizedData(
            path: "/api/invoices/\(id)",
            query: [URLQueryItem(name: "depth", value: "1")]
        )
        return try JSONDecoder().decode(InvoiceDetail.self, from: data)
    }

    func createInvoice(_ payload: InvoiceWritePayload) async throws -> String {
        let body = try JSONEncoder().encode(payload)
        let data = try await authorizedRequest(path: "/api/invoices", method: "POST", body: body)
        return try Self.parseSavedInvoiceID(from: data)
    }

    func updateInvoice(id: String, payload: InvoiceWritePayload) async throws -> String {
        let body = try JSONEncoder().encode(payload)
        let data = try await authorizedRequest(path: "/api/invoices/\(id)", method: "PATCH", body: body)
        return try Self.parseSavedInvoiceID(from: data, fallbackId: id)
    }

    func deleteInvoice(id: String) async throws {
        _ = try await authorizedRequest(path: "/api/invoices/\(id)", method: "DELETE", body: nil)
    }

    private static func parseSavedInvoiceID(from data: Data, fallbackId: String? = nil) throws -> String {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let doc = json["doc"] as? [String: Any], let id = doc["id"] {
                return String(describing: id)
            }
            if let id = json["id"] {
                return String(describing: id)
            }
            if let errors = json["errors"] as? [[String: Any]],
               let message = errors.first?["message"] as? String {
                throw AgentAPIError.http(status: 400, message: message)
            }
        }
        if let fallbackId { return fallbackId }
        throw AgentAPIError.invalidResponse
    }

    private func fetchAllPages<T: Decodable>(
        path: String,
        sort: String? = nil,
        maxPages: Int = 50
    ) async throws -> [T] {
        var all: [T] = []
        var page = 1
        while page <= maxPages {
            var query = [
                URLQueryItem(name: "limit", value: String(Self.pageSize)),
                URLQueryItem(name: "page", value: String(page)),
                URLQueryItem(name: "depth", value: "0"),
            ]
            if let sort {
                query.append(URLQueryItem(name: "sort", value: sort))
            }
            let data = try await authorizedData(path: path, query: query)
            let decoded = try JSONDecoder().decode(PayloadPagedResponse<T>.self, from: data)
            all.append(contentsOf: decoded.docs)
            if decoded.hasNextPage != true { break }
            page += 1
        }
        return all
    }
}
