// 파일: src/components/navigation/AppNavigationToolbar.tsx
// 파일 목적:
// - 앱 하단 공통 이동 UI를 한 컴포넌트로 유지해 홈/상세/드로어에서 같은 동작을 재사용한다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 커스텀 탭바와 More 드로어/일부 상세 화면 하단 툴바에서 사용된다.
// 핵심 역할:
// - 홈, 타임라인, 커뮤니티, 편지함, 전체메뉴 이동을 제공한다.
// - 펫 프로필 색과 분리한 중립색으로 현재 탭을 표시한다.
// 데이터·상태 흐름:
// - More 오픈 상태는 uiStore를 사용한다.
// 수정 시 주의:
// - 탭 라벨이나 target route를 바꿀 때는 AppTabsNavigator와 RootNavigator 타입까지 같이 확인해야 한다.

import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ToolbarOutlineIcon, { type ToolbarIconName } from '../icons/ToolbarOutlineIcon';

import AppText from '../../app/ui/AppText';
import { HOME_HERO_ACCENT, HOME_HERO_COLORS, HOME_HERO_TOOLBAR_RADIUS } from '../../theme/home/heroLayout';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { ScreenEntrySource } from '../../navigation/entry';

import { closeMoreDrawer, openMoreDrawer } from '../../store/uiStore';

export type ActiveTabKey = ToolbarIconName;

const tabs = [
  { key: 'home', label: '홈' },
  { key: 'timeline', label: '타임라인' },
  { key: 'community', label: '커뮤니티' },
  { key: 'guestbook', label: '편지함' },
  { key: 'more', label: '전체메뉴' },
] as const;

type Props = {
  activeKey: ActiveTabKey;
  homeHero?: boolean;
  onBeforeNavigate?: () => void;
  onPressMore?: () => void;
  onPressActiveHome?: () => void;
  onNavigateTab?: (target: Exclude<ActiveTabKey, 'more'>) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AppNavigationToolbar({
  activeKey,
  onBeforeNavigate,
  onPressMore,
  onPressActiveHome,
  onNavigateTab,
  onLayout,
}: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const bottomInset = useMemo(
    () =>
      Platform.OS === 'android'
        ? Math.max(insets.bottom, 18)
        : Math.max(insets.bottom, 10),
    [insets.bottom],
  );

  const navigateTo = useCallback(
    (target: ActiveTabKey) => {
      if (target === 'home' && activeKey === 'home' && onPressActiveHome) {
        onPressActiveHome();
        return;
      }
      onBeforeNavigate?.();
      const entrySource: ScreenEntrySource =
        activeKey === 'more' ? 'more' : 'home';

      if (target === 'more') {
        if (onPressMore) {
          onPressMore();
          return;
        }
        openMoreDrawer();
        return;
      }

      // Root tabs keep existing nested params; detail/drawer entry behavior stays unchanged.
      if (onNavigateTab) {
        onNavigateTab(target);
        return;
      }

      // An explicit tab choice discards the retained menu; ordinary Back still restores it.
      closeMoreDrawer();

      if (target === 'timeline') {
        navigation.navigate('AppTabs', {
          screen: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all', entrySource },
          },
        });
        return;
      }

      if (target === 'community') {
        navigation.navigate('AppTabs', {
          screen: 'CommunityTab',
        });
        return;
      }

      if (target === 'guestbook') {
        navigation.navigate('AppTabs', {
          screen: 'GuestbookTab',
        });
        return;
      }

      navigation.navigate('AppTabs', {
        screen: 'HomeTab',
      });
    },
    [activeKey, navigation, onBeforeNavigate, onPressMore, onPressActiveHome, onNavigateTab],
  );

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.wrap,
        { paddingBottom: bottomInset },
      ]}
    >
      <View style={styles.bar}>
        {tabs.map(tab => {
          const active = activeKey === tab.key;
          const color = active ? HOME_HERO_ACCENT.primary : HOME_HERO_COLORS.muted;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={styles.item}
              onPress={() => navigateTo(tab.key)}
            >
              <ToolbarOutlineIcon
                name={tab.key}
                color={color}
              />
              <AppText
                typographyRole="navigation"
                preset="tab"
                keepBaseFontSize
                maxFontSizeMultiplier={1.6}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.label, { color }]}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: HOME_HERO_TOOLBAR_RADIUS,
    borderTopRightRadius: HOME_HERO_TOOLBAR_RADIUS,
  },
  bar: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: '#ECEAF1',
    borderTopLeftRadius: HOME_HERO_TOOLBAR_RADIUS,
    borderTopRightRadius: HOME_HERO_TOOLBAR_RADIUS,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    paddingVertical: 6,
  },
  label: {
    width: '100%',
    textAlign: 'center',
  },
});
