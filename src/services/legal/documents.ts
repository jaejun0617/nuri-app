import { Linking } from 'react-native';

import { captureMonitoringException } from '../monitoring/sentry';

export const CURRENT_LEGAL_POLICY_VERSION = '2026-03-25.task2_5-draft';

export type LegalDocumentId =
  | 'terms'
  | 'privacy'
  | 'marketing'
  | 'accountDeletion';

export type LegalDocumentStatus = 'draft' | 'pending' | 'external';

export type LegalDocumentConfig = {
  id: LegalDocumentId;
  title: string;
  version: string;
  status: LegalDocumentStatus;
  url: string | null;
  requiredInSignup: boolean;
  summary: string;
  description: string;
  draftPath: string | null;
  unavailableMessage: string;
};

export type LegalDocumentOpenResult =
  | {
      ok: true;
      document: LegalDocumentConfig;
    }
  | {
      ok: false;
      reason: 'unavailable' | 'invalid' | 'failed';
      document: LegalDocumentConfig;
      message: string;
    };

const LEGAL_DOCUMENT_CONFIG: Record<LegalDocumentId, LegalDocumentConfig> = {
  terms: {
    id: 'terms',
    title: '이용약관',
    version: CURRENT_LEGAL_POLICY_VERSION,
    status: 'draft',
    url: null,
    requiredInSignup: true,
    summary: '회원가입과 기본 서비스 이용에 필요한 필수 동의 항목',
    description:
      '서비스 이용 기본 원칙, 사용자 콘텐츠, 금지 행위, 서비스 변경과 계정 삭제 원칙을 다루는 앱 연결용 초안입니다.',
    draftPath: 'docs/policies/이용약관-초안.md',
    unavailableMessage:
      '이용약관 초안 구조는 준비됐지만 앱에서 전체 문서를 여는 연결은 아직 확정되지 않았습니다. 현재는 핵심 요약과 동의 상태만 먼저 제공합니다.',
  },
  privacy: {
    id: 'privacy',
    title: '개인정보 처리방침',
    version: CURRENT_LEGAL_POLICY_VERSION,
    status: 'draft',
    url: null,
    requiredInSignup: true,
    summary: '개인정보 수집, 이용, 보관 안내에 대한 필수 동의 항목',
    description:
      '수집 항목, 이용 목적, 보관/삭제 원칙, 외부 서비스 가능성, 이용자 권리와 계정 삭제 시 처리 원칙을 다루는 앱 연결용 초안입니다.',
    draftPath: 'docs/policies/개인정보처리방침-초안.md',
    unavailableMessage:
      '개인정보 처리방침 초안 구조는 준비됐지만 앱에서 전체 문서를 여는 연결은 아직 확정되지 않았습니다. 현재는 핵심 요약과 동의 상태만 먼저 제공합니다.',
  },
  marketing: {
    id: 'marketing',
    title: '마케팅 수신 안내',
    version: CURRENT_LEGAL_POLICY_VERSION,
    status: 'draft',
    url: null,
    requiredInSignup: false,
    summary: '혜택, 소식, 마케팅 알림 수신 여부를 다루는 선택 동의 항목',
    description:
      '혜택, 소식, 프로모션 안내 수신 여부와 철회 원칙을 다루는 앱 연결용 초안입니다.',
    draftPath: 'docs/policies/마케팅-수신-안내-초안.md',
    unavailableMessage:
      '마케팅 수신 안내 초안 구조는 준비됐지만 앱에서 전체 문서를 여는 연결은 아직 확정되지 않았습니다. 현재는 선택 동의 상태만 저장하며 세부 문구와 채널은 후속 운영 작업에서 확정됩니다.',
  },
  accountDeletion: {
    id: 'accountDeletion',
    title: '계정 삭제 안내',
    version: CURRENT_LEGAL_POLICY_VERSION,
    status: 'draft',
    url: null,
    requiredInSignup: false,
    summary: '삭제 요청 의미, 처리 시점, 후속 정리 상태를 안내하는 문서',
    description:
      '삭제 요청 접수, 즉시 완료와 비동기 정리의 차이, 익명화/비식별 보관, storage cleanup과 운영 확인 가능성을 다루는 앱 연결용 초안입니다.',
    draftPath: 'docs/policies/계정-삭제-안내-초안.md',
    unavailableMessage:
      '계정 삭제 안내 초안 구조는 준비됐지만 앱에서 전체 문서를 여는 연결은 아직 확정되지 않았습니다. 현재는 핵심 요약과 삭제 경로만 먼저 제공합니다.',
  },
};

export const LEGAL_DOCUMENTS = LEGAL_DOCUMENT_CONFIG;

export function getLegalDocument(id: LegalDocumentId): LegalDocumentConfig {
  return LEGAL_DOCUMENT_CONFIG[id];
}

export function getLegalDocumentStatusLabel(status: LegalDocumentStatus): string {
  switch (status) {
    case 'draft':
      return '초안';
    case 'pending':
      return '준비 중';
    case 'external':
      return '제공 가능';
    default:
      return '미확정';
  }
}

export function getLegalDocumentActionLabel(
  document: LegalDocumentConfig,
): string {
  switch (document.status) {
    case 'external':
      return '전체 보기';
    case 'draft':
      return '전체 보기 준비 중';
    case 'pending':
      return '자세히 보기';
    default:
      return '자세히 보기';
  }
}

export async function openLegalDocument(
  id: LegalDocumentId,
): Promise<LegalDocumentOpenResult> {
  const document = getLegalDocument(id);

  if (document.status !== 'external') {
    return {
      ok: false,
      reason: 'unavailable',
      document,
      message: document.unavailableMessage,
    };
  }

  const url = document.url?.trim() ?? '';
  if (!url) {
    return {
      ok: false,
      reason: 'invalid',
      document,
      message:
        '정책 문서 링크 구성이 비어 있습니다. 현재는 문서 연결 구조만 준비된 상태이며, 실제 링크는 후속 작업에서 확정해야 합니다.',
    };
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return {
        ok: false,
        reason: 'failed',
        document,
        message:
          '정책 문서 링크를 열 수 없습니다. 기기 설정을 확인하거나 잠시 후 다시 시도해 주세요.',
      };
    }

    await Linking.openURL(url);
    return { ok: true, document };
  } catch (error) {
    captureMonitoringException(error);
    return {
      ok: false,
      reason: 'failed',
      document,
      message:
        '정책 문서 링크를 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }
}
