// 파일: src/screens/Pets/PetProfileEditDoneScreen.tsx
// 역할:
// - 반려동물 프로필 수정 완료 후 보여주는 확인 화면
// - 수정이 반영됐다는 피드백과 함께 홈 복귀 CTA를 단순하게 제공
// - 온보딩 완료 화면과 유사한 감정선을 유지하면서 수정 흐름을 마무리

import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';
import { styles } from './PetProfileEditDoneScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetProfileEditDone'>;
type Route = RootScreenRoute<'PetProfileEditDone'>;

export default function PetProfileEditDoneScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const pets = usePetStore(s => s.pets);
  const pet = useMemo(
    () => pets.find(item => item.id === route.params?.petId) ?? null,
    [pets, route.params?.petId],
  );
  const petName = route.params?.petName?.trim() || '아이';
  const petTheme = useMemo(
    () => buildPetThemePalette(pet?.themeColor),
    [pet?.themeColor],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top + 16, 40),
          paddingBottom: Math.max(insets.bottom + 18, 32),
        },
      ]}
    >
      <View style={styles.confettiOne} />
      <View style={styles.confettiTwo} />
      <View style={styles.confettiThree} />
      <View style={styles.confettiFour} />
      <View style={styles.confettiFive} />

      <View style={styles.hero}>
        <View style={styles.checkCard}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={30} color={petTheme.primary} />
          </View>
        </View>

        <AppText preset="title2" style={styles.title}>
          프로필 수정 완료!
        </AppText>
        <AppText preset="body" style={styles.body}>
          {petName}의 정보를 더 또렷하게 정리했어요.
        </AppText>
        <AppText preset="body" style={styles.body}>
          이제 홈에서 바로 새로운 프로필을 볼 수 있어요.
        </AppText>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[
          styles.primaryButton,
          { backgroundColor: petTheme.primary, shadowColor: petTheme.primary },
          { marginBottom: Math.max(insets.bottom, 0) },
        ]}
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'AppTabs' }],
          })
        }
      >
        <AppText preset="body" style={styles.primaryButtonText}>
          홈으로 가기
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
