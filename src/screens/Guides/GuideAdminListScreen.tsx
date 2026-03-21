import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import GuideAdminListCard from '../../components/guides/GuideAdminListCard';
import { useManagedPetCareGuideCatalog } from '../../hooks/useManagedPetCareGuideCatalog';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { formatGuideStatusLabel } from '../../services/guides/presentation';
import {
  filterManagedPetCareGuidesByStatus,
  filterPetCareGuidesBySearch,
} from '../../services/guides/service';
import type { GuideContentStatus } from '../../services/guides/types';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuideAdminList'>;
type StatusFilter = GuideContentStatus | 'all';

const STATUS_FILTERS: ReadonlyArray<StatusFilter> = [
  'all',
  'draft',
  'published',
  'archived',
];

const ItemSeparator = () => <View style={styles.separator} />;

export default function GuideAdminListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const role = useAuthStore(s => s.profile.role ?? 'user');
  const catalogState = useManagedPetCareGuideCatalog();
  const refreshCatalog = catalogState.refresh;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useFocusEffect(
    useCallback(() => {
      refreshCatalog().catch(() => {});
    }, [refreshCatalog]),
  );

  const filteredGuides = useMemo(() => {
    const statusApplied = filterManagedPetCareGuidesByStatus(
      catalogState.guides,
      statusFilter,
    );
    return filterPetCareGuidesBySearch(statusApplied, deferredSearchQuery);
  }, [catalogState.guides, deferredSearchQuery, statusFilter]);

  const headerTopInset = Math.max(insets.top, 12);
  const isGuideAdmin = role === 'admin' || role === 'super_admin';

  const onPressGuide = useCallback(
    (guideId: string) => {
      navigation.navigate('GuideAdminEditor', { mode: 'edit', guideId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof filteredGuides)[number] }) => (
      <GuideAdminListCard guide={item} onPress={onPressGuide} />
    ),
    [onPressGuide],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          가이드 운영
        </AppText>

        {isGuideAdmin ? (
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.createButton}
              onPress={() => navigation.navigate('GuideAdminEditor', { mode: 'create' })}
            >
              <Feather name="plus" size={16} color="#6D6AF8" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        )}
      </View>

      {!isGuideAdmin ? (
        <View style={styles.emptyCard}>
          <Feather name="shield-off" size={28} color="#6D6AF8" />
          <AppText preset="headline" style={styles.emptyTitle}>
            운영 권한이 필요해요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            관리자 또는 최고관리자 계정에서만 접근할 수 있어요.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.searchCard}>
            <View style={styles.searchInputWrap}>
              <Feather name="search" size={16} color="#98A1B2" />
              <TextInput
                value={searchQuery}
                onChangeText={value => {
                  startTransition(() => {
                    setSearchQuery(value);
                  });
                }}
                placeholder="제목, 태그, 카테고리, 종으로 검색"
                placeholderTextColor="#98A1B2"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            <View style={styles.filterRow}>
              {STATUS_FILTERS.map(item => {
                const active = item === statusFilter;
                return (
                  <Pressable
                    key={item}
                    style={[styles.filterChip, active ? styles.filterChipActive : null]}
                    onPress={() => setStatusFilter(item)}
                  >
                    <AppText
                      preset="caption"
                      style={[
                        styles.filterChipText,
                        active ? styles.filterChipTextActive : null,
                      ]}
                    >
                      {item === 'all' ? '전체' : formatGuideStatusLabel(item)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {catalogState.loading ? (
            <View style={styles.emptyCard}>
              <Feather name="loader" size={28} color="#6D6AF8" />
              <AppText preset="headline" style={styles.emptyTitle}>
                운영 목록을 불러오는 중이에요
              </AppText>
            </View>
          ) : catalogState.error ? (
            <View style={styles.emptyCard}>
              <Feather name="alert-circle" size={28} color="#6D6AF8" />
              <AppText preset="headline" style={styles.emptyTitle}>
                운영 목록을 불러오지 못했어요
              </AppText>
              <AppText preset="body" style={styles.emptyDesc}>
                {catalogState.error}
              </AppText>
            </View>
          ) : filteredGuides.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="book-open" size={28} color="#6D6AF8" />
              <AppText preset="headline" style={styles.emptyTitle}>
                조건에 맞는 가이드가 없어요
              </AppText>
              <AppText preset="body" style={styles.emptyDesc}>
                상태 필터를 바꾸거나 검색어를 지우고 다시 확인해 주세요.
              </AppText>
            </View>
          ) : (
            <FlatList
              data={filteredGuides}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={ItemSeparator}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = {
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const,
  },
  headerSideSlotRight: {
    alignItems: 'flex-end' as const,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center' as const,
    color: '#0B1220',
    fontWeight: '900' as const,
  },
  createButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  searchCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  searchInputWrap: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#F7F8FD',
    paddingHorizontal: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#0B1220',
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  filterRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F5FA',
  },
  filterChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  filterChipText: {
    color: '#556070',
    fontWeight: '800' as const,
  },
  filterChipTextActive: {
    color: '#6D6AF8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  separator: {
    height: 12,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center' as const,
    gap: 10,
  },
  emptyTitle: {
    color: '#0B1220',
    fontWeight: '900' as const,
    textAlign: 'center' as const,
  },
  emptyDesc: {
    color: '#556070',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
};
