const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../ios/ExpoWidgetsTarget/CommitmentsProgressWidget.swift');

const customSwiftCode = `import WidgetKit
import SwiftUI
import AppIntents
internal import ExpoWidgets

// AppEntity
struct CommitmentEntity: AppEntity {
  let id: String
  let displayString: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Commitment"
  static var defaultQuery = CommitmentQuery()

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\\(displayString)")
  }
}

// EntityQuery
struct CommitmentQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [CommitmentEntity] {
    return try await suggestedEntities().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [CommitmentEntity] {
    let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_CommitmentsProgressWidget_timeline") ?? []
    
    // We search the timeline entries to find the first entry that has commitments props
    for entry in timeline {
      if let entryDict = entry as? [String: Any],
         let props = entryDict["props"] as? [String: Any],
         let commitmentsList = props["commitments"] as? [Any] {
        return commitmentsList.compactMap { item in
          guard let dict = item as? [String: Any],
                let id = dict["id"] as? String,
                let label = dict["label"] as? String else {
            return nil
          }
          return CommitmentEntity(id: id, displayString: label)
        }
      }
    }
    return []
  }
}

// AppIntent
struct CommitmentsProgressWidgetConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Select Commitment"
  static var description: LocalizedStringResource = "Choose which active commitment to display."

  @Parameter(title: "Commitment")
  var commitment: CommitmentEntity?

  static var parameterSummary: some ParameterSummary {
    Summary("Show \\(\\.$commitment)")
  }

  init() {
    self.commitment = nil
  }

  init(commitment: CommitmentEntity?) {
    self.commitment = commitment
  }

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

struct CommitmentsProgressWidgetTimelineEntry: TimelineEntry {
  let date: Date
  public let name: String
  public let props: [String: Any]?
  public let entryIndex: Int?
  let configuration: CommitmentsProgressWidgetConfigurationAppIntent
}

struct CommitmentsProgressWidgetTimelineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> CommitmentsProgressWidgetTimelineEntry {
    CommitmentsProgressWidgetTimelineEntry(date: Date(), name: "CommitmentsProgressWidget", props: nil, entryIndex: nil, configuration: CommitmentsProgressWidgetConfigurationAppIntent())
  }

  func snapshot(for configuration: CommitmentsProgressWidgetConfigurationAppIntent, in context: Context) async -> CommitmentsProgressWidgetTimelineEntry {
    let entries = parseTimeline(configuration: configuration)
    return entries.first ?? CommitmentsProgressWidgetTimelineEntry(date: Date(), name: "CommitmentsProgressWidget", props: nil, entryIndex: nil, configuration: configuration)
  }

  func timeline(for configuration: CommitmentsProgressWidgetConfigurationAppIntent, in context: Context) async -> Timeline<CommitmentsProgressWidgetTimelineEntry> {
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<CommitmentsProgressWidgetTimelineEntry>(entries: entries, policy: .atEnd)
    return timeline
  }
  
  func parseTimeline(configuration: CommitmentsProgressWidgetConfigurationAppIntent) -> [CommitmentsProgressWidgetTimelineEntry] {
    let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_CommitmentsProgressWidget_timeline") ?? []

    let widgetId = configuration.commitment?.id ?? "unconfigured"
    let defaults = UserDefaults(suiteName: WidgetsStorage.appGroupIdentifier)
    
    // Extract commitments to resolve selectedIndex
    var commitments: [[String: Any]] = []
    if let firstEntry = timeline.first as? [String: Any],
       let props = firstEntry["props"] as? [String: Any],
       let commitmentsList = props["commitments"] as? [[String: Any]] {
      commitments = commitmentsList
    }
    
    var selectedIndex = 0
    if !commitments.isEmpty {
      let selectedId = configuration.commitment?.id
      let lastConfiguredId = defaults?.string(forKey: "__widget_last_configured_id_\\(widgetId)")
      
      if let selectedId = selectedId, selectedId != lastConfiguredId {
        if let idx = commitments.firstIndex(where: { ($0["id"] as? String) == selectedId }) {
          selectedIndex = idx
        } else {
          selectedIndex = 0
        }
        defaults?.set(selectedIndex, forKey: "__widget_selected_index_\\(widgetId)")
        defaults?.set(selectedId, forKey: "__widget_last_configured_id_\\(widgetId)")
      } else {
        if let savedIndexVal = defaults?.object(forKey: "__widget_selected_index_\\(widgetId)") as? Int {
          if savedIndexVal >= 0 && savedIndexVal < commitments.count {
            selectedIndex = savedIndexVal
          } else {
            selectedIndex = 0
            defaults?.set(selectedIndex, forKey: "__widget_selected_index_\\(widgetId)")
          }
        } else {
          if let selectedId = selectedId,
             let idx = commitments.firstIndex(where: { ($0["id"] as? String) == selectedId }) {
            selectedIndex = idx
          } else {
            selectedIndex = 0
          }
          defaults?.set(selectedIndex, forKey: "__widget_selected_index_\\(widgetId)")
          if let selectedId = selectedId {
            defaults?.set(selectedId, forKey: "__widget_last_configured_id_\\(widgetId)")
          }
        }
      }
    }

    let entries: [CommitmentsProgressWidgetTimelineEntry?] = timeline.enumerated().map { index, entry in
      guard let entry = entry as? [String: Any],
            let timestamp = entry["timestamp"] as? Int,
            let props = entry["props"] as? [String: Any] else {
        return nil
      }
      
      var modifiedProps = props
      modifiedProps["selectedIndex"] = selectedIndex
      
      return CommitmentsProgressWidgetTimelineEntry(
        date: Date(timeIntervalSince1970: Double(timestamp) / 1000),
        name: "CommitmentsProgressWidget",
        props: modifiedProps,
        entryIndex: index,
        configuration: configuration
      )
    }

    return entries.compactMap(\\.self)
  }
}

struct CommitmentsProgressWidgetEntryView: View {
  @Environment(\\.self) var environment
  var entry: CommitmentsProgressWidgetTimelineProvider.Entry

  init(entry: CommitmentsProgressWidgetTimelineProvider.Entry) {
    self.entry = entry
  }

  private var widgetEnvironment: [String: Any] {
    var env: [String: Any] = getWidgetEnvironment(environment: environment)
    env["timestamp"] = Int(entry.date.timeIntervalSince1970 * 1000)
    
    var configDict: [String: Any] = [:]
    if let commitment = entry.configuration.commitment {
      configDict["commitmentId"] = commitment.id
      configDict["commitmentLabel"] = commitment.displayString
      configDict["widgetId"] = commitment.id
    } else {
      configDict["widgetId"] = "unconfigured"
    }
    env["configuration"] = configDict
    
    return env
  }

  private var widgetEnvironmentString: String? {
    guard let data = try? JSONSerialization.data(withJSONObject: widgetEnvironment),
          let jsonString = String(data: data, encoding: .utf8) else {
        return nil
    }
    return jsonString
  }

  public var body: some View {
    if let layout = WidgetsStorage.getString(forKey: "__expo_widgets_\\(entry.name)_layout"),
       !layout.isEmpty {
      let node = evaluateLayout(layout: layout, props: entry.props ?? [:], environment: widgetEnvironment)
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    } else {
      WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \\(WidgetsStorage.appGroupIdentifier ?? "")::\\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }
}

@available(iOS 17.0, *)
struct CommitmentsProgressWidget: Widget {
  let name: String = "CommitmentsProgressWidget"

  var body: some WidgetConfiguration {
    return AppIntentConfiguration(kind: name, intent: CommitmentsProgressWidgetConfigurationAppIntent.self, provider: CommitmentsProgressWidgetTimelineProvider()) { entry in
      if #available(iOS 17.0, *) {
        CommitmentsProgressWidgetEntryView(entry: entry)
          .containerBackground(.clear, for: .widget)
      } else {
        CommitmentsProgressWidgetEntryView(entry: entry)
      }
    }
    .configurationDisplayName("Commitments Progress")
    .description("Track your active commitments progress.")
    .supportedFamilies([.systemMedium])
    .contentMarginsDisabled()
  }
}
`;

try {
  fs.writeFileSync(targetPath, customSwiftCode);
  console.log('Successfully patched CommitmentsProgressWidget.swift with dynamic options intent.');
} catch (e) {
  console.error('Failed to write patched Swift file', e);
  process.exit(1);
}
