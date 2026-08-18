import { clearHomeCommunityHighlightsCache } from '../home/communityHighlights';
import { supabase } from './client';
import type { CommunityBlockedUser } from '../../types/community';

export type CommunityBlockErrorCode =
  | 'SELF_BLOCK'
  | 'ALREADY_BLOCKED'
  | 'NOT_BLOCKED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'UNKNOWN';

export class CommunityBlockError extends Error {
  readonly code: CommunityBlockErrorCode;

  constructor(code: CommunityBlockErrorCode) {
    super(code);
    this.name = 'CommunityBlockError';
    this.code = code;
  }
}

type BlockRow = {
  blocked_user_id: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  nickname_confirmed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorCode(error: unknown): string | null {
  if (!isRecord(error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

function mapBlockError(error: unknown): CommunityBlockError {
  const code = getErrorCode(error);
  if (code === '23505') return new CommunityBlockError('ALREADY_BLOCKED');
  if (code === '42501' || code === 'PGRST301') {
    return new CommunityBlockError('FORBIDDEN');
  }
  return new CommunityBlockError('UNKNOWN');
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new CommunityBlockError('UNAUTHENTICATED');
  }
  return data.user.id;
}

function normalizeNickname(row: ProfileRow | undefined): string {
  if (!row?.nickname_confirmed) return '알 수 없는 사용자';
  const nickname = row.nickname?.trim();
  return nickname || '알 수 없는 사용자';
}

export async function blockCommunityUser(blockedUserId: string): Promise<void> {
  const blockerUserId = await getAuthenticatedUserId();
  if (!blockedUserId || blockedUserId === blockerUserId) {
    throw new CommunityBlockError('SELF_BLOCK');
  }

  const { error } = await supabase.from('community_user_blocks').insert({
    blocker_user_id: blockerUserId,
    blocked_user_id: blockedUserId,
  });

  if (error) throw mapBlockError(error);
  clearHomeCommunityHighlightsCache();
}

export async function unblockCommunityUser(blockedUserId: string): Promise<void> {
  const blockerUserId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('community_user_blocks')
    .delete()
    .eq('blocker_user_id', blockerUserId)
    .eq('blocked_user_id', blockedUserId)
    .select('blocked_user_id');

  if (error) throw mapBlockError(error);
  if (!Array.isArray(data) || data.length === 0) {
    throw new CommunityBlockError('NOT_BLOCKED');
  }
  clearHomeCommunityHighlightsCache();
}

export async function fetchCommunityBlockedUsers(): Promise<CommunityBlockedUser[]> {
  await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('community_user_blocks')
    .select('blocked_user_id, created_at')
    .order('created_at', { ascending: false });

  if (error) throw mapBlockError(error);
  const blockRows = Array.isArray(data)
    ? (data as BlockRow[]).filter(
        row =>
          typeof row.blocked_user_id === 'string' &&
          typeof row.created_at === 'string',
      )
    : [];
  if (blockRows.length === 0) return [];

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, nickname, nickname_confirmed')
    .in(
      'user_id',
      blockRows.map(row => row.blocked_user_id),
    );

  if (profileError) throw profileError;
  const profiles = new Map<string, ProfileRow>();
  (Array.isArray(profileData) ? profileData : []).forEach(row => {
    if (!isRecord(row) || typeof row.user_id !== 'string') return;
    profiles.set(row.user_id, {
      user_id: row.user_id,
      nickname: typeof row.nickname === 'string' ? row.nickname : null,
      nickname_confirmed: row.nickname_confirmed === true,
    });
  });

  return blockRows.map(row => ({
    userId: row.blocked_user_id,
    nickname: normalizeNickname(profiles.get(row.blocked_user_id)),
    blockedAt: row.created_at,
  }));
}

export function getCommunityBlockErrorMessage(
  error: unknown,
): string {
  const code =
    error instanceof CommunityBlockError
      ? error.code
      : 'UNKNOWN';
  switch (code) {
    case 'SELF_BLOCK':
      return '본인은 차단할 수 없어요.';
    case 'ALREADY_BLOCKED':
      return '이미 차단한 사용자예요.';
    case 'NOT_BLOCKED':
      return '차단 상태가 이미 해제되었어요.';
    case 'UNAUTHENTICATED':
      return '로그인 후 이용해 주세요.';
    case 'FORBIDDEN':
      return '차단 상태를 변경할 권한이 없어요.';
    case 'UNKNOWN':
    default:
      return '차단 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}
