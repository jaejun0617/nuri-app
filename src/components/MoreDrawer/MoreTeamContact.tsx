import React, { useEffect, useRef, useState } from 'react';
import { Clipboard, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import { typography } from '../../app/theme/tokens/typography';
import { SUPPORT_EMAIL } from '../../config/supportContact';
import Feather from '../icons/NuriFeatherIcon';
import { MORE_MENU } from './moreMenuVisualTokens';

const contactPurpose = '서비스 이용 및 협업·제휴 문의';

export default function MoreTeamContact() {
  const { colors } = useTheme();
  const [feedback, setFeedback] = useState<'copied' | 'failed' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function copyAddress() {
    if (timer.current !== null) clearTimeout(timer.current);
    try {
      Clipboard.setString(SUPPORT_EMAIL);
      setFeedback('copied');
    } catch {
      setFeedback('failed');
    }
    timer.current = setTimeout(() => setFeedback(null), 2500);
  }

  const status = feedback === 'copied' ? '이메일 주소를 복사했어요'
    : feedback === 'failed' ? '복사하지 못했어요. 다시 눌러 주세요.' : null;
  return (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${contactPurpose}, 이메일 주소 복사, ${SUPPORT_EMAIL}`}
        accessibilityValue={status ? { text: status } : undefined}
        accessibilityLiveRegion="polite"
        onPress={copyAddress}
        style={({ pressed }) => [styles.copyTarget, pressed && styles.pressed]}
      >
        <AppText preset="caption" align="center" color={colors.textSecondary} style={styles.finePrint}>
          {status ?? contactPurpose}
        </AppText>
        <View style={styles.row}>
          <AppText preset="secondary" align="center" weight="600" color={colors.textPrimary} style={styles.address}>
            {SUPPORT_EMAIL}
          </AppText>
          <Feather name={feedback === 'copied' ? 'check' : 'copy'} size={14} color={colors.textSecondary} accessible={false} />
        </View>
      </Pressable>
      <AppText preset="caption" align="center" color={colors.textSecondary} style={styles.finePrint}>
        Copyright © 펫누리
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 3 },
  finePrint: { fontSize: typography.size.xs, lineHeight: 16 },
  copyTarget: {
    minHeight: MORE_MENU.toolTarget,
    justifyContent: 'flex-end',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  address: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
