// 파일: src/screens/Home/HomeScreen.styles.ts
// -------------------------------------------------------------
// 역할:
// - blur 전용 이미지 + 원본 이미지 레이어 구성
// - 뒤(cover) + 앞(contain) 이중 구조
// - UI 레이어(Container)는 absolute로 최상단에 올리고
//   paddingTop을 props로 받아 카드 위치를 동적 제어
// -------------------------------------------------------------

import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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

/**
 * UI 레이어
 * - paddingTop은 동적 계산 값
 */
export const Container = styled(View)<{ $pt: number }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  justify-content: flex-start;
  align-items: center;

  padding: 24px;
  padding-top: ${({ $pt }) => `${$pt}px`};
`;

/**
 * 카드
 */
export const Card = styled(View)`
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 18px;
`;

/**
 * 브랜드 행
 */
export const BrandRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-right: 25px;
`;

/**
 * 로고
 */
export const Logo = styled(Image)`
  width: 34px;
  height: 34px;
  margin-right: 6px;
`;

/**
 * 텍스트 그림자 스타일
 * - 밝은 배경 대비용
 */
export const textStyles = StyleSheet.create({
  shadow: {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export const Spacer = styled(View)<{ $h: number }>`
  height: ${({ $h }) => `${$h}px`};
`;

export const Button = styled(Pressable)`
  margin-top: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background-color: transparent;
  align-items: center;
`;
