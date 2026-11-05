import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import { HomeReflectiveGlass } from '../home/HomeReflectiveGlass';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  useWalkProgression,
  useWalkPrompt,
  useWalkScope,
} from '../../hooks/useWalkProduct';
import {
  walkDistance,
  walkProgressPercent,
  walkSummaryCopy,
} from '../../services/walk/product/presentation';
import { walkRecordRepository } from '../../services/walk/server/supabaseWalkRecordRepository';
import { invalidateWalkProduct } from '../../services/walk/product/invalidation';
import {
  walkRequest,
  walkErrorCopy,
} from '../../services/walk/product/requests';

const milestoneNames = {
  FIRST_GPS_WALK: '첫 GPS 산책',
  '10_KM': '함께 10 km',
  '100_KM': '함께 100 km',
} as const;
export function WalkProgressionRow({
  petId,
  enabled,
  expanded = false,
}: {
  petId: string | null;
  enabled: boolean;
  expanded?: boolean;
}) {
  const query = useWalkProgression(petId, enabled);
  const theme = useTheme();
  const p = query.data;
  if (p && !expanded) {
    const minutes =
      typeof p.lifetimeActiveDurationMs === 'string'
        ? (BigInt(p.lifetimeActiveDurationMs) / 60_000n).toString()
        : null;
    return (
      <HomeReflectiveGlass
        testID="walk-home-progression"
        borderRadius={18}
        style={styles.homeProgression}
      >
        <View style={styles.progressionMetric}>
          <View style={styles.metricCopy}>
            <AppText preset="unifiedMeta" style={styles.metricLabel}>평생 함께 걸은 거리</AppText>
            <AppText preset="unifiedTitle" style={styles.progressionValue}>
              {walkDistance(p.lifetimeDistanceM)}
            </AppText>
          </View>
        </View>
        <View style={styles.progressionDivider} />
        <View style={styles.progressionMetric}>
          <View style={styles.metricCopy}>
            <AppText preset="unifiedMeta" style={styles.metricLabel}>산책</AppText>
            <AppText preset="unifiedTitle" style={styles.progressionValue}>
              Lv. {p.level}
            </AppText>
            <AppText testID="home-walk-active-minutes" preset="unifiedMeta" style={styles.metricLabel}>
              {minutes === null ? '산책 시간 확인 필요' : `산책 ${minutes}분`}
            </AppText>
          </View>
        </View>
      </HomeReflectiveGlass>
    );
  }
  return (
    <View
      testID={expanded ? 'walk-profile-progression' : 'walk-home-progression'}
      style={styles.section}
    >
      {p ? (
        <>
          <AppText preset="unifiedMeta">
            평생 함께 걸은 거리 · {walkDistance(p.lifetimeDistanceM)} · 산책 Lv.{' '}
            {p.level}
          </AppText>
          {expanded && (
            <>
              <AppText preset="unifiedMeta">
                다음 레벨까지 {walkDistance(p.distanceToNextLevelM)} ·{' '}
                {walkProgressPercent(p.progress)}%
              </AppText>
              <View
                style={[styles.track, { backgroundColor: theme.colors.border }]}
              >
                <View
                  style={{
                    height: 3,
                    width: `${walkProgressPercent(p.progress)}%`,
                    backgroundColor: theme.colors.brand,
                  }}
                />
              </View>
              <AppText preset="unifiedMeta">
                {p.milestones.length
                  ? p.milestones.map(m => milestoneNames[m.key]).join(' · ')
                  : '산책을 함께하며 발자국을 모아보세요.'}
              </AppText>
            </>
          )}
        </>
      ) : (
        <AppText preset="unifiedMeta">
          {query.isError
            ? '산책 정보를 확인하지 못했어요.'
            : '산책 정보를 불러오는 중이에요.'}
        </AppText>
      )}
      {query.isError && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            query.refetch().catch(() => undefined);
          }}
          style={styles.action}
        >
          <AppText preset="unifiedMeta">다시 확인</AppText>
        </Pressable>
      )}
    </View>
  );
}
export function WalkHomeFooter({
  petId,
  enabled,
}: {
  petId: string | null;
  enabled: boolean;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const prompt = useWalkPrompt(petId, enabled);
  const scope = useWalkScope(petId, 'SELECTED');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setBusy(false);
    setError(null);
  }, [scope?.ownerId, scope?.generation, petId]);
  const item = prompt.data;
  if (!enabled || !petId || !scope) return null;
  const dismiss = async () => {
    if (busy || !item) return;
    setBusy(true);
    setError(null);
    try {
      await walkRequest(scope, () =>
        walkRecordRepository.dismiss(item.clientSessionId, petId),
      );
      invalidateWalkProduct(scope, 'PROMPT_DISMISS');
    } catch (e) {
      if (scope.current()) setError(walkErrorCopy(e));
    } finally {
      if (scope.current()) setBusy(false);
    }
  };
  return (
    <View testID="walk-home-footer" style={styles.section}>
      <WalkProgressionRow petId={petId} enabled={enabled} />
      {item?.summary && (
        <View>
          <AppText preset="unifiedMeta">
            {walkSummaryCopy(item.summary)}
          </AppText>
          <AppText preset="unifiedMeta">
            아직 기록으로 남기지 않은 산책이 있어요.
          </AppText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              disabled={busy}
              onPress={() =>
                navigation.navigate('RecordCreate', {
                  petId,
                  gpsSession: { clientSessionId: item.clientSessionId },
                  returnTo: { tab: 'HomeTab' },
                })
              }
            >
              <AppText preset="unifiedMeta">기록하기</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="산책 기록 안내 닫기"
              style={styles.action}
              disabled={busy}
              onPress={() => {
                dismiss().catch(() => undefined);
              }}
            >
              <AppText preset="unifiedMeta">닫기</AppText>
            </Pressable>
          </View>
        </View>
      )}
      {error && <AppText preset="unifiedMeta">{error}</AppText>}
      <Pressable
        accessibilityRole="button"
        style={[styles.action, styles.historyAction]}
        onPress={() => navigation.navigate('WalkHistory', { petId })}
      >
        <AppText preset="unifiedMeta">산책 이력 보기</AppText>
        <NuriSemanticIcon
          family="feather"
          preserveOriginal
          name="chevron-right"
          size={18}
          color="#7D5CE4"
        />
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  homeProgression: {
    marginTop: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  progressionMetric: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCopy: { width: '100%', minWidth: 0, alignItems: 'center', gap: 4 },
  metricLabel: { textAlign: 'center' },
  progressionValue: { fontSize: 24, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  progressionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(125,92,228,0.22)',
  },
  section: { gap: 6, paddingTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  historyAction: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },
  track: { height: 3, overflow: 'hidden', borderRadius: 2 },
});
