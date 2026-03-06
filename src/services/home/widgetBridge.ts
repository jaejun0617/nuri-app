// 파일: src/services/home/widgetBridge.ts
// 역할:
// - Android 홈 위젯에 JS 상태를 전달하는 브리지
// - 홈 화면에서 계산한 스냅샷을 네이티브 SharedPreferences로 전달

import { NativeModules, Platform } from 'react-native';

export type HomeWidgetSnapshot = {
  petName: string;
  subtitle: string;
  todayScheduleTitle: string;
  todayScheduleMeta: string;
  recentRecordTitle: string;
  recentRecordMeta: string;
  themeColor: string;
};

type HomeWidgetModuleShape = {
  updateSnapshot: (payload: HomeWidgetSnapshot) => void;
};

const moduleRef = NativeModules.NuriHomeWidget as
  | HomeWidgetModuleShape
  | undefined;

export function syncHomeWidgetSnapshot(snapshot: HomeWidgetSnapshot): void {
  if (Platform.OS !== 'android') return;
  if (!moduleRef?.updateSnapshot) return;

  try {
    moduleRef.updateSnapshot(snapshot);
  } catch {
    // 홈 위젯 업데이트 실패는 앱 렌더링을 막지 않는다.
  }
}
