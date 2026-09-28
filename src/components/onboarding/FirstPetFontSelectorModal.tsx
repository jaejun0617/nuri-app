import React, { memo } from 'react';
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

import AppText from '../../app/ui/AppText';
import {
  APP_FONT_MODES,
  getAppFontModeLabel,
  type AppFontMode,
} from '../../app/typography/appFontMode';

type Props = {
  visible: boolean;
  selectedMode: AppFontMode;
  saving: boolean;
  onSelect: (mode: AppFontMode) => void;
  onConfirm: () => void;
};

const HELPER_BY_MODE: Record<AppFontMode, string> = {
  jisu: 'NURI를 더 귀엽고 따뜻한 분위기로 즐겨보세요.',
  pretendard: '깔끔하고 편안한 기본 글꼴로 사용할 수 있어요.',
};

function FirstPetFontSelectorModalComponent({
  visible,
  selectedMode,
  saving,
  onSelect,
  onConfirm,
}: Props) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      >
        <Pressable accessibilityRole="none" style={StyleSheet.absoluteFill} />
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.heading}>
            <AppText
              accessibilityRole="header"
              fontModeOverride={selectedMode}
              preset="unifiedTitle"
              style={[styles.title, { color: theme.colors.textPrimary }]}
            >
              어떤 분위기의 NURI가 좋으세요?
            </AppText>
            <AppText
              fontModeOverride={selectedMode}
              preset="unifiedBody"
              style={[
                styles.description,
                { color: theme.colors.textSecondary },
              ]}
            >
              마음에 드는 글꼴을 선택해보세요.
            </AppText>
          </View>

          <View style={styles.options}>
            {APP_FONT_MODES.map(mode => {
              const selected = selectedMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityLabel={`${getAppFontModeLabel(mode)} 선택`}
                  accessibilityState={{ checked: selected, disabled: saving }}
                  activeOpacity={0.88}
                  disabled={saving}
                  onPress={() => onSelect(mode)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected
                        ? theme.colors.surface
                        : theme.colors.surfaceElevated,
                      borderColor: selected
                        ? theme.colors.brand
                        : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <AppText
                      fontModeOverride={mode}
                      preset="unifiedTitle"
                      style={[
                        styles.optionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {getAppFontModeLabel(mode)}
                    </AppText>
                    <AppText
                      fontModeOverride={mode}
                      preset="unifiedBody"
                      style={[
                        styles.optionHelper,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {HELPER_BY_MODE[mode]}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected
                          ? theme.colors.brand
                          : theme.colors.border,
                      },
                      selected ? { backgroundColor: theme.colors.brand } : null,
                    ]}
                  >
                    {selected ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText
            fontModeOverride={selectedMode}
            preset="unifiedMicro"
            style={[styles.note, { color: theme.colors.textMuted }]}
          >
            글꼴은 전체메뉴 &gt; 앱 서비스 설정에서 언제든 다시 변경할 수
            있어요.
          </AppText>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${getAppFontModeLabel(selectedMode)}으로 시작`}
            accessibilityState={{ busy: saving, disabled: saving }}
            activeOpacity={0.9}
            disabled={saving}
            onPress={onConfirm}
            style={[
              styles.confirmButton,
              { backgroundColor: theme.colors.brand },
              saving ? styles.disabled : null,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText
                fontModeOverride={selectedMode}
                preset="unifiedLabel"
                style={styles.confirmLabel}
              >
                이 글꼴로 시작하기
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const FirstPetFontSelectorModal = memo(FirstPetFontSelectorModalComponent);

export default FirstPetFontSelectorModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: '#2C1B46',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heading: { gap: 6 },
  title: { fontSize: 21, lineHeight: 28, textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  options: { gap: 10 },
  option: {
    minHeight: 78,
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
  optionHelper: { fontSize: 12, lineHeight: 18 },
  radio: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  confirmButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  confirmLabel: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  disabled: { opacity: 0.56 },
});
