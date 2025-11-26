const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// เพิ่ม cache
config.cacheStores = [];
config.resetCache = false;

// Optimize transformer
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: true,
    },
  },
};

// ลด modules ที่ต้อง watch
config.watchFolders = [];

module.exports = config;
