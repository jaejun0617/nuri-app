// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - Splash에서 자동 이동 후 도착하는 "첫 실제 화면(임시)"
// - 현재는 placeholder
// - 뒤로가기를 누르면 Splash로 돌아갈 수 있음 (HomeScreen에서 navigate 사용했기 때문)

import React from 'react';
import AppText from '../../app/ui/AppText';
import * as S from './MainScreen.styles';

export default function MainScreen() {
  return (
    <S.Container>
      <S.Card>
        <AppText preset="title1">Main</AppText>
        <S.Spacer $h={10} />
        <AppText preset="body">여기부터 실제 홈/탭 네비로 확장</AppText>
      </S.Card>
    </S.Container>
  );
}
