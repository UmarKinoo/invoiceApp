import SwiftUI

enum MainTab: String, CaseIterable, Identifiable {
    case insights
    case contacts
    case billing
    case tasks
    case settings

    var id: String { rawValue }

    var label: String {
        switch self {
        case .insights: return "Insights"
        case .contacts: return "Contacts"
        case .billing: return "Billing"
        case .tasks: return "Tasks"
        case .settings: return "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .insights: return "chart.line.uptrend.xyaxis"
        case .contacts: return "person.2.fill"
        case .billing: return "doc.text.fill"
        case .tasks: return "checklist"
        case .settings: return "gearshape.fill"
        }
    }
}

struct MainTabView: View {
    @Binding var isSignedIn: Bool
    @State private var selectedTab: MainTab = .insights

    var body: some View {
        TabView(selection: $selectedTab) {
            InsightsView(isSignedIn: $isSignedIn)
                .tabItem { tabLabel(.insights) }
                .tag(MainTab.insights)

            ContactsListView()
                .tabItem { tabLabel(.contacts) }
                .tag(MainTab.contacts)

            BillingListView()
                .tabItem { tabLabel(.billing) }
                .tag(MainTab.billing)

            TasksListView()
                .tabItem { tabLabel(.tasks) }
                .tag(MainTab.tasks)

            SettingsView(isSignedIn: $isSignedIn)
                .tabItem { tabLabel(.settings) }
                .tag(MainTab.settings)
        }
        .tint(SwiftbookTheme.primary)
        .swiftbookScreen()
    }

    @ViewBuilder
    private func tabLabel(_ tab: MainTab) -> some View {
        Label(tab.label, systemImage: tab.symbol)
    }
}
