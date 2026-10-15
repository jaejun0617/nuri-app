import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { resolveCtaPalette } from '../../app/theme/ctaPalette';
import { formatPetAgeLabelFromBirthDate } from '../../services/pets/age';
import {
  buildPetSpeciesSelection,
  deriveCanonicalPetSpeciesKey,
} from '../../services/pets/species';
import type { Pet } from '../../store/petStore';
import {
  diffCalendarDaysBetweenYmd,
  diffDaysFromKst,
  formatYmdToDots,
} from '../../utils/date';
import { HomeReflectiveGlass } from '../home/HomeReflectiveGlass';
import Feather from '../icons/NuriFeatherIcon';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';

type Props = {
  pet: Pet;
  isSelected: boolean;
  onPressSelect: (petId: string) => void;
  onPressEdit: (petId: string) => void;
  onPressDelete: (petId: string) => void;
};

const PetManagementPhotoStage = memo(function PetManagementPhotoStageView({
  uri,
  name,
  petId,
}: {
  uri: string | null;
  name: string;
  petId: string;
}) {
  const theme = useTheme();
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <View testID={`pet-photo-frame-${petId}`} style={styles.photoFrame}>
      {uri && !loadFailed ? (
        <Image
          source={{ uri }}
          style={styles.photo}
          resizeMode="contain"
          resizeMethod="resize"
          accessibilityRole="image"
          accessibilityLabel={`${name} 프로필 사진`}
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.photoFallback,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Feather name="image" size={28} color={theme.colors.textSecondary} />
          <AppText
            preset="unifiedMeta"
            styleOverridesPreset
            style={[
              styles.meta,
              styles.fallbackText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {uri ? '사진을 불러오지 못했어요' : '등록된 사진이 없어요'}
          </AppText>
        </View>
      )}
    </View>
  );
});

function PetManagementCardComponent({
  pet,
  isSelected,
  onPressSelect,
  onPressEdit,
  onPressDelete,
}: Props) {
  const theme = useTheme();
  const season = useEffectiveSeason();
  const selectionPalette = resolveCtaPalette({
    role: 'primarySubtle',
    season,
    colorScheme: theme.mode,
    colors: theme.colors,
  });
  const photoUri = pet.avatarUrl?.trim() || null;
  const birthDate =
    diffCalendarDaysBetweenYmd(pet.birthDate, pet.birthDate) === 0
      ? pet.birthDate ?? null
      : null;
  const ageLabel = useMemo(
    () => formatPetAgeLabelFromBirthDate(birthDate) ?? '미입력',
    [birthDate],
  );
  const speciesLabel = useMemo(() => {
    const detail =
      pet.speciesDisplayName?.trim() ||
      pet.speciesDetailKey?.trim() ||
      pet.breed?.trim() ||
      '';
    if (!pet.species && !pet.speciesKey && !detail) return '미입력';
    const speciesKey = deriveCanonicalPetSpeciesKey({
      species: pet.species,
      speciesKey: pet.speciesKey,
      speciesDetailKey: pet.speciesDetailKey,
      speciesDisplayName: pet.speciesDisplayName,
      breed: pet.breed,
    });
    return buildPetSpeciesSelection(speciesKey, detail).speciesDisplayName;
  }, [
    pet.species,
    pet.speciesKey,
    pet.speciesDetailKey,
    pet.speciesDisplayName,
    pet.breed,
  ]);
  const genderLabel =
    pet.gender === 'male'
      ? '남아'
      : pet.gender === 'female'
      ? '여아'
      : '미입력';
  const weightLabel =
    typeof pet.weightKg === 'number' &&
    Number.isFinite(pet.weightKg) &&
    pet.weightKg > 0
      ? `${Number(pet.weightKg.toFixed(2))}kg`
      : '미입력';
  // Use Home's inclusive KST adoption-day calculation, without storing a total.
  const togetherDays = diffDaysFromKst(pet.adoptionDate ?? '');
  const details = [
    { key: 'age', label: '나이', value: ageLabel },
    { key: 'gender', label: '성별', value: genderLabel },
    { key: 'weight', label: '몸무게', value: weightLabel },
    {
      key: 'birthday',
      label: '생일',
      value: formatYmdToDots(birthDate) ?? '미입력',
    },
    {
      key: 'together',
      label: '함께한 시간',
      value:
        togetherDays !== null && togetherDays > 0
          ? `${togetherDays}일`
          : '미입력',
    },
  ];
  const handleSelect = useCallback(() => {
    onPressSelect(pet.id);
  }, [onPressSelect, pet.id]);
  const handleEdit = useCallback(() => {
    onPressEdit(pet.id);
  }, [onPressEdit, pet.id]);
  const handleDelete = useCallback(() => {
    onPressDelete(pet.id);
  }, [onPressDelete, pet.id]);

  return (
    <HomeReflectiveGlass borderRadius={8} style={styles.card}>
      {/* Keep the whole photo visible; the information column can grow for text. */}
      <View testID={`pet-content-${pet.id}`} style={styles.content}>
        <PetManagementPhotoStage
          key={photoUri ?? 'no-photo'}
          uri={photoUri}
          name={pet.name}
          petId={pet.id}
        />

        <View testID={`pet-info-${pet.id}`} style={styles.info}>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <AppText
                preset="unifiedBody"
                styleOverridesPreset
                style={[styles.name, { color: theme.colors.textPrimary }]}
              >
                {pet.name}
              </AppText>
              {pet.deathDate ? (
                <View
                  style={[
                    styles.memorialBadge,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <AppText
                    preset="unifiedMeta"
                    styleOverridesPreset
                    style={[styles.meta, { color: theme.colors.textSecondary }]}
                  >
                    추모
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={[styles.meta, { color: theme.colors.textSecondary }]}
            >
              {speciesLabel}
            </AppText>
          </View>
          <View testID={`pet-stats-${pet.id}`} style={styles.stats}>
            {details.map(detail => (
              <View
                key={detail.key}
                testID={`pet-${detail.key}-${pet.id}`}
                style={styles.statRow}
              >
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[styles.meta, { color: theme.colors.textSecondary }]}
                >
                  {detail.label}
                </AppText>
                <AppText
                  preset="unifiedBody"
                  styleOverridesPreset
                  style={[
                    styles.statValue,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {detail.value}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View testID={`pet-actions-${pet.id}`} style={styles.actions}>
        {isSelected ? (
          <View
            testID={`pet-selected-status-${pet.id}`}
            accessible
            accessibilityLabel={`${pet.name}, 지금 보고 있는 아이`}
            style={[
              styles.action,
              styles.selectedStatus,
              { backgroundColor: selectionPalette.background },
            ]}
          >
            <NuriSemanticIcon
              family="feather"
              name="check"
              preserveOriginal
              size={12}
              color={selectionPalette.text}
            />
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={[styles.actionText, { color: selectionPalette.text }]}
            >
              보고 있어요
            </AppText>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${pet.name} 선택하기`}
            style={[
              styles.action,
              { backgroundColor: selectionPalette.background },
            ]}
            onPress={handleSelect}
          >
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={[styles.actionText, { color: selectionPalette.text }]}
            >
              선택
            </AppText>
          </TouchableOpacity>
        )}

        <CtaButton
          role="secondary"
          testID={`pet-edit-${pet.id}`}
          accessibilityLabel={`${pet.name} 프로필 수정하기`}
          style={styles.action}
          onPress={handleEdit}
        >
          <CtaText
            preset="unifiedMeta"
            styleOverridesPreset
            style={styles.actionText}
          >
            프로필 수정
          </CtaText>
        </CtaButton>

        <CtaButton
          role="destructiveEntry"
          testID={`pet-delete-entry-${pet.id}`}
          accessibilityLabel={`${pet.name} 아이 프로필 삭제하기`}
          accessibilityHint="확인 절차를 열며 바로 삭제하지 않습니다."
          style={styles.action}
          onPress={handleDelete}
        >
          <CtaText
            preset="unifiedMeta"
            styleOverridesPreset
            style={styles.actionText}
          >
            삭제하기
          </CtaText>
        </CtaButton>
      </View>
    </HomeReflectiveGlass>
  );
}

function areEqual(prev: Props, next: Props) {
  return (
    prev.isSelected === next.isSelected &&
    prev.onPressSelect === next.onPressSelect &&
    prev.onPressEdit === next.onPressEdit &&
    prev.onPressDelete === next.onPressDelete &&
    prev.pet.id === next.pet.id &&
    prev.pet.name === next.pet.name &&
    prev.pet.avatarUrl === next.pet.avatarUrl &&
    prev.pet.birthDate === next.pet.birthDate &&
    prev.pet.adoptionDate === next.pet.adoptionDate &&
    prev.pet.speciesDetailKey === next.pet.speciesDetailKey &&
    prev.pet.speciesDisplayName === next.pet.speciesDisplayName &&
    prev.pet.species === next.pet.species &&
    prev.pet.speciesKey === next.pet.speciesKey &&
    prev.pet.breed === next.pet.breed &&
    prev.pet.weightKg === next.pet.weightKg &&
    prev.pet.gender === next.pet.gender &&
    prev.pet.deathDate === next.pet.deathDate &&
    prev.pet.themeColor === next.pet.themeColor
  );
}

const PetManagementCard = memo(PetManagementCardComponent, areEqual);

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 224,
  },
  photoFrame: {
    width: '50%',
    minWidth: 0,
    overflow: 'hidden',
  },
  photo: {
    ...StyleSheet.absoluteFill,
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  fallbackText: {
    textAlign: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    justifyContent: 'center',
    gap: 12,
  },
  identity: {
    minWidth: 0,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
  },
  stats: {
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'right',
  },
  memorialBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
    padding: 8,
  },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedStatus: {
    flexDirection: 'row',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default PetManagementCard;
