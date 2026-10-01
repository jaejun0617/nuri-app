import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../../../app/ui/AppText';
import { HomeSectionGlass } from '../../../../components/home/HomeSectionGlass';
import { HomeSectionHeader } from '../../../../components/home/HomeSectionHeader';
import { useSignedMemoryImage } from '../../../../hooks/useSignedMemoryImage';
import { createLatestRequestController } from '../../../../services/app/async';
import { pickTodayPhoto } from '../../../../services/home/homeRecall';
import {
  getPrimaryMemoryImageRef,
  hasMemoryImage,
} from '../../../../services/records/imageSources';
import type { MemoryRecord } from '../../../../services/supabase/memories';
import type { PetRecordsState } from '../../../../store/recordStore';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { formatYmdWithWeekday } from '../../../../utils/date';
import {
  formatRecordDisplayDate,
  getRecordDisplayYmd,
} from '../../../../services/records/date';
import {
  HomeEmptySectionState,
  type HomeEmptyDataState,
} from './HomeEmptySectionState';
import { styles } from './LoggedInHome.styles';

type Selection = {
  petId: string | null;
  records: MemoryRecord[];
  status: HomeEmptyDataState;
  record: MemoryRecord | null;
};

type Props = {
  activePetId: string | null;
  recordItems: MemoryRecord[];
  recordStatus: PetRecordsState['status'];
  season: SeasonKey;
  onPressRecordItem: (memoryId: string) => void;
  onPressRecord: () => void;
  accentColor: string;
};

export const TodayPhotoSection = memo(function TodayPhotoSectionView({
  activePetId,
  recordItems,
  recordStatus,
  season,
  onPressRecordItem,
  onPressRecord,
  accentColor,
}: Props) {
  const theme = useTheme();
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    const request = createLatestRequestController();
    const requestId = request.begin();
    const update = (status: HomeEmptyDataState, record: MemoryRecord | null) => {
      if (request.isCurrent(requestId)) {
        setSelection({
          petId: activePetId,
          records: recordItems,
          status,
          record,
        });
      }
    };
    if (!activePetId || (recordStatus !== 'ready' && recordItems.length === 0)) {
      update(recordStatus === 'error' ? 'error' : 'loading', null);
    } else {
      // Existing daily selection/cache remains the source of truth for real photos.
      pickTodayPhoto(activePetId, recordItems)
        .then(picked => update('ready', picked.record))
        .catch(() => update('error', null));
    }
    return () => request.cancel();
  }, [activePetId, recordItems, recordStatus]);

  // A pet/list switch cannot briefly display the previous pet's photo or empty state.
  const current =
    selection?.petId === activePetId && selection.records === recordItems
      ? selection
      : null;
  const record = current?.record ?? null;
  const hasPhoto = record !== null && hasMemoryImage(record);
  const emptyState: HomeEmptyDataState =
    recordStatus === 'error' || current?.status === 'error'
      ? 'error'
      : recordStatus === 'ready' && current?.status === 'ready'
      ? 'ready'
      : 'loading';
  const { signedUrl, loading } = useSignedMemoryImage(
    record ? getPrimaryMemoryImageRef(record) : null,
  );
  const dateLabel = useMemo(
    () =>
      record
        ? formatYmdWithWeekday(getRecordDisplayYmd(record), {
            separator: '.',
            suffix: true,
          }) ?? formatRecordDisplayDate(record)
        : '',
    [record],
  );

  return (
    <HomeSectionGlass
      testID="home-glass-today-photo"
      style={[styles.section, styles.todayPhotoSection]}
    >
      <HomeSectionHeader title="오늘 한장" color={accentColor} />
      {!hasPhoto ? (
        <HomeEmptySectionState
          kind="photo"
          season={season}
          dataState={emptyState}
          accentDeepColor={accentColor}
          onPressAction={onPressRecord}
        />
      ) : (
        <TouchableOpacity
          testID="home-today-photo-record"
          accessibilityRole="button"
          accessibilityLabel="오늘 한장, 사진 기록 상세 보기"
          activeOpacity={0.92}
          style={[styles.photoCard, { borderColor: theme.colors.border }]}
          onPress={() => {
            if (record) onPressRecordItem(record.id);
          }}
        >
          {loading ? (
            <View
              style={[
                styles.photoPlaceholder,
                { justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : signedUrl ? (
            <Image
              source={{ uri: signedUrl }}
              style={styles.photoImage}
              fadeDuration={250}
            />
          ) : (
            <View style={styles.photoPlaceholder} />
          )}
          <View style={styles.photoOverlay}>
            <AppText
              preset="unifiedDate"
              style={styles.photoOverlayDate}
              numberOfLines={1}
            >
              {dateLabel}
            </AppText>
          </View>
        </TouchableOpacity>
      )}
    </HomeSectionGlass>
  );
});
