// 파일: src/screens/Records/RecordDetailScreen.tsx
// 역할:
// - 기록 상세 조회/이미지 슬라이드/삭제/수정 이동

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import { deleteMemoryWithFile } from '../../services/supabase/memories';
import { getMemoryImageSignedUrlCached } from '../../services/supabase/storageMemories';
import { useRecordStore } from '../../store/recordStore';
import AppText from '../../app/ui/AppText';
import { styles } from './RecordDetailScreen.styles';
import type { MemoryRecord } from '../../services/supabase/memories';

type TimelineNav = NativeStackNavigationProp<TimelineStackParamList, 'RecordDetail'>;
type Route = RouteProp<TimelineStackParamList, 'RecordDetail'>;

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

function toKoreanDate(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [year, month, day] = ymd.split('-');
  return `${year}.${month}.${day}`;
}

function FeedCard({
  item,
  onPress,
}: {
  item: MemoryRecord;
  onPress: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const path = item.imagePaths[0] ?? item.imagePath ?? null;
      if (!path) {
        if (mounted) setPreviewUrl(null);
        return;
      }

      const url = await getMemoryImageSignedUrlCached(path);
      if (mounted) setPreviewUrl(url ?? null);
    }

    run().catch(() => {
      if (mounted) setPreviewUrl(null);
    });

    return () => {
      mounted = false;
    };
  }, [item.imagePath, item.imagePaths]);

  const displayDate = toKoreanDate(item.occurredAt ?? item.createdAt.slice(0, 10));
  const preview = item.content?.trim() || '기록 내용을 확인해 보세요.';

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.feedCard} onPress={onPress}>
      {previewUrl ? (
        <Image source={{ uri: previewUrl }} style={styles.feedCardImage} />
      ) : (
        <View style={styles.feedCardImageFallback}>
          <AppText preset="caption" style={styles.feedCardImageFallbackText}>
            사진 없음
          </AppText>
        </View>
      )}

      <View style={styles.feedCardBody}>
        <View style={styles.feedMetaRow}>
          {item.tags[0] ? (
            <View style={styles.feedBadge}>
              <AppText preset="caption" style={styles.feedBadgeText}>
                {item.tags[0]}
              </AppText>
            </View>
          ) : null}

          <AppText preset="caption" style={styles.feedDate}>
            {displayDate}
          </AppText>
        </View>

        <AppText preset="body" style={styles.feedTitle}>
          {item.title}
        </AppText>
        <AppText preset="caption" style={styles.feedPreview} numberOfLines={3}>
          {preview}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

export default function RecordDetailScreen() {
  const navigation = useNavigation<TimelineNav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId ?? null;
  const memoryId = route.params?.memoryId ?? null;
  const { width } = useWindowDimensions();

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });

  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(r => r.id === memoryId) ?? null;
  }, [petState?.items, memoryId]);

  const relatedRecords = useMemo(() => {
    if (!memoryId) return [];
    const items = petState?.items ?? [];
    return items.filter(item => item.id !== memoryId);
  }, [memoryId, petState?.items]);
  const hasMore = Boolean(petState?.hasMore);
  const status = petState?.status ?? 'idle';

  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [imgLoading, setImgLoading] = useState(true);

  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('TimelineMain', {
      petId: petId ?? undefined,
      mainCategory: 'all',
    });
  }, [navigation, petId]);

  const imagePaths = useMemo(() => {
    if (!record) return [];
    if (Array.isArray(record.imagePaths) && record.imagePaths.length > 0) {
      return record.imagePaths;
    }
    return record.imagePath ? [record.imagePath] : [];
  }, [record]);

  useEffect(() => {
    if (heroIndex >= imagePaths.length) {
      setHeroIndex(0);
    }
  }, [heroIndex, imagePaths.length]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (imagePaths.length === 0) {
        if (mounted) {
          setSignedUrls([]);
          setImgLoading(false);
        }
        return;
      }

      try {
        if (mounted) setImgLoading(true);
        const urls = await Promise.all(
          imagePaths.map(async path => {
            const url = await getMemoryImageSignedUrlCached(path);
            return url ?? '';
          }),
        );
        if (mounted) {
          setSignedUrls(urls.filter(Boolean));
        }
      } catch {
        if (mounted) setSignedUrls([]);
      } finally {
        if (mounted) setImgLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [imagePaths]);

  const onHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    if (layoutWidth <= 0) return;
    const index = Math.max(0, Math.round(x / layoutWidth));
    setHeroIndex(prev => (prev === index ? prev : index));
  };

  const onPressEdit = useCallback(() => {
    if (!petId || !memoryId) return;
    navigation.navigate('RecordEdit', { petId, memoryId });
  }, [navigation, petId, memoryId]);

  const onPressDelete = useCallback(() => {
    if (!petId || !memoryId || !record) return;
    setDeleteModalVisible(true);
  }, [petId, memoryId, record]);

  const onPressRelatedRecord = useCallback(
    (nextMemoryId: string) => {
      if (!petId || !nextMemoryId) return;
      navigation.push('RecordDetail', { petId, memoryId: nextMemoryId });
    },
    [navigation, petId],
  );

  const onScrollFeed = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!petId || !hasMore) return;
      if (status === 'loadingMore' || status === 'loading' || status === 'refreshing') {
        return;
      }

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const remain = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (remain > 480) return;

      loadMore(petId);
    },
    [hasMore, loadMore, petId, status],
  );

  const onConfirmDelete = useCallback(async () => {
    if (!petId || !memoryId || !record) return;
    try {
      setDeleting(true);

      await deleteMemoryWithFile({
        memoryId,
        imagePath: record.imagePath,
        imagePaths: record.imagePaths,
      });

      removeOneLocal(petId, memoryId);
      await refresh(petId);
      setDeleteModalVisible(false);
      safeGoBack();
    } catch (e: any) {
      Alert.alert('삭제 실패', e?.message ?? '오류');
    } finally {
      setDeleting(false);
    }
  }, [petId, memoryId, record, removeOneLocal, refresh, safeGoBack]);

  if (!record) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backBtn}
            onPress={safeGoBack}
          >
            <Feather name="chevron-left" size={30} color="#0B1220" />
          </TouchableOpacity>

          <AppText preset="headline" style={styles.headerTitle}>
            추억상세보기
          </AppText>

          <View style={styles.headerRight} />
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

  const ymd = record.occurredAt ?? record.createdAt.slice(0, 10);
  const displayDate = toKoreanDate(ymd);
  const moodMeta = record.emotion ? EMOTION_META[record.emotion] : null;
  const heroUrls = signedUrls.length > 0 ? signedUrls : [];
  const showSlider = heroUrls.length > 1;
  const tagLine = record.tags.slice(0, 4).join(' ');
  const heroWidth = Math.max(220, width - 28);
  const pagerText = `${Math.min(heroIndex + 1, heroUrls.length)}/${heroUrls.length}`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backBtn}
          onPress={safeGoBack}
        >
          <Feather name="chevron-left" size={30} color="#0B1220" />
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          추억상세보기
        </AppText>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        onScroll={onScrollFeed}
        scrollEventThrottle={16}
      >
        {imgLoading ? (
          <View style={styles.heroPlaceholder}>
            <ActivityIndicator size="large" color="#8A94A6" />
          </View>
        ) : heroUrls.length === 0 ? (
          <View style={styles.heroPlaceholder}>
            <AppText preset="caption" style={styles.heroPlaceholderText}>
              사진이 없어요
            </AppText>
          </View>
        ) : (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroScrollEnd}
            snapToInterval={heroWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            overScrollMode="never"
            directionalLockEnabled
            scrollEventThrottle={16}
            style={styles.heroSlider}
          >
            {heroUrls.map(url => (
              <Image
                key={url}
                source={{ uri: url }}
                style={[styles.heroImg, { width: heroWidth }]}
                resizeMode="cover"
                fadeDuration={200}
              />
            ))}
          </ScrollView>
        )}
        {showSlider ? (
          <View style={styles.heroPagerBox}>
            <View style={styles.heroDots}>
              {heroUrls.map((url, index) => (
                <View
                  key={`${url}-${index}`}
                  style={[
                    styles.heroDot,
                    index === heroIndex ? styles.heroDotActive : null,
                  ]}
                />
              ))}
            </View>
            <AppText preset="caption" style={styles.heroPagerText}>
              {pagerText}
            </AppText>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.metaRow}>
            {record.tags[0] ? (
              <View style={styles.categoryBadge}>
                <AppText preset="caption" style={styles.categoryBadgeText}>
                  {record.tags[0]}
                </AppText>
              </View>
            ) : null}

            <AppText preset="caption" style={styles.metaText}>
              {displayDate}
            </AppText>
          </View>

          <AppText preset="title2" style={styles.title}>
            {record.title}
          </AppText>

          {moodMeta ? (
            <View style={styles.moodCard}>
              <View style={styles.moodIconWrap}>
                <AppText preset="caption" style={styles.moodEmoji}>
                  {moodMeta.emoji}
                </AppText>
              </View>
              <View style={styles.moodTextWrap}>
                <AppText preset="caption" style={styles.moodLabel}>
                  오늘의 기분
                </AppText>
                <AppText preset="body" style={styles.moodValue}>
                  {moodMeta.label}
                </AppText>
              </View>
            </View>
          ) : null}

          <View style={styles.contentBox}>
            <AppText preset="body" style={styles.content}>
              {record.content?.trim()
                ? record.content.trim()
                : '내용이 없습니다.'}
            </AppText>
          </View>

          {tagLine ? (
            <AppText preset="caption" style={styles.tags}>
              {tagLine}
            </AppText>
          ) : null}
        </View>

        <View style={styles.cardOutsideActionRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.simpleActionBtn}
            onPress={onPressEdit}
            disabled={deleting}
          >
            <AppText preset="caption" style={styles.simpleActionText}>
              수정
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.simpleActionBtn}
            onPress={onPressDelete}
            disabled={deleting}
          >
            <AppText
              preset="caption"
              style={[
                styles.simpleActionText,
                deleting ? styles.simpleActionTextDisabled : styles.simpleDeleteText,
              ]}
            >
              {deleting ? '삭제중' : '삭제'}
            </AppText>
          </TouchableOpacity>
        </View>

        {relatedRecords.length > 0 ? (
          <View style={styles.feedSection}>
            <View style={styles.feedHeader}>
              <AppText preset="headline" style={styles.feedSectionTitle}>
                이어지는 기록
              </AppText>
              <AppText preset="caption" style={styles.feedSectionCaption}>
                아래로 내리면 같은 아이의 추억이 계속 이어져요
              </AppText>
            </View>

            <View style={styles.feedList}>
              {relatedRecords.map(item => (
                <FeedCard
                  key={item.id}
                  item={item}
                  onPress={() => onPressRelatedRecord(item.id)}
                />
              ))}
            </View>

            {status === 'loadingMore' ? (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="small" color="#8A94A6" />
              </View>
            ) : null}
          </View>
        ) : null}

      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircleDanger}>
              <Feather name="alert-triangle" size={20} color="#FF4D4F" />
            </View>

            <AppText preset="title2" style={styles.modalTitle}>
              정말 삭제할까요?
            </AppText>
            <AppText preset="body" style={styles.modalDesc}>
              삭제된 추억은 다시 복구할 수 없어요.
            </AppText>
            <AppText preset="body" style={styles.modalDesc}>
              신중하게 선택해 주세요.
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalPrimaryBtn}
              onPress={() => setDeleteModalVisible(false)}
              disabled={deleting}
            >
              <AppText preset="body" style={styles.modalPrimaryBtnText}>
                취소
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalGhostBtn}
              onPress={onConfirmDelete}
              disabled={deleting}
            >
              <AppText preset="body" style={styles.modalGhostBtnText}>
                {deleting ? '삭제 중...' : '삭제하기'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
