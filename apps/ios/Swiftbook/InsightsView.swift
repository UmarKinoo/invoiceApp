import SwiftUI

struct InsightsView: View {
    @Binding var isSignedIn: Bool
    @State private var ledger = LedgerStats(revenue: 0, outstanding: 0, invoiceCount: 0)
    @State private var clientCount = 0
    @State private var currencyCode = "MUR"
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showAgent = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    agentCard

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(SwiftbookTheme.destructive)
                    }

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            statCard(
                                label: "Revenue",
                                value: AppCurrency.format(ledger.revenue),
                                symbol: "wallet.pass.fill"
                            )
                            statCard(
                                label: "Outstanding",
                                value: AppCurrency.format(ledger.outstanding),
                                symbol: "clock.fill"
                            )
                            statCard(label: "Contacts", value: "\(clientCount)", symbol: "person.2.fill")
                            statCard(label: "Invoices", value: "\(ledger.invoiceCount)", symbol: "doc.text.fill")
                        }
                        Text("Totals use all invoices and ledger payments (\(currencyCode)), same as the web dashboard.")
                            .font(.caption2)
                            .foregroundStyle(SwiftbookTheme.muted)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .navigationTitle("Insights")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    SwiftbookLogo(size: 28)
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .fullScreenCover(isPresented: $showAgent) {
                ChatView(isSignedIn: $isSignedIn)
            }
        }
    }

    private var agentCard: some View {
        Button {
            showAgent = true
        } label: {
            SwiftbookCard {
                HStack(spacing: 14) {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                        .font(.title2)
                        .foregroundStyle(SwiftbookTheme.primary)
                        .frame(width: 44, height: 44)
                        .background(SwiftbookTheme.primary.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("CRM Assistant")
                            .font(.headline)
                            .foregroundStyle(SwiftbookTheme.foreground)
                        Text("Find clients, draft invoices, and confirm actions.")
                            .font(.subheadline)
                            .foregroundStyle(SwiftbookTheme.muted)
                            .multilineTextAlignment(.leading)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(SwiftbookTheme.muted)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func statCard(label: String, value: String, symbol: String) -> some View {
        SwiftbookCard {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: symbol)
                    .font(.body)
                    .foregroundStyle(SwiftbookTheme.primary)
                    .frame(width: 36, height: 36)
                    .background(SwiftbookTheme.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                Text(label.uppercased())
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(SwiftbookTheme.muted)
                    .tracking(0.6)
                Text(value)
                    .font(.system(.title3, design: .rounded, weight: .semibold))
                    .foregroundStyle(SwiftbookTheme.foreground)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
            }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let settingsTask = AgentAPIClient.shared.fetchSettings()
            async let invoicesTask = AgentAPIClient.shared.fetchAllInvoices()
            async let clientsTask = AgentAPIClient.shared.fetchAllClients()
            async let transactionsTask = AgentAPIClient.shared.fetchAllTransactions()

            let settings = try await settingsTask
            let currency = settings.currency ?? "MUR"
            AppCurrency.update(code: currency)
            currencyCode = AppCurrency.code

            let invoices = try await invoicesTask
            let clients = try await clientsTask
            let transactions = try await transactionsTask

            ledger = DashboardInsights.computeLedgerStats(invoices: invoices, transactions: transactions)
            clientCount = clients.count
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
