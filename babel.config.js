/**
 * 파일: /babel.config.js
 * - React Native 기본 Babel preset
 * - reanimated 같은 거 추가할 때 여기에서 plugin 붙임
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // ...기존 plugins가 있으면 유지
    'react-native-reanimated/plugin', // ✅ 반드시 마지막
  ],
};
