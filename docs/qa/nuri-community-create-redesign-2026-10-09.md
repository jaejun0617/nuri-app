# NURI 커뮤니티 글등록 리디자인 로컬 검증

후속 정정: [Metro corrective](nuri-community-live-corrective-2026-10-09.md)에서 실제 Storage guard의 3장 제한을 발견해 승인 후 5장으로 반영했고, 최신 PO 지시로 10분당 사진 제한도 제거했다. 아래 posts catalog 검사와 앱 UX 5장 설명은 전체 업로드 경로 검증이 아니었다. 사진 도구/진행 표시/설치 상태도 후속 보고서를 우선한다.

최신 설치 상태: PO의 후속 승인으로 [안전 캐시 정리와 Release 빌드·설치](nuri-community-create-install-2026-10-09.md)를 각 1회 완료했다. APK `5c9f9cca` installed match, 화면은 PO 직접 확인 대기다. 아래 BUILD/INSTALL 0과 미설치 표기는 로컬 구현 완료 당시 이력이다.

## 1. 승인과 범위

- 기준일: 2026-10-09 KST. PO가 마미톡 글등록 관찰, 카테고리 제목 제거, compact 칩, 작성 안내 아코디언, 투명 상단 action, 계절 등록색을 지시했다.
- 처음 하단 등록 유지 요청은 이후 상단 등록 하나를 권장한 답변에 대한 PO의 “그래”로 대체됐다. 최종 후보에는 하단 등록 CTA가 없다.
- PO가 추가한 5장 첨부 참고를 반영해 신규 글의 사진 한도를 3장에서 5장으로 변경했다. 한도 안내에는 기존 NURI 정보 토스트를 사용한다. 확인 모달로 입력 흐름을 끊지 않는다.
- 수정과 로컬 검증만 수행했다. build/install/commit/push 및 사용자 콘텐츠 쓰기 없음. 글수정 디자인, 커뮤니티 상세/댓글/읽음 표시, 전역 키보드/native, 서버 write/moderation/RLS 계약은 변경하지 않았다.

## 2. 관찰과 판단

- 승인된 Galaxy S24 읽기 전용 관찰에서 마미톡의 기존 빈 글쓰기 화면을 foreground로 열었다. 투명 상단 action, 제목 divider, 넓은 본문, 하단 첨부 도구를 관찰했다. 입력·게시·설정 변경 없음. 작업용 임시 캡처는 관찰 후 제거했고 repository에는 외부 이미지/자산/카피를 복사하지 않았다.
- PO가 추가한 두 이미지에서 5장 미리보기와 한도 초과 토스트를 확인했다. 실제 외부 앱에 5장을 올리거나 토스트를 재현한 것은 아니다.
- NURI는 기존 `새 게시글` 제목, 질문/정보/일상/자유 분류와 운영정책 문구를 유지한다. 외부 게시판 선택·투표 기능은 이식하지 않았다.
- 하단 사진 도구는 기존 keyboard-aware 본문 스크롤의 마지막 영역이다. 초기 짧은 글에서는 본문의 남는 공간을 채워 아래로 배치하고 긴 글에서는 본문과 함께 스크롤한다. 새 고정 IME toolbar나 native inset owner는 도입하지 않았다.

## 3. 구현

| 소유 파일 | 변경 |
| --- | --- |
| [CommunityCreateScreen](../../src/screens/Community/CommunityCreateScreen.tsx) | 상단 취소·등록을 배경/테두리 없는 48dp touch action으로 변경. 등록 문구는 고정, effectiveSeason 색 적용. picker 한도·중복 제거·중복 picker 요청 차단·5장 draft 복원 |
| [CommunityCreateForm](../../src/screens/Community/components/CommunityCreateForm.tsx) | create 전용 표현. 분류 제목 제거, compact radio 칩, 기본 접힘 정책 안내, unframed 제목/본문, 한 줄 사진 도구. 하단 등록 제거 |
| [Create styles](../../src/screens/Community/components/CommunityCreateForm.styles.ts) | 칩 내부 10dp/4dp, 외부 touch 48dp, 본문 16sp, 작은 사진 64dp, 가로 스크롤과 48dp 개별 삭제 touch |
| [Editor shared](../../src/screens/Community/communityPostEditor.shared.ts) | `COMMUNITY_CREATE_PHOTO_LIMIT = 5` 단일 상수 |

사진 계약:

1. 첨부 순서 유지, 중복 URI 제외, 최대 5장. 본문 아래 한 줄 미리보기와 `현재/5` 표시.
2. 5장 상태에서도 첨부 버튼을 누르면 `사진은 최대 5장까지 첨부할 수 있어요.` 안내. picker를 추가로 열지 않는다.
3. Android picker가 요청 수보다 많이 반환하면 남은 자리만 순서대로 추가하고 토스트로 알린다. 기존 사진을 교체하거나 지우지 않는다.
4. 개별 X 삭제 후 빈 자리에 추가 가능. picker 취소/오류와 미리보기 로드 오류 때 제목·본문·기존 첨부를 자동 삭제하지 않는다.
5. 기존 업로드 함수는 5장을 순차 업로드하고 전체 storage path 배열을 연결한다. 업로드 실패 시 기존 텍스트 등록·경고·cleanup queue 계약을 유지한다. 이를 새 원자적 업로드로 주장하지 않는다.

상단 등록은 기존 유효성 검사와 submit flow를 그대로 사용한다. 등록 중 disabled/busy와 고정 문구를 유지하며 파형/문구 변경은 없다. 기존 draft 저장·복원·나가기 확인·정책 이동 경로도 유지한다.

## 4. 로컬과 서버 확인의 경계

| 검사 | 결과 |
| --- | --- |
| TypeScript | 최종 PASS. 초기 신규 ref/icon prop 타입 오류 수정 후 재실행 |
| Scoped ESLint | 7파일 오류 0, 경고 0 |
| Targeted tests | 6 suites / 33 tests PASS. 4계절 header, 아코디언 및 입력 노드 유지, 5장/초과/삭제/중복/취소/오류/draft, 업로드 payload와 실패 cleanup, 기존 edit/정책 회귀 |
| Full suite | 정확히 1회, 198 suites / 2,031 tests PASS |
| Scoped diff check | PASS. 기존 unrelated 공백 경고는 변경하지 않음 |
| 초기 대상 테스트 | memo/Pressable을 타입으로 찾던 테스트 조회 오류를 수정. 판정 기준 완화 없음 |
| Remote | linked project의 posts constraints/triggers 및 insert guard/image sync 함수 정의만 SELECT 2회. 사용자 row 조회/변경 없음 |
| Native QA | NURI 신규 화면 미실행. 마미톡 관찰을 NURI 실기기 검증으로 간주하지 않음 |

Remote posts constraints에는 이미지 배열 길이 3 제한이 없으며 `sync_community_post_image_assets`는 전체 image_urls를 처리한다. 앱의 upload flow·update payload·상세 PostImageSlider 역시 전체 배열을 처리한다. 이번 5장은 **앱 글등록 UX 한도**이며 서버의 강제 보안 한도를 새로 만들었다는 뜻이 아니다. schema/RPC/RLS/storage policy 수정·반영은 0이다. 실제 5장 업로드와 signed URL 표시 E2E는 미실행이다.

## 5. 보존과 미검증

- 기존 글수정 screen/form/submit helper는 동일하다. 대표 사진 1장 편집 방식만 제공하던 기존 한계도 유지하며, 5장 전체를 개별 교체하는 edit 기능은 이번에 구현하지 않았다. 텍스트 수정 patch가 기존 image_urls 배열을 덮어쓰지 않는 것은 로컬 검사했다.
- 5장은 3장보다 전송량과 시간이 늘 수 있다. 순차 업로드를 유지했으며 새 병렬 업로드/압축/재시도는 도입하지 않았다. 실제 느린 네트워크, 확대 글꼴, TalkBack, 키보드 및 사진 picker 왕복 시각 QA는 별도 승인 후 필요하다.
- 키보드 aware owner·bottomOffset 144·open/closed safe padding은 기존 값 유지. 신규 첨부 가로 스크롤은 dismiss none, persist taps always다. 소스/컴포넌트 확인을 물리 키보드 PASS로 확대하지 않는다.
- 기존 read-title/compact-comment 로컬 후보와 설치 APK는 보존됐다. 이번 후보는 설치되지 않았다.
- 1,664개 baseline 파일의 보존 결과와 source fingerprint는 [검증 metadata](nuri-community-create-redesign-2026-10-09-evidence/validation.json), [보존 결과](nuri-community-create-redesign-2026-10-09-evidence/preservation.json)에 기록한다. 원시 테스트 로그는 `/private/tmp/nuri-community-compose-sjvHk2/`에 보존한다.

## 6. 최종 상태

BRANCH: `codex/task6-community-content-policy`

HEAD: `e49356c14f731599d0a428c52fff368aa997ce18`

SOURCE_SCOPE: CREATE_UI_AND_FIVE_PHOTO_LIMIT

STATUS: CODE_ONLY_PENDING_PO_REVIEW

BUILD: 0

INSTALL: 0

NURI_NATIVE_QA: NOT_RUN

DIRECT_DB_MUTATION: 0

OTHER_CONTENT_MUTATION: 0

STAGED: NONE

COMMIT: NO

PUSH: NO

STORE: HOLD

DEVICE_OWNER: PO

AUTO_START_NEXT_WORK: NO

NEXT_ACTION: PO 로컬 후보 검토

PO 승인을 기다립니다.
