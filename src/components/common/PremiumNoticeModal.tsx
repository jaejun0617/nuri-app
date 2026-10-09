import React, { memo, useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import type { CtaRole } from '../../app/theme/ctaPalette';
import { useOptionalSafeAreaInsets } from '../../hooks/useOptionalSafeAreaInsets';
import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';
import { NEUTRAL_UI_PALETTE } from '../../services/pets/themePalette';


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
  typographyMode?: 'legacy' | 'unified';
  confirmRole?: CtaRole;
};

function withoutDecorativeEmoji(line: string) {
  return line
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toAccessibilityText(lines: readonly string[]) {
  return lines.map(withoutDecorativeEmoji).filter(Boolean).join(' ');
}

function PremiumNoticeModalBase({
  visible,
  eyebrow,
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
  typographyMode = 'legacy',
  confirmRole,
}: Props) {
  const theme = useTheme();
  const insets = useOptionalSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxCardHeight = getResponsiveOverlayMaxHeight({
    windowHeight,
    topInset: insets.top,
    bottomInset: insets.bottom,
    verticalMargin: 20,
  });


  const petTheme = NEUTRAL_UI_PALETTE;
  const primaryColor = accentColor ?? petTheme.primary;
  const textPresets =
    typographyMode === 'unified'
      ? {
          eyebrow: 'unifiedBody' as const,
          title: 'unifiedTitle' as const,
          body: 'unifiedBody' as const,
          button: 'unifiedLabel' as const,
        }
      : {
          eyebrow: 'caption' as const,
          title: 'title2' as const,
          body: 'body' as const,
          button: 'button' as const,
        };
  const handleConfirm = onConfirm ?? onClose;
  const announcementText = useMemo(() => {
    const titleText = toAccessibilityText(
      accessibilityTitleLines ?? titleLines,
    );
    const bodyText = toAccessibilityText(accessibilityBodyLines ?? bodyLines);
    return [titleText, bodyText].filter(Boolean).join('. ');
  }, [accessibilityBodyLines, accessibilityTitleLines, bodyLines, titleLines]);
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
              maxHeight: maxCardHeight,
            },
          ]}
        >
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            <AppText
              preset={textPresets.eyebrow}
              style={[styles.eyebrow, { color: primaryColor }]}
            >
              {eyebrow}
            </AppText>

            <View style={styles.copyBlock}>
              {titleLines.map((line, index) => (
                <AppText
                  typographyRole="celebration"
                  key={`title-${line}-${index}`}
                  preset={textPresets.title}
                  style={[styles.title, { color: theme.colors.textPrimary }]}
                >
                  {withoutDecorativeEmoji(line)}
                </AppText>
              ))}
            </View>

            <View style={styles.copyBlock}>
              {bodyLines.map((line, index) => (
                <AppText
                  key={`body-${line}-${index}`}
                  preset={textPresets.body}
                  style={[styles.body, { color: theme.colors.textSecondary }]}
                >
                  {withoutDecorativeEmoji(line)}
                </AppText>
              ))}
            </View>

            {confirmRole ? (
              <CtaButton
                role={confirmRole}
                onPress={handleConfirm}
                accessibilityLabel={confirmAccessibilityLabel ?? confirmLabel}
                accessibilityHint={confirmAccessibilityHint}
                style={styles.button}
              >
                <CtaText preset={textPresets.button} style={styles.buttonText}>
                  {confirmLabel}
                </CtaText>
              </CtaButton>
            ) : (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={handleConfirm}
                accessibilityRole="button"
                accessibilityLabel={confirmAccessibilityLabel ?? confirmLabel}
                accessibilityHint={confirmAccessibilityHint}
                style={[styles.button, { backgroundColor: primaryColor }]}
              >
                <AppText preset={textPresets.button} style={styles.buttonText}>
                  {confirmLabel}
                </AppText>
              </TouchableOpacity>
            )}

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
                      preset={textPresets.button}
                      style={[
                        styles.secondaryButtonText,
                        { color: primaryColor },
                      ]}
                    >
                      {action.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>
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
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
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
  cardScroll: { flexGrow: 0, width: '100%' },
  cardContent: { width: '100%', alignItems: 'center' },
  eyebrow: {
    marginTop: 0,
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 11,
    lineHeight: 15,
  },
  copyBlock: {
    marginTop: 8,
    width: '100%',
    gap: 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 29,
    letterSpacing: -0.2,
  },
  body: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    marginTop: 18,
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
    fontSize: 15,
    lineHeight: 20,
  },
});

const PremiumNoticeModal = memo(PremiumNoticeModalBase);

export default PremiumNoticeModal;
