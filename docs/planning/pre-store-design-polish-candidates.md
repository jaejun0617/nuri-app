# 스토어 출시 전 디자인 Polish 후보

기준일: 2026-07-11

## 목적

이 문서는 V1.0/V1.1/V1.1.1 기능 구현을 무리하게 늘리지 않고, 스토어 제출 전 앱 내부 화면 신뢰도를 높이기 위한 디자인 polish 후보를 화면 단위로 분류한다. 2026-07-11 PO 지시에 따라 Lv.100 성장 정책과 Home 대표 칭호 badge는 필수 polish와 함께 예외적으로 반영했다. Play Store 자산, push, 홈 위젯, 무지개다리는 변경하지 않는다.

## 원칙

- 전체 리뉴얼이 아니라 화면별 밀도, hierarchy, spacing, modal consistency를 정리한다.
- NURI의 예쁘고 고급스러운 반려동물 앱 톤을 유지한다.
- 기능 계약, navigation contract, Supabase 계약은 건드리지 않는다.
- crash, overlap, 명백한 잘림은 release blocker로 보지만, 취향성 개선은 별도 polish 트랙으로 둔다.

| 화면 | polish 후보 | 우선순위 | 위험도 | 직접 수정 여부 | 후속 액션 |
|---|---|---:|---|---|---|
| 로그인/회원가입 | 소셜 버튼/최근 로그인 pill spacing, 정책 안내 문구 밀도, 작은 Android 화면 keyboard 상태 재확인 | 1 | 낮음 | 아니오 | 출시 전 필수 polish 후보 |
| NicknameSetup | 입력 카드와 primary button 간격, 에러 문구 line-height, 긴 닉네임 preview | 2 | 낮음 | 아니오 | 가능하면 polish |
| PetCreate | 생일/입양일 문구를 `태어난 날`/`가족이 된 날` 톤으로 정리, 긴 펫 이름 줄바꿈 | 1 | 낮음 | 아니오 | 출시 전 필수 polish 후보 |
| Home | 펫 프로필 optional 정보 empty copy, `태어난 날` 문구, 대표 칭호 badge, 함께한 시간 pill, 날씨 compact card 출처 문구 제거 후 여백 확인 | 1 | 낮음 | 적용 | release 전 홈 screenshot 후보 |
| 홈 알림 overlay | dim 강도, 카드 간격, expanded 상태 긴 본문 line-height, empty state premium tone | 2 | 중간 | 아니오 | 가능하면 polish |
| PremiumRewardModal | Lv.100 `최고 레벨 달성` 문구, progress bar, 오늘 하루 안 보기 touch target, 긴 XP 숫자 줄바꿈 | 1 | 낮음 | 적용 | 출시 전 필수 polish 후보 |
| 전체메뉴 | `활동 및 기록` 그룹 내 `누리 랭킹`/`활동·칭호` hierarchy, icon tone 통일 | 2 | 낮음 | 아니오 | 가능하면 polish |
| 나의 반려동물 | 프로필 관리/중요일정/활동·칭호 탭 밀도, 카드 radius/heading hierarchy | 2 | 낮음 | 아니오 | 가능하면 polish |
| 활동·칭호 | Lv.100 progress/max 문구, 펫별 카드가 많을 때 section divider, 획득/잠금 칭호 contrast, ownerLabel pill 색상 | 2 | 중간 | 일부 적용 | 가능하면 polish |
| 누리 랭킹 | Lv.100 표시, 기둥그래프 색상 대비, 1~3위 강조 강도, empty-safe 미용 탭 문구, 작은 화면 bar height | 1 | 중간 | 일부 적용 | 출시 전 필수 polish 후보 |
| 타임라인 | category count badge 밀도, write CTA와 keyboard 상태, 기록 없는 날 empty copy | 2 | 중간 | 아니오 | 가능하면 polish |
| 기록 작성/수정 | PremiumRewardModal 이후 복귀 flow, 입력 field spacing, 날짜/카테고리 선택 상태 contrast | 1 | 중간 | 아니오 | 출시 전 필수 polish 후보 |
| 건강관리 | 건강 표현 과장 방지, 차트/기록 카드 spacing, 체중 입력 sheet keyboard overlap 재확인 | 2 | 중간 | 아니오 | 가능하면 polish |
| 산책 | POI list/detail card density, safe empty UX copy, 외부 지도 CTA hierarchy | 3 | 중간 | 아니오 | V1.2 polish |
| 병원 찾기 | 전화/길찾기 CTA hierarchy, coordinate missing fallback copy, thumbnail placeholder tone | 3 | 중간 | 아니오 | V1.2 polish |
| 커뮤니티 | 정책 notice 밀도, 신고/숨김 상태 copy, 긴 제목/본문 wrapping | 2 | 중간 | 아니오 | 가능하면 polish |
| 운영자 admin console | 관리 콘솔은 앱 톤보다 실수 방지 우선. broadcast disabled, preview, audit log 가독성 | 2 | 낮음 | 아니오 | 관리 페이지 고도화 트랙 |
| empty/loading/error states | 화면별 문구 톤 통일, 반복적인 “준비 중” 문구 고급화, retry button height 통일 | 1 | 낮음 | 아니오 | 출시 전 필수 polish 후보 |
| Android keyboard/nav bar | 로그인, 기록 작성/수정, 건강 입력, 탈퇴 모달, 보상/알림 modal safe area 재확인 | 1 | 중간 | 아니오 | 출시 전 필수 QA gate |

## 이번 턴 직접 수정

- Home pet birth label: `생년월일` -> `태어난 날`.
- Home weather compact card: `날씨 데이터: Open-Meteo` 문구 제거. provider/cache 계약과 날씨 상세의 attribution 정책은 유지한다.
- Home representative title badge: 현재 선택 펫의 `user_titles.pet_id`와 일치하는 칭호만 작은 badge/pill로 표시한다. user-level 공통 칭호는 펫 칭호처럼 오표시하지 않는다.
- Lv.100 progression: Lv.1~30 threshold는 유지하고, Lv.31~100은 1,250,000 XP max까지 장기 curve로 확장했다. 앞으로 지급되는 XP는 base 1.3배 후 level band별 감쇠를 적용한다.
- PremiumRewardModal: Lv.100/max 상태에서 progress bar와 `최고 레벨 달성` 문구 표시.

## 건드리지 말 것

- destructive DB/RPC/RLS/seed 변경.
- 앱 전체 테마 전면 교체.
- Play Store screenshot/asset 생성.
- 운영자 발송 UI를 일반 앱 내부 메뉴에 노출하는 변경.
- push permission prompt를 release surface에 즉시 노출하는 변경.
