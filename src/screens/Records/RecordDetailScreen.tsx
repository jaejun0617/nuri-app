// 파일: src/screens/Records/RecordDetailScreen.tsx
// 역할:
// - 추억 상세를 인스타그램형 피드 감각으로 재구성한 화면
// - 현재 기록과 같은 아이의 다른 기록을 카드 단위 피드로 이어서 보여줌
// - 각 카드마다 바로 수정/삭제 가능한 액션 메뉴를 제공

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import AppText from '../../app/ui/AppText';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { MemoryRecord } from '../../services/supabase/memories';
import { deleteMemoryWithFile } from '../../services/supabase/memories';
import { getMemoryImageSignedUrlCached } from '../../services/supabase/storageMemories';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { styles } from './RecordDetailScreen.styles';

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

function formatRelativeTime(value: string) {
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return '';

  const diffMs = Math.max(0, Date.now() - target);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes}분 전`;
  }
  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${hours}시간 전`;
  }
  const days = Math.max(1, Math.floor(diffMs / day));
  return `${days}일 전`;
}

function FeedPostCard({
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const moodMeta = item.emotion ? EMOTION_META[item.emotion] : null;

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

  const displayDate = useMemo(
    () => toKoreanDate(item.occurredAt ?? item.createdAt.slice(0, 10)),
    [item.createdAt, item.occurredAt],
  );
  const relativeTime = useMemo(
    () => formatRelativeTime(item.createdAt),
    [item.createdAt],
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

      {previewUrl ? (
        <Image source={{ uri: previewUrl }} style={styles.postImage} resizeMode="cover" />
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

        <AppText preset="caption" style={styles.postDateText}>
          {displayDate}
        </AppText>
      </View>
    </View>
  );
}

export default function RecordDetailScreen() {
  const navigation = useNavigation<TimelineNav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId ?? null;
  const memoryId = route.params?.memoryId ?? null;

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });
  const loadMore = useRecordStore(s => s.loadMore);
  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const pets = usePetStore(s => s.pets);

  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petName = useMemo(
    () => selectedPet?.name?.trim() || '우리 아이',
    [selectedPet?.name],
  );
  const petAvatarUrl = useMemo(
    () => selectedPet?.avatarUrl ?? null,
    [selectedPet?.avatarUrl],
  );

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(item => item.id === memoryId) ?? null;
  }, [memoryId, petState?.items]);

  const feedRecords = useMemo(() => {
    if (!record) return [];
    const items = petState?.items ?? [];
    return [record, ...items.filter(item => item.id !== record.id)];
  }, [petState?.items, record]);

  const hasMore = Boolean(petState?.hasMore);
  const status = petState?.status ?? 'idle';

  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  const actionTarget = useMemo(
    () => feedRecords.find(item => item.id === actionTargetId) ?? null,
    [actionTargetId, feedRecords],
  );

  const openActionMenu = useCallback((targetId: string) => {
    setActionTargetId(targetId);
    setActionMenuVisible(true);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setActionTargetId(null);
  }, []);

  const onPressEdit = useCallback(() => {
    if (!petId || !actionTargetId) return;
    closeActionMenu();
    navigation.navigate('RecordEdit', { petId, memoryId: actionTargetId });
  }, [actionTargetId, closeActionMenu, navigation, petId]);

  const onPressDelete = useCallback(() => {
    if (!petId || !actionTarget) return;
    closeActionMenu();
    setDeleteModalVisible(true);
  }, [actionTarget, closeActionMenu, petId]);

  const onConfirmDelete = useCallback(async () => {
    if (!petId || !actionTarget) return;

    try {
      setDeleting(true);
      await deleteMemoryWithFile({
        memoryId: actionTarget.id,
        imagePath: actionTarget.imagePath,
        imagePaths: actionTarget.imagePaths,
      });

      removeOneLocal(petId, actionTarget.id);
      await refresh(petId);
      setDeleteModalVisible(false);

      if (actionTarget.id === memoryId) {
        navigation.navigate('TimelineMain', {
          petId: petId ?? undefined,
          mainCategory: 'all',
        });
      }
    } catch (error: any) {
      Alert.alert('삭제 실패', error?.message ?? '오류');
    } finally {
      setDeleting(false);
      setActionTargetId(null);
    }
  }, [actionTarget, memoryId, navigation, petId, refresh, removeOneLocal]);

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
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        onScroll={onScrollFeed}
        scrollEventThrottle={16}
      >
        {feedRecords.map(item => (
          <FeedPostCard
            key={item.id}
            item={item}
            petName={petName}
            petAvatarUrl={petAvatarUrl}
            onPressMore={() => openActionMenu(item.id)}
          />
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
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismiss} onPress={closeActionMenu} />
          <View style={styles.actionSheet}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.sheetActionRow}
              onPress={onPressEdit}
              disabled={deleting}
            >
              <Feather name="edit-2" size={18} color="#243042" />
              <AppText preset="body" style={styles.sheetActionText}>
                수정
              </AppText>
            </TouchableOpacity>

            <View style={styles.sheetActionDivider} />

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.sheetActionRow}
              onPress={onPressDelete}
              disabled={deleting}
            >
              <Feather name="trash-2" size={18} color="#FF5A5F" />
              <AppText preset="body" style={styles.sheetActionDeleteText}>
                {deleting ? '삭제중' : '삭제'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.sheetCancelButton}
              onPress={closeActionMenu}
            >
              <AppText preset="body" style={styles.sheetCancelText}>
                취소
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
