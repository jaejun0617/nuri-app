import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  useWalkProgression,
  useWalkScope,
  walkKey,
} from '../../hooks/useWalkProduct';
import { walkRecordRepository } from '../../services/walk/server/supabaseWalkRecordRepository';
import { walkRequest } from '../../services/walk/product/requests';
import {
  walkDistance,
  walkSummaryCopy,
  walkResultStatusCopy,
  type WalkResultServerState,
  WALK_MILESTONE_LABEL,
} from '../../services/walk/product/presentation';
import { invalidateWalkProduct } from '../../services/walk/product/invalidation';

// F composes this with the existing result leaf. It has no Native import,
// controller, subscription, GPS collection or Account XP side effect.
export default function WalkResultIntegration({
  petId,
  clientSessionId,
  state,
  previousLevel,
}: {
  petId: string;
  clientSessionId: string;
  state: WalkResultServerState;
  previousLevel?: string;
}) {
  const scope = useWalkScope(petId, 'PINNED');
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const accepted = state === 'ACCEPTED_SERVER';
  const refreshed = useRef('');
  useEffect(() => {
    if (
      !accepted ||
      !scope ||
      refreshed.current === `${scope.ownerId}:${clientSessionId}`
    )
      return;
    invalidateWalkProduct(scope, 'ACCEPTED_FINISH');
    refreshed.current = `${scope.ownerId}:${clientSessionId}`;
  }, [accepted, scope, clientSessionId]);
  const record = useQuery({
    queryKey: [
      ...walkKey(scope?.ownerId ?? null, petId, 'record'),
      clientSessionId,
      scope?.generation,
    ],
    enabled: accepted && !!scope,
    queryFn: ({ signal }) =>
      walkRequest(
        scope!,
        () => walkRecordRepository.get(clientSessionId, petId),
        signal,
      ),
    refetchOnMount: 'always',
    retry: false,
  });
  const progression = useWalkProgression(petId, accepted, 'PINNED');
  const source = record.data;
  const levelUp =
    previousLevel &&
    /^\d+$/.test(previousLevel) &&
    progression.data &&
    BigInt(progression.data.level) > BigInt(previousLevel);
  return (
    <View testID="walk-result-product-integration" style={styles.content}>
      <AppText preset="unifiedMeta">{walkResultStatusCopy(state)}</AppText>
      {accepted && source?.summary && (
        <AppText preset="unifiedBody">
          {walkSummaryCopy(source.summary)}
        </AppText>
      )}
      {accepted && progression.data && (
        <>
          <AppText preset="unifiedMeta">
            평생 {walkDistance(progression.data.lifetimeDistanceM)} · 산책 Lv.{' '}
            {progression.data.level}
            {levelUp ? ' · 레벨이 올랐어요' : ''}
          </AppText>
          <AppText preset="unifiedMeta">
            {progression.data.milestones.length
              ? `달성한 발자국 · ${progression.data.milestones
                  .map(item => WALK_MILESTONE_LABEL[item.key])
                  .join(' · ')}`
              : '발자국을 함께 모아보세요.'}
          </AppText>
        </>
      )}
      {accepted && (record.isError || progression.isError) && (
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          onPress={() => {
            record.refetch().catch(() => undefined);
            progression.refetch().catch(() => undefined);
          }}
        >
          <AppText preset="unifiedMeta">연결 후 다시 확인</AppText>
        </Pressable>
      )}
      {accepted && source?.recordState === 'RECORD_PENDING' && (
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          onPress={() => {
            if (scope?.current())
              navigation.navigate('RecordCreate', {
                petId,
                gpsSession: { clientSessionId },
                returnTo: { tab: 'WalkHistory', petId },
              });
          }}
        >
          <AppText preset="unifiedBody">산책 기록으로 남기기</AppText>
        </Pressable>
      )}
      {accepted && source?.recordState === 'RECORDED' && source.memory && (
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          onPress={() => {
            if (scope?.current())
              navigation.navigate('AppTabs', {
                screen: 'TimelineTab',
                params: {
                  screen: 'RecordDetail',
                  params: { petId, memoryId: source.memory!.id },
                },
              });
          }}
        >
          <AppText preset="unifiedBody">남긴 기록 보기</AppText>
        </Pressable>
      )}
      {accepted && source?.recordState === 'RECORD_DELETED' && (
        <AppText preset="unifiedMeta">
          삭제한 기록은 다시 작성할 수 없어요.
        </AppText>
      )}
      {state === 'REJECTED_SERVER' && (
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          onPress={() =>
            navigation.navigate('RecordCreate', {
              petId,
              initialMainCategory: 'walk',
              returnTo: { tab: 'HomeTab' },
            })
          }
        >
          <AppText preset="unifiedBody">수동 기록 남기기</AppText>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: 6, paddingHorizontal: 18 },
  action: { minHeight: 48, justifyContent: 'center' },
});
