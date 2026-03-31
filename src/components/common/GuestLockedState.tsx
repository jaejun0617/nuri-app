import React, { memo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import { ASSETS } from '../../assets';
import AppText from '../../app/ui/AppText';

type Props = {
  eyebrow: string;
  titleLines: readonly string[];
  bodyLines: readonly string[];
  buttonLabel: string;
  onPress: () => void;
};

function GuestLockedStateBase({
  eyebrow,
  titleLines,
  bodyLines,
  buttonLabel,
  onPress,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(109,124,255,0.12)', 'rgba(109,124,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.logoHalo,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Image source={ASSETS.logo} resizeMode="contain" style={styles.logo} />
        </View>

        <AppText
          preset="caption"
          style={[styles.eyebrow, { color: theme.colors.brand }]}
        >
          {eyebrow}
        </AppText>

        <View style={styles.copyBlock}>
          {titleLines.map((line, index) => (
            <AppText
              key={`title-${line}-${index}`}
              preset="title2"
              style={[styles.title, { color: theme.colors.textPrimary }]}
            >
              {line}
            </AppText>
          ))}
        </View>

        <View style={styles.copyBlock}>
          {bodyLines.map((line, index) => (
            <AppText
              key={`body-${line}-${index}`}
              preset="body"
              style={[styles.body, { color: theme.colors.textSecondary }]}
            >
              {line}
            </AppText>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={onPress}
          style={[styles.button, { backgroundColor: theme.colors.brand }]}
        >
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
          <AppText preset="button" style={styles.buttonText}>
            {buttonLabel}
          </AppText>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#161B2C',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  logoHalo: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logo: {
    width: 76,
    height: 76,
  },
  eyebrow: {
    marginTop: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  copyBlock: {
    width: '100%',
    gap: 3,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
  },
  body: {
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    marginTop: 10,
    minHeight: 54,
    width: '100%',
    paddingHorizontal: 24,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

const GuestLockedState = memo(GuestLockedStateBase);

export default GuestLockedState;
