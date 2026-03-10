// 파일: src/components/MemoryCard/MemoryCard.tsx
// 역할:
// - memory 단건을 카드 형태로 렌더링하는 공용 프리뷰 컴포넌트
// - signed URL 이미지 로딩, 감정/날짜 요약, 탭 액션 전달을 한 곳에서 담당
// - 타임라인/홈 등 리스트 기반 화면에서 재사용되므로 memo 기반으로 불필요 리렌더링을 줄임

import React, { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import OptimizedImage from '../images/OptimizedImage';
import { useSignedMemoryImage } from '../../hooks/useSignedMemoryImage';
import {
  getPrimaryMemoryImageRef,
  hasMemoryImage,
} from '../../services/records/imageSources';
import { formatRecordDisplayDate } from '../../services/records/date';
import type { MemoryRecord } from '../../services/supabase/memories';
import type { MemoryImageVariant } from '../../services/supabase/storageMemories';
import AppText from '../../app/ui/AppText';

// ✅ 기존 TimelineScreen.styles 그대로 사용 (UI 유지)
import { styles } from '../../screens/Records/TimelineScreen.styles';

const MEMORY_CARD_DIAG_LOG_RENDERS = true;
let memoryCardRenderCount = 0;

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  excited: '🤩',
  neutral: '🙂',
  sad: '😢',
  anxious: '😥',
  angry: '😠',
  tired: '😴',
};

interface MemoryCardProps {
  item: MemoryRecord;
  onPress: (item: MemoryRecord) => void;
  deferImageLoad?: boolean;
  enableImageLoad?: boolean;
  isFocused?: boolean;
  onFocusedLayout?: (itemId: string, event: LayoutChangeEvent) => void;
  imageVariant?: MemoryImageVariant;
}

function MemoryCardComponent({
  item,
  onPress,
  deferImageLoad = false,
  enableImageLoad = true,
  isFocused = false,
  onFocusedLayout,
  imageVariant = 'original',
}: MemoryCardProps) {
  if (__DEV__ && MEMORY_CARD_DIAG_LOG_RENDERS) {
    memoryCardRenderCount += 1;
    if (memoryCardRenderCount <= 20 || memoryCardRenderCount % 25 === 0) {
      console.debug('[TimelineDiag] MemoryCard render', {
        count: memoryCardRenderCount,
        itemId: item.id,
        enableImageLoad,
        deferImageLoad,
        isFocused,
      });
    }
  }

  const imageRef = getPrimaryMemoryImageRef(item);
  const { signedUrl } = useSignedMemoryImage(imageRef, {
    enabled: enableImageLoad,
    defer: deferImageLoad,
    delayMs: deferImageLoad ? 220 : 0,
    trackLoading: false,
    variant: imageVariant,
  });
  const hasImage = hasMemoryImage(item);

  const dateText = useMemo(
    () => formatRecordDisplayDate(item),
    [item],
  );
  const emotionText = useMemo(() => {
    if (!item.emotion) return null;
    return EMOTION_EMOJI[item.emotion] ?? item.emotion;
  }, [item.emotion]);
  const titleText = useMemo(() => {
    const title = item.title?.trim() ?? '';
    if (title) return title;
    const content = item.content?.trim() ?? '';
    if (content) return content;
    return '기록 없음';
  }, [item.content, item.title]);
  const metaText = useMemo(
    () => (emotionText ? `${dateText} · ${emotionText}` : dateText),
    [dateText, emotionText],
  );
  const handlePress = useMemo(() => () => onPress(item), [item, onPress]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!isFocused || !onFocusedLayout) return;
      onFocusedLayout(item.id, event);
    },
    [isFocused, item.id, onFocusedLayout],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.item}
      onPress={handlePress}
      onLayout={isFocused ? handleLayout : undefined}
    >
      <View style={styles.thumb}>
        {hasImage && signedUrl ? (
          <OptimizedImage
            uri={signedUrl}
            style={styles.thumbImg}
            resizeMode="cover"
            priority={deferImageLoad ? 'low' : 'normal'}
          />
        ) : null}
      </View>

      <View style={styles.itemBody}>
        <AppText preset="headline" numberOfLines={1} style={styles.itemTitle}>
          {titleText}
        </AppText>

        <View style={styles.metaRow}>
          <AppText preset="caption" style={styles.metaText}>
            {metaText}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const MemoryCard = memo(
  MemoryCardComponent,
  (prev, next) =>
    prev.item === next.item &&
    prev.onPress === next.onPress &&
    prev.deferImageLoad === next.deferImageLoad &&
    prev.enableImageLoad === next.enableImageLoad &&
    prev.isFocused === next.isFocused &&
    prev.onFocusedLayout === next.onFocusedLayout &&
    prev.imageVariant === next.imageVariant,
);
