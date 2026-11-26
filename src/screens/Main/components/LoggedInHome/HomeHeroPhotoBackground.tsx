import React, { memo, useLayoutEffect, useRef, useState } from 'react';
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
export type HomeHeroPhotoStatus = {
  uri: string | null;
  status: 'missing' | 'loading' | 'ready' | 'error';
};
type PhotoRequest = { uri: string | null; attempt: number };
type PhotoState = { request: PhotoRequest; status: 'loading' | 'ready' | 'error' };

/** One native image and one fixed frame, including missing/loading/error/retry. */
export const HomeHeroPhotoBackground = memo(function HeroPhotoBackground({
  uri, frameWidth, colors = HOME_HERO_COLORS, hasStoredPhoto = false,
  onPressRegisterPhoto, onPhotoSettled, onPhotoStatusChange,
}: {
  uri: string | null;
  frameWidth: number;
  colors?: HomeHeroColors;
  hasStoredPhoto?: boolean;
  onPressRegisterPhoto?: () => void;
  onPhotoSettled?: (uri: string | null) => void;
  onPhotoStatusChange?: (state: HomeHeroPhotoStatus) => void;
}) {
  const geometry = getHomeHeroPhotoGeometry(frameWidth);
  const [attempt, setAttempt] = useState(0);
  const currentRequest = useRef<PhotoRequest>({ uri, attempt });
  const [imageState, setImageState] = useState<PhotoState>({ request: currentRequest.current, status: 'loading' });
  if (currentRequest.current.uri !== uri || currentRequest.current.attempt !== attempt) {
    currentRequest.current = { uri, attempt };
  }
  const request = currentRequest.current;
  const status = imageState.request === request ? imageState.status : 'loading';
  const photoStatus = uri ? status : hasStoredPhoto ? 'error' : 'missing';
  useLayoutEffect(() => {
    // Header contrast follows the same committed image state, including retries.
    onPhotoStatusChange?.({ uri, status: photoStatus });
  }, [onPhotoStatusChange, photoStatus, uri]);
  const settle = (next: PhotoState['status']) => {
    if (currentRequest.current === request) {
      setImageState({ request, status: next });
      if (next !== 'loading') onPhotoSettled?.(uri);
    }
  };

  const ellipse = {
    left: geometry.ellipseLeft,
    width: geometry.ellipseSize,
    height: geometry.ellipseSize,
    borderRadius: geometry.width,
    transform: [{ scaleY: geometry.ellipseScaleY }],
  };
  const edgeHeight = geometry.depth + geometry.width * 0.34;

  return (
    <View testID="home-hero-photo-frame" style={[styles.frame, { height: geometry.height }]}>
      {/* Paint behind the mask so the edge cannot tint or crop the original photo. */}
      {geometry.width > 0 ? (
        <View
          testID="home-hero-curve-light"
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.curveLight, { top: geometry.edgeY, height: edgeHeight }]}
        >
          <Image
            testID="home-hero-curve-veil"
            source={require('../../../../assets/seasonal/home/profile-curve-light-v1.png')}
            resizeMode="stretch"
            fadeDuration={0}
            accessible={false}
            style={{ width: geometry.width, height: edgeHeight }}
          />
        </View>
      ) : null}
      <PhotoMask
        testID="home-hero-photo-mask"
        style={styles.fill}
        androidRenderingMode="hardware"
        maskElement={
          <View pointerEvents="none" style={styles.fill}>
            <View style={{ height: geometry.edgeY, backgroundColor: '#000000' }} />
            <View
              testID="home-hero-ellipse"
              style={[styles.outline, ellipse, { top: geometry.ellipseTop, backgroundColor: '#000000' }]}
            />
          </View>
        }
      >
        <View
          testID="home-hero-photo-fallback"
          importantForAccessibility={uri && status === 'ready' ? 'no-hide-descendants' : 'auto'}
          style={[styles.fallback, { backgroundColor: colors.statusBar }]}
        >
          {photoStatus === 'missing' ? (
            <>
              <LinearGradient
                testID="home-hero-empty-sky"
                colors={['#D8E8FA', '#EAF2FC']}
                pointerEvents="none"
                style={styles.fill}
              />
              {onPressRegisterPhoto ? (
                <Pressable
                  testID="home-hero-register-photo"
                  accessibilityRole="button"
                  accessibilityLabel="프로필 사진 등록하기"
                  onPress={onPressRegisterPhoto}
                  style={styles.register}
                >
                  <AppText preset="bodySm" align="center" style={styles.emptyEyebrow}>여기를 톡 눌러</AppText>
                  <AppText preset="body" align="center" style={[styles.registerLabel, { color: colors.ink }]}>우리 아이 사진을 올려봐요.</AppText>
                </Pressable>
              ) : null}
            </>
          ) : photoStatus === 'loading' ? (
            <ActivityIndicator accessibilityLabel="프로필 사진을 불러오는 중" color={colors.muted} />
          ) : photoStatus === 'error' ? (
            <AppText preset="bodySm" align="center" style={[styles.fallbackText, { color: colors.muted }]}>
              사진을 불러오지 못했어요
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
          colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          pointerEvents="none"
          accessible={false}
          style={[styles.shade, { opacity: uri && status === 'ready' ? 1 : 0 }]}
        />
      </PhotoMask>
    </View>
  );
});

const styles = StyleSheet.create({
  // Transparent outside the mask so the curved cutout shares the page canvas.
  frame: { width: '100%', backgroundColor: 'transparent' },
  fill: { ...StyleSheet.absoluteFill },
  fallback: {
    ...StyleSheet.absoluteFill, backgroundColor: HOME_HERO_COLORS.statusBar,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  fallbackText: { color: HOME_HERO_COLORS.muted, paddingHorizontal: 24 },
  curveLight: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  outline: { position: 'absolute' },
  register: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 4 },
  emptyEyebrow: { color: '#515D80' },
  registerLabel: { fontWeight: '700' },
  retry: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, height: 112 },
});
