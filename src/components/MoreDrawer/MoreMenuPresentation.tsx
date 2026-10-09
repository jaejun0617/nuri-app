import React, { memo, useState } from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import AppText from '../../app/ui/AppText';
import NuriIcon, { type NuriIconName } from '../icons/NuriIcon';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { HomeFrostedGlass } from '../home/HomeFrostedGlass';
import {
  getMoreMenuColors,
  isMoreMenuStacked,
  MORE_MENU,
} from './moreMenuVisualTokens';

export type MoreMenuItem = {
  key: string;
  label: string;
  icon?: string;
  nuriIcon?: NuriIconName;
  onPress: () => void;
  badge?: 'dot' | null;
  valueLabel?: string | null;
  swatch?: string;
  command?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

function Decoration({ children }: React.PropsWithChildren) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}

function Chevron() {
  const theme = useTheme();
  return (
    <Decoration>
      <NuriSemanticIcon
        family="feather"
        name="chevron-right"
        size={16}
        color={theme.colors.textSecondary}
      />
    </Decoration>
  );
}

export const MoreMenuHeader = memo(function MoreMenuHeaderContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <AppText
        preset="unifiedTitle"
        styleOverridesPreset
        accessibilityRole="header"
        style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
      >
        전체메뉴
      </AppText>
      <TouchableOpacity
        testID="more-close"
        accessibilityRole="button"
        accessibilityLabel="전체메뉴 닫기"
        onPress={onClose}
        activeOpacity={0.65}
        style={styles.tool}
      >
        <Decoration>
          <NuriSemanticIcon
            family="feather"
            name="x"
            preserveOriginal
            size={20}
            color={theme.colors.textPrimary}
          />
        </Decoration>
      </TouchableOpacity>
    </View>
  );
});

export const MoreIdentityBand = memo(function MoreIdentityBandContent({
  loggedIn,
  nickname,
  petName,
  petCount,
  petSelected,
  avatarUri,
  petColor,
  onProfile,
  onPets,
}: {
  loggedIn: boolean;
  nickname: string | null;
  petName: string | null;
  petCount: number;
  petSelected: boolean;
  avatarUri: string | null;
  petColor: string;
  onProfile: () => void;
  onPets: () => void;
}) {
  const theme = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const season = useEffectiveSeason();
  const userLabel = loggedIn ? nickname ?? '닉네임 설정' : '로그인';
  const petLabel = loggedIn && petName ? petName : '아이들 프로필 관리';
  const petStatus = !loggedIn
    ? '로그인 후 확인할 수 있어요'
    : petCount === 0
    ? '등록된 아이가 없어요'
    : `${petSelected ? '선택된 아이' : '등록된 아이'} · 총 ${petCount}마리`;
  return (
    <HomeFrostedGlass season={season} borderRadius={8} testID="more-identity-band" style={styles.identityBand}>
      <TouchableOpacity
        testID={loggedIn ? 'more-entry-my-profile' : 'more-entry-login'}
        accessibilityRole="button"
        accessibilityLabel={loggedIn ? `${userLabel}, 닉네임 수정` : '로그인'}
        onPress={onProfile}
        activeOpacity={0.65}
        style={styles.identityRow}
      >
        <View style={styles.identityText}>
          <AppText
            preset="unifiedTitle"
            styleOverridesPreset
            style={[styles.identityTitle, { color: theme.colors.textPrimary }]}
          >
            {userLabel}
          </AppText>
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={[styles.secondary, { color: theme.colors.textSecondary }]}
          >
            {loggedIn ? '닉네임 수정' : 'NURI 계정'}
          </AppText>
        </View>
        <Chevron />
      </TouchableOpacity>
      <View
        style={[
          styles.identityDivider,
          { backgroundColor: theme.colors.border },
        ]}
      />
      <TouchableOpacity
        testID="more-entry-pet-manage"
        accessibilityRole="button"
        accessibilityLabel={`${petLabel}, ${petStatus}, 아이들 프로필 관리`}
        onPress={onPets}
        activeOpacity={0.65}
        style={styles.identityRow}
      >
        <Decoration>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surface, borderColor: petColor },
            ]}
          >
            {loggedIn && avatarUri && failedUri !== avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setFailedUri(avatarUri)}
              />
            ) : (
              <NuriIcon
                name="pet"
                size={28}
                color={petColor}
                colorMode="theme"
              />
            )}
          </View>
        </Decoration>
        <View style={styles.identityText}>
          <AppText
            preset="unifiedLabel"
            styleOverridesPreset
            style={[styles.label, { color: theme.colors.textPrimary }]}
          >
            {petLabel}
          </AppText>
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={[styles.secondary, { color: theme.colors.textSecondary }]}
          >
            {petStatus}
          </AppText>
        </View>
        <AppText
          preset="unifiedBody"
          styleOverridesPreset
          style={[styles.secondary, { color: theme.colors.textSecondary }]}
        >
          관리
        </AppText>
        <Chevron />
      </TouchableOpacity>
    </HomeFrostedGlass>
  );
});

const MoreMenuRow = memo(function MoreMenuRowContent({
  item,
  quick = false,
  stacked,
}: {
  item: MoreMenuItem;
  quick?: boolean;
  stacked: boolean;
}) {
  const theme = useTheme();
  const colors = getMoreMenuColors(theme, useEffectiveSeason());
  const value = item.valueLabel ? (
    <AppText
      preset="unifiedBody"
      styleOverridesPreset
      style={[
        styles.secondary,
        !stacked && styles.trailingValue,
        { color: colors.textSecondary },
      ]}
    >
      {item.valueLabel}
    </AppText>
  ) : null;
  const label =
    item.accessibilityLabel ??
    [
      item.label,
      item.valueLabel,
      item.badge === 'dot' ? '읽지 않은 알림 있음' : null,
    ]
      .filter(Boolean)
      .join(', ');
  return (
    <TouchableOpacity
      testID={item.testID ?? `more-entry-${item.key}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(item.disabled) }}
      disabled={item.disabled}
      onPress={item.onPress}
      activeOpacity={0.65}
      style={[
        styles.row,
        quick && !stacked && styles.quickCell,
        item.disabled && styles.disabled,
      ]}
    >
      {item.icon ? (
        <Decoration>
          <View
            style={[
              styles.icon,
              quick && styles.quickIcon,
              quick && { backgroundColor: colors.accentSurface },
            ]}
          >
            <NuriSemanticIcon
              family="feather"
              name={item.icon}
              semantic={item.nuriIcon}
              size={MORE_MENU.iconSize}
              color={colors.textSecondary}
            />
          </View>
        </Decoration>
      ) : null}
      <View style={styles.rowText}>
        <AppText
          preset="unifiedLabel"
          styleOverridesPreset
          style={[
            styles.label,
            {
              color: item.destructive ? colors.destructive : colors.textPrimary,
            },
          ]}
        >
          {item.label}
        </AppText>
        {stacked ? value : null}
      </View>
      {!stacked ? value : null}
      {item.swatch ? (
        <Decoration>
          <View
            style={[
              styles.swatch,
              { backgroundColor: item.swatch, borderColor: colors.border },
            ]}
          />
        </Decoration>
      ) : null}
      {item.badge === 'dot' ? (
        <Decoration>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        </Decoration>
      ) : null}
      {!quick && !item.command ? <Chevron /> : null}
    </TouchableOpacity>
  );
});

export const MoreMenuSection = memo(function MoreMenuSectionContent({
  title,
  items,
  quick = false,
  onLayout,
  testID,
}: {
  title: string;
  items: MoreMenuItem[];
  quick?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = isMoreMenuStacked(width, fontScale);
  const season = useEffectiveSeason();
  return (
    <View testID={testID} onLayout={onLayout} style={styles.section}>
      <AppText
        accessibilityRole="header"
        preset="unifiedLabel"
        styleOverridesPreset
        style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
      >
        {title}
      </AppText>
      <HomeFrostedGlass season={season} borderRadius={8} style={styles.sectionGlass}>
      <View
        testID={quick ? 'more-quick-grid' : undefined}
        style={quick && !stacked ? styles.grid : undefined}
      >
        {items.map(item => (
          <MoreMenuRow
            key={item.key}
            item={item}
            quick={quick}
            stacked={stacked}
          />
        ))}
      </View>
      </HomeFrostedGlass>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    minHeight: MORE_MENU.headerHeight,
    paddingLeft: MORE_MENU.contentPadding,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0,
  },
  tool: {
    width: MORE_MENU.toolTarget,
    height: MORE_MENU.toolTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityBand: { minHeight: 88, marginTop: 0, paddingHorizontal: 12, paddingVertical: 8 },
  identityRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  identityText: { flex: 1, minWidth: 0, gap: 4 },
  identityTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 0,
  },
  identityDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 4,
  },
  avatar: {
    width: MORE_MENU.avatarSize,
    height: MORE_MENU.avatarSize,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  section: { gap: MORE_MENU.titleGap },
  sectionGlass: { marginTop: 0, paddingHorizontal: 8, paddingVertical: 4 },
  sectionTitle: {
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: MORE_MENU.columnGap,
    rowGap: 4,
  },
  quickCell: { flexBasis: '45%', flexGrow: 1 },
  row: {
    minHeight: MORE_MENU.rowHeight,
    paddingVertical: MORE_MENU.rowPaddingVertical,
    paddingHorizontal: MORE_MENU.rowPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '500', letterSpacing: 0 },
  secondary: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
  trailingValue: {
    maxWidth: MORE_MENU.valueMaxWidth,
    flexShrink: 1,
    textAlign: 'right',
  },
  icon: {
    width: MORE_MENU.iconSize,
    height: MORE_MENU.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIcon: {
    width: MORE_MENU.quickIconBox,
    height: MORE_MENU.quickIconBox,
    borderRadius: MORE_MENU.radius,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  disabled: { opacity: 0.5 },
});
