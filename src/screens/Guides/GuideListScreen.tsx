import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import GuideListCard from '../../components/guides/GuideListCard';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { useGuidePopularSearches } from '../../hooks/useGuidePopularSearches';
import { usePetCareGuideCatalog } from '../../hooks/usePetCareGuideCatalog';
import { usePetCareGuideSearch } from '../../hooks/usePetCareGuideSearch';
import { useRecentPetCareGuideSearches } from '../../hooks/useRecentPetCareGuideSearches';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { getAgeInMonthsFromBirthDate } from '../../services/guides/agePolicy';
import { buildGuideEventMetadata } from '../../services/guides/analytics';
import {
  getGuideDataSourceDescription,
  getGuideDataSourceLabel,
} from '../../services/guides/source';
import { isLocalGuideSeedGuide } from '../../services/guides/seed';
import {
  filterPetCareGuidesForListAudience,
  recordPetCareGuideEvents,
  rankPetCareGuidesForList,
} from '../../services/guides/service';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';
import { styles } from './GuideListScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuideList'>;
type Route = RootScreenRoute<'GuideList'>;
const ItemSeparator = () => <View style={styles.separator} />;

export default function GuideListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const sessionUserId = useAuthStore(s => s.session?.user.id ?? null);
  const catalogState = usePetCareGuideCatalog();
  const recentSearchState = useRecentPetCareGuideSearches();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearchesExpanded, setRecentSearchesExpanded] = useState(false);
  const [popularSearchesExpanded, setPopularSearchesExpanded] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    if (!selectedPetId) return pets[0];
    return pets.find(pet => pet.id === selectedPetId) ?? pets[0];
  }, [pets, selectedPetId]);

  const species = selectedPet?.species ?? null;
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const speciesDetailKey = selectedPet?.speciesDetailKey ?? null;
  const speciesDisplayName = selectedPet?.speciesDisplayName ?? null;
  const birthDate = selectedPet?.birthDate ?? null;
  const ageInMonths = useMemo(
    () => getAgeInMonthsFromBirthDate(birthDate),
    [birthDate],
  );

  const filteredCatalogGuides = useMemo(
    () =>
      filterPetCareGuidesForListAudience(catalogState.guides, {
        species,
        speciesDetailKey,
        speciesDisplayName,
        birthDate,
      }),
    [birthDate, catalogState.guides, species, speciesDetailKey, speciesDisplayName],
  );
  const rankedGuides = useMemo(
    () =>
      rankPetCareGuidesForList(filteredCatalogGuides, {
        species,
        speciesDetailKey,
        speciesDisplayName,
        birthDate,
      }),
    [birthDate, filteredCatalogGuides, species, speciesDetailKey, speciesDisplayName],
  );
  const rankedGuideSignature = useMemo(
    () =>
      rankedGuides
        .map(guide => `${guide.id}:${guide.updatedAt}:${guide.priority}:${guide.sortOrder}`)
        .join('|'),
    [rankedGuides],
  );
  const trimmedSearchQuery = deferredSearchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;
  const searchState = usePetCareGuideSearch({
    query: trimmedSearchQuery,
    species,
    ageInMonths,
    fallbackCatalog: rankedGuides,
    catalogSignature: rankedGuideSignature,
    enabled: hasSearchQuery,
  });
  const popularSearchState = useGuidePopularSearches({
    species,
    fallbackCatalog: rankedGuides,
    catalogSignature: rankedGuideSignature,
    enabled: searchVisible,
  });

  const visibleGuides = hasSearchQuery ? searchState.guides : rankedGuides;
  const recentKeywords = useMemo(
    () => recentSearchState.searches.map(entry => entry.query),
    [recentSearchState.searches],
  );
  const popularKeywords = useMemo(
    () =>
      popularSearchState.keywords
        .map(item => item.keyword)
        .filter(keyword => !recentKeywords.includes(keyword))
        .slice(0, 6),
    [popularSearchState.keywords, recentKeywords],
  );
  const audienceLabel = useMemo(() => {
    return selectedPet?.speciesDisplayName?.trim() || '선택한 반려동물';
  }, [selectedPet?.speciesDisplayName]);
  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });
  const catalogSourceLabel = useMemo(() => {
    return getGuideDataSourceLabel(catalogState.source);
  }, [catalogState.source]);

  useEffect(() => {
    if (searchVisible) return;
    if (!searchQuery) return;

    startTransition(() => {
      setSearchQuery('');
    });
  }, [searchQuery, searchVisible]);

  useEffect(() => {
    if (!searchVisible) {
      setRecentSearchesExpanded(false);
      setPopularSearchesExpanded(false);
    }
  }, [searchVisible]);

  const rememberSearchQuery = useCallback(
    async (value: string) => {
      const normalized = value.trim().replace(/\s+/g, ' ');
      if (!normalized) return null;
      await recentSearchState.save(normalized);
      return normalized;
    },
    [recentSearchState],
  );

  const applySearchKeyword = useCallback(
    (value: string) => {
      const normalized = value.trim().replace(/\s+/g, ' ');
      if (!normalized) return;

      recentSearchState.save(normalized).catch(() => {});
      startTransition(() => {
        setSearchVisible(true);
        setSearchQuery(normalized);
      });
    },
    [recentSearchState],
  );

  const onPressGuide = useCallback(
    (guideId: string) => {
      const guide = visibleGuides.find(item => item.id === guideId) ?? null;
      const resultRank = guide
        ? visibleGuides.findIndex(item => item.id === guideId) + 1
        : null;

      if (trimmedSearchQuery) {
        rememberSearchQuery(trimmedSearchQuery).catch(() => {});
      }

      recordPetCareGuideEvents([
        {
          userId: sessionUserId,
          petId: selectedPet?.id ?? null,
          guideId,
          eventType: 'list_click',
          placement: 'guide-list',
          searchQuery: trimmedSearchQuery || null,
          contextSpeciesGroup: species,
          contextSpeciesDetailKey: speciesDetailKey,
          contextAgeInMonths: ageInMonths,
          metadata: guide
            ? buildGuideEventMetadata({
                guide,
                source: trimmedSearchQuery ? 'guide-search' : 'guide-list',
                searchSource: trimmedSearchQuery ? searchState.source : null,
                searchQuery: trimmedSearchQuery || null,
                resultRank,
                context: {
                  species,
                  speciesDetailKey,
                  speciesDisplayName,
                  birthDate,
                  deathDate: selectedPet?.deathDate ?? null,
                },
              })
            : undefined,
        },
      ]).catch(() => {});

      navigation.navigate('GuideDetail', { guideId });
    },
    [
      ageInMonths,
      navigation,
      rememberSearchQuery,
      selectedPet?.id,
      selectedPet?.deathDate,
      sessionUserId,
      speciesDisplayName,
      species,
      speciesDetailKey,
      birthDate,
      searchState.source,
      trimmedSearchQuery,
      visibleGuides,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof visibleGuides)[number] }) => (
      <GuideListCard
        guide={item}
        onPress={onPressGuide}
        debugBadgeText={
          __DEV__ && catalogState.source === 'local-seed' && isLocalGuideSeedGuide(item)
            ? '테스트 seed'
            : null
        }
      />
    ),
    [catalogState.source, onPressGuide],
  );

  const headerTopInset = Math.max(insets.top, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={onPressBack}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          집사 꿀팁 가이드
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <Pressable
            style={[
              styles.searchToggleButton,
              { backgroundColor: petTheme.tint },
            ]}
            onPress={() => {
              startTransition(() => {
                setSearchVisible(prev => !prev);
              });
            }}
          >
            <Feather name="search" size={18} color={petTheme.primary} />
          </Pressable>
        </View>
      </View>

      {searchVisible ? (
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
              onSubmitEditing={() => {
                rememberSearchQuery(searchQuery).catch(() => {});
              }}
              placeholder="제목, 태그, 카테고리, 종으로 검색"
              placeholderTextColor="#98A1B2"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable
                style={styles.searchClearButton}
                onPress={() => {
                  startTransition(() => {
                    setSearchQuery('');
                  });
                }}
              >
                <Feather name="x" size={15} color="#98A1B2" />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.searchMetaRow}>
            <AppText preset="caption" style={styles.searchMetaText}>
              {hasSearchQuery
                ? '검색어와 가장 가까운 가이드를 우선 보여드려요.'
                : '최근 검색어는 이 기기에 저장되고, 인기 검색어는 서버 기준으로 불러와요.'}
            </AppText>
            {__DEV__ ? (
              <View
                style={[
                  styles.debugBadge,
                  catalogState.source === 'local-seed'
                    ? styles.debugBadgeSeed
                    : catalogState.source === 'remote'
                      ? styles.debugBadgeRemote
                      : styles.debugBadgeEmpty,
                ]}
              >
                <AppText preset="caption" style={styles.debugBadgeText}>
                  {catalogSourceLabel}
                </AppText>
              </View>
            ) : null}
            {hasSearchQuery && searchState.loading ? (
              <AppText
                preset="caption"
                style={[styles.searchMetaLoadingText, { color: petTheme.primary }]}
              >
                검색 중
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}

      {searchVisible && !hasSearchQuery ? (
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionSection}>
            <Pressable
              style={styles.suggestionToggleButton}
              onPress={() => {
                startTransition(() => {
                  setRecentSearchesExpanded(prev => !prev);
                });
              }}
            >
              <View style={styles.suggestionToggleCopy}>
                <AppText preset="body" style={styles.suggestionTitle}>
                  최근 검색어
                </AppText>
                <AppText preset="caption" style={styles.suggestionToggleMeta}>
                  {recentKeywords.length > 0
                    ? `${recentKeywords.length}개 저장됨`
                    : '아직 저장된 검색어가 없어요'}
                </AppText>
              </View>
              <Feather
                name={recentSearchesExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#98A1B2"
              />
            </Pressable>
            {recentSearchesExpanded ? (
              recentKeywords.length === 0 ? (
                <AppText preset="caption" style={styles.suggestionEmptyText}>
                  원하는 키워드를 검색하면 여기에 쌓여요.
                </AppText>
              ) : (
                <>
                  <View style={styles.suggestionActionRow}>
                    <AppText preset="caption" style={styles.suggestionHelperText}>
                      최근에 찾았던 키워드를 빠르게 다시 열 수 있어요.
                    </AppText>
                    <Pressable
                      onPress={() => {
                        recentSearchState.clear().catch(() => {});
                      }}
                    >
                      <AppText preset="caption" style={styles.suggestionActionText}>
                        모두 지우기
                      </AppText>
                    </Pressable>
                  </View>
                  <View style={styles.chipWrap}>
                    {recentKeywords.map(keyword => (
                      <Pressable
                        key={`recent-${keyword}`}
                        style={[
                          styles.chipButton,
                          styles.chipButtonActive,
                          {
                            backgroundColor: petTheme.tint,
                            borderColor: petTheme.border,
                          },
                        ]}
                        onPress={() => {
                          applySearchKeyword(keyword);
                        }}
                      >
                        <AppText
                          preset="caption"
                          style={[
                            styles.chipButtonText,
                            styles.chipButtonTextActive,
                            { color: petTheme.primary },
                          ]}
                        >
                          {keyword}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </>
              )
            ) : null}
          </View>

          <View style={styles.suggestionSection}>
            <Pressable
              style={styles.suggestionToggleButton}
              onPress={() => {
                startTransition(() => {
                  setPopularSearchesExpanded(prev => !prev);
                });
              }}
            >
              <View style={styles.suggestionToggleCopy}>
                <AppText preset="body" style={styles.suggestionTitle}>
                  인기 검색어
                </AppText>
                <AppText preset="caption" style={styles.suggestionToggleMeta}>
                  {popularSearchState.loading
                    ? '불러오는 중'
                    : popularKeywords.length > 0
                      ? `${popularKeywords.length}개 추천`
                      : '아직 준비된 키워드가 없어요'}
                </AppText>
              </View>
              <Feather
                name={popularSearchesExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#98A1B2"
              />
            </Pressable>
            {popularSearchesExpanded ? (
              popularKeywords.length === 0 ? (
                <AppText preset="caption" style={styles.suggestionEmptyText}>
                  {popularSearchState.loading
                    ? '검색어 흐름을 정리하고 있어요.'
                    : '추천 검색어를 아직 준비하지 못했어요.'}
                </AppText>
              ) : (
                <>
                  <AppText preset="caption" style={styles.suggestionHelperText}>
                    많이 찾는 주제를 바로 열어서 탐색할 수 있어요.
                  </AppText>
                  <View style={styles.chipWrap}>
                    {popularKeywords.map(keyword => (
                      <Pressable
                        key={`popular-${keyword}`}
                        style={[
                          styles.chipButton,
                          { borderColor: petTheme.border },
                        ]}
                        onPress={() => {
                          applySearchKeyword(keyword);
                        }}
                      >
                        <AppText
                          preset="caption"
                          style={[styles.chipButtonText, { color: petTheme.primary }]}
                        >
                          {keyword}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </>
              )
            ) : null}
          </View>
        </View>
      ) : null}

      {catalogState.loading ? (
        <View style={styles.emptyCard}>
          <Feather name="loader" size={28} color={petTheme.primary} />
          <AppText preset="headline" style={styles.emptyTitle}>
            가이드를 불러오는 중이에요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            공개된 콘텐츠를 정리해서 보여드리고 있어요.
          </AppText>
        </View>
      ) : catalogState.error && rankedGuides.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="alert-circle" size={28} color={petTheme.primary} />
          <AppText preset="headline" style={styles.emptyTitle}>
            가이드를 불러오지 못했어요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            {catalogState.error}
          </AppText>
        </View>
      ) : visibleGuides.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather
            name={hasSearchQuery ? 'search' : 'book-open'}
            size={28}
            color={petTheme.primary}
          />
          <AppText preset="headline" style={styles.emptyTitle}>
            {hasSearchQuery
              ? '검색 결과가 없어요'
              : catalogState.guides.length > 0
                ? `${audienceLabel}에게 맞는 가이드가 아직 없어요`
                : '공개된 가이드가 아직 없어요'}
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            {hasSearchQuery
              ? '검색어를 조금 다르게 입력하거나 태그·종 이름으로 다시 찾아보세요.'
              : catalogState.guides.length > 0
                ? '지금은 선택한 반려동물 기준 팁과 공통 팁만 먼저 보여드리고 있어요. 다른 종 전용 팁은 기본 목록에서 숨겨집니다.'
                : catalogState.source === 'remote-empty'
                ? getGuideDataSourceDescription({
                    source: catalogState.source,
                    reason: catalogState.sourceReason,
                  })
                : '운영에서 콘텐츠를 활성화하면 이 화면에 바로 노출됩니다.'}
          </AppText>
          {hasSearchQuery ? (
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.resetSearchButton,
                { backgroundColor: petTheme.tint },
              ]}
              onPress={() => {
                startTransition(() => {
                  setSearchQuery('');
                });
              }}
            >
              <AppText
                preset="caption"
                style={[styles.resetSearchButtonText, { color: petTheme.primary }]}
              >
                검색어 지우기
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={visibleGuides}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ItemSeparator}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        />
      )}
    </SafeAreaView>
  );
}
