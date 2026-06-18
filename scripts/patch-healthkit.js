const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/react-native-health/RCTAppleHealthKit/RCTAppleHealthKit.m');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('[self.callableJSModules setBridge:self.bridge];')) {
    console.log('[patch-healthkit] Patching RCTAppleHealthKit.m to remove deprecated setBridge call...');
    content = content.replace(
      '[self.callableJSModules setBridge:self.bridge];',
      '// [self.callableJSModules setBridge:self.bridge];'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[patch-healthkit] Successfully patched RCTAppleHealthKit.m');
  } else {
    console.log('[patch-healthkit] RCTAppleHealthKit.m is already patched or line not found.');
  }
} else {
  console.log('[patch-healthkit] react-native-health source file not found at:', filePath);
}
