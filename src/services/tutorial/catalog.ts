export type GuideStep = { title: string; body: string; hint?: string };
type Guide = { title: string; category: string; automatic: boolean; steps: GuideStep[] };
const step = (title: string, body: string, hint?: string): GuideStep => ({ title, body, hint });

export const tutorialCatalog = {
  home: { title: '홈 둘러보기', category: '시작', automatic: true, steps: [
    step('아이의 정보를 확인해요', '홈 상단에서 현재 선택한 아이의 프로필을 확인할 수 있어요.'),
    step('최근 기록을 살펴봐요', '‘최근 기록’에서 살펴볼 기록을 눌러 내용을 확인해 보세요.'),
    step('필요한 메뉴를 찾아요', '하단의 ‘전체메뉴’를 열면 전체일정, 설정, 이용 안내를 찾을 수 있어요.'),
  ] },
  record: { title: '첫 기록 남기기', category: '기록', automatic: true, steps: [
    step('기록 종류를 골라요', '날짜를 확인하고 ‘어떤 기록인가요?’에서 남길 기록의 종류를 골라 주세요.'),
    step('사진과 이야기를 더해요', '제목과 선택한 종류에 필요한 정보를 적어 주세요. 사진과 이야기도 함께 남길 수 있어요.'),
    step('기록을 남겨요', '필수 내용을 모두 적었다면 화면 아래의 ‘기록 남기기’를 눌러 주세요.'),
  ] },
  timeline: { title: '타임라인에서 기록 찾기', category: '기록', automatic: true, steps: [
    step('보고 싶은 달을 골라요', '타임라인 상단의 연도와 월에서 양옆 화살표를 눌러 살펴볼 달을 골라 주세요.'),
    step('종류별로 모아봐요', '‘산책’이나 ‘식사’처럼 기록 종류를 고르면 해당 기록만 모아볼 수 있어요.'),
    step('기록을 자세히 살펴봐요', '한 줄에 최대 네 개씩 보이는 기록 중 하나를 눌러 사진과 내용을 확인해 주세요.'),
  ] },
  'schedule-list': { title: '전체일정 찾기', category: '일정', automatic: true, steps: [
    step('일정을 한곳에서 봐요', '전체메뉴의 ‘전체일정’을 열면 선택한 아이의 일정을 볼 수 있어요.'),
    step('원하는 일정을 찾아요', '‘일정 검색’에 이름을 입력하거나 ‘전체’, ‘오늘’, ‘예정’, ‘지난’ 중 하나를 선택해 보세요.'),
  ] },
  'schedule-create': { title: '일정 만들고 알림 받기', category: '일정', automatic: true, steps: [
    step('일정 이름을 입력해요', '‘일정 이름’에 기억해 둘 일을 적어 주세요.'),
    step('날짜와 시간을 정해요', '‘일시’를 눌러 일정의 날짜와 시간을 골라 주세요.'),
    step('알림을 확인하고 저장해요', '알림 설정을 확인한 뒤 ‘일정 저장하기’를 눌러 주세요.', '알림 수신은 기기와 앱의 알림 설정에 따라 달라질 수 있어요.'),
  ] },
  pet: { title: '반려동물 프로필 등록', category: '시작', automatic: false, steps: [
    step('아이의 기본 정보를 적어요', '이름과 기본 정보를 입력한 뒤 ‘다음으로’를 눌러 주세요.'),
    step('아이의 취향을 남겨요', '성향 등 더 남기고 싶은 정보를 적은 뒤 ‘등록 완료’를 눌러 주세요.'),
  ] },
  'record-edit': { title: '저장한 기록과 사진 수정', category: '기록', automatic: false, steps: [
    step('수정할 기록을 열어요', '타임라인에서 수정할 기록을 열고, 더보기에서 ‘기록 수정하기’를 선택해 주세요.'),
    step('바뀐 내용을 저장해요', '수정할 수 있는 내용이나 사진을 바꾼 뒤 ‘변경사항 저장’을 눌러 주세요.', '산책과 연결된 기록은 화면에 표시된 수정 제한을 확인해 주세요.'),
  ] },
  'schedule-edit': { title: '일정 확인·변경', category: '일정', automatic: false, steps: [
    step('바꿀 일정을 열어요', '전체일정에서 변경할 일정을 열고 ‘일정 수정하기’를 눌러 주세요.'),
    step('수정한 내용을 저장해요', '변경할 값을 수정하고 화면 아래의 ‘일정 수정하기’를 눌러 주세요.'),
  ] },
  font: { title: '앱 글꼴 바꾸기', category: '설정', automatic: false, steps: [
    step('글꼴별 문장을 비교해요', '전체메뉴의 ‘앱 글꼴’을 눌러 글꼴별 예시 문장을 비교해 보세요.'),
    step('읽기 편한 글꼴을 골라요', '원하는 글꼴을 누른 뒤 화면에 반영된 모습을 확인해 주세요.'),
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
