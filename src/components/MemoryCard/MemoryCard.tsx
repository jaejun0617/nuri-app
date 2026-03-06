// 파일: src/components/MemoryCard/MemoryCard.tsx
// 역할:
// - memory 단건을 카드 형태로 렌더링하는 공용 프리뷰 컴포넌트
// - signed URL 이미지 로딩, 감정/날짜 요약, 탭 액션 전달을 한 곳에서 담당
// - 타임라인/홈 등 리스트 기반 화면에서 재사용되므로 memo 기반으로 불필요 리렌더링을 줄임

import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, TouchableOpacity, View } from 'react-native';

import type { MemoryRecord } from '../../services/supabase/memories';
import { getMemoryImageSignedUrlCached } from '../../services/supabase/storageMemories';
import AppText from '../../app/ui/AppText';

// ✅ 기존 TimelineScreen.styles 그대로 사용 (UI 유지)
import { styles } from '../../screens/Records/TimelineScreen.styles';

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
}

export const MemoryCard = memo(function MemoryCard({
  item,
  onPress,
}: MemoryCardProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const dateText = useMemo(
    () => item.occurredAt ?? item.createdAt?.slice(0, 10) ?? '',
    [item.occurredAt, item.createdAt],
  );
  const emotionText = useMemo(() => {
    if (!item.emotion) return null;
    return EMOTION_EMOJI[item.emotion] ?? item.emotion;
  }, [item.emotion]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const path = item.imagePath ?? null;

      // ✅ path 없으면 상태 정리
      if (!path) {
        if (mounted) {
          setSignedUrl(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted) setLoading(true);
        const url = await getMemoryImageSignedUrlCached(path);
        if (mounted) setSignedUrl(url);
      } catch {
        if (mounted) setSignedUrl(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [item.imagePath]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.item}
      onPress={() => onPress(item)}
    >
      {/* 썸네일 */}
      <View style={styles.thumb}>
        {!item.imagePath ? (
          <View style={styles.thumbPlaceholder}>
            <AppText preset="caption" style={styles.thumbPlaceholderText}>
              NO IMAGE
            </AppText>
          </View>
        ) : loading ? (
          <View
            style={[
              styles.thumbPlaceholder,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <ActivityIndicator size="small" color="#8A94A6" />
          </View>
        ) : signedUrl ? (
          <Image
            source={{ uri: signedUrl }}
            style={styles.thumbImg}
            resizeMode="cover"
            fadeDuration={250}
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <AppText preset="caption" style={styles.thumbPlaceholderText}>
              ERROR
            </AppText>
          </View>
        )}
      </View>

      {/* 텍스트 */}
      <View style={styles.itemBody}>
        <AppText preset="headline" numberOfLines={1} style={styles.itemTitle}>
          {(item.title ?? '').trim() ? item.title : '제목 없음'}
        </AppText>

        <AppText preset="caption" numberOfLines={2} style={styles.itemContent}>
          {item.content?.trim() ? item.content.trim() : '내용이 없습니다.'}
        </AppText>

        <View style={styles.metaRow}>
          <AppText preset="caption" style={styles.metaText}>
            {dateText}
          </AppText>

          {emotionText ? (
            <View style={styles.badge}>
              <AppText preset="caption" style={styles.badgeText}>
                {emotionText}
              </AppText>
            </View>
          ) : null}
        </View>

        {item.tags?.length ? (
          <AppText preset="caption" numberOfLines={1} style={styles.tags}>
            {item.tags.join(' ')}
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});
