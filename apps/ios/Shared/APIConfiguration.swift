import Foundation

enum APIConfiguration {
    /// Base URL without trailing slash (e.g. `http://127.0.0.1:3000`).
    static var baseURL: URL {
        if let url = urlFromInfoPlist {
            return url
        }
        #if DEBUG
        return URL(string: "http://127.0.0.1:3000")!
        #else
        return URL(string: "https://your-production-host.example")!
        #endif
    }

    private static var urlFromInfoPlist: URL? {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "SWIFTBOOK_API_BASE_URL") as? String,
            !raw.isEmpty,
            let url = URL(string: raw)
        else { return nil }
        return url
    }
}
