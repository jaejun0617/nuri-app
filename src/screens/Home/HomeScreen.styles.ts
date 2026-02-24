// 파일: src/screens/Home/HomeScreen.styles.ts
// -------------------------------------------------------------
// 역할:
// - blur 전용 이미지 + 원본 이미지 레이어 구성
// - 뒤(cover) + 앞(contain) 이중 구조
// - UI 레이어(Container)는 absolute로 최상단에 올리고
//   paddingTop을 props로 받아 "카드 위치를 상단으로" 동적 제어
// -------------------------------------------------------------

import { Image, ImageBackground, Pressable, View } from 'react-native';
import styled from 'styled-components/native';

export const Background = styled(View)`
  flex: 1;
`;

/**
 * ✅ 뒤 배경(확장용): home__blur.png
 * - cover로 화면을 꽉 채움
 */
export const BgBlur = styled(ImageBackground).attrs({
  resizeMode: 'cover',
})`
  flex: 1;
`;

/**
 * ✅ 앞 배경(원본): home__bg.png
 * - contain으로 절대 안 잘림(전체 노출)
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
 * ✅ 가독성 오버레이
 * - blur 위에 얇게 깔아 카드/텍스트 대비 확보
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
 * ✅ UI 레이어
 * - justify-content: flex-start로 "위에서부터 쌓는" 구조
 * - paddingTop은 기기 높이 + SafeArea(top) 기반으로 동적 계산해서 주입
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
 * ✅ 카드
 * - 가독성용 반투명 배경
 */
export const Card = styled(View)`
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 18px;
`;

export const BrandRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
`;

export const Logo = styled(Image)`
  width: 28px;
  height: 28px;
  margin-right: 5px;
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
