// 파일: src/components/MemoryCard/MemoryCard.tsx
// 역할:
// - memory 단건을 카드 형태로 렌더링하는 공용 프리뷰 컴포넌트
// - signed URL 이미지 로딩, 감정/날짜 요약, 탭 액션 전달을 한 곳에서 담당
// - 타임라인/홈 등 리스트 기반 화면에서 재사용되므로 memo 기반으로 불필요 리렌더링을 줄임

import React, { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import OptimizedImage from '../images/OptimizedImage';
import { useSignedMemoryImage } from '../../hooks/useSignedMemoryImage';
import {
  getTimelinePrimaryMemoryImageSource,
  hasMemoryImage,
} from '../../services/records/imageSources';
import {
  getMemoryCategoryChipTone,
  getRecordCategoryMeta,
} from '../../services/memories/categoryMeta';
import { formatRecordTimelineMeta } from '../../services/records/date';
import type { MemoryRecord } from '../../services/supabase/memories';
import type { MemoryImageVariant } from '../../services/supabase/storageMemories';
import AppText from '../../app/ui/AppText';

// ✅ 기존 TimelineScreen.styles 그대로 사용 (UI 유지)
import { styles } from '../../screens/Records/TimelineScreen.styles';

function trimText(value: string | null | undefined) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function toSnippet(text: string, max = 34) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

interface MemoryCardProps {
  item: MemoryRecord;
  onPress: (item: MemoryRecord) => void;
  deferImageLoad?: boolean;
  enableImageLoad?: boolean;
  isFocused?: boolean;
  onFocusedLayout?: (itemId: string, event: LayoutChangeEvent) => void;
  imageVariant?: MemoryImageVariant;
  thumbnailPreset?: 'default' | 'timeline';
  showDateHeader?: boolean;
  isFirstGroup?: boolean;
  dateHeaderTitle?: string | null;
  dateHeaderSubtitle?: string | null;
  dateHeaderTitleVariant?: 'today' | 'year' | 'month';
  dateHeaderTitleColor?: string;
  dateHeaderSubtitleColor?: string;
  timelineRailColor?: string;
  dateHeaderDotColor?: string;
  timelineDotColor?: string;
  itemRailColor?: string;
  itemDotColor?: string;
  metaTextOverride?: string | null;
  metaTextColor?: string;
  itemTitleStyle?: StyleProp<TextStyle>;
  metaTextStyle?: StyleProp<TextStyle>;
  hideBottomRail?: boolean;
}

function MemoryCardComponent({
  item,
  onPress,
  deferImageLoad = false,
  enableImageLoad = true,
  isFocused = false,
  onFocusedLayout,
  imageVariant,
  thumbnailPreset = 'default',
  showDateHeader = false,
  isFirstGroup = false,
  dateHeaderTitle = null,
  dateHeaderSubtitle = null,
  dateHeaderTitleVariant = 'month',
  dateHeaderTitleColor,
  dateHeaderSubtitleColor,
  timelineRailColor,
  dateHeaderDotColor,
  timelineDotColor,
  itemRailColor,
  itemDotColor,
  metaTextOverride,
  metaTextColor,
  itemTitleStyle,
  metaTextStyle,
  hideBottomRail = false,
}: MemoryCardProps) {
  const timelineImage = getTimelinePrimaryMemoryImageSource(item);
  const effectiveVariant = imageVariant ?? timelineImage.variant;
  const { signedUrl } = useSignedMemoryImage(timelineImage.value, {
    enabled: enableImageLoad,
    defer: deferImageLoad,
    delayMs: deferImageLoad ? 220 : 0,
    trackLoading: false,
    variant: effectiveVariant,
  });
  const hasImage = Boolean(timelineImage.value) || hasMemoryImage(item);
  const categoryMeta = useMemo(() => getRecordCategoryMeta(item), [item]);
  const categoryTone = useMemo(() => getMemoryCategoryChipTone(item), [item]);
  const thumbnailStyle = thumbnailPreset === 'timeline' ? styles.thumbTimeline : styles.thumb;
  const thumbnailImageStyle =
    thumbnailPreset === 'timeline' ? styles.thumbTimelineImg : styles.thumbImg;
  const thumbnailPlaceholderStyle =
    thumbnailPreset === 'timeline'
      ? styles.thumbTimelinePlaceholder
      : styles.thumbPlaceholder;
  const thumbnailPlaceholderIconSize = thumbnailPreset === 'timeline' ? 28 : 20;

  const titleText = useMemo(() => {
    const title = trimText(item.title);
    if (title) return toSnippet(title, 36);

    const content = trimText(item.content);
    if (content) return toSnippet(content, 36);

    return '기록을 남겼어요';
  }, [item.content, item.title]);
  const metaText = useMemo(
    () => metaTextOverride ?? formatRecordTimelineMeta(item),
    [item, metaTextOverride],
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
      {showDateHeader && dateHeaderTitleVariant === 'year' ? (
        <View style={styles.dateGroupHeaderYearBlock}>
          {dateHeaderTitle ? (
            <View style={styles.dateGroupHeaderYearTitleWrap}>
              <AppText
                preset="headline"
                style={[
                  styles.dateGroupHeaderTitleYear,
                  dateHeaderTitleColor ? { color: dateHeaderTitleColor } : null,
                ]}
              >
                {dateHeaderTitle}
              </AppText>
            </View>
          ) : null}

          <View style={styles.dateGroupHeaderMonthRow}>
            <View style={[styles.dateGroupHeaderRail, styles.dateGroupHeaderRailMonth]}>
              <View
                style={[
                  styles.dateGroupHeaderLine,
                  isFirstGroup ? styles.dateGroupHeaderLineYearFirst : null,
                  styles.dateGroupHeaderLineYearConnect,
                  { backgroundColor: timelineRailColor ?? categoryTone.lineColor },
                ]}
              />
              <View
                style={[
                  styles.dateGroupHeaderDot,
                  { backgroundColor: dateHeaderDotColor ?? categoryTone.dotColor },
                ]}
              />
            </View>

            <View style={styles.dateGroupHeaderText}>
              {dateHeaderSubtitle ? (
                <AppText
                  preset="caption"
                  style={[
                    styles.dateGroupHeaderSubtitle,
                    dateHeaderSubtitleColor ? { color: dateHeaderSubtitleColor } : null,
                  ]}
                >
                  {dateHeaderSubtitle}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>
      ) : showDateHeader ? (
        <View style={styles.dateGroupHeader}>
          <View
            style={[
              styles.dateGroupHeaderRail,
              dateHeaderTitleVariant === 'month' ? styles.dateGroupHeaderRailMonth : null,
            ]}
          >
            <View
              style={[
                styles.dateGroupHeaderLine,
                isFirstGroup ? styles.dateGroupHeaderLineFirst : null,
                { backgroundColor: timelineRailColor ?? categoryTone.lineColor },
              ]}
            />
            <View
              style={[
                styles.dateGroupHeaderDot,
                { backgroundColor: dateHeaderDotColor ?? categoryTone.dotColor },
              ]}
            />
          </View>

          <View style={styles.dateGroupHeaderText}>
            {dateHeaderTitle ? (
              <AppText
                preset="headline"
                style={[
                  dateHeaderTitleVariant === 'today'
                    ? styles.dateGroupHeaderTitleToday
                    : styles.dateGroupHeaderTitleMonth,
                  dateHeaderTitleColor ? { color: dateHeaderTitleColor } : null,
                ]}
              >
                {dateHeaderTitle}
              </AppText>
            ) : null}
            {dateHeaderSubtitle ? (
              <AppText
                preset="caption"
                style={[
                  styles.dateGroupHeaderSubtitle,
                  dateHeaderSubtitleColor ? { color: dateHeaderSubtitleColor } : null,
                ]}
              >
                {dateHeaderSubtitle}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.itemRow}>
        <View style={styles.itemRail}>
          <View
            style={[
              styles.itemRailLine,
              hideBottomRail ? styles.itemRailLineLast : null,
              {
                backgroundColor:
                  itemRailColor ?? timelineRailColor ?? categoryTone.lineColor,
              },
            ]}
          />
          <View
            style={[
              styles.itemRailDot,
              {
                backgroundColor:
                  itemDotColor ?? timelineDotColor ?? categoryTone.dotColor,
              },
            ]}
          />
        </View>

        <View style={thumbnailStyle}>
          {hasImage && signedUrl ? (
            <OptimizedImage
              uri={signedUrl}
              style={thumbnailImageStyle}
              resizeMode="cover"
              priority={deferImageLoad ? 'low' : 'normal'}
            />
          ) : (
            <View
              style={[
                thumbnailPlaceholderStyle,
                { backgroundColor: categoryTone.placeholderColor },
              ]}
            >
              <MaterialCommunityIcons
                name={categoryMeta.icon}
                size={thumbnailPlaceholderIconSize}
                color={categoryTone.textColor}
              />
            </View>
          )}
        </View>

        <View style={styles.itemBody}>
          <AppText
            preset="body"
            numberOfLines={1}
            style={[styles.itemTitle, itemTitleStyle]}
          >
            {titleText}
          </AppText>

          {metaText ? (
            <View style={styles.metaRow}>
              <AppText
                preset="caption"
                numberOfLines={1}
                style={[
                  styles.metaText,
                  metaTextColor ? { color: metaTextColor } : null,
                  metaTextStyle,
                ]}
              >
                {metaText}
              </AppText>
            </View>
          ) : null}
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
    prev.imageVariant === next.imageVariant &&
    prev.thumbnailPreset === next.thumbnailPreset &&
    prev.showDateHeader === next.showDateHeader &&
    prev.isFirstGroup === next.isFirstGroup &&
    prev.dateHeaderTitle === next.dateHeaderTitle &&
    prev.dateHeaderSubtitle === next.dateHeaderSubtitle &&
    prev.dateHeaderTitleVariant === next.dateHeaderTitleVariant &&
    prev.dateHeaderTitleColor === next.dateHeaderTitleColor &&
    prev.dateHeaderSubtitleColor === next.dateHeaderSubtitleColor &&
    prev.timelineRailColor === next.timelineRailColor &&
    prev.dateHeaderDotColor === next.dateHeaderDotColor &&
    prev.timelineDotColor === next.timelineDotColor &&
    prev.itemRailColor === next.itemRailColor &&
    prev.itemDotColor === next.itemDotColor &&
    prev.metaTextOverride === next.metaTextOverride &&
    prev.metaTextColor === next.metaTextColor &&
    prev.itemTitleStyle === next.itemTitleStyle &&
    prev.metaTextStyle === next.metaTextStyle &&
    prev.hideBottomRail === next.hideBottomRail,
);
