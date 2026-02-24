// 파일: src/app/ui/AppText.tsx
// 목적:
// - 앱 공통 Typography 컴포넌트
// - preset 기반(typography preset)으로 폰트 사이즈/라인하이트 등을 통일
// - 필요시 weight/color/align로 부분 override 가능
//
// 사용 예:
// <AppText preset="title1">NURI</AppText>
// <AppText preset="body" color="#999">...</AppText>

import React, { memo, useMemo } from 'react';
import type { TextProps, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

import { StyledText } from './AppText.styles';

type Preset = 'title1' | 'title2' | 'headline' | 'body' | 'caption';

type Props = TextProps & {
  preset?: Preset;
  color?: string; // theme 컬러 대신 임의 색상 지정이 필요할 때
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: TextStyle['fontWeight']; // preset fontWeight를 덮어쓰기 할 때
};

function AppTextBase({
  preset = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme();

  // theme.typography.preset[preset]은 디자인 토큰에 따라 일관된 텍스트 스타일 제공
  const presetStyle = theme.typography.preset[preset];

  // 스타일 합성은 매 렌더마다 비용이 발생할 수 있어 useMemo로 캐싱
  const composedStyle = useMemo(
    () =>
      StyleSheet.flatten([
        presetStyle,
        weight ? ({ fontWeight: weight } as TextStyle) : null,
        style,
      ]),
    [presetStyle, weight, style],
  );

  return (
    <StyledText $color={color} $align={align} style={composedStyle} {...rest}>
      {children}
    </StyledText>
  );
}

// memo: 동일 props로 리렌더를 줄여 기본 성능 최적화
const AppText = memo(AppTextBase);
export default AppText;
