import React, { memo, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { shouldStackCtaPair, type CtaRole } from '../../app/theme/ctaPalette';
import { useOptionalSafeAreaInsets } from '../../hooks/useOptionalSafeAreaInsets';
import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';
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
  children?: React.ReactNode;
  hideActions?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  typographyMode?: 'legacy' | 'unified';
  keyboardAware?: boolean;
  embedded?: boolean;
  confirmRole?: CtaRole;
  cancelRole?: CtaRole;
  confirmLoading?: boolean;
};

function resolveToneMeta(
  tone: ConfirmDialogTone,
  accentColor: string,
  danger: string,
) {
  if (tone === 'danger') {
    return {
      confirmBackground: danger,
      confirmText: '#FFFFFF',
      cancelBackground: '#F3F5FA',
      cancelText: '#556070',
    };
  }

  if (tone === 'warning') {
    return {
      confirmBackground: accentColor,
      confirmText: '#FFFFFF',
      cancelBackground: '#F3F5FA',
      cancelText: '#556070',
    };
  }

  return {
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
  children,
  hideActions = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  typographyMode = 'legacy',
  keyboardAware = false,
  embedded = false,
  confirmRole,
  cancelRole,
  confirmLoading = false,
}: Props) {
  const theme = useTheme();
  const insets = useOptionalSafeAreaInsets();
  const { height: windowHeight, width, fontScale } = useWindowDimensions();
  const stackActions =
    Boolean(confirmRole || cancelRole) && shouldStackCtaPair(width, fontScale);
  const maxCardHeight = getResponsiveOverlayMaxHeight({
    windowHeight,
    topInset: insets.top,
    bottomInset: insets.bottom,
    verticalMargin: 20,
  });
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectedPet = useMemo(
    () =>
      pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor ?? theme.colors.brand),
    [selectedPet?.themeColor, theme.colors.brand],
  );
  const resolvedAccentColor = accentColor ?? petTheme.primary;
  const textPresets =
    typographyMode === 'unified'
      ? {
          title: 'unifiedTitle' as const,
          body: 'unifiedBody' as const,
          button: 'unifiedLabel' as const,
        }
      : {
          title: 'headline' as const,
          body: 'bodySm' as const,
          button: 'button' as const,
        };
  const lines = useMemo(() => message.split('\n'), [message]);
  const toneMeta = useMemo(
    () => resolveToneMeta(tone, resolvedAccentColor, theme.colors.danger),
    [resolvedAccentColor, theme.colors.danger, tone],
  );

  const content = (
    <KeyboardControllerAvoidingView
      style={[
        styles.backdrop,
        embedded ? StyleSheet.absoluteFill : null,
        { backgroundColor: theme.colors.overlay },
      ]}
      behavior={embedded ? 'height' : 'padding'}
      enabled={keyboardAware}
      automaticOffset
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <Pressable style={styles.scrim} onPress={onCancel} />
      <View
        testID="confirm-dialog-card"
        accessibilityViewIsModal
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.copyBlock}>
            <AppText
              preset={textPresets.title}
              style={[
                styles.title,
                children ? styles.richTextAlignment : null,
                { color: theme.colors.textPrimary },
              ]}
            >
              {title}
            </AppText>

            <View style={styles.messageBlock}>
              {lines.map((line, index) =>
                line.trim().length > 0 ? (
                  <AppText
                    key={`${line}-${index}`}
                    preset={textPresets.body}
                    style={[
                      styles.message,
                      children ? styles.richTextAlignment : null,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {line}
                  </AppText>
                ) : (
                  <View key={`spacer-${index}`} style={styles.messageSpacer} />
                ),
              )}
            </View>
          </View>

          {children ? (
            <View style={styles.extraContent}>{children}</View>
          ) : null}
        </ScrollView>
        {!hideActions ? (
          <View
            testID="confirm-dialog-actions"
            style={[
              styles.buttonRow,
              stackActions && { flexDirection: 'column' },
            ]}
          >
            {cancelRole ? (
              <CtaButton
                testID="confirm-dialog-cancel"
                role={cancelRole}
                accessibilityLabel={cancelLabel}
                style={[
                  styles.button,
                  styles.cancelButton,
                  stackActions && { flex: 0, width: '100%' },
                ]}
                onPress={onCancel}
              >
                <CtaText
                  preset={textPresets.button}
                  style={styles.cancelButtonText}
                >
                  {cancelLabel}
                </CtaText>
              </CtaButton>
            ) : (
              <TouchableOpacity
                testID="confirm-dialog-cancel"
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                activeOpacity={0.9}
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: toneMeta.cancelBackground },
                ]}
                onPress={onCancel}
              >
                <AppText
                  preset={textPresets.button}
                  style={[
                    styles.cancelButtonText,
                    { color: toneMeta.cancelText },
                  ]}
                >
                  {cancelLabel}
                </AppText>
              </TouchableOpacity>
            )}

            {confirmRole ? (
              <CtaButton
                testID="confirm-dialog-confirm"
                role={confirmRole}
                loading={confirmLoading}
                disabled={confirmDisabled}
                accessibilityLabel={confirmLabel}
                style={[
                  styles.button,
                  styles.confirmButton,
                  stackActions && { flex: 0, width: '100%' },
                ]}
                onPress={onConfirm}
              >
                <CtaText
                  preset={textPresets.button}
                  style={styles.confirmButtonText}
                >
                  {confirmLabel}
                </CtaText>
              </CtaButton>
            ) : (
              <TouchableOpacity
                testID="confirm-dialog-confirm"
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                activeOpacity={0.9}
                disabled={confirmDisabled}
                style={[
                  styles.button,
                  styles.confirmButton,
                  {
                    backgroundColor: toneMeta.confirmBackground,
                    opacity: confirmDisabled ? 0.45 : 1,
                  },
                ]}
                onPress={onConfirm}
              >
                <AppText
                  preset={textPresets.button}
                  style={[
                    styles.confirmButtonText,
                    { color: toneMeta.confirmText },
                  ]}
                >
                  {confirmLabel}
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </KeyboardControllerAvoidingView>
  );
  // Native sheets can own confirmation without stacking another Android window.
  if (embedded) return visible ? content : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {content}
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
    flexShrink: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
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
  cardScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0, width: '100%' },
  cardContent: { gap: 18, paddingBottom: 18 },
  copyBlock: {
    gap: 8,
  },
  title: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  messageBlock: {
    gap: 6,
  },
  message: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  richTextAlignment: {
    textAlign: 'left',
  },
  messageSpacer: {
    height: 10,
  },
  extraContent: {
    gap: 8,
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
