// 파일: src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx
// 파일 목적:
// - V1.1 산책 POI import/review/coverage 상태를 운영자가 확인하고 pending 후보를 검수한다.
// 어디서 쓰이는지:
// - More 운영 메뉴의 "산책 POI 운영" 진입점에서 열린다.
// 핵심 역할:
// - admin/super_admin에게만 batch, review queue, audit, fallback gate 요약을 보여준다.
// - write action은 pending 후보의 approve/reject/held로 제한하고 import commit UI와 raw payload는 제공하지 않는다.
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  fetchWalkPoiAdminAuditLogDetail,
  fetchWalkPoiAdminReadSummary,
  reviewWalkPoiAdminItem,
  type WalkPoiAdminAuditLogDetail,
  type WalkPoiAdminAuditLogItem,
  type WalkPoiAdminImportBatch,
  type WalkPoiAdminReadSummary,
  type WalkPoiAdminReviewAction,
  type WalkPoiAdminReviewQueueItem,
} from '../../services/locationDiscovery/walkPoiAdmin';
import {
  filterWalkPoiAdminImportBatches,
  filterWalkPoiAdminReviewQueue,
  getWalkPoiAdminBatchFilterOptions,
  getWalkPoiAdminQueueStatusCounts,
  summarizeWalkPoiAdminBatches,
  type WalkPoiAdminQueueStatusFilter,
} from '../../services/locationDiscovery/walkPoiAdminQueue';
import { useAuthStore } from '../../store/authStore';
import { openMoreDrawer } from '../../store/uiStore';

type Route = RootScreenRoute<'WalkPoiAdminReadOnly'>;
type Nav = RootScreenNavigation<'WalkPoiAdminReadOnly'>;
type ReviewActionDraft = {
  item: WalkPoiAdminReviewQueueItem;
  action: WalkPoiAdminReviewAction;
};

const REVIEW_ACTION_LABEL: Record<WalkPoiAdminReviewAction, string> = {
  approve: '승인',
  reject: '반려',
  held: '보류',
};

const REVIEW_ACTION_ICON: Record<WalkPoiAdminReviewAction, string> = {
  approve: 'check',
  reject: 'x',
  held: 'pause',
};

const REVIEW_STATUS_FILTERS: Array<{
  id: WalkPoiAdminQueueStatusFilter;
  label: string;
}> = [
  { id: 'all', label: '전체' },
  { id: 'pending', label: '대기' },
  { id: 'approved', label: '승인' },
  { id: 'rejected', label: '반려' },
  { id: 'held', label: '보류' },
];

const EMPTY_IMPORT_BATCHES: WalkPoiAdminImportBatch[] = [];
const EMPTY_REVIEW_QUEUE: WalkPoiAdminReviewQueueItem[] = [];

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
    `requested ${formatCount(batch.summary.requestedCount)}`,
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

function reviewActionTone(action: WalkPoiAdminReviewAction) {
  if (action === 'approve') return styles.reviewActionApprove;
  if (action === 'reject') return styles.reviewActionReject;
  return styles.reviewActionHeld;
}

function isReviewReasonRequired(action: WalkPoiAdminReviewAction): boolean {
  return action === 'reject' || action === 'held';
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

function FilterChip({
  label,
  helper,
  selected,
  onPress,
}: {
  label: string;
  helper?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, selected ? styles.filterChipSelected : null]}
      onPress={onPress}
    >
      <AppText
        preset="caption"
        style={[
          styles.filterChipText,
          selected ? styles.filterChipTextSelected : null,
        ]}
      >
        {label}
      </AppText>
      {helper ? (
        <AppText
          preset="caption"
          style={[
            styles.filterChipHelper,
            selected ? styles.filterChipTextSelected : null,
          ]}
        >
          {helper}
        </AppText>
      ) : null}
    </Pressable>
  );
}

function BatchDrillDown({
  batches,
  selectedBatchId,
  onSelectBatch,
}: {
  batches: ReadonlyArray<WalkPoiAdminImportBatch>;
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string | null) => void;
}) {
  const filteredBatches = useMemo(
    () => filterWalkPoiAdminImportBatches(batches, selectedBatchId),
    [batches, selectedBatchId],
  );
  const batchOptions = useMemo(
    () => getWalkPoiAdminBatchFilterOptions(batches),
    [batches],
  );
  const drillDownSummary = useMemo(
    () => summarizeWalkPoiAdminBatches(filteredBatches),
    [filteredBatches],
  );
  const selectedBatch = selectedBatchId
    ? filteredBatches.find(batch => batch.id === selectedBatchId) ?? null
    : null;

  return (
    <View style={styles.drillDownCard}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {batchOptions.map(option => (
          <FilterChip
            key={option.id ?? 'all'}
            label={option.label}
            helper={option.helper}
            selected={selectedBatchId === option.id}
            onPress={() => onSelectBatch(option.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.metricGrid}>
        <MetricCard
          label="batch"
          value={drillDownSummary.batchCount}
          helper="selected"
        />
        <MetricCard
          label="requested"
          value={drillDownSummary.requestedCount}
        />
        <MetricCard label="created" value={drillDownSummary.createdCount} />
        <MetricCard
          label="duplicate"
          value={drillDownSummary.duplicateCount}
        />
        <MetricCard label="conflict" value={drillDownSummary.conflictCount} />
        <MetricCard label="review" value={drillDownSummary.reviewCount} />
      </View>

      {selectedBatch ? (
        <View style={styles.batchDetailBox}>
          <AppText preset="caption" style={styles.rowEyebrow}>
            선택 batch
          </AppText>
          <AppText preset="body" style={styles.rowTitle}>
            {selectedBatch.sourceName ?? selectedBatch.id}
          </AppText>
          <AppText preset="caption" style={styles.rowMeta}>
            {selectedBatch.id}
          </AppText>
          <AppText preset="caption" style={styles.rowMeta}>
            {selectedBatch.sourceProvider} · {selectedBatch.importMode} ·{' '}
            {selectedBatch.importStatus}
          </AppText>
        </View>
      ) : null}
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
        batch {batch.id}
      </AppText>
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

function ReviewRow({
  item,
  onAction,
  actionPending,
}: {
  item: WalkPoiAdminReviewQueueItem;
  onAction?: (
    item: WalkPoiAdminReviewQueueItem,
    action: WalkPoiAdminReviewAction,
  ) => void;
  actionPending?: boolean;
}) {
  const canReview = item.reviewStatus === 'pending' && onAction !== undefined;

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
      {canReview ? (
        <View style={styles.reviewActionBar}>
          {(['approve', 'reject', 'held'] as const).map(action => (
            <Pressable
              key={action}
              disabled={actionPending}
              style={[
                styles.reviewActionButton,
                reviewActionTone(action),
                actionPending ? styles.reviewActionDisabled : null,
              ]}
              onPress={() => onAction(item, action)}
            >
              <Feather
                name={REVIEW_ACTION_ICON[action]}
                size={14}
                color="#102033"
              />
              <AppText preset="caption" style={styles.reviewActionButtonText}>
                {REVIEW_ACTION_LABEL[action]}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatAuditSnapshot(
  snapshot: WalkPoiAdminAuditLogDetail['beforeState'],
): string {
  if (!snapshot) {
    return '상태 기록 없음';
  }

  return [
    snapshot.reviewStatus ?? 'unknown',
    snapshot.visibilityStatus ?? 'unknown',
    snapshot.lifecycleStatus ?? 'unknown',
  ].join(' / ');
}

function AuditRow({
  item,
  onPress,
}: {
  item: WalkPoiAdminAuditLogItem;
  onPress: (item: WalkPoiAdminAuditLogItem) => void;
}) {
  return (
    <Pressable style={styles.auditRow} onPress={() => onPress(item)}>
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
      <Feather name="chevron-right" size={15} color="#8A94A6" />
    </Pressable>
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
            POI 0건 fallback 제한은 이 region 안에서 적용돼요. RPC 오류,
            좌표 없음, region 밖도 산책 도메인에서는 안전한 빈 결과 UX로
            처리합니다.
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
  const [actionDraft, setActionDraft] = useState<ReviewActionDraft | null>(
    null,
  );
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<number | null>(
    null,
  );
  const [reviewStatusFilter, setReviewStatusFilter] =
    useState<WalkPoiAdminQueueStatusFilter>('all');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
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

  const reviewMutation = useMutation({
    mutationFn: reviewWalkPoiAdminItem,
    onSuccess: () => {
      setActionDraft(null);
      setActionReason('');
      setActionError(null);
      summaryQuery.refetch().catch(() => {});
    },
    onError: error => {
      const message =
        error instanceof Error ? error.message : 'walk_poi_review_failed';
      setActionError(message);
    },
  });

  const auditDetailQuery = useQuery({
    queryKey: ['walk-poi-admin-audit-detail', selectedAuditLogId],
    queryFn: () => fetchWalkPoiAdminAuditLogDetail(selectedAuditLogId ?? 0),
    enabled: isAdmin && selectedAuditLogId !== null,
    retry: false,
  });

  const openReviewAction = useCallback(
    (item: WalkPoiAdminReviewQueueItem, action: WalkPoiAdminReviewAction) => {
      setActionDraft({ item, action });
      setActionReason('');
      setActionError(null);
      reviewMutation.reset();
    },
    [reviewMutation],
  );

  const closeReviewAction = useCallback(() => {
    if (reviewMutation.isPending) {
      return;
    }
    setActionDraft(null);
    setActionReason('');
    setActionError(null);
  }, [reviewMutation.isPending]);

  const submitReviewAction = useCallback(() => {
    if (!actionDraft) {
      return;
    }

    const normalizedReason = actionReason.trim();
    if (isReviewReasonRequired(actionDraft.action) && !normalizedReason) {
      setActionError('반려/보류는 운영 사유를 입력해야 합니다.');
      return;
    }

    setActionError(null);
    reviewMutation.mutate({
      walkPoiId: actionDraft.item.walkPoiId,
      action: actionDraft.action,
      reason:
        normalizedReason ||
        `NURI 운영자 ${REVIEW_ACTION_LABEL[actionDraft.action]}`,
    });
  }, [actionDraft, actionReason, reviewMutation]);

  const openAuditDetail = useCallback((item: WalkPoiAdminAuditLogItem) => {
    setSelectedAuditLogId(item.id);
  }, []);

  const closeAuditDetail = useCallback(() => {
    setSelectedAuditLogId(null);
  }, []);

  const summary = summaryQuery.data ?? null;
  const recentImportBatches =
    summary?.recentImportBatches ?? EMPTY_IMPORT_BATCHES;
  const recentReviewQueue = summary?.recentReviewQueue ?? EMPTY_REVIEW_QUEUE;
  const filteredImportBatches = useMemo(
    () => filterWalkPoiAdminImportBatches(recentImportBatches, selectedBatchId),
    [recentImportBatches, selectedBatchId],
  );
  const filteredReviewQueue = useMemo(
    () =>
      filterWalkPoiAdminReviewQueue(recentReviewQueue, reviewStatusFilter),
    [recentReviewQueue, reviewStatusFilter],
  );
  const reviewStatusCounts = useMemo(
    () => getWalkPoiAdminQueueStatusCounts(recentReviewQueue),
    [recentReviewQueue],
  );

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
          <Feather name="shield" size={17} color="#2F6F4E" />
          <AppText preset="bodySm" style={styles.readOnlyNoticeText}>
            pending 후보만 승인/반려/보류할 수 있습니다. import commit UI와
            raw payload는 표시하지 않습니다.
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

            <Section title="Import Batch Drill-down">
              {recentImportBatches.length === 0 ? (
                <EmptyState message="최근 import batch가 없어요." />
              ) : (
                <>
                  <BatchDrillDown
                    batches={recentImportBatches}
                    selectedBatchId={selectedBatchId}
                    onSelectBatch={setSelectedBatchId}
                  />
                  <View style={styles.list}>
                    {filteredImportBatches.map(batch => (
                      <BatchRow key={batch.id} batch={batch} />
                    ))}
                  </View>
                </>
              )}
            </Section>

            <Section title="Review Queue">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterBar}
              >
                {REVIEW_STATUS_FILTERS.map(filter => (
                  <FilterChip
                    key={filter.id}
                    label={filter.label}
                    helper={formatCount(reviewStatusCounts[filter.id])}
                    selected={reviewStatusFilter === filter.id}
                    onPress={() => setReviewStatusFilter(filter.id)}
                  />
                ))}
              </ScrollView>

              {recentReviewQueue.length === 0 ? (
                <EmptyState message="최근 review queue가 없어요." />
              ) : filteredReviewQueue.length === 0 ? (
                <EmptyState message="선택한 상태의 review queue가 없어요." />
              ) : (
                <View style={styles.list}>
                  {filteredReviewQueue.map(item => (
                    <ReviewRow
                      key={item.walkPoiId}
                      item={item}
                      onAction={openReviewAction}
                      actionPending={
                        reviewMutation.isPending &&
                        actionDraft?.item.walkPoiId === item.walkPoiId
                      }
                    />
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
                      onPress={openAuditDetail}
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
                  Walk-domain Kakao Local runtime: safe fallback 전환 완료 ·
                  shared provider는 타 도메인 유지
                </AppText>
              </View>
            </Section>
          </>
        ) : null}
      </ScrollView>
      <Modal
        transparent
        visible={selectedAuditLogId !== null}
        animationType="fade"
        onRequestClose={closeAuditDetail}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Feather name="activity" size={18} color="#2F6F4E" />
              </View>
              <View style={styles.modalTitleBlock}>
                <AppText preset="headline" style={styles.modalTitle}>
                  Audit detail
                </AppText>
                <AppText preset="caption" style={styles.modalSubtitle}>
                  raw payload 없이 운영 action만 확인합니다.
                </AppText>
              </View>
            </View>

            {auditDetailQuery.isLoading ? (
              <AppText preset="body" style={styles.auditDetailBody}>
                audit log를 불러오는 중이에요.
              </AppText>
            ) : auditDetailQuery.error ? (
              <AppText preset="body" style={styles.actionErrorText}>
                audit log를 불러오지 못했어요.
              </AppText>
            ) : auditDetailQuery.data ? (
              <View style={styles.auditDetailList}>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    action
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {auditDetailQuery.data.actionType}
                  </AppText>
                </View>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    target
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {auditDetailQuery.data.name ?? '미기록'}
                  </AppText>
                </View>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    reviewer
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {auditDetailQuery.data.actorId ?? '미기록'}
                  </AppText>
                </View>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    reviewed_at
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {formatDateTime(auditDetailQuery.data.createdAt)}
                  </AppText>
                </View>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    reason
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {auditDetailQuery.data.note ?? '미기록'}
                  </AppText>
                </View>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    before
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {formatAuditSnapshot(auditDetailQuery.data.beforeState)}
                  </AppText>
                </View>
                <View style={styles.auditDetailRow}>
                  <AppText preset="caption" style={styles.auditDetailLabel}>
                    after
                  </AppText>
                  <AppText preset="bodySm" style={styles.auditDetailValue}>
                    {formatAuditSnapshot(auditDetailQuery.data.afterState)}
                  </AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={closeAuditDetail}
              >
                <AppText preset="caption" style={styles.modalConfirmText}>
                  확인
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={actionDraft !== null}
        animationType="fade"
        onRequestClose={closeReviewAction}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Feather name="shield" size={18} color="#2F6F4E" />
              </View>
              <View style={styles.modalTitleBlock}>
                <AppText preset="headline" style={styles.modalTitle}>
                  {actionDraft
                    ? `${REVIEW_ACTION_LABEL[actionDraft.action]} 처리`
                    : '검수 처리'}
                </AppText>
                <AppText preset="caption" style={styles.modalSubtitle}>
                  {actionDraft?.item.name ?? ''}
                </AppText>
              </View>
            </View>

            <TextInput
              value={actionReason}
              onChangeText={text => {
                setActionReason(text);
                if (actionError) {
                  setActionError(null);
                }
              }}
              editable={!reviewMutation.isPending}
              placeholder={
                actionDraft && isReviewReasonRequired(actionDraft.action)
                  ? '운영 사유를 입력하세요'
                  : '사유 선택 입력'
              }
              placeholderTextColor="#8A94A6"
              multiline
              maxLength={160}
              style={styles.reasonInput}
              textAlignVertical="top"
            />
            {actionError ? (
              <AppText preset="caption" style={styles.actionErrorText}>
                {actionError}
              </AppText>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                disabled={reviewMutation.isPending}
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeReviewAction}
              >
                <AppText preset="caption" style={styles.modalCancelText}>
                  취소
                </AppText>
              </Pressable>
              <Pressable
                disabled={reviewMutation.isPending}
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  reviewMutation.isPending ? styles.reviewActionDisabled : null,
                ]}
                onPress={submitReviewAction}
              >
                <AppText preset="caption" style={styles.modalConfirmText}>
                  {reviewMutation.isPending ? '처리 중' : '확인'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE6F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    justifyContent: 'center',
    gap: 2,
  },
  filterChipSelected: {
    borderColor: '#2F6F4E',
    backgroundColor: '#EAF6EF',
  },
  filterChipText: {
    color: '#506074',
    fontWeight: '900',
  },
  filterChipTextSelected: {
    color: '#2F6F4E',
  },
  filterChipHelper: {
    color: '#7B8597',
    fontWeight: '800',
  },
  drillDownCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 12,
    gap: 12,
  },
  batchDetailBox: {
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 12,
    gap: 4,
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
  reviewActionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  reviewActionButton: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reviewActionApprove: {
    backgroundColor: '#EAF6EF',
  },
  reviewActionReject: {
    backgroundColor: '#FFECEC',
  },
  reviewActionHeld: {
    backgroundColor: '#EEF2F8',
  },
  reviewActionDisabled: {
    opacity: 0.55,
  },
  reviewActionButtonText: {
    color: '#102033',
    fontWeight: '900',
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
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 6,
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
  auditDetailBody: {
    color: '#6B7688',
    lineHeight: 21,
  },
  auditDetailList: {
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    overflow: 'hidden',
  },
  auditDetailRow: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE6F2',
    gap: 3,
  },
  auditDetailLabel: {
    color: '#6B7688',
    fontWeight: '900',
  },
  auditDetailValue: {
    color: '#102033',
    lineHeight: 20,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 51, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF6EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleBlock: {
    flex: 1,
    gap: 3,
  },
  modalTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#6B7688',
  },
  reasonInput: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE6F2',
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#102033',
    fontSize: 14,
    lineHeight: 20,
  },
  actionErrorText: {
    color: '#D75B23',
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#EEF2F8',
  },
  modalConfirmButton: {
    backgroundColor: '#102033',
  },
  modalCancelText: {
    color: '#506074',
    fontWeight: '900',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
