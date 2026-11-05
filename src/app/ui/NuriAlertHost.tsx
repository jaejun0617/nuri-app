import React, { useSyncExternalStore } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AppText from './AppText';
import CtaButton, { CtaText } from './CtaButton';
import { androidAlertState } from './NuriAlert';

/** Renders only app-owned Android alerts. Permission and provider windows stay native. */
export default function NuriAlertHost() {
  const alert = useSyncExternalStore(
    androidAlertState.subscribe,
    androidAlertState.getSnapshot,
  );
  const { width, fontScale } = useWindowDimensions();
  if (!alert) return null;
  const stacked = alert.buttons.length > 2 || width < 340 || fontScale >= 1.25;

  return (
    <ConfirmDialog
      key={alert.id}
      visible
      title={alert.title}
      titleContent={
        <AppText
          accessibilityRole="header"
          preset="unifiedTitle"
          weight="800"
          styleOverridesPreset
          style={styles.title}
        >
          {alert.title}
        </AppText>
      }
      message={alert.message}
      confirmLabel="확인"
      typographyMode="unified"
      surfaceVariant="menuGlass"
      onConfirm={() => androidAlertState.choose(alert.id, 0)}
      onCancel={() => androidAlertState.dismiss(alert.id)}
      customActions={
        <View style={[styles.actions, stacked && styles.stacked]}>
          {alert.buttons.map((button, index) => {
            const destructive = button.style === 'destructive';
            const primary =
              button.style !== 'cancel' && index === alert.buttons.length - 1;
            return (
              <CtaButton
                key={index}
                role={
                  destructive
                    ? 'destructiveConfirm'
                    : primary
                    ? 'primary'
                    : 'neutral'
                }
                testID={`nuri-alert-action-${index}`}
                onPress={() => androidAlertState.choose(alert.id, index)}
                style={[styles.button, !stacked && styles.inline]}
              >
                <CtaText
                  preset="unifiedLabel"
                  weight="700"
                  style={styles.label}
                >
                  {button.text || '확인'}
                </CtaText>
              </CtaButton>
            );
          })}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 19,
    lineHeight: 26,
    textAlign: 'center',
    letterSpacing: 0,
  },
  actions: { flexDirection: 'row', gap: 10 },
  stacked: { flexDirection: 'column' },
  button: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: { flex: 1, minWidth: 0 },
  label: { textAlign: 'center', letterSpacing: 0 },
});
