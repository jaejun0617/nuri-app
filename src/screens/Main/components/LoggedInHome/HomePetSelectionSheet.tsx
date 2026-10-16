import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../../../../app/ui/AppText';
import Feather from '../../../../components/icons/NuriFeatherIcon';
import PetAvatar from '../../../../components/pets/PetAvatar';
import { HomeFloatingWidgetSurface } from '../../../../components/home/HomeWidgetMaterial';
import { formatMemorialPetName } from '../../../../services/pets/memorial';
import { NEUTRAL_UI_PALETTE } from '../../../../services/pets/themePalette';
import type { Pet } from '../../../../store/petStore';
import {
  HOME_SEASONAL_BACKGROUND_GRADIENTS,
  HOME_SEASONAL_BACKGROUND_LOCATIONS,
} from '../../../../theme/home/seasonalAmbient';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { HomePetSheetHeader } from './HomePetSheetHeader';

type Props = {
  visible: boolean;
  pets: readonly Pick<Pet, 'id' | 'name' | 'avatarUrl' | 'deathDate'>[];
  selectedPetId: string | null;
  season: SeasonKey;
  accentColor: string;
  onClose: () => void;
  onSelect: (petId: string) => void;
  onManage: () => void;
};

/** Local selection UI only; the existing Home callback owns context switching. */
export function HomePetSelectionSheet({
  visible,
  pets,
  selectedPetId,
  season,
  accentColor,
  onClose,
  onSelect,
  onManage,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const closing = useRef(false);
  useEffect(() => {
    if (visible) closing.current = false;
  }, [visible]);

  const close = (afterClose?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    onClose();
    afterClose?.();
  };
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={() => close()}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="아이 선택 바깥 영역 닫기"
          style={styles.backdrop}
          onPress={() => close()}
        />
        <View
          testID="home-pet-selection-sheet"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight: Math.max(0, height - insets.top - 32),
              paddingBottom: Math.max(16, insets.bottom + 12),
            },
          ]}
        >
          <LinearGradient
            accessible={false}
            pointerEvents="none"
            colors={[...HOME_SEASONAL_BACKGROUND_GRADIENTS[season]]}
            locations={[...HOME_SEASONAL_BACKGROUND_LOCATIONS]}
            style={StyleSheet.absoluteFill}
          />
          <HomeFloatingWidgetSurface
            radius={28}
            testIDPrefix="home-pet-selection-glass"
          />
          <View style={styles.handle} accessible={false} />
          <View style={styles.header}>
            <HomePetSheetHeader
              title="함께할 아이를 선택해요"
              closeLabel="아이 선택 닫기"
              onClose={() => close()}
            />
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {pets.map(pet => {
              const name = formatMemorialPetName(pet.name, pet.deathDate);
              const selected = pet.id === selectedPetId;
              return (
                <TouchableOpacity
                  key={pet.id}
                  testID={`home-pet-option-${pet.id}`}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${name}${
                    selected ? ', 보고 있어요' : ', 선택하기'
                  }`}
                  onPress={() =>
                    close(() => {
                      if (!selected) onSelect(pet.id);
                    })
                  }
                  style={styles.row}
                >
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <PetAvatar
                      key={`${pet.id}:${pet.avatarUrl ?? ''}`}
                      uri={pet.avatarUrl?.trim() || null}
                      size={48}
                      fallbackLabel={pet.name}
                    />
                  </View>
                  <AppText
                    preset="unifiedLabel"
                    styleOverridesPreset
                    style={styles.name}
                  >
                    {name}
                  </AppText>
                  <View
                    style={[
                      styles.selection,
                      {
                        borderColor: selected
                          ? accentColor
                          : NEUTRAL_UI_PALETTE.muted,
                        backgroundColor: selected ? accentColor : 'transparent',
                      },
                    ]}
                    accessible={false}
                  >
                    {selected ? (
                      <Feather
                        name="check"
                        size={14}
                        color="#FFFFFF"
                        accessible={false}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            testID="home-pet-manage"
            accessibilityRole="button"
            accessibilityLabel="아이들 프로필 관리"
            activeOpacity={0.85}
            onPress={() => close(onManage)}
            style={styles.manage}
          >
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={styles.manageText}
            >
              아이들 프로필 관리
            </AppText>
            <Feather
              name="chevron-right"
              size={18}
              color={NEUTRAL_UI_PALETTE.primary}
              accessible={false}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(33,22,17,0.28)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
    backgroundColor: 'rgba(33,22,17,0.22)',
  },
  header: { paddingHorizontal: 20 },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingHorizontal: 20 },
  row: {
    minHeight: 72,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(33,22,17,0.10)',
  },
  name: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    color: NEUTRAL_UI_PALETTE.deep,
  },
  selection: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manage: {
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manageText: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    color: NEUTRAL_UI_PALETTE.primary,
  },
});
