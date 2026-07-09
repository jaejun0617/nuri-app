// 파일: src/components/common/PremiumRewardModal.tsx
// 역할:
// - XP/포인트 획득 결과를 NURI 톤의 프리미엄 모달로 표시한다.
// - 서버 XP 계약은 변경하지 않고, write-path가 받은 AwardXpResult만 presentation으로 보여준다.

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

type Props = {
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
};

function formatXp(value: number): string {
  return Math.max(0, value).toLocaleString('ko-KR');
}

function PremiumRewardModalBase({
  visible,
  xpAwarded,
  totalXp,
  level,
  leveledUp = false,
  streakDays = null,
  title = '경험치가 예쁘게 쌓였어요',
  message = '오늘의 활동이 성장 기록에 반영됐어요.',
  accentColor,
  onClose,
  onDismissToday,
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
  const safeLevel = Math.max(1, level);
  const safeAwarded = Math.max(0, xpAwarded);
  const hasXpAward = safeAwarded > 0;
  const rewardTitle = hasXpAward
    ? `+${formatXp(safeAwarded)} XP`
    : '성장 기록 반영';

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
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="보상 안내 닫기"
            style={[styles.closeButton, { backgroundColor: petTheme.soft }]}
            onPress={onClose}
          >
            <Feather name="x" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.halo, { backgroundColor: petTheme.soft }]}>
            <View
              style={[
                styles.iconCore,
                {
                  backgroundColor: primaryColor,
                  borderColor: petTheme.border,
                },
              ]}
            >
              <Feather name={leveledUp ? 'award' : 'star'} size={28} color="#FFF8EE" />
            </View>
          </View>

          <AppText preset="caption" style={[styles.eyebrow, { color: primaryColor }]}>
            NURI REWARD
          </AppText>
          <AppText preset="title2" style={[styles.title, { color: theme.colors.textPrimary }]}>
            {title}
          </AppText>
          <AppText preset="body" style={[styles.message, { color: theme.colors.textSecondary }]}>
            {message}
          </AppText>

          <View style={[styles.rewardPanel, { backgroundColor: petTheme.soft }]}>
            <View style={styles.rewardHeader}>
              <AppText preset="headline" style={[styles.rewardTitle, { color: primaryColor }]}>
                {rewardTitle}
              </AppText>
              {leveledUp ? (
                <View style={[styles.levelUpPill, { backgroundColor: primaryColor }]}>
                  <AppText preset="caption" style={styles.levelUpText}>
                    LEVEL UP
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.colors.surfaceElevated }]}>
                <AppText preset="caption" style={styles.metricLabel}>
                  누적 XP
                </AppText>
                <AppText preset="headline" style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                  {formatXp(totalXp)}
                </AppText>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.colors.surfaceElevated }]}>
                <AppText preset="caption" style={styles.metricLabel}>
                  현재 레벨
                </AppText>
                <AppText preset="headline" style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                  Lv.{safeLevel}
                </AppText>
              </View>
            </View>
          </View>

          {streakDays && streakDays > 0 ? (
            <View
              style={[
                styles.streakStrip,
                {
                  borderColor: petTheme.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Feather name="heart" size={15} color={primaryColor} />
              <AppText preset="caption" style={[styles.streakText, { color: theme.colors.textSecondary }]}>
                우리 아이와 {streakDays}일 연속 산책 중이에요
              </AppText>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel="보상 안내 닫기"
            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
            onPress={onClose}
          >
            <AppText preset="button" style={styles.primaryButtonText}>
              닫기
            </AppText>
          </TouchableOpacity>

          {onDismissToday ? (
            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="오늘 하루 보상 안내 보지 않기"
              style={styles.dismissTodayButton}
              onPress={onDismissToday}
            >
              <AppText preset="caption" style={[styles.dismissTodayText, { color: theme.colors.textMuted }]}>
                오늘 하루 안 보기
              </AppText>
            </TouchableOpacity>
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
    paddingHorizontal: 22,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#121826',
          shadowOpacity: 0.24,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 16 },
        }
      : {
          elevation: 13,
        }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  halo: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: 0,
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
  },
  rewardPanel: {
    width: '100%',
    marginTop: 18,
    borderRadius: 24,
    padding: 16,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rewardTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  levelUpPill: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpText: {
    color: '#FFF8EE',
    fontWeight: '900',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0,
  },
  metricRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  metricLabel: {
    color: '#7B8494',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  metricValue: {
    marginTop: 4,
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0,
  },
  streakStrip: {
    width: '100%',
    marginTop: 12,
    minHeight: 40,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  streakText: {
    flexShrink: 1,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  primaryButton: {
    width: '100%',
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF8EE',
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
  dismissTodayButton: {
    marginTop: 12,
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissTodayText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

const PremiumRewardModal = memo(PremiumRewardModalBase);

export default PremiumRewardModal;
