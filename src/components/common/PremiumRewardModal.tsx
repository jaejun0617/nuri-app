import React, { memo, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { useOptionalSafeAreaInsets } from '../../hooks/useOptionalSafeAreaInsets';
import { buildPremiumRewardLevelStatus } from '../../services/activity/rewardNoticePresentation';
import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';
import { formatPetCopy } from '../../utils/petDisplayName';

type Props = {
  petName?: string | null;
  visible: boolean;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp?: boolean;
  streakDays?: number | null;
  title?: string;
  message?: string;
  accentColor?: string;
  onClose: () => void;
  onDismissToday?: () => void;
  roleBasedActions?: boolean;
};

const C = {
  ink: '#161331',
  muted: '#716A9C',
  accent: '#8354FF',
  track: '#E2D7FC',
  panel: 'rgba(131,84,255,0.055)',
  overlay: 'rgba(24,20,45,0.40)',
};
const COMPANION = require('../../assets/activity/growth-companion.png');
const BRAND = require('../../assets/logo/logo_v2.png');
function formatXp(value: number): string {
  return Math.max(0, value).toLocaleString('ko-KR');
}

/** Present the existing award only; checkbox changes persist through the caller on confirmation. */
function PremiumRewardModalBase({
  petName,
  visible,
  xpAwarded,
  totalXp,
  level,
  leveledUp = false,
  streakDays = null,
  title = '경험치가 예쁘게 쌓였어요',
  message = '오늘의 활동이 성장 기록에 반영됐어요.',
  onClose,
  onDismissToday,
}: Props) {
  const insets = useOptionalSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const compact = width < 360 || windowHeight < 720;
  const maxCardHeight = getResponsiveOverlayMaxHeight({
    windowHeight,
    topInset: insets.top,
    bottomInset: insets.bottom,
    verticalMargin: 20,
  });
  const [hideToday, setHideToday] = useState(false);
  useEffect(() => { if (visible) setHideToday(false); }, [visible]);
  const levelStatus = useMemo(
    () => buildPremiumRewardLevelStatus({ totalXp, level }),
    [level, totalXp],
  );
  const rewardTitle = xpAwarded > 0 ? `+${formatXp(xpAwarded)} XP` : '성장 기록 반영';
  const confirm = () => {
    if (hideToday && onDismissToday) onDismissToday();
    else onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessible={false} style={styles.scrim} onPress={onClose} />
        <View testID="reward-modal-card" accessibilityViewIsModal importantForAccessibility="yes"
          style={[styles.card, { maxHeight: maxCardHeight }]}>
          <LinearGradient pointerEvents="none" accessible={false}
            colors={['#FFFAFF', '#FFFFFF', '#FFF9FA']} locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <TouchableOpacity testID="reward-modal-close" accessibilityRole="button"
            accessibilityLabel="보상 안내 닫기" onPress={onClose} style={styles.closeButton}>
            <NuriSemanticIcon family="feather" name="x" preserveOriginal size={22} color={C.muted} accessible={false} />
          </TouchableOpacity>
          <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Image testID="reward-illustration" source={COMPANION} resizeMode="contain"
              accessible={false} style={[styles.illustration, compact && styles.illustrationCompact]} />
            <AppText preset="unifiedTitle" styleOverridesPreset accessibilityRole="header"
              style={[styles.title, compact && styles.titleCompact]}>{title}</AppText>
            <AppText preset="unifiedBody" styleOverridesPreset style={styles.message}>{message}</AppText>
            <View style={styles.awardRow}>
              <View style={styles.spark} pointerEvents="none" accessible={false}>
                <View style={styles.sparkTop} /><View style={styles.sparkBottom} />
              </View>
              <AppText testID="reward-xp-value" preset="unifiedTitle" styleOverridesPreset
                style={[styles.rewardTitle, compact && styles.rewardTitleCompact]}>{rewardTitle}</AppText>
              <View style={[styles.spark, styles.sparkRight]} pointerEvents="none" accessible={false}>
                <View style={styles.sparkTop} /><View style={styles.sparkBottom} />
              </View>
            </View>
            {leveledUp ? <AppText preset="unifiedMeta" styleOverridesPreset style={styles.levelUpText}>LEVEL UP</AppText> : null}
            <View style={styles.rewardPanel}>
              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <AppText preset="unifiedMeta" styleOverridesPreset style={styles.metricLabel}>누적 XP</AppText>
                  <AppText testID="reward-total-xp" preset="unifiedTitle" styleOverridesPreset style={styles.metricValue}>{formatXp(totalXp)}</AppText>
                </View>
                <View style={[styles.metricCard, styles.metricDivider]}>
                  <AppText preset="unifiedMeta" styleOverridesPreset style={styles.metricLabel}>현재 레벨</AppText>
                  <AppText testID="reward-current-level" preset="unifiedTitle" styleOverridesPreset style={styles.metricValue}>Lv.{levelStatus.level}</AppText>
                </View>
              </View>
              <View testID="reward-level-progress" style={styles.levelProgressTrack}
                accessibilityRole="progressbar" accessibilityLabel="현재 레벨 성장"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(levelStatus.progress * 100) }}>
                <LinearGradient colors={['#9064FF', '#7C50FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.levelProgressFill, { width: `${Math.round(levelStatus.progress * 100)}%` }]} />
              </View>
              <AppText preset="unifiedMeta" styleOverridesPreset style={styles.levelStatusText}>{levelStatus.statusLabel}</AppText>
            </View>
            {streakDays !== null && streakDays > 0 ? (
              <View style={styles.streakStrip}>
                <Image testID="reward-streak-brand" source={BRAND} resizeMode="contain" accessible={false} style={styles.brand} />
                <AppText preset="unifiedMeta" styleOverridesPreset style={styles.streakText}>
                  {formatPetCopy(`우리 아이와 ${streakDays}일 연속 산책 중이에요`, petName)}
                </AppText>
              </View>
            ) : null}
          </ScrollView>
          <TouchableOpacity testID="reward-confirm" accessibilityRole="button" accessibilityLabel="보상 안내 확인"
            onPress={confirm} style={styles.primaryButton} activeOpacity={0.85}>
            <LinearGradient pointerEvents="none" accessible={false} colors={['#8C58FF', '#7D4FFD']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <AppText preset="unifiedLabel" styleOverridesPreset style={styles.primaryButtonText}>확인</AppText>
          </TouchableOpacity>
          {onDismissToday ? (
            <TouchableOpacity testID="reward-dismiss-today" accessibilityRole="checkbox"
              accessibilityLabel="오늘 하루 보상 안내 보지 않기" accessibilityState={{ checked: hideToday }}
              style={styles.dismissTodayButton} onPress={() => setHideToday(current => !current)}>
              <View style={[styles.checkbox, hideToday && styles.checkboxChecked]}>
                {hideToday ? <NuriSemanticIcon family="feather" name="check" preserveOriginal size={13} color="#FFFFFF" accessible={false} /> : null}
              </View>
              <AppText preset="unifiedMeta" styleOverridesPreset style={styles.dismissTodayText}>오늘 하루 안 보기</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: C.overlay },
  card: {
    width: '100%', maxWidth: 420, alignSelf: 'center', borderRadius: 30,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12,
    overflow: 'hidden', flexShrink: 1,
  },
  closeButton: { position: 'absolute', top: 6, right: 6, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  cardScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0, width: '100%' },
  cardContent: { width: '100%', alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  illustration: { width: 166, height: 130 },
  illustrationCompact: { width: 140, height: 110 },
  title: { marginTop: 6, textAlign: 'center', fontSize: 22, lineHeight: 30, fontWeight: '800', letterSpacing: 0, color: C.ink },
  titleCompact: { fontSize: 20, lineHeight: 28 },
  message: { marginTop: 6, maxWidth: 280, textAlign: 'center', fontSize: 14, lineHeight: 21, fontWeight: '600', letterSpacing: 0, color: C.muted },
  awardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, maxWidth: '100%' },
  rewardTitle: { flexShrink: 1, textAlign: 'center', fontSize: 52, lineHeight: 64, fontWeight: '800', letterSpacing: 0, color: C.accent },
  rewardTitleCompact: { fontSize: 46, lineHeight: 58 },
  spark: { width: 18, height: 40, gap: 10, justifyContent: 'center' },
  sparkRight: { transform: [{ scaleX: -1 }] },
  sparkTop: { width: 14, height: 5, borderRadius: 3, backgroundColor: '#D8B5FD', transform: [{ rotate: '55deg' }], alignSelf: 'flex-end' },
  sparkBottom: { width: 12, height: 5, borderRadius: 3, backgroundColor: '#E5C7FB', transform: [{ rotate: '15deg' }] },
  levelUpText: { color: C.accent, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  rewardPanel: { width: '100%', marginTop: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.panel },
  metricRow: { flexDirection: 'row' },
  metricCard: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: '#DBCCFC' },
  metricLabel: { color: C.muted, fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 0, textAlign: 'center' },
  metricValue: { color: C.ink, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: 0, textAlign: 'center' },
  levelProgressTrack: { height: 10, borderRadius: 5, backgroundColor: C.track, overflow: 'hidden', marginTop: 12 },
  levelProgressFill: { height: '100%', borderRadius: 5 },
  levelStatusText: { color: C.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 8, letterSpacing: 0 },
  streakStrip: { width: '100%', minHeight: 36, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: C.panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  brand: { width: 23, height: 21 },
  streakText: { flexShrink: 1, color: C.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 0 },
  primaryButton: { width: '100%', minHeight: 48, marginTop: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: 0 },
  dismissTodayButton: { minHeight: 48, marginTop: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dismissTodayText: { color: C.muted, fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 0 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  checkboxChecked: { borderColor: C.accent, backgroundColor: C.accent },
});

export default memo(PremiumRewardModalBase);
