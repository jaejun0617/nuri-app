import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { HomeFrostedGlass } from '../home/HomeFrostedGlass';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  frosted?: boolean;
};

export default React.memo(function WeatherGlassCard({
  children,
  style,
  backgroundColor,
  borderColor,
  frosted = false,
}: Props) {
  const season = useEffectiveSeason();
  if (frosted)
    return (
      <HomeFrostedGlass
        season={season}
        style={[styles.card, { marginTop: 0 }, style]}
      >
        {children}
      </HomeFrostedGlass>
    );
  return (
    <View
      style={[
        styles.card,
        backgroundColor ? { backgroundColor } : null,
        borderColor ? { borderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
  },
});
