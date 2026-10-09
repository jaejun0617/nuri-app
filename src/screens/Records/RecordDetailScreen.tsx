import CtaButton, { CtaText } from '../../app/ui/CtaButton';
// 파일: src/screens/Records/RecordDetailScreen.tsx
// 역할:
// - 선택한 추억 1개를 집중해서 보여주는 상세 화면
// - 다중 이미지 캐러셀, 수정/삭제 액션, fallback fetch를 담당
// - 타임라인 목록과 상세 화면의 역할을 분리해 렌더 비용을 줄임

import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ToolbarHeightContext } from '../../components/navigation/ToolbarHeightContext';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriIcon, { type NuriIconName } from '../../components/icons/NuriIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import OptimizedImage from '../../components/images/OptimizedImage';
import { useSignedMemoryImage } from '../../hooks/useSignedMemoryImage';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { TIMELINE_SEASON_COLORS } from '../../theme/seasonal/timeline';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  formatRecordCreatedTime,
  formatRecordRelativeTime,
  getRecordDisplayYmd,
} from '../../services/records/date';
import {
  getMemoryImageRefs,
  getTimelinePrimaryMemoryImageSource,
} from '../../services/records/imageSources';
import {
  getRecordCategoryMeta,
  getMemoryCategoryChipLabel,
} from '../../services/memories/categoryMeta';
import {
  formatMemoryDetailDate,
  getMemoryDetailCategoryTone,
} from '../../services/records/detail';
import {
  emptyDetailHistory,
  fetchNextDetailHistory,
  type DetailHistoryPage,
} from '../../services/records/detailHistory';
import { formatRecordPriceLabel } from '../../services/records/form';
import type { MemoryRecord } from '../../services/supabase/memories';
import {
  deleteMemoryWithFile,
  fetchMemoryById,
} from '../../services/supabase/memories';
import { getMemoryImageSignedUrlsCached } from '../../services/supabase/storageMemories';
import { removeTimelineWalkActivity } from '../../services/activity/timelineActivity';
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
    icon: NuriIconName;
    label: string;
  }
> = {
  happy: { icon: 'smile', label: '행복해요' },
  calm: { icon: 'calm', label: '평온해요' },
  excited: { icon: 'excited', label: '신나요' },
  neutral: { icon: 'neutral', label: '무난해요' },
  sad: { icon: 'sad', label: '아쉬워요' },
  anxious: { icon: 'anxious', label: '걱정돼요' },
  angry: { icon: 'angry', label: '예민해요' },
  tired: { icon: 'tired', label: '피곤해요' },
};

const FeedPostCard = memo(function FeedPostCardView({
  item,
  petName,
  petAvatarUrl,
  imagePriority = 'primary',
}: {
  item: MemoryRecord;
  petName: string;
  petAvatarUrl: string | null;
  imagePriority?: 'primary' | 'related';
}) {
  const [previewImageSources, setPreviewImageSources] = useState<
    PreviewImageSource[]
  >([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [imagesResolved, setImagesResolved] = useState(false);
  const [imageRetry, setImageRetry] = useState(0);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const categoryTone = getMemoryDetailCategoryTone(item);
  const moodMeta = item.emotion ? EMOTION_META[item.emotion] : null;
  const imagePaths = useMemo(() => {
    return getMemoryImageRefs(item);
  }, [item]);

  useEffect(() => {
    let active = true;
    for (const source of previewImageSources) {
      Image.getSize(
        source.uri,
        (width, height) => {
          if (active && width > 0 && height > 0) {
            setImageRatios(current => ({
              ...current,
              [source.key]: width / height,
            }));
          }
        },
        () => {
          /* A failed metadata read keeps contain mode; it never crops the image. */
        },
      );
    }
    return () => {
      active = false;
    };
  }, [previewImageSources]);

  useEffect(() => {
    let mounted = true;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let frameId: number | null = null;
    setPreviewImageSources([]);
    setImagesResolved(imagePaths.length === 0);

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

      setPreviewImageSources(
        toPreviewImageSources(imagePaths, firstUrls, item.id),
      );

      if (imagePaths.length <= 1) {
        setImagesResolved(true);
        return;
      }

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

            if (imagePaths.length <= DETAIL_EAGER_IMAGE_COUNT) {
              setImagesResolved(true);
              return;
            }

            delayTimer = setTimeout(() => {
              getMemoryImageSignedUrlsCached(
                imagePaths.map(image => image.value),
              )
                .then(allUrls => {
                  if (!mounted) return;
                  setPreviewImageSources(
                    toPreviewImageSources(imagePaths, allUrls, item.id),
                  );
                })
                .catch(() => null)
                .finally(() => {
                  if (mounted) setImagesResolved(true);
                });
            }, RELATED_IMAGE_HYDRATION_DELAY_MS);
          })
          .catch(() => {
            if (mounted) {
              setPreviewImageSources(prev => (prev.length > 0 ? prev : []));
              setImagesResolved(true);
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
      setImagesResolved(true);
    }

    if (imagePriority === 'primary') {
      hydratePrimaryFirstImage().catch(() => {
        if (mounted) {
          setPreviewImageSources([]);
          setImagesResolved(true);
        }
      });
    } else {
      delayTimer = setTimeout(() => {
        hydrateDeferredImages().catch(() => {
          if (mounted) {
            setPreviewImageSources([]);
            setImagesResolved(true);
          }
        });
      }, RELATED_IMAGE_HYDRATION_DELAY_MS);
    }

    return () => {
      mounted = false;
      if (delayTimer) clearTimeout(delayTimer);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [imagePaths, imagePriority, imageRetry, item.id]);

  useEffect(() => {
    if (imageIndex < imagePaths.length) return;
    setImageIndex(0);
  }, [imageIndex, imagePaths.length]);

  const displayDate = useMemo(() => formatMemoryDetailDate(item), [item]);
  const relativeTime = useMemo(() => formatRecordRelativeTime(item), [item]);
  const avatarFallback = useMemo(
    () => petName.trim().charAt(0) || 'N',
    [petName],
  );
  const contentText = useMemo(() => item.content?.trim() || '', [item.content]);
  const priceText = useMemo(
    () => formatRecordPriceLabel(item.price),
    [item.price],
  );
  const slideWidth = Math.max(carouselWidth || window.width - 32, 1);

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

  const activeRatio = imageRatios[imagePaths[imageIndex]?.key ?? ''] ?? 1.55;
  const photoHeight = Math.min(slideWidth / activeRatio, window.height * 0.7);
  const renderPreviewImage = useCallback(
    ({ item: previewImage }: { item: PreviewImageSource }) => (
      <View
        style={[
          styles.postImageSlide,
          { width: slideWidth, height: photoHeight },
        ]}
      >
        {previewImage.uri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`사진 ${imageIndex + 1} 크게 보기`}
            onPress={() => setExpandedImage(previewImage.uri)}
            style={styles.fullPhoto}
          >
            <OptimizedImage
              uri={previewImage.uri}
              style={styles.postImage}
              resizeMode="contain"
              priority={imagePriority === 'primary' ? 'high' : 'normal'}
            />
          </Pressable>
        ) : (
          <View style={styles.postImageFallback}>
            {imagesResolved ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="사진 다시 불러오기"
                style={styles.imageRetry}
                onPress={() => setImageRetry(current => current + 1)}
              >
                <AppText preset="unifiedMeta">사진 다시 불러오기</AppText>
              </TouchableOpacity>
            ) : (
              <ActivityIndicator accessibilityLabel="사진 불러오는 중" />
            )}
          </View>
        )}
      </View>
    ),
    [imageIndex, imagePriority, imagesResolved, photoHeight, slideWidth],
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
              <AppText
                preset="unifiedMeta"
                style={styles.postAvatarFallbackText}
              >
                {avatarFallback}
              </AppText>
            </View>
          )}

          <View style={styles.postHeaderTextWrap}>
            <View style={styles.petNameRow}>
              <AppText
                preset="unifiedBody"
                styleOverridesPreset
                style={styles.postPetName}
              >
                {petName}
              </AppText>
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: categoryTone.backgroundColor },
                ]}
              >
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[
                    styles.categoryText,
                    { color: categoryTone.textColor },
                  ]}
                >
                  {getMemoryCategoryChipLabel(item)}
                </AppText>
              </View>
            </View>
            <AppText preset="unifiedMeta" style={styles.postMetaLine}>
              {displayDate}
              {relativeTime ? ` · ${relativeTime}` : ''}
            </AppText>
          </View>
        </View>
      </View>

      {imagePaths.length > 0 ? (
        <View
          testID="memory-detail-photo-viewport"
          style={[styles.postImageViewport, { height: photoHeight }]}
          onLayout={onImageViewportLayout}
        >
          <FlatList
            data={imagePaths.map(image => ({
              key: image.key,
              uri:
                previewImageSources.find(source => source.key === image.key)
                  ?.uri ?? '',
            }))}
            horizontal
            pagingEnabled
            keyExtractor={previewImage => previewImage.key}
            renderItem={renderPreviewImage}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            removeClippedSubviews={false}
            extraData={{ imagesResolved, photoHeight }}
          />
          {imagePaths.length > 1 ? (
            <View style={styles.postImagePager}>
              <AppText preset="unifiedMeta" style={styles.postImagePagerText}>
                {Math.min(imageIndex + 1, imagePaths.length)} /{' '}
                {imagePaths.length}
              </AppText>
            </View>
          ) : null}
          {imagePaths.length > 1 ? (
            <View style={styles.imageDots} pointerEvents="none">
              {imagePaths.map((image, index) => (
                <View
                  key={image.key}
                  style={[
                    styles.imageDot,
                    {
                      backgroundColor:
                        index === imageIndex
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.45)',
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View
          testID="memory-detail-no-photo"
          style={[styles.postImageFallback, styles.noPhoto]}
        >
          <NuriSemanticIcon
            family="feather"
            name="camera-off"
            size={36}
            color="#8D9EB9"
            preserveOriginal
          />
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.noPhotoTitle}
          >
            사진 없이 남긴 소중한 기록이에요
          </AppText>
          <AppText preset="unifiedMeta" style={styles.postImageFallbackText}>
            글로 남긴 순간도 충분히 특별해요.
          </AppText>
        </View>
      )}

      <View style={styles.postBody}>
        <AppText
          preset="unifiedBody"
          styleOverridesPreset
          style={styles.postTitleText}
        >
          {item.title.trim()}
        </AppText>

        {contentText ? (
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.postContentText}
          >
            {contentText}
          </AppText>
        ) : null}

        {moodMeta ? (
          <View style={styles.postMoodRow}>
            <NuriIcon name={moodMeta.icon} size={16} />
            <AppText preset="unifiedMeta" style={styles.postMoodLabel}>
              {moodMeta.label}
            </AppText>
          </View>
        ) : null}

        {item.tags.length ? (
          <View style={styles.tags}>
            {Array.from(new Set(item.tags)).map(tag => (
              <View key={tag} style={styles.tagChip}>
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={styles.tagText}
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {item.category === 'health' && item.metadata?.health?.care ? (
          <View style={{ gap: 8, marginTop: 16 }}>
            {[
              ['병원', item.metadata.health.care.hospitalName],
              ['진단·진료', item.metadata.health.care.diagnosis],
              ['약·복약', item.metadata.health.care.medication],
            ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
              <AppText key={label} preset="unifiedBody" style={styles.postTagsText}>{label} · {value}</AppText>
            ))}
          </View>
        ) : null}
        {priceText ? (
          <AppText preset="unifiedMeta" style={styles.postTagsText}>
            {item.category === 'health' || item.subCategory === 'hospital' ? '병원·건강 비용' : '구매 가격'} {priceText}
          </AppText>
        ) : null}
      </View>
      <Modal
        visible={expandedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImage(null)}
      >
        <View style={styles.photoOverlay}>
          {expandedImage ? (
            <OptimizedImage
              uri={expandedImage}
              style={styles.fullPhoto}
              resizeMode="contain"
              priority="high"
            />
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="확대 사진 닫기"
            style={[styles.photoClose, { top: insets.top + 12 }]}
            onPress={() => setExpandedImage(null)}
          >
            <NuriSemanticIcon
              family="feather"
              name="x"
              preserveOriginal
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
});

const RelatedMemoryCard = memo(function RelatedMemoryCardView({
  item,
  onPress,
}: {
  item: MemoryRecord;
  onPress: (item: MemoryRecord) => void;
}) {
  const image = getTimelinePrimaryMemoryImageSource(item);
  const { signedUrl } = useSignedMemoryImage(image.value, {
    variant: 'timeline-thumb',
    trackLoading: false,
  });
  const category = getRecordCategoryMeta(item);
  const tone = getMemoryDetailCategoryTone(item);
  return (
    <TouchableOpacity
      testID="memory-detail-related-record"
      accessibilityRole="button"
      accessibilityLabel={`${category.label}, ${item.title}`}
      onPress={() => onPress(item)}
      activeOpacity={0.9}
      style={styles.relatedCard}
    >
      <View
        style={[
          styles.relatedThumb,
          { backgroundColor: tone.placeholderColor },
        ]}
      >
        {signedUrl ? (
          <OptimizedImage
            uri={signedUrl}
            style={styles.relatedThumbImage}
            resizeMode="cover"
          />
        ) : (
          <NuriSemanticIcon family="material" name={category.icon} size={26} />
        )}
      </View>
      <View style={styles.relatedBody}>
        <View
          style={[
            styles.categoryChip,
            { backgroundColor: tone.backgroundColor },
          ]}
        >
          <AppText
            preset="unifiedMeta"
            styleOverridesPreset
            style={[styles.categoryText, { color: tone.textColor }]}
          >
            {getMemoryCategoryChipLabel(item)}
          </AppText>
        </View>
        <AppText
          preset="unifiedBody"
          numberOfLines={1}
          styleOverridesPreset
          style={styles.relatedTitle}
        >
          {item.title.trim() || item.content?.trim() || '기록을 남겼어요'}
        </AppText>
        <AppText preset="unifiedMeta" style={styles.relatedTime}>
          {formatRecordCreatedTime(item)}
        </AppText>
      </View>
      <Feather name="chevron-right" size={18} color="#748096" />
    </TouchableOpacity>
  );
});

function DetailHeader({
  topInset,
  healthDetail,
  accent,
  onBack,
  onMore,
}: {
  topInset: number;
  healthDetail: boolean;
  accent: string;
  onBack: () => void;
  onMore?: () => void;
}) {
  return (
    <View
      style={[styles.headerLink, { paddingTop: Math.max(topInset + 4, 12) }]}
    >
      <View style={styles.headerSideSlot}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="추억 상세 뒤로가기"
          activeOpacity={0.88}
          style={styles.backButton}
          onPress={onBack}
        >
          <Feather name="arrow-left" size={20} color="#102033" />
        </TouchableOpacity>
      </View>
      <AppText preset="unifiedTitle" style={styles.headerLinkText}>
        {healthDetail ? '건강 기록 상세' : '추억 상세'}
      </AppText>
      <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
        {onMore ? (
          <TouchableOpacity
            testID="memory-detail-more"
            accessibilityRole="button"
            accessibilityLabel="추억 더보기"
            activeOpacity={0.88}
            style={styles.postMoreBtn}
            onPress={onMore}
          >
            <NuriSemanticIcon
              family="feather"
              name="more-horizontal"
              size={22}
              color={accent}
              preserveOriginal
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function RecordDetailScreen() {
  const insets = useSafeAreaInsets();
  const toolbarHeight = useContext(ToolbarHeightContext);
  const theme = useTheme();
  const season = useEffectiveSeason();
  const seasonColors = TIMELINE_SEASON_COLORS[season];
  const navigation = useNavigation<TimelineNav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId?.trim() || null;
  const memoryId = route.params?.memoryId?.trim() || null;

  const record = useRecordStore(s => s.selectRecordById(memoryId));
  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const pets = usePetStore(s => s.pets);
  const recordsById = useRecordStore(s => s.recordsById);

  const resolvedPetId = record?.petId?.trim() || petId;
  const selectedPet = useMemo(
    () => pets.find(item => item.id === resolvedPetId) ?? null,
    [pets, resolvedPetId],
  );
  const petName = useMemo(
    () => selectedPet?.name?.trim() || '반려동물',
    [selectedPet?.name],
  );
  const petAvatarUrl = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );
  const [hydratingMissingRecord, setHydratingMissingRecord] = useState(() =>
    Boolean(petId && memoryId && !record),
  );
  const [hydrateErrorMessage, setHydrateErrorMessage] = useState<string | null>(
    null,
  );
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
    navigation.navigate('RecordEdit', {
      petId: resolvedPetId,
      memoryId: record.id,
      entrySource: route.params?.entrySource,
      scheduleReturn: route.params?.scheduleReturn,
    });
  }, [
    closeActionMenu,
    navigation,
    record,
    resolvedPetId,
    route.params?.entrySource,
    route.params?.scheduleReturn,
  ]);

  const navigateToHealthReport = useCallback(() => {
    if (!resolvedPetId) return;
    navigation.navigate('HealthReport', {
      petId: resolvedPetId,
      initialTab: 'records',
      focusYmd: record ? getRecordDisplayYmd(record) ?? undefined : undefined,
      entrySource: 'more',
    });
  }, [navigation, record, resolvedPetId]);

  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.scheduleReturn
      ? undefined
      : route.params?.entrySource,
    onHome: () => {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
    },
    onHealthReport: navigateToHealthReport,
    onMore: () => {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      openMoreDrawer();
    },
    onFallback: () => {
      if (route.params?.scheduleReturn) {
        navigation.popTo('ScheduleDetail', route.params.scheduleReturn);
        return;
      }
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

  const [historyPage, setHistoryPage] =
    useState<DetailHistoryPage>(emptyDetailHistory);
  const historyGeneration = useRef(0);
  const historyBusy = useRef(false);
  const [relatedStatus, setRelatedStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [relatedRetry, setRelatedRetry] = useState(0);
  const [relatedOwner, setRelatedOwner] = useState('');
  const recordId = record?.id;
  const relatedRequestKey = `${resolvedPetId ?? ''}:${
    recordId ?? ''
  }:${relatedRetry}`;
  const visibleRelatedStatus =
    relatedOwner === relatedRequestKey ? relatedStatus : 'loading';
  const isHealthDetail = route.params?.entrySource === 'health_report';
  useFocusEffect(
    useCallback(() => {
      const generation = ++historyGeneration.current;
      const isActive = () => historyGeneration.current === generation;
      if (!resolvedPetId || !recordId || isHealthDetail) return;
      historyBusy.current = true;
      setHistoryPage(emptyDetailHistory());
      setRelatedStatus('loading');
      setRelatedOwner(relatedRequestKey);
      fetchNextDetailHistory({
        petId: resolvedPetId,
        currentRecordId: recordId,
        page: emptyDetailHistory(),
        isActive,
      })
        .then(page => {
          if (isActive()) {
            setHistoryPage(page);
            setRelatedStatus('ready');
          }
        })
        .catch(() => {
          if (isActive()) setRelatedStatus('error');
        })
        .finally(() => {
          if (isActive()) historyBusy.current = false;
        });
      return () => {
        ++historyGeneration.current;
        historyBusy.current = false;
      };
    }, [isHealthDetail, recordId, relatedRequestKey, resolvedPetId]),
  );

  const relatedRecords = useMemo(() => {
    if (relatedOwner !== relatedRequestKey) return [];
    return historyPage.records.map(item => recordsById[item.id] ?? item);
  }, [historyPage.records, recordsById, relatedOwner, relatedRequestKey]);
  const canShowMoreRelatedRecords =
    historyPage.buffered.length > 0 || historyPage.hasMore;
  const handlePressMoreRelatedRecords = useCallback(async () => {
    if (!resolvedPetId || !recordId || historyBusy.current) return;
    const generation = historyGeneration.current;
    const isActive = () => historyGeneration.current === generation;
    historyBusy.current = true;
    setRelatedStatus('loading');
    try {
      const page = await fetchNextDetailHistory({
        petId: resolvedPetId,
        currentRecordId: recordId,
        page: historyPage,
        isActive,
      });
      if (isActive()) {
        setHistoryPage(page);
        setRelatedStatus('ready');
      }
    } catch {
      if (isActive()) setRelatedStatus('error');
    } finally {
      if (isActive()) historyBusy.current = false;
    }
  }, [historyPage, recordId, resolvedPetId]);

  const onConfirmDelete = useCallback(async () => {
    if (!resolvedPetId || !record || deleting) return;

    try {
      setDeleting(true);
      await deleteMemoryWithFile({
        memoryId: record.id,
        imagePath: record.imagePath,
        imagePaths: record.imagePaths,
      });
      await removeTimelineWalkActivity({
        petId: resolvedPetId,
        memoryId: record.id,
        category: record.category,
      });

      removeOneLocal(resolvedPetId, record.id);
      setDeleteModalVisible(false);

      if (route.params?.scheduleReturn) {
        navigation.popTo('ScheduleDetail', route.params.scheduleReturn);
      } else if (route.params?.entrySource === 'health_report') {
        navigateToHealthReport();
      } else {
        navigation.navigate('TimelineMain', {
          petId: resolvedPetId,
          mainCategory: 'all',
        });
      }
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
    route.params?.entrySource,
    route.params?.scheduleReturn,
    navigateToHealthReport,
  ]);

  const renderFeedCard = useCallback(
    (item: MemoryRecord) => (
      <FeedPostCard
        key={item.id}
        item={item}
        petName={petName}
        petAvatarUrl={petAvatarUrl}
        imagePriority="primary"
      />
    ),
    [petAvatarUrl, petName],
  );

  const handlePressRelatedRecord = useCallback(
    (item: MemoryRecord) => {
      if (!resolvedPetId) return;
      navigation.replace('RecordDetail', {
        petId: resolvedPetId,
        memoryId: item.id,
        entrySource: route.params?.entrySource,
        scheduleReturn: route.params?.scheduleReturn,
      });
    },
    [
      navigation,
      resolvedPetId,
      route.params?.entrySource,
      route.params?.scheduleReturn,
    ],
  );

  const renderRelatedRecord = useCallback(
    ({ item }: { item: MemoryRecord }) => (
      <View style={styles.historyRow}>
        <RelatedMemoryCard item={item} onPress={handlePressRelatedRecord} />
      </View>
    ),
    [handlePressRelatedRecord],
  );

  const retryHydrateRecord = useCallback(() => {
    setHydrateErrorMessage(null);
    setHydratingMissingRecord(true);
    setHydrateAttempt(current => current + 1);
  }, []);

  const detailHeader = (
    <DetailHeader
      topInset={insets.top}
      healthDetail={isHealthDetail}
      accent={seasonColors.selectedCategory}
      onBack={onPressBack}
      onMore={record ? openActionMenu : undefined}
    />
  );

  if (!record && hydratingMissingRecord) {
    return (
      <View style={styles.screen}>
        {detailHeader}

        <View style={styles.empty}>
          <ActivityIndicator size="small" />
          <AppText preset="unifiedBody" style={styles.emptyDesc}>
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
          {detailHeader}

          <View style={styles.empty}>
            <AppText
              typographyRole="celebration"
              preset="unifiedTitle"
              style={styles.emptyTitle}
            >
              기록을 불러오지 못했어요
            </AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              {hydrateErrorMessage}
            </AppText>
            <CtaButton
              role="primary"
              activeOpacity={0.9}
              style={styles.modalPrimaryBtn}
              onPress={retryHydrateRecord}
            >
              <CtaText preset="unifiedBody" style={styles.modalPrimaryBtnText}>
                다시 시도
              </CtaText>
            </CtaButton>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        {detailHeader}

        <View style={styles.empty}>
          <AppText
            typographyRole="celebration"
            preset="unifiedTitle"
            style={styles.emptyTitle}
          >
            기록을 찾을 수 없어요
          </AppText>
          <AppText preset="unifiedBody" style={styles.emptyDesc}>
            목록으로 돌아가서 새로고침 해주세요.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {detailHeader}

      <FlatList
        testID="memory-detail-scroll"
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: (toolbarHeight ?? insets.bottom) + 16 },
        ]}
        data={isHealthDetail ? [] : relatedRecords}
        keyExtractor={item => item.id}
        renderItem={renderRelatedRecord}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        ListHeaderComponent={
          <>
            {renderFeedCard(record)}
            {isHealthDetail ? null : (
              <View style={styles.relatedSection}>
                <View style={styles.relatedSectionHeader}>
                  <AppText
                    typographyRole="sectionTitle"
                    preset="unifiedTitle"
                    style={styles.relatedSectionTitle}
                  >
                    함께 쌓아온 추억
                  </AppText>
                  <AppText
                    preset="unifiedMeta"
                    style={styles.relatedSectionCount}
                  >
                    {relatedRecords.length > 0
                      ? `${relatedRecords.length}개 표시`
                      : visibleRelatedStatus === 'error'
                      ? '미확인'
                      : ''}
                  </AppText>
                </View>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          isHealthDetail ? undefined : (
            <View style={styles.historyFooter}>
              {visibleRelatedStatus === 'loading' ? (
                <ActivityIndicator accessibilityLabel="다른 추억 불러오는 중" />
              ) : visibleRelatedStatus === 'error' ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.relatedEmptyCard}
                  onPress={
                    relatedRecords.length > 0
                      ? handlePressMoreRelatedRecords
                      : () => setRelatedRetry(current => current + 1)
                  }
                >
                  <AppText preset="unifiedBody" style={styles.relatedEmptyText}>
                    관련 기록 다시 불러오기
                  </AppText>
                </TouchableOpacity>
              ) : relatedRecords.length === 0 ? (
                <View style={styles.relatedEmptyCard}>
                  <AppText preset="unifiedBody" style={styles.relatedEmptyText}>
                    아직 다른 추억은 없어요.
                  </AppText>
                </View>
              ) : null}

              {canShowMoreRelatedRecords && visibleRelatedStatus === 'ready' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.relatedMoreButton,
                    {
                      backgroundColor: seasonColors.surface,
                      borderColor: seasonColors.surface,
                    },
                  ]}
                  onPress={handlePressMoreRelatedRecords}
                  accessibilityRole="button"
                  accessibilityLabel="다른 추억 5개 더보기"
                >
                  <View
                    style={styles.relatedMoreButtonSide}
                    pointerEvents="none"
                    accessible={false}
                  />
                  <AppText
                    preset="unifiedBody"
                    style={[
                      styles.relatedMoreButtonText,
                      { color: seasonColors.selectedCategory },
                    ]}
                  >
                    추억을 더 만나볼까요?
                  </AppText>
                  <View
                    style={styles.relatedMoreButtonSide}
                    pointerEvents="none"
                    accessible={false}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />

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
            accessibilityViewIsModal
            style={[
              styles.actionSheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <CtaButton
              role="primary"
              activeOpacity={0.9}
              style={styles.sheetActionRow}
              onPress={onPressEdit}
              disabled={deleting}
            >
              <CtaText
                preset="unifiedBody"
                style={[styles.sheetActionText, {}]}
              >
                수정하기
              </CtaText>
            </CtaButton>

            <CtaButton
              role="destructiveConfirm"
              activeOpacity={0.9}
              style={styles.sheetActionRow}
              onPress={onPressDelete}
              disabled={deleting}
            >
              <CtaText
                preset="unifiedBody"
                style={styles.sheetActionDeleteText}
              >
                삭제하기
              </CtaText>
            </CtaButton>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        confirmLoading={deleting}
        visible={deleteModalVisible}
        typographyMode="unified"
        title="정말 삭제할까요?"
        message={
          '삭제된 추억은 다시 복구할 수 없어요.\n신중하게 선택해 주세요.'
        }
        cancelLabel="취소"
        confirmLabel={deleting ? '삭제 중...' : '삭제하기'}
        tone="danger"
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          onConfirmDelete().catch(() => {});
        }}
      />
    </View>
  );
}
