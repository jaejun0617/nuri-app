// 파일: src/screens/Guestbook/GuestbookScreen.tsx
// 목적:
// - 방명록 탭 임시 화면(추후 CRUD/피드/작성 기능으로 확장)
// - ✅ 지금은 네비게이션 연결 + 레이아웃만 제공

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function GuestbookScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>방명록</Text>
      <Text style={styles.sub}>
        여기에 추후 방명록 피드/작성 UI를 연결합니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B1220',
  },
  sub: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#556070',
    lineHeight: 16,
  },
});
