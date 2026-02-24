/**
 * 파일: /metro.config.js
 * - RN 0.84 권장 기본 설정
 * - 특별히 커스텀할 거 없으면 이대로 유지
 */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);