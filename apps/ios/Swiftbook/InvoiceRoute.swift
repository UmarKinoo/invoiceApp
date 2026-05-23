import Foundation

struct InvoiceRoute: Identifiable, Hashable, Sendable {
    let id: String
}

enum InvoiceEditorRoute: Identifiable, Hashable, Sendable {
    case create
    case edit(String)

    var id: String {
        switch self {
        case .create: "new-invoice"
        case .edit(let id): "edit-\(id)"
        }
    }

    var mode: InvoiceEditorView.Mode {
        switch self {
        case .create: .create
        case .edit(let id): .edit(invoiceId: id)
        }
    }
}
