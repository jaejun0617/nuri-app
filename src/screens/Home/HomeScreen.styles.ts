// 파일: src/screens/Home/HomeScreen.styles.ts
// 목적:
// - HomeScreen UI 스타일 (styled-components)
// - 배경 이미지(ImageBackground) + 오버레이 + 카드 레이아웃

import { Image, ImageBackground, Pressable, View } from 'react-native';
import styled from 'styled-components/native';

export const Background = styled(ImageBackground)`
  flex: 1;
`;

export const Overlay = styled(View).attrs({
  style: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
})``;

export const Container = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

export const Card = styled(View)`
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 18px;
  background-color: rgba(0, 0, 0, 0.45);
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
