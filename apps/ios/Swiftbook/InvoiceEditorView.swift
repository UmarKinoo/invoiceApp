import SwiftUI

struct InvoiceEditorView: View {
    enum Mode: Sendable {
        case create
        case edit(invoiceId: String)
    }

    let mode: Mode
    var onSaved: ((String) -> Void)?
    var onDeleted: (() -> Void)?

    @Environment(\.dismiss) private var dismiss

    @State private var clients: [ClientRow] = []
    @State private var clientId = ""
    @State private var invoiceNumber = ""
    @State private var date = Date()
    @State private var dueDate = InvoiceDates.dueDefault(from: Date())
    @State private var status = "draft"
    @State private var taxRate = 15.0
    @State private var discount = 0.0
    @State private var shipping = 0.0
    @State private var notes = ""
    @State private var carNumber = ""
    @State private var lineItems: [EditableLineItem] = [EditableLineItem()]
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showDeleteConfirm = false

    private static let statuses = ["draft", "sent", "partial", "paid", "overdue", "cancelled"]

    private var isEdit: Bool {
        if case .edit = mode { return true }
        return false
    }

    private var subtotal: Double {
        lineItems.reduce(0) { $0 + $1.lineTotal }
    }

    private var taxAmount: Double {
        subtotal * taxRate / 100
    }

    private var total: Double {
        subtotal + taxAmount - discount + shipping
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                editorForm
            }
        }
        .navigationTitle(isEdit ? "Edit invoice" : "New invoice")
        .navigationBarTitleDisplayMode(.inline)
        .swiftbookScreen()
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { Task { await save() } }
                    .disabled(isSaving || clientId.isEmpty)
            }
            if isEdit {
                ToolbarItem(placement: .bottomBar) {
                    Button("Delete invoice", role: .destructive) {
                        showDeleteConfirm = true
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .alert("Delete invoice?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) { Task { await deleteInvoice() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This cannot be undone.")
        }
        .task { await load() }
    }

    private var editorForm: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(SwiftbookTheme.destructive)
                }

                SwiftbookCard {
                    VStack(alignment: .leading, spacing: 12) {
                        fieldLabel("Contact")
                        Picker("Contact", selection: $clientId) {
                            Text("Select contact").tag("")
                            ForEach(clients) { client in
                                Text(client.name).tag(client.id)
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(SwiftbookTheme.foreground)

                        fieldLabel("Invoice number")
                        SwiftbookTextField("INV-1001", text: $invoiceNumber)

                        fieldLabel("Status")
                        Picker("Status", selection: $status) {
                            ForEach(Self.statuses, id: \.self) { s in
                                Text(s.capitalized).tag(s)
                            }
                        }
                        .pickerStyle(.menu)

                        DatePicker("Date", selection: $date, displayedComponents: .date)
                        DatePicker("Due date", selection: $dueDate, displayedComponents: .date)
                    }
                }

                SwiftbookCard {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            fieldLabel("Line items")
                            Spacer()
                            Button {
                                lineItems.append(EditableLineItem())
                            } label: {
                                Label("Add", systemImage: "plus.circle.fill")
                                    .font(.subheadline.weight(.semibold))
                            }
                        }

                        ForEach($lineItems) { $item in
                            VStack(alignment: .leading, spacing: 8) {
                                SwiftbookTextField("Description", text: $item.description)
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Qty")
                                            .font(.caption2)
                                            .foregroundStyle(SwiftbookTheme.muted)
                                        SwiftbookDecimalField(value: $item.quantity)
                                    }
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Rate")
                                            .font(.caption2)
                                            .foregroundStyle(SwiftbookTheme.muted)
                                        SwiftbookDecimalField(value: $item.rate)
                                    }
                                    Spacer()
                                    Text(AppCurrency.format(item.lineTotal))
                                        .font(.subheadline.weight(.semibold))
                                }
                                if lineItems.count > 1 {
                                    Button("Remove line", role: .destructive) {
                                        lineItems.removeAll { $0.id == item.id }
                                    }
                                    .font(.caption)
                                }
                            }
                            if item.id != lineItems.last?.id {
                                Divider().opacity(0.35)
                            }
                        }
                    }
                }

                SwiftbookCard {
                    VStack(alignment: .leading, spacing: 12) {
                        fieldLabel("Tax rate (%)")
                        SwiftbookDecimalField(value: $taxRate)
                        fieldLabel("Discount")
                        SwiftbookDecimalField(value: $discount)
                        fieldLabel("Shipping")
                        SwiftbookDecimalField(value: $shipping)
                        fieldLabel("Car / vehicle ref")
                        SwiftbookTextField("Optional", text: $carNumber)
                        fieldLabel("Notes")
                        SwiftbookTextField("Notes for client", text: $notes, axis: .vertical)
                    }
                }

                SwiftbookCard {
                    VStack(spacing: 8) {
                        summaryRow("Subtotal", AppCurrency.format(subtotal))
                        summaryRow("Tax (\(formatPct(taxRate))%)", AppCurrency.format(taxAmount))
                        if discount > 0 {
                            summaryRow("Discount", "-\(AppCurrency.format(discount))")
                        }
                        if shipping > 0 {
                            summaryRow("Shipping", AppCurrency.format(shipping))
                        }
                        Divider().opacity(0.35)
                        summaryRow("Total", AppCurrency.format(total), bold: true)
                    }
                }
            }
            .padding(16)
        }
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption2.weight(.medium))
            .foregroundStyle(SwiftbookTheme.muted)
            .tracking(0.5)
    }

    private func summaryRow(_ label: String, _ value: String, bold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(bold ? .headline : .subheadline)
                .foregroundStyle(bold ? SwiftbookTheme.foreground : SwiftbookTheme.muted)
            Spacer()
            Text(value)
                .font(bold ? .headline : .subheadline)
        }
    }

    private func formatPct(_ value: Double) -> String {
        if value.rounded() == value { return String(Int(value)) }
        return String(format: "%.1f", value)
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let settingsTask = AgentAPIClient.shared.fetchSettings()
            async let clientsTask = AgentAPIClient.shared.fetchAllClients()
            let settings = try await settingsTask
            AppCurrency.update(code: settings.currency)
            clients = try await clientsTask
            let prefix = settings.invoicePrefix ?? "INV-"
            taxRate = settings.taxRateDefault ?? 15

            switch mode {
            case .create:
                let invoices = try await AgentAPIClient.shared.fetchAllInvoices()
                let next = InvoiceNumbering.nextNumber(invoices: invoices, prefix: prefix)
                invoiceNumber = InvoiceNumbering.formatInvoiceNumber(prefix: prefix, number: next)
                date = Date()
                dueDate = InvoiceDates.dueDefault(from: date)
                status = "draft"
                lineItems = [EditableLineItem()]
            case .edit(let invoiceId):
                let detail = try await AgentAPIClient.shared.fetchInvoice(id: invoiceId)
                clientId = detail.clientId ?? detail.client?.id ?? ""
                invoiceNumber = detail.invoiceNumber ?? ""
                date = InvoiceDates.parse(detail.date)
                dueDate = InvoiceDates.parse(detail.dueDate)
                status = detail.status ?? "draft"
                taxRate = detail.taxRate ?? settings.taxRateDefault ?? 15
                discount = detail.discount ?? 0
                shipping = detail.shipping ?? 0
                notes = detail.notes ?? ""
                carNumber = detail.carNumber ?? ""
                if let items = detail.items, !items.isEmpty {
                    lineItems = items.map {
                        EditableLineItem(
                            description: $0.description ?? "",
                            quantity: $0.quantity ?? 1,
                            rate: $0.rate ?? 0
                        )
                    }
                } else {
                    lineItems = [EditableLineItem()]
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        guard !invoiceNumber.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = InvoiceEditorError.missingInvoiceNumber.localizedDescription
            return
        }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let payload = try InvoiceWritePayload.build(
                clientId: clientId,
                invoiceNumber: invoiceNumber.trimmingCharacters(in: .whitespaces),
                date: date,
                dueDate: dueDate,
                items: lineItems,
                status: status,
                taxRate: taxRate,
                discount: discount,
                shipping: shipping,
                notes: notes,
                carNumber: carNumber
            )
            let savedId: String
            switch mode {
            case .create:
                savedId = try await AgentAPIClient.shared.createInvoice(payload)
            case .edit(let invoiceId):
                savedId = try await AgentAPIClient.shared.updateInvoice(id: invoiceId, payload: payload)
            }
            onSaved?(savedId)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteInvoice() async {
        guard case .edit(let invoiceId) = mode else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            try await AgentAPIClient.shared.deleteInvoice(id: invoiceId)
            onDeleted?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Form controls

struct SwiftbookTextField: View {
    let placeholder: String
    @Binding var text: String
    var axis: Axis = .horizontal

    init(_ placeholder: String, text: Binding<String>, axis: Axis = .horizontal) {
        self.placeholder = placeholder
        _text = text
        self.axis = axis
    }

    var body: some View {
        TextField(placeholder, text: $text, axis: axis)
            .textFieldStyle(.plain)
            .padding(12)
            .background(Color.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(SwiftbookTheme.foreground)
    }
}

struct SwiftbookDecimalField: View {
    @Binding var value: Double
    @State private var text = ""

    var body: some View {
        TextField("0", text: $text)
            .keyboardType(.decimalPad)
            .textFieldStyle(.plain)
            .padding(12)
            .background(Color.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(SwiftbookTheme.foreground)
            .onAppear { text = Self.format(value) }
            .onChange(of: text) { _, new in
                value = Double(new.replacingOccurrences(of: ",", with: ".")) ?? 0
            }
            .onChange(of: value) { _, new in
                let formatted = Self.format(new)
                if formatted != text { text = formatted }
            }
    }

    private static func format(_ value: Double) -> String {
        if value.rounded() == value { return String(Int(value)) }
        return String(format: "%.2f", value)
    }
}
