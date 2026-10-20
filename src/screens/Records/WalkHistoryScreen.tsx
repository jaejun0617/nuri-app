import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import Feather from '../../components/icons/NuriFeatherIcon';
import { SeasonalFormBackground } from '../../components/common/SeasonalFormSurface';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { useWalkScope, walkKey } from '../../hooks/useWalkProduct';
import { walkRecordRepository } from '../../services/walk/server/supabaseWalkRecordRepository';
import type {
  WalkRecordCursor,
  WalkRecordReference,
} from '../../services/walk/server/recordRepository';
import {
  walkRequest,
  walkErrorCopy,
} from '../../services/walk/product/requests';
import { walkSummaryCopy } from '../../services/walk/product/presentation';
import { getDateYmdInKst } from '../../utils/date';

export default function WalkHistoryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RootScreenRoute<'WalkHistory'>>();
  const scope = useWalkScope(params.petId);
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const query = useInfiniteQuery({
    queryKey: [
      ...walkKey(scope?.ownerId ?? null, params.petId, 'history'),
      scope?.generation,
    ],
    enabled: !!scope && focused,
    initialPageParam: null as WalkRecordCursor | null,
    queryFn: ({ signal, pageParam }) =>
      walkRequest(
        scope!,
        () => walkRecordRepository.history(params.petId, 30, pageParam),
        signal,
      ),
    getNextPageParam: page => (page.hasMore ? page.nextCursor : undefined),
    refetchOnMount: 'always',
    staleTime: 30_000,
    retry: false,
  });
  const unique = new Map<string, WalkRecordReference>();
  for (const page of query.data?.pages ?? [])
    for (const item of page.items) unique.set(item.clientSessionId, item);
  const open = (item: WalkRecordReference) => {
    if (!scope?.current()) return;
    if (item.recordState === 'RECORDED' && item.originalMemoryId)
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: {
          screen: 'RecordDetail',
          params: { petId: params.petId, memoryId: item.originalMemoryId },
        },
      });
    else if (item.recordState === 'RECORD_PENDING')
      navigation.navigate('RecordCreate', {
        petId: params.petId,
        gpsSession: { clientSessionId: item.clientSessionId },
        returnTo: { tab: 'WalkHistory', petId: params.petId },
      });
  };
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <SeasonalFormBackground />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={20} color="#102033" />
        </Pressable>
        <AppText preset="unifiedTitle" style={styles.title}>산책 이력</AppText>
        <View style={styles.back} />
      </View>
      {!scope && (
        <AppText preset="unifiedBody">이 산책의 아이를 선택해 주세요.</AppText>
      )}
      <FlatList
        data={scope ? [...unique.values()] : []}
        keyExtractor={item => item.clientSessionId}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={() => {
          if (scope) query.refetch().catch(() => undefined);
        }}
        renderItem={({ item }) => (
          <Pressable
            testID={`walk-history-${item.recordState}`}
            style={styles.row}
            accessibilityRole="button"
            disabled={item.recordState === 'RECORD_DELETED'}
            onPress={() => open(item)}
          >
            <AppText preset="unifiedMeta">
              {item.summary ? getDateYmdInKst(item.summary.startedAt) : ''}
            </AppText>
            <AppText preset="unifiedBody">
              {item.summary ? walkSummaryCopy(item.summary) : '산책'}
            </AppText>
            <AppText preset="unifiedMeta">
              {item.recordState === 'RECORDED'
                ? '기록 보기'
                : item.recordState === 'RECORD_DELETED'
                ? '기록 삭제됨 · 다시 작성할 수 없어요'
                : '기록으로 남기기'}
            </AppText>
          </Pressable>
        )}
        ListEmptyComponent={
          query.isPending && scope ? (
            <ActivityIndicator />
          ) : !query.isError && scope ? (
            <AppText preset="unifiedBody">
              아직 완료한 GPS 산책이 없어요.
            </AppText>
          ) : undefined
        }
        ListFooterComponent={
          <View>
            {query.isError && (
              <AppText preset="unifiedMeta">
                {walkErrorCopy(query.error)}
              </AppText>
            )}
            {query.isError ? (
              <Pressable
                style={styles.action}
                onPress={() => {
                  (query.isFetchNextPageError
                    ? query.fetchNextPage()
                    : query.refetch()
                  ).catch(() => undefined);
                }}
              >
                <AppText preset="unifiedBody">다시 확인</AppText>
              </Pressable>
            ) : query.hasNextPage ? (
              <Pressable
                accessibilityRole="button"
                disabled={query.isFetchingNextPage}
                style={styles.action}
                onPress={() => {
                  query.fetchNextPage().catch(() => undefined);
                }}
              >
                <AppText preset="unifiedBody">
                  {query.isFetchingNextPage
                    ? '불러오는 중'
                    : '이전 산책 더 보기'}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  back: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  list: { padding: 20, gap: 10 },
  row: {
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D6DCE3',
  },
});
