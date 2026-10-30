const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/expo-widgets/ios/Widgets/AppIntent.swift');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');

  const targetStr = `      guard let timelineArray = WidgetsStorage.getArray(forKey: "__expo_widgets_\\(source)_timeline") as? [[String: Any]],
            !timelineArray.isEmpty,
            let firstProps = timelineArray[0]["props"] as? [String: Any],`;

  const replacementStr = `      guard let timelineArray = WidgetsStorage.getArray(forKey: "__expo_widgets_\\(source)_timeline"),
            !timelineArray.isEmpty,
            let firstEntry = timelineArray[0] as? [String: Any],
            let firstProps = firstEntry["props"] as? [String: Any],`;

  if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(targetPath, content);
    console.log('Successfully patched AppIntent.swift for robust timeline array casting.');
  } else {
    console.log('AppIntent.swift is already patched or target string not found.');
  }
}

// Patch DynamicView.swift to support HostView
const dynamicViewPath = path.join(__dirname, '../node_modules/expo-widgets/ios/Widgets/DynamicView.swift');
if (fs.existsSync(dynamicViewPath)) {
  let dvContent = fs.readFileSync(dynamicViewPath, 'utf8');
  if (!dvContent.includes('case "HostView":')) {
    dvContent = dvContent.replace(
      'case "TextView":\n      render(TextView.self, TextViewProps.self, updateProps: updateChildren)',
      'case "TextView":\n      render(TextView.self, TextViewProps.self, updateProps: updateChildren)\n    case "HostView":\n      render(FragmentView.self, FragmentProps.self, updateProps: updateChildren)'
    );
    fs.writeFileSync(dynamicViewPath, dvContent, 'utf8');
    console.log('Successfully patched DynamicView.swift to support HostView.');
  }
}

// Patch EntryView.swift to ensure containerBackground is always applied on iOS 17+
const entryViewPath = path.join(__dirname, '../node_modules/expo-widgets/ios/Widgets/EntryView.swift');
if (fs.existsSync(entryViewPath)) {
  let evContent = fs.readFileSync(entryViewPath, 'utf8');
  if (!evContent.includes('containerBackground')) {
    const oldBody = `  public var body: some View {
    if let layout = WidgetsStorage.getString(forKey: "__expo_widgets_\\(entry.name)_layout"),
       !layout.isEmpty {
      let node = evaluateLayout(layout: layout, props: entry.props ?? [:], environment: widgetEnvironment)
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    } else {
      WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \\(WidgetsStorage.appGroupIdentifier ?? "")::\\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }`;
    const newBody = `  @ViewBuilder
  public var body: some View {
    let contentView = Group {
      if let layout = WidgetsStorage.getString(forKey: "__expo_widgets_\\(entry.name)_layout"),
         !layout.isEmpty {
        let node = evaluateLayout(layout: layout, props: entry.props ?? [:], environment: widgetEnvironment)
        WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
      } else {
        WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \\(WidgetsStorage.appGroupIdentifier ?? "")::\\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
      }
    }
    if #available(iOS 17.0, *) {
      contentView.containerBackground(Color(red: 0.05, green: 0.06, blue: 0.09), for: .widget)
    } else {
      contentView
    }
  }`;
    if (evContent.includes(oldBody)) {
      evContent = evContent.replace(oldBody, newBody);
      fs.writeFileSync(entryViewPath, evContent, 'utf8');
      console.log('Successfully patched EntryView.swift with containerBackground.');
    }
  }
}
