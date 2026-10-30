const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withWorkRuntimeFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const buildGradle = config.modResults.contents;
      const injection = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.work:work-runtime:2.8.1'
            force 'androidx.work:work-runtime-ktx:2.8.1'
        }
    }
}
`;
      if (!buildGradle.includes('androidx.work:work-runtime:2.8.1')) {
        config.modResults.contents = buildGradle + '\n' + injection;
      }
    }
    return config;
  });
};
