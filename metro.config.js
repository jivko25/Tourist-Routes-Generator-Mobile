const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const svgCommonJs = path.resolve(
  __dirname,
  'node_modules/react-native-svg/lib/commonjs/index.js'
);

// Force CommonJS build for react-native-svg (avoids fabric TS resolution issues).
// Use metro-resolver directly so we don't recurse through context.resolveRequest.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-svg') {
    return {
      type: 'sourceFile',
      filePath: svgCommonJs,
    };
  }

  return resolve(
    {
      ...context,
      resolveRequest: null,
    },
    moduleName,
    platform
  );
};

module.exports = config;
