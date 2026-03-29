// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for Supabase
config.resolver.sourceExts.push('mjs');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'mjs');

module.exports = config;
