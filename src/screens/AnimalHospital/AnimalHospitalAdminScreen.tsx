import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../../app/ui/AppText';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type {
  AnimalHospitalOpsFieldFilter,
  AnimalHospitalOpsReviewItem,
  AnimalHospitalOpsStatusFilter,
} from '../../domains/animalHospital/types';
import type { RootScreenNavigation, RootScreenRoute } from '../../navigation/types';
import {
  fetchAnimalHospitalOpsDetail,
  fetchAnimalHospitalOpsSummary,
  listAnimalHospitalOpsReviewItems,
  reviewAnimalHospitalVerification,
} from '../../services/supabase/animalHospitals';
import { useAuthStore } from '../../store/authStore';
import { openMoreDrawer } from '../../store/uiStore';

type Route = RootScreenRoute<'AnimalHospitalAdmin'>;
type Nav = RootScreenNavigation<'AnimalHospitalAdmin'>;

const STATUS_FILTERS: ReadonlyArray<{
  key: AnimalHospitalOpsStatusFilter;
  label: string;
}> = [
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '반려' },
  { key: 'held', label: '보류' },
  { key: 'hidden', label: 'hidden' },
  { key: 'inactive', label: 'inactive' },
  { key: 'all', label: '전체' },
];

const FIELD_FILTERS: ReadonlyArray<{
  key: AnimalHospitalOpsFieldFilter;
  label: string;
}> = [
  { key: 'all', label: '전체 필드' },
  { key: 'phone', label: '전화' },
  { key: 'coordinates', label: '좌표' },
  { key: 'thumbnail', label: '썸네일' },
  { key: 'open24Hours', label: '24시 운영' },
  { key: 'exoticAnimalCare', label: '특수동물' },
];

const SOURCE_FILTERS: ReadonlyArray<{ key: string | null; label: string }> = [
  { key: null, label: '전체 source' },
  { key: 'official-localdata', label: 'Localdata' },
  { key: 'kakao-place', label: 'Kakao' },
  { key: 'google-place', label: 'Google' },
  { key: 'operator-review', label: '운영 검수' },
];

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatJsonValue(value: Record<string, unknown>): string {
  const entries = Object.entries(value).filter(([, item]) => {
    return item !== null && item !== undefined && item !== '';
  });

  if (entries.length === 0) {
    return '값 없음';
  }

  return entries
    .map(([key, item]) => {
      if (typeof item === 'number' || typeof item === 'boolean') {
        return `${key}: ${String(item)}`;
      }
      if (typeof item === 'string') {
        return `${key}: ${item}`;
      }
      return `${key}: ${JSON.stringify(item)}`;
    })
    .join('\n');
}

function formatFieldLabel(fieldKey: AnimalHospitalOpsReviewItem['fieldKey']) {
  if (fieldKey === 'phone') return '전화번호';
  if (fieldKey === 'coordinates') return '좌표';
  if (fieldKey === 'thumbnail') return '썸네일';
  if (fieldKey === 'open24Hours') return '24시 운영';
  if (fieldKey === 'exoticAnimalCare') return '특수동물';
  return '병원 상태';
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

function MetadataLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metadataLine}>
      <AppText preset="caption" style={styles.metadataLabel}>
        {label}
      </AppText>
      <AppText preset="caption" style={styles.metadataValue}>
        {value}
      </AppText>
    </View>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.summaryCard}>
      <AppText preset="caption" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText preset="headline" style={styles.summaryValue}>
        {typeof value === 'number' ? formatCount(value) : value}
      </AppText>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
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
    </Pressable>
  );
}

function ReviewItemCard({
  item,
  selected,
  onPress,
}: {
  item: AnimalHospitalOpsReviewItem;
  selected: boolean;
  onPress: () => void;
}) {
  const excludedReason = item.isHidden
    ? 'public 제외: hidden'
    : !item.isActive
      ? 'public 제외: inactive'
      : null;

  return (
    <Pressable
      style={[styles.reviewCard, selected ? styles.reviewCardSelected : null]}
      onPress={onPress}
    >
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewTitleBlock}>
          <AppText preset="caption" style={styles.reviewField}>
            {formatFieldLabel(item.fieldKey)}
            {item.verificationStatus ? ` · ${item.verificationStatus}` : ''}
          </AppText>
          <AppText preset="headline" style={styles.reviewName}>
            {item.name}
          </AppText>
        </View>
        <Feather name="chevron-right" size={18} color="#7B8597" />
      </View>
      <AppText preset="caption" style={styles.reviewAddress} numberOfLines={2}>
        {item.address}
      </AppText>
      {excludedReason ? (
        <AppText preset="caption" style={styles.reviewExcluded}>
          {excludedReason}
        </AppText>
      ) : null}
      <View style={styles.valueCompareRow}>
        <View style={styles.valueBox}>
          <AppText preset="caption" style={styles.valueLabel}>
            현재 public 값
          </AppText>
          <AppText preset="caption" style={styles.valueText}>
            {formatJsonValue(item.currentPublicValue)}
          </AppText>
        </View>
        <View style={styles.valueBox}>
          <AppText preset="caption" style={styles.valueLabel}>
            후보 값
          </AppText>
          <AppText preset="caption" style={styles.valueText}>
            {formatJsonValue(item.candidateValue)}
          </AppText>
        </View>
      </View>
      <AppText preset="caption" style={styles.reviewMeta}>
        {item.sourceType}
        {item.sourceRecordKey ? ` · ${item.sourceRecordKey}` : ''}
      </AppText>
    </Pressable>
  );
}

export default function AnimalHospitalAdminScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const role = useAuthStore(state => state.profile.role ?? 'user');
  const isAdmin = role === 'admin' || role === 'super_admin';
  const [statusFilter, setStatusFilter] =
    useState<AnimalHospitalOpsStatusFilter>('pending');
  const [fieldFilter, setFieldFilter] =
    useState<AnimalHospitalOpsFieldFilter>('all');
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    null,
  );
  const [reviewNote, setReviewNote] = useState('');

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
    queryKey: ['animal-hospital-ops-summary'],
    queryFn: fetchAnimalHospitalOpsSummary,
    enabled: isAdmin,
    retry: false,
  });

  const reviewQuery = useQuery({
    queryKey: [
      'animal-hospital-ops-review-items',
      statusFilter,
      fieldFilter,
      sourceType,
      search.trim(),
    ],
    queryFn: () =>
      listAnimalHospitalOpsReviewItems({
        statusFilter,
        fieldFilter,
        sourceType,
        search,
      }),
    enabled: isAdmin,
    retry: false,
  });

  const selectedItem = useMemo(() => {
    return (
      reviewQuery.data?.find(
        item => item.animalHospitalId === selectedHospitalId,
      ) ??
      reviewQuery.data?.[0] ??
      null
    );
  }, [reviewQuery.data, selectedHospitalId]);

  useEffect(() => {
    setReviewNote('');
  }, [selectedItem?.verificationId]);

  const detailQuery = useQuery({
    queryKey: ['animal-hospital-ops-detail', selectedItem?.animalHospitalId],
    queryFn: () => fetchAnimalHospitalOpsDetail(selectedItem!.animalHospitalId),
    enabled: isAdmin && Boolean(selectedItem),
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: reviewAnimalHospitalVerification,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['animal-hospital-ops-summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['animal-hospital-ops-review-items'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['animal-hospital-ops-detail'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['animal-hospital-discovery'],
        }),
      ]);
    },
    onError: error => {
      Alert.alert(
        '검수 처리 실패',
        error instanceof Error ? error.message : '다시 시도해 주세요.',
      );
    },
  });

  const handleReview = useCallback(
    (nextStatus: 'approved' | 'rejected' | 'held') => {
      if (!selectedItem?.verificationId || reviewMutation.isPending) {
        return;
      }

      const defaultNote =
        nextStatus === 'approved'
          ? '운영자 검수 승인'
          : nextStatus === 'rejected'
            ? '운영자 검수 반려'
            : '운영자 검수 보류';
      const note = reviewNote.trim() || defaultNote;

      reviewMutation.mutate({
        verificationId: selectedItem.verificationId,
        nextStatus,
        note,
      });
    },
    [reviewMutation, reviewNote, selectedItem?.verificationId],
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity style={styles.backButton} onPress={onPressBack}>
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
          <AppText preset="headline" style={styles.headerTitle}>
            동물병원 운영
          </AppText>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.permissionCard}>
          <Feather name="shield-off" size={28} color="#D75B23" />
          <AppText preset="headline" style={styles.permissionTitle}>
            운영 권한이 필요해요
          </AppText>
          <AppText preset="body" style={styles.permissionBody}>
            관리자 또는 최고관리자 계정에서만 접근할 수 있어요.
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
          동물병원 운영
        </AppText>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            summaryQuery.refetch().catch(() => {});
            reviewQuery.refetch().catch(() => {});
          }}
        >
          <Feather name="refresh-cw" size={18} color="#102033" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {summaryQuery.isLoading ? (
          <View style={styles.stateCard}>
            <AppText preset="body" style={styles.stateText}>
              운영 summary를 불러오는 중이에요.
            </AppText>
          </View>
        ) : summaryQuery.error ? (
          <View style={styles.stateCard}>
            <AppText preset="headline" style={styles.stateTitle}>
              운영 summary를 불러오지 못했어요
            </AppText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => summaryQuery.refetch()}
            >
              <AppText preset="caption" style={styles.retryButtonText}>
                다시 시도
              </AppText>
            </TouchableOpacity>
          </View>
        ) : summaryQuery.data ? (
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="canonical"
              value={summaryQuery.data.totalCanonical}
            />
            <SummaryCard
              label="public visible"
              value={summaryQuery.data.publicVisible}
            />
            <SummaryCard
              label="pending phone"
              value={summaryQuery.data.pendingPhone}
            />
            <SummaryCard
              label="pending coordinates"
              value={summaryQuery.data.pendingCoordinates}
            />
            <SummaryCard
              label="pending thumbnail"
              value={summaryQuery.data.pendingThumbnail}
            />
            <SummaryCard
              label="pending open24"
              value={summaryQuery.data.pendingOpen24Hours}
            />
            <SummaryCard
              label="pending exotic"
              value={summaryQuery.data.pendingExoticAnimalCare}
            />
            <SummaryCard
              label="provider-only"
              value={summaryQuery.data.providerOnlyCandidates}
            />
            <SummaryCard
              label="canonical linked"
              value={summaryQuery.data.canonicalLinked}
            />
            <SummaryCard label="hidden" value={summaryQuery.data.hiddenCount} />
            <SummaryCard
              label="inactive"
              value={summaryQuery.data.inactiveCount}
            />
            <SummaryCard
              label="approved open24"
              value={summaryQuery.data.approvedOpen24HoursCoverage}
            />
            <SummaryCard
              label="approved exotic"
              value={summaryQuery.data.approvedExoticAnimalCareCoverage}
            />
          </View>
        ) : null}

        <View style={styles.searchCard}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={16} color="#98A1B2" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="병원명, 주소, source key 검색"
              placeholderTextColor="#98A1B2"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.searchInput}
            />
          </View>
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map(item => (
              <FilterChip
                key={item.key}
                label={item.label}
                selected={item.key === statusFilter}
                onPress={() => setStatusFilter(item.key)}
              />
            ))}
          </View>
          <View style={styles.filterRow}>
            {FIELD_FILTERS.map(item => (
              <FilterChip
                key={item.key}
                label={item.label}
                selected={item.key === fieldFilter}
                onPress={() => setFieldFilter(item.key)}
              />
            ))}
          </View>
          <View style={styles.filterRow}>
            {SOURCE_FILTERS.map(item => (
              <FilterChip
                key={item.key ?? 'all-source'}
                label={item.label}
                selected={item.key === sourceType}
                onPress={() => setSourceType(item.key)}
              />
            ))}
          </View>
        </View>

        {reviewQuery.isLoading ? (
          <View style={styles.stateCard}>
            <AppText preset="body" style={styles.stateText}>
              검수 목록을 불러오는 중이에요.
            </AppText>
          </View>
        ) : reviewQuery.error ? (
          <View style={styles.stateCard}>
            <AppText preset="headline" style={styles.stateTitle}>
              검수 목록을 불러오지 못했어요
            </AppText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => reviewQuery.refetch()}
            >
              <AppText preset="caption" style={styles.retryButtonText}>
                다시 시도
              </AppText>
            </TouchableOpacity>
          </View>
        ) : reviewQuery.data?.length === 0 ? (
          <View style={styles.stateCard}>
            <AppText preset="headline" style={styles.stateTitle}>
              조건에 맞는 검수 항목이 없어요
            </AppText>
            <AppText preset="body" style={styles.stateText}>
              필터를 바꾸거나 source key로 다시 검색해 주세요.
            </AppText>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {reviewQuery.data?.map(item => (
              <ReviewItemCard
                key={`${item.animalHospitalId}:${item.verificationId ?? 'row'}`}
                item={item}
                selected={item.animalHospitalId === selectedItem?.animalHospitalId}
                onPress={() => setSelectedHospitalId(item.animalHospitalId)}
              />
            ))}
          </View>
        )}

        {selectedItem ? (
          <View style={styles.detailCard}>
            <AppText preset="caption" style={styles.detailLabel}>
              병원 단위 상세 검수
            </AppText>
            <AppText preset="titleSm" style={styles.detailTitle}>
              {selectedItem.name}
            </AppText>
            <AppText preset="bodySm" style={styles.detailAddress}>
              {selectedItem.address}
            </AppText>

            <View style={styles.valueCompareRow}>
              <View style={styles.valueBox}>
                <AppText preset="caption" style={styles.valueLabel}>
                  현재 public projection
                </AppText>
                <AppText preset="caption" style={styles.valueText}>
                  {detailQuery.data
                    ? formatJsonValue(detailQuery.data.publicProjection)
                    : formatJsonValue(selectedItem.currentPublicValue)}
                </AppText>
              </View>
              <View style={styles.valueBox}>
                <AppText preset="caption" style={styles.valueLabel}>
                  pending candidate
                </AppText>
                <AppText preset="caption" style={styles.valueText}>
                  {formatJsonValue(selectedItem.candidateValue)}
                </AppText>
              </View>
            </View>

            {selectedItem.lifecycleNote ? (
              <AppText preset="caption" style={styles.lifecycleNote}>
                제외 사유: {selectedItem.lifecycleNote}
              </AppText>
            ) : null}

            <View style={styles.metadataCard}>
              <MetadataLine
                label="field"
                value={formatFieldLabel(selectedItem.fieldKey)}
              />
              <MetadataLine
                label="source"
                value={selectedItem.verificationSource ?? selectedItem.sourceType}
              />
              <MetadataLine
                label="reviewer"
                value={selectedItem.reviewerId ?? '미배정'}
              />
              <MetadataLine
                label="reviewedAt"
                value={formatDateTime(selectedItem.reviewedAt)}
              />
              <MetadataLine
                label="updatedAt"
                value={formatDateTime(selectedItem.updatedAt)}
              />
              <MetadataLine
                label="note"
                value={selectedItem.note ?? '미기록'}
              />
            </View>

            <View style={styles.metadataCard}>
              <AppText preset="caption" style={styles.valueLabel}>
                evidence
              </AppText>
              <AppText preset="caption" style={styles.valueText}>
                {formatJsonValue(selectedItem.evidence)}
              </AppText>
            </View>

            {detailQuery.data?.actionLogs.length ? (
              <View style={styles.metadataCard}>
                <AppText preset="caption" style={styles.valueLabel}>
                  action log
                </AppText>
                {detailQuery.data.actionLogs.slice(0, 5).map((log, index) => (
                  <AppText
                    key={`animal-hospital-action-log:${index}`}
                    preset="caption"
                    style={styles.valueText}
                  >
                    {formatJsonValue(log)}
                  </AppText>
                ))}
              </View>
            ) : null}

            <View style={styles.noteInputWrap}>
              <TextInput
                value={reviewNote}
                onChangeText={setReviewNote}
                placeholder="검수 사유 또는 보류/반려 메모"
                placeholderTextColor="#98A1B2"
                multiline
                style={styles.noteInput}
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                disabled={!selectedItem.verificationId || reviewMutation.isPending}
                onPress={() => handleReview('approved')}
              >
                <AppText preset="caption" style={styles.approveText}>
                  승인
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                disabled={!selectedItem.verificationId || reviewMutation.isPending}
                onPress={() => handleReview('held')}
              >
                <AppText preset="caption" style={styles.actionText}>
                  보류
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                disabled={!selectedItem.verificationId || reviewMutation.isPending}
                onPress={() => handleReview('rejected')}
              >
                <AppText preset="caption" style={styles.actionText}>
                  반려
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
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
    gap: 14,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '31.5%',
    minHeight: 76,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    color: '#6B7688',
    fontWeight: '800',
  },
  summaryValue: {
    color: '#102033',
    fontWeight: '900',
  },
  searchCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 14,
    gap: 12,
  },
  searchInputWrap: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#EEF2F8',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#102033',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F8',
  },
  filterChipSelected: {
    backgroundColor: '#102033',
  },
  filterChipText: {
    color: '#506074',
    fontWeight: '800',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
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
  reviewList: {
    gap: 10,
  },
  reviewCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 14,
    gap: 10,
  },
  reviewCardSelected: {
    borderColor: '#2F8F48',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewTitleBlock: {
    flex: 1,
    gap: 3,
  },
  reviewField: {
    color: '#FA6B2D',
    fontWeight: '900',
  },
  reviewName: {
    color: '#102033',
    fontWeight: '900',
  },
  reviewAddress: {
    color: '#6B7688',
  },
  reviewExcluded: {
    color: '#B42318',
    fontWeight: '900',
  },
  valueCompareRow: {
    flexDirection: 'row',
    gap: 10,
  },
  valueBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    padding: 10,
    gap: 5,
  },
  valueLabel: {
    color: '#6B7688',
    fontWeight: '900',
  },
  valueText: {
    color: '#102033',
    lineHeight: 18,
  },
  reviewMeta: {
    color: '#7B8597',
  },
  detailCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DEEA',
    padding: 16,
    gap: 12,
  },
  detailLabel: {
    color: '#2F8F48',
    fontWeight: '900',
  },
  detailTitle: {
    color: '#102033',
    fontWeight: '900',
  },
  detailAddress: {
    color: '#6B7688',
  },
  lifecycleNote: {
    color: '#B42318',
    fontWeight: '800',
  },
  metadataCard: {
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    padding: 10,
    gap: 8,
  },
  metadataLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metadataLabel: {
    width: 82,
    color: '#6B7688',
    fontWeight: '900',
  },
  metadataValue: {
    flex: 1,
    color: '#102033',
    lineHeight: 18,
  },
  noteInputWrap: {
    minHeight: 78,
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#D8DEEA',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noteInput: {
    minHeight: 62,
    color: '#102033',
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#102033',
  },
  actionText: {
    color: '#102033',
    fontWeight: '900',
  },
  approveText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
