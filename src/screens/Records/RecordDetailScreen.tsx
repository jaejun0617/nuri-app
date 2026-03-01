// 파일: src/screens/Records/RecordDetailScreen.tsx
// 목적:
// - 기록 상세
// - deleteMemoryWithFile로 Storage 파일까지 삭제 (완전체)
// - optimistic remove + refresh
// - RecordEdit로 수정 이동

import React, { useMemo, useState, useCallback } from 'react';
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
  // 1) nav / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { petId, memoryId } = route.params;

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const petState = useRecordStore(s => s.getPetState(petId));
  const removeOneLocal = useRecordStore(s => s.removeOneLocal);
  const refresh = useRecordStore(s => s.refresh);

  const record = useMemo(
    () => petState.items.find(r => r.id === memoryId) ?? null,
    [petState.items, memoryId],
  );

  // ---------------------------------------------------------
  // 3) local state
  // ---------------------------------------------------------
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------
  // 4) actions
  // ---------------------------------------------------------
  const onPressEdit = useCallback(() => {
    if (!record) return;
    navigation.navigate('RecordEdit', { petId, memoryId });
  }, [memoryId, navigation, petId, record]);

  const onPressDelete = useCallback(() => {
    if (!record) return;

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

            // sync
            await refresh(petId);

            navigation.goBack();
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.message ?? '오류');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [memoryId, petId, record, refresh, removeOneLocal, navigation]);

  // ---------------------------------------------------------
  // 5) guard
  // ---------------------------------------------------------
  if (!record) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
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
  // 6) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
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

      {record.imageUrl ? (
        <Image source={{ uri: record.imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <AppText preset="caption" style={styles.imagePlaceholderText}>
            NO IMAGE
          </AppText>
        </View>
      )}

      <View style={styles.card}>
        <AppText preset="headline" style={styles.title}>
          {record.title}
        </AppText>

        <AppText preset="caption" style={styles.meta}>
          {record.occurredAt ?? record.createdAt.slice(0, 10)}
        </AppText>

        {record.tags?.length ? (
          <AppText preset="caption" style={styles.tags}>
            {record.tags.join(' ')}
          </AppText>
        ) : null}

        <AppText preset="body" style={styles.content}>
          {record.content?.trim() ? record.content.trim() : '내용이 없습니다.'}
        </AppText>
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
    backgroundColor: '#6D7CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { color: '#FFFFFF', fontWeight: '900' },

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

  image: { width: '100%', height: 220, backgroundColor: '#FFFFFF' },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8F0',
  },
  imagePlaceholderText: { color: '#8A94A6', fontWeight: '800' },

  card: { padding: 16 },
  title: { color: '#0B1220', fontWeight: '900' },
  meta: { marginTop: 8, color: '#8A94A6', fontWeight: '700' },
  tags: { marginTop: 8, color: '#6D7CFF', fontWeight: '800' },
  content: { marginTop: 12, color: '#556070', lineHeight: 22 },

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
