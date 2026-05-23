import SwiftUI

struct WatchLoginView: View {
    @Binding var isSignedIn: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Sign in")
                    .font(.headline)
                TextField("Email", text: $email)
                SecureField("Password", text: $password)
                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
                Button("Continue") {
                    Task { await signIn() }
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)
            }
        }
    }

    private func signIn() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            _ = try await AgentAPIClient.shared.login(email: email, password: password)
            isSignedIn = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
