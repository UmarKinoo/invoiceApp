import Foundation

struct PayloadListResponse<T: Decodable>: Decodable {
    let docs: [T]
}

struct PayloadPagedResponse<T: Decodable>: Decodable {
    let docs: [T]
    let hasNextPage: Bool?
    let totalDocs: Int?
}

struct AppSettings: Decodable, Sendable {
    let currency: String?
    let invoicePrefix: String?
    let taxRateDefault: Double?
}

struct TransactionRow: Decodable, Sendable {
    let id: String
    let type: String?
    let amount: Double?
    let invoiceId: String?

    enum CodingKeys: String, CodingKey {
        case id, type, amount, invoice
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = decodePayloadID(c, key: .id)
        type = try c.decodeIfPresent(String.self, forKey: .type)
        amount = try c.decodeIfPresent(Double.self, forKey: .amount)
        if let nested = try? c.decode(InvoiceRelation.self, forKey: .invoice) {
            invoiceId = nested.id
        } else if let raw = try? c.decode(Int.self, forKey: .invoice) {
            invoiceId = String(raw)
        } else if let raw = try? c.decode(String.self, forKey: .invoice) {
            invoiceId = raw
        } else {
            invoiceId = nil
        }
    }

    private struct InvoiceRelation: Decodable {
        let id: String

        enum CodingKeys: String, CodingKey { case id }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = decodePayloadID(c, key: .id)
        }
    }
}

struct InvoiceRow: Identifiable, Decodable {
    let id: String
    let invoiceNumber: String?
    let total: Double?
    let status: String?
    let date: String?

    enum CodingKeys: String, CodingKey {
        case id, invoiceNumber, total, status, date
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = decodePayloadID(c, key: .id)
        invoiceNumber = try c.decodeIfPresent(String.self, forKey: .invoiceNumber)
        total = try c.decodeIfPresent(Double.self, forKey: .total)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        date = try c.decodeIfPresent(String.self, forKey: .date)
    }

    var displayTitle: String {
        invoiceNumber ?? "Invoice #\(id)"
    }

    var displayAmount: String {
        guard let total else { return "—" }
        return AppCurrency.format(total)
    }
}

struct ClientRow: Identifiable, Decodable {
    let id: String
    let name: String
    let company: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id, name, company, email
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = decodePayloadID(c, key: .id)
        name = try c.decode(String.self, forKey: .name)
        company = try c.decodeIfPresent(String.self, forKey: .company)
        email = try c.decodeIfPresent(String.self, forKey: .email)
    }

    var subtitle: String {
        if let company, !company.isEmpty { return company }
        return email ?? ""
    }
}

struct TaskRow: Identifiable, Decodable {
    let id: String
    let title: String
    let completed: Bool?
    let priority: String?

    enum CodingKeys: String, CodingKey {
        case id, title, completed, priority
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = decodePayloadID(c, key: .id)
        title = try c.decode(String.self, forKey: .title)
        completed = try c.decodeIfPresent(Bool.self, forKey: .completed)
        priority = try c.decodeIfPresent(String.self, forKey: .priority)
    }
}

private func decodePayloadID<K: CodingKey>(_ c: KeyedDecodingContainer<K>, key: K) -> String {
    if let intId = try? c.decode(Int.self, forKey: key) { return String(intId) }
    if let strId = try? c.decode(String.self, forKey: key) { return strId }
    return "0"
}

