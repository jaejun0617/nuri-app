// 파일: src/components/pets/PetThemePicker.tsx
// 역할:
// - 펫 프로필 생성/수정 화면에서 공용으로 쓰는 테마 선택 UI
// - 자동 추천 색을 초기값으로 삼되, 사용자가 직접 고를 수 있게 유지

import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  PET_THEME_OPTIONS,
  buildPetThemePalette,
} from '../../services/pets/themePalette';

type Props = {
  selectedColor: string;
  title?: string;
  helperText?: string;
  onSelectColor: (color: string) => void;
};

export default memo(function PetThemePicker({
  selectedColor,
  title = '테마 선택',
  helperText = '홈 강조색과 프로필 분위기에 반영돼요.',
  onSelectColor,
}: Props) {
  const preview = buildPetThemePalette(selectedColor);

  return (
    <View
      style={{
        borderRadius: 18,
        padding: 14,
        backgroundColor: preview.soft,
        borderWidth: 1,
        borderColor: preview.border,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: preview.deep,
        }}
      >
        {title}
      </Text>

      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {PET_THEME_OPTIONS.map(color => {
          const active = color === selectedColor;
          return (
            <TouchableOpacity
              key={color}
              activeOpacity={0.88}
              onPress={() => onSelectColor(color)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: color,
                borderWidth: active ? 3 : 1,
                borderColor: active ? '#FFFFFF' : 'rgba(11,18,32,0.08)',
              }}
            >
              {active ? <Feather name="check" size={15} color="#FFFFFF" /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text
        style={{
          marginTop: 10,
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 18,
          color: preview.deep,
        }}
      >
        {helperText}
      </Text>
    </View>
  );
});
