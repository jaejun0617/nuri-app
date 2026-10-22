import type { ImageSourcePropType, TextStyle } from 'react-native';
import type { ActivityRankingBar, ActivityRankingCategoryKey } from '../../services/ranking/activityRanking';

export type RankingTab = Exclude<ActivityRankingCategoryKey, 'grooming'>;
export type RankingDisplayRow = ActivityRankingBar & { avatarSource?: ImageSourcePropType };

/** PO's latest instruction supersedes the initial activity-size mapping. */
export const RANKING_TYPOGRAPHY = {
  title: { fontSize: 20, lineHeight: 30, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 24 },
  tab: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  section: { fontSize: 22, lineHeight: 32, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 24 },
  label: { fontSize: 12, lineHeight: 20 },
  name: { fontSize: 15, lineHeight: 24, fontWeight: '700' },
  number: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  rank: { fontSize: 18, lineHeight: 28, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export const RANKING_TABS: ReadonlyArray<{
  key: RankingTab;
  label: string;
  title: string;
  helper: string;
  column: string;
  footer: string | null;
}> = [
  { key: 'overall', label: '종합', title: '종합 TOP 10', helper: '산책·글·댓글 등 모든 활동의 누적 XP', column: '누적 XP', footer: null },
  { key: 'walk', label: '산책', title: '산책 랭킹', helper: '산책 XP 기준', column: '산책 XP', footer: '함께 걸은 순간이 차곡차곡 쌓여요' },
  { key: 'posts', label: '글', title: '글 랭킹', helper: '타임라인·커뮤니티 글 수', column: '작성한 글', footer: '함께한 이야기가 오래 남도록' },
  { key: 'comments', label: '댓글', title: '댓글 랭킹', helper: '댓글 활동 수', column: '남긴 댓글', footer: '다정한 한마디가 서로에게 힘이 돼요' },
  { key: 'health', label: '건강', title: '건강 랭킹', helper: '건강 기록 수', column: '건강 기록', footer: '꾸준한 돌봄의 순간을 기록해요' },
  { key: 'life', label: '생활', title: '생활 랭킹', helper: '생활 기록 수', column: '생활 기록', footer: '평범한 하루도 특별한 추억이 돼요' },
];

export const RANKING_COLORS = {
  background: '#FAF9FE', ink: '#17132D', muted: '#827C9F', accent: '#8258DF',
  border: '#E9E2FA', highlight: '#F3EEFD', track: '#E9E6F2',
  surface: 'rgba(255,255,255,0.70)',
};
