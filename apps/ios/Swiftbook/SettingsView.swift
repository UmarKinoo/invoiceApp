import SwiftUI

struct SettingsView: View {
    @Binding var isSignedIn: Bool
    @State private var isSigningOut = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        Image("SwiftbookIcon")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Swiftbook")
                                .font(.headline)
                            Text(AuthStore.email ?? "Signed in")
                                .font(.subheadline)
                                .foregroundStyle(SwiftbookTheme.muted)
                        }
                    }
                    .listRowBackground(SwiftbookTheme.card)
                }

                Section {
                    LabeledContent("API", value: APIConfiguration.baseURL.host ?? "—")
                        .listRowBackground(SwiftbookTheme.card)
                } header: {
                    Text("Connection")
                }

                Section {
                    Button(role: .destructive) {
                        Task { await signOut() }
                    } label: {
                        HStack {
                            Text("Sign out")
                            Spacer()
                            if isSigningOut {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(isSigningOut)
                    .listRowBackground(SwiftbookTheme.card)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .swiftbookScreen()
        }
    }

    private func signOut() async {
        isSigningOut = true
        defer { isSigningOut = false }
        await AgentAPIClient.shared.logout()
        isSignedIn = false
    }
}
