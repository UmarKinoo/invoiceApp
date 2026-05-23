import Foundation

struct InvoiceLineItem: Decodable, Identifiable, Sendable {
    var id: String { "\(description ?? "")-\(quantity ?? 0)-\(rate ?? 0)" }
    let description: String?
    let quantity: Double?
    let rate: Double?

    var lineTotal: Double {
        (quantity ?? 0) * (rate ?? 0)
    }
}

struct InvoiceClientSummary: Decodable, Sendable {
    let id: String?
    let name: String?
    let company: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id, name, company, email
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let intId = try? c.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = try c.decodeIfPresent(String.self, forKey: .id)
        }
        name = try c.decodeIfPresent(String.self, forKey: .name)
        company = try c.decodeIfPresent(String.self, forKey: .company)
        email = try c.decodeIfPresent(String.self, forKey: .email)
    }

    var displayName: String {
        if let name, !name.isEmpty { return name }
        return company ?? "Client"
    }
}

struct InvoiceDetail: Decodable, Sendable {
    let id: String
    let invoiceNumber: String?
    let date: String?
    let dueDate: String?
    let status: String?
    let total: Double?
    let subtotal: Double?
    let tax: Double?
    let taxRate: Double?
    let discount: Double?
    let shipping: Double?
    let carNumber: String?
    let notes: String?
    let items: [InvoiceLineItem]?
    let client: InvoiceClientSummary?
    let clientId: String?

    enum CodingKeys: String, CodingKey {
        case id, invoiceNumber, date, dueDate, status, total, subtotal, tax, taxRate
        case discount, shipping, carNumber, notes, items, client
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let intId = try? c.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = try c.decode(String.self, forKey: .id)
        }
        invoiceNumber = try c.decodeIfPresent(String.self, forKey: .invoiceNumber)
        date = try c.decodeIfPresent(String.self, forKey: .date)
        dueDate = try c.decodeIfPresent(String.self, forKey: .dueDate)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        total = try c.decodeIfPresent(Double.self, forKey: .total)
        subtotal = try c.decodeIfPresent(Double.self, forKey: .subtotal)
        tax = try c.decodeIfPresent(Double.self, forKey: .tax)
        taxRate = try c.decodeIfPresent(Double.self, forKey: .taxRate)
        discount = try c.decodeIfPresent(Double.self, forKey: .discount)
        shipping = try c.decodeIfPresent(Double.self, forKey: .shipping)
        carNumber = try c.decodeIfPresent(String.self, forKey: .carNumber)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        items = try c.decodeIfPresent([InvoiceLineItem].self, forKey: .items)
        if let nested = try? c.decode(InvoiceClientSummary.self, forKey: .client) {
            client = nested
            clientId = nested.id
        } else if let raw = try? c.decode(Int.self, forKey: .client) {
            client = nil
            clientId = String(raw)
        } else if let raw = try? c.decode(String.self, forKey: .client) {
            client = nil
            clientId = raw
        } else {
            client = nil
            clientId = nil
        }
    }

    var displayNumber: String {
        invoiceNumber ?? "Invoice #\(id)"
    }
}
