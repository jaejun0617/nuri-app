// 파일: src/components/pets/PetThemePicker.tsx
// 역할:
// - 펫 프로필 생성/수정 화면에서 공용으로 쓰는 테마 선택 UI
// - 저장된 아이 색상을 보존하고, 미지정 상태는 라벤더로 표시

import AppText from '../../app/ui/AppText';
import React, { memo } from 'react';
import {
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Feather from '../icons/NuriFeatherIcon';
import { PRODUCT_ACCENT } from '../../app/theme/tokens/productAccent';
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
  title = '아이 포인트색',
  helperText = '아이 사진 테두리와 선택 표시, 아이를 소개하는 강조에 반영돼요.',
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
          color: PRODUCT_ACCENT.ink,
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
