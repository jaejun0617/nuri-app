/**
 * RN Entry
 * - gesture handler 최상단
 * - reanimated 1회 import
 * - supabase polyfill 먼저
 */

import 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
