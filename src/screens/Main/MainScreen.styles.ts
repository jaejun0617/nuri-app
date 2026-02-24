// 파일: src/screens/Main/MainScreen.styles.ts
// 목적:
// - MainScreen UI 스타일 (styled-components)
// - 추후 홈/탭/레이아웃 확장 시 기준이 되는 기본 틀

import { View } from 'react-native';
import styled from 'styled-components/native';

export const Container = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

export const Card = styled(View)`
  width: 100%;
  max-width: 420px;
  padding: 20px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.04);
`;

export const Spacer = styled(View)<{ $h: number }>`
  height: ${({ $h }) => `${$h}px`};
`;
