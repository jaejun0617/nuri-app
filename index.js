// 파일: index.js
// 목적:
// - RN 앱 진입점(Entry)
// - Supabase RN polyfill을 "가장 먼저" 로드
// - RNGH는 최상단에서 1회 import로 안정화

import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
