import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Feather from '../../../../components/icons/NuriFeatherIcon';
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
import { resolveHomePopulatedLayout } from './homePopulatedLayout';

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

const PhotoMemory = memo(function PhotoMemoryView({
  record,
  onPress,
  accentColor,
}: {
  record: MemoryRecord;
  onPress: (memoryId: string) => void;
  accentColor: string;
}) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const { signedUrl, loading, resolved } = useSignedMemoryImage(
    getPrimaryMemoryImageRef(record),
  );
  const [imageResult, setImageResult] = useState<{
    uri: string;
    status: 'loaded' | 'error';
  } | null>(null);
  const imageFailed = Boolean(
    signedUrl &&
      imageResult?.uri === signedUrl &&
      imageResult.status === 'error',
  );
  const imageLoaded = Boolean(
    signedUrl &&
      imageResult?.uri === signedUrl &&
      imageResult.status === 'loaded',
  );
  const failed = imageFailed || (resolved && !loading && !signedUrl);
  const dateLabel = useMemo(
    () =>
      formatYmdWithWeekday(getRecordDisplayYmd(record), {
        separator: '.',
        suffix: true,
      }) ?? formatRecordDisplayDate(record),
    [record],
  );

  return (
    <TouchableOpacity
      testID="home-today-photo-record"
      accessibilityRole="button"
      accessibilityLabel={`오늘 한장, ${record.title}, ${dateLabel}, 사진 기록 상세 보기`}
      activeOpacity={0.92}
      style={[styles.photoCard, { borderColor: theme.colors.border }]}
      onPress={() => onPress(record.id)}
    >
      <View
        style={[
          styles.photoViewport,
          { height: resolveHomePopulatedLayout(width, fontScale).photoHeight },
        ]}
      >
        {signedUrl && !failed ? (
          <Image
            testID="home-today-photo-image"
            source={{ uri: signedUrl }}
            style={styles.photoImage}
            resizeMode="cover"
            fadeDuration={250}
            accessible={false}
            onLoad={() => setImageResult({ uri: signedUrl, status: 'loaded' })}
            onError={() => setImageResult({ uri: signedUrl, status: 'error' })}
          />
        ) : null}
        {!imageLoaded || failed ? (
          <View
            style={styles.photoImageState}
            accessibilityRole={failed ? 'text' : 'progressbar'}
          >
            {failed ? (
              <>
                <Feather name="image" size={28} color={accentColor} />
                <AppText
                  preset="unifiedBody"
                  align="center"
                  color={theme.colors.textMuted}
                >
                  사진을 불러오지 못했어요.{'\n'}기록에서 다시 확인해 주세요.
                </AppText>
              </>
            ) : (
              <ActivityIndicator size="small" color={accentColor} />
            )}
          </View>
        ) : null}
      </View>
      <View style={styles.photoCaption}>
        {record.title.trim() ? (
          <AppText
            preset="cardTitle"
            numberOfLines={2}
            color={theme.colors.textPrimary}
          >
            {record.title}
          </AppText>
        ) : null}
        <View style={styles.photoCaptionMeta}>
          <AppText
            preset="unifiedDate"
            style={styles.photoDate}
            color={theme.colors.textMuted}
          >
            {dateLabel}
          </AppText>
          <Feather name="arrow-up-right" size={18} color={accentColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const TodayPhotoSection = memo(function TodayPhotoSectionView({
  activePetId,
  recordItems,
  recordStatus,
  season,
  onPressRecordItem,
  onPressRecord,
  accentColor,
}: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    const request = createLatestRequestController();
    const requestId = request.begin();
    const update = (
      status: HomeEmptyDataState,
      record: MemoryRecord | null,
    ) => {
      if (request.isCurrent(requestId)) {
        setSelection({
          petId: activePetId,
          records: recordItems,
          status,
          record,
        });
      }
    };
    if (
      !activePetId ||
      (recordStatus !== 'ready' && recordItems.length === 0)
    ) {
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
      ) : record ? (
        <PhotoMemory
          key={`${record.id}:${getPrimaryMemoryImageRef(record)}`}
          record={record}
          accentColor={accentColor}
          onPress={onPressRecordItem}
        />
      ) : null}
    </HomeSectionGlass>
  );
});
