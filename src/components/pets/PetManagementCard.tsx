import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { formatPetAgeLabelFromBirthDate } from '../../services/pets/age';
import { getPetSpeciesGroupLabel } from '../../services/pets/species';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import type { Pet } from '../../store/petStore';
import PetAvatar from './PetAvatar';
import PetSelectedBadge from './PetSelectedBadge';

type Props = {
  pet: Pet;
  isSelected: boolean;
  onPressSelect: (petId: string) => void;
  onPressEdit: (petId: string) => void;
};

function PetManagementCardComponent({
  pet,
  isSelected,
  onPressSelect,
  onPressEdit,
}: Props) {
  const petTheme = useMemo(
    () => buildPetThemePalette(pet.themeColor),
    [pet.themeColor],
  );
  const ageLabel = useMemo(
    () => formatPetAgeLabelFromBirthDate(pet.birthDate ?? null) ?? '나이 미입력',
    [pet.birthDate],
  );
  const speciesLabel = useMemo(() => {
    const detail = pet.speciesDetailKey?.trim();
    if (detail) return detail;

    const displayName = pet.speciesDisplayName?.trim();
    if (displayName) return displayName;

    return getPetSpeciesGroupLabel(pet.species ?? null);
  }, [pet.species, pet.speciesDetailKey, pet.speciesDisplayName]);
  const summary = useMemo(
    () => `${speciesLabel} · ${ageLabel}`,
    [ageLabel, speciesLabel],
  );
  const handleSelect = useCallback(() => {
    onPressSelect(pet.id);
  }, [onPressSelect, pet.id]);
  const handleEdit = useCallback(() => {
    onPressEdit(pet.id);
  }, [onPressEdit, pet.id]);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isSelected ? petTheme.border : '#E5EAF2',
          backgroundColor: isSelected ? petTheme.soft : '#FFFFFF',
        },
      ]}
    >
      <View style={styles.leading}>
        <PetAvatar
          uri={pet.avatarUrl?.trim() || null}
          size={64}
          fallbackLabel={pet.name}
        />
      </View>

      <View style={styles.info}>
        <AppText preset="body" style={styles.name}>
          {pet.name}
        </AppText>
        <AppText preset="caption" style={styles.meta}>
          {summary}
        </AppText>
        {pet.deathDate ? (
          <View style={styles.memorialBadge}>
            <AppText preset="caption" style={styles.memorialBadgeText}>
              추모
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {isSelected ? (
          <PetSelectedBadge
            accentColor={petTheme.primary}
            accentTint={petTheme.tint}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.selectButton,
              {
                backgroundColor: petTheme.primary,
                shadowColor: petTheme.primary,
              },
            ]}
            onPress={handleSelect}
          >
            <Feather
              name="check"
              size={12}
              color={petTheme.onPrimary}
              style={styles.selectButtonIcon}
            />
            <AppText
              preset="caption"
              style={[styles.selectButtonText, { color: petTheme.onPrimary }]}
            >
              선택
            </AppText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.editButton,
            {
              backgroundColor: petTheme.tint,
              borderColor: petTheme.border,
            },
          ]}
          onPress={handleEdit}
        >
          <AppText
            preset="caption"
            style={[styles.editButtonText, { color: petTheme.deep }]}
          >
            프로필 수정
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function areEqual(prev: Props, next: Props) {
  return (
    prev.isSelected === next.isSelected &&
    prev.pet.name === next.pet.name &&
    prev.pet.avatarUrl === next.pet.avatarUrl &&
    prev.pet.birthDate === next.pet.birthDate &&
    prev.pet.speciesDetailKey === next.pet.speciesDetailKey &&
    prev.pet.speciesDisplayName === next.pet.speciesDisplayName &&
    prev.pet.species === next.pet.species &&
    prev.pet.deathDate === next.pet.deathDate &&
    prev.pet.themeColor === next.pet.themeColor
  );
}

const PetManagementCard = memo(PetManagementCardComponent, areEqual);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: '#172033',
    fontWeight: '900',
  },
  meta: {
    color: '#7C889A',
    fontWeight: '700',
  },
  memorialBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(224, 90, 104, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memorialBadgeText: {
    color: '#E05A68',
    fontWeight: '900',
  },
  actions: {
    width: 124,
    gap: 8,
    alignItems: 'stretch',
  },
  selectButton: {
    minHeight: 36,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 4,
  },
  selectButtonText: {
    fontWeight: '900',
  },
  selectButtonIcon: {
    marginTop: 0.5,
  },
  editButton: {
    minHeight: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontWeight: '900',
  },
});

export default PetManagementCard;
