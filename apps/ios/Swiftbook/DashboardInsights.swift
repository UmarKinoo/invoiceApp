import Foundation

/// Same rules as `src/app/(frontend)/(admin)/dashboard/page.tsx` ledger stats.
enum DashboardInsights {
    static func computeLedgerStats(invoices: [InvoiceRow], transactions: [TransactionRow]) -> LedgerStats {
        let txRevenue = transactions
            .filter { $0.type == "income" }
            .compactMap(\.amount)
            .reduce(0, +)

        var invoicePayments: [String: Double] = [:]
        for tx in transactions where tx.type == "income" {
            guard let invoiceId = tx.invoiceId else { continue }
            invoicePayments[invoiceId, default: 0] += tx.amount ?? 0
        }

        var paidTotal = 0.0
        var outstanding = 0.0

        for inv in invoices {
            if inv.status == "cancelled" { continue }
            let total = inv.total ?? 0
            if inv.status == "paid" {
                paidTotal += total
            } else {
                let txPaid = invoicePayments[inv.id] ?? 0
                let remaining = max(0, total - txPaid)
                paidTotal += txPaid
                outstanding += remaining
            }
        }

        return LedgerStats(
            revenue: max(paidTotal, txRevenue),
            outstanding: outstanding,
            invoiceCount: invoices.count
        )
    }
}

struct LedgerStats: Sendable {
    let revenue: Double
    let outstanding: Double
    let invoiceCount: Int
}
