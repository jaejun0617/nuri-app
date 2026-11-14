export type GuideStep = { title: string; body: string; hint?: string; example: string[] };
type Guide = { title: string; category: string; automatic: boolean; steps: GuideStep[] };
const step = (title: string, body: string, example: string[], hint?: string): GuideStep => ({ title, body, example, hint });

export const tutorialCatalog = {
  home: { title: '홈 둘러보기', category: '시작', automatic: true, steps: [
    step('아이를 선택해요', '홈 상단에서 아이 이름을 누르면 등록한 아이를 바꿀 수 있어요.', ['아이 선택', '함께한 시간'], '기록과 일정은 선택한 아이를 기준으로 보여요.'),
    step('자주 쓰는 기록을 열어요', '산책, 식사, 건강, 미용 카드에서 원하는 기록을 시작할 수 있어요.', ['산책', '식사', '건강', '미용']),
    step('새 소식을 확인해요', '홈 상단의 종 모양을 누르면 알림함이 열려요.', ['알림함', '새 소식']),
  ] },
  record: { title: '첫 기록 남기기', category: '기록', automatic: true, steps: [
    step('기록 종류를 확인해요', '오늘 있었던 일에 맞는 종류를 골라요. 홈에서 종류를 고르고 들어오면 해당 종류가 먼저 열려요.', ['기록 종류', '산책', '식사', '일기장']),
    step('날짜와 이야기를 남겨요', '기록 날짜와 필요한 내용을 적고, 함께 남길 사진이 있으면 추가해요.', ['기록 날짜', '제목', '사진'], '사진 선택기를 열기 전에 적은 내용은 그대로 남아요.'),
    step('기록을 저장해요', '내용을 확인한 다음 기록 작성 화면에서 저장해요. 저장된 기록은 타임라인에서 찾을 수 있어요.', ['저장', '타임라인']),
  ] },
  timeline: { title: '타임라인에서 기록 찾기', category: '기록', automatic: true, steps: [
    step('보고 싶은 달을 골라요', '위쪽 연도·월 선택으로 찾으려는 달을 바꿔요.', ['2026년', '11월']),
    step('기록 종류를 좁혀요', '산책이나 식사 등 종류를 고르면 해당 기록만 보여요. 전체로 돌아가면 모든 종류가 보여요.', ['전체', '산책', '식사', '일기장']),
    step('기록 타일을 열어요', '같은 날짜의 기록은 한 줄에 최대 네 칸으로 보여요. 타일을 누르면 상세 기록을 확인할 수 있어요.', ['산책', '식사', '일기', '생활'], '기간이 지정된 알림에서 열었다면 안내된 기간을 먼저 확인해요.'),
  ] },
  'schedule-list': { title: '전체일정 찾기', category: '일정', automatic: true, steps: [
    step('전체일정을 열어요', '홈에서 전체일정으로 들어가면 선택한 아이의 일정을 확인할 수 있어요.', ['전체일정', '선택한 아이']),
    step('날짜별로 확인해요', '일정 목록에서 항목을 누르면 날짜, 시간, 메모가 있는 상세가 열려요.', ['일정 목록', '일정 상세']),
  ] },
  'schedule-create': { title: '일정 만들고 알림 받기', category: '일정', automatic: true, steps: [
    step('일정 이름을 적어요', '어떤 날인지 알아보기 쉽게 이름을 적어요.', ['일정 이름', '예: 예방접종']),
    step('날짜와 시간을 골라요', '일정이 있는 날짜와 시간을 정하고 필요한 경우 메모를 추가해요.', ['날짜', '시간', '메모']),
    step('알림을 확인하고 저장해요', '미리 알림을 받으려면 일정의 알림을 설정하고 저장해요.', ['알림', '일정 저장'], '기기의 누리 알림 권한이 꺼져 있으면 알림을 받지 못할 수 있어요.'),
  ] },
  pet: { title: '반려동물 프로필 등록', category: '시작', automatic: false, steps: [
    step('아이의 기본 정보를 적어요', '반려동물 등록 화면의 첫 단계에서 이름과 기본 정보를 입력해요.', ['반려동물 등록', '1/2']),
    step('입력한 정보를 확인해요', '두 번째 단계에서 아이의 정보를 확인한 뒤 등록을 마쳐요.', ['반려동물 등록', '2/2']),
  ] },
  'record-edit': { title: '저장한 기록과 사진 수정', category: '기록', automatic: false, steps: [
    step('수정할 기록을 열어요', '타임라인에서 내 기록을 열고 상세에서 수정 메뉴를 선택해요.', ['타임라인', '기록 상세', '수정']),
    step('내용과 사진을 확인해요', '필요한 내용과 사진을 바꾼 뒤 저장하고 상세에 반영됐는지 확인해요.', ['내용', '사진', '저장']),
  ] },
  'schedule-edit': { title: '일정 확인·변경', category: '일정', automatic: false, steps: [
    step('변경할 일정을 선택해요', '전체일정에서 날짜와 이름을 확인해 바꾸려는 일정을 열어요.', ['전체일정', '일정 상세']),
    step('변경한 날짜를 확인해요', '수정에서 날짜·시간이나 알림을 바꾸고 저장해요.', ['일정 수정', '날짜', '알림']),
  ] },
  font: { title: '앱 글꼴 바꾸기', category: '설정', automatic: false, steps: [
    step('전체메뉴에서 글꼴을 찾아요', '전체메뉴의 앱 글꼴 항목을 열어요.', ['전체메뉴', '앱 글꼴']),
    step('읽기 편한 글꼴을 골라요', '미리 보이는 글씨를 확인하고 원하는 글꼴을 선택해요.', ['귀염발랄체', 'Pretendard']),
  ] },
} satisfies Record<string, Guide>;

export type TutorialId = keyof typeof tutorialCatalog;
export const tutorialIds = Object.keys(tutorialCatalog) as TutorialId[];
export type TutorialState = 'completed' | 'skipped';
export type TutorialStates = Partial<Record<TutorialId, TutorialState>>;
export type TutorialProgress = { eligible: boolean; states: TutorialStates };
export function parseTutorialProgress(value: unknown): TutorialProgress {
  if (!value || typeof value !== 'object' || !('eligible' in value) || typeof value.eligible !== 'boolean' ||
      !('states' in value) || !value.states || typeof value.states !== 'object' || Array.isArray(value.states)) {
    throw new Error('INVALID_TUTORIAL_PROGRESS');
  }
  const states: TutorialStates = {};
  for (const [id, state] of Object.entries(value.states)) {
    if (tutorialIds.some(topic => topic === id) && (state === 'completed' || state === 'skipped')) {
      states[id as TutorialId] = state;
    }
  }
  return { eligible: value.eligible, states };
}

export function mergeTutorialStates(...sets: TutorialStates[]): TutorialStates {
  const result: TutorialStates = {};
  for (const set of sets) for (const id of tutorialIds) {
    const state = set[id];
    if (state && result[id] !== 'completed') result[id] = state;
  }
  return result;
}
