import React, { memo, useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
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

type NoticeIconName = 'check' | 'shield' | 'user-plus';

type SecondaryAction = {
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  eyebrow: string;
  iconName: NoticeIconName;
  titleLines: readonly string[];
  bodyLines: readonly string[];
  accessibilityTitleLines?: readonly string[];
  accessibilityBodyLines?: readonly string[];
  confirmLabel?: string;
  confirmAccessibilityLabel?: string;
  confirmAccessibilityHint?: string;
  accentColor?: string;
  secondaryActions?: readonly SecondaryAction[];
  onClose: () => void;
  onConfirm?: () => void;
};

function toAccessibilityText(lines: readonly string[]) {
  return lines
    .map(line =>
      line
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/\uFE0F/gu, '')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join(' ');
}

function PremiumNoticeModalBase({
  visible,
  eyebrow,
  iconName,
  titleLines,
  bodyLines,
  accessibilityTitleLines,
  accessibilityBodyLines,
  confirmLabel = '확인',
  confirmAccessibilityLabel,
  confirmAccessibilityHint = '두 번 탭하면 안내를 닫습니다.',
  accentColor,
  secondaryActions,
  onClose,
  onConfirm,
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
  const primaryColor = accentColor ?? petTheme.primary;
  const handleConfirm = onConfirm ?? onClose;
  const announcementText = useMemo(() => {
    const titleText = toAccessibilityText(accessibilityTitleLines ?? titleLines);
    const bodyText = toAccessibilityText(accessibilityBodyLines ?? bodyLines);
    return [titleText, bodyText].filter(Boolean).join('. ');
  }, [accessibilityBodyLines, accessibilityTitleLines, bodyLines, titleLines]);
  const iconWrapStyle = useMemo(
    () => [
      styles.iconWrap,
      {
        backgroundColor: petTheme.soft,
        borderColor: petTheme.border,
      },
    ],
    [petTheme.border, petTheme.soft],
  );

  useEffect(() => {
    if (!visible || !announcementText) return;

    const timeout = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(announcementText);
    }, 220);

    return () => {
      clearTimeout(timeout);
    };
  }, [announcementText, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessible={false}
          style={[styles.scrim, { backgroundColor: theme.colors.overlay }]}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          accessible
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.halo}>
            <View style={iconWrapStyle}>
              <View
                style={[
                  styles.iconCore,
                  { backgroundColor: primaryColor },
                ]}
              >
                <Feather name={iconName as never} size={26} color="#FFF8EE" />
              </View>
            </View>
          </View>

          <AppText
            preset="caption"
            style={[styles.eyebrow, { color: primaryColor }]}
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
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmAccessibilityLabel ?? confirmLabel}
            accessibilityHint={confirmAccessibilityHint}
            style={[styles.button, { backgroundColor: primaryColor }]}
          >
            <AppText preset="button" style={styles.buttonText}>
              {confirmLabel}
            </AppText>
          </TouchableOpacity>

          {secondaryActions && secondaryActions.length > 0 ? (
            <View style={styles.secondaryRow}>
              {secondaryActions.map(action => (
                <TouchableOpacity
                  key={action.label}
                  activeOpacity={0.88}
                  onPress={action.onPress}
                  style={[
                    styles.secondaryButton,
                    {
                      borderColor: petTheme.border,
                      backgroundColor: petTheme.soft,
                    },
                  ]}
                >
                  <AppText
                    preset="button"
                    style={[styles.secondaryButtonText, { color: primaryColor }]}
                  >
                    {action.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
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
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#171B25',
          shadowOpacity: 0.24,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
        }
      : {
          elevation: 12,
        }),
  },
  halo: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCore: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    marginTop: 18,
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 11,
    lineHeight: 15,
  },
  copyBlock: {
    marginTop: 8,
    width: '100%',
    gap: 2,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  body: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    marginTop: 22,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF8EE',
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 20,
  },
  secondaryRow: {
    width: '100%',
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
});

const PremiumNoticeModal = memo(PremiumNoticeModalBase);

export default PremiumNoticeModal;
