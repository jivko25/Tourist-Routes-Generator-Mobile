const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const svgCommonJs = path.resolve(
  __dirname,
  'node_modules/react-native-svg/lib/commonjs/index.js'
);

const upstreamResolveRequest = config.resolver.resolveRequest;

// Expo/Metro resolves react-native-svg via the "react-native" field (src/*.ts),
// which breaks on "../fabric/*NativeComponent" in some setups. Force the
// published CommonJS build instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-svg') {
    return {
      type: 'sourceFile',
      filePath: svgCommonJs,
    };
  }

  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
