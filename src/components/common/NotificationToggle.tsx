import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useNavigationMotion } from '../../navigation/useNavigationMotion';

export function NotificationToggle({ value, label, disabled = false, loading = false, onChange }: {
  value: boolean; label: string; disabled?: boolean; loading?: boolean; onChange: (value: boolean) => void | Promise<unknown>;
}) {
  const reduceMotion = useNavigationMotion();
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const displayedValue = pendingValue ?? value;
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: displayedValue ? 1 : 0,
      duration: reduceMotion ? 0 : 200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [position, reduceMotion, displayedValue]);
  const change = async () => {
    if (pending.current || disabled || loading) return;
    pending.current = true;
    setPendingValue(!value);
    try {
      await onChange(!value);
    } catch {
      // The owner reports the failure; return smoothly to confirmed server state.
    } finally {
      pending.current = false;
      if (mounted.current) setPendingValue(null);
    }
  };
  const busy = loading || pendingValue !== null;
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: displayedValue, disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={change} style={styles.touch}>
      <View style={styles.track}>
        <Animated.View pointerEvents="none" style={[styles.fill, { opacity: position }]}>
          <LinearGradient colors={['#AF94F5', '#8759F5']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }]}>
          {busy ? <ActivityIndicator size="small" color="#8659E6" /> : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  touch: { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  track: { width: 54, height: 30, borderRadius: 15, padding: 2, backgroundColor: '#DDD9EA' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 15, overflow: 'hidden' },
  thumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFCFF', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 4px rgba(61, 39, 98, 0.18)' },
});
