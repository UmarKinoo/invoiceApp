import SwiftUI

struct BillingListView: View {
    @State private var invoices: [InvoiceRow] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var invoiceRoute: InvoiceRoute?
    @State private var editorRoute: InvoiceEditorRoute?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && invoices.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if invoices.isEmpty {
                    ContentUnavailableView {
                        Label("No invoices", systemImage: "doc.text")
                    } description: {
                        Text("Create your first invoice here or with the CRM Assistant.")
                    } actions: {
                        Button("New invoice") {
                            editorRoute = .create
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else {
                    List(invoices) { invoice in
                        Button {
                            invoiceRoute = InvoiceRoute(id: invoice.id)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(invoice.displayTitle)
                                        .font(.body.weight(.medium))
                                        .foregroundStyle(SwiftbookTheme.foreground)
                                    if let status = invoice.status {
                                        Text(status.capitalized)
                                            .font(.caption)
                                            .foregroundStyle(SwiftbookTheme.muted)
                                    }
                                }
                                Spacer()
                                Text(invoice.displayAmount)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(SwiftbookTheme.foreground)
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(SwiftbookTheme.muted)
                            }
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(SwiftbookTheme.card)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Billing")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        editorRoute = .create
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("New invoice")
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .overlay(alignment: .top) {
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(SwiftbookTheme.destructive)
                        .padding()
                }
            }
            .swiftbookScreen()
            .navigationDestination(item: $invoiceRoute) { route in
                InvoiceDetailView(invoiceId: route.id, onListChanged: { Task { await load() } })
            }
            .navigationDestination(item: $editorRoute) { route in
                InvoiceEditorView(
                    mode: route.mode,
                    onSaved: { savedId in
                        editorRoute = nil
                        invoiceRoute = InvoiceRoute(id: savedId)
                        Task { await load() }
                    }
                )
            }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            if let settings = try? await AgentAPIClient.shared.fetchSettings() {
                AppCurrency.update(code: settings.currency)
            }
            invoices = try await AgentAPIClient.shared.fetchInvoices()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
