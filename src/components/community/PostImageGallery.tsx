import React, { memo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import type { CommunityPostImageSlot } from '../../types/community';

const PostImage = memo(function PostImageBase({
  initialUri,
  index,
  refreshUrl,
}: {
  initialUri: string | null;
  index: number;
  refreshUrl?: () => Promise<string | null>;
}) {
  const theme = useTheme();
  const [aspectRatio, setAspectRatio] = useState(1);
  const [uri, setUri] = useState(initialUri);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    initialUri ? 'loading' : 'error',
  );
  const [attempt, setAttempt] = useState(0);
  const currentAttempt = useRef(0);
  const refreshing = useRef(false);

  const retry = async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    const nextAttempt = ++currentAttempt.current;
    setStatus('loading');
    try {
      const nextUri = refreshUrl ? await refreshUrl() : uri;
      if (!nextUri) {
        setStatus('error');
        return;
      }
      setUri(nextUri);
      setAttempt(nextAttempt);
    } catch {
      setStatus('error');
    } finally {
      refreshing.current = false;
    }
  };

  return (
    <View
      style={[
        styles.frame,
        { aspectRatio, backgroundColor: theme.colors.surface },
      ]}
    >
      {uri ? <Image
        key={attempt}
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={`게시글 사진 ${index + 1}`}
        onLoad={({ nativeEvent: { source } }) => {
          if (attempt !== currentAttempt.current) return;
          const ratio = source.width / source.height;
          if (!Number.isFinite(ratio) || ratio <= 0) {
            setStatus('error');
            return;
          }
          // Fit the actual parent width and decoded image ratio, never a cropped slide.
          setAspectRatio(ratio);
          setStatus('ready');
        }}
        onError={() => {
          if (attempt === currentAttempt.current) setStatus('error');
        }}
      /> : null}
      {status === 'loading' ? (
        <View pointerEvents="none" style={styles.overlay}>
          <ActivityIndicator
            accessibilityLabel={`사진 ${index + 1} 불러오는 중`}
            color={theme.colors.textSecondary}
          />
        </View>
      ) : status === 'error' ? (
        <View
          style={[styles.overlay, { backgroundColor: theme.colors.surface }]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`사진 ${index + 1} 다시 불러오기`}
            style={styles.retry}
            onPress={retry}
          >
            <AppText preset="unifiedMeta">사진 다시 불러오기</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
});

function PostImageGallery({
  imageUrls = [],
  slots,
  onRetry,
}: {
  imageUrls?: string[];
  slots?: CommunityPostImageSlot[];
  onRetry?: (index: number, path: string) => Promise<string | null>;
}) {
  const images = slots ?? imageUrls.map(url => url.trim()).filter(Boolean)
    .map(url => ({ path: url, url }));
  if (!images.length) return null;
  return (
    <View style={styles.gallery}>
      {images.map(({ path, url }, index) => (
        <PostImage
          key={`${index}:${path}:${url ?? ''}`}
          initialUri={url}
          index={index}
          refreshUrl={onRetry ? () => onRetry(index, path) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: 8 },
  frame: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
});

export default memo(PostImageGallery);
