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
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import OptimizedImage from '../../components/images/OptimizedImage';
import { MemoryCard } from '../../components/MemoryCard/MemoryCard';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { buildPetThemePalette } from '../../services/pets/themePalette';
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
import { openMoreDrawer } from '../../store/uiStore';
import { styles } from './RecordDetailScreen.styles';

type TimelineNav = CompositeNavigationProp<
  NativeStackNavigationProp<TimelineStackParamList, 'RecordDetail'>,
  NativeStackNavigationProp<RootStackParamList, 'AppTabs'>
>;
type Route = RouteProp<TimelineStackParamList, 'RecordDetail'>;
type PreviewImageSource = {
  key: string;
  uri: string;
};

const RELATED_IMAGE_HYDRATION_DELAY_MS = 140;
const DETAIL_EAGER_IMAGE_COUNT = 4;
const RELATED_RECORDS_PAGE_SIZE = 5;
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
  const bootstrapRecords = useRecordStore(s => s.bootstrap);
  const loadMoreRecords = useRecordStore(s => s.loadMore);
  const pets = usePetStore(s => s.pets);

  const resolvedPetId = record?.petId?.trim() || petId;
  const timelineIds = useRecordStore(s => s.selectTimelineIdsByPetId(resolvedPetId));
  const timelineStatus = useRecordStore(s => s.selectTimelineStatusByPetId(resolvedPetId));
  const timelineHasMore = useRecordStore(s => s.selectTimelineHasMoreByPetId(resolvedPetId));
  const timelineEntityVersion = useRecordStore(
    s => s.selectTimelineEntityVersionByPetId(resolvedPetId),
  );
  const selectedPet = useMemo(
    () => pets.find(item => item.id === resolvedPetId) ?? null,
    [pets, resolvedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
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
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(RELATED_RECORDS_PAGE_SIZE);
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

  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
    },
    onMore: () => {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      openMoreDrawer();
    },
    onFallback: () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate('TimelineMain');
    },
  });

  const onPressDelete = useCallback(() => {
    if (!resolvedPetId || !record) return;
    hideActionMenu();
    setDeleteModalVisible(true);
  }, [hideActionMenu, record, resolvedPetId]);

  useEffect(() => {
    if (!resolvedPetId) return;
    if (timelineIds.length > 0 || timelineStatus !== 'idle') return;
    bootstrapRecords(resolvedPetId).catch(() => {});
  }, [bootstrapRecords, resolvedPetId, timelineIds.length, timelineStatus]);

  useEffect(() => {
    setVisibleRelatedCount(RELATED_RECORDS_PAGE_SIZE);
  }, [record?.id]);

  const relatedRecords = useMemo(() => {
    if (!record) return [] as MemoryRecord[];
    const recordsById = useRecordStore.getState().recordsById;
    return timelineIds
      .filter(id => id !== record.id)
      .map(id => recordsById[id])
      .filter((item): item is MemoryRecord => Boolean(item));
  }, [record, timelineEntityVersion, timelineIds]);
  const visibleRelatedRecords = useMemo(
    () => relatedRecords.slice(0, visibleRelatedCount),
    [relatedRecords, visibleRelatedCount],
  );
  const canShowMoreRelatedRecords = visibleRelatedCount < relatedRecords.length || timelineHasMore;

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
      setDeleteModalVisible(false);

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

  const handlePressRelatedRecord = useCallback(
    (item: MemoryRecord) => {
      if (!resolvedPetId) return;
      navigation.replace('RecordDetail', {
        petId: resolvedPetId,
        memoryId: item.id,
        entrySource: route.params?.entrySource,
      });
    },
    [navigation, resolvedPetId, route.params?.entrySource],
  );

  const handlePressMoreRelatedRecords = useCallback(() => {
    if (!resolvedPetId) return;

    const nextVisibleCount = visibleRelatedCount + RELATED_RECORDS_PAGE_SIZE;
    if (
      nextVisibleCount > relatedRecords.length &&
      timelineHasMore &&
      timelineStatus !== 'loadingMore'
    ) {
      loadMoreRecords(resolvedPetId).catch(() => {});
    }
    setVisibleRelatedCount(nextVisibleCount);
  }, [
    loadMoreRecords,
    relatedRecords.length,
    resolvedPetId,
    timelineHasMore,
    timelineStatus,
    visibleRelatedCount,
  ]);

  const renderRelatedRecord = useCallback(
    ({ item, index }: { item: MemoryRecord; index: number }) => (
      <MemoryCard
        item={item}
        onPress={handlePressRelatedRecord}
        deferImageLoad={index > 1}
        imageVariant="timeline-thumb"
      />
    ),
    [handlePressRelatedRecord],
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

      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerLink}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={onPressBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>
        <AppText preset="headline" style={styles.headerLinkText}>
          추억상세보기
        </AppText>
        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {renderFeedCard(record)}

        <View style={styles.relatedSection}>
          <View style={styles.relatedSectionHeader}>
            <AppText preset="headline" style={styles.relatedSectionTitle}>
              다른 추억도 이어서 볼래요
            </AppText>
            <AppText preset="caption" style={styles.relatedSectionCount}>
              {relatedRecords.length}개
            </AppText>
          </View>

          {visibleRelatedRecords.length > 0 ? (
            <FlashList
              data={visibleRelatedRecords}
              keyExtractor={item => item.id}
              renderItem={renderRelatedRecord}
              scrollEnabled={false}
              nestedScrollEnabled={false}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={false}
            />
          ) : (
            <View style={styles.relatedEmptyCard}>
              <AppText preset="body" style={styles.relatedEmptyText}>
                이어서 볼 추억이 아직 없어요.
              </AppText>
            </View>
          )}

          {canShowMoreRelatedRecords ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.relatedMoreButton,
                { backgroundColor: petTheme.soft, borderColor: petTheme.border },
              ]}
              onPress={handlePressMoreRelatedRecords}
              disabled={timelineStatus === 'loadingMore'}
            >
              <AppText
                preset="body"
                style={[styles.relatedMoreButtonText, { color: petTheme.primary }]}
              >
                {timelineStatus === 'loadingMore' ? '더 불러오는 중...' : '더보기'}
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

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

      <ConfirmDialog
        visible={deleteModalVisible}
        title="정말 삭제할까요?"
        message={'삭제된 추억은 다시 복구할 수 없어요.\n신중하게 선택해 주세요.'}
        cancelLabel="취소"
        confirmLabel={deleting ? '삭제 중...' : '삭제하기'}
        tone="danger"
        accentColor={petTheme.primary}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          onConfirmDelete().catch(() => {});
        }}
      />
    </View>
  );
}
