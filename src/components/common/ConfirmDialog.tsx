import React, { memo, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';

type ConfirmDialogTone = 'default' | 'warning' | 'danger';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  accentColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function withHexAlpha(color: string, alpha: number, fallback: string) {
  const normalized = color.trim();
  const match = normalized.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return fallback;

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function resolveToneMeta(
  tone: ConfirmDialogTone,
  accentColor: string,
  accentSoftColor: string,
  danger: string,
) {
  if (tone === 'danger') {
    return {
      icon: 'alert-triangle' as const,
      iconColor: danger,
      iconBackground: withHexAlpha(danger, 0.12, 'rgba(255, 77, 79, 0.12)'),
      confirmBackground: danger,
      confirmText: '#FFFFFF',
      cancelBackground: '#F3F5FA',
      cancelText: '#556070',
    };
  }

  if (tone === 'warning') {
    return {
      icon: 'bell' as const,
      iconColor: accentColor,
      iconBackground: accentSoftColor,
      confirmBackground: accentColor,
      confirmText: '#FFFFFF',
      cancelBackground: '#F3F5FA',
      cancelText: '#556070',
    };
  }

  return {
    icon: 'check-circle' as const,
    iconColor: accentColor,
    iconBackground: accentSoftColor,
    confirmBackground: accentColor,
    confirmText: '#FFFFFF',
    cancelBackground: '#F3F5FA',
    cancelText: '#556070',
  };
}

function ConfirmDialogBase({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  tone = 'default',
  accentColor,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor ?? theme.colors.brand),
    [selectedPet?.themeColor, theme.colors.brand],
  );
  const resolvedAccentColor = accentColor ?? petTheme.primary;
  const lines = useMemo(() => message.split('\n'), [message]);
  const toneMeta = useMemo(
    () =>
      resolveToneMeta(
        tone,
        resolvedAccentColor,
        petTheme.soft,
        theme.colors.danger,
      ),
    [petTheme.soft, resolvedAccentColor, theme.colors.danger, tone],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={styles.scrim} onPress={onCancel} />
        <View
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
              styles.iconWrap,
              { backgroundColor: toneMeta.iconBackground },
            ]}
          >
            <Feather name={toneMeta.icon} size={20} color={toneMeta.iconColor} />
          </View>

          <View style={styles.copyBlock}>
            <AppText preset="headline" style={[styles.title, { color: theme.colors.textPrimary }]}>
              {title}
            </AppText>

            <View style={styles.messageBlock}>
              {lines.map((line, index) =>
                line.trim().length > 0 ? (
                  <AppText
                    key={`${line}-${index}`}
                    preset="bodySm"
                    style={[styles.message, { color: theme.colors.textSecondary }]}
                  >
                    {line}
                  </AppText>
                ) : (
                  <View key={`spacer-${index}`} style={styles.messageSpacer} />
                ),
              )}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: toneMeta.cancelBackground },
              ]}
              onPress={onCancel}
            >
              <AppText preset="button" style={[styles.cancelButtonText, { color: toneMeta.cancelText }]}>
                {cancelLabel}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: toneMeta.confirmBackground },
              ]}
              onPress={onConfirm}
            >
              <AppText preset="button" style={[styles.confirmButtonText, { color: toneMeta.confirmText }]}>
                {confirmLabel}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 16,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000000',
          shadowOpacity: 0.14,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
        }
      : {
          elevation: 6,
        }),
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: {
    gap: 10,
  },
  title: {
    fontWeight: '900',
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  messageBlock: {
    gap: 6,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  messageSpacer: {
    height: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelButton: {},
  confirmButton: {},
  cancelButtonText: {
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 20,
  },
  confirmButtonText: {
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 20,
  },
});

const ConfirmDialog = memo(ConfirmDialogBase);

export default ConfirmDialog;
