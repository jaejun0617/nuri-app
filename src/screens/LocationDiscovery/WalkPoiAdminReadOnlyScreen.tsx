// 파일: src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx
// 파일 목적:
// - V1.1 산책 POI import/review/coverage 상태를 운영자가 읽기 전용으로 확인한다.
// 어디서 쓰이는지:
// - More 운영 메뉴의 "산책 POI 운영" 진입점에서 열린다.
// 핵심 역할:
// - admin/super_admin에게만 batch, review queue, audit, fallback gate 요약을 보여준다.
// - approve/reject/held 같은 write action은 의도적으로 제공하지 않는다.
import React, { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AppText from '../../app/ui/AppText';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type {
  RootScreenNavigation,
  RootScreenRoute,
} from '../../navigation/types';
import {
  fetchWalkPoiAdminReadSummary,
  type WalkPoiAdminAuditLogItem,
  type WalkPoiAdminImportBatch,
  type WalkPoiAdminReadSummary,
  type WalkPoiAdminReviewQueueItem,
} from '../../services/locationDiscovery/walkPoiAdmin';
import { useAuthStore } from '../../store/authStore';
import { openMoreDrawer } from '../../store/uiStore';

type Route = RootScreenRoute<'WalkPoiAdminReadOnly'>;
type Nav = RootScreenNavigation<'WalkPoiAdminReadOnly'>;

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '미기록';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatBatchSummary(batch: WalkPoiAdminImportBatch): string {
  return [
    `created ${formatCount(batch.summary.createdCount)}`,
    `duplicate ${formatCount(batch.summary.duplicateCount)}`,
    `conflict ${formatCount(batch.summary.conflictCount)}`,
    `skipped ${formatCount(batch.summary.skippedCount)}`,
    `review ${formatCount(batch.summary.reviewCount)}`,
  ].join(' · ');
}

function statusTone(status: WalkPoiAdminReviewQueueItem['reviewStatus']) {
  if (status === 'approved') return styles.statusApproved;
  if (status === 'rejected') return styles.statusRejected;
  if (status === 'held') return styles.statusHeld;
  return styles.statusPending;
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <AppText preset="caption" style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText preset="headline" style={styles.metricValue}>
        {typeof value === 'number' ? formatCount(value) : value}
      </AppText>
      {helper ? (
        <AppText preset="caption" style={styles.metricHelper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText preset="titleSm" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.stateCard}>
      <AppText preset="body" style={styles.stateText}>
        {message}
      </AppText>
    </View>
  );
}

function BatchRow({ batch }: { batch: WalkPoiAdminImportBatch }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleBlock}>
          <AppText preset="caption" style={styles.rowEyebrow}>
            {batch.sourceProvider} · {batch.importMode}
          </AppText>
          <AppText preset="body" style={styles.rowTitle} numberOfLines={2}>
            {batch.sourceName ?? batch.id}
          </AppText>
        </View>
        <View style={styles.readOnlyBadge}>
          <AppText preset="caption" style={styles.readOnlyBadgeText}>
            {batch.importStatus}
          </AppText>
        </View>
      </View>
      <AppText preset="caption" style={styles.rowMeta}>
        {formatBatchSummary(batch)}
      </AppText>
      <AppText preset="caption" style={styles.rowMeta}>
        생성 {formatDateTime(batch.createdAt)}
        {batch.finishedAt ? ` · 완료 ${formatDateTime(batch.finishedAt)}` : ''}
      </AppText>
    </View>
  );
}

function ReviewRow({ item }: { item: WalkPoiAdminReviewQueueItem }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleBlock}>
          <AppText preset="caption" style={styles.rowEyebrow}>
            {item.sourceProvider}
            {item.externalSourceId ? ` · ${item.externalSourceId}` : ''}
          </AppText>
          <AppText preset="body" style={styles.rowTitle} numberOfLines={2}>
            {item.name}
          </AppText>
        </View>
        <View style={[styles.statusBadge, statusTone(item.reviewStatus)]}>
          <AppText preset="caption" style={styles.statusBadgeText}>
            {item.reviewStatus}
          </AppText>
        </View>
      </View>
      <AppText preset="caption" style={styles.rowMeta} numberOfLines={2}>
        {item.categoryLabel}
        {item.address ? ` · ${item.address}` : ''}
      </AppText>
      <AppText preset="caption" style={styles.rowMeta}>
        {item.visibilityStatus}/{item.lifecycleStatus} · 검수{' '}
        {formatDateTime(item.reviewedAt)}
      </AppText>
      {item.reviewNote ? (
        <AppText preset="caption" style={styles.rowNote} numberOfLines={2}>
          {item.reviewNote}
        </AppText>
      ) : null}
    </View>
  );
}

function AuditRow({ item }: { item: WalkPoiAdminAuditLogItem }) {
  return (
    <View style={styles.auditRow}>
      <View style={styles.auditIcon}>
        <Feather name="activity" size={14} color="#2F6F4E" />
      </View>
      <View style={styles.auditBody}>
        <AppText preset="caption" style={styles.auditTitle}>
          {item.actionType}
          {item.name ? ` · ${item.name}` : ''}
        </AppText>
        <AppText preset="caption" style={styles.auditMeta}>
          {formatDateTime(item.createdAt)}
          {item.note ? ` · ${item.note}` : ''}
        </AppText>
      </View>
    </View>
  );
}

function CoverageSummary({ summary }: { summary: WalkPoiAdminReadSummary }) {
  const coverage = summary.coverageSummary;
  const projection = summary.publicProjectionCounts;
  return (
    <>
      <View style={styles.summaryBanner}>
        <View style={styles.summaryBannerText}>
          <AppText preset="caption" style={styles.bannerEyebrow}>
            FALLBACK GATE
          </AppText>
          <AppText preset="headline" style={styles.bannerTitle}>
            {summary.coverageRegion.label}
          </AppText>
          <AppText preset="bodySm" style={styles.bannerBody}>
            POI 0건 fallback 제한은 이 region 안에서만 적용돼요. RPC 오류, 좌표
            없음, region 밖은 기존 Kakao fallback을 유지합니다.
          </AppText>
        </View>
        <View
          style={[
            styles.gateBadge,
            coverage.gateReady ? styles.gateBadgeReady : styles.gateBadgeHold,
          ]}
        >
          <AppText preset="caption" style={styles.gateBadgeText}>
            {coverage.gateReady ? 'gate ready' : 'observe'}
          </AppText>
        </View>
      </View>
      <View style={styles.metricGrid}>
        <MetricCard
          label="approved total"
          value={coverage.approvedTotalCount}
          helper="public/active"
        />
        <MetricCard
          label="3km coverage"
          value={coverage.approvedWithin3Km}
          helper={`gate ${coverage.thresholds.approvedWithin3Km}+`}
        />
        <MetricCard
          label="5km coverage"
          value={coverage.approvedWithin5Km}
          helper={`gate ${coverage.thresholds.approvedWithin5Km}+`}
        />
        <MetricCard
          label="public approved"
          value={projection.publicActiveApproved}
          helper="projection"
        />
        <MetricCard
          label="hidden pending"
          value={projection.hiddenPending}
          helper="public hidden"
        />
        <MetricCard
          label="hidden held/rejected"
          value={projection.hiddenHeld + projection.hiddenRejected}
          helper="public hidden"
        />
      </View>
    </>
  );
}

export default function WalkPoiAdminReadOnlyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const role = useAuthStore(state => state.profile.role ?? 'user');
  const profileSyncStatus = useAuthStore(state => state.profileSyncStatus);
  const isProfileReady = profileSyncStatus === 'ready';
  const isAdmin =
    isProfileReady && (role === 'admin' || role === 'super_admin');

  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['walk-poi-admin-read-summary'],
    queryFn: fetchWalkPoiAdminReadSummary,
    enabled: isAdmin,
    retry: false,
  });

  const refresh = useCallback(() => {
    summaryQuery.refetch().catch(() => {});
  }, [summaryQuery]);

  if (!isProfileReady) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity style={styles.backButton} onPress={onPressBack}>
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
          <AppText preset="headline" style={styles.headerTitle}>
            산책 POI 운영
          </AppText>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.permissionCard}>
          <Feather name="loader" size={28} color="#2F6F4E" />
          <AppText preset="headline" style={styles.permissionTitle}>
            운영 권한을 확인하고 있어요
          </AppText>
          <AppText preset="body" style={styles.permissionBody}>
            서버 프로필 동기화가 끝난 뒤 산책 POI 운영 화면을 열어요.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity style={styles.backButton} onPress={onPressBack}>
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
          <AppText preset="headline" style={styles.headerTitle}>
            산책 POI 운영
          </AppText>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.permissionCard}>
          <Feather name="shield-off" size={28} color="#D75B23" />
          <AppText preset="headline" style={styles.permissionTitle}>
            운영 권한이 필요해요
          </AppText>
          <AppText preset="body" style={styles.permissionBody}>
            관리자 또는 최고관리자 계정에서만 산책 POI import/review 현황을 볼
            수 있어요.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const summary = summaryQuery.data ?? null;

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={styles.backButton} onPress={onPressBack}>
          <Feather name="arrow-left" size={20} color="#102033" />
        </TouchableOpacity>
        <AppText preset="headline" style={styles.headerTitle}>
          산책 POI 운영
        </AppText>
        <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
          <Feather name="refresh-cw" size={18} color="#102033" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.readOnlyNotice}>
          <Feather name="eye" size={17} color="#2F6F4E" />
          <AppText preset="bodySm" style={styles.readOnlyNoticeText}>
            이 화면은 read-only입니다. 승인/반려/보류 버튼과 raw payload는
            표시하지 않습니다.
          </AppText>
        </View>

        {summaryQuery.isLoading ? (
          <EmptyState message="산책 POI 운영 현황을 불러오는 중이에요." />
        ) : summaryQuery.error ? (
          <View style={styles.stateCard}>
            <AppText preset="headline" style={styles.stateTitle}>
              운영 현황을 불러오지 못했어요
            </AppText>
            <AppText preset="body" style={styles.stateText}>
              권한 또는 네트워크 상태를 확인한 뒤 다시 시도해 주세요.
            </AppText>
            <Pressable style={styles.retryButton} onPress={refresh}>
              <AppText preset="caption" style={styles.retryButtonText}>
                다시 시도
              </AppText>
            </Pressable>
          </View>
        ) : summary ? (
          <>
            <Section title="Coverage / Fallback Gate">
              <CoverageSummary summary={summary} />
            </Section>

            <Section title="Review Status">
              <View style={styles.metricGrid}>
                <MetricCard
                  label="pending"
                  value={summary.canonicalStatusCounts.pending}
                />
                <MetricCard
                  label="approved"
                  value={summary.canonicalStatusCounts.approved}
                />
                <MetricCard
                  label="rejected"
                  value={summary.canonicalStatusCounts.rejected}
                />
                <MetricCard
                  label="held"
                  value={summary.canonicalStatusCounts.held}
                />
              </View>
            </Section>

            <Section title="Source Provider">
              {summary.sourceProviderCounts.length === 0 ? (
                <EmptyState message="표시할 approved source provider가 없어요." />
              ) : (
                <View style={styles.sourceList}>
                  {summary.sourceProviderCounts.map(item => (
                    <View key={item.sourceProvider} style={styles.sourceRow}>
                      <AppText preset="bodySm" style={styles.sourceName}>
                        {item.sourceProvider}
                      </AppText>
                      <AppText preset="bodySm" style={styles.sourceCount}>
                        {formatCount(item.approvedCount)}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </Section>

            <Section title="Recent Import Batches">
              {summary.recentImportBatches.length === 0 ? (
                <EmptyState message="최근 import batch가 없어요." />
              ) : (
                <View style={styles.list}>
                  {summary.recentImportBatches.map(batch => (
                    <BatchRow key={batch.id} batch={batch} />
                  ))}
                </View>
              )}
            </Section>

            <Section title="Review Queue">
              {summary.recentReviewQueue.length === 0 ? (
                <EmptyState message="최근 review queue가 없어요." />
              ) : (
                <View style={styles.list}>
                  {summary.recentReviewQueue.map(item => (
                    <ReviewRow key={item.walkPoiId} item={item} />
                  ))}
                </View>
              )}
            </Section>

            <Section title="Recent Audit Log">
              {summary.recentAuditLogs.length === 0 ? (
                <EmptyState message="최근 audit log가 없어요." />
              ) : (
                <View style={styles.auditList}>
                  {summary.recentAuditLogs.map(item => (
                    <AuditRow
                      key={`${item.id}:${item.actionType}`}
                      item={item}
                    />
                  ))}
                </View>
              )}
            </Section>

            <Section title="전국 확장 준비">
              <View style={styles.nextStepBox}>
                <AppText preset="headline" style={styles.nextStepTitle}>
                  다음 batch: {summary.coverageSummary.nextBatchRegion}
                </AppText>
                <AppText preset="bodySm" style={styles.nextStepBody}>
                  전국 확장은 고양시 전체 확장 이후 서울 주요 산책 권역, 수도권,
                  광역시, 전국 공공데이터/OSM batch 순서로 진행합니다.
                </AppText>
                <AppText preset="caption" style={styles.nextStepMeta}>
                  Kakao Local 사용자 runtime 제거 여부:{' '}
                  {summary.fallbackGate.kakaoLocalRuntimeDeleted
                    ? '제거됨'
                    : '유지'}
                </AppText>
              </View>
            </Section>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#102033',
    fontWeight: '900',
  },
  headerSide: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  permissionCard: {
    margin: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 10,
    alignItems: 'center',
  },
  permissionTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  permissionBody: {
    color: '#6B7688',
    textAlign: 'center',
  },
  readOnlyNotice: {
    borderRadius: 16,
    backgroundColor: '#EAF6EF',
    borderWidth: 1,
    borderColor: '#CBE8D6',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  readOnlyNoticeText: {
    flex: 1,
    color: '#2F6F4E',
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  summaryBanner: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  summaryBannerText: {
    flex: 1,
    gap: 5,
  },
  bannerEyebrow: {
    color: '#2F6F4E',
    fontWeight: '900',
  },
  bannerTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  bannerBody: {
    color: '#6B7688',
    lineHeight: 20,
  },
  gateBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  gateBadgeReady: {
    backgroundColor: '#EAF6EF',
  },
  gateBadgeHold: {
    backgroundColor: '#FFF4E7',
  },
  gateBadgeText: {
    color: '#102033',
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '31.5%',
    minHeight: 86,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    color: '#6B7688',
    fontWeight: '900',
  },
  metricValue: {
    color: '#102033',
    fontWeight: '900',
  },
  metricHelper: {
    color: '#7B8597',
  },
  stateCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 16,
    gap: 10,
  },
  stateTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  stateText: {
    color: '#6B7688',
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: '#102033',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  sourceList: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    overflow: 'hidden',
  },
  sourceRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceName: {
    color: '#102033',
    fontWeight: '800',
  },
  sourceCount: {
    color: '#2F6F4E',
    fontWeight: '900',
  },
  list: {
    gap: 10,
  },
  rowCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 14,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowTitleBlock: {
    flex: 1,
    gap: 3,
  },
  rowEyebrow: {
    color: '#2F6F4E',
    fontWeight: '900',
  },
  rowTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  rowMeta: {
    color: '#6B7688',
    lineHeight: 18,
  },
  rowNote: {
    color: '#102033',
    lineHeight: 18,
  },
  readOnlyBadge: {
    borderRadius: 999,
    backgroundColor: '#EEF2F8',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  readOnlyBadgeText: {
    color: '#506074',
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusPending: {
    backgroundColor: '#FFF4E7',
  },
  statusApproved: {
    backgroundColor: '#EAF6EF',
  },
  statusRejected: {
    backgroundColor: '#FFECEC',
  },
  statusHeld: {
    backgroundColor: '#EEF2F8',
  },
  statusBadgeText: {
    color: '#102033',
    fontWeight: '900',
  },
  auditList: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 10,
    gap: 8,
  },
  auditRow: {
    flexDirection: 'row',
    gap: 10,
  },
  auditIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EAF6EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditBody: {
    flex: 1,
    gap: 2,
  },
  auditTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  auditMeta: {
    color: '#6B7688',
    lineHeight: 18,
  },
  nextStepBox: {
    borderRadius: 18,
    backgroundColor: '#102033',
    padding: 16,
    gap: 8,
  },
  nextStepTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  nextStepBody: {
    color: '#DDE6F2',
    lineHeight: 20,
  },
  nextStepMeta: {
    color: '#AFC0D4',
    fontWeight: '800',
  },
});
