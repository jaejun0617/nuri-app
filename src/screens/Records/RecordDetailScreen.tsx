// 파일: src/screens/Records/RecordDetailScreen.tsx
// 목적:
// - 기록 상세
// - 헤더에 "수정" 버튼 → RecordEdit로 이동
// - deleteMemoryWithFile로 Storage 파일까지 삭제
// - optimistic remove + refresh
//
// ✅ 이번 수정 포인트 (중요)
// 1) 뒤로가기 안전 처리:
//    - canGoBack() ? goBack() : reset(Main)
// 2) Zustand selector에서 getPetState() 호출 제거:
//    - byPetId[petId] 직접 구독하여 안정성 확보

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { deleteMemoryWithFile } from '../../services/supabase/memories';
import { useRecordStore } from '../../store/recordStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = {
  key: string;
  name: string;
  params: { petId: string; memoryId: string };
};

export default function RecordDetailScreen() {
  // ---------------------------------------------------------
  // 1) nav/params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId ?? null;
  const memoryId = route.params?.memoryId ?? null;

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });

  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(r => r.id === memoryId) ?? null;
  }, [petState?.items, memoryId]);

  // ---------------------------------------------------------
  // 3) local
  // ---------------------------------------------------------
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------
  // 4) navigation helpers
  // ---------------------------------------------------------
  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // ⚠️ 프로젝트의 "홈 루트" 라우트명이 다르면 여기만 수정
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' as keyof RootStackParamList }],
    });
  }, [navigation]);

  // ---------------------------------------------------------
  // 5) actions
  // ---------------------------------------------------------
  const onPressEdit = useCallback(() => {
    if (!petId || !memoryId) return;
    navigation.navigate('RecordEdit', { petId, memoryId });
  }, [navigation, petId, memoryId]);

  const onPressDelete = useCallback(() => {
    if (!petId || !memoryId || !record) return;

    Alert.alert('삭제할까요?', '복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);

            await deleteMemoryWithFile({
              memoryId,
              imagePath: record.imagePath,
            });

            // optimistic
            removeOneLocal(petId, memoryId);
            await refresh(petId);

            safeGoBack();
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.message ?? '오류');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [petId, memoryId, record, removeOneLocal, refresh, safeGoBack]);

  // ---------------------------------------------------------
  // 6) empty
  // ---------------------------------------------------------
  if (!record) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backBtn}
            onPress={safeGoBack}
          >
            <AppText preset="body" style={styles.backText}>
              ←
            </AppText>
          </TouchableOpacity>

          <AppText preset="headline" style={styles.headerTitle}>
            상세
          </AppText>

          <View style={{ width: 88 }} />
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

  // ---------------------------------------------------------
  // 7) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backBtn}
          onPress={safeGoBack}
        >
          <AppText preset="body" style={styles.backText}>
            ←
          </AppText>
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          상세
        </AppText>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.editBtn}
            onPress={onPressEdit}
            disabled={deleting}
          >
            <AppText preset="caption" style={styles.editText}>
              수정
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.deleteBtn,
              deleting ? styles.deleteBtnDisabled : null,
            ]}
            onPress={onPressDelete}
            disabled={deleting}
          >
            <AppText preset="caption" style={styles.deleteText}>
              {deleting ? '삭제중' : '삭제'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {record.imageUrl ? (
          <Image source={{ uri: record.imageUrl }} style={styles.heroImg} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <AppText preset="caption" style={styles.heroPlaceholderText}>
              NO IMAGE
            </AppText>
          </View>
        )}

        <View style={styles.card}>
          <AppText preset="title2" style={styles.title}>
            {record.title}
          </AppText>

          <View style={styles.metaRow}>
            <AppText preset="caption" style={styles.metaText}>
              {record.occurredAt ?? record.createdAt.slice(0, 10)}
            </AppText>

            {record.emotion ? (
              <View style={styles.badge}>
                <AppText preset="caption" style={styles.badgeText}>
                  {record.emotion}
                </AppText>
              </View>
            ) : null}
          </View>

          {record.tags?.length ? (
            <AppText preset="caption" style={styles.tags}>
              {record.tags.join(' ')}
            </AppText>
          ) : null}

          <AppText preset="body" style={styles.content}>
            {record.content?.trim()
              ? record.content.trim()
              : '내용이 없습니다.'}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },

  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontWeight: '900', color: '#0B1220' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B1220',
    fontWeight: '900',
  },

  headerRight: { flexDirection: 'row', gap: 8 },

  editBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { color: '#0B1220', fontWeight: '900' },

  deleteBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteText: { color: '#FFFFFF', fontWeight: '900' },

  body: { padding: 14, gap: 12 },
  heroImg: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: { color: '#8A94A6', fontWeight: '800' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E8F0',
  },
  title: { color: '#0B1220', fontWeight: '900' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  metaText: { color: '#8A94A6', fontWeight: '700' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  badgeText: { color: '#0B1220', fontWeight: '800' },

  tags: { marginTop: 10, color: '#6D7CFF', fontWeight: '800' },
  content: { marginTop: 14, color: '#556070', lineHeight: 22 },

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
  emptyTitle: { color: '#0B1220', fontWeight: '900' },
  emptyDesc: { color: '#556070', textAlign: 'center' },
});
