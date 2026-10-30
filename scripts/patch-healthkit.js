const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/react-native-health/RCTAppleHealthKit/RCTAppleHealthKit.m');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  if (content.includes('[self.callableJSModules setBridge:self.bridge];')) {
    console.log('[patch-healthkit] Patching RCTAppleHealthKit.m to remove deprecated setBridge call...');
    content = content.replace(
      '[self.callableJSModules setBridge:self.bridge];',
      '// [self.callableJSModules setBridge:self.bridge];'
    );
    modified = true;
  }

  // Patch getAnchoredWorkouts native method export if not present
  if (!content.includes('RCT_EXPORT_METHOD(getAnchoredWorkouts:')) {
    console.log('[patch-healthkit] Patching RCTAppleHealthKit.m to export getAnchoredWorkouts...');
    const targetExport = `RCT_EXPORT_METHOD(saveWorkout:(NSDictionary *)input callback:(RCTResponseSenderBlock)callback)
{
    [self _initializeHealthStore];
    [self workout_save:input callback:callback];
}`;
    const replacementExport = `${targetExport}

RCT_EXPORT_METHOD(getAnchoredWorkouts:(NSDictionary *)input callback:(RCTResponseSenderBlock)callback)
{
    [self _initializeHealthStore];
    [self workout_getAnchoredQuery:input callback:callback];
}`;
    if (content.includes(targetExport)) {
      content = content.replace(targetExport, replacementExport);
      modified = true;
    } else {
      console.warn('[patch-healthkit] Warning: saveWorkout export block not found. Could not patch getAnchoredWorkouts export.');
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[patch-healthkit] Successfully patched RCTAppleHealthKit.m');
  } else {
    console.log('[patch-healthkit] RCTAppleHealthKit.m is already fully patched.');
  }
} else {
  console.log('[patch-healthkit] react-native-health source file not found at:', filePath);
}

// Also patch ExpoModulesJSI JavaScriptRuntime.swift C function pointer ternary issue on newer Xcode Swift compilers
const jsiRuntimePath = path.join(__dirname, '../node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift');
if (fs.existsSync(jsiRuntimePath)) {
  let jsiContent = fs.readFileSync(jsiRuntimePath, 'utf8');
  const badTernary = `    let callbacks = expo.HostObjectCallbacks(
      context, getter, set == nil ? nil : setter, propertyNamesGetter, deallocate)
    let hostObject = expo.HostObject.makeObject(pointee, consume callbacks)`;
  const fixedBranches = `    let hostObject: facebook.jsi.Object
    if set == nil {
      var callbacks = expo.HostObjectCallbacks(
        context, getter, nil, propertyNamesGetter, deallocate)
      hostObject = expo.HostObject.makeObject(pointee, consume callbacks)
    } else {
      var callbacks = expo.HostObjectCallbacks(
        context, getter, setter, propertyNamesGetter, deallocate)
      hostObject = expo.HostObject.makeObject(pointee, consume callbacks)
    }`;
  if (jsiContent.includes(badTernary)) {
    jsiContent = jsiContent.replace(badTernary, fixedBranches);
    fs.writeFileSync(jsiRuntimePath, jsiContent, 'utf8');
    console.log('[patch-healthkit] Successfully patched ExpoModulesJSI JavaScriptRuntime.swift');
  }
}
