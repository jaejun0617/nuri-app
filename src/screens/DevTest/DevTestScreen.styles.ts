// 파일: src/screens/DevTest/DevTestScreen.styles.ts
// -------------------------------------------------------------
// 역할:
// - DevTestScreen UI 스타일 (styled-components)
// - "테스트 버튼/입력/로그" 중심의 개발용 화면
// -------------------------------------------------------------

import { Pressable, ScrollView, TextInput, View } from 'react-native';
import styled from 'styled-components/native';

export const Screen = styled(View)`
  flex: 1;
  padding: 18px;
  background-color: #0b1020;
`;

export const TitleRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

export const Box = styled(View)`
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.06);
`;

export const Label = styled(View)`
  margin-top: 10px;
`;

export const Input = styled(TextInput).attrs({
  placeholderTextColor: 'rgba(255,255,255,0.45)',
})`
  margin-top: 8px;
  padding: 12px 12px;
  border-radius: 12px;
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.08);
`;

export const Row = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 10px;
`;

export const Btn = styled(Pressable)`
  padding: 12px 12px;
  border-radius: 12px;
  background-color: #2563eb;
`;

export const BtnGhost = styled(Pressable)`
  padding: 12px 12px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.1);
`;

export const LogWrap = styled(ScrollView)`
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.4);
  max-height: 320px;
`;
