import React, { memo, useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

type PhotoSize = { uri: string; aspectRatio: number };

/** Late metadata from another pet must never resize the current Hero. */
export function useHomeHeroPhoto(uri: string | null) {
  const [size, setSize] = useState<PhotoSize | null>(null);

  useEffect(() => {
    if (!uri) return;
    const sourceUri = uri;
    let active = true;
    async function loadSize() {
      try {
        const { width, height } = await Image.getSize(sourceUri);
        if (!active) return;
        if (
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width < 1 ||
          height < 1
        ) {
          setSize(null);
          return;
        }
        const aspectRatio = width / height;
        setSize(
          Number.isFinite(aspectRatio) && aspectRatio > 0
            ? { uri: sourceUri, aspectRatio }
            : null,
        );
      } catch {
        if (active) setSize(null);
      }
    }
    loadSize();
    return () => {
      active = false;
    };
  }, [uri]);

  const onError = useCallback(() => {
    setSize(previous => (previous?.uri === uri ? null : previous));
  }, [uri]);

  return { aspectRatio: size?.uri === uri ? size.aspectRatio : null, onError };
}

export const HomeHeroPhotoBackground = memo(function HeroPhotoBackground({
  uri,
  aspectRatio,
  onError,
}: {
  uri: string | null;
  aspectRatio: number | null;
  onError: () => void;
}) {
  if (!uri || !aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0)
    return null;

  return (
    <View
      testID="home-hero-photo-background"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.background}
    >
      <Image
        key={uri}
        source={{ uri }}
        resizeMode="contain"
        resizeMethod="resize"
        onError={onError}
        accessible={false}
        style={[styles.photo, { aspectRatio }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  },
});
