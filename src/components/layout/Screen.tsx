// 파일: src/components/layout/Screen.tsx
// 목적:
// - 화면 공통 SafeArea(top inset) 처리
// - 상태바(시간/배터리/와이파이) 영역과 앱 UI 간격을 일관되게 확보
// - 필요한 화면은 noTopInset으로 top inset을 끌 수 있음
//
// 사용 예시:
// <Screen style={styles.screen}>
//   ...
// </Screen>

import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noTopInset?: boolean;
};

export default function Screen({ children, style, noTopInset }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: noTopInset ? 0 : insets.top,
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
