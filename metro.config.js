// Polyfill for Node v18: toReversed() added in Node 20
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return this.slice().reverse();
  };
}

const { getDefaultConfig } = require('expo/metro-config');

// Use .js (CJS) build to avoid ESM loader issues on Node v18 + Windows
const metroJsPath = require.resolve('miaoda-expo-devkit/metro');
const { withDevkit } = require(metroJsPath);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withDevkit(config);
