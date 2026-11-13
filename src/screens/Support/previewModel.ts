// Development-only examples. No account, entitlement or persisted store is used.
export type PreviewPage =
  | 'notices'
  | 'isolatedNotices'
  | 'isolatedCommunity'
  | 'isolatedReports'
  | 'isolatedTickets'
  | 'isolatedMyTickets'
  | 'isolatedNewTicket'
  | 'isolatedReplyAlerts'
  | 'isolatedFaq'
  | 'isolatedFaqAdmin'
  | 'notice'
  | 'help'
  | 'faq'
  | 'types'
  | 'subscription'
  | 'adRemoval'
  | 'refund'
  | 'receipt'
  | 'adminNotices'
  | 'adminSupport'
  | 'adminFaq';
export function isAdminDesignPage(
  page: PreviewPage,
): page is 'adminNotices' | 'adminSupport' | 'adminFaq' {
  return (
    page === 'adminNotices' || page === 'adminSupport' || page === 'adminFaq'
  );
}
export type SubscriptionExample =
  | 'none'
  | 'active'
  | 'canceling'
  | 'expired'
  | 'error';
export const subscriptionLabels: Record<SubscriptionExample, string> = {
  none: '구독 없음',
  active: '이용 중',
  canceling: '취소 예정',
  expired: '만료',
  error: '확인 실패',
};
export const inquiryTypes = [
  { value: 'usage', label: '앱 사용·기능' },
  { value: 'bug', label: '오류·불편' },
  { value: 'account', label: '계정·로그인' },
  { value: 'other', label: '기타' },
] as const;
export type InquiryCategory = (typeof inquiryTypes)[number]['value'];
export const noticeExamples = [
  {
    id: 'preview-update',
    category: '업데이트',
    title: '더 편해진 누리를 만나보세요',
    date: '2026-11-13T09:00:00+09:00',
    summary:
      '홈에서 자주 쓰는 기록을 바로 시작하고 타임라인에서 다시 찾아보세요.',
    body: [
      '안녕하세요, 누리팀이에요. 아이와 보낸 하루를 기록하는 방법을 안내드려요.',
      '홈의 자주 쓰는 기록에서 산책, 식사, 건강, 미용을 선택하면 해당 기록 화면을 열 수 있어요. 기록할 반려동물이 맞는지 확인한 뒤 내용을 저장해주세요.',
      '저장한 기록은 타임라인에서 날짜와 종류별로 찾아볼 수 있어요. 사진과 일기를 함께 돌아보고 싶다면 전체메뉴의 추억 다이어리도 확인해보세요.',
    ].join('\n\n'),
    pinned: true,
  },
  {
    id: 'preview-health',
    category: '업데이트',
    title: '건강 기록과 일정 살펴보기',
    date: '2026-11-12T14:30:00+09:00',
    summary: '체중과 건강 기록을 남기고 돌봄 일정을 확인하는 방법이에요.',
    body: [
      '전체메뉴에서 건강관리를 열고 기록할 반려동물을 확인해주세요. 체중을 기록할 때는 실제로 측정한 날짜와 값을 입력하면 이전 기록과 비교하기 쉬워요.',
      '일정을 추가할 때 알림을 설정했다면 앱의 알림 설정과 기기 권한을 함께 확인해주세요. 일정 저장과 기기 알림 권한은 별개예요.',
      '누리의 기록은 관찰 내용을 정리하는 도구예요. 건강 상태가 걱정되거나 증상이 이어지면 수의사에게 상담해주세요.',
    ].join('\n\n'),
    pinned: false,
  },
  {
    id: 'preview-service',
    category: '안내',
    title: '실내 놀이 가이드 이용 안내',
    date: '2026-11-11T10:00:00+09:00',
    summary: '날씨나 아이 컨디션에 맞춰 집에서 할 수 있는 활동을 골라보세요.',
    body: [
      '실내놀이 추천에서는 노즈워크, 터그, 개인기 연습처럼 집에서 할 수 있는 활동의 준비물과 진행 순서를 확인할 수 있어요.',
      '아이에게 무리가 가지 않는 활동부터 짧게 시작하고, 피하거나 불편해하면 쉬어주세요. 활동을 마친 뒤에는 가이드의 기록하기 버튼으로 실제 활동을 남길 수 있어요.',
    ].join('\n\n'),
    pinned: false,
  },
  {
    id: 'preview-notifications',
    category: '안내',
    title: '알림 설정을 확인해주세요',
    date: '2026-11-10T17:20:00+09:00',
    summary: '앱의 수신 설정과 기기 알림 권한을 각각 확인해주세요.',
    body: [
      '전체메뉴 → 알림 설정에서 앱 내 수신 항목과 기기 알림 상태를 확인할 수 있어요. 기기 알림이 꺼져 있으면 시스템 설정에서 누리의 알림을 허용해주세요.',
      '일정 알림이 오지 않을 때는 일정이 아직 유효한지, 해당 일정에 알림을 설정했는지, 기기에서 정확한 시간 알림이 필요한 상태인지 차례대로 확인해주세요.',
      '앱에서 받은 소식은 전체메뉴 → 알림함에서 다시 볼 수 있어요. 기기에서 팝업이 보이는 것과 앱 안에 소식이 남는 것은 서로 달라요.',
    ].join('\n\n'),
    pinned: false,
  },
  {
    id: 'preview-records',
    category: '안내',
    title: '기록이 보이지 않을 때 확인할 점',
    date: '2026-11-09T11:40:00+09:00',
    summary: '같은 계정, 선택한 반려동물, 날짜와 필터부터 확인해주세요.',
    pinned: false,
    body: [
      '기록이 예상한 곳에 보이지 않으면 작성할 때와 같은 로그인 계정인지 먼저 확인해주세요. 반려동물이 여러 마리라면 현재 선택된 아이도 확인해주세요.',
      '타임라인의 날짜와 기록 종류를 확인한 뒤 필터를 전체로 바꿔 다시 찾아보세요. 저장 결과가 확인되지 않았다면 목록을 먼저 새로고침한 뒤 다시 저장해주세요.',
      '문제가 계속되면 고객센터에 어떤 화면에서 언제 발생했는지 남겨주세요. 비밀번호나 인증번호는 적지 않아도 돼요.',
    ].join('\n\n'),
  },
] as const;
export const faqExamples = [
  {
    category: '앱 사용',
    question: '알림을 받으려면 어떻게 하나요?',
    answer:
      '전체메뉴 → 알림 설정에서 받고 싶은 항목을 확인해주세요. 기기 알림이 꺼져 있다면 같은 화면의 기기 알림 설정을 열어 누리 알림을 허용해주세요.\n\n일정 알림만 오지 않으면 해당 일정에 알림이 켜져 있는지와 정확한 시간 알림 권한도 확인해주세요.',
  },
  {
    category: '앱 사용',
    question: '반려동물 정보를 어떻게 수정하나요?',
    answer:
      '전체메뉴 상단의 반려동물 정보 영역을 눌러 아이들 프로필 관리로 들어가세요. 수정할 아이를 확인한 뒤 프로필을 열고 필요한 정보를 저장해주세요.',
  },
  {
    category: '앱 사용',
    question: '기록을 수정하거나 삭제할 수 있나요?',
    answer:
      '타임라인이나 해당 기록 메뉴에서 내가 남긴 기록을 연 뒤 상세 화면의 수정 또는 삭제 메뉴를 이용해주세요. 삭제 전에는 반려동물과 날짜가 맞는지 확인해주세요.',
  },
  {
    category: '계정',
    question: '로그인했는데 예전 기록이 안 보여요.',
    answer:
      '기록을 남길 때 선택한 로그인 방법과 계정이 맞는지 먼저 확인해주세요. 전체메뉴에서 로그아웃한 뒤 이전에 사용한 제공자와 계정을 선택할 수 있어요.\n\n같은 계정이라면 선택한 반려동물과 타임라인의 날짜·필터를 확인해주세요. 데이터를 확인하기 위해 새 계정을 만들거나 기존 기록을 삭제할 필요는 없어요.',
  },
  {
    category: '앱 사용',
    question: '사진 기록과 일기를 어디에서 다시 볼 수 있나요?',
    answer:
      '날짜별 기록은 하단 타임라인에서 확인할 수 있어요. 일기를 다시 보고 싶다면 전체메뉴 → 추억 다이어리를 열어주세요. 한 아이의 기록만 찾을 때는 현재 선택된 반려동물을 먼저 확인해주세요.',
  },
  {
    category: '앱 사용',
    question: '산책하기 어려운 날에는 어디에서 놀이를 찾나요?',
    answer:
      '실내놀이 추천에서 활동을 고르면 준비물과 진행 순서가 나와요. 짧게 따라 해보고, 마친 활동은 가이드 하단에서 기록할 수 있어요.',
  },
  {
    category: '앱 사용',
    question: '커뮤니티에서 불편한 글이나 댓글을 발견했어요.',
    answer:
      '해당 게시글 또는 댓글의 메뉴에서 신고를 선택하고 실제 상황에 맞는 사유를 남겨주세요. 특정 사용자의 글을 보지 않으려면 차단을 이용할 수 있고, 차단 목록은 전체메뉴 → 차단한 사용자 관리에서 확인할 수 있어요.',
  },
  {
    category: '앱 사용',
    question: '오류를 문의할 때 어떤 내용을 적으면 되나요?',
    answer:
      '문제가 발생한 화면, 마지막에 누른 버튼, 대략적인 발생 시각, 반복되는지 여부를 순서대로 적어주세요. 같은 문제가 여러 번 발생했다면 재현 순서도 알려주세요. 비밀번호·인증번호·결제카드 정보는 보내지 마세요.',
  },
  {
    category: '계정',
    question: '로그아웃과 회원탈퇴는 어떻게 다른가요?',
    answer:
      '로그아웃은 현재 앱의 로그인 세션을 종료하는 동작이에요. 회원탈퇴는 계정과 연결된 자료의 삭제 요청이므로 전체메뉴의 회원탈퇴 화면에 표시되는 삭제 대상과 복구 안내를 먼저 확인해주세요.',
  },
  {
    category: '결제·구독',
    question: '구독은 어디에서 취소하나요?',
    answer:
      '실제 결제한 구독이 있다면 결제에 사용한 스토어 계정의 구독 관리에서 상태를 확인해주세요. 구독 취소와 환불 요청은 서로 다른 절차예요. 결제 내역이 없는 화면만 보고 결제가 완료됐다고 판단하지 마세요.',
  },
] as const;
export function canPreviewRefund(
  orderSelected: boolean,
  reason: string,
  attachment: 'none' | 'ready' | 'error',
) {
  return (
    orderSelected &&
    reason.trim().length > 0 &&
    reason.length <= 2000 &&
    attachment !== 'error'
  );
}
