// 파일: src/services/activity/rewardNoticePresentation.ts
// 역할:
// - PremiumRewardModal의 레벨/XP 표시 문구를 레벨 정책과 동일하게 계산한다.
// - Lv.30 이상 max 상태에서 음수/NaN/Infinity progress가 노출되지 않도록 고정한다.

import {
  LEVEL_THRESHOLDS,
  calculateLevel,
  getLevelFloorXp,
  getNextLevelXp,
  getProgressWithinLevel,
} from './progressPolicy';

export type PremiumRewardLevelStatus = {
  level: number;
  isMaxLevel: boolean;
  progress: number;
  statusLabel: string;
};

function formatXp(value: number): string {
  return Math.max(0, value).toLocaleString('ko-KR');
}

function toSafeInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.floor(value);
}

export function buildPremiumRewardLevelStatus(input: {
  totalXp: number;
  level: number;
}): PremiumRewardLevelStatus {
  const maxLevel = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]?.level ?? 30;
  const safeTotalXp = Math.max(0, toSafeInteger(input.totalXp, 0));
  const policyLevel = calculateLevel(safeTotalXp);
  const propLevel = Math.max(1, toSafeInteger(input.level, policyLevel));
  const level = Math.min(maxLevel, Math.max(propLevel, policyLevel));
  const isMaxLevel = level >= maxLevel;
  const floorXp = getLevelFloorXp(level);
  const nextLevelXp = getNextLevelXp(level);
  const progress = isMaxLevel
    ? 1
    : getProgressWithinLevel({
        totalXp: safeTotalXp,
        level,
        currentLevelXp: floorXp,
        nextLevelXp,
      });
  const remainingXp = isMaxLevel
    ? 0
    : Math.max(0, nextLevelXp - safeTotalXp);

  return {
    level,
    isMaxLevel,
    progress,
    statusLabel: isMaxLevel
      ? '최고 레벨 달성'
      : `다음 레벨까지 ${formatXp(remainingXp)} XP`,
  };
}
