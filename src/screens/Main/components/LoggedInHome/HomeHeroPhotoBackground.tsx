import React, { memo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../../../app/ui/AppText';
import { HOME_HERO_COLORS, getHomeHeroPhotoGeometry, type HomeHeroColors } from '../../../../theme/home/heroLayout';

type MaskProps = React.ComponentProps<typeof View> & {
  maskElement: React.ReactElement;
  androidRenderingMode?: 'software' | 'hardware';
};
const PhotoMask = MaskedView as unknown as React.ComponentType<MaskProps>;
type PhotoState = { uri: string | null; status: 'loading' | 'ready' | 'error' };

/** One native image and one fixed frame, including missing/loading/error/retry. */
export const HomeHeroPhotoBackground = memo(function HeroPhotoBackground({
  uri, frameWidth, colors = HOME_HERO_COLORS,
}: { uri: string | null; frameWidth: number; colors?: HomeHeroColors }) {
  const geometry = getHomeHeroPhotoGeometry(frameWidth);
  const [imageState, setImageState] = useState<PhotoState>({ uri, status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const currentRequest = useRef({ uri, attempt });
  currentRequest.current = { uri, attempt };
  const status = imageState.uri === uri ? imageState.status : 'loading';
  const settle = (next: PhotoState['status']) => {
    if (currentRequest.current.uri === uri && currentRequest.current.attempt === attempt) {
      setImageState({ uri, status: next });
    }
  };

  return (
    <View testID="home-hero-photo-frame" style={[styles.frame, { height: geometry.height, backgroundColor: colors.surface }]}>
      <PhotoMask
        testID="home-hero-photo-mask"
        style={styles.fill}
        androidRenderingMode="software"
        maskElement={
          <View pointerEvents="none" style={styles.fill}>
            <View style={{ height: geometry.edgeY, backgroundColor: '#000000' }} />
            <View
              testID="home-hero-ellipse"
              style={{
                position: 'absolute', left: geometry.ellipseLeft, top: geometry.ellipseTop,
                width: geometry.ellipseSize, height: geometry.ellipseSize,
                borderRadius: frameWidth, backgroundColor: '#000000',
                transform: [{ scaleY: geometry.ellipseScaleY }],
              }}
            />
          </View>
        }
      >
        <View
          testID="home-hero-photo-fallback"
          importantForAccessibility={uri && status === 'ready' ? 'no-hide-descendants' : 'auto'}
          style={[styles.fallback, { backgroundColor: colors.statusBar }]}
        >
          {uri && status === 'loading' ? (
            <ActivityIndicator accessibilityLabel="프로필 사진을 불러오는 중" color={colors.muted} />
          ) : !uri || status === 'error' ? (
            <AppText preset="bodySm" align="center" style={[styles.fallbackText, { color: colors.muted }]}>
              {uri ? '사진을 불러오지 못했어요' : '아이의 사진을 기다리고 있어요'}
            </AppText>
          ) : null}
          {uri && status === 'error' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 사진 다시 불러오기"
              style={styles.retry}
              onPress={() => { setAttempt(previous => previous + 1); settle('loading'); }}
            >
              <AppText preset="bodySm" style={{ color: colors.ink }}>다시 불러오기</AppText>
            </Pressable>
          ) : null}
        </View>
        {uri && status !== 'error' ? (
          <Image
            key={`${uri}:${attempt}`}
            testID="home-hero-photo-background"
            source={{ uri }}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={0}
            onLoad={() => settle('ready')}
            onError={() => settle('error')}
            accessible={false}
            pointerEvents="none"
            style={[styles.fill, { opacity: status === 'ready' ? 1 : 0 }]}
          />
        ) : null}
        <LinearGradient
          testID="home-hero-photo-top-shade"
          colors={uri && status === 'ready'
            ? ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)']
            : ['rgba(24,19,33,0.78)', 'rgba(24,19,33,0.78)', 'rgba(24,19,33,0)']}
          locations={uri && status === 'ready' ? [0, 1] : [0, 0.75, 1]}
          pointerEvents="none"
          accessible={false}
          style={[styles.shade, { height: uri && status === 'ready' ? 112 : 160 }]}
        />
      </PhotoMask>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { width: '100%', backgroundColor: HOME_HERO_COLORS.surface },
  fill: { ...StyleSheet.absoluteFill },
  fallback: {
    ...StyleSheet.absoluteFill, backgroundColor: HOME_HERO_COLORS.statusBar,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  fallbackText: { color: HOME_HERO_COLORS.muted, paddingHorizontal: 24 },
  retry: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, height: 112 },
});
