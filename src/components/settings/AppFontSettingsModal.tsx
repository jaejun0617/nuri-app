import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import { useAppFontPreference } from '../../app/providers/AppFontPreferenceProvider';
import {
  APP_FONT_MODES,
  getAppFontModeLabel,
  type AppFontMode,
} from '../../app/typography/appFontMode';
import AppText from '../../app/ui/AppText';
import { captureMonitoringException } from '../../services/monitoring/sentry';
import { showToast } from '../../store/uiStore';

type Props = {
  visible: boolean;
  bottomInset: number;
  onClose: () => void;
};

const PREVIEW_COPY: Record<AppFontMode, string> = {
  jisu: '우리 아이와 함께한 오늘을 기록해요',
  pretendard: '우리 아이와 함께한 오늘을 기록해요',
};

const JISU_FONT_CREDIT = 'Copyright: 인성아이티 / 글씨 제공자 클로이';

function AppFontSettingsModalComponent({
  visible,
  bottomInset,
  onClose,
}: Props) {
  const theme = useTheme();
  const { mode, setMode } = useAppFontPreference();
  const [savingMode, setSavingMode] = useState<AppFontMode | null>(null);

  const selectMode = useCallback(
    async (nextMode: AppFontMode) => {
      if (savingMode || nextMode === mode) return;

      setSavingMode(nextMode);
      try {
        await setMode(nextMode);
      } catch (error) {
        captureMonitoringException(error);
        showToast({
          tone: 'error',
          title: '글꼴을 변경하지 못했어요',
          message: '잠시 후 다시 시도해 주세요.',
        });
      } finally {
        setSavingMode(null);
      }
    },
    [mode, savingMode, setMode],
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              paddingBottom: Math.max(bottomInset + 18, 26),
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <AppText
                accessibilityRole="header"
                preset="unifiedTitle"
                style={[styles.title, { color: theme.colors.textPrimary }]}
              >
                앱 글꼴
              </AppText>
              <AppText
                preset="unifiedBody"
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              >
                NURI에서 사용할 글꼴을 선택해 주세요.
              </AppText>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="앱 글꼴 설정 닫기"
              activeOpacity={0.85}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={onClose}
              style={[styles.close, { backgroundColor: theme.colors.surface }]}
            >
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {APP_FONT_MODES.map(optionMode => {
              const selected = optionMode === mode;
              const saving = savingMode === optionMode;
              return (
                <TouchableOpacity
                  key={optionMode}
                  testID={`app-font-option-${optionMode}`}
                  accessibilityRole="radio"
                  accessibilityLabel={`${getAppFontModeLabel(optionMode)} 글꼴`}
                  accessibilityState={{ checked: selected, busy: saving }}
                  activeOpacity={0.88}
                  disabled={savingMode !== null}
                  onPress={() => {
                    selectMode(optionMode).catch(() => {});
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected
                        ? theme.colors.brand
                        : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.surface
                        : theme.colors.surfaceElevated,
                    },
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <AppText
                      fontModeOverride={optionMode}
                      preset="unifiedTitle"
                      style={[
                        styles.optionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {getAppFontModeLabel(optionMode)}
                    </AppText>
                    <AppText
                      fontModeOverride={optionMode}
                      preset="unifiedBody"
                      style={[
                        styles.preview,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {PREVIEW_COPY[optionMode]}
                    </AppText>
                  </View>
                  {saving ? (
                    <ActivityIndicator color={theme.colors.brand} />
                  ) : (
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected
                            ? theme.colors.brand
                            : theme.colors.border,
                        },
                        selected
                          ? { backgroundColor: theme.colors.brand }
                          : null,
                      ]}
                    >
                      {selected ? (
                        <Feather name="check" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[styles.license, { borderTopColor: theme.colors.border }]}
          >
            <AppText
              preset="unifiedMicro"
              style={[styles.licenseText, { color: theme.colors.textMuted }]}
            >
              인성아이티 귀염발랄체 jisu{`\n`}
              {JISU_FONT_CREDIT}
            </AppText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const AppFontSettingsModal = memo(AppFontSettingsModalComponent);
export default AppFontSettingsModal;

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 18,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  title: { fontSize: 20, lineHeight: 26 },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: { gap: 10 },
  option: {
    minHeight: 76,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 17, lineHeight: 22 },
  preview: { fontSize: 13, lineHeight: 18 },
  radio: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  license: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  licenseText: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
