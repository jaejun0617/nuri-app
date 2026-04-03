import { Linking } from 'react-native';

import { captureMonitoringException } from '../../services/monitoring/sentry';

export const COMMUNITY_POLICY_PUBLIC_URL =
  'https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee80218ff1e34e1d1e2a6b';

type CommunityPolicyOpenResult =
  | { ok: true }
  | { ok: false; message: string };

export async function openCommunityPolicyDocument(): Promise<CommunityPolicyOpenResult> {
  try {
    const supported = await Linking.canOpenURL(COMMUNITY_POLICY_PUBLIC_URL);
    if (!supported) {
      return {
        ok: false,
        message:
          '운영정책 링크를 지금 열 수 없어요. 잠시 후 다시 시도해 주세요.',
      };
    }

    await Linking.openURL(COMMUNITY_POLICY_PUBLIC_URL);
    return { ok: true };
  } catch (error) {
    captureMonitoringException(error);
    return {
      ok: false,
      message:
        '운영정책을 여는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
    };
  }
}
