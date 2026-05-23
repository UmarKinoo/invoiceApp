import Foundation

struct InvoiceItemPayload: Encodable, Sendable {
    let description: String
    let quantity: Double
    let rate: Double
}

struct InvoiceWritePayload: Encodable, Sendable {
    let client: Int
    let invoiceNumber: String
    let date: String
    let dueDate: String
    let items: [InvoiceItemPayload]
    let status: String
    let taxRate: Double
    let discount: Double
    let shipping: Double
    let notes: String
    let carNumber: String
    let subtotal: Double
    let tax: Double
    let total: Double

    static func build(
        clientId: String,
        invoiceNumber: String,
        date: Date,
        dueDate: Date,
        items: [EditableLineItem],
        status: String,
        taxRate: Double,
        discount: Double,
        shipping: Double,
        notes: String,
        carNumber: String
    ) throws -> InvoiceWritePayload {
        guard let client = Int(clientId) else {
            throw InvoiceEditorError.invalidClient
        }
        let linePayloads = items
            .filter { !$0.description.trimmingCharacters(in: .whitespaces).isEmpty }
            .map {
                InvoiceItemPayload(
                    description: $0.description.trimmingCharacters(in: .whitespaces),
                    quantity: max(0, $0.quantity),
                    rate: max(0, $0.rate)
                )
            }
        guard !linePayloads.isEmpty else {
            throw InvoiceEditorError.noLineItems
        }
        let subtotal = linePayloads.reduce(0) { $0 + $1.quantity * $1.rate }
        let tax = subtotal * taxRate / 100
        let total = subtotal + tax - discount + shipping
        return InvoiceWritePayload(
            client: client,
            invoiceNumber: invoiceNumber,
            date: InvoiceDates.isoString(date),
            dueDate: InvoiceDates.isoString(dueDate),
            items: linePayloads,
            status: status,
            taxRate: taxRate,
            discount: discount,
            shipping: shipping,
            notes: notes,
            carNumber: carNumber,
            subtotal: subtotal,
            tax: tax,
            total: total
        )
    }
}

enum InvoiceEditorError: LocalizedError, Sendable {
    case invalidClient
    case noLineItems
    case missingInvoiceNumber

    var errorDescription: String? {
        switch self {
        case .invalidClient: return "Select a contact for this invoice."
        case .noLineItems: return "Add at least one line item."
        case .missingInvoiceNumber: return "Invoice number is required."
        }
    }
}

enum InvoiceDates {
    static func isoString(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    static func parse(_ value: String?) -> Date {
        guard let value, !value.isEmpty else { return Date() }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: value) { return d }
        iso.formatOptions = [.withFullDate]
        if let d = iso.date(from: value) { return d }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        if let d = f.date(from: String(value.prefix(10))) { return d }
        return Date()
    }

    static func dueDefault(from date: Date) -> Date {
        Calendar.current.date(byAdding: .day, value: 14, to: date) ?? date
    }
}

struct EditableLineItem: Identifiable, Sendable {
    let id: UUID
    var description: String
    var quantity: Double
    var rate: Double

    init(id: UUID = UUID(), description: String = "", quantity: Double = 1, rate: Double = 0) {
        self.id = id
        self.description = description
        self.quantity = quantity
        self.rate = rate
    }

    var lineTotal: Double { quantity * rate }
}
