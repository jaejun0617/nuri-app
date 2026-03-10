// 파일: src/screens/Records/RecordDetailScreen.tsx
// 역할:
// - 추억 상세를 인스타그램형 피드 감각으로 재구성한 화면
// - 현재 기록과 같은 아이의 다른 기록을 카드 단위 피드로 이어서 보여줌
// - 각 카드마다 바로 수정/삭제 가능한 액션 메뉴를 제공

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import AppText from '../../app/ui/AppText';
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
}: {
  item: MemoryRecord;
  petName: string;
  petAvatarUrl: string | null;
  onPressMore: () => void;
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

    async function run() {
      if (imagePaths.length === 0) {
        if (mounted) setPreviewImageSources([]);
        return;
      }

      const urls = await getMemoryImageSignedUrlsCached(
        imagePaths.map(image => image.value),
      );
      if (!mounted) return;

      setPreviewImageSources(
        urls.flatMap((url, index) => {
          const uri = `${url ?? ''}`.trim();
          if (!uri) return [];
          return [
            {
              key: imagePaths[index]?.key ?? `${item.id}:${index}:${uri}`,
              uri,
            },
          ];
        }),
      );
    }

    run().catch(() => {
      if (mounted) setPreviewImageSources([]);
    });

    return () => {
      mounted = false;
    };
  }, [imagePaths, item.id]);

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
        <Image source={{ uri: previewImage.uri }} style={styles.postImage} resizeMode="cover" />
      </View>
    ),
    [slideWidth],
  );

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          {petAvatarUrl ? (
            <Image source={{ uri: petAvatarUrl }} style={styles.postAvatar} />
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

      {previewImageSources.length > 1 ? (
        <View style={styles.postImageViewport} onLayout={onImageViewportLayout}>
          <FlatList
            data={previewImageSources}
            horizontal
            pagingEnabled
            keyExtractor={previewImage => previewImage.key}
            renderItem={renderPreviewImage}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            removeClippedSubviews={false}
            getItemLayout={(_, index) => ({
              length: slideWidth,
              offset: slideWidth * index,
              index,
            })}
          />
          <View style={styles.postImagePager}>
            <AppText preset="caption" style={styles.postImagePagerText}>
              {imageIndex + 1} / {previewImageSources.length}
            </AppText>
          </View>
        </View>
      ) : previewImageSources.length === 1 ? (
        <Image source={{ uri: previewImageSources[0].uri }} style={styles.postImage} resizeMode="cover" />
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
  const isFocused = useIsFocused();
  const petId = route.params?.petId ?? null;
  const memoryId = route.params?.memoryId ?? null;

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });
  const loadMore = useRecordStore(s => s.loadMore);
  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const focusedMemoryId = useRecordStore(s =>
    petId ? s.focusedMemoryIdByPet[petId] ?? null : null,
  );
  const clearFocusedMemoryId = useRecordStore(s => s.clearFocusedMemoryId);
  const pets = usePetStore(s => s.pets);
  const scrollRef = useRef<ScrollView | null>(null);
  const itemOffsetMapRef = useRef<Record<string, number>>({});
  const lastScrollTargetKeyRef = useRef<string | null>(null);

  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petName = useMemo(
    () => selectedPet?.name?.trim() || '우리 아이',
    [selectedPet?.name],
  );
  const petAvatarUrl = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(item => item.id === memoryId) ?? null;
  }, [memoryId, petState?.items]);

  useEffect(() => {
    let mounted = true;

    async function hydrateMissingRecord() {
      if (!petId || !memoryId || record) return;
      try {
        const fetched = await fetchMemoryById(memoryId);
        if (!mounted) return;
        upsertOneLocal(petId, fetched);
      } catch {
        // 상세 화면 가드가 처리한다.
      }
    }

    hydrateMissingRecord();
    return () => {
      mounted = false;
    };
  }, [memoryId, petId, record, upsertOneLocal]);

  const feedRecords = useMemo(() => {
    const items = petState?.items ?? [];
    return items;
  }, [petState?.items]);

  const scrollTargetMemoryId = focusedMemoryId ?? memoryId;
  const shouldConsumeFocusedTarget = Boolean(
    focusedMemoryId && focusedMemoryId === scrollTargetMemoryId,
  );
  const scrollTargetKey = scrollTargetMemoryId
    ? `${shouldConsumeFocusedTarget ? 'focused' : 'route'}:${scrollTargetMemoryId}`
    : null;

  useEffect(() => {
    lastScrollTargetKeyRef.current = null;
  }, [feedRecords.length, scrollTargetKey]);

  const scrollToMemoryIfNeeded = useCallback(
    (targetMemoryId: string | null) => {
      if (!targetMemoryId) return false;
      if (!isFocused) return false;
      if (!scrollTargetKey) return false;
      if (lastScrollTargetKeyRef.current === scrollTargetKey) return false;

      const offset = itemOffsetMapRef.current[targetMemoryId];
      if (typeof offset !== 'number') return false;

      scrollRef.current?.scrollTo({
        y: Math.max(0, offset - 12),
        animated: false,
      });
      lastScrollTargetKeyRef.current = scrollTargetKey;

      if (petId && shouldConsumeFocusedTarget) {
        clearFocusedMemoryId(petId);
      }
      return true;
    },
    [
      clearFocusedMemoryId,
      isFocused,
      petId,
      scrollTargetKey,
      shouldConsumeFocusedTarget,
    ],
  );

  useEffect(() => {
    if (!scrollTargetMemoryId) return;
    scrollToMemoryIfNeeded(scrollTargetMemoryId);
  }, [feedRecords, scrollTargetMemoryId, scrollToMemoryIfNeeded]);

  const hasMore = Boolean(petState?.hasMore);
  const status = petState?.status ?? 'idle';

  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const actionTarget = useMemo(
    () => feedRecords.find(item => item.id === actionTargetId) ?? null,
    [actionTargetId, feedRecords],
  );
  const deleteTarget = useMemo(
    () => feedRecords.find(item => item.id === deleteTargetId) ?? null,
    [deleteTargetId, feedRecords],
  );

  const openActionMenu = useCallback((targetId: string) => {
    setActionTargetId(targetId);
    setActionMenuVisible(true);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setActionTargetId(null);
  }, []);
  const hideActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);

  const onPressEdit = useCallback(() => {
    if (!petId || !actionTargetId) return;
    closeActionMenu();
    navigation.navigate('RecordEdit', { petId, memoryId: actionTargetId });
  }, [actionTargetId, closeActionMenu, navigation, petId]);

  const onPressDelete = useCallback(() => {
    if (!petId || !actionTarget) return;
    hideActionMenu();
    setDeleteTargetId(actionTarget.id);
    setDeleteModalVisible(true);
  }, [actionTarget, hideActionMenu, petId]);
  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteTargetId(null);
    setActionTargetId(null);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (!petId || !deleteTarget || deleting) return;

    try {
      setDeleting(true);
      await deleteMemoryWithFile({
        memoryId: deleteTarget.id,
        imagePath: deleteTarget.imagePath,
        imagePaths: deleteTarget.imagePaths,
      });

      removeOneLocal(petId, deleteTarget.id);
      await refresh(petId);
      closeDeleteModal();

      if (deleteTarget.id === memoryId) {
        navigation.navigate('TimelineMain', {
          petId: petId ?? undefined,
          mainCategory: 'all',
        });
      }
    } catch (error: unknown) {
      const { title, message } = getBrandedErrorMeta(error, 'record-delete');
      Alert.alert(title, message);
    } finally {
      setDeleting(false);
    }
  }, [closeDeleteModal, deleteTarget, deleting, memoryId, navigation, petId, refresh, removeOneLocal]);

  const onScrollFeed = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!petId || !hasMore) return;
      if (status === 'loading' || status === 'refreshing' || status === 'loadingMore') {
        return;
      }

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const remain = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (remain > 560) return;

      loadMore(petId);
    },
    [hasMore, loadMore, petId, status],
  );

  if (!record) {
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
      <View style={styles.header}>
        <AppText preset="headline" style={styles.headerTitle}>
          추억상세보기
        </AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        onScroll={onScrollFeed}
        scrollEventThrottle={16}
      >
        {feedRecords.map(item => (
          <View
            key={item.id}
            onLayout={event => {
              if (item.id !== scrollTargetMemoryId) return;
              itemOffsetMapRef.current[item.id] = event.nativeEvent.layout.y;
              if (item.id === scrollTargetMemoryId) {
                scrollToMemoryIfNeeded(scrollTargetMemoryId);
              }
            }}
          >
            <FeedPostCard
              item={item}
              petName={petName}
              petAvatarUrl={petAvatarUrl}
              onPressMore={() => openActionMenu(item.id)}
            />
          </View>
        ))}

        {status === 'loadingMore' ? (
          <View style={styles.feedLoading}>
            <ActivityIndicator size="small" color="#8A94A6" />
          </View>
        ) : null}
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
