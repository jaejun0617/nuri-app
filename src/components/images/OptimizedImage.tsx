import React from 'react';
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  Platform,
  type StyleProp,
  UIManager,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import type { ImageStyle as FastImageStyle } from 'react-native-fast-image';

type Props = {
  uri: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  priority?: 'low' | 'normal' | 'high';
  fallback?: boolean;
};

function mapResizeMode(mode: ImageResizeMode | undefined) {
  switch (mode) {
    case 'contain':
      return FastImage.resizeMode.contain;
    case 'stretch':
      return FastImage.resizeMode.stretch;
    case 'center':
      return FastImage.resizeMode.contain;
    default:
      return FastImage.resizeMode.cover;
  }
}

function mapPriority(priority: Props['priority']) {
  switch (priority) {
    case 'high':
      return FastImage.priority.high;
    case 'low':
      return FastImage.priority.low;
    default:
      return FastImage.priority.normal;
  }
}

function isRemoteHttpUri(uri: string) {
  return /^https?:\/\//i.test(`${uri}`.trim());
}

function hasFastImageNativeView() {
  if (Platform.OS === 'android') {
    return Boolean(UIManager.getViewManagerConfig?.('FastImageView'));
  }

  if (Platform.OS === 'ios') {
    return Boolean(UIManager.getViewManagerConfig?.('FastImageView'));
  }

  return false;
}

export function preloadOptimizedImages(uris: ReadonlyArray<string>) {
  if (!hasFastImageNativeView()) return;

  const targets = Array.from(
    new Set((uris ?? []).map(uri => `${uri ?? ''}`.trim()).filter(isRemoteHttpUri)),
  );
  if (targets.length === 0) return;

  FastImage.preload(
    targets.map(uri => ({
      uri,
      priority: FastImage.priority.low,
      cache: FastImage.cacheControl.immutable,
    })),
  );
}

type NativeOptimizedImageRef =
  | React.ComponentRef<typeof Image>
  | React.ComponentRef<typeof FastImage>;

const OptimizedImage = React.forwardRef<NativeOptimizedImageRef, Props>(
  function OptimizedImage(
    {
      uri,
      style,
      resizeMode = 'cover',
      priority = 'normal',
      fallback = false,
    },
    _ref,
  ) {
    if (!uri || fallback || !isRemoteHttpUri(uri) || !hasFastImageNativeView()) {
      return (
        <Image
          source={{ uri }}
          style={style}
          resizeMode={resizeMode}
          fadeDuration={250}
        />
      );
    }
    return (
      <FastImage
        source={{
          uri,
          priority: mapPriority(priority),
          cache: FastImage.cacheControl.immutable,
        }}
        style={style as StyleProp<FastImageStyle>}
        resizeMode={mapResizeMode(resizeMode)}
      />
    );
  },
);

export default OptimizedImage;
