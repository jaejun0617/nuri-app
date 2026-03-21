# 타임라인 관련 코드 및 SQL 전체

생성일: 2026-03-21

이 문서는 타임라인 관련 코드와 SQL 원문 전체를 생략 없이 모아둔 번들이다.

## 1. 코드 파일 인덱스

1. `src/navigation/AppTabsNavigator.tsx`
2. `src/navigation/TimelineStackNavigator.tsx`
3. `src/components/navigation/AppNavigationToolbar.tsx`
4. `src/components/media/PhotoAddCard.tsx`
5. `src/components/records/RecordImageGallery.tsx`
6. `src/components/MemoryCard/MemoryCard.tsx`
7. `src/components/images/OptimizedImage.tsx`
8. `src/hooks/useSignedMemoryImage.ts`
9. `src/store/recordStore.ts`
10. `src/services/memories/categoryMeta.ts`
11. `src/services/timeline/heatmap.ts`
12. `src/services/timeline/query.ts`
13. `src/services/local/recordDraft.ts`
14. `src/services/local/uploadQueue.ts`
15. `src/services/supabase/storageMemories.ts`
16. `src/services/supabase/memories.ts`
17. `src/services/records/imageSources.ts`
18. `src/services/records/form.ts`
19. `src/services/records/date.ts`
20. `src/screens/Common/EditDoneScreen.tsx`
21. `src/screens/Weather/WeatherActivityRecordScreen.tsx`
22. `src/screens/Records/TimelineScreen.styles.ts`
23. `src/screens/Records/TimelineScreen.tsx`
24. `src/screens/Records/RecordCreateScreen.styles.ts`
25. `src/screens/Records/RecordCreateScreen.tsx`
26. `src/screens/Records/RecordDetailScreen.styles.ts`
27. `src/screens/Records/RecordDetailScreen.tsx`
28. `src/screens/Records/RecordEditScreen.styles.ts`
29. `src/screens/Records/RecordEditScreen.tsx`
30. `src/screens/Records/components/RecordTagModal.tsx`

## 2. SQL 파일 인덱스

1. `docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql`
2. `docs/sql/공용-릴리즈-묶음/기능-추가/메모리-카테고리-서브카테고리-가격-추가.sql`
3. `docs/sql/마이그레이션/2026-03-05_메모리-이미지-URL-컬럼-추가.sql`
4. `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

## 3. 코드 원문 전체

---

## FILE: `src/navigation/AppTabsNavigator.tsx`

원본 경로: `src/navigation/AppTabsNavigator.tsx`

```tsx
// 파일: src/navigation/AppTabsNavigator.tsx
// 파일 목적:
// - 로그인 후 메인 사용 흐름의 공통 하단 탭 구조를 정의한다.
// 어디서 쓰이는지:
// - RootNavigator의 `AppTabs` 라우트에서 메인 네비게이터로 사용된다.
// 핵심 역할:
// - Home, Timeline, RecordCreate, More 진입을 하나의 탭 레이아웃으로 묶는다.
// - 중앙 기록 작성 FAB와 More 오버레이 드로어를 탭 구조 안에서 특수 동작으로 연결한다.
// 데이터·상태 흐름:
// - 현재 탭 상태를 AppNavigationToolbar에 전달하고, More 드로어 open/close 상태는 uiStore가 관리한다.
// - RecordCreate는 탭이지만 실제로는 작성 완료 후 returnTo 파라미터를 따라 복귀하는 진입점으로 사용된다.
// 수정 시 주의:
// - 탭 목록이나 param 타입을 바꾸면 하단 툴바, 기록 작성 복귀 흐름, More 드로어 동작이 함께 영향을 받는다.
// - MoreTab은 실제 화면 이동이 아니라 오버레이를 여는 동작이므로 일반 탭처럼 취급하면 안 된다.

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';

import MainScreen from '../screens/Main/MainScreen';
import TimelineStackNavigator, {
  type TimelineStackParamList,
} from './TimelineStackNavigator';
import RecordCreateScreen from '../screens/Records/RecordCreateScreen';

import MoreDrawer from '../components/MoreDrawer/MoreDrawer';
import AppNavigationToolbar from '../components/navigation/AppNavigationToolbar';
import { useUiStore } from '../store/uiStore';

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: NavigatorScreenParams<TimelineStackParamList> | undefined;
  RecordCreateTab:
    | {
        petId?: string;
        returnTo?:
          | { tab: 'HomeTab' }
          | {
              tab: 'TimelineTab';
              params?: NavigatorScreenParams<TimelineStackParamList>;
            }
          | { tab: 'MoreTab' };
      }
    | undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function MoreNull() {
  const theme = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

function CustomTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const shouldHideTabBar = useMemo(() => {
    const current = state.routes[state.index];
    if (!current) return false;

    if (current.name === 'RecordCreateTab') {
      return true;
    }

    if (current.name === 'TimelineTab') {
      return true;
    }

    return false;
  }, [state]);

  if (shouldHideTabBar) return null;

  const currentRouteName = state.routes[state.index]?.name;
  const activeKey =
    currentRouteName === 'TimelineTab'
      ? 'timeline'
      : currentRouteName === 'MoreTab'
          ? 'more'
          : 'home';

  return <AppNavigationToolbar activeKey={activeKey} />;
}

export default function AppTabsNavigator() {
  const theme = useTheme();
  const moreOpen = useUiStore(s => s.moreDrawerOpen);
  const openMore = useUiStore(s => s.openMoreDrawer);
  const closeMore = useUiStore(s => s.closeMoreDrawer);
  const renderTabBar = useCallback(
    (p: BottomTabBarProps) => <CustomTabBar {...p} />,
    [],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
          }}
          tabBar={renderTabBar}
        >
          <Tab.Screen name="HomeTab" component={MainScreen} />
          <Tab.Screen name="TimelineTab" component={TimelineStackNavigator} />
          <Tab.Screen name="RecordCreateTab" component={RecordCreateScreen} />
          <Tab.Screen
            name="MoreTab"
            component={MoreNull}
            // ✅ Tab.Navigator 기본 동작 방지하려면 listeners도 같이(안전)
            listeners={{
              tabPress: e => {
                e.preventDefault();
                openMore();
              },
            }}
          />
        </Tab.Navigator>

        {/* ✅ Overlay Drawer */}
        <MoreDrawer open={moreOpen} onClose={closeMore} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

```

---

## FILE: `src/navigation/TimelineStackNavigator.tsx`

원본 경로: `src/navigation/TimelineStackNavigator.tsx`

```tsx
// 파일: src/navigation/TimelineStackNavigator.tsx
// 역할:
// - Timeline 탭 내부에서 상세/수정 화면까지 하단 탭을 유지하는 Stack 네비게이터
// - TimelineMain, RecordDetail, RecordEdit 사이의 타입 안전한 라우팅 경계를 제공
// - 타임라인 흐름을 루트 스택과 분리해 화면 전환 책임을 명확히 유지

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TimelineScreen from '../screens/Records/TimelineScreen';
import RecordDetailScreen from '../screens/Records/RecordDetailScreen';
import RecordEditScreen from '../screens/Records/RecordEditScreen';
import type { MemoryOtherSubCategory } from '../services/memories/categoryMeta';

export type TimelineStackParamList = {
  TimelineMain:
    | {
        petId?: string;
        mainCategory?: 'all' | 'walk' | 'meal' | 'health' | 'diary' | 'other';
        otherSubCategory?: MemoryOtherSubCategory;
      }
    | undefined;
  RecordDetail: { petId: string; memoryId: string };
  RecordEdit: { petId: string; memoryId: string };
};

const Stack = createNativeStackNavigator<TimelineStackParamList>();

export default function TimelineStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TimelineMain" component={TimelineScreen} />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="RecordEdit" component={RecordEditScreen} />
    </Stack.Navigator>
  );
}

```

---

## FILE: `src/components/navigation/AppNavigationToolbar.tsx`

원본 경로: `src/components/navigation/AppNavigationToolbar.tsx`

```tsx
// 파일: src/components/navigation/AppNavigationToolbar.tsx
// 파일 목적:
// - 앱 하단 공통 이동 UI를 한 컴포넌트로 유지해 홈/상세/드로어에서 같은 동작을 재사용한다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 커스텀 탭바와 More 드로어/일부 상세 화면 하단 툴바에서 사용된다.
// 핵심 역할:
// - 홈, 타임라인, 기록 작성, 전체메뉴 이동을 제공한다.
// - 현재 선택 펫 테마를 읽어 아이콘과 FAB 강조색을 맞춘다.
// 데이터·상태 흐름:
// - selectedPetId와 pets는 petStore에서 읽고, More 오픈 상태는 uiStore를 사용한다.
// - 기록 작성으로 이동할 때는 현재 activeKey를 기반으로 복귀용 returnTo 파라미터를 만든다.
// 수정 시 주의:
// - activeKey와 returnTo 규칙은 RecordCreateScreen 복귀 흐름과 맞물려 있으므로 함께 봐야 한다.
// - 탭 라벨이나 target route를 바꿀 때는 AppTabsNavigator와 RootNavigator 타입까지 같이 확인해야 한다.

import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type ActiveTabKey = 'home' | 'timeline' | 'record' | 'more';

type Props = {
  activeKey: ActiveTabKey;
  onBeforeNavigate?: () => void;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AppNavigationToolbar({
  activeKey,
  onBeforeNavigate,
}: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const bottomInset = useMemo(
    () => Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10),
    [insets.bottom],
  );
  const recordReturnTo = useMemo(() => {
    switch (activeKey) {
      case 'home':
        return { tab: 'HomeTab' } as const;
      case 'timeline':
        return {
          tab: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all' },
          },
        } as const;
      default:
        return undefined;
    }
  }, [activeKey]);

  const navigateTo = useCallback(
    (target: ActiveTabKey) => {
      onBeforeNavigate?.();

      if (target === 'more') {
        openMoreDrawer();
        return;
      }

      if (target === 'timeline') {
        navigation.navigate('AppTabs', {
          screen: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all' },
          },
        });
        return;
      }

      if (target === 'record') {
        navigation.navigate('AppTabs', {
          screen: 'RecordCreateTab',
          params:
            selectedPet?.id || recordReturnTo
              ? {
                  petId: selectedPet?.id,
                  returnTo: recordReturnTo,
                }
              : undefined,
        });
        return;
      }

      navigation.navigate('AppTabs', {
        screen: 'HomeTab',
      });
    },
    [navigation, onBeforeNavigate, recordReturnTo, selectedPet?.id],
  );

  const tabs = useMemo(
    () => [
      { key: 'home' as const, label: '홈', icon: 'home' },
      { key: 'timeline' as const, label: '타임라인', icon: 'activity' },
      { key: 'more' as const, label: '전체메뉴', icon: 'menu' },
    ],
    [],
  );

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.colors.background },
        { paddingBottom: bottomInset },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {tabs.slice(0, 2).map(tab => {
          const active = activeKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              style={styles.item}
              onPress={() => navigateTo(tab.key)}
            >
              <Feather
                name={tab.icon as never}
                size={18}
                color={active ? petTheme.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textMuted },
                  active ? { color: petTheme.primary } : null,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.92}
          style={[
            styles.recordButton,
            {
              backgroundColor: petTheme.primary,
              borderColor: theme.colors.background,
            },
          ]}
          onPress={() => navigateTo('record')}
        >
          <Feather name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {tabs.slice(2).map(tab => {
          const active = activeKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              style={styles.item}
              onPress={() => navigateTo(tab.key)}
            >
              <Feather
                name={tab.icon as never}
                size={18}
                color={active ? petTheme.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textMuted },
                  active ? { color: petTheme.primary } : null,
                ]}
              >
                {tab.label}
              </Text>
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
  },
  bar: {
    minHeight: 62,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  item: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  label: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '500',
  },
  recordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D6AF8',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginTop: -8,

    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});

```

---

## FILE: `src/components/media/PhotoAddCard.tsx`

원본 경로: `src/components/media/PhotoAddCard.tsx`

```tsx
import React, { memo } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type PhotoAddCardProps = {
  imageUri: string | null;
  onPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  placeholderIconName?: string;
  placeholderIconColor?: string;
  placeholderIconSize?: number;
  placeholderText?: string;
  placeholderTextStyle?: StyleProp<TextStyle>;
  editButtonStyle?: StyleProp<ViewStyle>;
  editIconName?: string;
  editIconSize?: number;
  editIconColor?: string;
  overlayContent?: React.ReactNode;
};

function PhotoAddCardComponent({
  imageUri,
  onPress,
  containerStyle,
  imageStyle,
  placeholderStyle,
  placeholderIconName = 'camera',
  placeholderIconColor = '#8B5CF6',
  placeholderIconSize = 20,
  placeholderText,
  placeholderTextStyle,
  editButtonStyle,
  editIconName = 'edit-3',
  editIconSize = 14,
  editIconColor = '#FFFFFF',
  overlayContent,
}: PhotoAddCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={containerStyle} onPress={onPress}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={imageStyle} />
      ) : (
        <View style={placeholderStyle}>
          <Feather
            color={placeholderIconColor}
            name={placeholderIconName}
            size={placeholderIconSize}
          />
          {placeholderText ? (
            <Text style={placeholderTextStyle}>{placeholderText}</Text>
          ) : null}
        </View>
      )}

      {overlayContent}

      <View style={editButtonStyle}>
        <Feather color={editIconColor} name={editIconName} size={editIconSize} />
      </View>
    </TouchableOpacity>
  );
}

const PhotoAddCard = memo(PhotoAddCardComponent);

export default PhotoAddCard;

```

---

## FILE: `src/components/records/RecordImageGallery.tsx`

원본 경로: `src/components/records/RecordImageGallery.tsx`

```tsx
// 파일: src/components/records/RecordImageGallery.tsx
// 역할:
// - record 생성/수정 화면에서 공통으로 쓰는 이미지 미리보기 프레임을 제공
// - 메인 이미지, 빈 상태, 썸네일 목록, 활성 인덱스 전환을 한 곳에서 관리
// - 액션 위치/버튼 표현은 화면별로 다를 수 있어 render prop으로 주입 가능하게 설계

import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type GalleryItem = {
  key: string;
  uri: string;
};

type RecordImageGalleryProps = {
  items: GalleryItem[];
  activeIndex: number;
  onChangeActiveIndex: (index: number) => void;
  containerStyle: StyleProp<ViewStyle>;
  stageStyle?: StyleProp<ViewStyle>;
  emptyContent: React.ReactNode;
  mainContent: React.ReactNode;
  topOverlay?: React.ReactNode;
  footerActions?: React.ReactNode;
  thumbRowStyle: StyleProp<ViewStyle>;
  thumbItemStyle: StyleProp<ViewStyle>;
  thumbItemActiveStyle?: StyleProp<ViewStyle>;
  thumbImageStyle: StyleProp<ImageStyle>;
  counterText?: string | null;
  counterBadgeStyle?: StyleProp<ViewStyle>;
  counterTextStyle?: StyleProp<TextStyle>;
};

export default function RecordImageGallery({
  items,
  activeIndex,
  onChangeActiveIndex,
  containerStyle,
  stageStyle,
  emptyContent,
  mainContent,
  topOverlay,
  footerActions,
  thumbRowStyle,
  thumbItemStyle,
  thumbItemActiveStyle,
  thumbImageStyle,
  counterText,
  counterBadgeStyle,
  counterTextStyle,
}: RecordImageGalleryProps) {
  return (
    <View style={containerStyle}>
      <View style={[recordImageGalleryStyles.defaultStage, stageStyle]}>
        {items.length === 0 ? emptyContent : mainContent}

        {topOverlay}

        {counterText ? (
          <View style={counterBadgeStyle}>
            <Text style={counterTextStyle}>{counterText}</Text>
          </View>
        ) : null}
      </View>

      {items.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={thumbRowStyle}
        >
          {items.map((item, index) => {
            const active = index === activeIndex;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={[thumbItemStyle, active ? thumbItemActiveStyle : null]}
                onPress={() => onChangeActiveIndex(index)}
              >
                <Image source={{ uri: item.uri }} style={thumbImageStyle} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {footerActions}
    </View>
  );
}

export const recordImageGalleryStyles = StyleSheet.create({
  defaultStage: {
    minHeight: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
});

```

---

## FILE: `src/components/MemoryCard/MemoryCard.tsx`

원본 경로: `src/components/MemoryCard/MemoryCard.tsx`

```tsx
// 파일: src/components/MemoryCard/MemoryCard.tsx
// 역할:
// - memory 단건을 카드 형태로 렌더링하는 공용 프리뷰 컴포넌트
// - signed URL 이미지 로딩, 감정/날짜 요약, 탭 액션 전달을 한 곳에서 담당
// - 타임라인/홈 등 리스트 기반 화면에서 재사용되므로 memo 기반으로 불필요 리렌더링을 줄임

import React, { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import OptimizedImage from '../images/OptimizedImage';
import { useSignedMemoryImage } from '../../hooks/useSignedMemoryImage';
import {
  getTimelinePrimaryMemoryImageSource,
  hasMemoryImage,
} from '../../services/records/imageSources';
import { formatRecordDisplayDate } from '../../services/records/date';
import type { MemoryRecord } from '../../services/supabase/memories';
import type { MemoryImageVariant } from '../../services/supabase/storageMemories';
import AppText from '../../app/ui/AppText';

// ✅ 기존 TimelineScreen.styles 그대로 사용 (UI 유지)
import { styles } from '../../screens/Records/TimelineScreen.styles';

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  excited: '🤩',
  neutral: '🙂',
  sad: '😢',
  anxious: '😥',
  angry: '😠',
  tired: '😴',
};

interface MemoryCardProps {
  item: MemoryRecord;
  onPress: (item: MemoryRecord) => void;
  deferImageLoad?: boolean;
  enableImageLoad?: boolean;
  isFocused?: boolean;
  onFocusedLayout?: (itemId: string, event: LayoutChangeEvent) => void;
  imageVariant?: MemoryImageVariant;
}

function MemoryCardComponent({
  item,
  onPress,
  deferImageLoad = false,
  enableImageLoad = true,
  isFocused = false,
  onFocusedLayout,
  imageVariant,
}: MemoryCardProps) {
  const timelineImage = getTimelinePrimaryMemoryImageSource(item);
  const effectiveVariant = imageVariant ?? timelineImage.variant;
  const { signedUrl } = useSignedMemoryImage(timelineImage.value, {
    enabled: enableImageLoad,
    defer: deferImageLoad,
    delayMs: deferImageLoad ? 220 : 0,
    trackLoading: false,
    variant: effectiveVariant,
  });
  const hasImage = Boolean(timelineImage.value) || hasMemoryImage(item);

  const dateText = useMemo(
    () => formatRecordDisplayDate(item),
    [item],
  );
  const emotionText = useMemo(() => {
    if (!item.emotion) return null;
    return EMOTION_EMOJI[item.emotion] ?? item.emotion;
  }, [item.emotion]);
  const titleText = useMemo(() => {
    const title = item.title?.trim() ?? '';
    if (title) return title;
    const content = item.content?.trim() ?? '';
    if (content) return content;
    return '기록 없음';
  }, [item.content, item.title]);
  const metaText = useMemo(
    () => (emotionText ? `${dateText} · ${emotionText}` : dateText),
    [dateText, emotionText],
  );
  const handlePress = useMemo(() => () => onPress(item), [item, onPress]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!isFocused || !onFocusedLayout) return;
      onFocusedLayout(item.id, event);
    },
    [isFocused, item.id, onFocusedLayout],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.item}
      onPress={handlePress}
      onLayout={isFocused ? handleLayout : undefined}
    >
      <View style={styles.thumb}>
        {hasImage && signedUrl ? (
          <OptimizedImage
            uri={signedUrl}
            style={styles.thumbImg}
            resizeMode="cover"
            priority={deferImageLoad ? 'low' : 'normal'}
          />
        ) : null}
      </View>

      <View style={styles.itemBody}>
        <AppText preset="headline" numberOfLines={1} style={styles.itemTitle}>
          {titleText}
        </AppText>

        <View style={styles.metaRow}>
          <AppText preset="caption" style={styles.metaText}>
            {metaText}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const MemoryCard = memo(
  MemoryCardComponent,
  (prev, next) =>
    prev.item === next.item &&
    prev.onPress === next.onPress &&
    prev.deferImageLoad === next.deferImageLoad &&
    prev.enableImageLoad === next.enableImageLoad &&
    prev.isFocused === next.isFocused &&
    prev.onFocusedLayout === next.onFocusedLayout &&
    prev.imageVariant === next.imageVariant,
);

```

---

## FILE: `src/components/images/OptimizedImage.tsx`

원본 경로: `src/components/images/OptimizedImage.tsx`

```tsx
import React from 'react';
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  Platform,
  type StyleProp,
  UIManager,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import type { ImageStyle as FastImageStyle } from 'react-native-fast-image';

type Props = {
  uri: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  priority?: 'low' | 'normal' | 'high';
  fallback?: boolean;
};

function mapResizeMode(mode: ImageResizeMode | undefined) {
  switch (mode) {
    case 'contain':
      return FastImage.resizeMode.contain;
    case 'stretch':
      return FastImage.resizeMode.stretch;
    case 'center':
      return FastImage.resizeMode.contain;
    default:
      return FastImage.resizeMode.cover;
  }
}

function mapPriority(priority: Props['priority']) {
  switch (priority) {
    case 'high':
      return FastImage.priority.high;
    case 'low':
      return FastImage.priority.low;
    default:
      return FastImage.priority.normal;
  }
}

function isRemoteHttpUri(uri: string) {
  return /^https?:\/\//i.test(`${uri}`.trim());
}

function hasFastImageNativeView() {
  if (Platform.OS === 'android') {
    return Boolean(UIManager.getViewManagerConfig?.('FastImageView'));
  }

  if (Platform.OS === 'ios') {
    return Boolean(UIManager.getViewManagerConfig?.('FastImageView'));
  }

  return false;
}

export function preloadOptimizedImages(uris: ReadonlyArray<string>) {
  if (!hasFastImageNativeView()) return;

  const targets = Array.from(
    new Set((uris ?? []).map(uri => `${uri ?? ''}`.trim()).filter(isRemoteHttpUri)),
  );
  if (targets.length === 0) return;

  FastImage.preload(
    targets.map(uri => ({
      uri,
      priority: FastImage.priority.low,
      cache: FastImage.cacheControl.immutable,
    })),
  );
}

type NativeOptimizedImageRef =
  | React.ComponentRef<typeof Image>
  | React.ComponentRef<typeof FastImage>;

const OptimizedImage = React.forwardRef<NativeOptimizedImageRef, Props>(
  function OptimizedImage(
    {
      uri,
      style,
      resizeMode = 'cover',
      priority = 'normal',
      fallback = false,
    },
    _ref,
  ) {
    if (!uri || fallback || !isRemoteHttpUri(uri) || !hasFastImageNativeView()) {
      return (
        <Image
          source={{ uri }}
          style={style}
          resizeMode={resizeMode}
          fadeDuration={250}
        />
      );
    }
    return (
      <FastImage
        source={{
          uri,
          priority: mapPriority(priority),
          cache: FastImage.cacheControl.immutable,
        }}
        style={style as StyleProp<FastImageStyle>}
        resizeMode={mapResizeMode(resizeMode)}
      />
    );
  },
);

export default OptimizedImage;

```

---

## FILE: `src/hooks/useSignedMemoryImage.ts`

원본 경로: `src/hooks/useSignedMemoryImage.ts`

```ts
// 파일: src/hooks/useSignedMemoryImage.ts
// 역할:
// - memory image storage path를 signed URL로 비동기 변환하는 공용 훅
// - 홈/타임라인/카드에서 동일한 로딩/에러 처리 규칙을 재사용하도록 통일
// - 같은 path에 대한 캐시 함수 호출을 공통화해 중복 effect 코드를 줄임

import { useEffect, useState } from 'react';

import { createLatestRequestController } from '../services/app/async';
import {
  getPrimaryMemoryImageRef,
  isDirectMemoryImageUri,
} from '../services/records/imageSources';
import {
  getMemoryImageSignedUrlCached,
  type MemoryImageVariant,
} from '../services/supabase/storageMemories';

type GlobalWithIdleCallback = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const SIGNED_URL_QUEUE_MAX_CONCURRENCY = 2;
const signedUrlMemoryCache = new Map<string, string>();
const signedUrlHighPriorityQueue: Array<QueueTask> = [];
const signedUrlLowPriorityQueue: Array<QueueTask> = [];
let signedUrlActiveCount = 0;

type QueueTask = {
  cancelled: boolean;
  run: () => Promise<void>;
  onCancel?: () => void;
};

function buildSignedUrlMemoryCacheKey(
  path: string | null | undefined,
  variant: MemoryImageVariant | null | undefined,
) {
  const normalized = `${path ?? ''}`.trim();
  if (!normalized) return null;
  return `${variant ?? 'original'}::${normalized}`;
}

function readSignedUrlMemoryCache(
  path: string | null | undefined,
  variant: MemoryImageVariant | null | undefined,
) {
  const key = buildSignedUrlMemoryCacheKey(path, variant);
  if (!key) return null;
  return signedUrlMemoryCache.get(key) ?? null;
}

function writeSignedUrlMemoryCache(
  path: string | null | undefined,
  url: string | null | undefined,
  variant: MemoryImageVariant | null | undefined,
) {
  const key = buildSignedUrlMemoryCacheKey(path, variant);
  const normalizedUrl = `${url ?? ''}`.trim();
  if (!key || !normalizedUrl) return;
  signedUrlMemoryCache.set(key, normalizedUrl);
}

function pumpSignedUrlQueue() {
  while (signedUrlActiveCount < SIGNED_URL_QUEUE_MAX_CONCURRENCY) {
    const task =
      signedUrlHighPriorityQueue.shift() ?? signedUrlLowPriorityQueue.shift();
    if (!task) return;
    if (task.cancelled) continue;

    signedUrlActiveCount += 1;
    task
      .run()
      .catch(() => {})
      .finally(() => {
        signedUrlActiveCount = Math.max(0, signedUrlActiveCount - 1);
        pumpSignedUrlQueue();
      });
  }
}

function enqueueSignedUrlTask(task: QueueTask, lowPriority: boolean) {
  if (lowPriority) {
    signedUrlLowPriorityQueue.push(task);
  } else {
    signedUrlHighPriorityQueue.push(task);
  }
  pumpSignedUrlQueue();
  return () => {
    task.cancelled = true;
    task.onCancel?.();
  };
}

function scheduleIdleTask(task: () => void) {
  const globalScope = globalThis as GlobalWithIdleCallback;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const handle = globalScope.requestIdleCallback(
      () => {
        task();
      },
      { timeout: 180 },
    );

    return () => {
      if (typeof globalScope.cancelIdleCallback === 'function') {
        globalScope.cancelIdleCallback(handle);
      }
    };
  }

  const timer = setTimeout(task, 48);
  return () => clearTimeout(timer);
}

export function useSignedMemoryImage(
  imagePath: string | null | undefined,
  options?: {
    enabled?: boolean;
    defer?: boolean;
    delayMs?: number;
    trackLoading?: boolean;
    variant?: MemoryImageVariant;
  },
) {
  const imageRef = getPrimaryMemoryImageRef({
    imagePath,
    imagePaths: [],
    imageUrl: null,
  });
  const variant = options?.variant ?? 'original';
  const initialSignedUrl =
    isDirectMemoryImageUri(imageRef)
      ? imageRef
      : readSignedUrlMemoryCache(imageRef, variant);
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(Boolean(initialSignedUrl));
  const enabled = options?.enabled ?? true;
  const defer = options?.defer ?? false;
  const delayMs = options?.delayMs ?? 0;
  const trackLoading = options?.trackLoading ?? true;

  useEffect(() => {
    const request = createLatestRequestController();
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelIdleTask: (() => void) | null = null;
    let cancelQueueTask: (() => void) | null = null;

    async function run() {
      const requestId = request.begin();
      if (request.isCurrent(requestId)) {
        setResolved(false);
      }

      const path = imageRef?.trim() ?? null;
      if (!path) {
        if (request.isCurrent(requestId)) {
          setSignedUrl(null);
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
        return;
      }

      if (isDirectMemoryImageUri(path)) {
        writeSignedUrlMemoryCache(path, path, variant);
        if (request.isCurrent(requestId)) {
          setSignedUrl(path);
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
        return;
      }

      const cachedUrl = readSignedUrlMemoryCache(path, variant);
      if (cachedUrl) {
        if (request.isCurrent(requestId)) {
          setSignedUrl(cachedUrl);
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
        return;
      }

      try {
        if (request.isCurrent(requestId) && trackLoading) setLoading(true);

        await new Promise<void>(resolve => {
          cancelQueueTask = enqueueSignedUrlTask(
            {
              cancelled: false,
              onCancel: () => resolve(),
              run: async () => {
                const url = await getMemoryImageSignedUrlCached(path, { variant });
                if (url) {
                  writeSignedUrlMemoryCache(path, url, variant);
                }

                if (request.isCurrent(requestId)) {
                  setSignedUrl(url ?? null);
                }

                resolve();
              },
            },
            defer,
          );
        });
      } catch {
        if (request.isCurrent(requestId)) {
          setSignedUrl(null);
        }
      } finally {
        if (request.isCurrent(requestId)) {
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
      }
    }

    if (!enabled) {
      const cachedUrl =
        isDirectMemoryImageUri(imageRef)
          ? imageRef
          : readSignedUrlMemoryCache(imageRef, variant);
      setSignedUrl(cachedUrl);
      if (trackLoading) setLoading(false);
      setResolved(Boolean(cachedUrl));
      return () => {
        request.cancel();
      };
    }

    const scheduleRun = () => {
      if (delayMs > 0) {
        delayTimer = setTimeout(() => {
          run();
        }, delayMs);
        return;
      }
      run();
    };

    if (defer) {
      cancelIdleTask = scheduleIdleTask(() => {
        scheduleRun();
      });
    } else {
      scheduleRun();
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      cancelIdleTask?.();
      cancelQueueTask?.();
      request.cancel();
    };
  }, [delayMs, defer, enabled, imageRef, trackLoading, variant]);

  return { signedUrl, loading, resolved };
}

```

---

## FILE: `src/store/recordStore.ts`

원본 경로: `src/store/recordStore.ts`

```ts
// 파일: src/store/recordStore.ts
// 파일 목적:
// - 펫별 기록 리스트와 타임라인 엔티티 캐시를 전역 store로 관리한다.
// 어디서 쓰이는지:
// - 홈, 타임라인, 기록 생성/수정/상세, 업로드 큐 복구 흐름에서 공통으로 사용된다.
// 핵심 역할:
// - petId별 리스트 상태, cursor 기반 페이지네이션, recordsById 엔티티 캐시, 타임라인 전용 ids 상태를 유지한다.
// - 낙관적 추가/수정/삭제와 포커스 복귀용 memory id 관리도 담당한다.
// 데이터·상태 흐름:
// - 실제 데이터 fetch는 `services/supabase/memories.ts`가 담당하고, 이 store는 화면이 재사용할 수 있는 읽기 모델과 상태머신을 유지한다.
// - 이미지 signed URL은 fetch 단계가 아니라 렌더링/프리패치 단계에서 채우도록 분리돼 있다.
// 수정 시 주의:
// - cursor, requestSeq, append 규칙을 바꾸면 중복/순서 꼬임/무한스크롤 회귀가 발생하기 쉽다.
// - 엔티티 캐시와 타임라인 ids는 함께 움직여야 하므로 한쪽만 바꾸는 식의 수정은 피해야 한다.

import { create } from 'zustand';
import { getErrorMessage } from '../services/app/errors';
import { getRecordSortTimestamp } from '../services/records/date';
import { normalizeMemoryRecord } from '../services/records/imageSources';
import { compareTimelineRecords } from '../services/timeline/query';
import type { MemoryRecord } from '../services/supabase/memories';
import {
  encodeMemoriesCursor,
  fetchMemoriesByPetPage,
} from '../services/supabase/memories';

type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

export type PetRecordsState = {
  items: MemoryRecord[];
  status: Status;
  errorMessage: string | null;

  cursor: string | null;
  hasMore: boolean;

  requestSeq: number;
};

export type TimelineRecordsState = {
  ids: string[];
  status: Status;
  errorMessage: string | null;
  cursor: string | null;
  hasMore: boolean;
  requestSeq: number;
  entityVersion: number;
};

type RecordStore = {
  byPetId: Record<string, PetRecordsState>;
  recordsById: Record<string, MemoryRecord>;
  timelineByPetId: Record<string, TimelineRecordsState>;
  focusedMemoryIdByPet: Record<string, string | null>;

  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetRecordsState;
  getTimelineState: (petId: string) => TimelineRecordsState;
  selectLegacyPetRecordsState: (
    petId: string | null | undefined,
  ) => PetRecordsState;
  selectRecordById: (memoryId: string | null | undefined) => MemoryRecord | null;
  selectTimelineIdsByPetId: (
    petId: string | null | undefined,
  ) => string[];
  selectTimelineStatusByPetId: (
    petId: string | null | undefined,
  ) => Status;
  selectTimelineHasMoreByPetId: (
    petId: string | null | undefined,
  ) => boolean;
  selectTimelineEntityVersionByPetId: (
    petId: string | null | undefined,
  ) => number;

  bootstrap: (petId: string) => Promise<void>;
  refresh: (petId: string) => Promise<void>;
  loadMore: (petId: string) => Promise<void>;

  replaceAll: (petId: string, items: MemoryRecord[]) => void;
  upsertOneLocal: (petId: string, item: MemoryRecord) => void;

  updateOneLocal: (
    petId: string,
    memoryId: string,
    patch: Partial<MemoryRecord>,
  ) => void;

  removeOneLocal: (petId: string, memoryId: string) => void;
  setFocusedMemoryId: (petId: string, memoryId: string | null) => void;
  clearFocusedMemoryId: (petId: string) => void;

  clearPet: (petId: string) => void;
  clearAll: () => void;
};

const PAGE_SIZE = 20;

const createInitialPetState = (): PetRecordsState => ({
  items: [],
  status: 'idle',
  errorMessage: null,
  cursor: null,
  hasMore: true,
  requestSeq: 0,
});

const createInitialTimelineState = (): TimelineRecordsState => ({
  ids: [],
  status: 'idle',
  errorMessage: null,
  cursor: null,
  hasMore: true,
  requestSeq: 0,
  entityVersion: 0,
});

// ✅ fallback은 동일 참조 고정
const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);
const FALLBACK_TIMELINE_STATE: TimelineRecordsState = Object.freeze(
  createInitialTimelineState(),
);
const EMPTY_TIMELINE_IDS: string[] = [];
Object.freeze(EMPTY_TIMELINE_IDS);

function sortByDisplayDateDesc(items: MemoryRecord[]) {
  items.sort((a, b) => {
    const diff = getRecordSortTimestamp(b) - getRecordSortTimestamp(a);
    if (diff !== 0) return diff;
    return compareTimelineRecords(a, b);
  });
}

function normalizeRecordItems(items: MemoryRecord[]) {
  return items.map(item => normalizeMemoryRecord(item));
}

function hasOwnKey<T extends object>(value: T, key: keyof MemoryRecord) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deriveTimelineImageFields(
  input: Partial<MemoryRecord>,
): Pick<MemoryRecord, 'timelineImagePath' | 'timelineImageVariant'> {
  const primaryStoragePath =
    input.imagePaths?.find(path => `${path ?? ''}`.trim()) ??
    `${input.imagePath ?? ''}`.trim() ??
    null;
  const directImageUrl = `${input.imageUrl ?? ''}`.trim();

  if (directImageUrl) {
    return {
      timelineImagePath: null,
      timelineImageVariant: null,
    };
  }

  return {
    timelineImagePath: primaryStoragePath || null,
    timelineImageVariant: primaryStoragePath ? 'timeline-thumb' : null,
  };
}

function withNormalizedTimelineFields<T extends Partial<MemoryRecord>>(input: T): T {
  const hasTimelineFields =
    hasOwnKey(input, 'timelineImagePath') || hasOwnKey(input, 'timelineImageVariant');
  if (hasTimelineFields) return input;

  const hasImageFields =
    hasOwnKey(input, 'imagePath') ||
    hasOwnKey(input, 'imagePaths') ||
    hasOwnKey(input, 'imageUrl');
  if (!hasImageFields) return input;

  return {
    ...input,
    ...deriveTimelineImageFields(input),
  };
}

function upsertRecordEntities(
  prev: Record<string, MemoryRecord>,
  items: MemoryRecord[],
) {
  if (items.length === 0) return prev;

  const next = { ...prev };
  for (const item of items) {
    next[item.id] = item;
  }
  return next;
}

function toTimelineState(petState: PetRecordsState): TimelineRecordsState {
  return {
    ids: petState.items.map(item => item.id),
    status: petState.status,
    errorMessage: petState.errorMessage,
    cursor: petState.cursor,
    hasMore: petState.hasMore,
    requestSeq: petState.requestSeq,
    entityVersion: 0,
  };
}

function buildPetStateFromTimeline(
  timelineState: TimelineRecordsState,
  recordsById: Record<string, MemoryRecord>,
): PetRecordsState {
  return {
    items: timelineState.ids
      .map(id => recordsById[id])
      .filter((item): item is MemoryRecord => Boolean(item)),
    status: timelineState.status,
    errorMessage: timelineState.errorMessage,
    cursor: timelineState.cursor,
    hasMore: timelineState.hasMore,
    requestSeq: timelineState.requestSeq,
  };
}

function sortTimelineIdsByDisplayDateDesc(
  ids: string[],
  recordsById: Record<string, MemoryRecord>,
) {
  ids.sort((a, b) => {
    const left = recordsById[a];
    const right = recordsById[b];
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    const diff = getRecordSortTimestamp(right) - getRecordSortTimestamp(left);
    if (diff !== 0) return diff;
    return compareTimelineRecords(left, right);
  });
}

function getNextCursorFromTimelineIds(
  ids: string[],
  recordsById: Record<string, MemoryRecord>,
) {
  const items = ids
    .map(id => recordsById[id])
    .filter((item): item is MemoryRecord => Boolean(item));
  return getNextCursorFromItems(items);
}

function removeRecordEntityById(
  prev: Record<string, MemoryRecord>,
  memoryId: string,
) {
  if (!memoryId || !prev[memoryId]) return prev;
  const next = { ...prev };
  delete next[memoryId];
  return next;
}

function getNextCursorFromItems(items: MemoryRecord[]): string | null {
  if (items.length === 0) return null;
  const last = items[items.length - 1] ?? null;
  if (!last) return null;
  return encodeMemoriesCursor(last.createdAt, last.id);
}

/**
 * ✅ 커서 기반 loadMore 최적화
 * - prev: 최신→오래된
 * - nextPage: 더 오래된
 * - 정렬 없이 append, 중복 id만 제거
 */
function appendPageUniqueById(prev: MemoryRecord[], nextPage: MemoryRecord[]) {
  if (nextPage.length === 0) return prev;

  const seen = new Set<string>();
  for (const it of prev) seen.add(it.id);

  const append: MemoryRecord[] = [];
  for (const it of nextPage) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    append.push(it);
  }

  if (append.length === 0) return prev;
  return prev.concat(append);
}

export const useRecordStore = create<RecordStore>((set, get) => ({
  byPetId: {},
  recordsById: {},
  timelineByPetId: {},
  focusedMemoryIdByPet: {},

  ensurePetState: petId => {
    if (!petId) return;
    const cur = get().byPetId[petId];
    if (cur) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: createInitialPetState(),
      },
      timelineByPetId: {
        ...s.timelineByPetId,
        [petId]: createInitialTimelineState(),
      },
    }));
  },

  getPetState: petId => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

  getTimelineState: petId => {
    if (!petId) return FALLBACK_TIMELINE_STATE;
    return get().timelineByPetId[petId] ?? FALLBACK_TIMELINE_STATE;
  },

  selectLegacyPetRecordsState: petId => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

  selectRecordById: memoryId => {
    if (!memoryId) return null;

    const state = get();
    const entity = state.recordsById[memoryId];
    if (entity) return entity;

    for (const petState of Object.values(state.byPetId)) {
      const hit = petState.items.find(item => item.id === memoryId);
      if (hit) return hit;
    }

    return null;
  },

  selectTimelineIdsByPetId: petId => {
    if (!petId) return EMPTY_TIMELINE_IDS;

    const state = get();
    const timelineIds = state.timelineByPetId[petId]?.ids;
    if (timelineIds) return timelineIds;
    return state.byPetId[petId]?.items.map(item => item.id) ?? EMPTY_TIMELINE_IDS;
  },

  selectTimelineStatusByPetId: petId => {
    if (!petId) return 'idle';
    return get().timelineByPetId[petId]?.status ?? get().byPetId[petId]?.status ?? 'idle';
  },

  selectTimelineHasMoreByPetId: petId => {
    if (!petId) return false;
    return get().timelineByPetId[petId]?.hasMore ?? get().byPetId[petId]?.hasMore ?? false;
  },

  selectTimelineEntityVersionByPetId: petId => {
    if (!petId) return 0;
    return get().timelineByPetId[petId]?.entityVersion ?? 0;
  },

  // ---------------------------------------------------------
  // 최초 로딩
  // ---------------------------------------------------------
  bootstrap: async petId => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (st.status === 'ready' && st.items.length > 0) return;

    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    ) {
      return;
    }

    const req = st.requestSeq + 1;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'loading',
          errorMessage: null,
          requestSeq: req,
        },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: null,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        const items = normalizeRecordItems([...page.items]);
        sortByDisplayDateDesc(items);
        const nextPetState: PetRecordsState = {
          ...cur,
          items,
          status: 'ready',
          errorMessage: null,
          cursor: page.nextCursor,
          hasMore: page.hasMore,
        };

        return {
          recordsById: upsertRecordEntities(s.recordsById, items),
          byPetId: {
            ...s.byPetId,
            [petId]: nextPetState,
          },
          timelineByPetId: {
            ...s.timelineByPetId,
            [petId]: {
              ...toTimelineState(nextPetState),
              entityVersion:
                (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
            },
          },
        };
      });
    } catch (error: unknown) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'error',
              errorMessage: getErrorMessage(error) || '불러오기 실패',
            },
          },
        };
      });
    }
  },

  // ---------------------------------------------------------
  // 새로고침(커서 리셋)
  // ---------------------------------------------------------
  refresh: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (st.status === 'refreshing') return;

    const req = st.requestSeq + 1;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'refreshing',
          errorMessage: null,
          requestSeq: req,
        },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: null,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        const items = normalizeRecordItems([...page.items]);
        sortByDisplayDateDesc(items);
        const nextPetState: PetRecordsState = {
          ...cur,
          items,
          status: 'ready',
          errorMessage: null,
          cursor: page.nextCursor,
          hasMore: page.hasMore,
        };

        return {
          recordsById: upsertRecordEntities(s.recordsById, items),
          byPetId: {
            ...s.byPetId,
            [petId]: nextPetState,
          },
          timelineByPetId: {
            ...s.timelineByPetId,
            [petId]: {
              ...toTimelineState(nextPetState),
              entityVersion:
                (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
            },
          },
        };
      });
    } catch (error: unknown) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'error',
              errorMessage: getErrorMessage(error) || '새로고침 실패',
            },
          },
        };
      });
    }
  },

  // ---------------------------------------------------------
  // 더 불러오기(커서 기반) ✅ 최적화
  // ---------------------------------------------------------
  loadMore: async petId => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (!st.hasMore) return;

    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    ) {
      return;
    }

    const req = st.requestSeq;
    const cursorSnapshot = st.cursor;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'loadingMore',
          errorMessage: null,
        },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: cursorSnapshot,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];
        if (!cur) return s;
        if (cur.requestSeq !== req) return s;

        const nextPage = normalizeRecordItems(page.items);
        sortByDisplayDateDesc(nextPage);
        const nextItems = appendPageUniqueById(cur.items, nextPage);
        const nextPetState: PetRecordsState = {
          ...cur,
          items: nextItems,
          status: 'ready',
          errorMessage: null,
          cursor: page.nextCursor,
          hasMore: page.hasMore,
        };

        return {
          recordsById: upsertRecordEntities(s.recordsById, nextItems),
          byPetId: {
            ...s.byPetId,
            [petId]: nextPetState,
          },
          timelineByPetId: {
            ...s.timelineByPetId,
            [petId]: {
              ...toTimelineState(nextPetState),
              entityVersion:
                (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
            },
          },
        };
      });
    } catch (error: unknown) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'ready',
              errorMessage: getErrorMessage(error) || '더 불러오기 실패',
            },
          },
        };
      });
    }
  },

  // ---------------------------------------------------------
  // write helpers
  // ---------------------------------------------------------
  replaceAll: (petId, items) => {
    if (!petId) return;
    get().ensurePetState(petId);

    const next = normalizeRecordItems([...items]);
    sortByDisplayDateDesc(next);

    set(s => ({
      recordsById: upsertRecordEntities(s.recordsById, next),
      byPetId: {
        ...s.byPetId,
        [petId]: {
          items: next,
          status: 'ready',
          errorMessage: null,
          cursor: getNextCursorFromItems(next),
          hasMore: next.length >= PAGE_SIZE,
          requestSeq: s.byPetId[petId]?.requestSeq ?? 0,
        },
      },
      timelineByPetId: {
        ...s.timelineByPetId,
        [petId]: {
          ids: next.map(item => item.id),
          status: 'ready',
          errorMessage: null,
          cursor: getNextCursorFromItems(next),
          hasMore: next.length >= PAGE_SIZE,
          requestSeq: s.timelineByPetId[petId]?.requestSeq ?? 0,
          entityVersion: (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
        },
      },
    }));
  },

  upsertOneLocal: (petId, item) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const normalizedItem = normalizeMemoryRecord(
        withNormalizedTimelineFields(item),
      );
      const nextRecordsById = upsertRecordEntities(s.recordsById, [normalizedItem]);
      const curTimeline =
        s.timelineByPetId[petId] ?? createInitialTimelineState();
      const nextIds = curTimeline.ids.filter(id => id !== normalizedItem.id);
      nextIds.unshift(normalizedItem.id);
      sortTimelineIdsByDisplayDateDesc(nextIds, nextRecordsById);

      const nextTimelineState: TimelineRecordsState = {
        ...curTimeline,
        ids: nextIds,
        status: 'ready',
        cursor: getNextCursorFromTimelineIds(nextIds, nextRecordsById),
        entityVersion: curTimeline.entityVersion + 1,
      };
      const nextPetState = buildPetStateFromTimeline(
        nextTimelineState,
        nextRecordsById,
      );

      return {
        recordsById: nextRecordsById,
        byPetId: {
          ...s.byPetId,
          [petId]: nextPetState,
        },
        timelineByPetId: {
          ...s.timelineByPetId,
          [petId]: nextTimelineState,
        },
      };
    });
  },

  updateOneLocal: (petId, memoryId, patch) => {
    if (!petId || !memoryId) return;
    get().ensurePetState(petId);

    set(s => {
      const current =
        s.recordsById[memoryId] ??
        s.byPetId[petId]?.items.find(item => item.id === memoryId);
      if (!current) return s;

      const nextRecord = normalizeMemoryRecord({
        ...current,
        ...patch,
        ...withNormalizedTimelineFields(patch),
      });
      const nextRecordsById = upsertRecordEntities(s.recordsById, [nextRecord]);
      const curTimeline =
        s.timelineByPetId[petId] ?? createInitialTimelineState();
      const nextIds = curTimeline.ids.includes(memoryId)
        ? [...curTimeline.ids]
        : [memoryId, ...curTimeline.ids];
      sortTimelineIdsByDisplayDateDesc(nextIds, nextRecordsById);

      const nextTimelineState: TimelineRecordsState = {
        ...curTimeline,
        ids: nextIds,
        status: 'ready',
        cursor: getNextCursorFromTimelineIds(nextIds, nextRecordsById),
        entityVersion: curTimeline.entityVersion + 1,
      };
      const nextPetState = buildPetStateFromTimeline(
        nextTimelineState,
        nextRecordsById,
      );

      return {
        recordsById: nextRecordsById,
        byPetId: {
          ...s.byPetId,
          [petId]: nextPetState,
        },
        timelineByPetId: {
          ...s.timelineByPetId,
          [petId]: nextTimelineState,
        },
      };
    });
  },

  removeOneLocal: (petId, memoryId) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const nextRecordsById = removeRecordEntityById(s.recordsById, memoryId);
      const curTimeline =
        s.timelineByPetId[petId] ?? createInitialTimelineState();
      const nextIds = curTimeline.ids.filter(id => id !== memoryId);
      const nextTimelineState: TimelineRecordsState = {
        ...curTimeline,
        ids: nextIds,
        status: 'ready',
        cursor: getNextCursorFromTimelineIds(nextIds, nextRecordsById),
        entityVersion: curTimeline.entityVersion + 1,
      };
      const nextPetState = buildPetStateFromTimeline(
        nextTimelineState,
        nextRecordsById,
      );

      return {
        recordsById: nextRecordsById,
        byPetId: {
          ...s.byPetId,
          [petId]: nextPetState,
        },
        timelineByPetId: {
          ...s.timelineByPetId,
          [petId]: nextTimelineState,
        },
      };
    });
  },

  setFocusedMemoryId: (petId, memoryId) => {
    if (!petId) return;
    set(s => ({
      focusedMemoryIdByPet: {
        ...s.focusedMemoryIdByPet,
        [petId]: memoryId,
      },
    }));
  },

  clearFocusedMemoryId: petId => {
    if (!petId) return;
    set(s => ({
      focusedMemoryIdByPet: {
        ...s.focusedMemoryIdByPet,
        [petId]: null,
      },
    }));
  },

  // ---------------------------------------------------------
  // clear
  // ---------------------------------------------------------
  clearPet: petId => {
    if (!petId) return;
    set(s => {
      const next = { ...s.byPetId };
      const nextTimeline = { ...s.timelineByPetId };
      const nextFocused = { ...s.focusedMemoryIdByPet };
      delete next[petId];
      delete nextTimeline[petId];
      delete nextFocused[petId];
      return {
        byPetId: next,
        timelineByPetId: nextTimeline,
        focusedMemoryIdByPet: nextFocused,
      };
    });
  },

  clearAll: () =>
    set({
      byPetId: {},
      recordsById: {},
      timelineByPetId: {},
      focusedMemoryIdByPet: {},
    }),
}));

```

---

## FILE: `src/services/memories/categoryMeta.ts`

원본 경로: `src/services/memories/categoryMeta.ts`

```ts
// 파일: src/services/memories/categoryMeta.ts
// 역할:
// - memory category/subcategory를 화면 공통 기준으로 정규화
// - 타임라인 필터와 홈 카드가 같은 카테고리 해석 규칙을 공유하도록 보장
// - 레이블/아이콘/색상 메타를 한 곳에서 관리해 화면별 분기 중복을 줄임

import type { MemoryRecord } from '../supabase/memories';

export type MemoryMainCategory =
  | 'all'
  | 'walk'
  | 'meal'
  | 'health'
  | 'diary'
  | 'other';

export type MemoryOtherSubCategory =
  | 'grooming'
  | 'hospital'
  | 'indoor'
  | 'training'
  | 'outing'
  | 'shopping'
  | 'bathing'
  | 'etc';

export type MemoryCategoryMeta = {
  label: string;
  icon: string;
  tint: string;
  mainCategory: Exclude<MemoryMainCategory, 'all'>;
  otherSubCategory?: MemoryOtherSubCategory;
};

export const MAIN_CATEGORY_OPTIONS: Array<{
  key: MemoryMainCategory;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'walk', label: '산책' },
  { key: 'meal', label: '식사' },
  { key: 'health', label: '건강' },
  { key: 'diary', label: '일기장' },
  { key: 'other', label: '생활' },
];

export const OTHER_SUBCATEGORY_OPTIONS: Array<{
  key: MemoryOtherSubCategory;
  label: string;
}> = [
  { key: 'grooming', label: '미용' },
  { key: 'hospital', label: '병원/약' },
  { key: 'indoor', label: '실내 놀이' },
  { key: 'training', label: '교육/훈련' },
  { key: 'outing', label: '외출/여행' },
  { key: 'shopping', label: '용품/쇼핑' },
  { key: 'bathing', label: '목욕/위생' },
  { key: 'etc', label: '기타' },
];

function readRecordTagsRaw(record: MemoryRecord): string {
  if (!Array.isArray(record.tags) || record.tags.length === 0) return '';
  return record.tags.join(' ').trim();
}

function readLegacyStringField(
  record: MemoryRecord,
  keys: readonly string[],
): string {
  const source = record as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }

  return '';
}

export function readRecordCategoryRaw(record: MemoryRecord): string {
  const normalized = readLegacyStringField(record, [
    'category',
    'type',
    'kind',
    'recordType',
    'mainCategory',
    'categoryKey',
  ]);
  if (normalized) return normalized;
  return readRecordTagsRaw(record);
}

export function normalizeCategoryKey(raw: string): MemoryMainCategory {
  const value = raw.trim().toLowerCase();
  if (!value) return 'all';

  if (value === 'walk' || value === 'stroll') return 'walk';
  if (value === 'meal' || value === 'food' || value === 'feed') return 'meal';
  if (value === 'health' || value === 'medical') return 'health';
  if (value === 'diary' || value === 'journal') return 'diary';
  if (value === 'other' || value === 'etc') return 'other';

  if (value.includes('산책')) return 'walk';
  if (value.includes('식사') || value.includes('간식')) return 'meal';
  if (value.includes('일기')) return 'diary';
  if (value.includes('기타') || value.includes('미용')) return 'other';
  if (value.includes('건강')) return 'health';
  if (value.includes('병원') || value.includes('약')) {
    return value.includes('기타') ? 'other' : 'health';
  }

  return 'other';
}

export function readOtherSubCategoryRaw(record: MemoryRecord): string {
  const normalized = readLegacyStringField(record, [
    'subCategory',
    'subcategory',
    'sub_type',
    'detailCategory',
    'otherSubCategory',
  ]);
  if (normalized) return normalized;
  return readRecordTagsRaw(record);
}

export function normalizeOtherSubKey(raw: string): MemoryOtherSubCategory {
  const value = raw.trim().toLowerCase();
  if (!value) return 'etc';

  if (value === 'grooming') return 'grooming';
  if (value === 'hospital' || value === 'medicine' || value === 'clinic') {
    return 'hospital';
  }
  if (value === 'indoor' || value === 'indoorplay') return 'indoor';
  if (value === 'training' || value === 'lesson') return 'training';
  if (value === 'outing' || value === 'travel') return 'outing';
  if (value === 'shopping' || value === 'goods') return 'shopping';
  if (value === 'bathing' || value === 'bath' || value === 'hygiene') {
    return 'bathing';
  }
  if (value.includes('미용')) return 'grooming';
  if (value.includes('병원') || value.includes('약')) return 'hospital';
  if (value.includes('실내') || value.includes('놀이')) return 'indoor';
  if (value.includes('훈련') || value.includes('교육')) return 'training';
  if (value.includes('외출') || value.includes('여행')) return 'outing';
  if (value.includes('쇼핑') || value.includes('용품')) return 'shopping';
  if (value.includes('목욕') || value.includes('위생')) return 'bathing';

  return 'etc';
}

export function getRecordCategoryMeta(
  record: MemoryRecord,
): MemoryCategoryMeta {
  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));

  if (mainCategory === 'walk') {
    return {
      label: '산책 기록',
      icon: 'walk',
      tint: 'rgba(109,106,248,0.10)',
      mainCategory: 'walk',
    };
  }

  if (mainCategory === 'meal') {
    return {
      label: '식사 기록',
      icon: 'silverware-fork-knife',
      tint: 'rgba(249,115,22,0.10)',
      mainCategory: 'meal',
    };
  }

  if (mainCategory === 'health') {
    return {
      label: '건강 기록',
      icon: 'medical-bag',
      tint: 'rgba(34,197,94,0.10)',
      mainCategory: 'health',
    };
  }

  if (mainCategory === 'diary') {
    return {
      label: '일기장',
      icon: 'notebook-outline',
      tint: 'rgba(59,130,246,0.10)',
      mainCategory: 'diary',
    };
  }

  const otherSubCategory = normalizeOtherSubKey(
    readOtherSubCategoryRaw(record),
  );

  if (otherSubCategory === 'grooming') {
    return {
      label: '기타 · 미용',
      icon: 'content-cut',
      tint: 'rgba(236,72,153,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'hospital') {
    return {
      label: '기타 · 병원/약',
      icon: 'medical-bag',
      tint: 'rgba(34,197,94,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'indoor') {
    return {
      label: '기타 · 실내 놀이',
      icon: 'home-heart',
      tint: 'rgba(109,106,248,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'training') {
    return {
      label: '기타 · 교육/훈련',
      icon: 'school-outline',
      tint: 'rgba(59,130,246,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'outing') {
    return {
      label: '기타 · 외출/여행',
      icon: 'map-marker-path',
      tint: 'rgba(249,115,22,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'shopping') {
    return {
      label: '기타 · 용품/쇼핑',
      icon: 'shopping-outline',
      tint: 'rgba(168,85,247,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'bathing') {
    return {
      label: '기타 · 목욕/위생',
      icon: 'shower',
      tint: 'rgba(14,165,233,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  return {
    label: '기타',
    icon: 'dots-horizontal-circle-outline',
    tint: 'rgba(148,163,184,0.10)',
    mainCategory: 'other',
    otherSubCategory: 'etc',
  };
}

```

---

## FILE: `src/services/timeline/heatmap.ts`

원본 경로: `src/services/timeline/heatmap.ts`

```ts
// 파일: src/services/timeline/heatmap.ts
// 역할:
// - 타임라인 캘린더 히트맵용 날짜 집계 로직
// - 최근 n주 기준으로 날짜별 기록 수와 강도를 계산

import type { MemoryRecord } from '../supabase/memories';
import {
  addDaysToYmd,
  getKstYmd,
  getMonthKeyFromYmd,
  getStartOfWeekYmd,
} from '../../utils/date';
import { getRecordDisplayYmd } from '../records/date';

export type TimelineHeatmapCell = {
  key: string;
  ymd: string;
  label: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type TimelineHeatmapWeek = {
  key: string;
  cells: TimelineHeatmapCell[];
};

function getIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export function buildTimelineHeatmap(
  records: MemoryRecord[],
  weeks = 12,
  now = new Date(),
): TimelineHeatmapWeek[] {
  const safeWeeks = Math.max(4, Math.min(20, weeks));
  const todayYmd = getKstYmd(now);
  const currentMonthKey = getMonthKeyFromYmd(todayYmd);

  const dateCounts = new Map<string, number>();
  for (const record of records) {
    const ymd = getRecordDisplayYmd(record);
    if (!ymd) continue;
    dateCounts.set(ymd, (dateCounts.get(ymd) ?? 0) + 1);
  }

  const currentWeekStartYmd = getStartOfWeekYmd(todayYmd, {
    weekStartsOn: 1,
  });
  const startYmd = addDaysToYmd(
    currentWeekStartYmd,
    -(safeWeeks - 1) * 7,
  );
  if (!currentWeekStartYmd || !startYmd) return [];

  const weeksOutput: TimelineHeatmapWeek[] = [];
  let cursorYmd = startYmd;

  for (let weekIndex = 0; weekIndex < safeWeeks; weekIndex += 1) {
    const cells: TimelineHeatmapCell[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const ymd = addDaysToYmd(cursorYmd, dayIndex);
      if (!ymd) continue;
      const count = dateCounts.get(ymd) ?? 0;
      const month = Number(ymd.slice(5, 7));
      const day = Number(ymd.slice(8, 10));

      cells.push({
        key: `${cursorYmd}:${dayIndex}`,
        ymd,
        label: `${month}/${day}`,
        count,
        intensity: getIntensity(count),
        isCurrentMonth: getMonthKeyFromYmd(ymd) === currentMonthKey,
        isToday: ymd === todayYmd,
      });
    }

    weeksOutput.push({
      key: cursorYmd,
      cells,
    });

    const nextCursorYmd = addDaysToYmd(cursorYmd, 7);
    if (!nextCursorYmd) break;
    cursorYmd = nextCursorYmd;
  }

  return weeksOutput;
}

```

---

## FILE: `src/services/timeline/query.ts`

원본 경로: `src/services/timeline/query.ts`

```ts
import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../memories/categoryMeta';
import { humanizeMonthKey } from '../../utils/date';
import { getRecordDisplayYmd, getRecordMonthKey } from '../records/date';
import type { MemoryRecord } from '../supabase/memories';

export type TimelineSortMode = 'recent' | 'oldest';

export type TimelineFilterInput = {
  ymFilter: string | null;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
  query: string;
  sortMode: TimelineSortMode;
};

type TimelineRecordMeta = {
  signature: string;
  monthKey: string | null;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
  queryText: string;
};

const timelineRecordMetaCache = new Map<string, TimelineRecordMeta>();

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeString(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

export function getTimelineRecordYmd(item: MemoryRecord): string {
  return getRecordDisplayYmd(item) ?? '';
}

export function getTimelineMonthKeyFromYmd(ymd: string): string | null {
  return isYmd(ymd) ? ymd.slice(0, 7) : null;
}

export function getTimelineMonthKey(item: MemoryRecord): string | null {
  return getRecordMonthKey(item);
}

export function humanizeTimelineMonthKey(ym: string) {
  return humanizeMonthKey(ym);
}

export function normalizeTimelineQuery(value: string) {
  return normalizeString(value).toLowerCase();
}

function buildTimelineRecordSignature(record: MemoryRecord) {
  return [
    record.createdAt ?? '',
    getTimelineRecordYmd(record),
    normalizeString(record.title),
    Array.isArray(record.tags) ? record.tags.join('|') : '',
    readRecordCategoryRaw(record) ?? '',
    readOtherSubCategoryRaw(record) ?? '',
  ].join('::');
}

function getTimelineRecordMeta(record: MemoryRecord): TimelineRecordMeta {
  const signature = buildTimelineRecordSignature(record);
  const cached = timelineRecordMetaCache.get(record.id);
  if (cached && cached.signature === signature) {
    return cached;
  }

  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
  const otherSubCategory =
    mainCategory === 'other'
      ? normalizeOtherSubKey(readOtherSubCategoryRaw(record))
      : null;
  const queryText = [
    normalizeString(record.title),
    Array.isArray(record.tags) ? record.tags.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const next: TimelineRecordMeta = {
    signature,
    monthKey: getTimelineMonthKey(record),
    mainCategory,
    otherSubCategory,
    queryText,
  };
  timelineRecordMetaCache.set(record.id, next);
  return next;
}

export function compareTimelineRecords(a: MemoryRecord, b: MemoryRecord) {
  const aYmd = getTimelineRecordYmd(a);
  const bYmd = getTimelineRecordYmd(b);

  if (aYmd !== bYmd) return aYmd < bYmd ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function dedupeTimelineRecords(items: ReadonlyArray<MemoryRecord>) {
  const seen = new Set<string>();
  const next: MemoryRecord[] = [];

  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }

  return next;
}

export function timelineRecordMatchesQuery(record: MemoryRecord, query: string) {
  if (!query) return true;
  const normalizedQuery = normalizeTimelineQuery(query);
  if (!normalizedQuery) return true;

  return getTimelineRecordMeta(record).queryText.includes(normalizedQuery);
}

export function timelineRecordMatchesFilters(
  record: MemoryRecord,
  filters: Omit<TimelineFilterInput, 'sortMode'>,
) {
  const meta = getTimelineRecordMeta(record);

  if (filters.ymFilter && meta.monthKey !== filters.ymFilter) {
    return false;
  }

  if (filters.mainCategory !== 'all') {
    if (filters.mainCategory !== 'other') {
      if (meta.mainCategory !== filters.mainCategory) return false;
    } else {
      if (meta.mainCategory !== 'other') return false;
      if (filters.otherSubCategory) {
        if (meta.otherSubCategory !== filters.otherSubCategory) return false;
      }
    }
  }

  if (!filters.query) return true;
  return meta.queryText.includes(filters.query);
}

export function buildTimelineView(input:
  | {
      ids: ReadonlyArray<string>;
      recordsById: Readonly<Record<string, MemoryRecord>>;
      filters: TimelineFilterInput;
    }
  | {
      items: ReadonlyArray<MemoryRecord>;
      filters: TimelineFilterInput;
    },
) {
  const recordsById =
    'recordsById' in input
      ? input.recordsById
      : Object.fromEntries(input.items.map(item => [item.id, item]));
  const ids =
    'ids' in input ? input.ids : dedupeTimelineRecords(input.items).map(item => item.id);
  const availableMonthKeys: string[] = [];
  const seenMonthKeys = new Set<string>();
  const filteredIds: string[] = [];
  const firstIndexByMonth = new Map<string, number>();
  const normalizedQuery = normalizeTimelineQuery(input.filters.query);
  const filtersWithoutSort = {
    ...input.filters,
    query: normalizedQuery,
  };

  for (const id of ids) {
    const record = recordsById[id];
    if (!record) continue;

    const meta = getTimelineRecordMeta(record);
    if (meta.monthKey && !seenMonthKeys.has(meta.monthKey)) {
      seenMonthKeys.add(meta.monthKey);
      availableMonthKeys.push(meta.monthKey);
    }

    if (!timelineRecordMatchesFilters(record, filtersWithoutSort)) {
      continue;
    }

    filteredIds.push(id);
  }

  if (input.filters.sortMode === 'oldest') {
    filteredIds.reverse();
  }

  filteredIds.forEach((id, index) => {
    const monthKey = recordsById[id]
      ? getTimelineRecordMeta(recordsById[id]).monthKey
      : null;
    if (!monthKey || firstIndexByMonth.has(monthKey)) return;
    firstIndexByMonth.set(monthKey, index);
  });

  const baseItems = ids
    .map(id => recordsById[id])
    .filter((item): item is MemoryRecord => Boolean(item));
  const filteredItems = filteredIds
    .map(id => recordsById[id])
    .filter((item): item is MemoryRecord => Boolean(item));

  return {
    baseItems,
    availableMonthKeys,
    filteredItems,
    filteredIds,
    firstIndexByMonth,
  };
}

export function shouldAutoLoadMoreTimeline(input: {
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error';
  hasMore: boolean;
  query: string;
  pendingJumpMonth: string | null;
  ymFilter: string | null;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
}) {
  if (input.status !== 'ready') return false;
  if (!input.hasMore) return false;
  if (normalizeTimelineQuery(input.query)) return false;
  if (input.pendingJumpMonth) return false;
  if (input.ymFilter) return false;
  if (input.mainCategory !== 'all') return false;
  if (input.otherSubCategory) return false;
  return true;
}

```

---

## FILE: `src/services/local/recordDraft.ts`

원본 경로: `src/services/local/recordDraft.ts`

```ts
// 파일: src/services/local/recordDraft.ts
// 역할:
// - RecordCreate 작성 중 상태를 AsyncStorage에 저장/복원
// - 앱 종료나 탭 이탈 후에도 작성 중인 기록을 되살리는 draft 레이어

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PickedRecordImage,
  RecordMainCategoryKey,
  RecordOtherSubCategoryKey,
} from '../records/form';
import type { EmotionTag } from '../supabase/memories';

const RECORD_DRAFT_STORAGE_KEY = 'nuri.record-create-draft.v1';

export type RecordCreateDraft = {
  petId: string | null;
  title: string;
  content: string;
  occurredAt: string;
  selectedTags: string[];
  mainCategoryKey: RecordMainCategoryKey;
  otherSubCategoryKey: RecordOtherSubCategoryKey | null;
  priceText?: string;
  selectedEmotion: EmotionTag | null;
  selectedImages: PickedRecordImage[];
  updatedAt: string;
};

export async function saveRecordCreateDraft(
  draft: RecordCreateDraft,
): Promise<void> {
  await AsyncStorage.setItem(RECORD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export async function loadRecordCreateDraft(): Promise<RecordCreateDraft | null> {
  const raw = await AsyncStorage.getItem(RECORD_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RecordCreateDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearRecordCreateDraft(): Promise<void> {
  await AsyncStorage.removeItem(RECORD_DRAFT_STORAGE_KEY);
}

```

---

## FILE: `src/services/local/uploadQueue.ts`

원본 경로: `src/services/local/uploadQueue.ts`

```ts
// 파일: src/services/local/uploadQueue.ts
// 역할:
// - memory 이미지 업로드 실패분을 로컬 큐에 적재
// - 앱 시작/포그라운드 복귀 시 재시도해서 기록과 이미지를 나중에 정합화

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureMonitoringException,
  captureMonitoringMessage,
} from '../monitoring/sentry';
import { fetchMemoryById, updateMemoryImagePaths } from '../supabase/memories';
import { supabase } from '../supabase/client';
import {
  deleteMemoryImage,
  uploadMemoryImage,
} from '../supabase/storageMemories';

const MEMORY_UPLOAD_QUEUE_STORAGE_KEY = 'nuri.memory-upload-queue.v1';
const MAX_ATTEMPTS = 5;
let processingPromise: Promise<ProcessPendingMemoryUploadsResult> | null = null;
const claimedTaskIds = new Set<string>();

class SupersededMemoryUploadTaskError extends Error {
  constructor() {
    super('최신 이미지 저장 계획으로 교체되어 기존 업로드 작업을 중단합니다.');
    this.name = 'SupersededMemoryUploadTaskError';
  }
}

export type PendingMemoryUploadImage = {
  key: string;
  uri: string;
  mimeType: string | null;
};

export type PendingMemoryUploadEntry =
  | {
      kind: 'existing';
      path: string;
    }
  | ({
      kind: 'pending';
    } & PendingMemoryUploadImage);

export type PendingMemoryUploadTask = {
  taskId: string;
  userId: string;
  petId: string;
  memoryId: string;
  mode: 'create' | 'edit';
  finalEntries: PendingMemoryUploadEntry[];
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastErrorMessage?: string | null;
};

type ProcessPendingMemoryUploadsResult = {
  processed: number;
  succeeded: number;
  failed: number;
  touchedPetIds: string[];
  succeededTaskIds: string[];
  failedTaskIds: string[];
};

type LegacyPendingMemoryUploadTask = Omit<
  PendingMemoryUploadTask,
  'mode' | 'finalEntries'
> & {
  images?: PendingMemoryUploadImage[];
  finalEntries?: PendingMemoryUploadEntry[];
  mode?: 'create' | 'edit';
};

function normalizeString(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

function normalizePendingEntry(
  entry: PendingMemoryUploadEntry | PendingMemoryUploadImage | null | undefined,
): PendingMemoryUploadEntry | null {
  if (!entry || typeof entry !== 'object') return null;

  if ('kind' in entry && entry.kind === 'existing') {
    const path = normalizeString(entry.path);
    if (!path) return null;
    return { kind: 'existing', path };
  }

  const key = normalizeString('key' in entry ? entry.key : '');
  const uri = normalizeString('uri' in entry ? entry.uri : '');
  if (!key || !uri) return null;

  return {
    kind: 'pending',
    key,
    uri,
    mimeType:
      'mimeType' in entry ? normalizeString(entry.mimeType) || null : null,
  };
}

function normalizeTask(
  task: LegacyPendingMemoryUploadTask | null | undefined,
): PendingMemoryUploadTask | null {
  if (!task || typeof task !== 'object') return null;

  const taskId = normalizeString(task.taskId);
  const userId = normalizeString(task.userId);
  const petId = normalizeString(task.petId);
  const memoryId = normalizeString(task.memoryId);
  if (!taskId || !userId || !petId || !memoryId) return null;

  const rawEntries = Array.isArray(task.finalEntries)
    ? task.finalEntries
    : Array.isArray(task.images)
      ? task.images
      : [];
  const finalEntries = rawEntries
    .map(normalizePendingEntry)
    .filter((entry): entry is PendingMemoryUploadEntry => Boolean(entry));

  return {
    taskId,
    userId,
    petId,
    memoryId,
    mode: task.mode === 'edit' ? 'edit' : 'create',
    finalEntries,
    attempts: Math.max(0, Number(task.attempts ?? 0)),
    createdAt: normalizeString(task.createdAt) || new Date().toISOString(),
    updatedAt: normalizeString(task.updatedAt) || new Date().toISOString(),
    lastErrorMessage: normalizeString(task.lastErrorMessage) || null,
  };
}

async function loadQueue(): Promise<PendingMemoryUploadTask[]> {
  const raw = await AsyncStorage.getItem(MEMORY_UPLOAD_QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeTask)
      .filter((task): task is PendingMemoryUploadTask => Boolean(task));
  } catch {
    return [];
  }
}

async function saveQueue(tasks: PendingMemoryUploadTask[]): Promise<void> {
  await AsyncStorage.setItem(
    MEMORY_UPLOAD_QUEUE_STORAGE_KEY,
    JSON.stringify(tasks),
  );
}

export async function enqueuePendingMemoryUpload(
  input: Omit<
    PendingMemoryUploadTask,
    'taskId' | 'attempts' | 'createdAt' | 'updatedAt' | 'lastErrorMessage'
  >,
): Promise<PendingMemoryUploadTask> {
  const current = await loadQueue();
  const now = new Date().toISOString();

  const nextTask: PendingMemoryUploadTask = {
    taskId: `${input.memoryId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    userId: input.userId,
    petId: input.petId,
    memoryId: input.memoryId,
    mode: input.mode,
    finalEntries: input.finalEntries.map(entry => ({ ...entry })),
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    lastErrorMessage: null,
  };

  const nextQueue = current.filter(task => {
    if (task.memoryId !== input.memoryId) return true;
    return claimedTaskIds.has(task.taskId);
  });
  await saveQueue([...nextQueue, nextTask]);
  return nextTask;
}

export async function getPendingMemoryUploadCount(): Promise<number> {
  const current = await loadQueue();
  return current.length;
}

async function removeTask(taskId: string): Promise<void> {
  const current = await loadQueue();
  await saveQueue(current.filter(task => task.taskId !== taskId));
}

async function updateTask(taskId: string, updater: (task: PendingMemoryUploadTask) => PendingMemoryUploadTask | null) {
  const current = await loadQueue();
  let changed = false;
  const next = current.flatMap(task => {
    if (task.taskId !== taskId) return [task];
    changed = true;
    const updated = updater(task);
    return updated ? [updated] : [];
  });
  if (changed) {
    await saveQueue(next);
  }
}

function isMemoryNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message ?? '') : '';
  const code = 'code' in error ? String(error.code ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const joined = `${code} ${message} ${details}`.toLowerCase();
  return (
    joined.includes('pgrst116') ||
    joined.includes('json object requested') ||
    joined.includes('0 rows')
  );
}

function isSupersededTaskError(error: unknown) {
  return error instanceof SupersededMemoryUploadTaskError;
}

function findLatestTaskForMemory(
  queue: PendingMemoryUploadTask[],
  memoryId: string,
) {
  return queue
    .filter(task => task.memoryId === memoryId)
    .sort((a, b) => {
      const updatedDiff = a.updatedAt.localeCompare(b.updatedAt);
      if (updatedDiff !== 0) return updatedDiff;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .at(-1) ?? null;
}

async function assertTaskNotSuperseded(task: PendingMemoryUploadTask) {
  const queue = await loadQueue();
  const latestTask = findLatestTaskForMemory(queue, task.memoryId);
  if (!latestTask) return;
  if (latestTask.taskId === task.taskId) return;
  throw new SupersededMemoryUploadTaskError();
}

async function processTask(task: PendingMemoryUploadTask): Promise<void> {
  await assertTaskNotSuperseded(task);
  await fetchMemoryById(task.memoryId);

  const uploadedPathsByKey = new Map<string, string>();
  const uploadedNewPaths: string[] = [];

  try {
    for (const entry of task.finalEntries) {
      if (entry.kind !== 'pending') continue;
      await assertTaskNotSuperseded(task);

      const uploaded = await uploadMemoryImage({
        userId: task.userId,
        petId: task.petId,
        memoryId: task.memoryId,
        fileUri: entry.uri,
        mimeType: entry.mimeType,
      });
      uploadedPathsByKey.set(entry.key, uploaded.path);
      uploadedNewPaths.push(uploaded.path);
    }
  } catch (error) {
    await Promise.all(
      uploadedNewPaths.map(path => deleteMemoryImage(path).catch(() => null)),
    );
    throw error;
  }

  const finalPaths = task.finalEntries.flatMap(entry => {
    if (entry.kind === 'existing') {
      const path = normalizeString(entry.path);
      return path ? [path] : [];
    }

    const uploadedPath = normalizeString(uploadedPathsByKey.get(entry.key));
    return uploadedPath ? [uploadedPath] : [];
  });

  try {
    await assertTaskNotSuperseded(task);
    await updateMemoryImagePaths({
      memoryId: task.memoryId,
      imagePaths: finalPaths,
    });
  } catch (error) {
    await Promise.all(
      uploadedNewPaths.map(path => deleteMemoryImage(path).catch(() => null)),
    );
    throw error;
  }
}

function pickNextTask(queue: PendingMemoryUploadTask[]) {
  return [...queue]
    .filter(task => !claimedTaskIds.has(task.taskId))
    .sort((a, b) => {
      const updatedDiff = b.updatedAt.localeCompare(a.updatedAt);
      if (updatedDiff !== 0) return updatedDiff;
      return b.createdAt.localeCompare(a.createdAt);
    })[0] ?? null;
}

async function resolveActiveQueueUserId(userId?: string | null) {
  const normalizedUserId = normalizeString(userId);
  if (normalizedUserId) return normalizedUserId;

  const { data } = await supabase.auth.getUser();
  return normalizeString(data.user?.id) || null;
}

function pickNextTaskForUser(
  queue: PendingMemoryUploadTask[],
  userId: string,
) {
  return pickNextTask(queue.filter(task => task.userId === userId));
}

export async function processPendingMemoryUploads(input?: {
  userId?: string | null;
}): Promise<ProcessPendingMemoryUploadsResult> {
  const activeUserId = await resolveActiveQueueUserId(input?.userId);
  if (!activeUserId) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      touchedPetIds: [],
      succeededTaskIds: [],
      failedTaskIds: [],
    };
  }

  if (processingPromise) {
    await processingPromise;
    const remainingQueue = await loadQueue();
    if (pickNextTaskForUser(remainingQueue, activeUserId)) {
      return processPendingMemoryUploads({ userId: activeUserId });
    }
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      touchedPetIds: [],
      succeededTaskIds: [],
      failedTaskIds: [],
    };
  }

  processingPromise = (async () => {
    const touchedPetIds = new Set<string>();
    const succeededTaskIds: string[] = [];
    const failedTaskIds: string[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    while (true) {
      const latestActiveUserId = await resolveActiveQueueUserId(activeUserId);
      if (latestActiveUserId !== activeUserId) {
        break;
      }

      const queue = await loadQueue();
      const task = pickNextTaskForUser(queue, activeUserId);
      if (!task) break;

      claimedTaskIds.add(task.taskId);
      processed += 1;

      try {
        await processTask(task);
        await removeTask(task.taskId);
        touchedPetIds.add(task.petId);
        succeeded += 1;
        succeededTaskIds.push(task.taskId);
        if (task.attempts > 0) {
          captureMonitoringMessage('memory_upload_queue_recovered', {
            tags: {
              mode: task.mode,
              attempts: task.attempts,
            },
            extras: {
              taskId: task.taskId,
              memoryId: task.memoryId,
              petId: task.petId,
            },
          });
        }
      } catch (error: unknown) {
        if (isSupersededTaskError(error)) {
          await removeTask(task.taskId);
          continue;
        }

        captureMonitoringException(error);

        if (isMemoryNotFoundError(error)) {
          await removeTask(task.taskId);
        } else {
          const attempts = task.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await removeTask(task.taskId);
          } else {
            await updateTask(task.taskId, currentTask => ({
              ...currentTask,
              attempts,
              updatedAt: new Date().toISOString(),
              lastErrorMessage:
                error instanceof Error && error.message.trim()
                  ? error.message
                  : '이미지 업로드 재시도 대기',
            }));
          }
        }

        failed += 1;
        failedTaskIds.push(task.taskId);
      } finally {
        claimedTaskIds.delete(task.taskId);
      }
    }

    return {
      processed,
      succeeded,
      failed,
      touchedPetIds: Array.from(touchedPetIds),
      succeededTaskIds,
      failedTaskIds,
    };
  })();

  try {
    return await processingPromise;
  } finally {
    processingPromise = null;
  }
}

```

---

## FILE: `src/services/supabase/storageMemories.ts`

원본 경로: `src/services/supabase/storageMemories.ts`

```ts
// 파일: src/services/supabase/storageMemories.ts
// 목적:
// - memory-images 버킷의 signed URL 생성 + TTL 캐싱(핵심)
// - 동일 imagePath 반복 요청 시 네트워크 재호출 방지
// - 대량 리스트(타임라인) 성능 최적화
// - ✅ memory-images 업로드(uploadMemoryImage) 포함(RecordCreate/RecordEdit에서 사용)
//
// ✅ 캐싱/성능 규칙
// 1) key = imagePath(= storage path)
// 2) TTL 캐시 + 만료 60초 전 갱신(버퍼)
// 3) LRU(maxSize)로 캐시 메모리 상한 고정
// 4) inFlight dedupe: 동일 path 동시 요청은 1번만 네트워크 호출
// 5) prefetch: 상단 N개만, 캐시 히트는 스킵, 실패는 무시
// 6) ✅ prefetch rate-limit(minIntervalMs) + concurrency 제한으로 "잔여 버벅임" 제거

import { Buffer } from 'buffer';
import RNBlobUtil from 'react-native-blob-util';
import { readFileAsBase64 } from '../files/readFileAsBase64';
import { isDirectMemoryImageUri } from '../records/imageSources';
import { supabase } from './client';

type CacheEntry = {
  url: string;
  expiresAtMs: number;
  touchedAtMs: number; // LRU
};

export type MemoryImageVariant = 'original' | 'timeline-thumb';

type MemoryImageTransformOptions = {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string>>();

const DEFAULT_EXPIRES_IN_SEC = 60 * 30; // 30분
const REFRESH_BUFFER_MS = 60 * 1000; // 만료 60초 전부터 갱신
const DEFAULT_MAX_CACHE_SIZE = 350;

const PREFETCH_MIN_INTERVAL_MS = 180; // 180ms (220~260 조정 가능)
const PREFETCH_MAX_CONCURRENCY = 2; // 2~3 권장

// ---------------------------------------------------------
// internal helpers
// ---------------------------------------------------------
function nowMs() {
  return Date.now();
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function normalizePath(p: string | null | undefined) {
  return (p ?? '').trim();
}

function resolveVariantTransform(
  variant: MemoryImageVariant | null | undefined,
): MemoryImageTransformOptions | null {
  switch (variant) {
    case 'timeline-thumb':
      return {
        width: 144,
        height: 144,
        resize: 'cover',
        quality: 72,
      };
    default:
      return null;
  }
}

function buildCacheKey(path: string, variant: MemoryImageVariant | null | undefined) {
  const normalizedVariant = variant ?? 'original';
  return `${normalizedVariant}::${path}`;
}

function touch(key: string) {
  const hit = cache.get(key);
  if (!hit) return;
  hit.touchedAtMs = nowMs();
  cache.set(key, hit);
}

function pruneLRU(maxSize = DEFAULT_MAX_CACHE_SIZE) {
  if (cache.size <= maxSize) return;

  const entries = Array.from(cache.entries());
  entries.sort((a, b) => a[1].touchedAtMs - b[1].touchedAtMs);

  const removeCount = cache.size - maxSize;
  for (let i = 0; i < removeCount; i += 1) {
    const k = entries[i]?.[0];
    if (k) cache.delete(k);
  }
}

function isFreshEnough(entry: CacheEntry, bufferMs = REFRESH_BUFFER_MS) {
  return entry.expiresAtMs - nowMs() > bufferMs;
}

function normalizeFileUri(uri: string) {
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
}

function inferExtFromMime(mimeType: string | null) {
  const mt = (mimeType ?? '').toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  if (mt.includes('heic') || mt.includes('heif')) return 'heic';
  return 'jpg';
}

// ---------------------------------------------------------
// 1) low-level: create signed url
// ---------------------------------------------------------
export async function getMemoryImageSignedUrl(
  imagePath: string,
  options?: {
    expiresInSec?: number;
    variant?: MemoryImageVariant;
  },
): Promise<string> {
  const path = normalizePath(imagePath);
  if (!path) throw new Error('imagePath is required');

  const expiresInSec = options?.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const transform = resolveVariantTransform(options?.variant);

  const { data, error } = await supabase.storage
    .from('memory-images')
    .createSignedUrl(path, expiresInSec, transform ? { transform } : undefined);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signedUrl is empty');

  return data.signedUrl;
}

// ---------------------------------------------------------
// 2) cached: TTL + LRU + inFlight dedupe
// ---------------------------------------------------------
export async function getMemoryImageSignedUrlCached(
  imagePath: string | null | undefined,
  options?: {
    expiresInSec?: number;
    maxCacheSize?: number;
    refreshBufferMs?: number;
    variant?: MemoryImageVariant;
  },
): Promise<string | null> {
  const path = normalizePath(imagePath);
  if (!path) return null;
  if (isDirectMemoryImageUri(path)) return path;

  const maxCacheSize = options?.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
  const refreshBufferMs = options?.refreshBufferMs ?? REFRESH_BUFFER_MS;
  const expiresInSec = options?.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const cacheKey = buildCacheKey(path, options?.variant);

  // 1) cache hit
  const hit = cache.get(cacheKey);
  if (hit && isFreshEnough(hit, refreshBufferMs)) {
    touch(cacheKey);
    return hit.url;
  }

  // 2) inFlight dedupe
  const inflight = inFlight.get(cacheKey);
  if (inflight) return inflight.then(u => u).catch(() => null);

  // 3) fetch & store
  const promise = (async () => {
    const url = await getMemoryImageSignedUrl(path, {
      expiresInSec,
      variant: options?.variant,
    });

    const t = nowMs();
    cache.set(cacheKey, {
      url,
      expiresAtMs: t + expiresInSec * 1000,
      touchedAtMs: t,
    });

    pruneLRU(maxCacheSize);
    return url;
  })();

  inFlight.set(cacheKey, promise);

  try {
    const url = await promise;
    return url;
  } catch {
    return null;
  } finally {
    inFlight.delete(cacheKey);
  }
}

export async function getMemoryImageSignedUrlsCached(
  imagePaths: Array<string | null | undefined>,
  options?: {
    expiresInSec?: number;
    maxCacheSize?: number;
    refreshBufferMs?: number;
    variant?: MemoryImageVariant;
  },
): Promise<Array<string | null>> {
  const normalizedPaths = (imagePaths ?? []).map(normalizePath);
  if (normalizedPaths.length === 0) return [];

  const storagePaths = Array.from(
    new Set(
      normalizedPaths.filter(
        (path): path is string => Boolean(path) && !isDirectMemoryImageUri(path),
      ),
    ),
  );

  const signedEntries = await Promise.all(
    storagePaths.map(async path => {
      const signedUrl = await getMemoryImageSignedUrlCached(path, options);
      return [path, signedUrl] as const;
    }),
  );
  const signedByPath = new Map(signedEntries);

  return normalizedPaths.map(path => {
    if (!path) return null;
    if (isDirectMemoryImageUri(path)) return path;
    return signedByPath.get(path) ?? null;
  });
}

// ---------------------------------------------------------
// 3) prefetch: rate-limited + concurrency-limited
// ---------------------------------------------------------
export async function prefetchMemorySignedUrls(input: {
  imagePaths: Array<string | null | undefined>;
  max?: number;
  expiresInSec?: number;
  maxCacheSize?: number;
  refreshBufferMs?: number;
  variant?: MemoryImageVariant;

  minIntervalMs?: number;
  maxConcurrency?: number;
}) {
  const max = input.max ?? 10;
  const expiresInSec = input.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const maxCacheSize = input.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
  const refreshBufferMs = input.refreshBufferMs ?? REFRESH_BUFFER_MS;

  // ✅ “실제로 쓰는” 구조 (unused 에러 방지)
  const minIntervalMs = input.minIntervalMs ?? PREFETCH_MIN_INTERVAL_MS;
  const effectiveMinIntervalMs = Math.max(60, Math.min(300, minIntervalMs));

  const maxConcurrency = input.maxConcurrency ?? PREFETCH_MAX_CONCURRENCY;
  const effectiveConcurrency = Math.max(1, Math.min(3, maxConcurrency));

  const unique = Array.from(
    new Set((input.imagePaths ?? []).map(normalizePath).filter(Boolean)),
  ).slice(0, max);

  if (unique.length === 0) return;

  const targets = unique.filter(p => {
    const hit = cache.get(buildCacheKey(p, input.variant));
    if (!hit) return true;
    return !isFreshEnough(hit, refreshBufferMs);
  });

  if (targets.length === 0) return;

  let cursor = 0;

  const worker = async () => {
    let lastIssuedAt = 0;

    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= targets.length) break;

      const path = targets[i];
      if (!path) continue;

      const now = nowMs();
      const since = now - lastIssuedAt;
      if (since < effectiveMinIntervalMs) {
        await sleep(effectiveMinIntervalMs - since);
      }
      lastIssuedAt = nowMs();

      await getMemoryImageSignedUrlCached(path, {
        expiresInSec,
        maxCacheSize,
        refreshBufferMs,
        variant: input.variant,
      }).catch(() => null);
    }
  };

  await Promise.all(
    Array.from({ length: effectiveConcurrency }, () => worker()),
  );
}

export function clearMemorySignedUrlCache() {
  cache.clear();
  inFlight.clear();
}

export function getMemorySignedUrlCacheSize() {
  return cache.size;
}

// ---------------------------------------------------------
// 4) upload: memory-images 업로드
// ---------------------------------------------------------
// 파일: src/services/supabase/storageMemories.ts

type UploadMemoryImageParams = {
  userId: string;
  petId: string;
  memoryId: string;
  fileUri: string;
  mimeType: string | null;
};

export async function uploadMemoryImage({
  userId,
  petId,
  memoryId,
  fileUri,
  mimeType,
}: UploadMemoryImageParams): Promise<{ path: string }> {
  const ext = inferExtFromMime(mimeType);

  // ✅ 핵심: 매번 새로운 path (타임스탬프 + 랜덤)로 충돌 방지
  const version = Date.now();
  const nonce = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${petId}/${memoryId}_${version}_${nonce}.${ext}`;

  const filePath = normalizeFileUri(fileUri);
  const base64 = filePath.startsWith('content://')
    ? await readFileAsBase64(filePath)
    : await RNBlobUtil.fs.readFile(filePath, 'base64');
  const bytes = Buffer.from(base64, 'base64');

  // ✅ upsert=false (같은 path를 덮어쓰지 않음)
  const { error } = await supabase.storage
    .from('memory-images')
    .upload(path, bytes, {
      contentType: mimeType ?? 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  return { path };
}

// ---------------------------------------------------------
// 5) delete: memory-images 파일 삭제 (+ 캐시 정리)
// ---------------------------------------------------------
export async function deleteMemoryImage(imagePath: string) {
  const path = normalizePath(imagePath);
  if (!path) return;

  const { error } = await supabase.storage.from('memory-images').remove([path]);
  if (error) throw error;

  cache.delete(buildCacheKey(path, 'original'));
  cache.delete(buildCacheKey(path, 'timeline-thumb'));
  inFlight.delete(buildCacheKey(path, 'original'));
  inFlight.delete(buildCacheKey(path, 'timeline-thumb'));
}

```

---

## FILE: `src/services/supabase/memories.ts`

원본 경로: `src/services/supabase/memories.ts`

```ts
// 파일: src/services/supabase/memories.ts
// 파일 목적:
// - 기록 도메인의 Supabase CRUD와 이미지 메타 정규화를 담당하는 핵심 서비스다.
// 어디서 쓰이는지:
// - recordStore, RecordCreate/Edit/Detail 화면, 업로드 큐, 홈/타임라인 보조 로직에서 공통으로 사용된다.
// 핵심 역할:
// - 메모리 생성/수정/삭제, 단건/목록 조회, cursor 페이지네이션, 이미지 path 정리, 레거시 필드 호환을 처리한다.
// - 리스트 fetch에서는 signed URL 생성을 분리해 UI block을 줄이고, 필요한 곳에서 prefetch만 수행한다.
// 데이터·상태 흐름:
// - DB 원본 row를 내부 `MemoryRecord`로 정규화해 store와 화면이 같은 모델을 공유하게 만든다.
// - 이미지 원본은 storage path 기준으로 다루고, signed URL은 렌더링 직전 계층에서 채우는 구조다.
// 수정 시 주의:
// - `memory_images`와 legacy `image_url/image_urls` 호환을 동시에 다루고 있어, 한쪽 규칙만 바꾸면 기존 데이터가 깨질 수 있다.
// - pagination cursor와 삭제 시 storage 정리 흐름은 타임라인/상세/업로드 큐가 같이 의존하므로 회귀 검증이 필수다.

import { supabase } from './client';
import {
  deleteMemoryImage,
  prefetchMemorySignedUrls,
  type MemoryImageVariant,
} from './storageMemories';
import {
  captureMonitoringException,
  captureMonitoringMessage,
} from '../monitoring/sentry';
import { normalizeMemoryRecord } from '../records/imageSources';

export type EmotionTag =
  | 'happy'
  | 'calm'
  | 'excited'
  | 'neutral'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'tired';

export type MemoryRecord = {
  id: string;
  petId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags: string[];
  category?: string | null;
  subCategory?: string | null;
  price?: number | null;
  occurredAt?: string | null;
  createdAt: string;

  /**
   * ✅ signed url(캐싱 적용)
   * - 리스트 fetch 단계에서 생성하지 않는다(=UI block 제거)
   * - 렌더링 레이어에서 getMemoryImageSignedUrlCached로 채우거나,
   *   prefetch로 캐시를 먼저 데워서 빠르게 얻도록 한다.
   */
  imageUrl?: string | null;

  /** ✅ storage path (DB에 저장된 값) */
  imagePath?: string | null;
  /** ✅ 다중 이미지 path (첫번째는 imagePath와 동일) */
  imagePaths: string[];
  /** ✅ 타임라인 카드가 우선 사용할 대표 이미지 path */
  timelineImagePath?: string | null;
  /** ✅ timelineImagePath 해석 방식 */
  timelineImageVariant?: MemoryImageVariant | null;
};

type MemoriesRow = {
  id: string;
  pet_id: string;
  image_url: string | null; // storage path
  image_urls?: string[] | null;
  title: string;
  content: string | null;
  emotion: EmotionTag | null;
  tags: string[] | null;
  category?: string | null;
  sub_category?: string | null;
  price?: number | null;
  occurred_at: string | null;
  created_at: string;
};

type InsertedMemoryIdRow = {
  id: string;
};

type MemoryImageRow = {
  memory_id: string;
  sort_order: number;
  original_path: string;
  timeline_thumb_path: string | null;
  status: 'pending' | 'ready' | 'failed';
};

type LegacyMemoryImageState = {
  imageUrl: string | null;
  imageUrls: string[];
  mode: 'multi' | 'single_fallback';
};

type MemoryImagesReadFailureReason = 'runtime_read_failure' | 'schema_fallback';

type LegacyReadFallbackReason =
  | MemoryImagesReadFailureReason
  | 'recent_create_gap'
  | 'legacy_only_row';

type MemoryImagesFetchResult = {
  grouped: Map<string, MemoryImageRow[]>;
  readFailureReason: MemoryImagesReadFailureReason | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMemoryImageStatus(value: unknown): value is MemoryImageRow['status'] {
  return value === 'pending' || value === 'ready' || value === 'failed';
}

function isMemoryImageRow(value: unknown): value is MemoryImageRow {
  return (
    isRecord(value) &&
    typeof value.memory_id === 'string' &&
    typeof value.sort_order === 'number' &&
    typeof value.original_path === 'string' &&
    (typeof value.timeline_thumb_path === 'string' ||
      value.timeline_thumb_path === null) &&
    isMemoryImageStatus(value.status)
  );
}

function isMemoriesRow(value: unknown): value is MemoriesRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.pet_id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.created_at === 'string'
  );
}

function isInsertedMemoryIdRow(value: unknown): value is InsertedMemoryIdRow {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0;
}

function toMemoryImageRows(data: unknown): MemoryImageRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isMemoryImageRow);
}

function toMemoriesRows(data: unknown): MemoriesRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isMemoriesRow);
}

function normalizePathValue(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

function dedupeOrderedPaths(paths: Array<string | null | undefined>) {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const value of paths) {
    const normalized = normalizePathValue(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

function isMemoryImagesSchemaFallbackError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const code = 'code' in error ? String(error.code ?? '') : '';
  const joined = `${code} ${message} ${details}`.toLowerCase();
  return (
    joined.includes('memory_images') &&
    (joined.includes('column') ||
      joined.includes('relation') ||
      joined.includes('schema cache') ||
      joined.includes('does not exist') ||
      joined.includes('pgrst'))
  );
}

async function fetchMemoryImagesByMemoryIds(
  memoryIds: string[],
): Promise<MemoryImagesFetchResult> {
  const normalizedIds = Array.from(
    new Set((memoryIds ?? []).map(id => `${id ?? ''}`.trim()).filter(Boolean)),
  );
  if (normalizedIds.length === 0) {
    return {
      grouped: new Map<string, MemoryImageRow[]>(),
      readFailureReason: null,
    };
  }

  const { data, error } = await supabase
    .from('memory_images')
    .select(
      'memory_id,sort_order,original_path,timeline_thumb_path,status',
    )
    .in('memory_id', normalizedIds)
    .order('memory_id', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    const reason: MemoryImagesReadFailureReason =
      isMemoryImagesSchemaFallbackError(error)
        ? 'schema_fallback'
        : 'runtime_read_failure';
    console.warn('[memories] memory_images fallback to legacy fields', {
      message: error.message,
    });
    captureMonitoringMessage('memory_images_read_fallback', {
      level: 'warning',
      tags: {
        reason,
      },
      extras: {
        memoryIdsCount: normalizedIds.length,
        message: error.message,
      },
    });
    return {
      grouped: new Map<string, MemoryImageRow[]>(),
      readFailureReason: reason,
    };
  }

  const grouped = new Map<string, MemoryImageRow[]>();
  for (const row of toMemoryImageRows(data)) {
    const memoryId = `${row.memory_id ?? ''}`.trim();
    if (!memoryId) continue;
    const current = grouped.get(memoryId) ?? [];
    current.push(row);
    grouped.set(memoryId, current);
  }

  return {
    grouped,
    readFailureReason: null,
  };
}

async function fetchMemoryImagesSnapshot(memoryId: string) {
  const { data, error } = await supabase
    .from('memory_images')
    .select(
      'memory_id,sort_order,original_path,timeline_thumb_path,status',
    )
    .eq('memory_id', memoryId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return toMemoryImageRows(data);
}

// ---------------------------------------------------------
// cursor helpers (✅ createdAt + id 고정)
// ---------------------------------------------------------
const CURSOR_SEP = '__';

export function encodeMemoriesCursor(createdAt: string, id: string) {
  return `${createdAt}${CURSOR_SEP}${id}`;
}

function decodeCursor(cursor: string) {
  const raw = (cursor ?? '').trim();
  const idx = raw.lastIndexOf(CURSOR_SEP);
  if (idx <= 0) return null;

  const createdAt = raw.slice(0, idx).trim();
  const id = raw.slice(idx + CURSOR_SEP.length).trim();
  if (!createdAt || !id) return null;

  return { createdAt, id };
}

/**
 * ✅ mapRow는 동기 변환만 수행
 * - signed URL fetch 절대 금지(리스트 fetch 경로에서 JS thread spike 유발)
 */
function normalizeImagePaths(row: MemoriesRow) {
  const list = Array.isArray(row.image_urls)
    ? row.image_urls
        .map(path => `${path ?? ''}`.trim())
        .filter(Boolean)
    : [];

  if (list.length) return Array.from(new Set(list));

  const single = `${row.image_url ?? ''}`.trim();
  return single ? [single] : [];
}

function isLikelyRecentCreateGap(createdAt: string | null | undefined) {
  const timestamp = Date.parse(`${createdAt ?? ''}`);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= 10 * 60 * 1000;
}

function resolveRecordImages(
  row: MemoriesRow,
  memoryImages?: MemoryImageRow[],
  readFailureReason?: MemoryImagesReadFailureReason | null,
) {
  const legacyPaths = normalizeImagePaths(row);
  const orderedMemoryImages = (memoryImages ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const originalPaths = dedupeOrderedPaths(
    orderedMemoryImages.map(image => image.original_path),
  );
  const resolvedOriginalPaths =
    originalPaths.length > 0 ? originalPaths : legacyPaths;
  const primaryOriginalPath = resolvedOriginalPaths[0] ?? null;
  const readyThumbPath =
    orderedMemoryImages
      .filter(image => image.status === 'ready')
      .map(image => normalizePathValue(image.timeline_thumb_path))
      .find(Boolean) ?? null;

  const timelineImagePath = readyThumbPath ?? primaryOriginalPath;
  const timelineImageVariant: MemoryImageVariant | null = readyThumbPath
    ? 'timeline-thumb'
    : timelineImagePath
      ? 'original'
      : null;

  const fallbackReason: LegacyReadFallbackReason | null =
    originalPaths.length > 0 || legacyPaths.length === 0
      ? null
      : readFailureReason
        ? readFailureReason
        : isLikelyRecentCreateGap(row.created_at)
          ? 'recent_create_gap'
          : 'legacy_only_row';

  return {
    imagePath: primaryOriginalPath,
    imagePaths: resolvedOriginalPaths,
    timelineImagePath,
    timelineImageVariant,
    fallbackReason,
  };
}

function mapRowWithResolution(
  row: MemoriesRow,
  memoryImages?: MemoryImageRow[],
  readFailureReason?: MemoryImagesReadFailureReason | null,
) {
  const imageState = resolveRecordImages(row, memoryImages, readFailureReason);
  return {
    record: normalizeMemoryRecord({
      id: row.id,
      petId: row.pet_id,
      title: row.title,
      content: row.content,
      emotion: row.emotion,
      tags: row.tags ?? [],
      category: row.category ?? null,
      subCategory: row.sub_category ?? null,
      price: typeof row.price === 'number' ? row.price : null,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,

      // ✅ 리스트 fetch 단계에서는 signed url을 넣지 않는다.
      imageUrl: null,
      imagePath: imageState.imagePath,
      imagePaths: imageState.imagePaths,
      timelineImagePath: imageState.timelineImagePath,
      timelineImageVariant: imageState.timelineImageVariant,
    }),
    fallbackReason: imageState.fallbackReason,
  };
}

function logLegacyReadFallbackUsage(input: {
  source: 'fetch_one' | 'fetch_list';
  petId?: string | null;
  memoryId?: string | null;
  counts: Partial<Record<LegacyReadFallbackReason, number>>;
}) {
  for (const [reason, count] of Object.entries(input.counts) as Array<
    [LegacyReadFallbackReason, number | undefined]
  >) {
    if (!count) continue;
    captureMonitoringMessage('memory_images_legacy_read_used', {
      level: reason === 'runtime_read_failure' ? 'warning' : 'info',
      tags: {
        reason,
        source: input.source,
      },
      extras: {
        count,
        petId: input.petId ?? null,
        memoryId: input.memoryId ?? null,
      },
    });
  }
}

function buildLegacyFallbackCounts(
  reasons: Array<LegacyReadFallbackReason | null | undefined>,
) {
  return reasons.reduce<Partial<Record<LegacyReadFallbackReason, number>>>(
    (acc, reason) => {
      if (!reason) return acc;
      acc[reason] = (acc[reason] ?? 0) + 1;
      return acc;
    },
    {},
  );
}

export type FetchMemoriesPageResult = {
  items: MemoryRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

function scheduleAfterInteractions(work: () => Promise<void>) {
  const run = () => {
    work().catch(() => null);
  };

  const idleScheduler = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void) => number;
  };

  if (typeof idleScheduler.requestIdleCallback === 'function') {
    idleScheduler.requestIdleCallback(() => run());
    return;
  }

  setTimeout(run, 0);
}

/* ---------------------------------------------------------
 * 0) Read one
 * - 단건도 path만 내려주고
 * - prefetch는 idle 타이밍에 캐시 워밍(옵션)
 * -------------------------------------------------------- */
export async function fetchMemoryById(memoryId: string): Promise<MemoryRecord> {
  const [{ data, error }, memoryImagesResult] = await Promise.all([
    supabase
      .from('memories')
      .select('*')
      .eq('id', memoryId)
      .single(),
    fetchMemoryImagesByMemoryIds([memoryId]),
  ]);

  if (error) throw error;
  if (!isMemoriesRow(data)) {
    throw new Error('기록 데이터를 올바르게 읽지 못했어요.');
  }

  const { record: item, fallbackReason } = mapRowWithResolution(
    data,
    memoryImagesResult.grouped.get(memoryId) ?? [],
    memoryImagesResult.readFailureReason,
  );

  if (fallbackReason) {
    logLegacyReadFallbackUsage({
      source: 'fetch_one',
      memoryId,
      petId: item.petId,
      counts: { [fallbackReason]: 1 },
    });
  }

  // ✅ 단건 캐시 워밍(비동기 / 스크롤 영향 최소)
  if (item.imagePaths.length > 0) {
    const topPaths = item.imagePaths.slice(0, 3);
    scheduleAfterInteractions(() =>
      prefetchMemorySignedUrls({
        imagePaths: topPaths,
        max: topPaths.length,
      }),
    );
  }

  return item;
}

/* ---------------------------------------------------------
 * 1) List (pagination cursor 최종 확정)
 * - order: created_at desc, id desc
 * - cursor: (created_at < cursorCreatedAt)
 *        OR (created_at = cursorCreatedAt AND id < cursorId)
 *
 * ✅ 성능 포인트
 * - mapRow에서 signed url 생성 제거
 * - prefetch는 fetch 흐름 밖(idle callback)에서 async 스케줄링
 * -------------------------------------------------------- */
export async function fetchMemoriesByPetPage(input: {
  petId: string;
  limit?: number;
  cursor?: string | null; // ✅ compound cursor
  prefetchTop?: number; // default 10
}): Promise<FetchMemoriesPageResult> {
  // ✅ RN 카드 리스트 체감 최적(16~18 권장). 필요 시 호출부에서 override 가능.
  const limit = input.limit ?? 18;
  const prefetchTop = input.prefetchTop ?? 10;

  let q = supabase
    .from('memories')
    .select('*')
    .eq('pet_id', input.petId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (input.cursor) {
    const c = decodeCursor(input.cursor);
    if (c) {
      // ✅ (created_at < c.createdAt) OR (created_at = c.createdAt AND id < c.id)
      // Supabase OR 문법: a,b 형태(콤마=OR). and(...)는 내부 AND
      q = q.or(
        `created_at.lt.${c.createdAt},and(created_at.eq.${c.createdAt},id.lt.${c.id})`,
      );
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = toMemoriesRows(data);
  const memoryImagesResult = await fetchMemoryImagesByMemoryIds(
    rows.map(row => row.id),
  );

  // ✅ signed url 없이 row → item 변환(즉시 반환 가능)
  const mapped = rows.map(row =>
    mapRowWithResolution(
      row,
      memoryImagesResult.grouped.get(row.id) ?? [],
      memoryImagesResult.readFailureReason,
    ),
  );
  const items = mapped.map(entry => entry.record);
  const fallbackCounts = buildLegacyFallbackCounts(
    mapped.map(entry => entry.fallbackReason),
  );
  if (Object.keys(fallbackCounts).length > 0) {
    logLegacyReadFallbackUsage({
      source: 'fetch_list',
      petId: input.petId,
      counts: fallbackCounts,
    });
  }

  // ✅ 프리패치: fetch 완료 직후 "idle 타이밍"으로 미룸
  const timelineThumbPaths = items
    .slice(0, prefetchTop)
    .map(item => ({
      path: normalizePathValue(item.timelineImagePath),
      variant: item.timelineImageVariant ?? 'original',
    }))
    .filter((item): item is { path: string; variant: MemoryImageVariant } => Boolean(item.path));

  if (timelineThumbPaths.length) {
    const pathsByVariant = timelineThumbPaths.reduce<
      Record<MemoryImageVariant, string[]>
    >(
      (acc, item) => {
        acc[item.variant].push(item.path);
        return acc;
      },
      { original: [], 'timeline-thumb': [] },
    );
    scheduleAfterInteractions(() =>
      Promise.all(
        (Object.entries(pathsByVariant) as Array<
          [MemoryImageVariant, string[]]
        >)
          .filter(([, imagePaths]) => imagePaths.length > 0)
          .map(([variant, imagePaths]) =>
            prefetchMemorySignedUrls({
              imagePaths,
              max: prefetchTop,
              variant,
            }),
          ),
      ).then(() => undefined),
    );
  }

  const hasMore = items.length === limit;
  const last = items[items.length - 1] ?? null;
  const nextCursor = last
    ? encodeMemoriesCursor(last.createdAt, last.id)
    : null;

  return { items, hasMore, nextCursor };
}

/* ---------------------------------------------------------
 * 2) Create
 * -------------------------------------------------------- */
export async function createMemory(input: {
  petId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags?: string[];
  category?: string | null;
  subCategory?: string | null;
  price?: number | null;
  occurredAt?: string | null;
  imagePath?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('memories')
    .insert({
      pet_id: input.petId,
      title: input.title,
      content: input.content ?? null,
      emotion: input.emotion ?? null,
      tags: input.tags ?? [],
      category: input.category ?? null,
      sub_category: input.subCategory ?? null,
      price: input.price ?? null,
      occurred_at: input.occurredAt ?? null,
      image_url: input.imagePath ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!isInsertedMemoryIdRow(data)) {
    throw new Error('기록 식별자를 확인하지 못했어요.');
  }
  return data.id;
}

/* ---------------------------------------------------------
 * 3) Update fields
 * -------------------------------------------------------- */
export async function updateMemoryFields(input: {
  memoryId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags?: string[];
  category?: string | null;
  subCategory?: string | null;
  price?: number | null;
  occurredAt?: string | null;
}) {
  const { error } = await supabase
    .from('memories')
    .update({
      title: input.title,
      content: input.content ?? null,
      emotion: input.emotion ?? null,
      tags: input.tags ?? [],
      category: input.category ?? null,
      sub_category: input.subCategory ?? null,
      price: input.price ?? null,
      occurred_at: input.occurredAt ?? null,
    })
    .eq('id', input.memoryId);

  if (error) throw error;
}

/* ---------------------------------------------------------
 * 4) Update image path (after upload)
 * -------------------------------------------------------- */
export async function updateMemoryImagePath(input: {
  memoryId: string;
  imagePath: string | null;
}) {
  const { error } = await supabase
    .from('memories')
    .update({ image_url: input.imagePath })
    .eq('id', input.memoryId);

  if (error) throw error;
}

async function syncMemoryImages(input: {
  memoryId: string;
  imagePaths: string[];
}) {
  const nextPaths = dedupeOrderedPaths(input.imagePaths);

  const { data, error } = await supabase
    .from('memory_images')
    .select('id,original_path,timeline_thumb_path,status')
    .eq('memory_id', input.memoryId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const existingRows = (Array.isArray(data) ? data : []).filter(
    (
      row,
    ): row is {
      id: string;
      original_path: string;
      timeline_thumb_path: string | null;
      status: 'pending' | 'ready' | 'failed';
    } =>
      isRecord(row) &&
      typeof row.id === 'string' &&
      typeof row.original_path === 'string' &&
      (typeof row.timeline_thumb_path === 'string' ||
        row.timeline_thumb_path === null) &&
      isMemoryImageStatus(row.status),
  );
  const existingByPath = new Map(
    existingRows.map(row => [normalizePathValue(row.original_path), row] as const),
  );

  if (nextPaths.length > 0) {
    const payload = nextPaths.map((path, index) => {
      const existing = existingByPath.get(path);
      return {
        memory_id: input.memoryId,
        sort_order: index,
        original_path: path,
        timeline_thumb_path: existing?.timeline_thumb_path ?? null,
        status: existing?.status ?? ('pending' as const),
      };
    });

    const { error: upsertError } = await supabase
      .from('memory_images')
      .upsert(payload, { onConflict: 'memory_id,original_path' });

    if (upsertError) throw upsertError;
  }

  const nextPathSet = new Set(nextPaths);
  const removedRows = existingRows.filter(
    row => !nextPathSet.has(normalizePathValue(row.original_path)),
  );

  if (removedRows.length > 0) {
    const { error: deleteError } = await supabase
      .from('memory_images')
      .delete()
      .in(
        'id',
        removedRows.map(row => row.id),
      );

    if (deleteError) throw deleteError;
  }

  return {
    removedOriginalPaths: removedRows
      .map(row => normalizePathValue(row.original_path))
      .filter(Boolean),
    removedThumbPaths: removedRows
      .map(row => normalizePathValue(row.timeline_thumb_path))
      .filter(Boolean),
  };
}

async function restoreMemoryImagesSnapshot(input: {
  memoryId: string;
  rows: MemoryImageRow[];
}) {
  const snapshotRows = [...input.rows].sort((a, b) => a.sort_order - b.sort_order);
  const snapshotPaths = new Set(
    snapshotRows
      .map(row => normalizePathValue(row.original_path))
      .filter(Boolean),
  );

  if (snapshotRows.length > 0) {
    const payload = snapshotRows.map(row => ({
      memory_id: input.memoryId,
      sort_order: row.sort_order,
      original_path: normalizePathValue(row.original_path),
      timeline_thumb_path: normalizePathValue(row.timeline_thumb_path) || null,
      status: row.status,
    }));

    const { error: restoreError } = await supabase
      .from('memory_images')
      .upsert(payload, { onConflict: 'memory_id,original_path' });

    if (restoreError) throw restoreError;
  }

  const currentRows = await fetchMemoryImagesSnapshot(input.memoryId);
  const extraPaths = currentRows
    .map(row => normalizePathValue(row.original_path))
    .filter(path => path && !snapshotPaths.has(path));

  if (extraPaths.length > 0) {
    const { error: deleteError } = await supabase
      .from('memory_images')
      .delete()
      .eq('memory_id', input.memoryId)
      .in('original_path', extraPaths);

    if (deleteError) throw deleteError;
  }
}

async function cleanupMemoryStoragePaths(paths: string[]) {
  const targets = dedupeOrderedPaths(paths);
  if (targets.length === 0) return;

  await Promise.all(
    targets.map(async path => {
      await deleteMemoryImage(path).catch(error => {
        captureMonitoringException(error);
      });
    }),
  );
}

async function persistLegacyMemoryImageState(input: {
  memoryId: string;
  nextPaths: string[];
  preferredMode?: LegacyMemoryImageState['mode'];
}): Promise<LegacyMemoryImageState['mode']> {
  const nextPaths = dedupeOrderedPaths(input.nextPaths);
  const first = nextPaths[0] ?? null;
  const updatePayload = {
    image_url: first,
    image_urls: nextPaths,
  };

  if (input.preferredMode !== 'single_fallback') {
    const { error } = await supabase
      .from('memories')
      .update(updatePayload)
      .eq('id', input.memoryId);

    if (!error) return 'multi';
    if (!isMissingImageUrlsColumnError(error)) throw error;
  }

  await updateMemoryImagePath({
    memoryId: input.memoryId,
    imagePath: first,
  });
  return 'single_fallback';
}

function isMissingImageUrlsColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const code = 'code' in error ? String(error.code ?? '') : '';
  const joined = `${code} ${message} ${details}`.toLowerCase();
  return (
    joined.includes('image_urls') &&
    (joined.includes('column') ||
      joined.includes('schema cache') ||
      joined.includes('pgrst'))
  );
}

async function fetchLegacyMemoryImageState(
  memoryId: string,
): Promise<LegacyMemoryImageState> {
  const multiSelect = await supabase
    .from('memories')
    .select('image_url,image_urls')
    .eq('id', memoryId)
    .single();

  if (!multiSelect.error) {
    const row = multiSelect.data as {
      image_url: string | null;
      image_urls?: string[] | null;
    } | null;
    return {
      imageUrl: row?.image_url ?? null,
      imageUrls: Array.isArray(row?.image_urls) ? row.image_urls : [],
      mode: 'multi',
    };
  }

  if (!isMissingImageUrlsColumnError(multiSelect.error)) {
    throw multiSelect.error;
  }

  const singleSelect = await supabase
    .from('memories')
    .select('image_url')
    .eq('id', memoryId)
    .single();
  if (singleSelect.error) throw singleSelect.error;

  const row = singleSelect.data as { image_url: string | null } | null;
  const imageUrl = row?.image_url ?? null;
  return {
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    mode: 'single_fallback',
  };
}

/* ---------------------------------------------------------
 * 4-1) Update image paths (multi-image)
 * - image_urls 컬럼이 없는 DB면 image_url 단일 저장으로 폴백
 * -------------------------------------------------------- */
export async function updateMemoryImagePaths(input: {
  memoryId: string;
  imagePaths: string[];
}): Promise<{ mode: 'multi' | 'single_fallback'; savedPaths: string[] }> {
  const nextPaths = dedupeOrderedPaths(input.imagePaths);
  const [legacySnapshot, memoryImagesSnapshot] = await Promise.all([
    fetchLegacyMemoryImageState(input.memoryId),
    fetchMemoryImagesSnapshot(input.memoryId),
  ]);

  const syncResult = await syncMemoryImages({
    memoryId: input.memoryId,
    imagePaths: nextPaths,
  });

  try {
    const mode = await persistLegacyMemoryImageState({
      memoryId: input.memoryId,
      nextPaths,
      preferredMode: legacySnapshot.mode,
    });

    await cleanupMemoryStoragePaths([
      ...syncResult.removedOriginalPaths,
      ...syncResult.removedThumbPaths,
    ]);
    return { mode, savedPaths: nextPaths };
  } catch (error) {
    await restoreMemoryImagesSnapshot({
      memoryId: input.memoryId,
      rows: memoryImagesSnapshot,
    }).catch(restoreError => {
      captureMonitoringException(restoreError);
    });

    await persistLegacyMemoryImageState({
      memoryId: input.memoryId,
      nextPaths:
        legacySnapshot.imageUrls.length > 0
          ? legacySnapshot.imageUrls
          : legacySnapshot.imageUrl
            ? [legacySnapshot.imageUrl]
            : [],
      preferredMode: legacySnapshot.mode,
    }).catch(restoreError => {
      captureMonitoringException(restoreError);
    });

    throw error;
  }
}

/* ---------------------------------------------------------
 * 5) Delete (Storage 정리 포함)
 * -------------------------------------------------------- */
export async function deleteMemoryWithFile(input: {
  memoryId: string;
  imagePath?: string | null;
  imagePaths?: string[];
}) {
  const basePaths = dedupeOrderedPaths([
    ...(input.imagePaths ?? []),
    input.imagePath,
  ]);
  let memoryImageRows: Array<{
    original_path: string | null;
    timeline_thumb_path: string | null;
  }> = [];
  try {
    const { data } = await supabase
      .from('memory_images')
      .select('original_path,timeline_thumb_path')
      .eq('memory_id', input.memoryId)
      .throwOnError();
    memoryImageRows = (Array.isArray(data) ? data : []).filter(
      (
        row,
      ): row is {
        original_path: string | null;
        timeline_thumb_path: string | null;
      } =>
        isRecord(row) &&
        (typeof row.original_path === 'string' || row.original_path === null) &&
        (typeof row.timeline_thumb_path === 'string' ||
          row.timeline_thumb_path === null),
    );
  } catch {
    memoryImageRows = [];
  }
  const memoryImagePaths = memoryImageRows.flatMap(row => [
    row.original_path ?? '',
    row.timeline_thumb_path ?? '',
  ]);
  const paths = dedupeOrderedPaths([...basePaths, ...memoryImagePaths]);

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', input.memoryId);

  if (error) throw error;

  try {
    await supabase
      .from('memory_images')
      .delete()
      .eq('memory_id', input.memoryId)
      .throwOnError();
  } catch (deleteError) {
    captureMonitoringException(deleteError);
  }

  if (paths.length > 0) {
    await Promise.all(
      paths.map(async path => {
        await deleteMemoryImage(path).catch((deleteError: unknown) => {
          captureMonitoringException(deleteError);
        });
      }),
    );
  }
}

/* ---------------------------------------------------------
 * 6) Read imagePath only (for replace flow)
 * - 기존 이미지 삭제를 위해 server truth로 가져옴
 * -------------------------------------------------------- */
export async function fetchMemoryImagePath(
  memoryId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('memories')
    .select('image_url')
    .eq('id', memoryId)
    .single();

  if (error) throw error;

  const row = data as { image_url: string | null };
  return row?.image_url ?? null;
}

```

---

## FILE: `src/services/records/imageSources.ts`

원본 경로: `src/services/records/imageSources.ts`

```ts
import type { MemoryRecord } from '../supabase/memories';
import type { MemoryImageVariant } from '../supabase/storageMemories';

type MemoryImageFields = Pick<MemoryRecord, 'imagePath' | 'imagePaths' | 'imageUrl'>;

export type MemoryImageRefKind = 'storage' | 'remote' | 'local';

export type MemoryImageRef = {
  key: string;
  value: string;
  kind: MemoryImageRefKind;
};

function normalizeString(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

export function isRemoteMemoryImageUri(value: string | null | undefined) {
  return /^https?:\/\//i.test(normalizeString(value));
}

export function isLocalMemoryImageUri(value: string | null | undefined) {
  return /^(file|content|ph|assets-library):\/\//i.test(normalizeString(value));
}

export function isDirectMemoryImageUri(value: string | null | undefined) {
  return (
    isRemoteMemoryImageUri(value) ||
    isLocalMemoryImageUri(value) ||
    /^data:/i.test(normalizeString(value))
  );
}

export function getMemoryImageRefKind(
  value: string | null | undefined,
): MemoryImageRefKind | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (isRemoteMemoryImageUri(normalized)) return 'remote';
  if (isLocalMemoryImageUri(normalized) || /^data:/i.test(normalized)) {
    return 'local';
  }
  return 'storage';
}

function pushUnique(target: string[], seen: Set<string>, value: string | null | undefined) {
  const normalized = normalizeString(value);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  target.push(normalized);
}

export function normalizeMemoryImageFields<T extends Partial<MemoryImageFields>>(
  input: T,
): T & MemoryImageFields {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of input.imagePaths ?? []) {
    pushUnique(ordered, seen, value);
  }
  pushUnique(ordered, seen, input.imagePath);
  pushUnique(ordered, seen, input.imageUrl);

  const storagePaths = ordered.filter(value => !isDirectMemoryImageUri(value));
  const directUri = ordered.find(isDirectMemoryImageUri) ?? null;

  return {
    ...input,
    imagePath: storagePaths[0] ?? null,
    imagePaths: storagePaths,
    imageUrl: directUri,
  };
}

export function normalizeMemoryRecord<T extends Partial<MemoryRecord>>(input: T) {
  return normalizeMemoryImageFields(input);
}

export function getMemoryImageRefs(input: Partial<MemoryImageFields>): MemoryImageRef[] {
  const seen = new Set<string>();
  const ordered: MemoryImageRef[] = [];

  for (const value of input.imagePaths ?? []) {
    const normalized = normalizeString(value);
    const kind = getMemoryImageRefKind(normalized);
    if (!normalized || !kind || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push({ key: `${kind}:${normalized}`, value: normalized, kind });
  }

  for (const value of [input.imagePath, input.imageUrl]) {
    const normalized = normalizeString(value);
    const kind = getMemoryImageRefKind(normalized);
    if (!normalized || !kind || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push({ key: `${kind}:${normalized}`, value: normalized, kind });
  }

  return ordered;
}

export function getPrimaryMemoryImageRef(input: Partial<MemoryImageFields>) {
  return getMemoryImageRefs(input)[0]?.value ?? null;
}

export function getTimelinePrimaryMemoryImageSource(
  input: Partial<MemoryImageFields> &
    Pick<Partial<MemoryRecord>, 'timelineImagePath' | 'timelineImageVariant'>,
): {
  value: string | null;
  variant: MemoryImageVariant;
} {
  const timelineImagePath = normalizeString(input.timelineImagePath);
  if (timelineImagePath) {
    return {
      value: timelineImagePath,
      variant: input.timelineImageVariant ?? 'original',
    };
  }

  return {
    value: getPrimaryMemoryImageRef(input),
    variant: 'original',
  };
}

export function hasMemoryImage(input: Partial<MemoryImageFields>) {
  return getMemoryImageRefs(input).length > 0;
}

```

---

## FILE: `src/services/records/form.ts`

원본 경로: `src/services/records/form.ts`

```ts
// 파일: src/services/records/form.ts
// 역할:
// - record 생성/수정 화면이 공유하는 폼 옵션과 입력 헬퍼를 제공
// - 이미지 picker 결과 해석, 날짜/태그 정규화, 감정/카테고리 옵션을 중앙화
// - RecordCreateScreen / RecordEditScreen 중복 로직을 줄여 화면별 동작 차이를 최소화

import type { Asset as ImagePickerAsset } from 'react-native-image-picker';

import type { EmotionTag } from '../supabase/memories';
import {
  addDaysToYmd,
  formatYmdWithWeekday,
  getDateYmdInKst,
} from '../../utils/date';

export const RECORD_MAIN_CATEGORIES = [
  { key: 'walk', label: '산책', icon: 'activity' as const, tag: '#산책' },
  { key: 'meal', label: '식사', icon: 'coffee' as const, tag: '#식사' },
  { key: 'health', label: '건강', icon: 'heart' as const, tag: '#건강' },
  { key: 'diary', label: '일기장', icon: 'edit-3' as const, tag: '#일기장' },
  { key: 'other', label: '생활', icon: 'more-horizontal' as const, tag: '#생활' },
] as const;

export const RECORD_OTHER_SUBCATEGORIES = [
  { key: 'grooming', label: '미용', tag: '#미용' },
  { key: 'hospital', label: '병원/약', tag: '#병원약' },
  { key: 'indoor', label: '실내 놀이', tag: '#실내놀이' },
  { key: 'training', label: '교육/훈련', tag: '#훈련' },
  { key: 'outing', label: '외출/여행', tag: '#외출' },
  { key: 'shopping', label: '용품/쇼핑', tag: '#쇼핑' },
  { key: 'bathing', label: '목욕/위생', tag: '#목욕' },
  { key: 'etc', label: '기타', tag: '#기타세부' },
] as const;

export const RECORD_EMOTION_OPTIONS: ReadonlyArray<{
  value: EmotionTag;
  emoji: string;
  label: string;
}> = [
  { value: 'happy', emoji: '😊', label: '행복해요' },
  { value: 'calm', emoji: '😌', label: '평온해요' },
  { value: 'excited', emoji: '🤩', label: '신나요' },
  { value: 'neutral', emoji: '🙂', label: '무난해요' },
  { value: 'sad', emoji: '😢', label: '아쉬워요' },
  { value: 'anxious', emoji: '😥', label: '걱정돼요' },
  { value: 'angry', emoji: '😠', label: '예민해요' },
  { value: 'tired', emoji: '😴', label: '피곤해요' },
];

export type RecordMainCategoryKey =
  (typeof RECORD_MAIN_CATEGORIES)[number]['key'];
export type RecordOtherSubCategoryKey =
  (typeof RECORD_OTHER_SUBCATEGORIES)[number]['key'];
export type RecordDateShortcutKey = 'today' | 'yesterday';
export type PickedRecordImage = {
  key: string;
  uri: string;
  mimeType: string | null;
};

export function isShoppingRecordCategory(
  mainCategoryKey: RecordMainCategoryKey | null,
  otherSubCategoryKey: RecordOtherSubCategoryKey | null,
) {
  return mainCategoryKey === 'other' && otherSubCategoryKey === 'shopping';
}

export function normalizeRecordPriceInput(value: string) {
  return value.replace(/[^\d]/g, '').slice(0, 9);
}

export function parseRecordPrice(value: string) {
  const normalized = normalizeRecordPriceInput(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('가격을 다시 확인해 주세요.');
  }
  return parsed;
}

export function formatRecordPriceLabel(price: number | null | undefined) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return '';
  }
  return `${price.toLocaleString('ko-KR')}원`;
}

function inferMimeFromFileName(
  fileName: string | null | undefined,
): string | null {
  const value = (fileName ?? '').toLowerCase().trim();
  if (!value) return null;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic')) return 'image/heic';
  if (value.endsWith('.heif')) return 'image/heif';
  return null;
}

function inferMimeFromUri(uri: string): string | null {
  const normalized = uri.toLowerCase().split('?')[0];
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  if (normalized.endsWith('.heif')) return 'image/heif';
  return null;
}

export function resolveRecordPickerMimeType(asset: {
  type?: string | null;
  fileName?: string | null;
  uri?: string | null;
}) {
  const direct = asset.type ?? null;
  if (direct && direct.includes('/')) return direct;

  const byName = inferMimeFromFileName(asset.fileName);
  if (byName) return byName;

  if (asset.uri) return inferMimeFromUri(asset.uri);
  return null;
}

export function buildPickedRecordImages(
  assets: ImagePickerAsset[],
  input: {
    existingUris?: string[];
    keyPrefix: string;
    limit?: number;
  },
): PickedRecordImage[] {
  const seenUris = new Set(input.existingUris ?? []);
  const next: PickedRecordImage[] = [];
  const limit = input.limit ?? 10;

  for (const asset of assets) {
    const uri = asset.uri ?? null;
    if (!uri) continue;
    if (seenUris.has(uri)) continue;

    seenUris.add(uri);
    next.push({
      key: `${input.keyPrefix}:${uri}`,
      uri,
      mimeType: resolveRecordPickerMimeType(asset),
    });

    if (next.length >= limit) break;
  }

  return next;
}

export function toRecordYmd(date: Date) {
  return getDateYmdInKst(date) ?? '';
}

export function offsetRecordYmd(base: string, offsetDays: number) {
  return addDaysToYmd(base, offsetDays) ?? base;
}

export function formatRecordKoreanDate(ymd: string) {
  return formatYmdWithWeekday(ymd) ?? ymd;
}

export function parseRecordTags(raw: string) {
  const cleaned = raw.trim();
  if (!cleaned) return [];

  const byComma = cleaned
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const base =
    byComma.length >= 2
      ? byComma
      : cleaned
          .split(/\s+/)
          .map(s => s.trim())
          .filter(Boolean);

  return base
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map(tag => `#${tag}`);
}

export function mergeRecordTags(
  selectedTags: string[],
  mainCategoryKey: RecordMainCategoryKey | null,
  otherSubCategoryKey: RecordOtherSubCategoryKey | null,
) {
  const manual = selectedTags
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
  const mainTag =
    RECORD_MAIN_CATEGORIES.find(category => category.key === mainCategoryKey)
      ?.tag ?? null;
  const otherSubTag =
    otherSubCategoryKey && mainCategoryKey === 'other'
      ? RECORD_OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey)
          ?.tag ?? null
      : null;

  const merged = [mainTag, otherSubTag, ...manual].filter(Boolean) as string[];
  return Array.from(new Set(merged));
}

export function validateRecordOccurredAt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
  }
  return trimmed;
}

```

---

## FILE: `src/services/records/date.ts`

원본 경로: `src/services/records/date.ts`

```ts
import type { MemoryRecord } from '../supabase/memories';
import {
  diffCalendarDaysBetweenYmd,
  formatYmdToDots,
  getDateYmdInKst,
  getKstYmd,
  getMonthKeyFromYmd,
  safeYmd,
} from '../../utils/date';

type RecordDateSource = Pick<MemoryRecord, 'createdAt' | 'occurredAt'>;

export function getRecordDisplayYmd(record: RecordDateSource): string | null {
  return safeYmd(record.occurredAt) ?? getDateYmdInKst(record.createdAt);
}

export function getRecordSortTimestamp(record: RecordDateSource): number {
  const occurredAt = safeYmd(record.occurredAt);
  if (occurredAt) {
    const time = new Date(`${occurredAt}T23:59:59.999`).getTime();
    if (Number.isFinite(time)) return time;
  }

  const createdTime = new Date(record.createdAt).getTime();
  if (Number.isFinite(createdTime)) return createdTime;
  return 0;
}

export function getRecordMonthKey(record: RecordDateSource): string | null {
  return getMonthKeyFromYmd(getRecordDisplayYmd(record));
}

export function formatRecordDisplayDate(record: RecordDateSource): string {
  const ymd = getRecordDisplayYmd(record);
  return formatYmdToDots(ymd) ?? '';
}

export function formatRecordRelativeTime(record: RecordDateSource, now = new Date()): string {
  const occurredAt = safeYmd(record.occurredAt);
  if (occurredAt) {
    const diffDays = diffCalendarDaysBetweenYmd(occurredAt, getKstYmd(now));
    if (diffDays === null) return '';
    if (diffDays <= 0) {
      const createdAt = new Date(record.createdAt).getTime();
      if (!Number.isFinite(createdAt)) return '1분 전';

      const diffMs = Math.max(0, now.getTime() - createdAt);
      const minuteMs = 60 * 1000;
      const hourMs = 60 * minuteMs;
      const dayMs = 24 * hourMs;

      if (diffMs < hourMs) {
        return `${Math.max(1, Math.floor(diffMs / minuteMs))}분 전`;
      }

      if (diffMs <= dayMs) {
        return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`;
      }

      return `${Math.max(1, Math.floor(diffMs / dayMs))}일 전`;
    }
    return `${diffDays}일 전`;
  }

  const createdAt = new Date(record.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return '';

  const diffMs = Math.max(0, now.getTime() - createdAt);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    return `${Math.max(1, Math.floor(diffMs / minuteMs))}분 전`;
  }

  if (diffMs <= dayMs) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`;
  }

  return `${Math.max(1, Math.floor(diffMs / dayMs))}일 전`;
}

```

---

## FILE: `src/screens/Common/EditDoneScreen.tsx`

원본 경로: `src/screens/Common/EditDoneScreen.tsx`

```tsx
// 파일: src/screens/Common/EditDoneScreen.tsx
// 역할:
// - 수정/저장 완료 뒤 공통적으로 재사용하는 완료 확인 화면
// - 라우트 파라미터로 받은 메시지와 후속 이동 목적지를 기준으로 CTA를 구성
// - 일정/기록/홈 등 여러 플로우에서 동일한 성공 피드백 경험을 제공

import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { styles } from './EditDoneScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditDone'>;
type Route = RootScreenRoute<'EditDone'>;

export default function EditDoneScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { title, bodyLines, buttonLabel, navigateTo } = route.params;

  const onPressPrimary = useCallback(() => {
    if (navigateTo.type === 'home') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
      return;
    }

    if (navigateTo.type === 'schedule-list') {
      navigation.reset({
        index: 1,
        routes: [
          { name: 'AppTabs', params: { screen: 'HomeTab' } },
          { name: 'ScheduleList', params: { petId: navigateTo.petId } },
        ],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'AppTabs',
          params: {
            screen: 'TimelineTab',
            params: {
              screen: 'RecordDetail',
              params: {
                petId: navigateTo.petId,
                memoryId: navigateTo.memoryId,
              },
            },
          },
        },
      ],
    });
  }, [navigateTo, navigation]);

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
            <Feather name="check" size={30} color="#6D6AF8" />
          </View>
        </View>

        <AppText preset="title2" style={styles.title}>
          {title}
        </AppText>
        <AppText preset="body" style={styles.body}>
          {bodyLines[0]}
        </AppText>
        {bodyLines[1] ? (
          <AppText preset="body" style={styles.body}>
            {bodyLines[1]}
          </AppText>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[
          styles.primaryButton,
          { marginBottom: Math.max(insets.bottom, 0) },
        ]}
        onPress={onPressPrimary}
      >
        <AppText preset="body" style={styles.primaryButtonText}>
          {buttonLabel ?? '홈으로 가기'}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

```

---

## FILE: `src/screens/Weather/WeatherActivityRecordScreen.tsx`

원본 경로: `src/screens/Weather/WeatherActivityRecordScreen.tsx`

```tsx
// 파일: src/screens/Weather/WeatherActivityRecordScreen.tsx
// 역할:
// - 실내 활동 완료 후 빠르게 감정/메모/태그를 남기는 전용 기록 화면
// - 저장 성공 시 완료 팝업을 보여주고 타임라인으로 이어짐

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import PhotoAddCard from '../../components/media/PhotoAddCard';
import RecordTagModal from '../Records/components/RecordTagModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import {
  parseRecordTags,
} from '../../services/records/form';
import {
  createMemory,
  fetchMemoryById,
  updateMemoryImagePaths,
} from '../../services/supabase/memories';
import { normalizeMemoryRecord } from '../../services/records/imageSources';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import {
  getIndoorActivityGuide,
  WEATHER_RECORD_EMOTION_OPTIONS,
  type WeatherRecordEmotionKey,
} from '../../services/weather/guide';
import { getKstYmd } from '../../utils/date';
import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WeatherActivityRecord'>;
type Route = RootScreenRoute<'WeatherActivityRecord'>;

const EMOTION_MAP = {
  excited: 'excited',
  happy: 'happy',
  calm: 'calm',
  neutral: 'neutral',
  tired: 'tired',
  sad: 'sad',
  anxious: 'anxious',
  angry: 'angry',
} as const;

export default function WeatherActivityRecordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const userId = useAuthStore(s => s.session?.user?.id ?? null);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const refresh = useRecordStore(s => s.refresh);

  const petId = useMemo(() => {
    return resolveSelectedPetId(pets, selectedPetId);
  }, [pets, selectedPetId]);
  const guideKey = route.params.guideKey;
  const district = route.params?.district?.trim() || '현재 위치';
  const guide = useMemo(() => getIndoorActivityGuide(guideKey), [guideKey]);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedEmotion, setSelectedEmotion] =
    useState<WeatherRecordEmotionKey>('happy');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    guide.recordDraft.suggestedTags,
  );
  const [tagDraft, setTagDraft] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doneVisible, setDoneVisible] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag],
    );
  }, []);

  const onChangeTagDraft = useCallback((value: string) => {
    setTagDraft(value);
  }, []);

  const onSubmitDraftTag = useCallback(() => {
    const parsedTags = parseRecordTags(tagDraft);
    if (parsedTags.length === 0) return;

    setSelectedTags(prev => Array.from(new Set([...prev, ...parsedTags])));
    setTagDraft('');
  }, [tagDraft]);

  const onPickImage = useCallback(async () => {
    try {
      const result = await pickPhotoAssets({
        selectionLimit: 1,
        quality: 0.9,
      });
      if (result.status === 'cancelled') return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMimeType(asset.mimeType);
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'image-pick',
      );
      showToast({ tone: 'error', title: alertTitle, message });
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (saving) return;
    if (!petId) {
      Alert.alert('아이를 먼저 선택해 주세요.');
      return;
    }
    if (!userId) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        new Error('not authenticated'),
        'record-create',
      );
      Alert.alert(alertTitle, message);
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('기록 제목을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      let savedImagePaths: string[] = [];
      const occurredAt = getKstYmd();
      const createdAt = new Date().toISOString();

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: note.trim() || null,
        emotion: EMOTION_MAP[selectedEmotion],
        tags: selectedTags,
        occurredAt,
      });

      if (imageUri) {
        const uploaded = await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: imageUri,
          mimeType: imageMimeType ?? 'image/jpeg',
        });
        const saveResult = await updateMemoryImagePaths({
          memoryId,
          imagePaths: [uploaded.path],
        });
        savedImagePaths = saveResult.savedPaths;
      }

      try {
        const created = await fetchMemoryById(memoryId);
        upsertOneLocal(petId, created);
      } catch {
        upsertOneLocal(
          petId,
          normalizeMemoryRecord({
            id: memoryId,
            petId,
            title: trimmedTitle,
            content: note.trim() || null,
            emotion: EMOTION_MAP[selectedEmotion],
            tags: selectedTags,
            occurredAt,
            createdAt,
            imagePath: savedImagePaths[0] ?? null,
            imagePaths: savedImagePaths,
            imageUrl: null,
          }),
        );
      }
      refresh(petId).catch(() => null);

      setDoneVisible(true);
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'record-create',
      );
      Alert.alert(alertTitle, message);
    } finally {
      setSaving(false);
    }
  }, [
    imageMimeType,
    imageUri,
    note,
    petId,
    refresh,
    saving,
    selectedEmotion,
    selectedTags,
    title,
    upsertOneLocal,
    userId,
  ]);

  const onPressDone = useCallback(() => {
    setDoneVisible(false);
    navigation.navigate('AppTabs', {
      screen: 'TimelineTab',
      params: {
        screen: 'TimelineMain',
        params: { mainCategory: 'all' },
      },
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerSide}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>기록하기</Text>
        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.summaryCard}>
        <View style={styles.summaryTextWrap}>
          <Text style={styles.summaryTitle}>{guide.title} 완료!</Text>
          <Text style={styles.summaryLink}>{district} 활동 기록</Text>
        </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons
              name={guide.heroIcon as never}
              size={24}
              color="#7A45F4"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>사진 업로드</Text>
            <PhotoAddCard
              imageUri={imageUri}
              onPress={onPickImage}
              containerStyle={styles.imageCard}
              imageStyle={styles.image}
              placeholderStyle={styles.imagePlaceholder}
              placeholderIconName="image"
              placeholderIconColor="#B39AF5"
              placeholderIconSize={54}
            placeholderText="사진을 추가해 주세요"
            placeholderTextStyle={styles.imagePlaceholderText}
            editButtonStyle={styles.imageEditButton}
            editIconSize={16}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>오늘 아이의 기분은?</Text>
          <View style={styles.emotionRow}>
            {WEATHER_RECORD_EMOTION_OPTIONS.map(option => {
              const active = selectedEmotion === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.9}
                  style={[styles.emotionChip, active ? styles.emotionChipActive : null]}
                  onPress={() => setSelectedEmotion(option.key)}
                >
                  <Text style={styles.emotionEmoji}>{option.emoji}</Text>
                  <Text style={[styles.emotionLabel, active ? styles.emotionLabelActive : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder={guide.recordDraft.title}
            placeholderTextColor="#B8C0CF"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={styles.textarea}
            multiline
            placeholder={guide.recordDraft.notePrompt}
            placeholderTextColor="#B8C0CF"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.tagHeader}>
            <Text style={styles.label}>태그</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setTagModalVisible(true)}
            >
              <Text style={styles.tagAdd}>+ 추가</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagRow}>
            {guide.recordDraft.suggestedTags.map(tag => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.9}
                  style={[styles.tagChip, active ? styles.tagChipActive : null]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, active ? styles.tagTextActive : null]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
          onPress={onSubmit}
          disabled={saving}
        >
          <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {saving ? '저장 중...' : '기록 저장하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={doneVisible}
        transparent
        animationType="fade"
        onRequestClose={onPressDone}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={48}
                color="#2280E3"
              />
            </View>
            <Text style={styles.modalTitle}>{guide.recordDraft.completionTitle}</Text>
            <Text style={styles.modalBody}>{guide.recordDraft.completionBody}</Text>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.modalButton}
              onPress={onPressDone}
            >
              <Text style={styles.modalButtonText}>확인</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <RecordTagModal
        visible={tagModalVisible}
        tagDraft={tagDraft}
        selectedTags={selectedTags}
        onClose={() => {
          setTagDraft('');
          setTagModalVisible(false);
        }}
        onChangeTagDraft={onChangeTagDraft}
        onSubmitDraftTag={onSubmitDraftTag}
        onRemoveTag={toggleTag}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FBFAFD',
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerSide: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    color: '#0B1220',
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 18,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE6FB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTextWrap: {
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1B2434',
    fontWeight: '700',
  },
  summaryLink: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F0E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2B3342',
    fontWeight: '600',
  },
  imageCard: {
    height: 238,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#EEEAF7',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imagePlaceholderText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#98A3B6',
    fontWeight: '500',
  },
  imageEditButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionChip: {
    width: '22.8%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emotionChipActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FBF7FF',
  },
  emotionEmoji: {
    fontSize: 22,
  },
  emotionLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: '#9CA6B7',
    fontWeight: '500',
    textAlign: 'center',
  },
  emotionLabelActive: {
    color: '#7A45F4',
  },
  input: {
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7EAF2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#1B2434',
    fontSize: 16,
    fontWeight: '500',
  },
  textarea: {
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7EAF2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1B2434',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    fontWeight: '400',
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagAdd: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF1F6',
  },
  tagChipActive: {
    backgroundColor: '#EBDDFF',
  },
  tagText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#93A0B4',
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#7A45F4',
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7A45F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 12,
  },
  modalIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#182133',
    fontWeight: '700',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8B96AA',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 6,
    height: 54,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#2280E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

```

---

## FILE: `src/screens/Records/TimelineScreen.styles.ts`

원본 경로: `src/screens/Records/TimelineScreen.styles.ts`

```ts
// 파일: src/screens/Records/TimelineScreen.styles.ts

import { StyleSheet } from 'react-native';
import { SCREEN_TOP_SPACING } from '../../theme/layout';

const BRAND = '#6D6AF8';
const TEXT = '#0B1220';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  headerSideSlot: {
    width: 88,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT,
    fontWeight: '900',
  },

  createBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: '#ffffff', fontWeight: '900' },

  // sticky controls
  controlsWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: SCREEN_TOP_SPACING,
    paddingBottom: 10,
    gap: 10,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  controlChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.18)',
    backgroundColor: 'rgba(109,106,248,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlChipText: { color: BRAND, fontWeight: '900' },

  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  iconText: { color: TEXT },

  // category row
  categoryRow: {},
  categoryContent: {
    paddingRight: 14,
    gap: 8, // ✅ ScrollView + map용 간격
  },
  categoryChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 120,
  },
  categoryChipActive: {
    borderColor: 'rgba(109,106,248,0.22)',
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  categoryChipText: { color: '#0B1220', fontWeight: '900' },
  categoryChipTextActive: { color: BRAND },

  // search
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { color: '#FFFFFF', fontWeight: '900' },

  hintRow: {},
  hintText: { color: '#6B7280', fontWeight: '800' },

  heatmapWrap: {
    marginHorizontal: 14,
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FAFAFF',
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.10)',
    gap: 12,
  },
  heatmapHeader: {
    flex: 1,
    gap: 4,
  },
  heatmapToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heatmapEyebrow: {
    color: BRAND,
    fontWeight: '900',
  },
  heatmapTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  heatmapDesc: {
    color: '#6B7280',
    fontWeight: '700',
    lineHeight: 17,
  },
  heatmapGridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heatmapLabelsCol: {
    paddingTop: 1,
    gap: 6,
  },
  heatmapDayLabel: {
    width: 14,
    height: 14,
    color: '#9CA3AF',
    fontWeight: '800',
    fontSize: 10,
    textAlign: 'center',
  },
  heatmapWeeksRow: {
    gap: 6,
  },
  heatmapWeekCol: {
    gap: 6,
  },
  heatmapCell: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(109,106,248,0.06)',
  },
  heatmapCell0: {
    backgroundColor: '#EFF1F6',
  },
  heatmapCell1: {
    backgroundColor: 'rgba(109,106,248,0.18)',
  },
  heatmapCell2: {
    backgroundColor: 'rgba(109,106,248,0.36)',
  },
  heatmapCell3: {
    backgroundColor: 'rgba(109,106,248,0.58)',
  },
  heatmapCell4: {
    backgroundColor: '#6D6AF8',
  },
  heatmapCellMuted: {
    opacity: 0.45,
  },
  heatmapCellToday: {
    borderColor: '#4338CA',
    borderWidth: 1.5,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  heatmapLegendText: {
    color: '#9CA3AF',
    fontWeight: '800',
  },

  list: { padding: 14, paddingBottom: 14 },
  listEmpty: { flexGrow: 1, padding: 14 },

  item: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 10,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  thumbImg: { width: '100%', height: '100%', borderRadius: 0 },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#F4F4F4',
  },
  thumbPlaceholderText: { color: '#888888', fontWeight: '800' },

  itemBody: { flex: 1, justifyContent: 'center', gap: 4 },
  itemTitle: { color: TEXT, fontWeight: '900' },
  itemContent: { marginTop: 4, color: '#374151' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: '#6B7280', fontWeight: '700' },

  badge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  badgeText: { color: BRAND, fontWeight: '900' },

  tags: { marginTop: 8, color: TEXT, fontWeight: '800' },

  empty: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyHero: {
    width: 220,
    height: 220,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPawImage: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    color: TEXT,
    fontWeight: '900',
    marginTop: -6,
  },
  emptyDesc: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 2,
  },

  primary: {
    marginTop: 14,
    minWidth: 210,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 24,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryIcon: { color: '#FFFFFF', fontWeight: '900' },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  footer: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: { color: '#6B7280', fontWeight: '800' },

  manualMoreBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualMoreText: { color: TEXT, fontWeight: '900' },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: { color: TEXT, fontWeight: '900', marginBottom: 10 },

  modalItem: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalItemText: { color: TEXT, fontWeight: '900' },
});

```

---

## FILE: `src/screens/Records/TimelineScreen.tsx`

원본 경로: `src/screens/Records/TimelineScreen.tsx`

```tsx
// 파일: src/screens/Records/TimelineScreen.tsx
// 파일 목적:
// - 선택된 펫의 기록을 시간순 타임라인으로 탐색하는 메인 목록 화면이다.
// 어디서 쓰이는지:
// - TimelineStackNavigator의 `TimelineMain` 화면으로 사용되며, 홈과 하단 탭에서 진입한다.
// 핵심 역할:
// - 기록 목록, 월 이동, 카테고리 필터, 무한 스크롤, 상세 진입, 기록 작성 이동을 담당한다.
// - 이미지 프리로드와 포커스 복귀를 포함한 타임라인 UX를 한 곳에서 관리한다.
// 데이터·상태 흐름:
// - 실제 리스트 상태는 recordStore에서 읽고, 화면은 buildTimelineView로 필터/정렬된 표시 모델을 만든다.
// - 상세/수정/삭제 이후에도 같은 store 엔티티를 재사용해 목록을 다시 그린다.
// 수정 시 주의:
// - 대량 데이터 성능에 민감한 화면이라 렌더링, 이미지 prefetch, filter 계산 비용을 함께 봐야 한다.
// - 타임라인 ids와 entity cache가 분리돼 있으므로 목록 표시 로직만 바꾸면 상세 복귀가 어긋날 수 있다.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FlashList,
  type FlashListRef,
  type ListRenderItem,
  type ViewToken,
} from '@shopify/flash-list';
import Feather from 'react-native-vector-icons/Feather';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';

import { MemoryCard } from '../../components/MemoryCard/MemoryCard';
import { preloadOptimizedImages } from '../../components/images/OptimizedImage';
import AppText from '../../app/ui/AppText';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import {
  MAIN_CATEGORY_OPTIONS,
  OTHER_SUBCATEGORY_OPTIONS,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../../services/memories/categoryMeta';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import type { MemoryRecord } from '../../services/supabase/memories';
import {
  buildTimelineView,
  humanizeTimelineMonthKey,
  type TimelineSortMode,
} from '../../services/timeline/query';
import { getTimelinePrimaryMemoryImageSource } from '../../services/records/imageSources';
import {
  getMemoryImageSignedUrlsCached,
  type MemoryImageVariant,
} from '../../services/supabase/storageMemories';
import { usePetStore, resolveSelectedPetId } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { styles } from './TimelineScreen.styles';

type TimelineMainRoute = RouteProp<TimelineStackParamList, 'TimelineMain'>;
type TimelineTabNav = BottomTabNavigationProp<AppTabParamList, 'TimelineTab'>;
type TimelineStackNav = NativeStackNavigationProp<
  TimelineStackParamList,
  'TimelineMain'
>;
type Nav = CompositeNavigationProp<TimelineStackNav, TimelineTabNav>;

type MainCategory = MemoryMainCategory;
type OtherSubCategory = MemoryOtherSubCategory;
type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';
type TimelinePreloadRef = {
  path: string;
  variant: MemoryImageVariant;
};

type GlobalWithIdleCallback = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type DeferredTaskHandle = {
  cancel: () => void;
};

function normalizeStatus(v: unknown): Status {
  switch (v) {
    case 'idle':
    case 'loading':
    case 'ready':
    case 'refreshing':
    case 'loadingMore':
    case 'error':
      return v;
    default:
      return 'idle';
  }
}

function scheduleIdleTask(
  task: () => void,
  timeout = 180,
): DeferredTaskHandle {
  const globalScope = globalThis as GlobalWithIdleCallback;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const handle = globalScope.requestIdleCallback(
      () => {
        task();
      },
      { timeout },
    );

    return {
      cancel: () => {
        if (typeof globalScope.cancelIdleCallback === 'function') {
          globalScope.cancelIdleCallback(handle);
        }
      },
    };
  }

  const timer = setTimeout(task, 48);
  return {
    cancel: () => clearTimeout(timer),
  };
}

const JUMP_TO_ALL = '__ALL__';
const TIMELINE_WINDOW_SIZE = 3;
const TIMELINE_EAGER_IMAGE_COUNT = 2;
const TIMELINE_INITIAL_IMAGE_WINDOW = {
  start: 0,
  end: 4,
  eagerUntil: 1,
};
const TIMELINE_IMAGE_BUFFER_BEHIND = 2;
const TIMELINE_IMAGE_BUFFER_AHEAD = 4;
const TIMELINE_ITEM_HEIGHT = 96;
const TIMELINE_PRELOAD_VISIBLE_COUNT = 2;
const TIMELINE_PRELOAD_DEFERRED_COUNT = 2;
const TIMELINE_PRELOAD_DEFER_DELAY_MS = 180;
const MAIN_CATEGORY_KEY_SET = new Set<MainCategory>(
  MAIN_CATEGORY_OPTIONS.map(item => item.key),
);
const OTHER_SUBCATEGORY_KEY_SET = new Set<OtherSubCategory>(
  OTHER_SUBCATEGORY_OPTIONS.map(item => item.key),
);

const ControlsBar = memo(function ControlsBar({
  sortLabel,
  monthLabel,
  mainCategory,
  categoryLabel,
  onToggleSort,
  onOpenMonthModal,
  onPressMainCategory,
  theme,
}: {
  sortLabel: string;
  monthLabel: string;
  mainCategory: MainCategory;
  categoryLabel: string;
  onToggleSort: () => void;
  onOpenMonthModal: () => void;
  onPressMainCategory: (key: MainCategory) => void;
  theme: ReturnType<typeof buildPetThemePalette>;
}) {
  return (
    <View style={styles.controlsWrap}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.controlChip,
            { borderColor: theme.border, backgroundColor: theme.tint },
          ]}
          onPress={onToggleSort}
        >
          <AppText
            preset="caption"
            style={[styles.controlChipText, { color: theme.primary }]}
          >
            {sortLabel}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.controlChip,
            { borderColor: theme.border, backgroundColor: theme.tint },
          ]}
          onPress={onOpenMonthModal}
        >
          <AppText
            preset="caption"
            style={[styles.controlChipText, { color: theme.primary }]}
          >
            {monthLabel}
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {MAIN_CATEGORY_OPTIONS.map(item => {
            const active =
              item.key === 'other'
                ? mainCategory === 'other'
                : mainCategory === item.key;
            const label =
              item.key === 'other' && mainCategory === 'other'
                ? categoryLabel
                : item.label;

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={[
                  styles.categoryChip,
                  active ? styles.categoryChipActive : null,
                  active
                    ? {
                        borderColor: theme.border,
                        backgroundColor: theme.tint,
                      }
                    : null,
                ]}
                onPress={() => onPressMainCategory(item.key)}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                    active ? { color: theme.primary } : null,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

export default function TimelineScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<TimelineMainRoute>();
  const isFocused = useIsFocused();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const petIdFromParams = route?.params?.petId?.trim() || null;
  const mainCategoryFromParams = MAIN_CATEGORY_KEY_SET.has(
    route?.params?.mainCategory ?? 'all',
  )
    ? (route?.params?.mainCategory ?? null)
    : null;
  const otherSubCategoryFromParams = OTHER_SUBCATEGORY_KEY_SET.has(
    route?.params?.otherSubCategory ?? 'etc',
  )
    ? (route?.params?.otherSubCategory ?? null)
    : null;

  const petId = useMemo(
    () => resolveSelectedPetId(pets, selectedPetId, petIdFromParams),
    [petIdFromParams, pets, selectedPetId],
  );
  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);
  const timelineIds = useRecordStore(s => s.selectTimelineIdsByPetId(petId));
  const timelineStatus = useRecordStore(s => s.selectTimelineStatusByPetId(petId));
  const hasMore = useRecordStore(s => s.selectTimelineHasMoreByPetId(petId));
  const timelineEntityVersion = useRecordStore(s =>
    s.selectTimelineEntityVersionByPetId(petId),
  );
  const focusedMemoryId = useRecordStore(s =>
    petId ? s.focusedMemoryIdByPet[petId] ?? null : null,
  );
  const clearFocusedMemoryId = useRecordStore(s => s.clearFocusedMemoryId);
  const recordsById = useRecordStore.getState().recordsById;
  const status = normalizeStatus(timelineStatus);
  const refreshing = status === 'refreshing';

  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  const [sortMode, setSortMode] = useState<TimelineSortMode>('recent');
  const [ymFilter, setYmFilter] = useState<string | null>(null);
  const [ymModalOpen, setYmModalOpen] = useState(false);
  const [mainCategory, setMainCategory] = useState<MainCategory>('all');
  const [otherSubCategory, setOtherSubCategory] =
    useState<OtherSubCategory | null>(null);
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [pendingJumpYm, setPendingJumpYm] = useState<string | null>(null);
  const [imageWindow, setImageWindow] = useState(TIMELINE_INITIAL_IMAGE_WINDOW);
  const imageWindowRef = useRef(TIMELINE_INITIAL_IMAGE_WINDOW);

  useEffect(() => {
    setSortMode('recent');
    setYmFilter(null);
    setYmModalOpen(false);
    setMainCategory('all');
    setOtherSubCategory(null);
    setOtherModalOpen(false);
    setPendingJumpYm(null);
    setImageWindow(TIMELINE_INITIAL_IMAGE_WINDOW);
    imageWindowRef.current = TIMELINE_INITIAL_IMAGE_WINDOW;
  }, [petId]);

  useEffect(() => {
    if (!mainCategoryFromParams) return;
    setMainCategory(mainCategoryFromParams);
    setOtherModalOpen(false);

    if (mainCategoryFromParams === 'other') {
      setOtherSubCategory(otherSubCategoryFromParams ?? null);
      return;
    }

    setOtherSubCategory(null);
  }, [mainCategoryFromParams, otherSubCategoryFromParams, petId]);

  const timelineView = useMemo(
    () => {
      const recordsSnapshot =
        timelineEntityVersion >= 0 ? recordsById : recordsById;
      return buildTimelineView({
        ids: timelineIds,
        recordsById: recordsSnapshot,
        filters: {
          ymFilter,
          mainCategory,
          otherSubCategory,
          query: '',
          sortMode,
        },
      });
    },
    [
      recordsById,
      timelineIds,
      mainCategory,
      otherSubCategory,
      sortMode,
      ymFilter,
      timelineEntityVersion,
    ],
  );
  const availableYmList = timelineView.availableMonthKeys;
  const filteredIds = timelineView.filteredIds;
  const preloadSignatureRef = useRef<string>('');

  const listRef = useRef<FlashListRef<string>>(null);
  const targetLayoutOffsetRef = useRef<number | null>(null);
  const pendingFocusedMemoryIdRef = useRef<string | null>(null);

  const clearPendingFocusedMemory = useCallback(() => {
    targetLayoutOffsetRef.current = null;
    pendingFocusedMemoryIdRef.current = null;
  }, []);

  const finalizeFocusedMemoryScroll = useCallback(
    (targetMemoryId: string) => {
      if (!petId) return false;
      if (pendingFocusedMemoryIdRef.current !== targetMemoryId) return false;

      const offset = targetLayoutOffsetRef.current;
      if (typeof offset !== 'number') return false;

      listRef.current?.scrollToOffset({
        offset: Math.max(0, offset - 12),
        animated: true,
      });
      clearFocusedMemoryId(petId);
      clearPendingFocusedMemory();
      return true;
    },
    [clearFocusedMemoryId, clearPendingFocusedMemory, petId],
  );

  const consumeFocusedMemory = useCallback(() => {
    if (!petId || !focusedMemoryId || !isFocused) return false;
    if (filteredIds.length === 0) return false;

    const index = filteredIds.indexOf(focusedMemoryId);
    if (index < 0) return false;

    pendingFocusedMemoryIdRef.current = focusedMemoryId;
    targetLayoutOffsetRef.current = null;

    if (finalizeFocusedMemoryScroll(focusedMemoryId)) return true;

    if (index === 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return true;
    }

    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.35,
    });
    return true;
  }, [filteredIds, finalizeFocusedMemoryScroll, focusedMemoryId, isFocused, petId]);

  useEffect(() => {
    if (!pendingJumpYm) return;

    if (pendingJumpYm === JUMP_TO_ALL) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
      setPendingJumpYm(null);
      return;
    }

    const idx = timelineView.firstIndexByMonth.get(pendingJumpYm) ?? -1;
    requestAnimationFrame(() => {
      if (idx >= 0) {
        listRef.current?.scrollToIndex({ index: idx, animated: true });
      } else {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      setPendingJumpYm(null);
    });
  }, [pendingJumpYm, timelineView.firstIndexByMonth]);

  useEffect(() => {
    if (focusedMemoryId) return;
    clearPendingFocusedMemory();
  }, [clearPendingFocusedMemory, focusedMemoryId]);

  useEffect(() => {
    consumeFocusedMemory();
  }, [consumeFocusedMemory]);

  const timelinePreloadImageRefs = useMemo(() => {
    const visible = filteredIds
      .slice(imageWindow.start, imageWindow.end + 1)
      .map(id => recordsById[id])
      .filter((item): item is MemoryRecord => Boolean(item))
      .reduce<TimelinePreloadRef[]>((acc, record) => {
        const source = getTimelinePrimaryMemoryImageSource(record);
        if (!source.value) return acc;
        acc.push({
          path: source.value,
          variant: source.variant,
        });
        return acc;
      }, []);

    return {
      immediate: visible.slice(0, TIMELINE_PRELOAD_VISIBLE_COUNT),
      deferred: visible.slice(
        TIMELINE_PRELOAD_VISIBLE_COUNT,
        TIMELINE_PRELOAD_VISIBLE_COUNT + TIMELINE_PRELOAD_DEFERRED_COUNT,
      ),
    };
  }, [
    filteredIds,
    imageWindow.end,
    imageWindow.start,
    recordsById,
  ]);

  useEffect(() => {
    if (!isFocused) return;
    const immediateSignature = timelinePreloadImageRefs.immediate
      .map(item => `${item.variant}:${item.path}`)
      .join('|');
    const deferredSignature = timelinePreloadImageRefs.deferred
      .map(item => `${item.variant}:${item.path}`)
      .join('|');
    const nextSignature = `${immediateSignature}__${deferredSignature}`;
    if (!nextSignature || nextSignature === preloadSignatureRef.current) return;
    preloadSignatureRef.current = nextSignature;

    let cancelled = false;
    let deferredTimer: ReturnType<typeof setTimeout> | null = null;
    const preloadByVariant = async (targets: TimelinePreloadRef[]) => {
      const grouped = targets.reduce<Record<MemoryImageVariant, string[]>>(
        (acc, item) => {
          acc[item.variant].push(item.path);
          return acc;
        },
        { original: [], 'timeline-thumb': [] },
      );

      const signedUrlGroups = await Promise.all(
        (Object.entries(grouped) as Array<[MemoryImageVariant, string[]]>)
          .filter(([, imagePaths]) => imagePaths.length > 0)
          .map(async ([variant, imagePaths]) =>
            getMemoryImageSignedUrlsCached(imagePaths, {
              maxCacheSize: 450,
              refreshBufferMs: 90 * 1000,
              variant,
            }),
          ),
      );

      return signedUrlGroups.flat().filter((value): value is string => Boolean(value));
    };
    const deferredTask = scheduleIdleTask(() => {
      (async () => {
        const immediateUrls = await preloadByVariant(
          timelinePreloadImageRefs.immediate,
        );
        if (cancelled) return;
        preloadOptimizedImages(immediateUrls);

        if (timelinePreloadImageRefs.deferred.length === 0) return;
        deferredTimer = setTimeout(async () => {
          const deferredUrls = await preloadByVariant(
            timelinePreloadImageRefs.deferred,
          );
          if (cancelled) return;
          preloadOptimizedImages(deferredUrls);
        }, TIMELINE_PRELOAD_DEFER_DELAY_MS);
      })().catch(() => {});
    });

    return () => {
      cancelled = true;
      deferredTask.cancel();
      if (deferredTimer) clearTimeout(deferredTimer);
    };
  }, [isFocused, timelinePreloadImageRefs]);

  const onPressCreate = useCallback(() => {
    if (!petId) return;
    navigation.navigate('RecordCreateTab', {
      petId,
      returnTo: {
        tab: 'TimelineTab',
        params: {
          screen: 'TimelineMain',
          params: {
            petId,
            mainCategory,
            otherSubCategory:
              mainCategory === 'other' ? otherSubCategory ?? undefined : undefined,
          },
        },
      },
    });
  }, [mainCategory, navigation, otherSubCategory, petId]);

  const onPressItem = useCallback(
    (item: MemoryRecord) => {
      if (!petId) return;
      navigation.navigate('RecordDetail', { petId, memoryId: item.id });
    },
    [navigation, petId],
  );

  const onRefresh = useCallback(() => {
    if (!petId) return;
    refresh(petId);
  }, [petId, refresh]);

  const onFocusedItemLayout = useCallback(
    (itemId: string, event: LayoutChangeEvent) => {
      targetLayoutOffsetRef.current = event.nativeEvent.layout.y;
      finalizeFocusedMemoryScroll(itemId);
    },
    [finalizeFocusedMemoryScroll],
  );

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<ViewToken<string>>;
      changed: Array<ViewToken<string>>;
    }) => {
      let topVisibleIndex = Number.POSITIVE_INFINITY;
      let bottomVisibleIndex = -1;

      for (const token of viewableItems) {
        if (!token.isViewable) continue;
        const index = token.index;
        if (typeof index !== 'number') continue;
        if (index < topVisibleIndex) topVisibleIndex = index;
        if (index > bottomVisibleIndex) bottomVisibleIndex = index;
      }

      if (!Number.isFinite(topVisibleIndex)) return;

      const nextWindow = {
        start: Math.max(0, topVisibleIndex - TIMELINE_IMAGE_BUFFER_BEHIND),
        end: Math.max(
          TIMELINE_INITIAL_IMAGE_WINDOW.end,
          bottomVisibleIndex + TIMELINE_IMAGE_BUFFER_AHEAD,
        ),
        eagerUntil: Math.max(
          TIMELINE_INITIAL_IMAGE_WINDOW.eagerUntil,
          bottomVisibleIndex >= 0
            ? Math.min(
                bottomVisibleIndex,
                topVisibleIndex + TIMELINE_EAGER_IMAGE_COUNT - 1,
              )
            : TIMELINE_INITIAL_IMAGE_WINDOW.eagerUntil,
        ),
      };

      const currentWindow = imageWindowRef.current;
      if (
        currentWindow.start === nextWindow.start &&
        currentWindow.end === nextWindow.end &&
        currentWindow.eagerUntil === nextWindow.eagerUntil
      ) {
        return;
      }

      imageWindowRef.current = nextWindow;
      setImageWindow(nextWindow);
    },
    [],
  );

  const endReachedLockRef = useRef(0);
  const onEndReached = useCallback(() => {
    if (!petId || !hasMore || status !== 'ready') return;
    if (ymFilter || mainCategory !== 'all' || otherSubCategory) return;

    const now = Date.now();
    if (now - endReachedLockRef.current < 800) return;
    endReachedLockRef.current = now;

    loadMore(petId).catch(() => {});
  }, [
    hasMore,
    loadMore,
    mainCategory,
    otherSubCategory,
    petId,
    status,
    ymFilter,
  ]);

  const jumpToYm = useCallback((ym: string | null) => {
    setYmModalOpen(false);

    if (!ym) {
      setYmFilter(null);
      setPendingJumpYm(JUMP_TO_ALL);
      return;
    }

    setYmFilter(ym);
    setPendingJumpYm(ym);
  }, []);

  const onPressMainCategory = useCallback((key: MainCategory) => {
    if (key === 'other') {
      setMainCategory('other');
      setOtherModalOpen(true);
      return;
    }
    setMainCategory(key);
    setOtherSubCategory(null);
  }, []);

  const applyOtherSub = useCallback((sub: OtherSubCategory) => {
    setOtherSubCategory(sub);
    setOtherModalOpen(false);
  }, []);

  const clearOtherSub = useCallback(() => {
    setOtherSubCategory(null);
    setOtherModalOpen(false);
  }, []);

  const sortLabel = useMemo(
    () => (sortMode === 'recent' ? '최신순' : '오래된순'),
    [sortMode],
  );
  const monthLabel = useMemo(
    () => (ymFilter ? humanizeTimelineMonthKey(ymFilter) : '월/전체'),
    [ymFilter],
  );
  const categoryLabel = useMemo(() => {
    if (mainCategory !== 'other') {
      return MAIN_CATEGORY_OPTIONS.find(x => x.key === mainCategory)?.label ?? '전체';
    }
    if (!otherSubCategory) {
      return MAIN_CATEGORY_OPTIONS.find(x => x.key === 'other')?.label ?? '생활';
    }
    return (
      OTHER_SUBCATEGORY_OPTIONS.find(x => x.key === otherSubCategory)?.label ??
      (MAIN_CATEGORY_OPTIONS.find(x => x.key === 'other')?.label ?? '생활')
    );
  }, [mainCategory, otherSubCategory]);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item, index }) => {
      const record = recordsById[item];
      if (!record) return null;

      const enableImageLoad =
        index >= imageWindow.start && index <= imageWindow.end;
      const shouldDeferImage =
        enableImageLoad && index > imageWindow.eagerUntil;

      return (
        <MemoryCard
          item={record}
          onPress={onPressItem}
          enableImageLoad={enableImageLoad}
          deferImageLoad={shouldDeferImage}
          isFocused={focusedMemoryId === item}
          onFocusedLayout={onFocusedItemLayout}
        />
      );
    },
    [
      focusedMemoryId,
      imageWindow,
      onFocusedItemLayout,
      onPressItem,
      recordsById,
    ],
  );

  const keyExtractor = useCallback((itemId: string) => itemId, []);
  const getItemType = useCallback(() => 'memory', []);

  const listFooterComponent = useMemo(() => {
    if (timelineIds.length === 0) return null;

    if (status === 'loadingMore') {
      return (
        <View style={styles.footer}>
          <ActivityIndicator />
          <AppText preset="caption" style={styles.footerText}>
            더 불러오는 중...
          </AppText>
        </View>
      );
    }

    if (status === 'ready' && !hasMore) {
      return (
        <View style={styles.footer}>
          <AppText preset="caption" style={styles.footerText}>
            마지막 기록이에요
          </AppText>
        </View>
      );
    }

    return <View style={{ height: 18 }} />;
  }, [hasMore, status, timelineIds.length]);

  const listEmptyComponent = useMemo(() => {
    if (status === 'loading' || status === 'idle') {
      return (
        <View style={styles.empty}>
          <ActivityIndicator />
          <AppText preset="body" style={styles.emptyDesc}>
            기록을 불러오는 중이에요.
          </AppText>
        </View>
      );
    }

    if (status === 'error') {
      return (
        <View style={styles.empty}>
          <AppText preset="headline" style={styles.emptyTitle}>
            기록을 불러오지 못했어요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            네트워크를 확인한 뒤 다시 시도해 주세요.
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primary, { backgroundColor: petTheme.primary }]}
            onPress={onRefresh}
          >
            <AppText preset="body" style={styles.primaryText}>
              다시 불러오기
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <View style={styles.emptyHero}>
          <Image
            source={require('../../assets/logo/logo_v2.png')}
            style={styles.emptyPawImage}
            resizeMode="contain"
          />
        </View>
        <AppText preset="headline" style={styles.emptyTitle}>
          아직 남겨진 추억이 없어요
        </AppText>
        <AppText preset="body" style={styles.emptyDesc}>
          우리 아이와 함께한 반짝이는 순간을
        </AppText>
        <AppText preset="body" style={styles.emptyDesc}>
          첫 기록으로 천천히 시작해보세요
        </AppText>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primary, { backgroundColor: petTheme.primary }]}
          onPress={onPressCreate}
        >
          <AppText preset="body" style={styles.primaryIcon}>
            ✎
          </AppText>
          <AppText preset="body" style={styles.primaryText}>
            기록 시작하기
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }, [onPressCreate, onRefresh, petTheme.primary, status]);

  const listExtraData = useMemo(
    () => ({
      imageWindow,
      focusedMemoryId,
      timelineEntityVersion,
    }),
    [focusedMemoryId, imageWindow, timelineEntityVersion],
  );

  const onPressBack = useCallback(() => {
    navigation.navigate('HomeTab');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          navigation.navigate('HomeTab');
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [navigation]),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={onPressBack}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>
        <AppText preset="headline" style={styles.headerTitle}>
          타임라인
        </AppText>
        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.createBtn, { backgroundColor: petTheme.primary }]}
            onPress={onPressCreate}
          >
            <AppText preset="caption" style={styles.createText}>
              기록하기
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
      <ControlsBar
        sortLabel={sortLabel}
        monthLabel={monthLabel}
        mainCategory={mainCategory}
        categoryLabel={categoryLabel}
        onToggleSort={() =>
          setSortMode(prev => (prev === 'recent' ? 'oldest' : 'recent'))
        }
        onOpenMonthModal={() => setYmModalOpen(true)}
        onPressMainCategory={onPressMainCategory}
        theme={petTheme}
      />

      <FlashList
        ref={listRef}
        data={filteredIds}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        drawDistance={TIMELINE_ITEM_HEIGHT * TIMELINE_WINDOW_SIZE}
        getItemType={getItemType}
        extraData={listExtraData}
        contentContainerStyle={
          filteredIds.length ? styles.list : styles.listEmpty
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        onViewableItemsChanged={onViewableItemsChanged}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={listEmptyComponent}
        removeClippedSubviews
        onContentSizeChange={() => {
          consumeFocusedMemory();
        }}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={ymModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYmModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setYmModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <AppText
              preset="headline"
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              월/연도 선택
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.modalItem, { borderColor: theme.colors.border }]}
              onPress={() => jumpToYm(null)}
            >
              <AppText
                preset="body"
                style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
              >
                전체 보기
              </AppText>
            </TouchableOpacity>

            {availableYmList.map(ym => (
              <TouchableOpacity
                key={ym}
                activeOpacity={0.9}
                style={[styles.modalItem, { borderColor: theme.colors.border }]}
                onPress={() => jumpToYm(ym)}
              >
                <AppText
                  preset="body"
                  style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
                >
                  {humanizeTimelineMonthKey(ym)}
                </AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={otherModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setOtherModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <AppText
              preset="headline"
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              생활 카테고리
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.modalItem, { borderColor: theme.colors.border }]}
              onPress={clearOtherSub}
            >
              <AppText
                preset="body"
                style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
              >
                전체 보기
              </AppText>
            </TouchableOpacity>

            {OTHER_SUBCATEGORY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.9}
                style={[styles.modalItem, { borderColor: theme.colors.border }]}
                onPress={() => applyOtherSub(option.key)}
              >
                <AppText
                  preset="body"
                  style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
                >
                  {option.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

```

---

## FILE: `src/screens/Records/RecordCreateScreen.styles.ts`

원본 경로: `src/screens/Records/RecordCreateScreen.styles.ts`

```ts
import { StyleSheet } from 'react-native';

const BRAND = '#6D6AF8';
const BRAND_DARK = '#5753E6';
const TEXT = '#111827';
const MUTED = '#97A2B6';
const BORDER = '#E5EAF3';
const BG = '#F7F8FB';
const CARD = '#FFFFFF';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,39,0.04)',
  },
  headerSideSlot: {
    width: 56,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideBtn: {
    minWidth: 52,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: TEXT,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerDoneText: {
    color: BRAND,
    fontWeight: '900',
    textAlign: 'right',
  },
  headerDoneTextDisabled: {
    color: '#C8CFDC',
  },

  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },

  dateCard: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F1F4F9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.08)',
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    color: '#616D82',
    fontWeight: '800',
  },
  dateInput: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    color: TEXT,
  },

  photoBox: {
    marginTop: 20,
  },
  photoStage: {
    height: 222,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D9E1EE',
    backgroundColor: '#F6F8FC',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  photoPlaceholderTouch: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderTitle: {
    color: '#B0B9C8',
    fontWeight: '800',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayTop: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  photoGhostBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGhostBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  photoThumbRow: {
    marginTop: 10,
    gap: 10,
    paddingHorizontal: 2,
  },
  photoThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(17,24,39,0.06)',
    overflow: 'hidden',
  },
  photoThumbWrapActive: {
    borderColor: BRAND,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },

  quickTagRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickTagItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickTagIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTagIconWrapActive: {
    backgroundColor: BRAND,
    shadowColor: BRAND_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  quickTagLabel: {
    color: MUTED,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickTagLabelActive: {
    color: BRAND,
  },
  quickTagHint: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  quickTagHintText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },
  otherSubRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  otherSubChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSubChipActive: {
    borderColor: 'rgba(109,106,248,0.22)',
    backgroundColor: 'rgba(109,106,248,0.08)',
  },
  otherSubChipText: {
    color: '#778297',
    fontWeight: '800',
  },
  otherSubChipTextActive: {
    color: BRAND_DARK,
  },
  otherSubClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: {
    marginTop: 24,
    gap: 10,
  },
  fieldLabel: {
    color: TEXT,
    fontWeight: '900',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    width: '23%',
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  moodChipActive: {
    backgroundColor: 'rgba(109,106,248,0.10)',
    borderColor: 'rgba(109,106,248,0.24)',
  },
  moodEmoji: {
    color: '#556070',
    fontWeight: '700',
  },
  moodText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  moodTextActive: {
    color: BRAND_DARK,
  },
  input: {
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TEXT,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 14,
  },
  helperText: {
    color: '#A2ACBC',
    fontWeight: '700',
  },
  tagSelector: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tagPlaceholder: {
    flex: 1,
    color: '#B5BDCB',
  },
  selectedTagsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  selectedTagText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },

  bottomSubmitBtn: {
    marginTop: 28,
    height: 54,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bottomSubmitBtnDisabled: {
    backgroundColor: '#C9CFDB',
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomSubmitText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.28)',
    paddingHorizontal: 20,
  },
  modalDismissZone: {
    ...StyleSheet.absoluteFillObject,
  },
  tagModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  tagModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  tagModalTitle: {
    color: TEXT,
    fontWeight: '900',
  },
  tagModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInputRow: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagModalInput: {
    flex: 1,
    color: TEXT,
    paddingVertical: 12,
  },
  dateShortcutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dateShortcutChip: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F4F6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateShortcutChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  dateShortcutText: {
    color: '#95A0B4',
    fontWeight: '800',
  },
  dateShortcutTextActive: {
    color: BRAND_DARK,
  },
  tagSectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: '#9BA6B7',
    fontWeight: '800',
  },
  tagSectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagSectionTitleCompact: {
    color: '#9BA6B7',
    fontWeight: '800',
  },
  clearRecentText: {
    color: '#7A71F4',
    fontWeight: '800',
  },
  clearRecentTextDisabled: {
    color: '#C2C9D6',
  },
  tagChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F4F6FB',
  },
  suggestChipText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },
  recentList: {
    gap: 10,
  },
  recentItem: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBFCFE',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.04)',
  },
  recentItemText: {
    color: '#697488',
    fontWeight: '800',
  },
  selectedModalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  selectedModalChipText: {
    color: BRAND_DARK,
    fontWeight: '800',
  },
  addTagBtn: {
    marginTop: 24,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

```

---

## FILE: `src/screens/Records/RecordCreateScreen.tsx`

원본 경로: `src/screens/Records/RecordCreateScreen.tsx`

```tsx
// 파일: src/screens/Records/RecordCreateScreen.tsx
// 파일 목적:
// - 반려동물 기록을 작성하고, 저장 직후 홈/타임라인에 즉시 반영하는 작성 화면이다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 `RecordCreateTab`과 날씨 활동 기록/홈/타임라인 CTA에서 공통 작성 화면으로 사용된다.
// 핵심 역할:
// - 텍스트/감정/카테고리/가격/날짜/이미지 입력을 수집해 `createMemory`를 호출한다.
// - draft 복구, 낙관적 store 반영, 업로드 큐 등록, 작성 후 복귀 경로 처리까지 담당한다.
// 데이터·상태 흐름:
// - 메모리 본문은 Supabase에 먼저 저장하고, 이미지 업로드는 local upload queue가 이어받아 비동기 복구를 지원한다.
// - 저장 직후 recordStore를 먼저 갱신해 홈/타임라인이 즉시 같은 엔티티를 보도록 만든다.
// 수정 시 주의:
// - returnTo와 탭 복귀 규칙은 하단 탭/More 드로어 흐름과 연결돼 있으므로 독립적으로 바꾸면 안 된다.
// - 이미지 업로드는 저장과 분리돼 있어, 폼 성공과 업로드 완료를 같은 시점으로 가정하면 상태가 꼬일 수 있다.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Image, TextInput, TouchableOpacity, View } from 'react-native';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import RecordImageGallery from '../../components/records/RecordImageGallery';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  buildPickedRecordImages,
  formatRecordKoreanDate,
  formatRecordPriceLabel,
  isShoppingRecordCategory,
  mergeRecordTags,
  parseRecordTags,
  parseRecordPrice,
  RECORD_EMOTION_OPTIONS,
  RECORD_MAIN_CATEGORIES,
  RECORD_OTHER_SUBCATEGORIES,
  normalizeRecordPriceInput,
  toRecordYmd,
  type PickedRecordImage,
  type RecordMainCategoryKey,
  type RecordOtherSubCategoryKey,
  validateRecordOccurredAt,
} from '../../services/records/form';
import { normalizeMemoryRecord } from '../../services/records/imageSources';
import {
  clearRecordCreateDraft,
  loadRecordCreateDraft,
  saveRecordCreateDraft,
} from '../../services/local/recordDraft';
import {
  enqueuePendingMemoryUpload,
  processPendingMemoryUploads,
  type PendingMemoryUploadEntry,
} from '../../services/local/uploadQueue';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  type EmotionTag,
  fetchMemoryById,
  type MemoryRecord,
} from '../../services/supabase/memories';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { showToast } from '../../store/uiStore';
import { openMoreDrawer } from '../../store/uiStore';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import RecordTagModal from './components/RecordTagModal';
import { styles } from './RecordCreateScreen.styles';

type RecordCreateTabRoute = RouteProp<AppTabParamList, 'RecordCreateTab'>;
type RecordCreateTabNav = BottomTabNavigationProp<
  AppTabParamList,
  'RecordCreateTab'
>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<RecordCreateTabNav, RootNav>;

export default function RecordCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RecordCreateTabRoute>();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const refresh = useRecordStore(s => s.refresh);
  const setFocusedMemoryId = useRecordStore(s => s.setFocusedMemoryId);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);

  const petIdFromParams = route.params?.petId ?? null;
  const returnTo = route.params?.returnTo;

  const petId = useMemo(() => {
    return resolveSelectedPetId(pets, selectedPetId, petIdFromParams);
  }, [petIdFromParams, selectedPetId, pets]);
  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const todayYmd = useMemo(() => toRecordYmd(new Date()), []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayYmd);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [mainCategoryKey, setMainCategoryKey] =
    useState<RecordMainCategoryKey>('walk');
  const [otherSubCategoryKey, setOtherSubCategoryKey] =
    useState<RecordOtherSubCategoryKey | null>(null);
  const [priceText, setPriceText] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(
    null,
  );
  const [selectedImages, setSelectedImages] = useState<PickedRecordImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const draftLoadedRef = useRef(false);

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const disabled = saving || trimmedTitle.length === 0 || !petId;
  const selectedMainCategory = useMemo(
    () =>
      RECORD_MAIN_CATEGORIES.find(
        category => category.key === mainCategoryKey,
      ) ?? null,
    [mainCategoryKey],
  );
  const selectedOtherSubCategory = useMemo(
    () =>
      RECORD_OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey) ??
      null,
    [otherSubCategoryKey],
  );
  const isShoppingCategory = useMemo(
    () => isShoppingRecordCategory(mainCategoryKey, otherSubCategoryKey),
    [mainCategoryKey, otherSubCategoryKey],
  );
  const priceLabel = useMemo(
    () => formatRecordPriceLabel(parseRecordPrice(priceText)),
    [priceText],
  );
  const formattedDate = useMemo(
    () => formatRecordKoreanDate(occurredAt || todayYmd),
    [occurredAt, todayYmd],
  );
  const mergedPreviewTags = useMemo(
    () => mergeRecordTags(selectedTags, mainCategoryKey, otherSubCategoryKey),
    [selectedTags, mainCategoryKey, otherSubCategoryKey],
  );
  const activeImage = useMemo(
    () => selectedImages[activeImageIndex] ?? selectedImages[0] ?? null,
    [selectedImages, activeImageIndex],
  );
  const scrollBottomInset = useMemo(() => {
    return Math.max(insets.bottom + 240, keyboardInset + 140, 280);
  }, [insets.bottom, keyboardInset]);
  const bottomSubmitMargin = useMemo(() => {
    if (keyboardInset > 0) return Math.max(insets.bottom, 18) + 20;
    return Math.max(insets.bottom, 18);
  }, [insets.bottom, keyboardInset]);
  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setOccurredAt(todayYmd);
    setSelectedTags([]);
    setTagDraft('');
    setTagModalVisible(false);
    setMainCategoryKey('walk');
    setOtherSubCategoryKey(null);
    setPriceText('');
    setDateModalVisible(false);
    setSelectedEmotion(null);
    setSelectedImages([]);
    setActiveImageIndex(0);
    setSaving(false);
    setDraftHydrated(true);
  }, [todayYmd]);

  useEffect(() => {
    if (selectedImages.length === 0 && activeImageIndex !== 0) {
      setActiveImageIndex(0);
      return;
    }
    if (
      activeImageIndex >= selectedImages.length &&
      selectedImages.length > 0
    ) {
      setActiveImageIndex(selectedImages.length - 1);
    }
  }, [activeImageIndex, selectedImages.length]);

  useEffect(() => {
    let mounted = true;

    async function hydrateDraft() {
      if (draftLoadedRef.current) return;
      draftLoadedRef.current = true;

      try {
        const draft = await loadRecordCreateDraft();
        if (!mounted) return;

        if (draft) {
          setTitle(draft.title ?? '');
          setContent(draft.content ?? '');
          setOccurredAt(draft.occurredAt || todayYmd);
          setSelectedTags(
            Array.isArray(draft.selectedTags) ? draft.selectedTags : [],
          );
          setMainCategoryKey(draft.mainCategoryKey ?? 'walk');
          setOtherSubCategoryKey(draft.otherSubCategoryKey ?? null);
          setPriceText(normalizeRecordPriceInput(draft.priceText ?? ''));
          setSelectedEmotion(draft.selectedEmotion ?? null);
          setSelectedImages(
            Array.isArray(draft.selectedImages) ? draft.selectedImages : [],
          );
          setActiveImageIndex(0);
        }
      } finally {
        if (mounted) setDraftHydrated(true);
      }
    }

    hydrateDraft().catch(() => {
      if (mounted) setDraftHydrated(true);
    });

    return () => {
      mounted = false;
    };
  }, [todayYmd]);

  useEffect(() => {
    if (!draftHydrated || saving) return;

    const hasContent =
      title.trim().length > 0 ||
      content.trim().length > 0 ||
      selectedTags.length > 0 ||
      priceText.trim().length > 0 ||
      selectedImages.length > 0;

    if (!hasContent) {
      clearRecordCreateDraft().catch(() => {});
      return;
    }

    saveRecordCreateDraft({
      petId,
      title,
      content,
      occurredAt,
      selectedTags,
      mainCategoryKey,
      otherSubCategoryKey,
      priceText,
      selectedEmotion,
      selectedImages,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }, [
    content,
    draftHydrated,
    mainCategoryKey,
    occurredAt,
    otherSubCategoryKey,
    petId,
    priceText,
    saving,
    selectedEmotion,
    selectedImages,
    selectedTags,
    title,
  ]);

  const pickImage = useCallback(async () => {
    if (saving) return;

    try {
      const result = await pickPhotoAssets({
        selectionLimit: 10,
        quality: 0.9,
      });
      if (result.status === 'cancelled') return;

      const assets = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType ?? undefined,
        fileName: asset.fileName ?? undefined,
      }));

      setSelectedImages(prev => {
        return [
          ...prev,
          ...buildPickedRecordImages(assets, {
            existingUris: prev.map(image => image.uri),
            keyPrefix: `${Date.now()}`,
            limit: 10 - prev.length,
          }),
        ].slice(0, 10);
      });
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'image-pick',
      );
      showToast({ tone: 'error', title: alertTitle, message });
    }
  }, [saving]);

  const removeActiveImage = useCallback(() => {
    setSelectedImages(prev => {
      if (prev.length === 0) return prev;
      return prev.filter((_, index) => index !== activeImageIndex);
    });
  }, [activeImageIndex]);

  const navigateBackToOrigin = useCallback(() => {
    if (returnTo?.tab === 'TimelineTab') {
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: returnTo.params,
      });
      return;
    }

    if (returnTo?.tab === 'MoreTab') {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      openMoreDrawer();
      return;
    }

    if (returnTo?.tab === 'HomeTab') {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('AppTabs', { screen: 'HomeTab' });
  }, [navigation, returnTo]);

  const onPressCancel = useCallback(() => {
    clearRecordCreateDraft().catch(() => {});
    resetForm();
    navigateBackToOrigin();
  }, [navigateBackToOrigin, resetForm]);

  const onSelectMainCategory = useCallback((nextKey: RecordMainCategoryKey) => {
    setMainCategoryKey(nextKey);
    if (nextKey !== 'other') {
      setOtherSubCategoryKey(null);
      setPriceText('');
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: RecordOtherSubCategoryKey) => {
      setMainCategoryKey('other');
      setOtherSubCategoryKey(nextKey);
      if (nextKey !== 'shopping') {
        setPriceText('');
      }
    },
    [],
  );

  const clearOtherSubCategory = useCallback(() => {
    setOtherSubCategoryKey(null);
    setPriceText('');
  }, []);

  const onChangePriceText = useCallback((value: string) => {
    setPriceText(normalizeRecordPriceInput(value));
  }, []);

  const onOpenDateModal = useCallback(() => {
    setDateModalVisible(true);
  }, []);

  const onCloseDateModal = useCallback(() => {
    setDateModalVisible(false);
  }, []);

  const onConfirmDate = useCallback((nextDate: Date) => {
    setOccurredAt(toRecordYmd(nextDate));
    setDateModalVisible(false);
  }, []);

  const onOpenTagModal = useCallback(() => {
    setTagModalVisible(true);
  }, []);

  const onCloseTagModal = useCallback(() => {
    setTagModalVisible(false);
    setTagDraft('');
  }, []);

  const appendTag = useCallback((raw: string) => {
    const parsed = parseRecordTags(raw);
    if (!parsed.length) return;

    setSelectedTags(prev => {
      const next = [...prev];
      for (const tag of parsed) {
        if (!next.includes(tag)) next.push(tag);
      }
      return next.slice(0, 10);
    });
  }, []);

  const onSubmitDraftTag = useCallback(() => {
    appendTag(tagDraft);
    setTagDraft('');
  }, [appendTag, tagDraft]);

  const onRemoveTag = useCallback((target: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== target));
  }, []);

  const onSubmit = useCallback(async () => {
    if (disabled || !petId) return;

    try {
      setSaving(true);

      const occurred = validateRecordOccurredAt(occurredAt);
      const createdAt = new Date().toISOString();
      const mergedTags = mergeRecordTags(
        selectedTags,
        mainCategoryKey,
        otherSubCategoryKey,
      );
      const price = isShoppingCategory ? parseRecordPrice(priceText) : null;

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion: selectedEmotion,
        tags: mergedTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price,
        occurredAt: occurred,
        imagePath: null,
      });

      const optimisticRecord: MemoryRecord = normalizeMemoryRecord({
        id: memoryId,
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion: selectedEmotion,
        tags: mergedTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price,
        occurredAt: occurred,
        createdAt,
        imagePath: null,
        imagePaths: [],
        imageUrl: selectedImages[0]?.uri ?? null,
      });

      upsertOneLocal(petId, optimisticRecord);
      setFocusedMemoryId(petId, memoryId);

      (async () => {
        let latestLocal: MemoryRecord = optimisticRecord;
        let shouldHydrateFromServer = true;

        try {
          if (selectedImages.length > 0) {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data.user?.id ?? null;
            if (!userId) throw new Error('로그인 정보가 없습니다.');

            const finalEntries: PendingMemoryUploadEntry[] = selectedImages.map(
              image => ({
                kind: 'pending',
                key: image.key,
                uri: image.uri,
                mimeType: image.mimeType,
              }),
            );
            const queuedTask = await enqueuePendingMemoryUpload({
              userId,
              petId,
              memoryId,
              mode: 'create',
              finalEntries,
            });
            const queueResult = await processPendingMemoryUploads({ userId });

            if (!queueResult.succeededTaskIds.includes(queuedTask.taskId)) {
              shouldHydrateFromServer = false;
              showToast({
                tone: 'warning',
                title: '이미지 업로드 복구 대기',
                message:
                  '기록은 저장됐고 사진 업로드는 큐에서 이어서 처리합니다. 앱 복귀 시 자동 재시도됩니다.',
                durationMs: 3600,
              });
            }
          }

          if (shouldHydrateFromServer) {
            const created = await fetchMemoryById(memoryId);
            upsertOneLocal(petId, created);
            refresh(petId).catch(() => {});
          } else {
            upsertOneLocal(petId, latestLocal);
          }
        } catch {
          upsertOneLocal(petId, latestLocal);
        }
      })().catch(() => {});

      resetForm();
      await clearRecordCreateDraft();
      showToast({
        tone: 'success',
        title: '기록 저장 완료',
        message: '방금 기록을 먼저 반영했고, 상세에서 바로 확인할 수 있어요.',
      });
      navigation.navigate('TimelineTab', {
        screen: 'RecordDetail',
        params: { petId, memoryId },
      });
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'record-create',
      );
      Alert.alert(alertTitle, message);
      showToast({
        tone: 'error',
        title: alertTitle,
        message:
          '입력 중인 내용은 draft로 남겨둘게요. 네트워크가 안정되면 다시 저장해 주세요.',
        durationMs: 3200,
      });
    } finally {
      setSaving(false);
    }
  }, [
    content,
    disabled,
    isShoppingCategory,
    navigation,
    mainCategoryKey,
    otherSubCategoryKey,
    occurredAt,
    petId,
    priceText,
    refresh,
    resetForm,
    selectedEmotion,
    selectedImages,
    selectedTags,
    setFocusedMemoryId,
    trimmedTitle,
    upsertOneLocal,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={onPressCancel}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          기록하기
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.headerSideBtn}
            disabled={disabled}
            onPress={onSubmit}
          >
            <AppText
              preset="body"
              style={[
                styles.headerDoneText,
                !disabled ? { color: petTheme.primary } : null,
                disabled ? styles.headerDoneTextDisabled : null,
              ]}
            >
              {saving ? '저장중' : '완료'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(scrollBottomInset, 300) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={28}
        extraHeight={120}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.dateCard,
            {
              backgroundColor: petTheme.soft,
              borderColor: petTheme.border,
            },
          ]}
          onPress={onOpenDateModal}
        >
          <View style={styles.dateLeft}>
            <View style={styles.dateIconWrap}>
              <Feather name="calendar" size={16} color={petTheme.primary} />
            </View>
            <AppText preset="body" style={styles.dateText}>
              {formattedDate}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color="#C4CAD6" />
        </TouchableOpacity>

        <RecordImageGallery
          items={selectedImages}
          activeIndex={activeImageIndex}
          onChangeActiveIndex={setActiveImageIndex}
          containerStyle={styles.photoBox}
          stageStyle={styles.photoStage}
          emptyContent={
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.photoPlaceholderTouch}
              onPress={pickImage}
            >
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconBadge}>
                  <Feather name="camera" size={22} color="#94A1B5" />
                </View>
                <AppText preset="body" style={styles.photoPlaceholderTitle}>
                  사진 추가 (최대 10장)
                </AppText>
              </View>
            </TouchableOpacity>
          }
          mainContent={
            activeImage ? (
              <Image
                source={{ uri: activeImage.uri }}
                style={styles.photoImage}
              />
            ) : null
          }
          topOverlay={
            activeImage ? (
              <View style={styles.photoOverlayTop}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.photoGhostBtn}
                  onPress={pickImage}
                >
                  <AppText preset="caption" style={styles.photoGhostBtnText}>
                    추가
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.photoGhostBtn}
                  onPress={removeActiveImage}
                >
                  <AppText preset="caption" style={styles.photoGhostBtnText}>
                    제거
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null
          }
          thumbRowStyle={styles.photoThumbRow}
          thumbItemStyle={styles.photoThumbWrap}
          thumbItemActiveStyle={styles.photoThumbWrapActive}
          thumbImageStyle={styles.photoThumb}
        />

        <View style={styles.quickTagRow}>
          {RECORD_MAIN_CATEGORIES.map(category => {
            const active = category.key === mainCategoryKey;
            return (
              <TouchableOpacity
                key={category.key}
                activeOpacity={0.88}
                style={styles.quickTagItem}
                onPress={() => onSelectMainCategory(category.key)}
              >
                <View
                  style={[
                    styles.quickTagIconWrap,
                    active ? styles.quickTagIconWrapActive : null,
                    active
                      ? {
                          backgroundColor: petTheme.primary,
                          shadowColor: petTheme.deep,
                        }
                      : null,
                  ]}
                >
                  <Feather
                    name={category.icon}
                    size={18}
                    color={active ? '#FFFFFF' : '#97A2B6'}
                  />
                </View>
                <AppText
                  preset="caption"
                  style={[
                    styles.quickTagLabel,
                    active ? styles.quickTagLabelActive : null,
                    active ? { color: petTheme.primary } : null,
                  ]}
                >
                  {category.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMainCategory ? (
          <View
            style={[styles.quickTagHint, { backgroundColor: petTheme.tint }]}
          >
            <AppText
              preset="caption"
              style={[styles.quickTagHintText, { color: petTheme.deep }]}
            >
              분류: {selectedMainCategory.label}
              {selectedOtherSubCategory
                ? ` · ${selectedOtherSubCategory.label}`
                : ''}
            </AppText>
          </View>
        ) : null}

        {mainCategoryKey === 'other' ? (
          <View style={styles.otherSubRow}>
            {RECORD_OTHER_SUBCATEGORIES.map(sub => {
              const active = sub.key === otherSubCategoryKey;
              return (
                <TouchableOpacity
                  key={sub.key}
                  activeOpacity={0.88}
                  style={[
                    styles.otherSubChip,
                    active ? styles.otherSubChipActive : null,
                    active
                      ? {
                          borderColor: petTheme.border,
                          backgroundColor: petTheme.tint,
                        }
                      : null,
                  ]}
                  onPress={() => onSelectOtherSubCategory(sub.key)}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.otherSubChipText,
                      active ? styles.otherSubChipTextActive : null,
                      active ? { color: petTheme.deep } : null,
                    ]}
                  >
                    {sub.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}

            {otherSubCategoryKey ? (
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.otherSubClearBtn}
                onPress={clearOtherSubCategory}
              >
                <Feather name="x" size={14} color="#9AA4B6" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isShoppingCategory ? (
          <View style={styles.field}>
            <AppText preset="body" style={styles.fieldLabel}>
              구매 가격
            </AppText>
            <TextInput
              style={styles.input}
              value={priceText}
              onChangeText={onChangePriceText}
              placeholder="예: 25000"
              placeholderTextColor="#8A94A6"
              keyboardType="number-pad"
              editable={!saving}
            />
            {priceLabel ? (
              <AppText preset="caption" style={styles.helperText}>
                저장 예정 금액: {priceLabel}
              </AppText>
            ) : (
              <AppText preset="caption" style={styles.helperText}>
                숫자만 입력하면 자동으로 원 단위로 저장돼요.
              </AppText>
            )}
          </View>
        ) : null}

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            오늘의 기분
          </AppText>
          <View style={styles.moodGrid}>
            {RECORD_EMOTION_OPTIONS.map(mood => {
              const active = selectedEmotion === mood.value;
              return (
                <TouchableOpacity
                  key={mood.value}
                  activeOpacity={0.88}
                  style={[
                    styles.moodChip,
                    active ? styles.moodChipActive : null,
                    active
                      ? {
                          backgroundColor: petTheme.tint,
                          borderColor: petTheme.border,
                        }
                      : null,
                  ]}
                  onPress={() =>
                    setSelectedEmotion(prev =>
                      prev === mood.value ? null : mood.value,
                    )
                  }
                >
                  <AppText preset="caption" style={styles.moodEmoji}>
                    {mood.emoji}
                  </AppText>
                  <AppText
                    preset="caption"
                    style={[
                      styles.moodText,
                      active ? styles.moodTextActive : null,
                      active ? { color: petTheme.deep } : null,
                    ]}
                  >
                    {mood.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            제목
          </AppText>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#B5BDCB"
          />
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            내용
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="오늘의 추억을 남겨주세요"
            placeholderTextColor="#B5BDCB"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            태그
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.tagSelector}
            onPress={onOpenTagModal}
          >
            {mergedPreviewTags.length ? (
              <View style={styles.selectedTagsWrap}>
                {mergedPreviewTags.map(tag => (
                  <View
                    key={tag}
                    style={[
                      styles.selectedTagChip,
                      { backgroundColor: petTheme.tint },
                    ]}
                  >
                    <AppText
                      preset="caption"
                      style={[styles.selectedTagText, { color: petTheme.deep }]}
                    >
                      {tag}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText preset="body" style={styles.tagPlaceholder}>
                태그를 추가하세요
              </AppText>
            )}
            <Feather name="chevron-right" size={18} color="#B5BDCB" />
          </TouchableOpacity>
          <AppText preset="caption" style={styles.helperText}>
            빠른 태그와 함께 최대 10개까지 저장됩니다.
          </AppText>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.bottomSubmitBtn,
            { marginBottom: bottomSubmitMargin },
            disabled ? styles.bottomSubmitBtnDisabled : null,
            !disabled
              ? {
                  backgroundColor: petTheme.primary,
                  shadowColor: petTheme.deep,
                }
              : null,
          ]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <AppText preset="body" style={styles.bottomSubmitText}>
            {saving ? '기록 저장 중...' : '완료'}
          </AppText>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <DatePickerModal
        visible={dateModalVisible}
        initialDate={occurredAt || todayYmd}
        onCancel={onCloseDateModal}
        onConfirm={onConfirmDate}
      />

      <RecordTagModal
        visible={tagModalVisible}
        tagDraft={tagDraft}
        selectedTags={selectedTags}
        onClose={onCloseTagModal}
        onChangeTagDraft={setTagDraft}
        onSubmitDraftTag={onSubmitDraftTag}
        onRemoveTag={onRemoveTag}
      />
    </View>
  );
}

```

---

## FILE: `src/screens/Records/RecordDetailScreen.styles.ts`

원본 경로: `src/screens/Records/RecordDetailScreen.styles.ts`

```ts
// 파일: src/screens/Records/RecordDetailScreen.styles.ts
// 역할:
// - 추억 상세 피드 화면의 인스타그램형 카드 레이아웃 스타일 정의
// - 상단 헤더, 피드 카드, 액션 메뉴, 삭제 확인 모달 톤을 한 곳에서 관리

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    width: '100%',
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#F6F7FB',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#111827',
    fontWeight: '800',
    textAlign: 'center',
  },
  headerLink: {
    width: '100%',
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#F6F7FB',
    alignItems: 'center',
  },
  headerLinkText: {
    color: '#111827',
    fontWeight: '800',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingTop: 10,
    paddingBottom: 120,
    gap: 12,
  },

  postCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8EBF2',
  },
  postHeader: {
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1E1D0',
  },
  postAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarFallbackText: {
    color: '#8B5E3C',
    fontWeight: '700',
  },
  postHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  postPetName: {
    color: '#101828',
    fontWeight: '700',
  },
  postMetaLine: {
    color: '#98A2B3',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  postMoreBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#EFF2F7',
  },
  postImageViewport: {
    width: '100%',
  },
  postImageSlide: {
    overflow: 'hidden',
    backgroundColor: '#EFF2F7',
  },
  postImagePager: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 46,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(12,18,32,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImagePagerText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  postImageFallback: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F2F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImageFallbackText: {
    color: '#9CA7B8',
    fontWeight: '700',
  },
  postActions: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  postBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 8,
  },
  postTitleText: {
    color: '#223047',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  postContentText: {
    color: '#445065',
    lineHeight: 22,
  },
  postMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postMoodEmoji: {
    color: '#111827',
  },
  postMoodLabel: {
    color: '#667085',
    fontWeight: '600',
  },
  postTagsText: {
    color: '#7B88A2',
    lineHeight: 18,
    fontWeight: '600',
  },
  postDateText: {
    color: '#9AA4B7',
    fontWeight: '600',
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheetDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAF1',
    overflow: 'hidden',
    paddingVertical: 10,
  },
  sheetActionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  sheetActionDivider: {
    height: 1,
    backgroundColor: '#EFF2F7',
  },
  sheetActionText: {
    color: '#243042',
    fontWeight: '700',
  },
  sheetActionDeleteText: {
    color: '#FF5A5F',
    fontWeight: '700',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  modalIconCircleDanger: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,77,79,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#0B1220',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#8A94A6',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.6,
  },
  modalGhostBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    backgroundColor: '#FFFFFF',
  },
  modalGhostBtnText: {
    color: '#667085',
    fontWeight: '700',
  },

  empty: {
    margin: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  emptyTitle: {
    color: '#0B1220',
    fontWeight: '800',
  },
  emptyDesc: {
    color: '#556070',
    textAlign: 'center',
  },
});

```

---

## FILE: `src/screens/Records/RecordDetailScreen.tsx`

원본 경로: `src/screens/Records/RecordDetailScreen.tsx`

```tsx
// 파일: src/screens/Records/RecordDetailScreen.tsx
// 역할:
// - 선택한 추억 1개를 집중해서 보여주는 상세 화면
// - 다중 이미지 캐러셀, 수정/삭제 액션, fallback fetch를 담당
// - 타임라인 목록과 상세 화면의 역할을 분리해 렌더 비용을 줄임

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import AppText from '../../app/ui/AppText';
import OptimizedImage from '../../components/images/OptimizedImage';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  formatRecordDisplayDate,
  formatRecordRelativeTime,
} from '../../services/records/date';
import { getMemoryImageRefs } from '../../services/records/imageSources';
import { formatRecordPriceLabel } from '../../services/records/form';
import type { MemoryRecord } from '../../services/supabase/memories';
import { deleteMemoryWithFile, fetchMemoryById } from '../../services/supabase/memories';
import { getMemoryImageSignedUrlsCached } from '../../services/supabase/storageMemories';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { styles } from './RecordDetailScreen.styles';

type TimelineNav = NativeStackNavigationProp<TimelineStackParamList, 'RecordDetail'>;
type Route = RouteProp<TimelineStackParamList, 'RecordDetail'>;
type PreviewImageSource = {
  key: string;
  uri: string;
};

const RELATED_IMAGE_HYDRATION_DELAY_MS = 140;
const DETAIL_EAGER_IMAGE_COUNT = 4;
function toPreviewImageSources(
  imagePaths: ReturnType<typeof getMemoryImageRefs>,
  urls: Array<string | null>,
  itemId: string,
) {
  return urls.flatMap((url, index) => {
    const uri = `${url ?? ''}`.trim();
    if (!uri) return [];
    return [
      {
        key: imagePaths[index]?.key ?? `${itemId}:${index}:${uri}`,
        uri,
      },
    ];
  });
}

const EMOTION_META: Record<
  string,
  {
    emoji: string;
    label: string;
  }
> = {
  happy: { emoji: '😊', label: '행복해요' },
  calm: { emoji: '😌', label: '평온해요' },
  excited: { emoji: '🤩', label: '신나요' },
  neutral: { emoji: '🙂', label: '무난해요' },
  sad: { emoji: '😢', label: '아쉬워요' },
  anxious: { emoji: '😥', label: '걱정돼요' },
  angry: { emoji: '😠', label: '예민해요' },
  tired: { emoji: '😴', label: '피곤해요' },
};

const FeedPostCard = memo(function FeedPostCard({
  item,
  petName,
  petAvatarUrl,
  onPressMore,
  imagePriority = 'primary',
}: {
  item: MemoryRecord;
  petName: string;
  petAvatarUrl: string | null;
  onPressMore: () => void;
  imagePriority?: 'primary' | 'related';
}) {
  const [previewImageSources, setPreviewImageSources] = useState<
    PreviewImageSource[]
  >([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const moodMeta = item.emotion ? EMOTION_META[item.emotion] : null;
  const imagePaths = useMemo(() => {
    return getMemoryImageRefs(item);
  }, [item]);

  useEffect(() => {
    let mounted = true;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let frameId: number | null = null;

    async function hydratePrimaryFirstImage() {
      if (imagePaths.length === 0) {
        if (mounted) setPreviewImageSources([]);
        return;
      }

      const firstImage = imagePaths[0];
      const firstUrls = await getMemoryImageSignedUrlsCached(
        firstImage ? [firstImage.value] : [],
      );
      if (!mounted) return;

      setPreviewImageSources(toPreviewImageSources(imagePaths, firstUrls, item.id));

      if (imagePaths.length <= 1) return;

      frameId = requestAnimationFrame(() => {
        const eagerRefs = imagePaths
          .slice(1, DETAIL_EAGER_IMAGE_COUNT)
          .map(image => image.value);
        getMemoryImageSignedUrlsCached(eagerRefs)
          .then(urls => {
            if (!mounted) return;
            const merged = toPreviewImageSources(
              imagePaths.slice(0, DETAIL_EAGER_IMAGE_COUNT),
              [firstUrls[0] ?? null, ...urls],
              item.id,
            );
            setPreviewImageSources(merged);

            if (imagePaths.length <= DETAIL_EAGER_IMAGE_COUNT) return;

            delayTimer = setTimeout(() => {
              getMemoryImageSignedUrlsCached(imagePaths.map(image => image.value))
                .then(allUrls => {
                  if (!mounted) return;
                  setPreviewImageSources(
                    toPreviewImageSources(imagePaths, allUrls, item.id),
                  );
                })
                .catch(() => null);
            }, RELATED_IMAGE_HYDRATION_DELAY_MS);
          })
          .catch(() => {
            if (mounted) {
              setPreviewImageSources(prev =>
                prev.length > 0 ? prev : [],
              );
            }
          });
      });
    }

    async function hydrateDeferredImages() {
      if (imagePaths.length === 0) {
        if (mounted) setPreviewImageSources([]);
        return;
      }

      const urls = await getMemoryImageSignedUrlsCached(
        imagePaths.map(image => image.value),
      );
      if (!mounted) return;

      setPreviewImageSources(toPreviewImageSources(imagePaths, urls, item.id));
    }

    if (imagePriority === 'primary') {
      hydratePrimaryFirstImage().catch(() => {
        if (mounted) setPreviewImageSources([]);
      });
    } else {
      delayTimer = setTimeout(() => {
        hydrateDeferredImages().catch(() => {
          if (mounted) setPreviewImageSources([]);
        });
      }, RELATED_IMAGE_HYDRATION_DELAY_MS);
    }

    return () => {
      mounted = false;
      if (delayTimer) clearTimeout(delayTimer);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [imagePaths, imagePriority, item.id]);

  useEffect(() => {
    if (imageIndex < previewImageSources.length) return;
    setImageIndex(0);
  }, [imageIndex, previewImageSources.length]);

  const displayDate = useMemo(
    () => formatRecordDisplayDate(item),
    [item],
  );
  const relativeTime = useMemo(
    () => formatRecordRelativeTime(item),
    [item],
  );
  const avatarFallback = useMemo(
    () => petName.trim().charAt(0) || 'N',
    [petName],
  );
  const contentText = useMemo(() => item.content?.trim() || '', [item.content]);
  const tagsText = useMemo(
    () => (item.tags.length > 0 ? item.tags.join(' ') : ''),
    [item.tags],
  );
  const priceText = useMemo(
    () => formatRecordPriceLabel(item.price),
    [item.price],
  );
  const slideWidth = useMemo(() => Math.max(carouselWidth, 1), [carouselWidth]);

  const onImageViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (!nextWidth || nextWidth === carouselWidth) return;
      setCarouselWidth(nextWidth);
    },
    [carouselWidth],
  );

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const width = event.nativeEvent.layoutMeasurement.width || slideWidth;
      if (!width) return;
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setImageIndex(nextIndex);
    },
    [slideWidth],
  );

  const renderPreviewImage = useCallback(
    ({ item: previewImage }: { item: PreviewImageSource }) => (
      <View style={[styles.postImageSlide, { width: slideWidth }]}>
        <OptimizedImage
          uri={previewImage.uri}
          style={styles.postImage}
          resizeMode="cover"
          priority={imagePriority === 'primary' ? 'high' : 'normal'}
        />
      </View>
    ),
    [imagePriority, slideWidth],
  );

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          {petAvatarUrl ? (
            <OptimizedImage
              uri={petAvatarUrl}
              style={styles.postAvatar}
              resizeMode="cover"
              priority="low"
            />
          ) : (
            <View style={[styles.postAvatar, styles.postAvatarFallback]}>
              <AppText preset="caption" style={styles.postAvatarFallbackText}>
                {avatarFallback}
              </AppText>
            </View>
          )}

          <View style={styles.postHeaderTextWrap}>
            <AppText preset="body" style={styles.postPetName}>
              {petName}
            </AppText>
            <AppText preset="caption" style={styles.postMetaLine}>
              {displayDate}
              {relativeTime ? ` · ${relativeTime}` : ''}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.postMoreBtn}
          onPress={onPressMore}
        >
          <Feather name="more-horizontal" size={18} color="#9CA6B7" />
        </TouchableOpacity>
      </View>

      {imagePaths.length > 1 ? (
        <View style={styles.postImageViewport} onLayout={onImageViewportLayout}>
          <FlashList
            data={previewImageSources}
            horizontal
            pagingEnabled
            keyExtractor={previewImage => previewImage.key}
            renderItem={renderPreviewImage}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            removeClippedSubviews={false}
          />
          <View style={styles.postImagePager}>
            <AppText preset="caption" style={styles.postImagePagerText}>
              {Math.min(imageIndex + 1, imagePaths.length)} / {imagePaths.length}
            </AppText>
          </View>
        </View>
      ) : previewImageSources.length === 1 ? (
        <OptimizedImage
          uri={previewImageSources[0].uri}
          style={styles.postImage}
          resizeMode="cover"
          priority={imagePriority === 'primary' ? 'high' : 'normal'}
        />
      ) : (
        <View style={styles.postImageFallback}>
          <AppText preset="caption" style={styles.postImageFallbackText}>
            사진이 없어요
          </AppText>
        </View>
      )}

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <Feather name="heart" size={20} color="#1C2434" />
          <Feather name="message-circle" size={20} color="#1C2434" />
          <Feather name="send" size={20} color="#1C2434" />
        </View>
        <Feather name="bookmark" size={20} color="#1C2434" />
      </View>

      <View style={styles.postBody}>
        <AppText preset="body" style={styles.postTitleText}>
          {item.title.trim()}
        </AppText>

        {contentText ? (
          <AppText preset="body" style={styles.postContentText}>
            {contentText}
          </AppText>
        ) : null}

        {moodMeta ? (
          <View style={styles.postMoodRow}>
            <AppText preset="caption" style={styles.postMoodEmoji}>
              {moodMeta.emoji}
            </AppText>
            <AppText preset="caption" style={styles.postMoodLabel}>
              {moodMeta.label}
            </AppText>
          </View>
        ) : null}

        {tagsText ? (
          <AppText preset="caption" style={styles.postTagsText}>
            {tagsText}
          </AppText>
        ) : null}

        {priceText ? (
          <AppText preset="caption" style={styles.postTagsText}>
            구매 가격 {priceText}
          </AppText>
        ) : null}

        <AppText preset="caption" style={styles.postDateText}>
          {displayDate}
        </AppText>

      </View>
    </View>
  );
});

export default function RecordDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<TimelineNav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId?.trim() || null;
  const memoryId = route.params?.memoryId?.trim() || null;

  const record = useRecordStore(s => s.selectRecordById(memoryId));
  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const pets = usePetStore(s => s.pets);

  const resolvedPetId = record?.petId?.trim() || petId;
  const selectedPet = useMemo(
    () => pets.find(item => item.id === resolvedPetId) ?? null,
    [pets, resolvedPetId],
  );
  const petName = useMemo(
    () => selectedPet?.name?.trim() || '우리 아이',
    [selectedPet?.name],
  );
  const petAvatarUrl = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );
  const [hydratingMissingRecord, setHydratingMissingRecord] = useState(
    () => Boolean(petId && memoryId && !record),
  );
  const [hydrateErrorMessage, setHydrateErrorMessage] = useState<string | null>(null);
  const [hydrateAttempt, setHydrateAttempt] = useState(0);

  const isRecordMissingError = useCallback((error: unknown) => {
    if (!error || typeof error !== 'object') return false;
    const message = 'message' in error ? String(error.message ?? '') : '';
    const code = 'code' in error ? String(error.code ?? '') : '';
    const details = 'details' in error ? String(error.details ?? '') : '';
    const joined = `${code} ${message} ${details}`.toLowerCase();
    return (
      joined.includes('pgrst116') ||
      joined.includes('json object requested') ||
      joined.includes('0 rows')
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrateMissingRecord() {
      if (mounted) setHydrateErrorMessage(null);
      if (!memoryId) {
        if (mounted) setHydratingMissingRecord(false);
        return;
      }
      if (record) {
        if (mounted) setHydratingMissingRecord(false);
        return;
      }
      try {
        const fetched = await fetchMemoryById(memoryId);
        if (!mounted) return;
        upsertOneLocal(fetched.petId, fetched);
      } catch (error) {
        if (!mounted) return;
        if (!isRecordMissingError(error)) {
          const { message } = getBrandedErrorMeta(error, 'generic');
          setHydrateErrorMessage(message);
        }
      } finally {
        if (mounted) setHydratingMissingRecord(false);
      }
    }

    hydrateMissingRecord();
    return () => {
      mounted = false;
    };
  }, [hydrateAttempt, isRecordMissingError, memoryId, record, upsertOneLocal]);

  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const openActionMenu = useCallback(() => {
    setActionMenuVisible(true);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);
  const hideActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);

  const onPressEdit = useCallback(() => {
    if (!resolvedPetId || !record) return;
    closeActionMenu();
    navigation.navigate('RecordEdit', { petId: resolvedPetId, memoryId: record.id });
  }, [closeActionMenu, navigation, record, resolvedPetId]);

  const onPressDelete = useCallback(() => {
    if (!resolvedPetId || !record) return;
    hideActionMenu();
    setDeleteModalVisible(true);
  }, [hideActionMenu, record, resolvedPetId]);
  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (!resolvedPetId || !record || deleting) return;

    try {
      setDeleting(true);
      await deleteMemoryWithFile({
        memoryId: record.id,
        imagePath: record.imagePath,
        imagePaths: record.imagePaths,
      });

      removeOneLocal(resolvedPetId, record.id);
      closeDeleteModal();

      navigation.navigate('TimelineMain', {
        petId: resolvedPetId,
        mainCategory: 'all',
      });
      refresh(resolvedPetId).catch(() => {});
    } catch (error: unknown) {
      const { title, message } = getBrandedErrorMeta(error, 'record-delete');
      Alert.alert(title, message);
    } finally {
      setDeleting(false);
    }
  }, [
    closeDeleteModal,
    deleting,
    navigation,
    record,
    refresh,
    removeOneLocal,
    resolvedPetId,
  ]);

  const renderFeedCard = useCallback(
    (item: MemoryRecord) => (
      <FeedPostCard
        item={item}
        petName={petName}
        petAvatarUrl={petAvatarUrl}
        onPressMore={openActionMenu}
        imagePriority="primary"
      />
    ),
    [openActionMenu, petAvatarUrl, petName],
  );

  const retryHydrateRecord = useCallback(() => {
    setHydrateErrorMessage(null);
    setHydratingMissingRecord(true);
    setHydrateAttempt(current => current + 1);
  }, []);

  if (!record && hydratingMissingRecord) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <AppText preset="headline" style={styles.headerTitle}>
            추억상세보기
          </AppText>
        </View>

        <View style={styles.empty}>
          <ActivityIndicator size="small" />
          <AppText preset="body" style={styles.emptyDesc}>
            기록을 불러오는 중이에요.
          </AppText>
        </View>

        <AppNavigationToolbar activeKey="timeline" />
      </View>
    );
  }

  if (!record) {
    if (hydrateErrorMessage) {
      return (
        <View style={styles.screen}>
          <View style={styles.header}>
            <AppText preset="headline" style={styles.headerTitle}>
              추억상세보기
            </AppText>
          </View>

          <View style={styles.empty}>
            <AppText preset="headline" style={styles.emptyTitle}>
              기록을 불러오지 못했어요
            </AppText>
            <AppText preset="body" style={styles.emptyDesc}>
              {hydrateErrorMessage}
            </AppText>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalPrimaryBtn}
              onPress={retryHydrateRecord}
            >
              <AppText preset="body" style={styles.modalPrimaryBtnText}>
                다시 시도
              </AppText>
            </TouchableOpacity>
          </View>

          <AppNavigationToolbar activeKey="timeline" />
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <AppText preset="headline" style={styles.headerTitle}>
            추억상세보기
          </AppText>
        </View>

        <View style={styles.empty}>
          <AppText preset="headline" style={styles.emptyTitle}>
            기록을 찾을 수 없어요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            목록으로 돌아가서 새로고침 해주세요.
          </AppText>
        </View>

        <AppNavigationToolbar activeKey="timeline" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.headerLink}
        onPress={() => navigation.goBack()}
      >
        <AppText preset="headline" style={styles.headerLinkText}>
          추억상세보기
        </AppText>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {renderFeedCard(record)}
      </ScrollView>

      <AppNavigationToolbar activeKey="timeline" />

      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <View
          style={[
            styles.sheetBackdrop,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <Pressable style={styles.sheetDismiss} onPress={closeActionMenu} />
          <View
            style={[
              styles.actionSheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.sheetActionRow}
              onPress={onPressEdit}
              disabled={deleting}
            >
              <Feather
                name="edit-2"
                size={18}
                color={theme.colors.textPrimary}
              />
              <AppText
                preset="body"
                style={[
                  styles.sheetActionText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                수정
              </AppText>
            </TouchableOpacity>

            <View
              style={[
                styles.sheetActionDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.sheetActionRow}
              onPress={onPressDelete}
              disabled={deleting}
            >
              <Feather name="trash-2" size={18} color="#FF5A5F" />
              <AppText preset="body" style={styles.sheetActionDeleteText}>
                {deleting ? '삭제 중' : '삭제'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View
          style={[
            styles.modalBackdrop,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surfaceElevated },
            ]}
          >
            <View style={styles.modalIconCircleDanger}>
              <Feather name="alert-triangle" size={20} color="#FF4D4F" />
            </View>

            <AppText
              preset="title2"
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              정말 삭제할까요?
            </AppText>
            <AppText
              preset="body"
              style={[styles.modalDesc, { color: theme.colors.textSecondary }]}
            >
              삭제된 추억은 다시 복구할 수 없어요.
            </AppText>
            <AppText
              preset="body"
              style={[styles.modalDesc, { color: theme.colors.textSecondary }]}
            >
              신중하게 선택해 주세요.
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalGhostBtn}
              onPress={closeDeleteModal}
              disabled={deleting}
            >
              <AppText
                preset="body"
                style={[
                  styles.modalGhostBtnText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                취소
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.modalPrimaryBtn,
                deleting ? styles.modalPrimaryBtnDisabled : null,
              ]}
              onPress={onConfirmDelete}
              disabled={deleting}
            >
              <AppText preset="body" style={styles.modalPrimaryBtnText}>
                {deleting ? '삭제 중...' : '삭제하기'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

```

---

## FILE: `src/screens/Records/RecordEditScreen.styles.ts`

원본 경로: `src/screens/Records/RecordEditScreen.styles.ts`

```ts
// 파일: src/screens/Records/RecordEditScreen.styles.ts
// 목적:
// - RecordEditScreen 스타일 분리 (화이트 + 퍼플 톤)

import { StyleSheet } from 'react-native';

const BRAND = '#6D7CFF';
const TEXT = '#0B1220';
const BORDER = '#E6E8F0';
const BG = '#F6F7FB';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 28 },

  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT,
    fontWeight: '900',
  },

  card: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // image
  heroWrap: { marginBottom: 12 },
  heroImg: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: { color: '#8A94A6', fontWeight: '800' },
  thumbRow: {
    marginTop: 10,
    gap: 8,
    paddingHorizontal: 2,
  },
  thumbItem: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F1F4F9',
  },
  thumbItemActive: {
    borderColor: BRAND,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  imgActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  imgBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgBtnPrimary: {
    borderColor: 'rgba(109,124,255,0.25)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  imgBtnDanger: {
    borderColor: 'rgba(255,77,79,0.20)',
    backgroundColor: 'rgba(255,77,79,0.10)',
  },
  imgBtnText: { color: TEXT, fontWeight: '900' },
  imgBtnDangerText: { color: '#FF4D4F', fontWeight: '900' },

  // form
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#556070',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    borderColor: 'rgba(109,124,255,0.24)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  categoryChipText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  categoryChipTextActive: {
    color: BRAND,
  },
  subCategoryGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  subCategoryChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCategoryChipActive: {
    borderColor: 'rgba(109,124,255,0.24)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  subCategoryChipText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  subCategoryChipTextActive: {
    color: BRAND,
  },
  subCategoryClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 8,
    color: '#7B879C',
    fontWeight: '700',
  },

  emotionGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    width: '23%',
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  moodChipActive: {
    backgroundColor: 'rgba(109,124,255,0.10)',
    borderColor: 'rgba(109,124,255,0.24)',
  },
  moodEmoji: {
    color: '#556070',
    fontWeight: '700',
  },
  moodText: {
    color: '#7B879C',
    fontWeight: '800',
  },
  moodTextActive: {
    color: BRAND,
  },

  primary: {
    marginTop: 14,
    backgroundColor: BRAND,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  ghost: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  ghostText: { color: '#556070', fontWeight: '700' },

  desc: { marginTop: 8, color: '#556070' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(109,124,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#0B1220',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#8A94A6',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6D6AF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#5D57E8',
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

```

---

## FILE: `src/screens/Records/RecordEditScreen.tsx`

원본 경로: `src/screens/Records/RecordEditScreen.tsx`

```tsx
// 파일: src/screens/Records/RecordEditScreen.tsx
// 목적:
// - 기존 memory 수정(완전체)
// - title / content / tags / emotion / occurredAt 수정
// - ✅ 이미지 교체(선택→업로드→DB path 업데이트→(선택)기존 파일 삭제)
// - ✅ 저장 후 "즉시 반영"(refresh 없이도 Detail/Timeline 바로 반영)
//   - updateOneLocal(patch)로 store를 먼저 갱신
//   - 필요하면 마지막에 refresh(petId)로 서버 정합만 맞춤(옵션)
//
// ✅ 안전 규칙
// 1) 기존 imagePath는 서버에서 fetchMemoryImagePath(memoryId)로 “진실”을 가져온다.
// 2) 새 이미지 업로드 성공 + DB 업데이트 성공 이후에만 기존 파일 삭제한다.
// 3) 새 이미지 업로드/DB 업데이트 중 실패하면 기존 이미지는 유지된다(데이터 보호).
// 4) UI 렌더는 imagePath → getMemoryImageSignedUrlCached() 규칙으로 고정.
// 5) “이미지 제거” 의도는 removeRequested 플래그로 관리한다.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';

import DatePickerModal from '../../components/date-picker/DatePickerModal';
import RecordImageGallery from '../../components/records/RecordImageGallery';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { TimelineScreenRoute } from '../../navigation/types';
import { createLatestRequestController } from '../../services/app/async';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  enqueuePendingMemoryUpload,
  processPendingMemoryUploads,
  type PendingMemoryUploadEntry,
} from '../../services/local/uploadQueue';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
} from '../../services/memories/categoryMeta';
import {
  buildPickedRecordImages,
  formatRecordKoreanDate,
  formatRecordPriceLabel,
  isShoppingRecordCategory,
  parseRecordTags,
  parseRecordPrice,
  RECORD_MAIN_CATEGORIES,
  RECORD_OTHER_SUBCATEGORIES,
  RECORD_EMOTION_OPTIONS,
  type RecordMainCategoryKey,
  type RecordOtherSubCategoryKey,
  normalizeRecordPriceInput,
  toRecordYmd,
  type PickedRecordImage,
  validateRecordOccurredAt,
} from '../../services/records/form';
import {
  fetchMemoryById,
  updateMemoryFields,
  type EmotionTag,
} from '../../services/supabase/memories';
import {
  getMemoryImageSignedUrlCached,
} from '../../services/supabase/storageMemories';
import { useAuthStore } from '../../store/authStore';
import { useRecordStore } from '../../store/recordStore';
import { showToast } from '../../store/uiStore';
import AppText from '../../app/ui/AppText';
import { styles } from './RecordEditScreen.styles';

type TimelineNav = NativeStackNavigationProp<TimelineStackParamList, 'RecordEdit'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<TimelineNav, RootNav>;
type Route = TimelineScreenRoute<'RecordEdit'>;

type AddedImage = PickedRecordImage;
type PreviewItem =
  | { kind: 'existing'; key: string; path: string; uri: string | null }
  | { kind: 'added'; key: string; uri: string };

export default function RecordEditScreen() {
  // ---------------------------------------------------------
  // 1) nav / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params.petId;
  const memoryId = route.params.memoryId;

  // ---------------------------------------------------------
  // 2) auth/store
  // ---------------------------------------------------------
  const userId = useAuthStore(s => s.session?.user?.id ?? null);

  const updateOneLocal = useRecordStore(s => s.updateOneLocal);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const setFocusedMemoryId = useRecordStore(s => s.setFocusedMemoryId);

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(r => r.id === memoryId) ?? null;
  }, [petState?.items, memoryId]);

  useEffect(() => {
    let mounted = true;

    async function hydrateMissingRecord() {
      if (!petId || !memoryId || record) return;
      try {
        const fetched = await fetchMemoryById(memoryId);
        if (!mounted) return;
        upsertOneLocal(petId, fetched);
      } catch {
        // 화면 하단 가드가 처리한다.
      }
    }

    hydrateMissingRecord();
    return () => {
      mounted = false;
    };
  }, [memoryId, petId, record, upsertOneLocal]);

  // ---------------------------------------------------------
  // 3) form state
  // ---------------------------------------------------------
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [emotion, setEmotion] = useState<EmotionTag | null>(null);
  const [mainCategoryKey, setMainCategoryKey] =
    useState<RecordMainCategoryKey>('walk');
  const [otherSubCategoryKey, setOtherSubCategoryKey] =
    useState<RecordOtherSubCategoryKey | null>(null);
  const [priceText, setPriceText] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    if (!record) return;
    if (dirty) return;

    setTitle(record.title ?? '');
    setContent(record.content ?? '');
    setOccurredAt(record.occurredAt ?? '');
    setTagsText(record.tags?.join(' ') ?? '');
    setEmotion(record.emotion ?? null);
    const nextMainCategory = normalizeCategoryKey(
      record.category ?? record.tags.join(' '),
    );
    setMainCategoryKey(nextMainCategory === 'all' ? 'walk' : nextMainCategory);
    setOtherSubCategoryKey(
      nextMainCategory === 'other'
        ? normalizeOtherSubKey(record.subCategory ?? record.tags.join(' '))
        : null,
    );
    setPriceText(
      typeof record.price === 'number' && Number.isFinite(record.price)
        ? `${record.price}`
        : '',
    );
  }, [record, dirty]);

  const selectedMainCategory = useMemo(
    () =>
      RECORD_MAIN_CATEGORIES.find(category => category.key === mainCategoryKey) ??
      null,
    [mainCategoryKey],
  );
  const selectedOtherSubCategory = useMemo(
    () =>
      RECORD_OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey) ??
      null,
    [otherSubCategoryKey],
  );
  const isShoppingCategory = useMemo(
    () => isShoppingRecordCategory(mainCategoryKey, otherSubCategoryKey),
    [mainCategoryKey, otherSubCategoryKey],
  );
  const priceLabel = useMemo(
    () => formatRecordPriceLabel(parseRecordPrice(priceText)),
    [priceText],
  );

  const occurredAtLabel = useMemo(() => {
    const normalized = validateRecordOccurredAt(occurredAt);
    if (!normalized) return '날짜를 선택해 주세요';
    return formatRecordKoreanDate(normalized);
  }, [occurredAt]);

  // ---------------------------------------------------------
  // 4) navigation helpers
  // ---------------------------------------------------------
  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('TimelineMain', { petId });
  }, [navigation, petId]);

  // ---------------------------------------------------------
  // 5) image state (preview + replace flow)
  // ---------------------------------------------------------
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [baseImagePaths, setBaseImagePaths] = useState<string[]>([]);
  const [removedPaths, setRemovedPaths] = useState<Set<string>>(new Set());
  const [addedImages, setAddedImages] = useState<AddedImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [signedByPath, setSignedByPath] = useState<Record<string, string | null>>(
    {},
  );

  useEffect(() => {
    if (!record) return;
    const nextPaths =
      record.imagePaths && record.imagePaths.length > 0
        ? record.imagePaths
        : record.imagePath
          ? [record.imagePath]
          : [];
    setBaseImagePaths(nextPaths);
    setRemovedPaths(new Set());
    setAddedImages([]);
    setActiveImageIndex(0);
  }, [record]);

  const visibleExistingPaths = useMemo(
    () => baseImagePaths.filter(path => !removedPaths.has(path)),
    [baseImagePaths, removedPaths],
  );

  useEffect(() => {
    const request = createLatestRequestController();

    async function run() {
      const requestId = request.begin();
      if (visibleExistingPaths.length === 0) {
        if (request.isCurrent(requestId)) {
          setSignedByPath({});
          setImgLoading(false);
        }
        return;
      }

      try {
        if (request.isCurrent(requestId)) setImgLoading(true);
        const urls = await Promise.all(
          visibleExistingPaths.map(async path => {
            const url = await getMemoryImageSignedUrlCached(path);
            return [path, url] as const;
          }),
        );
        if (!request.isCurrent(requestId)) return;
        const nextMap: Record<string, string | null> = {};
        for (const [path, url] of urls) nextMap[path] = url ?? null;
        setSignedByPath(nextMap);
      } catch {
        if (request.isCurrent(requestId)) setSignedByPath({});
      } finally {
        if (request.isCurrent(requestId)) setImgLoading(false);
      }
    }

    run();
    return () => {
      request.cancel();
    };
  }, [visibleExistingPaths]);

  const previewItems = useMemo<PreviewItem[]>(() => {
    const existing: PreviewItem[] = visibleExistingPaths.map(path => ({
      kind: 'existing',
      key: `e:${path}`,
      path,
      uri: signedByPath[path] ?? null,
    }));
    const added: PreviewItem[] = addedImages.map(img => ({
      kind: 'added',
      key: img.key,
      uri: img.uri,
    }));
    return [...existing, ...added];
  }, [visibleExistingPaths, signedByPath, addedImages]);

  const galleryItems = useMemo(
    () =>
      previewItems
        .map(item => ({
          key: item.key,
          uri: (item.uri ?? '').trim(),
        }))
        .filter(item => item.uri.length > 0),
    [previewItems],
  );

  const activeImageUri = useMemo(
    () => (previewItems[activeImageIndex]?.uri ?? '').trim(),
    [activeImageIndex, previewItems],
  );

  useEffect(() => {
    if (activeImageIndex < previewItems.length) return;
    setActiveImageIndex(previewItems.length > 0 ? previewItems.length - 1 : 0);
  }, [activeImageIndex, previewItems.length]);

  // ---------------------------------------------------------
  // 7) image actions
  // ---------------------------------------------------------
  const onPickImage = useCallback(async () => {
    if (saving) return;

    try {
      const result = await pickPhotoAssets({
        selectionLimit: 10,
        quality: 0.9,
      });
      if (result.status === 'cancelled') return;

      const assets = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType ?? undefined,
        fileName: asset.fileName ?? undefined,
      }));

      setDirty(true);
      setAddedImages(prev => {
        return [
          ...prev,
          ...buildPickedRecordImages(assets, {
            existingUris: prev.map(image => image.uri),
            keyPrefix: `a:${Date.now()}`,
            limit: 10 - prev.length,
          }),
        ].slice(0, 10);
      });
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'image-pick',
      );
      showToast({ tone: 'error', title: alertTitle, message });
    }
  }, [saving]);

  const openDateModal = useCallback(() => {
    if (saving) return;
    setDateModalVisible(true);
  }, [saving]);

  const closeDateModal = useCallback(() => {
    setDateModalVisible(false);
  }, []);

  const applyDateModal = useCallback((nextDate: Date) => {
    setDirty(true);
    setOccurredAt(toRecordYmd(nextDate));
    setDateModalVisible(false);
  }, []);

  const onSelectMainCategory = useCallback((nextKey: RecordMainCategoryKey) => {
    setDirty(true);
    setMainCategoryKey(nextKey);
    if (nextKey !== 'other') {
      setOtherSubCategoryKey(null);
      setPriceText('');
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: RecordOtherSubCategoryKey) => {
      setDirty(true);
      setMainCategoryKey('other');
      setOtherSubCategoryKey(nextKey);
      if (nextKey !== 'shopping') {
        setPriceText('');
      }
    },
    [],
  );

  const clearOtherSubCategory = useCallback(() => {
    setDirty(true);
    setOtherSubCategoryKey(null);
    setPriceText('');
  }, []);

  const onChangePriceText = useCallback((value: string) => {
    setDirty(true);
    setPriceText(normalizeRecordPriceInput(value));
  }, []);

  const onRemoveActiveImage = useCallback(() => {
    if (saving) return;
    const target = previewItems[activeImageIndex];
    if (!target) return;

    setDirty(true);
    if (target.kind === 'added') {
      setAddedImages(prev => prev.filter(i => i.key !== target.key));
      return;
    }

    setRemovedPaths(prev => {
      const next = new Set(prev);
      next.add(target.path);
      return next;
    });
  }, [saving, previewItems, activeImageIndex]);

  // ---------------------------------------------------------
  // 8) submit (text + image replace) ✅ 즉시 반영
  // ---------------------------------------------------------
  const onSubmit = useCallback(async () => {
    if (!petId || !memoryId) return;
    if (!record) return;

    const nextTitle = title.trim();
    if (!nextTitle) {
      Alert.alert('제목을 입력해 주세요.');
      return;
    }

    if (!userId) {
      Alert.alert('로그인 정보가 없어요', '다시 로그인 후 시도해 주세요.');
      return;
    }

    try {
      setSaving(true);

      // 1) 텍스트 저장
      const occurred = validateRecordOccurredAt(occurredAt);
      const nextContent = content.trim() || null;
      const nextTags = parseRecordTags(tagsText);
      const nextPrice = isShoppingCategory ? parseRecordPrice(priceText) : null;

      await updateMemoryFields({
        memoryId,
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price: nextPrice,
        occurredAt: occurred,
      });

      // ✅ 즉시 반영(텍스트)
      updateOneLocal(petId, memoryId, {
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price: nextPrice,
        occurredAt: occurred,
      });
      setFocusedMemoryId(petId, memoryId);

      // 2) 이미지 저장(다중)
      const imagePlanChanged =
        removedPaths.size > 0 || addedImages.length > 0;
      const keptExisting = baseImagePaths.filter(path => !removedPaths.has(path));
      const finalEntries: PendingMemoryUploadEntry[] = [
        ...keptExisting.map(path => ({ kind: 'existing' as const, path })),
        ...addedImages.map(image => ({
          kind: 'pending' as const,
          key: image.key,
          uri: image.uri,
          mimeType: image.mimeType,
        })),
      ];

      if (!imagePlanChanged) {
        setSuccessModalVisible(true);

        (async () => {
          try {
            const latest = await fetchMemoryById(memoryId);
            upsertOneLocal(petId, latest);
            setFocusedMemoryId(petId, memoryId);
            refresh(petId).catch(() => {});
          } catch {
            upsertOneLocal(petId, {
              ...record,
              title: nextTitle,
              content: nextContent,
              emotion,
              tags: nextTags,
              category: mainCategoryKey,
              subCategory: otherSubCategoryKey,
              price: nextPrice,
              occurredAt: occurred,
            });
            setFocusedMemoryId(petId, memoryId);
          }
        })().catch(() => {});
        return;
      }

      const queuedTask = await enqueuePendingMemoryUpload({
        userId,
        petId,
        memoryId,
        mode: 'edit',
        finalEntries,
      });
      const queueResult = await processPendingMemoryUploads({ userId });
      const imageSaveSucceeded = queueResult.succeededTaskIds.includes(
        queuedTask.taskId,
      );

      if (!imageSaveSucceeded) {
        showToast({
          tone: 'warning',
          title: '이미지 변경 복구 대기',
          message:
            '텍스트 변경은 저장됐고 사진 변경은 큐에서 이어서 처리합니다. 앱 복귀 시 자동 재시도됩니다.',
          durationMs: 3600,
        });
        navigation.goBack();
        return;
      }

      const latest = await fetchMemoryById(memoryId);
      upsertOneLocal(petId, latest);
      setFocusedMemoryId(petId, memoryId);
      setSuccessModalVisible(true);
      refresh(petId).catch(() => {});
    } catch (err) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        err,
        'record-update',
      );
      Alert.alert(alertTitle, message);
    } finally {
      setSaving(false);
    }
  }, [
    petId,
    memoryId,
    record,
    title,
    content,
    occurredAt,
    isShoppingCategory,
    mainCategoryKey,
    otherSubCategoryKey,
    priceText,
    emotion,
    tagsText,
    userId,
    addedImages,
    baseImagePaths,
    removedPaths,
    navigation,
    refresh,
    setFocusedMemoryId,
    updateOneLocal,
    upsertOneLocal,
  ]);

  const onConfirmSuccess = useCallback(() => {
    setSuccessModalVisible(false);
    setFocusedMemoryId(petId, memoryId);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('RecordDetail', { petId, memoryId });
  }, [memoryId, navigation, petId, setFocusedMemoryId]);

  // ---------------------------------------------------------
  // 9) guard
  // ---------------------------------------------------------
  if (!record) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <AppText preset="headline">기록을 찾을 수 없어요</AppText>
          <AppText preset="body" style={styles.desc}>
            목록으로 돌아가서 새로고침 해주세요.
          </AppText>

          <TouchableOpacity style={styles.ghost} onPress={safeGoBack}>
            <AppText preset="caption" style={styles.ghostText}>
              뒤로
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 10) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backBtn}
            onPress={safeGoBack}
            disabled={saving}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          기록 수정
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        enableOnAndroid
        extraScrollHeight={28}
        extraHeight={120}
      >
        <View style={styles.card}>
        {/* Image Preview */}
        <RecordImageGallery
          items={galleryItems}
          activeIndex={activeImageIndex}
          onChangeActiveIndex={setActiveImageIndex}
          containerStyle={styles.heroWrap}
          emptyContent={
            <View style={styles.heroPlaceholder}>
              <AppText preset="caption" style={styles.heroPlaceholderText}>
                NO IMAGE
              </AppText>
            </View>
          }
          mainContent={
            previewItems.length === 0 ? null : imgLoading ? (
              <View style={styles.heroPlaceholder}>
                <ActivityIndicator size="large" color="#8A94A6" />
              </View>
            ) : !activeImageUri ? (
              <View style={styles.heroPlaceholder}>
                <AppText preset="caption" style={styles.heroPlaceholderText}>
                  NO IMAGE
                </AppText>
              </View>
            ) : (
              <Image
                source={{ uri: activeImageUri }}
                style={styles.heroImg}
                resizeMode="cover"
                fadeDuration={250}
              />
            )
          }
          thumbRowStyle={styles.thumbRow}
          thumbItemStyle={styles.thumbItem}
          thumbItemActiveStyle={styles.thumbItemActive}
          thumbImageStyle={styles.thumbImage}
          footerActions={
            <View style={styles.imgActionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.imgBtn, styles.imgBtnPrimary]}
                onPress={onPickImage}
                disabled={saving}
              >
                <AppText preset="caption" style={styles.imgBtnText}>
                  사진 추가
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.imgBtn, styles.imgBtnDanger]}
                onPress={onRemoveActiveImage}
                disabled={saving || previewItems.length === 0}
              >
                <AppText preset="caption" style={styles.imgBtnDangerText}>
                  현재 사진 제거
                </AppText>
              </TouchableOpacity>
            </View>
          }
        />

        <AppText preset="caption" style={styles.label}>
          제목
        </AppText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={v => {
            setDirty(true);
            setTitle(v);
          }}
          placeholder="제목"
          placeholderTextColor="#8A94A6"
          editable={!saving}
        />

        <AppText preset="caption" style={styles.label}>
          내용(선택)
        </AppText>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={content ?? ''}
          onChangeText={v => {
            setDirty(true);
            setContent(v);
          }}
          placeholder="내용"
          placeholderTextColor="#8A94A6"
          multiline
          editable={!saving}
        />

        <AppText preset="caption" style={styles.label}>
          날짜(선택)
        </AppText>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.input}
          onPress={openDateModal}
          disabled={saving}
        >
          <AppText
            preset="body"
            style={{ color: occurredAt ? '#0B1220' : '#8A94A6' }}
          >
            {occurredAt ? occurredAtLabel : '날짜를 선택해 주세요'}
          </AppText>
        </TouchableOpacity>

        <AppText preset="caption" style={styles.label}>
          분류
        </AppText>
        <View style={styles.categoryGrid}>
          {RECORD_MAIN_CATEGORIES.map(category => {
            const active = category.key === mainCategoryKey;
            return (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  active ? styles.categoryChipActive : null,
                ]}
                onPress={() => onSelectMainCategory(category.key)}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                  ]}
                >
                  {category.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMainCategory ? (
          <AppText preset="caption" style={styles.helperText}>
            분류: {selectedMainCategory.label}
            {selectedOtherSubCategory ? ` · ${selectedOtherSubCategory.label}` : ''}
          </AppText>
        ) : null}

        {mainCategoryKey === 'other' ? (
          <View style={styles.subCategoryGrid}>
            {RECORD_OTHER_SUBCATEGORIES.map(sub => {
              const active = sub.key === otherSubCategoryKey;
              return (
                <TouchableOpacity
                  key={sub.key}
                  style={[
                    styles.subCategoryChip,
                    active ? styles.subCategoryChipActive : null,
                  ]}
                  onPress={() => onSelectOtherSubCategory(sub.key)}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.subCategoryChipText,
                      active ? styles.subCategoryChipTextActive : null,
                    ]}
                  >
                    {sub.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}

            {otherSubCategoryKey ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.subCategoryClearBtn}
                onPress={clearOtherSubCategory}
                disabled={saving}
              >
                <Feather name="x" size={14} color="#9AA4B6" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isShoppingCategory ? (
          <>
            <AppText preset="caption" style={styles.label}>
              구매 가격
            </AppText>
            <TextInput
              style={styles.input}
              value={priceText}
              onChangeText={onChangePriceText}
              placeholder="예: 25000"
              placeholderTextColor="#8A94A6"
              keyboardType="number-pad"
              editable={!saving}
            />
            <AppText preset="caption" style={styles.helperText}>
              {priceLabel
                ? `저장 예정 금액: ${priceLabel}`
                : '숫자만 입력하면 자동으로 원 단위로 저장돼요.'}
            </AppText>
          </>
        ) : null}

        <AppText preset="caption" style={styles.label}>
          태그(선택)
        </AppText>
        <TextInput
          style={styles.input}
          value={tagsText}
          onChangeText={v => {
            setDirty(true);
            setTagsText(v);
          }}
          placeholder="#산책 #간식 또는 산책,간식"
          placeholderTextColor="#8A94A6"
          editable={!saving}
        />

        <AppText preset="caption" style={styles.label}>
          감정(선택)
        </AppText>

        <View style={styles.emotionGrid}>
          {RECORD_EMOTION_OPTIONS.map(em => {
            const active = emotion === em.value;
            return (
              <TouchableOpacity
                key={em.value}
                style={[styles.moodChip, active ? styles.moodChipActive : null]}
                onPress={() => {
                  setDirty(true);
                  setEmotion(prev => (prev === em.value ? null : em.value));
                }}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText preset="caption" style={styles.moodEmoji}>
                  {em.emoji}
                </AppText>
                <AppText
                  preset="caption"
                  style={[styles.moodText, active ? styles.moodTextActive : null]}
                >
                  {em.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primary, saving ? styles.primaryDisabled : null]}
          onPress={onSubmit}
          disabled={saving}
          activeOpacity={0.9}
        >
          <AppText preset="body" style={styles.primaryText}>
            {saving ? '저장 중...' : '저장'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghost}
          onPress={safeGoBack}
          disabled={saving}
          activeOpacity={0.9}
        >
          <AppText preset="caption" style={styles.ghostText}>
            취소
          </AppText>
        </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onConfirmSuccess}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="check" size={22} color="#6D6AF8" />
            </View>

            <AppText preset="title2" style={styles.modalTitle}>
              수정이 완료되었어요!
            </AppText>
            <AppText preset="body" style={styles.modalDesc}>
              소중한 추억이 안전하게
            </AppText>
            <AppText preset="body" style={styles.modalDesc}>
              업데이트되었습니다.
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalPrimaryBtn}
              onPress={onConfirmSuccess}
            >
              <AppText preset="body" style={styles.modalPrimaryBtnText}>
                확인
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={dateModalVisible}
        initialDate={occurredAt || null}
        onCancel={closeDateModal}
        onConfirm={applyDateModal}
      />
    </View>
  );
}

```

---

## FILE: `src/screens/Records/components/RecordTagModal.tsx`

원본 경로: `src/screens/Records/components/RecordTagModal.tsx`

```tsx
// 파일: src/screens/Records/components/RecordTagModal.tsx
// 역할:
// - RecordCreateScreen에서 사용하는 태그 선택/추가 모달을 공통 컴포넌트로 분리
// - 직접 입력과 선택된 태그 제거 동선을 한 컴포넌트에서 관리

import React from 'react';
import { Modal, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { styles } from '../RecordCreateScreen.styles';

type Props = {
  visible: boolean;
  tagDraft: string;
  selectedTags: string[];
  onClose: () => void;
  onChangeTagDraft: (value: string) => void;
  onSubmitDraftTag: () => void;
  onRemoveTag: (tag: string) => void;
};

export default function RecordTagModal({
  visible,
  tagDraft,
  selectedTags,
  onClose,
  onChangeTagDraft,
  onSubmitDraftTag,
  onRemoveTag,
}: Props) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalDismissZone}
          onPress={onClose}
        />

        <View style={styles.tagModalCard}>
          <View style={styles.tagModalHeader}>
            <AppText preset="headline" style={styles.tagModalTitle}>
              태그 추가
            </AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.tagModalCloseBtn}
              onPress={onClose}
            >
              <Feather
                name="x"
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.tagInputRow}>
            <Feather name="hash" size={16} color={theme.colors.brand} />
            <TextInput
              style={styles.tagModalInput}
              value={tagDraft}
              onChangeText={onChangeTagDraft}
              placeholder="가을산책"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onSubmitDraftTag}
            />
          </View>

          {selectedTags.length ? (
            <>
              <AppText preset="caption" style={styles.tagSectionTitle}>
                선택된 태그
              </AppText>
              <View style={styles.tagChipGrid}>
                {selectedTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.88}
                    style={styles.selectedModalChip}
                    onPress={() => onRemoveTag(tag)}
                  >
                    <AppText
                      preset="caption"
                      style={styles.selectedModalChipText}
                    >
                      {tag}
                    </AppText>
                    <Feather name="x" size={12} color={theme.colors.brand} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

```

## 4. SQL 원문 전체

---

## SQL FILE: `docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql`

원본 경로: `docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql`

```sql
-- ============================================================
-- NURI FULL RELEASE MASTER SQL
-- ============================================================
-- 목적:
-- - 현재 앱 + 근시일 내 확장 도메인까지 한 번에 세팅하는 "전체판"
-- - 새 Supabase 프로젝트 기준으로 바로 실행 가능한 릴리즈용 마스터 SQL
-- - RLS / auth trigger / storage bucket / storage policy 포함
--
-- 성격:
-- - v1_release 보다 범위가 넓음
-- - 그러나 권한은 더 보수적으로 잠가서
--   "있어도 지금 당장 안 터지는" 방향으로 정리
--
-- 현재 앱과 맞춘 핵심:
-- - pets.profile_image_url = pet-profiles bucket path
-- - memories.image_url = memory-images bucket path
-- - pet-profiles = public bucket
-- - memory-images = private bucket + signed URL
-- ============================================================

begin;

-- ============================================================
-- 0) EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ============================================================
-- 1) ENUMS
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'pet_gender') then
    create type public.pet_gender as enum ('male', 'female', 'unknown');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'emotion_tag') then
    create type public.emotion_tag as enum (
      'happy',
      'calm',
      'excited',
      'neutral',
      'sad',
      'anxious',
      'angry',
      'tired'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recall_mode') then
    create type public.recall_mode as enum ('anniversary', 'random', 'emotion_based');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visibility') then
    create type public.visibility as enum ('public', 'private');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'system',
      'anniversary',
      'daily_recall',
      'community_comment',
      'community_like',
      'subscription',
      'schedule',
      'support'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum ('free', 'plus', 'pro');
  end if;
end $$;

-- ============================================================
-- 2) COMMON FUNCTIONS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_email text;
  raw_nickname text;
begin
  raw_email := new.email;

  raw_nickname := coalesce(
    new.raw_user_meta_data->>'nickname',
    split_part(coalesce(raw_email, 'user'), '@', 1)
  );

  insert into public.profiles (user_id, email, nickname, avatar_url)
  values (
    new.id,
    raw_email,
    raw_nickname,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 3) CORE
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  nickname citext not null,
  avatar_url text,
  locale text not null default 'ko-KR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint profiles_nickname_length_check
    check (char_length(btrim(nickname::text)) between 2 and 24)
);

create unique index if not exists uq_profiles_nickname
  on public.profiles (nickname);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  adoption_date date,
  weight_kg numeric(5,2),
  gender public.pet_gender not null default 'unknown',
  neutered boolean,
  breed text,
  profile_image_url text,
  theme_color text,
  likes text[] not null default '{}'::text[],
  dislikes text[] not null default '{}'::text[],
  hobbies text[] not null default '{}'::text[],
  personality_tags text[] not null default '{}'::text[],
  death_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint pets_name_length_check
    check (char_length(btrim(name)) between 1 and 40),
  constraint pets_weight_kg_check
    check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 999.99)),
  constraint pets_birth_before_death_check
    check (birth_date is null or death_date is null or birth_date <= death_date),
  constraint pets_adoption_before_death_check
    check (adoption_date is null or death_date is null or adoption_date <= death_date)
);

create index if not exists idx_pets_user_id
  on public.pets (user_id);
create index if not exists idx_pets_death_date
  on public.pets (death_date);

drop trigger if exists trg_pets_updated_at on public.pets;
create trigger trg_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

create or replace function public.owns_pet(target_pet_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.pets p
    where p.id = target_pet_id
      and p.user_id = auth.uid()
  );
$$;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  image_url text, -- 앱 현재 기준: memory-images bucket path
  title text not null,
  content text,
  emotion public.emotion_tag,
  tags text[] not null default '{}'::text[],
  category text,
  sub_category text,
  price integer,
  occurred_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint memories_title_length_check
    check (char_length(btrim(title)) between 1 and 100),
  constraint memories_content_length_check
    check (content is null or char_length(content) <= 5000),
  constraint memories_price_check
    check (price is null or price >= 0)
);

create index if not exists idx_memories_user_id
  on public.memories (user_id);
create index if not exists idx_memories_pet_id
  on public.memories (pet_id);
create index if not exists idx_memories_created_at
  on public.memories (created_at desc);
create index if not exists idx_memories_occurred_at
  on public.memories (occurred_at desc);

drop trigger if exists trg_memories_updated_at on public.memories;
create trigger trg_memories_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  content text not null,
  is_ai_generated boolean not null default false,
  ai_model text,
  ai_context jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint letters_content_length_check
    check (char_length(btrim(content)) between 1 and 5000)
);

create index if not exists idx_letters_user_id
  on public.letters (user_id);
create index if not exists idx_letters_pet_id
  on public.letters (pet_id);
create index if not exists idx_letters_created_at
  on public.letters (created_at desc);

-- ============================================================
-- 4) GROWTH
-- ============================================================
create table if not exists public.emotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  score numeric(5,2),
  primary_emotion public.emotion_tag,
  raw jsonb,
  analyzed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_emotions_user_pet
  on public.emotions (user_id, pet_id);
create index if not exists idx_emotions_analyzed_at
  on public.emotions (analyzed_at desc);

create table if not exists public.daily_recall (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  date date not null,
  memory_id uuid references public.memories(id) on delete set null,
  mode public.recall_mode not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, pet_id, date)
);

create index if not exists idx_daily_recall_user_pet_date
  on public.daily_recall (user_id, pet_id, date desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  date date not null,
  kind text not null,
  message text not null,
  model text,
  prompt jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, pet_id, date, kind),

  constraint ai_messages_kind_length_check
    check (char_length(btrim(kind)) between 1 and 50)
);

create index if not exists idx_ai_messages_user_pet_date
  on public.ai_messages (user_id, pet_id, date desc);

create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null,
  date date not null,
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, pet_id, type, date),

  constraint anniversaries_type_length_check
    check (char_length(btrim(type)) between 1 and 40)
);

create index if not exists idx_anniversaries_user_pet_date
  on public.anniversaries (user_id, pet_id, date desc);

-- ============================================================
-- 5) BILLING
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  store text,
  store_receipt text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subscriptions_user_id
  on public.subscriptions (user_id);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint billing_events_event_type_length_check
    check (char_length(btrim(event_type)) between 1 and 50)
);

create index if not exists idx_billing_events_user
  on public.billing_events (user_id, created_at desc);

-- ============================================================
-- 6) COMMUNITY
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  visibility public.visibility not null default 'public',
  content text not null,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint posts_content_length_check
    check (char_length(btrim(content)) between 1 and 5000)
);

create index if not exists idx_posts_visibility_created_at
  on public.posts (visibility, created_at desc);
create index if not exists idx_posts_user_created_at
  on public.posts (user_id, created_at desc);

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint comments_content_length_check
    check (char_length(btrim(content)) between 1 and 2000)
);

create index if not exists idx_comments_post_created_at
  on public.comments (post_id, created_at asc);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(post_id, user_id)
);

create index if not exists idx_likes_post
  on public.likes (post_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),

  constraint reports_target_type_check
    check (target_type in ('post', 'comment')),
  constraint reports_status_check
    check (status in ('open', 'resolved', 'rejected'))
);

create index if not exists idx_reports_status_created_at
  on public.reports (status, created_at desc);

-- ============================================================
-- 7) NOTIFICATIONS / AUDIT
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text,
  body text,
  reference jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint audit_logs_action_length_check
    check (char_length(btrim(action)) between 1 and 80)
);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

-- ============================================================
-- 8) SCHEDULES
-- ============================================================
create table if not exists public.pet_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,

  title text not null,
  note text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  category text not null,
  sub_category text,
  icon_key text not null,
  color_key text not null default 'brand',
  reminder_minutes integer[] not null default '{}',
  repeat_rule text not null default 'none',
  repeat_interval integer not null default 1,
  repeat_until timestamptz,
  linked_memory_id uuid references public.memories(id) on delete set null,
  completed_at timestamptz,
  source text not null default 'manual',
  external_calendar_id text,
  external_event_id text,
  sync_status text not null default 'local',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint pet_schedules_title_length_check
    check (char_length(btrim(title)) between 1 and 80),
  constraint pet_schedules_note_length_check
    check (note is null or char_length(note) <= 1000),
  constraint pet_schedules_time_range_check
    check (ends_at is null or ends_at >= starts_at),
  constraint pet_schedules_repeat_interval_check
    check (repeat_interval between 1 and 365),
  constraint pet_schedules_repeat_rule_check
    check (repeat_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  constraint pet_schedules_repeat_until_check
    check (
      (repeat_rule = 'none' and repeat_until is null)
      or (repeat_rule <> 'none' and (repeat_until is null or repeat_until >= starts_at))
    ),
  constraint pet_schedules_completed_at_check
    check (completed_at is null or completed_at >= starts_at),
  constraint pet_schedules_category_check
    check (category in ('walk', 'meal', 'health', 'grooming', 'diary', 'other')),
  constraint pet_schedules_sub_category_check
    check (
      sub_category is null
      or sub_category in (
        'vaccine', 'hospital', 'medicine', 'checkup',
        'bath', 'haircut', 'nail', 'meal-plan',
        'walk-routine', 'journal', 'etc'
      )
    ),
  constraint pet_schedules_icon_key_check
    check (
      icon_key in (
        'walk', 'meal', 'bowl', 'medical-bag', 'stethoscope',
        'syringe', 'pill', 'content-cut', 'shower', 'notebook',
        'heart', 'star', 'calendar', 'dots'
      )
    ),
  constraint pet_schedules_color_key_check
    check (color_key in ('brand', 'blue', 'green', 'orange', 'pink', 'yellow', 'gray')),
  constraint pet_schedules_source_check
    check (source in ('manual', 'google_calendar', 'apple_calendar', 'imported')),
  constraint pet_schedules_sync_status_check
    check (sync_status in ('local', 'synced', 'dirty', 'deleted')),
  constraint pet_schedules_all_day_check
    check (
      all_day = false
      or (
        date_trunc('day', starts_at) = starts_at
        and (ends_at is null or date_trunc('day', ends_at) = ends_at)
      )
    ),
  constraint pet_schedules_external_sync_check
    check (
      (
        source = 'manual'
        and external_calendar_id is null
        and external_event_id is null
      )
      or (
        source in ('google_calendar', 'apple_calendar', 'imported')
        and (
          (external_calendar_id is null and external_event_id is null)
          or (external_calendar_id is not null and external_event_id is not null)
        )
      )
    )
);

create index if not exists idx_pet_schedules_pet_id_starts_at
  on public.pet_schedules (pet_id, starts_at asc);
create index if not exists idx_pet_schedules_user_id_starts_at
  on public.pet_schedules (user_id, starts_at asc);
create index if not exists idx_pet_schedules_pet_id_category_starts_at
  on public.pet_schedules (pet_id, category, starts_at asc);
create index if not exists idx_pet_schedules_pet_id_completed_at
  on public.pet_schedules (pet_id, completed_at);
create index if not exists idx_pet_schedules_source_sync_status
  on public.pet_schedules (source, sync_status);

create unique index if not exists uq_pet_schedules_external_event
  on public.pet_schedules (user_id, source, external_calendar_id, external_event_id)
  where external_event_id is not null;

drop trigger if exists trg_pet_schedules_updated_at on public.pet_schedules;
create trigger trg_pet_schedules_updated_at
before update on public.pet_schedules
for each row execute function public.set_updated_at();

-- ============================================================
-- 9) RLS ENABLE
-- ============================================================
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.memories enable row level security;
alter table public.letters enable row level security;
alter table public.emotions enable row level security;
alter table public.daily_recall enable row level security;
alter table public.ai_messages enable row level security;
alter table public.anniversaries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.pet_schedules enable row level security;

-- ============================================================
-- 10) RLS POLICIES
-- ============================================================
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pets_crud_own" on public.pets;
create policy "pets_crud_own"
on public.pets for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "memories_crud_own" on public.memories;
create policy "memories_crud_own"
on public.memories for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "letters_crud_own" on public.letters;
create policy "letters_crud_own"
on public.letters for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "emotions_crud_own" on public.emotions;
create policy "emotions_crud_own"
on public.emotions for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "daily_recall_crud_own" on public.daily_recall;
create policy "daily_recall_crud_own"
on public.daily_recall for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "ai_messages_crud_own" on public.ai_messages;
create policy "ai_messages_crud_own"
on public.ai_messages for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "anniversaries_crud_own" on public.anniversaries;
create policy "anniversaries_crud_own"
on public.anniversaries for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "billing_events_select_own" on public.billing_events;
create policy "billing_events_select_own"
on public.billing_events for select
using (auth.uid() = user_id);

drop policy if exists "posts_select_public_or_own" on public.posts;
create policy "posts_select_public_or_own"
on public.posts for select
using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "posts_crud_own" on public.posts;
create policy "posts_crud_own"
on public.posts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "comments_select_by_post_visibility" on public.comments;
create policy "comments_select_by_post_visibility"
on public.comments for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (p.visibility = 'public' or p.user_id = auth.uid())
  )
  or comments.user_id = auth.uid()
);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
on public.comments for insert
with check (auth.uid() = user_id);

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
on public.comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
on public.comments for delete
using (auth.uid() = user_id);

drop policy if exists "likes_select_by_post_visibility" on public.likes;
create policy "likes_select_by_post_visibility"
on public.likes for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = likes.post_id
      and (p.visibility = 'public' or p.user_id = auth.uid())
  )
  or likes.user_id = auth.uid()
);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports for select
using (auth.uid() = reporter_id);

drop policy if exists "notifications_crud_own" on public.notifications;
create policy "notifications_crud_own"
on public.notifications for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
using (auth.uid() = user_id);

drop policy if exists "pet_schedules_crud_own" on public.pet_schedules;
create policy "pet_schedules_crud_own"
on public.pet_schedules for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

-- ============================================================
-- 11) AUTH TRIGGER
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 12) VIEW
-- ============================================================
create or replace view public.v_my_pets_with_days as
select
  p.*,
  case
    when p.adoption_date is null then null
    else current_date - p.adoption_date
  end as together_days
from public.pets p
where p.user_id = auth.uid();

-- ============================================================
-- 13) STORAGE
-- ============================================================
insert into storage.buckets (id, name, public)
values ('pet-profiles', 'pet-profiles', true)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('memory-images', 'memory-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "nuri_pet_profiles_insert_own" on storage.objects;
drop policy if exists "nuri_pet_profiles_update_own" on storage.objects;
drop policy if exists "nuri_pet_profiles_delete_own" on storage.objects;
drop policy if exists "nuri_memory_images_insert_own" on storage.objects;
drop policy if exists "nuri_memory_images_delete_own" on storage.objects;
drop policy if exists "nuri_memory_images_select_own" on storage.objects;

create policy "nuri_pet_profiles_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_pet_profiles_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_pet_profiles_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_memory_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_memory_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_memory_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

```

---

## SQL FILE: `docs/sql/공용-릴리즈-묶음/기능-추가/메모리-카테고리-서브카테고리-가격-추가.sql`

원본 경로: `docs/sql/공용-릴리즈-묶음/기능-추가/메모리-카테고리-서브카테고리-가격-추가.sql`

```sql
alter table public.memories
  add column if not exists category text,
  add column if not exists sub_category text,
  add column if not exists price integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memories_price_check'
  ) then
    alter table public.memories
      add constraint memories_price_check
      check (price is null or price >= 0);
  end if;
end
$$;

```

---

## SQL FILE: `docs/sql/마이그레이션/2026-03-05_메모리-이미지-URL-컬럼-추가.sql`

원본 경로: `docs/sql/마이그레이션/2026-03-05_메모리-이미지-URL-컬럼-추가.sql`

```sql
-- NURI migration: enable multi-image persistence for memories
-- Run in Supabase SQL Editor once.

alter table public.memories
  add column if not exists image_urls text[] not null default '{}'::text[];

update public.memories
set image_urls = case
  when coalesce(array_length(image_urls, 1), 0) > 0 then image_urls
  when image_url is not null and btrim(image_url) <> '' then array[image_url]
  else '{}'::text[]
end
where true;

create index if not exists idx_memories_image_urls_gin
  on public.memories using gin (image_urls);


```

---

## SQL FILE: `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

원본 경로: `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

```sql
begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'memory_image_status'
  ) then
    create type public.memory_image_status as enum ('pending', 'ready', 'failed');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.memory_images (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  sort_order integer not null,
  original_path text not null,
  timeline_thumb_path text,
  width integer,
  height integer,
  status public.memory_image_status not null default 'pending',
  retry_count integer not null default 0,
  last_error_code text,
  last_error_message text,
  last_processed_at timestamptz,
  processing_started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memory_images_sort_order_check
    check (sort_order >= 0),
  constraint memory_images_original_path_not_blank_check
    check (char_length(btrim(original_path)) > 0),
  constraint memory_images_timeline_thumb_path_not_blank_check
    check (timeline_thumb_path is null or char_length(btrim(timeline_thumb_path)) > 0),
  constraint memory_images_dimensions_check
    check (
      (width is null and height is null)
      or (width is not null and height is not null and width > 0 and height > 0)
    ),
  constraint memory_images_ready_requires_thumb_check
    check (
      status <> 'ready'
      or timeline_thumb_path is not null
    ),
  constraint memory_images_retry_count_check
    check (retry_count >= 0),
  constraint memory_images_last_error_code_not_blank_check
    check (
      last_error_code is null
      or char_length(btrim(last_error_code)) > 0
    ),
  constraint memory_images_last_error_message_not_blank_check
    check (
      last_error_message is null
      or char_length(btrim(last_error_message)) > 0
    ),
  constraint memory_images_unique_memory_sort_order
    unique (memory_id, sort_order),
  constraint memory_images_unique_memory_original_path
    unique (memory_id, original_path)
);

comment on table public.memory_images is
  '메모리 이미지 원본/타임라인 썸네일 분리 저장용 테이블';
comment on column public.memory_images.original_path is
  '상세 보기에서 사용하는 원본 이미지 storage path';
comment on column public.memory_images.timeline_thumb_path is
  '타임라인 목록에서 사용하는 저해상도 썸네일 storage path';
comment on column public.memory_images.status is
  'pending=썸네일 생성 대기, ready=사용 가능, failed=생성 실패';
comment on column public.memory_images.retry_count is
  '썸네일 worker 재시도 횟수';
comment on column public.memory_images.last_error_code is
  '마지막 실패 코드(original_not_found, storage_upload_failed 등)';
comment on column public.memory_images.last_error_message is
  '마지막 실패 상세 메시지';
comment on column public.memory_images.last_processed_at is
  'worker가 마지막으로 처리 시도한 시각';
comment on column public.memory_images.processing_started_at is
  '현재 또는 최근 처리 시작 시각(stuck job 회수 판단용)';

drop trigger if exists trg_memory_images_updated_at on public.memory_images;
create trigger trg_memory_images_updated_at
before update on public.memory_images
for each row
execute function public.set_updated_at();

create or replace function public.sync_memory_image_owner_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_memory public.memories%rowtype;
begin
  select *
    into v_memory
  from public.memories
  where id = new.memory_id;

  if not found then
    raise exception 'memory_id % does not exist', new.memory_id;
  end if;

  new.user_id := v_memory.user_id;
  new.pet_id := v_memory.pet_id;
  return new;
end;
$$;

drop trigger if exists trg_memory_images_sync_owner on public.memory_images;
create trigger trg_memory_images_sync_owner
before insert or update of memory_id
on public.memory_images
for each row
execute function public.sync_memory_image_owner_fields();

create index if not exists idx_memory_images_memory_id_sort_order
  on public.memory_images (memory_id, sort_order asc);

create index if not exists idx_memory_images_pet_id_created_at
  on public.memory_images (pet_id, created_at desc);

create index if not exists idx_memory_images_user_id_created_at
  on public.memory_images (user_id, created_at desc);

create index if not exists idx_memory_images_status_created_at
  on public.memory_images (status, created_at asc);

create index if not exists idx_memory_images_memory_id_ready_sort_order
  on public.memory_images (memory_id, sort_order asc)
  where status = 'ready' and timeline_thumb_path is not null;

create unique index if not exists idx_memory_images_unique_timeline_thumb_path_not_null
  on public.memory_images (timeline_thumb_path)
  where timeline_thumb_path is not null;

create index if not exists idx_memory_images_worker_pending
  on public.memory_images (status, created_at asc)
  where status = 'pending';

create index if not exists idx_memory_images_worker_failed_retry
  on public.memory_images (status, retry_count asc, last_processed_at asc)
  where status = 'failed';

create index if not exists idx_memory_images_worker_processing_started_at
  on public.memory_images (processing_started_at asc)
  where processing_started_at is not null;

create index if not exists idx_memory_images_worker_last_processed_at
  on public.memory_images (last_processed_at asc)
  where last_processed_at is not null;

alter table public.memory_images enable row level security;

drop policy if exists "memory_images_crud_own" on public.memory_images;
create policy "memory_images_crud_own"
on public.memory_images for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

create or replace view public.memory_timeline_primary_images
with (security_invoker = true)
as
select distinct on (mi.memory_id)
  mi.memory_id,
  mi.id as memory_image_id,
  mi.user_id,
  mi.pet_id,
  mi.sort_order,
  mi.original_path,
  mi.timeline_thumb_path,
  mi.status,
  mi.width,
  mi.height,
  mi.retry_count,
  mi.last_error_code,
  mi.last_processed_at,
  mi.processing_started_at,
  mi.created_at
from public.memory_images mi
order by mi.memory_id, mi.sort_order asc, mi.created_at asc;

comment on view public.memory_timeline_primary_images is
  '타임라인에서 memory_id 당 대표 이미지 1건만 조회하기 위한 뷰';

commit;

```
