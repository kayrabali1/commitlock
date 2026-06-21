const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/expo-widgets/ios/Widgets/AppIntent.swift');

if (!fs.existsSync(targetPath)) {
  console.log('AppIntent.swift not found. Skipping patch.');
  process.exit(0);
}

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
