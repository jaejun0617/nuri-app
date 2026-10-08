import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';

const PostImage = memo(function PostImageBase({
  uri,
  index,
}: {
  uri: string;
  index: number;
}) {
  const theme = useTheme();
  const [aspectRatio, setAspectRatio] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [attempt, setAttempt] = useState(0);

  return (
    <View
      style={[
        styles.frame,
        { aspectRatio, backgroundColor: theme.colors.surface },
      ]}
    >
      <Image
        key={attempt}
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={`게시글 사진 ${index + 1}`}
        onLoad={({ nativeEvent: { source } }) => {
          const ratio = source.width / source.height;
          if (!Number.isFinite(ratio) || ratio <= 0) {
            setStatus('error');
            return;
          }
          // Fit the actual parent width and decoded image ratio, never a cropped slide.
          setAspectRatio(ratio);
          setStatus('ready');
        }}
        onError={() => setStatus('error')}
      />
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
            onPress={() => {
              setStatus('loading');
              setAttempt(value => value + 1);
            }}
          >
            <AppText preset="unifiedMeta">사진 다시 불러오기</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
});

function PostImageGallery({ imageUrls }: { imageUrls: string[] }) {
  const urls = imageUrls.map(url => url.trim()).filter(Boolean);
  if (!urls.length) return null;
  return (
    <View style={styles.gallery}>
      {urls.map((uri, index) => (
        <PostImage key={`${uri}-${index}`} uri={uri} index={index} />
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
