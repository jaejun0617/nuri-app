module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-native-masked-view|@react-navigation|@react-native-async-storage|@noble/hashes|decode-uri-component|react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|styled-components)/)',
  ],
};
