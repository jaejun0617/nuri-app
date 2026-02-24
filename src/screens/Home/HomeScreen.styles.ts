// 파일: src/screens/Home/HomeScreen.styles.ts
// -------------------------------------------------------------
// 역할:
// - blur 전용 이미지 + 원본 이미지 레이어 구성
// - 뒤(cover) + 앞(contain) 이중 구조
// -------------------------------------------------------------

import { Image, ImageBackground, Pressable, View } from 'react-native';
import styled from 'styled-components/native';

export const Background = styled(View)`
  flex: 1;
`;

/**
 * 뒤 배경 (home__blur.png)
 * - cover로 화면 가득 채움
 */
export const BgBlur = styled(ImageBackground).attrs({
  resizeMode: 'cover',
})`
  flex: 1;
`;

/**
 * 앞 배경 (home__bg.png)
 * - contain으로 절대 안 잘림
 */
export const BgContain = styled(ImageBackground).attrs({
  resizeMode: 'contain',
})`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

/**
 * 가독성 오버레이
 */
export const Overlay = styled(View)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.35);
`;

export const Container = styled(View)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  justify-content: center;
  align-items: center;
  padding: 24px;
`;

export const Card = styled(View)`
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 18px;
  background-color: rgba(0, 0, 0, 0.42);
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
