import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import {
  fetchCommunityBlockedUsers,
  getCommunityBlockErrorMessage,
  unblockCommunityUser,
} from '../../services/supabase/communityBlocks';
import { useCommunityStore } from '../../store/communityStore';
import { showToast } from '../../store/uiStore';
import type { CommunityBlockedUser } from '../../types/community';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function CommunityBlockedUsersScreen() {
  const theme = useTheme();
  const invalidateCommunityVisibility = useCommunityStore(
    state => state.invalidateCommunityVisibility,
  );
  const [items, setItems] = useState<CommunityBlockedUser[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    setStatus(previous => (previous === 'ready' ? 'ready' : 'loading'));
    setErrorMessage(null);
    try {
      const nextItems = await fetchCommunityBlockedUsers();
      setItems(nextItems);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setErrorMessage(getCommunityBlockErrorMessage(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers().catch(() => {});
    }, [loadBlockedUsers]),
  );

  const handleUnblock = useCallback(
    async (item: CommunityBlockedUser) => {
      if (unblockingUserId) return;
      setUnblockingUserId(item.userId);
      try {
        await unblockCommunityUser(item.userId);
        setItems(previous =>
          previous.filter(blockedUser => blockedUser.userId !== item.userId),
        );
        await invalidateCommunityVisibility();
        showToast({ tone: 'success', message: '차단을 해제했어요.' });
      } catch (error) {
        showToast({
          tone: 'error',
          message: getCommunityBlockErrorMessage(error),
        });
      } finally {
        setUnblockingUserId(null);
      }
    },
    [invalidateCommunityVisibility, unblockingUserId],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityBlockedUser }) => (
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.rowCopy}>
          <AppText
            preset="body"
            style={[styles.nickname, { color: theme.colors.textPrimary }]}
          >
            {item.nickname}
          </AppText>
          <AppText
            preset="caption"
            style={{ color: theme.colors.textMuted }}
          >
            차단한 사용자
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={unblockingUserId !== null}
          onPress={() => handleUnblock(item)}
          style={[
            styles.unblockButton,
            {
              borderColor: theme.colors.border,
              opacity: unblockingUserId === item.userId ? 0.55 : 1,
            },
          ]}
        >
          {unblockingUserId === item.userId ? (
            <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          ) : (
            <AppText
              preset="caption"
              style={{ color: theme.colors.textPrimary }}
            >
              차단 해제
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    ),
    [handleUnblock, theme.colors, unblockingUserId],
  );

  if (status === 'loading' && items.length === 0) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={theme.colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerState}>
          <AppText
            preset="body"
            style={[styles.stateTitle, { color: theme.colors.textPrimary }]}
          >
            차단한 사용자를 불러오지 못했어요.
          </AppText>
          <AppText
            preset="caption"
            style={{ color: theme.colors.textMuted, textAlign: 'center' }}
          >
            {errorMessage ?? '잠시 후 다시 시도해 주세요.'}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => loadBlockedUsers().catch(() => {})}
            style={[
              styles.retryButton,
              { borderColor: theme.colors.border },
            ]}
          >
            <AppText preset="caption" style={{ color: theme.colors.textPrimary }}>
              다시 시도
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={items}
        keyExtractor={item => item.userId}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? styles.emptyContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading'}
            onRefresh={() => loadBlockedUsers().catch(() => {})}
            tintColor={theme.colors.brand}
          />
        }
        ListEmptyComponent={
          <View style={styles.centerState}>
            <AppText
              preset="body"
              style={[styles.stateTitle, { color: theme.colors.textPrimary }]}
            >
              차단한 사용자가 없어요.
            </AppText>
            <AppText
              preset="caption"
              style={{ color: theme.colors.textMuted, textAlign: 'center' }}
            >
              차단한 사용자는 이곳에서 관리할 수 있어요.
            </AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, gap: 10 },
  emptyContent: { flexGrow: 1, padding: 24 },
  row: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCopy: { flex: 1, gap: 4 },
  nickname: { fontWeight: '600' },
  unblockButton: {
    minHeight: 44,
    minWidth: 84,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateTitle: { textAlign: 'center' },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});
