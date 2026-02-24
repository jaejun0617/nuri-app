// 파일: index.js
// 목적:
// - React Native 앱의 "진입점(Entry)".
// - AppRegistry가 실제 네이티브(Android/iOS) 런타임에서 JS 앱을 부팅한다.
//
// 앱 구동 순서:
// 1) (네이티브) MainActivity / AppDelegate가 JS 엔트리 로딩
// 2) index.js 실행
// 3) AppRegistry.registerComponent(appName, () => App) 등록
// 4) 네이티브가 등록된 App 컴포넌트를 렌더링 시작

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
