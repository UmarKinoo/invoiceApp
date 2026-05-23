import SwiftUI

struct InvoiceDetailView: View {
    let invoiceId: String
    var onListChanged: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var invoice: InvoiceDetail?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var editorRoute: InvoiceEditorRoute?

    var body: some View {
        Group {
            if isLoading && invoice == nil {
                ProgressView("Loading invoice…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let invoice {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header(invoice)
                        if let client = invoice.client {
                            SwiftbookCard {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Bill to")
                                        .font(.caption.weight(.medium))
                                        .foregroundStyle(SwiftbookTheme.muted)
                                    Text(client.displayName)
                                        .font(.headline)
                                    if let company = client.company, !company.isEmpty, company != client.name {
                                        Text(company)
                                            .font(.subheadline)
                                            .foregroundStyle(SwiftbookTheme.muted)
                                    }
                                    if let email = client.email, !email.isEmpty {
                                        Text(email)
                                            .font(.subheadline)
                                            .foregroundStyle(SwiftbookTheme.muted)
                                    }
                                }
                            }
                        }
                        lineItems(invoice)
                        totals(invoice)
                        if let notes = invoice.notes, !notes.isEmpty {
                            SwiftbookCard {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Notes")
                                        .font(.caption.weight(.medium))
                                        .foregroundStyle(SwiftbookTheme.muted)
                                    Text(notes)
                                        .font(.subheadline)
                                }
                            }
                        }
                    }
                    .padding(16)
                }
            } else {
                ContentUnavailableView(
                    "Invoice unavailable",
                    systemImage: "doc.text",
                    description: Text(errorMessage ?? "Could not load this invoice.")
                )
            }
        }
        .navigationTitle(invoice?.displayNumber ?? "Invoice")
        .navigationBarTitleDisplayMode(.inline)
        .swiftbookScreen()
        .toolbar {
            if invoice != nil {
                ToolbarItem(placement: .primaryAction) {
                    Button("Edit") {
                        editorRoute = .edit(invoiceId)
                    }
                }
            }
        }
        .navigationDestination(item: $editorRoute) { route in
            InvoiceEditorView(
                mode: route.mode,
                onSaved: { _ in
                    editorRoute = nil
                    onListChanged?()
                    Task { await load() }
                },
                onDeleted: {
                    onListChanged?()
                    dismiss()
                }
            )
        }
        .task { await load() }
        .refreshable { await load() }
    }

    @ViewBuilder
    private func header(_ invoice: InvoiceDetail) -> some View {
        SwiftbookCard {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(invoice.displayNumber)
                        .font(.title2.weight(.semibold))
                    Spacer()
                    if let status = invoice.status {
                        Text(status.capitalized)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(statusColor(status).opacity(0.15))
                            .foregroundStyle(statusColor(status))
                            .clipShape(Capsule())
                    }
                }
                if let date = invoice.date {
                    labeledRow("Date", value: formatDate(date))
                }
                if let due = invoice.dueDate {
                    labeledRow("Due", value: formatDate(due))
                }
            }
        }
    }

    @ViewBuilder
    private func lineItems(_ invoice: InvoiceDetail) -> some View {
        SwiftbookCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Line items")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(SwiftbookTheme.muted)
                if let items = invoice.items, !items.isEmpty {
                    ForEach(items) { item in
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.description ?? "Item")
                                    .font(.subheadline.weight(.medium))
                                Text("\(formatQty(item.quantity)) × \(AppCurrency.format(item.rate ?? 0))")
                                    .font(.caption)
                                    .foregroundStyle(SwiftbookTheme.muted)
                            }
                            Spacer()
                            Text(AppCurrency.format(item.lineTotal))
                                .font(.subheadline.weight(.semibold))
                        }
                        if item.id != items.last?.id {
                            Divider().opacity(0.35)
                        }
                    }
                } else {
                    Text("No line items")
                        .font(.subheadline)
                        .foregroundStyle(SwiftbookTheme.muted)
                }
            }
        }
    }

    @ViewBuilder
    private func totals(_ invoice: InvoiceDetail) -> some View {
        SwiftbookCard {
            VStack(spacing: 8) {
                if let subtotal = invoice.subtotal {
                    totalRow("Subtotal", AppCurrency.format(subtotal))
                }
                if let tax = invoice.tax, tax > 0 {
                    totalRow("Tax", AppCurrency.format(tax))
                }
                if let discount = invoice.discount, discount > 0 {
                    totalRow("Discount", "-\(AppCurrency.format(discount))")
                }
                if let shipping = invoice.shipping, shipping > 0 {
                    totalRow("Shipping", AppCurrency.format(shipping))
                }
                Divider().opacity(0.35)
                totalRow("Total", AppCurrency.format(invoice.total ?? 0), emphasized: true)
            }
        }
    }

    private func labeledRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(SwiftbookTheme.muted)
            Spacer()
            Text(value)
                .font(.subheadline)
        }
    }

    private func totalRow(_ label: String, _ value: String, emphasized: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(emphasized ? .headline : .subheadline)
                .foregroundStyle(emphasized ? SwiftbookTheme.foreground : SwiftbookTheme.muted)
            Spacer()
            Text(value)
                .font(emphasized ? .headline : .subheadline)
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "paid": return .green
        case "overdue": return .red
        case "draft", "sent": return .orange
        default: return SwiftbookTheme.primary
        }
    }

    private func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        formatter.formatOptions = [.withFullDate]
        if let date = formatter.date(from: iso) {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return iso
    }

    private func formatQty(_ value: Double?) -> String {
        guard let value else { return "0" }
        if value.rounded() == value { return String(Int(value)) }
        return String(format: "%.2f", value)
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let settingsTask: AppSettings? = try? await AgentAPIClient.shared.fetchSettings()
            async let invoiceTask = AgentAPIClient.shared.fetchInvoice(id: invoiceId)
            if let settings = await settingsTask {
                AppCurrency.update(code: settings.currency)
            }
            invoice = try await invoiceTask
        } catch {
            errorMessage = error.localizedDescription
            invoice = nil
        }
    }
}
