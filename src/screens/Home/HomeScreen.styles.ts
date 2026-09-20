// 파일: src/screens/Home/HomeScreen.styles.ts
// -------------------------------------------------------------
// 역할:
// - 계절별 full-bleed 배경 위에 브랜드 레이어를 올린다.
// - UI 레이어(Container)는 absolute로 최상단에 두고 safe area와
//   화면 높이에서 계산한 paddingTop으로 위치를 제어한다.
// -------------------------------------------------------------

import { StyleSheet, View } from 'react-native';
import styled from 'styled-components/native';

export const Background = styled(View)<{ $backgroundColor: string }>`
  flex: 1;
  overflow: hidden;
  background-color: ${({ $backgroundColor }) => $backgroundColor};
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
`;

/**
 * 브랜드 행
 */
export const BrandRow = styled(View)`
  align-items: center;
  justify-content: center;
`;

export const CopyWrap = styled(View)`
  width: 78%;
  max-width: 320px;
  align-self: center;
`;

/**
 * 텍스트 그림자 스타일
 * - 밝은 배경 대비용
 */
export const textStyles = StyleSheet.create({
  shadow: {
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.54)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  wordmark: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
  },
  copy: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  seasonalImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  seasonalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

export const Spacer = styled(View)<{ $h: number }>`
  height: ${({ $h }) => `${$h}px`};
`;
