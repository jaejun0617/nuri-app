// 파일: src/components/pets/PetThemePicker.tsx
// 역할:
// - 펫 프로필 생성/수정 화면에서 공용으로 쓰는 테마 선택 UI
// - 자동 추천 색을 초기값으로 삼되, 사용자가 직접 고를 수 있게 유지

import AppText from '../../app/ui/AppText';
import React, { memo } from 'react';
import {
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  PET_THEME_OPTIONS,
  buildPetThemePalette,
} from '../../services/pets/themePalette';

type Props = {
  selectedColor: string;
  title?: string;
  helperText?: string;
  embedded?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onSelectColor: (color: string) => void;
};

export default memo(function PetThemePicker({
  selectedColor,
  title = '테마 선택',
  helperText = '홈 강조색과 프로필 분위기에 반영돼요.',
  embedded = false,
  containerStyle,
  onSelectColor,
}: Props) {
  const preview = buildPetThemePalette(selectedColor);

  return (
    <View
      style={[
        {
          borderRadius: 18,
          padding: embedded ? 0 : 14,
          backgroundColor: embedded ? 'transparent' : preview.soft,
          borderWidth: embedded ? 0 : 1,
          borderColor: preview.border,
        },
        containerStyle,
      ]}
    >
      <AppText
        preset="unifiedLabel"
        style={{
          fontSize: embedded ? 18 : 13,
          fontWeight: '800',
          color: embedded ? '#352B25' : preview.deep,
        }}
      >
        {title}
      </AppText>

      <View
        style={{
          marginTop: embedded ? 14 : 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: embedded ? 9 : 10,
        }}
      >
        {PET_THEME_OPTIONS.map(color => {
          const active = color === selectedColor;
          const optionPreview = buildPetThemePalette(color);
          return (
            <TouchableOpacity
              key={color}
              activeOpacity={0.88}
              onPress={() => onSelectColor(color)}
              style={{
                width: embedded ? 36 : 34,
                height: embedded ? 36 : 34,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: color,
                borderWidth: active ? 3 : 1,
                borderColor: active
                  ? optionPreview.onPrimary
                  : 'rgba(11,18,32,0.08)',
              }}
            >
              {active ? (
                <Feather
                  name="check"
                  size={15}
                  color={optionPreview.onPrimary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <AppText
        preset="unifiedLabel"
        style={{
          marginTop: embedded ? 8 : 10,
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 18,
          color: embedded ? '#786B61' : preview.deep,
        }}
      >
        {helperText}
      </AppText>
    </View>
  );
});
