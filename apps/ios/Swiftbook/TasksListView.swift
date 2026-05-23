import SwiftUI

struct TasksListView: View {
    @State private var tasks: [TaskRow] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && tasks.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if tasks.isEmpty {
                    ContentUnavailableView(
                        "No tasks",
                        systemImage: "checklist",
                        description: Text("Tasks from your workspace sync here.")
                    )
                } else {
                    List(tasks) { task in
                        HStack(spacing: 12) {
                            Image(systemName: task.completed == true ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(task.completed == true ? SwiftbookTheme.primary : SwiftbookTheme.muted)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(task.title)
                                    .font(.body.weight(.medium))
                                    .strikethrough(task.completed == true)
                                if let priority = task.priority {
                                    Text(priority.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(SwiftbookTheme.muted)
                                }
                            }
                        }
                        .listRowBackground(SwiftbookTheme.card)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Tasks")
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
            tasks = try await AgentAPIClient.shared.fetchTasks()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
