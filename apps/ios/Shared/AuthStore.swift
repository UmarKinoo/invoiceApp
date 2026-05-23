import Foundation
import Security

enum AuthStore {
    private static let service = "com.swiftbook.auth"
    private static let account = "payload-token"
    private static let emailKey = "user-email"

    static var token: String? {
        readToken()
    }

    static var email: String? {
        UserDefaults.standard.string(forKey: emailKey)
    }

    static var isSignedIn: Bool {
        token != nil
    }

    static func save(token: String, email: String) {
        deleteToken()
        var query = baseQuery
        query[kSecValueData as String] = token.data(using: .utf8)
        SecItemAdd(query as CFDictionary, nil)
        UserDefaults.standard.set(email, forKey: emailKey)
    }

    static func clear() {
        deleteToken()
        UserDefaults.standard.removeObject(forKey: emailKey)
    }

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
    }

    private static func readToken() -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func deleteToken() {
        SecItemDelete(baseQuery as CFDictionary)
    }
}
