import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import PetAvatar from '../../components/pets/PetAvatar';

const frame = require('../../assets/profile-completion/frame-pencil-check.png');
const shadow = require('../../assets/profile-completion/shadow.png');

export function ProfileCompletionPhoto({
  uri,
  name,
  onError,
}: {
  uri: string | null;
  name: string;
  onError: () => void;
}) {
  return uri ? (
    <Image
      source={{ uri }}
      resizeMode="cover"
      style={StyleSheet.absoluteFill}
      onError={onError}
      testID="profile-completion-photo"
      accessible={false}
    />
  ) : (
    <View style={styles.fallback} testID="profile-completion-photo-fallback">
      <PetAvatar uri={null} fallbackLabel={name} size={64} />
    </View>
  );
}

/** A transparent reference frame sits above a separately masked, live profile photo. */
export function ProfileCompletionArtwork({
  width,
  uri,
  name,
  onError,
}: {
  width: number;
  uri: string | null;
  name: string;
  onError: () => void;
}) {
  const unit = width / 480;
  const imageFrame = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width,
    height: 470 * unit,
  };
  return (
    <View
      testID="profile-completion-artwork"
      style={{ width, height: 470 * unit }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={shadow} style={imageFrame} resizeMode="contain" />
      {/* The native rounded clip contains the photo; the extracted front layer
          defines the exact tilted opening and covers all hidden photo edges. */}
      <View
        testID="profile-completion-photo-window"
        style={{
          position: 'absolute',
          left: 74 * unit,
          top: 90 * unit,
          width: 256 * unit,
          height: 274 * unit,
          borderRadius: 40 * unit,
          overflow: 'hidden',
          transform: [{ rotate: '5deg' }, { skewX: '-4deg' }],
        }}
      >
        <ProfileCompletionPhoto uri={uri} name={name} onError={onError} />
      </View>
      <Image source={frame} style={imageFrame} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
