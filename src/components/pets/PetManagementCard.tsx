import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import { formatPetAgeLabelFromBirthDate } from '../../services/pets/age';
import {
  buildPetSpeciesSelection,
  deriveCanonicalPetSpeciesKey,
} from '../../services/pets/species';
import type { Pet } from '../../store/petStore';
import {
  PET_MANAGEMENT_COLORS as colors,
  PET_MANAGEMENT_TYPE as type,
  getPetManagementLayout,
} from '../../theme/pets/management';
import {
  diffCalendarDaysBetweenYmd,
  diffDaysFromKst,
  formatYmdToDots,
} from '../../utils/date';
import { getPetDisplayName } from '../../utils/petDisplayName';
import { HomeFloatingWidgetSurface } from '../home/HomeWidgetMaterial';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';

type Props = {
  pet: Pet;
  isSelected: boolean;
  availableWidth?: number;
  onPressSelect: (petId: string) => void;
  onPressEdit: (petId: string) => void;
  onPressDelete: (petId: string) => void;
};

const Photo = memo(function PetManagementPhoto({
  uri,
  name,
  petId,
  size,
}: {
  uri: string | null;
  name: string;
  petId: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      testID={`pet-photo-frame-${petId}`}
      style={[styles.photoFrame, { width: size, height: size }]}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={`${name} 프로필 사진`}
          accessibilityRole="image"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.photoFallback}>
          <NuriSemanticIcon
            family="feather"
            name="image"
            preserveOriginal
            size={24}
            color={colors.muted}
          />
          <AppText preset="bodySm" style={styles.fallbackText}>
            {uri ? '사진을 불러오지 못했어요' : '등록된 사진이 없어요'}
          </AppText>
        </View>
      )}
    </View>
  );
});

function CardActionContent({
  label,
  icon,
  size,
  testID,
  accent = false,
}: {
  label: string;
  icon?: 'edit-2' | 'check';
  size: number;
  testID: string;
  accent?: boolean;
}) {
  // Restore the icon slot; equal side widths keep the label itself centered.
  return (
    <View style={styles.actionRow}>
      <View style={styles.iconSlot}>
        {icon === 'check' ? (
          <View style={styles.selectedCheck}>
            <NuriSemanticIcon
              family="feather"
              name="check"
              preserveOriginal
              size={size}
              color={colors.white}
            />
          </View>
        ) : icon ? (
          <NuriSemanticIcon
            family="feather"
            name={icon}
            preserveOriginal
            size={20}
            color={colors.muted}
          />
        ) : null}
      </View>
      <AppText
        testID={testID}
        preset="button"
        style={[
          styles.actionText,
          { fontSize: size, color: accent ? colors.accent : colors.ink },
        ]}
      >
        {label}
      </AppText>
      <View
        style={styles.iconSlot}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}

function PetManagementCard({
  pet,
  isSelected,
  availableWidth,
  onPressSelect,
  onPressEdit,
  onPressDelete,
}: Props) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getPetManagementLayout(availableWidth ?? window.width);
  const moreRef = useRef<React.ComponentRef<typeof TouchableOpacity> | null>(
    null,
  );
  const menuDeleting = useRef(false);
  const [menu, setMenu] = useState<{ right: number; top: number } | null>(null);
  const name = getPetDisplayName(pet.name);
  const uri = pet.avatarUrl?.trim() || null;
  const birthDate =
    diffCalendarDaysBetweenYmd(pet.birthDate, pet.birthDate) === 0
      ? pet.birthDate
      : null;
  const detail =
    pet.speciesDisplayName?.trim() ||
    pet.speciesDetailKey?.trim() ||
    pet.breed?.trim() ||
    '';
  const species =
    !pet.species && !pet.speciesKey && !detail
      ? '미입력'
      : buildPetSpeciesSelection(
          deriveCanonicalPetSpeciesKey({ ...pet, species: pet.species }),
          detail,
        ).speciesDisplayName;
  const gender =
    pet.gender === 'male'
      ? '남아'
      : pet.gender === 'female'
      ? '여아'
      : '미입력';
  const days = diffDaysFromKst(pet.adoptionDate ?? '');
  const stats = [
    {
      key: 'age',
      label: '나이',
      value: formatPetAgeLabelFromBirthDate(birthDate) ?? '미입력',
    },
    {
      key: 'weight',
      label: '몸무게',
      value:
        typeof pet.weightKg === 'number' &&
        Number.isFinite(pet.weightKg) &&
        pet.weightKg > 0
          ? `${Number(pet.weightKg.toFixed(2))}kg`
          : '미입력',
    },
    {
      key: 'together',
      label: '함께한 시간',
      value:
        days !== null && days > 0
          ? `${days.toLocaleString('ko-KR')}일`
          : '미입력',
    },
  ];
  const openMenu = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      menuDeleting.current = false;
      setMenu({ right: 16, top: insets.top + 80 });
      moreRef.current?.measureInWindow((x, y, width, height) => {
        setMenu({
          right: Math.max(16, window.width - x - width),
          top: Math.min(y + height, window.height - insets.bottom - 80),
        });
      });
    },
    [insets.bottom, insets.top, window.height, window.width],
  );

  return (
    <View
      testID={`pet-card-${pet.id}`}
      style={[
        styles.card,
        {
          borderColor: isSelected ? colors.border : colors.quietBorder,
          padding: layout.cardInset,
        },
      ]}
    >
      <HomeFloatingWidgetSurface
        radius={layout.cardRadius}
        testIDPrefix="pet-management-glass"
      />
      <View
        testID={`pet-content-${pet.id}`}
        style={[styles.content, { gap: layout.photoGap }]}
      >
        <Photo
          key={`${pet.id}:${uri ?? 'none'}`}
          uri={uri}
          name={name}
          petId={pet.id}
          size={layout.photoSize}
        />
        <View testID={`pet-info-${pet.id}`} style={styles.info}>
          <View style={styles.nameRow}>
            <AppText
              preset="title1"
              accessibilityLabel={name}
              style={[
                styles.name,
                {
                  fontSize: Array.from(name).length > 6 ? 18 : layout.nameSize,
                  lineHeight: layout.nameLineHeight,
                },
              ]}
            >
              {name}
            </AppText>
            {pet.deathDate ? (
              <View style={styles.memorial}>
                <AppText preset="bodySm" style={styles.memorialText}>
                  추모
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText
            testID={`pet-species-${pet.id}`}
            preset="bodySm"
            style={[styles.meta, { fontSize: layout.metaSize }]}
          >
            {species} · {gender}
          </AppText>
          <View testID={`pet-birthday-${pet.id}`} style={styles.birthday}>
            <AppText
              preset="bodySm"
              style={[styles.meta, { fontSize: layout.metaSize }]}
            >
              생일{' '}
            </AppText>
            <AppText
              preset="bodySm"
              style={[styles.birthdayValue, { fontSize: layout.metaSize }]}
            >
              {formatYmdToDots(birthDate) ?? '미입력'}
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          ref={moreRef}
          testID={`pet-more-${pet.id}`}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={`${name} 더보기`}
          accessibilityHint="이 아이의 프로필 삭제 메뉴를 엽니다."
          activeOpacity={0.7}
          style={styles.more}
        >
          <NuriSemanticIcon
            family="feather"
            name="more-vertical"
            preserveOriginal
            size={22}
            color={colors.moreIcon}
          />
        </TouchableOpacity>
      </View>
      <View testID={`pet-stats-${pet.id}`} style={styles.stats}>
        {stats.map((stat, index) => (
          <View
            key={stat.key}
            testID={`pet-${stat.key}-${pet.id}`}
            style={[
              styles.stat,
              index > 0 && styles.statDivider,
              { paddingLeft: index > 0 ? (layout.compact ? 12 : 20) : 0 },
            ]}
          >
            <AppText preset="caption" style={styles.statLabel}>
              {stat.label}
            </AppText>
            <AppText preset="titleMd" style={styles.statValue}>
              {stat.value}
            </AppText>
          </View>
        ))}
      </View>
      <View testID={`pet-actions-${pet.id}`} style={styles.actions}>
        <TouchableOpacity
          testID={`pet-edit-${pet.id}`}
          onPress={() => onPressEdit(pet.id)}
          accessibilityRole="button"
          accessibilityLabel={`${name} 프로필 수정하기`}
          style={[styles.action, styles.edit]}
          activeOpacity={0.8}
        >
          <CardActionContent
            label="프로필 수정"
            size={layout.actionSize}
            testID={`pet-edit-label-${pet.id}`}
          />
        </TouchableOpacity>
        {isSelected ? (
          <View
            testID={`pet-selected-status-${pet.id}`}
            accessible
            accessibilityLabel={`${name}, 지금 보고 있는 아이`}
            style={[styles.action, styles.selection]}
          >
            <CardActionContent
              label="보고 있어요"
              icon="check"
              size={layout.actionSize}
              testID={`pet-selected-label-${pet.id}`}
              accent
            />
          </View>
        ) : (
          <TouchableOpacity
            testID={`pet-select-${pet.id}`}
            onPress={() => onPressSelect(pet.id)}
            accessibilityRole="button"
            accessibilityLabel={`${name} 선택하기`}
            style={[styles.action, styles.selection]}
            activeOpacity={0.8}
          >
            <CardActionContent
              label="이 아이 선택"
              size={layout.actionSize}
              testID={`pet-select-label-${pet.id}`}
              accent
            />
          </TouchableOpacity>
        )}
      </View>
      <Modal
        visible={menu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}
        onDismiss={() => {
          if (!menuDeleting.current) moreRef.current?.focus();
        }}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenu(null)}
          accessibilityLabel="더보기 메뉴 닫기"
          accessibilityRole="button"
        />
        <View
          testID="pet-management-menu"
          accessibilityViewIsModal
          style={[
            styles.menu,
            {
              right: menu?.right ?? 16,
              top: menu?.top ?? insets.top + 80,
              maxWidth: window.width - 32,
            },
          ]}
        >
          <TouchableOpacity
            testID={`pet-delete-entry-${pet.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${name} 아이 프로필 삭제하기`}
            accessibilityHint="확인 절차를 열며 바로 삭제하지 않습니다."
            style={styles.menuAction}
            onPress={() => {
              menuDeleting.current = true;
              setMenu(null);
              onPressDelete(pet.id);
            }}
          >
            <AppText preset="body" style={styles.deleteLabel}>
              {name} 프로필 삭제
            </AppText>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: colors.glass,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  photoFrame: {
    flexShrink: 0,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: colors.subtle,
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  fallbackText: { ...type.label, textAlign: 'center', color: colors.muted },
  info: { flex: 1, minWidth: 0, paddingTop: 14, gap: 14 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingRight: 10,
  },
  name: { ...type.name, color: colors.ink, flexShrink: 1 },
  memorial: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memorialText: { ...type.label, color: colors.muted },
  meta: { ...type.meta, color: colors.muted },
  birthday: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 4,
  },
  birthdayValue: { ...type.meta, color: colors.ink },
  more: {
    position: 'absolute',
    right: -10,
    top: -12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    borderTopWidth: 1,
    borderTopColor: colors.quietBorder,
    marginTop: 14,
    paddingTop: 16,
    flexDirection: 'row',
  },
  stat: { flex: 1, minWidth: 0, paddingRight: 6, gap: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.quietBorder },
  statLabel: { ...type.label, color: colors.muted },
  statValue: { ...type.value, color: colors.ink },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  iconSlot: {
    width: 22,
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edit: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  selection: { backgroundColor: colors.subtle },
  selectedCheck: {
    backgroundColor: colors.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...type.action,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.ink,
    textAlign: 'center',
    flex: 1,
    minWidth: 0,
  },
  menuBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
  menu: {
    position: 'absolute',
    minWidth: 120,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  menuAction: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  deleteLabel: {
    ...type.dialogBody,
    color: colors.danger,
    textAlign: 'center',
  },
});
export default memo(PetManagementCard);
