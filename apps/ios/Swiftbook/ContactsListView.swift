import SwiftUI

struct ContactsListView: View {
    @State private var clients: [ClientRow] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && clients.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if clients.isEmpty {
                    ContentUnavailableView(
                        "No contacts",
                        systemImage: "person.2",
                        description: Text("Contacts you add on the web will appear here.")
                    )
                } else {
                    List(clients) { client in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(client.name)
                                .font(.body.weight(.medium))
                            if !client.subtitle.isEmpty {
                                Text(client.subtitle)
                                    .font(.subheadline)
                                    .foregroundStyle(SwiftbookTheme.muted)
                            }
                        }
                        .listRowBackground(SwiftbookTheme.card)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Contacts")
            .navigationBarTitleDisplayMode(.large)
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
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            clients = try await AgentAPIClient.shared.fetchClients()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
