import Foundation

/// Matches web `formatCurrency` / Settings.global currency (default MUR).
enum AppCurrency {
    private(set) static var code = "MUR"

    private static let symbols: [String: String] = [
        "MUR": "Rs",
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
    ]

    static func update(code newCode: String?) {
        let trimmed = (newCode ?? "MUR").trimmingCharacters(in: .whitespacesAndNewlines)
        code = trimmed.isEmpty ? "MUR" : trimmed
    }

    static func format(_ amount: Double, decimals: Int = 2) -> String {
        let symbol = symbols[code] ?? code
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = decimals
        formatter.maximumFractionDigits = decimals
        formatter.locale = Locale(identifier: "en_US")
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? String(format: "%.2f", amount)
        if symbol == "$" || symbol == "€" || symbol == "£" {
            return "\(symbol)\(formatted)"
        }
        return "\(symbol) \(formatted)"
    }
}
