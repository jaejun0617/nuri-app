import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import OptimizedImage from '../../components/images/OptimizedImage';
import { useSignedMemoryImage } from '../../hooks/useSignedMemoryImage';
import { getRecordCategoryMeta } from '../../services/memories/categoryMeta';
import { formatRecordTimelineMeta } from '../../services/records/date';
import { getTimelinePrimaryMemoryImageSource } from '../../services/records/imageSources';
import type { MemoryRecord } from '../../services/supabase/memories';
import { TIMELINE_DESIGN as C } from '../../theme/timelineDesign';

export const RecordGalleryThumbnail = memo(function RecordGalleryThumbnailView({
  record,
  onOpen,
  contextLabel,
}: {
  record: MemoryRecord;
  onOpen: (record: MemoryRecord) => void;
  contextLabel?: string;
}) {
  const image = getTimelinePrimaryMemoryImageSource(record);
  const { signedUrl } = useSignedMemoryImage(image.value, { variant: image.variant });
  const category = getRecordCategoryMeta(record);
  const title = record.title.trim() || category.label;

  return (
    <Pressable
      testID={`record-gallery-thumbnail-${record.id}`}
      accessibilityRole="button"
      accessibilityLabel={[contextLabel, title, formatRecordTimelineMeta(record)].filter(Boolean).join(', ')}
      onPress={() => onOpen(record)}
      style={styles.tile}
    >
      {signedUrl ? (
        <OptimizedImage uri={signedUrl} resizeMode="cover" style={styles.image} />
      ) : (
        <>
          <NuriSemanticIcon family="material" name={category.icon} size={24} color={C.muted} />
          <AppText preset="unifiedMicro" style={styles.tileTitle} numberOfLines={1}>{title}</AppText>
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, borderRadius: 4, overflow: 'hidden', backgroundColor: C.selected },
  image: { width: '100%', height: '100%' },
  tileTitle: { color: C.ink, paddingHorizontal: 4, maxWidth: '100%' },
});
