# NURI TIMELINE SEASONAL DESIGN REPORT

## 1. 작업 착수와 범위

- 작업 유형: Timeline 사용자 목록의 네 계절 시안 구현과 Android native 검증. Primary owner는 NURI-04이며 다른 작업방에 write를 요청하지 않았다.
- 사용자 승인: 시안 구현·실기기 설치·읽기 전용 QA 승인. Timeline 최종 시각 승인·commit·push·freeze 승인은 아직 없다.
- 위험도: 중간. 공용 MemoryCard에 opt-in presentation을 추가하므로 기존 기본 경로의 회귀 테스트와 전체 suite를 수행했다.
- 읽은 기준: engineering workflow/checklist/memory, project-memory 네 문서, Master routing policy, NURI-04 소유권, Timeline query/category/XP/KST/toolbar 계약과 최신 첨부 시안.
- 실제 source of truth: 현재 TimelineScreen과 canonical 서비스·전역 effectiveSeason, 첨부 PNG 네 장, 이번 설치 APK와 S24 화면. 과거 Community 승인·QA를 이번 Timeline QA로 대체하지 않는다.
- 수정 단위: runtime 6파일, 신규 테스트 1파일, 원본 PNG 4파일, 보고서·memory·리서치 6문서. 기존 Timeline FAB 후보와 무관한 dirty를 보존했다.
- 제외: Auth·Weather·API·Community 디자인·Bottom Navigation·서버·DB·RPC·RLS·Storage·기록 mutation·Store·cleanup.

## 2. 구현 결과

- 1774×887 원본 네 장을 재생성·자르기·색 보정 없이 사용한다. 실측 목록 너비로 2:1 높이를 지정하고 상태 표시줄 아래에서 시작한다. 통계는 이미지 하단 전경에 10dp만 겹치며 피사체를 가리지 않는다.
- 히어로 위 Timeline 제목·뒤로가기·보조 문구, 흰 통계 영역, 월/정렬 선택, 가로 카테고리, 날짜별 rail/dot와 compact 기록 행을 구현했다. 모든 계절은 전역 effectiveSeason을 사용한다.
- 통계 gradient·XP 숫자·Paw·선택 카테고리를 별도 Timeline token으로 소유한다. 등록 FAB는 기존 전역 role-based Primary와 흰 plus를 유지한다.
- 기존 category-count wrapper가 호출하던 동일한 lightweight summary 조회를 재사용한다. 조회 횟수를 늘리지 않고 전체 기록 수·KST 기록한 날·필터별 날짜 집계를 파생한다. 다른 pet의 summary는 표시하지 않는다.
- 아직 집계되지 않은 값과 실제 0을 구분한다. XP는 기존 레벨 내 진행률을 유지하고 최고 레벨을 별도 표시한다.
- 기본 MemoryCard는 그대로 두고 Timeline만 새 presentation을 선택한다. signed URL·visible image window·preload·load-more·focus/race 보호·기록 상세 callback을 유지한다.
- 실제 카테고리인 `일기장`과 `생활 → 미용 등 하위 분류`를 보존했다. 시안의 미용을 신규 main category로 만들지 않았다. 사진 없는 기존 QA 기록에는 실제 placeholder를 쓰며 가짜 사진을 채우지 않는다.

## 3. Final Palette

| 계절 | Progress Gradient | XP 숫자 | Paw | 선택 카테고리 |
| --- | --- | --- | --- | --- |
| 가을 | #DA4A0E → #FE9E28 | #DF3500 | #FD8900 | #D44912 |
| 겨울 | #2663E2 → #479DFB | #4480E4 | #2E72F0 | #3573ED |
| 봄 | #DE3E6B → #F291AC | #D0275D | #ED5B86 | #DD3E6B |
| 여름 | #047572 → #38BBB7 | #007771 | #02847E | #1A817B |

- 선택 칩 글자·숫자·아이콘: #FFFFFF. 미선택: 흰 면, #748096 글자/아이콘, 밝은 neutral border.
- 단일 Primary 색으로 합치지 않았다. 실제 캡처에서 네 계절 XP/Paw/선택 칩·별도 FAB 색과 흰 plus 픽셀 MATCH.
- 대비 경계: 선택 칩과 흰 글자 가을 4.411:1, 겨울 4.351:1, 봄 4.220:1, 여름 4.698:1. 겨울 XP 숫자와 흰 면은 3.851:1. 지정값 보존으로 일반 작은 글자 AA 전체 PASS를 선언하지 않는다.
- 등록 FAB의 기존 전역 Primary와 흰 plus는 네 계절 모두 4.5:1 이상이다. 색상 변경은 별도 PO 판단 사항이며 자동 보정하지 않는다.

## 4. Local Validation

- TypeScript: PASS.
- Targeted ESLint: 0 errors, 기존 ControlsBar no-shadow warning 1개, 새 오류/경고 0. 교체된 구 summary 컴포넌트의 기존 warning 1개는 사라졌다.
- Targeted: 15 suites / 333 tests PASS. 신규 시안 테스트 12건은 네 palette·실제 header wiring·null/0·callbacks·KST/day count·MemoryCard 기본 호환·자산과 exclusion을 포함한다.
- Full suite: 181 suites / 1,826 tests, 1회 PASS.
- Git diff check: PASS.
- 로컬 대표 layout: 360/384/430dp, fontScale 1.5에서 원본 비율·자연 높이·통계 세로 전환·44dp touch 계약 확인. 실제 native glyph·겹침을 전 조합에서 증명한 결과는 아니다.
- 초기 신규 테스트의 theme 인자·memo/Text 선택 오류는 테스트를 보완해 통과시켰다. 실패 로그는 보존하며 production 우회는 없다.

## 5. Release와 설치

- Incremental Release: 1회 PASS, 268.693초. 995 tasks 중 66 executed / 929 up-to-date. clean·runtime Metro·Fast Refresh 없음.
- APK: `/private/tmp/nuri-timeline-seasonal-design-20261007-044935/nuri-timeline-seasonal-qa-5d5d2e64.apk`.
- SHA256: `5d5d2e64e691346ee92da2e7a6c63a07738c2af9bdf89e52ba71142f0d0fffff`.
- Source/private input fingerprint·Release signer·bundle markers·네 원본의 APK decoded bitmap pixels: MATCH.
- APK 검사 helper의 이미지 추출 buffer 부족은 검사 한도를 보완해 동일 APK를 다시 검사했다. 추가 build/install은 없었다.
- Galaxy S24 install-r: 1회 PASS, 15.505초. 설치 hash 일치, UID·최초 설치 시각·화면 설정 유지. uninstall·clear data·logout 없음.
- APK는 기존 dirty를 포함한 PO 디자인 QA 후보이며 clean Store RC나 clean HEAD 빌드가 아니다.

## 6. Galaxy S24 Native QA

- Galaxy S24 SM-S937N, 기본 384dp / fontScale 1.0. 네 계절 모두 상태 표시줄 아래 y=93px, hero 1080×540px. 이미지·문구·통계 잘림과 hero 피사체 가림 없음.
- 실제 통계: Lv.4, 첫 인사 완료, 468/700 XP, 기록 8개, 기록한 날 1일. 현재 레벨 floor 450 / next 700이므로 진행률은 `(468-450)/(700-450)`의 반올림 7%다. 시안의 긴 bar를 모방해 XP 의미를 바꾸지 않았다.
- 산책 0건 empty state, 일기장 7건 필터·날짜 집계, 생활 하위 미용 1건 필터·날짜 집계 PASS. 전체 통계는 필터와 별개로 선택 pet 전체 8개를 유지한다.
- 최신순/오래된순 전환, 2026.10 선택·기존 월 jump·전체 복귀, 가로 칩 스크롤, 목록 끝·마지막 기록/FAB/toolbar 경계 PASS.
- back/월/정렬/칩 최소 44dp, FAB 48dp. 최종 스크롤 상태에서 마지막 행은 FAB 위로 완전히 노출된다. 저장·수정·삭제·새 기록 작성은 수행하지 않았다.
- bounded 이번 QA 구간: FATAL 0, ANR 0, RN_FATAL 0. raw log는 보고서에 저장하지 않는다.
- 화면상 가을·전체 카테고리·월/전체·최신순·목록 맨 위로 복귀했다. persisted override의 이전 nullness는 미조회이며 동일하다고 주장하지 않는다.
- PO 최신 답변 `기본 설정에서만 실기기 검증`을 따른다. 이번 기기 설정 변경 없음. 360/430dp 및 fontScale 1.3/1.5 native matrix는 미실행이며 자동 추가 QA 대상으로 열지 않는다. 다른 Android 기기·iOS native·사진 첨부 행의 새 현장 QA·큰 실제 데이터에서 장기 스크롤 성능은 미확인이다.

## 7. Remote와 보존

- 기존 앱 read-only 서비스로 실제 Timeline 데이터를 확인했다. 별도 linked remote SQL catalog·전체 row hash 감사는 이번 범위에서 미실행이다.
- 서버 배포·migration·Supabase 명시적 mutation·QA100 insert/update/delete·계정 작업 없음. 과거 remote row 감사 결과를 이번 전체 데이터 보존 증적으로 재사용하지 않는다.
- Auth/Weather/API/Community 소스·자산 및 무관한 dirty는 baseline hash 감사에서 보존한다. MemoryCard 기본 경로는 회귀 테스트로 보호한다.
- Android build/.cxx/.gradle·Gradle cache·후보 및 기존 APK·기존 증적 보존. cleanup 없음.
- 증적 루트: `/private/tmp/nuri-timeline-seasonal-design-20261007-044935`. baseline/assets/검증 로그/candidate/install/token-contrast/native-validation/preservation과 캡처를 소유한다.
- 캡처: autumn-top, winter-top, spring-top, summer-top, autumn-empty/diary/oldest/month-modal/footer, summer-grooming, restored. 설정/계정/다른 화면의 재디자인을 수행하지 않았다.

## 8. Git와 문서

- Branch: `codex/task6-community-content-policy`.
- Start/current HEAD: `bf8a7a578ae16d869afbadd3c1810c521592b260`.
- STAGED: NONE. COMMIT: NO. PUSH: NO. 기존 dirty 보존.
- project-memory 네 문서·리서치에 이번 Timeline 후보와 검증 경계를 추가했다. 기존 문서 body는 보존한다.
- release-checklist는 Store/운영 gate 변화가 없어 이번에 변경하지 않았다. 기존 dirty는 유지한다.

## 9. Final State와 다음 1개

- TIMELINE_SEASONAL_DESIGN: IMPLEMENTED_NATIVE_VERIFIED_PENDING_PO_APPROVAL.
- FOUR_SEASON_ASSETS / EXACT_TIMELINE_TOKENS / LOCAL_VALIDATION / S24_DEFAULT_NATIVE: PASS.
- GENERAL_SMALL_TEXT_CONTRAST: PO_REVIEW_REQUIRED.
- AUTH / WEATHER / API / COMMUNITY_FOUR_SEASON_HERO: COMPLETE_FROZEN_PRESERVED.
- BUILD_ARTIFACTS: PRESERVED. CLEANUP: NO. STORE: HOLD. AUTO_START_NEXT_WORK: NO.
- 다음 액션 1개: 설치된 네 계절 Timeline 시안의 PO 시각 검토. 지정색 대비 경계와 진행률 의미를 함께 확인한다.

PO 승인을 기다립니다.
