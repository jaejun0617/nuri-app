module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@react-native-async-storage|react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|styled-components)/)',
  ],
};
