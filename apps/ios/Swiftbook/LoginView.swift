import SwiftUI

struct LoginView: View {
    @Binding var isSignedIn: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            SwiftbookTheme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 28) {
                    Spacer(minLength: 40)
                    SwiftbookLogo(size: 56)
                    Text("Powering modern businesses.")
                        .font(.subheadline)
                        .foregroundStyle(SwiftbookTheme.muted)

                    VStack(alignment: .leading, spacing: 14) {
                        labeledField("Email", content: {
                            TextField("you@company.com", text: $email)
                                .textContentType(.emailAddress)
                                #if os(iOS)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                #endif
                        })
                        labeledField("Password", content: {
                            SecureField("Password", text: $password)
                        })
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(SwiftbookTheme.destructive)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button {
                        Task { await signIn() }
                    } label: {
                        HStack {
                            Text("Sign in")
                                .fontWeight(.semibold)
                            Spacer()
                            if isLoading {
                                ProgressView()
                                    .tint(SwiftbookTheme.primaryForeground)
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.vertical, 14)
                        .frame(maxWidth: .infinity)
                        .background(SwiftbookTheme.primary)
                        .foregroundStyle(SwiftbookTheme.primaryForeground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)

                    Spacer(minLength: 24)
                }
                .padding(.horizontal, 24)
            }
        }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private func labeledField<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(SwiftbookTheme.muted)
            content()
                .padding(12)
                .background(SwiftbookTheme.card)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(SwiftbookTheme.cardBorder, lineWidth: 1)
                )
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
