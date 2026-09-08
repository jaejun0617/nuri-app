import {
  LEGAL_DOCUMENTS,
  type LegalDocumentId,
} from './documents';

export type PolicyDocumentId = LegalDocumentId | 'community';

export type PolicyPresentationSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export type PolicyPresentationDocument = {
  id: PolicyDocumentId;
  title: string;
  summary: string;
  contentStatus: 'draft_not_final';
  contentStatusLabel: string;
  version: null;
  effectiveDate: null;
  sourcePath: string;
  sections: readonly PolicyPresentationSection[];
};

const DRAFT_CONTENT_META = {
  contentStatus: 'draft_not_final' as const,
  contentStatusLabel: '내용 검토 중',
  version: null,
  effectiveDate: null,
};

function legalDocument(
  id: LegalDocumentId,
  sections: readonly PolicyPresentationSection[],
): PolicyPresentationDocument {
  const source = LEGAL_DOCUMENTS[id];

  return {
    id,
    title: source.title,
    summary: source.summary,
    sourcePath: source.draftPath ?? 'docs/policies',
    sections,
    ...DRAFT_CONTENT_META,
  };
}

export const POLICY_PRESENTATION_DOCUMENTS: Record<
  PolicyDocumentId,
  PolicyPresentationDocument
> = {
  terms: legalDocument('terms', [
    {
      id: 'service-use',
      title: '서비스 이용',
      paragraphs: [
        'NURI는 반려동물 프로필, 기록, 일정, 가이드, 날씨, 위치 기반 탐색과 커뮤니티 기능을 제공합니다.',
        '사용자는 필수 동의 절차를 마친 뒤 서비스를 이용하며, 계정과 인증 수단을 안전하게 관리해야 합니다.',
      ],
    },
    {
      id: 'user-content',
      title: '사용자 콘텐츠',
      paragraphs: [
        '사용자가 작성하거나 올린 기록, 사진, 일정, 게시글과 댓글은 타인의 개인정보, 권리와 지식재산권을 침해하지 않는 범위에서 이용해야 합니다.',
      ],
    },
    {
      id: 'community-safety',
      title: '커뮤니티 이용 원칙',
      paragraphs: [
        '욕설, 혐오, 괴롭힘, 스팸, 불법 정보와 타인의 권리를 침해하는 콘텐츠는 노출 제한이나 운영 조치 대상이 될 수 있습니다.',
        '세부 이용 기준은 커뮤니티 운영정책에서 확인할 수 있습니다.',
      ],
    },
    {
      id: 'external-information',
      title: '외부 정보와 서비스',
      paragraphs: [
        '지도, 장소, 날씨 등 일부 정보는 외부 제공자의 응답과 데이터 상태에 영향을 받을 수 있습니다.',
        '장소와 생활 정보는 실제 방문이나 이용 전에 최신 정보를 직접 확인해 주세요.',
      ],
    },
    {
      id: 'account-end',
      title: '계정 종료',
      paragraphs: [
        '사용자는 앱에서 계정 삭제를 요청할 수 있습니다. 요청 접수와 최종 정리 완료는 서로 다른 단계일 수 있으며, 자세한 내용은 계정 삭제 안내에서 확인할 수 있습니다.',
      ],
    },
  ]),
  privacy: legalDocument('privacy', [
    {
      id: 'processed-data',
      title: '처리하는 정보',
      paragraphs: [
        '서비스 제공을 위해 계정과 인증 정보, 프로필과 반려동물 정보, 기록·사진·일정, 커뮤니티 활동과 동의 이력이 처리될 수 있습니다.',
      ],
    },
    {
      id: 'purpose',
      title: '이용 목적',
      paragraphs: [
        '정보는 로그인과 세션 유지, 반려동물 기록과 일정 관리, 커뮤니티 운영, 위치 기반 탐색, 오류 대응과 서비스 안정성 확인에 사용됩니다.',
      ],
    },
    {
      id: 'location',
      title: '위치 정보',
      paragraphs: [
        '현재 위치는 주변 장소 탐색과 날씨 등 위치 기반 기능에 필요한 범위에서 사용됩니다.',
        '개인 위치와 저장 상태는 공개 장소 정보의 검증 상태를 자동으로 높이는 근거로 사용하지 않습니다.',
      ],
    },
    {
      id: 'external-services',
      title: '외부 서비스',
      paragraphs: [
        '인증, 데이터 저장, 오류 분석, 지도와 날씨 기능을 위해 외부 서비스가 사용될 수 있습니다. 제공자별 처리 범위와 고지 문안은 최종 검토 후 갱신됩니다.',
      ],
    },
    {
      id: 'rights-and-deletion',
      title: '이용자 권리와 삭제',
      paragraphs: [
        '사용자는 자신의 프로필과 반려동물 정보, 기록, 일정과 콘텐츠를 관리하고 계정 삭제를 요청할 수 있습니다.',
        '삭제 요청 뒤의 처리 단계와 예외 정보는 계정 삭제 안내 및 최종 개인정보 처리방침에 따릅니다.',
      ],
    },
  ]),
  marketing: legalDocument('marketing', [
    {
      id: 'optional-consent',
      title: '선택 동의',
      paragraphs: [
        '마케팅 정보 수신 동의는 필수 가입 조건이 아닙니다. 이용자는 혜택, 업데이트와 이벤트 안내 수신 여부를 선택할 수 있습니다.',
      ],
    },
    {
      id: 'channels',
      title: '안내 채널',
      paragraphs: [
        '앱 알림, 메시지 또는 이메일 등이 안내 채널 후보이며, 실제 사용 채널과 방식은 서비스 화면과 최종 안내에 따릅니다.',
      ],
    },
    {
      id: 'withdrawal',
      title: '동의 철회',
      paragraphs: [
        '이용자는 선택 동의를 철회할 수 있습니다. 동의 여부와 변경 시각은 운영 증적을 위해 저장될 수 있습니다.',
      ],
    },
  ]),
  accountDeletion: legalDocument('accountDeletion', [
    {
      id: 'request-meaning',
      title: '삭제 요청의 의미',
      paragraphs: [
        '회원탈퇴는 계정과 연결된 데이터의 삭제를 요청하는 절차입니다. 요청 접수와 최종 정리 완료는 서로 다른 단계일 수 있습니다.',
      ],
    },
    {
      id: 'deletion-scope',
      title: '삭제 대상',
      paragraphs: [
        '프로필, 반려동물 정보, 기록과 이미지, 일정, 커뮤니티 개인 콘텐츠와 개인화 데이터가 삭제 대상에 포함될 수 있습니다.',
      ],
    },
    {
      id: 'follow-up',
      title: '후속 정리',
      paragraphs: [
        '스토리지 파일과 일부 후속 정리는 비동기로 이어질 수 있습니다. 앱은 요청 접수, 진행 중, 정리 완료와 확인이 필요한 상태를 구분합니다.',
      ],
    },
    {
      id: 'operational-records',
      title: '남을 수 있는 정보',
      paragraphs: [
        '법적 의무, 분쟁 대응, 동의 증적과 서비스 안전을 위해 필요한 일부 정보는 직접 식별자를 제거한 형태로 보관될 수 있습니다. 구체 범위와 기간은 최종 정책에서 확정됩니다.',
      ],
    },
  ]),
  community: {
    id: 'community',
    title: '커뮤니티 운영정책',
    summary: '안전하고 존중받는 커뮤니티 이용을 위한 기본 안내',
    sourcePath: 'docs/policies/커뮤니티-운영정책.md',
    sections: [
      {
        id: 'allowed-content',
        title: '함께 나눌 수 있는 내용',
        paragraphs: [
          '반려동물과의 일상, 질문, 정보와 경험을 서로 존중하는 방식으로 나눌 수 있습니다.',
        ],
      },
      {
        id: 'prohibited-content',
        title: '허용되지 않는 내용',
        paragraphs: [
          '욕설, 혐오, 괴롭힘, 위협, 스팸, 불법 정보, 타인의 권리나 개인정보를 침해하는 콘텐츠는 허용되지 않습니다.',
        ],
      },
      {
        id: 'reporting',
        title: '신고와 운영 처리',
        paragraphs: [
          '사용자는 게시글과 댓글을 신고할 수 있으며, 운영 검토 결과에 따라 콘텐츠의 노출이 제한될 수 있습니다.',
          '자동 노출 제한은 영구 삭제와 같은 의미가 아니며 필요한 경우 운영 검토가 이어집니다.',
        ],
      },
      {
        id: 'account-actions',
        title: '이용 제한',
        paragraphs: [
          '운영정책을 반복해서 위반하면 경고 또는 서비스 이용 제한이 적용될 수 있습니다. 구체 절차와 기준은 최종 정책 검토 후 갱신됩니다.',
        ],
      },
    ],
    ...DRAFT_CONTENT_META,
  },
};

export const POLICY_DOCUMENT_ORDER: readonly PolicyDocumentId[] = [
  'terms',
  'privacy',
  'community',
  'accountDeletion',
  'marketing',
];

export function isPolicyDocumentId(value: unknown): value is PolicyDocumentId {
  return (
    typeof value === 'string' &&
    (POLICY_DOCUMENT_ORDER as readonly string[]).includes(value)
  );
}

export function getPolicyPresentationDocument(
  value: unknown,
): PolicyPresentationDocument | null {
  return isPolicyDocumentId(value)
    ? POLICY_PRESENTATION_DOCUMENTS[value]
    : null;
}
