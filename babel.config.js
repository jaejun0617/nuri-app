/**
 * RN 0.84 + Reanimated 4 안정 세팅
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 반드시 마지막
    'react-native-reanimated/plugin',
  ],
};
