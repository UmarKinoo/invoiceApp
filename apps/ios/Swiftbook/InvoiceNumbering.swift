import Foundation

enum InvoiceNumbering {
    static func nextNumber(invoices: [InvoiceRow], prefix: String) -> Int {
        let normalizedPrefix = prefix.isEmpty ? "INV-" : prefix
        if invoices.isEmpty { return 1001 }
        let numbers = invoices.compactMap { inv -> Int? in
            guard let n = inv.invoiceNumber, n.hasPrefix(normalizedPrefix) else { return nil }
            let after = String(n.dropFirst(normalizedPrefix.count))
            let digits = after.prefix { $0.isNumber }
            guard !digits.isEmpty else { return nil }
            return Int(digits)
        }
        let maxNum = max(1000, numbers.max() ?? 1000)
        return maxNum + 1
    }

    static func formatInvoiceNumber(prefix: String, number: Int) -> String {
        let p = prefix.isEmpty ? "INV-" : prefix
        return "\(p)\(number)"
    }
}
