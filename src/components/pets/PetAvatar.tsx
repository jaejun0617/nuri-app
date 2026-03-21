import React, { memo, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';

type Props = {
  uri: string | null;
  size?: number;
  fallbackLabel?: string | null;
};

const PetAvatar = memo(function PetAvatar({
  uri,
  size = 64,
  fallbackLabel,
}: Props) {
  const [loadFailed, setLoadFailed] = useState(false);

  const imageStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
    }),
    [size],
  );

  const fallbackStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
    }),
    [size],
  );

  const shouldShowImage = Boolean(uri?.trim()) && !loadFailed;
  const fallbackInitial = fallbackLabel?.trim()?.charAt(0) || null;

  if (shouldShowImage) {
    return (
      <Image
        source={{ uri: uri!.trim() }}
        style={imageStyle}
        resizeMode="cover"
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, fallbackStyle]}>
      {fallbackInitial ? (
        <AppText preset="body" style={styles.fallbackText}>
          {fallbackInitial}
        </AppText>
      ) : (
        <Feather name="image" size={22} color="#8FA0B6" />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    color: '#5B6B82',
    fontWeight: '900',
  },
});

export default PetAvatar;
