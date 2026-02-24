// 파일: src/screens/Home/HomeScreen.styles.ts
// 목적:
// - HomeScreen UI 스타일 (styled-components)
// - Splash 카드 레이아웃 + 로고/텍스트 배치

import { Image, Pressable, View } from 'react-native';
import styled from 'styled-components/native';

export const Container = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background-color: #0b1f3a;
`;

export const Card = styled(View)`
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 18px;
  background-color: rgba(255, 255, 255, 0.06);
`;

export const BrandRow = styled(View)`
  flex-direction: row;
  align-items: center;
`;

export const Logo = styled(Image)`
  width: 28px;
  height: 28px;
  margin-right: 10px;
`;

export const Spacer = styled(View)<{ $h: number }>`
  height: ${({ $h }) => `${$h}px`};
`;

export const Button = styled(Pressable)`
  margin-top: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background-color: #2563eb;
  align-items: center;
`;
