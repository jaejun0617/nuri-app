import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import type { TimelineRecordsState } from '../../store/recordStore';
import { styles } from './TimelineScreen.styles';

type Props = Pick<TimelineRecordsState, 'status' | 'hasMore'> & {
  visibleCount: number;
  onShowAllRecords?: () => void;
};

export default function TimelineListFooter({
  status,
  hasMore,
  visibleCount,
  onShowAllRecords,
}: Props) {
  // Offer the wider range after the actual period list, not above its results.
  if (status === 'ready' && !hasMore && onShowAllRecords) {
    return (
      <View style={styles.notificationPeriodFooter} testID="timeline-period-footer">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="전체 기록 보기"
          activeOpacity={0.82}
          onPress={onShowAllRecords}
          style={styles.notificationPeriodAction}
          testID="timeline-notification-show-all"
        >
          <AppText preset="unifiedBody" style={styles.notificationPeriodActionText}>
            전체 기록 보기
          </AppText>
          <NuriSemanticIcon family="feather" name="arrow-right" size={18} color="#7045CB" preserveOriginal />
        </TouchableOpacity>
      </View>
    );
  }
  if (visibleCount === 0) return null;
  if (status === 'loadingMore') {
    return (
      <View style={styles.footer}>
        <ActivityIndicator />
        <AppText preset="unifiedMeta" style={styles.footerText}>
          더 불러오는 중...
        </AppText>
      </View>
    );
  }
  if (status === 'ready' && !hasMore) {
    return <View testID="timeline-end-clearance" style={{ height: 48 }} />;
  }
  return <View style={{ height: 18 }} />;
}
