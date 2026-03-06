// 파일: src/components/pets/PetMemorialFields.tsx
// 역할:
// - 펫 생성/수정 화면에서 추모 상태와 날짜 입력 UI를 공용으로 재사용

import React, { memo } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  PET_MEMORIAL_OPTIONS,
  type PetMemorialChoice,
} from '../../services/pets/memorial';

type Props = {
  choice: PetMemorialChoice;
  deathDate: string;
  onChangeChoice: (choice: PetMemorialChoice) => void;
  onChangeDeathDate: (value: string) => void;
  onBlurDeathDate: () => void;
  onOpenDeathDateModal: () => void;
  buildHint: (value: string) => string;
};

export default memo(function PetMemorialFields({
  choice,
  deathDate,
  onChangeChoice,
  onChangeDeathDate,
  onBlurDeathDate,
  onOpenDeathDateModal,
  buildHint,
}: Props) {
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color: '#778195',
          fontSize: 12,
          fontWeight: '800',
        }}
      >
        추모 프로필 설정
      </Text>

      <View style={{ gap: 8 }}>
        {PET_MEMORIAL_OPTIONS.map(option => {
          const active = option.key === choice;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.9}
              onPress={() => onChangeChoice(option.key)}
              style={{
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 13,
                backgroundColor: active ? 'rgba(109,106,248,0.10)' : '#F4F6FB',
                borderWidth: 1,
                borderColor: active ? 'rgba(109,106,248,0.18)' : 'rgba(17,24,39,0.05)',
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: active ? '#5753E6' : '#1B2230',
                  fontSize: 13,
                  fontWeight: '800',
                }}
              >
                {option.label}
              </Text>
              <Text
                style={{
                  color: '#7F8899',
                  fontSize: 11,
                  fontWeight: '700',
                  lineHeight: 16,
                }}
              >
                {option.helper}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {choice === 'memorial' ? (
        <View style={{ gap: 7 }}>
          <Text
            style={{
              color: '#778195',
              fontSize: 12,
              fontWeight: '800',
            }}
          >
            무지개다리를 건넌 날짜
          </Text>
          <View
            style={{
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: '#F4F6FB',
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <TextInput
              value={deathDate}
              onChangeText={onChangeDeathDate}
              onBlur={onBlurDeathDate}
              placeholder="2024-10-28"
              placeholderTextColor="#A0A7B4"
              style={{
                flex: 1,
                color: '#1B2230',
                fontSize: 14,
                fontWeight: '700',
                paddingVertical: 12,
              }}
              keyboardType="number-pad"
            />
            <TouchableOpacity activeOpacity={0.88} onPress={onOpenDeathDateModal}>
              <Feather color="#98A1B2" name="calendar" size={16} />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              color: '#A0A7B4',
              fontSize: 12,
              fontWeight: '600',
              lineHeight: 16,
            }}
          >
            {buildHint(deathDate)}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
