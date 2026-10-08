# NURI Community Live Corrective

2026-10-09 KST. Metro/Fast Refresh 개발 후보이며 Store Release가 아니다. 최신 PO 지시는 사진 업로드의 10분당 제한 제거다.

## 1. 원인과 변경

| 문제 | 확인한 원인 | 최소 변경 |
| --- | --- | --- |
| 상세 복귀 후 글/읽음 색이 늦게 표시됨 | 상세 재조회 시작 시 `clearCommunityDetailState`가 목록 membership까지 제거. 응답의 `map`은 제거된 행을 복구하지 못함 | loading/일시 오류 동안 마지막 목록 snapshot 보존. 상세 보호 cache는 여전히 무효화. 삭제/열람 불가/moderated 결과는 목록에서도 제거 |
| 키보드와 사진 도구가 따로 움직임 | 첨부 도구가 본문 scroll content 마지막 자식 | create 전용 `KeyboardStickyView`에 분리. 측정한 도구 높이로 focused field 여유 공간 확보. global native/inset 변경 없음 |
| 5번째 사진이 한 화면에 보이지 않음 | 64dp 썸네일 가로 스크롤에 첨부 버튼 공간이 추가됨 | 48~52dp 다섯 장을 사용 가능 폭에 맞춰 한 줄 배치. 더 좁으면 wrap. 삭제/첨부 터치는 48dp 유지 |
| 4번째 사진부터 업로드 실패 가능 | 실제 Storage BEFORE INSERT 함수에 게시글당 3장 제한이 남아 있음 | PO 승인 후 5장으로 반영. 후속 PO 지시로 계정의 10분당 10장 검사만 추가 제거 |
| 등록 중 진행 상태가 불명확함 | 제출 전용 진행 표현 부재 | 실제 pending 수명에 맞춘 5개 원형 순차 wave. reduce motion 대응, 고정 등록 문구, 실패 draft 보존, 동기 중복 submit lock |
| 게시글 테마색 | 댓글 count/작성자 badge/mention/composer 등이 선택 펫 palette 구독 | 본문·분류·댓글 영역은 theme의 중립 surface/text/border 사용. 댓글 전송도 neutral. 글등록 계절색과 읽은 목록 제목 보라색 유지 |
| 글쓰기 FAB | 텍스트 글쓰기 | 기존 접근성 label과 터치 크기를 유지한 흰색 `+` |

현재 scope는 Community store/list/create/discussion 표현, 관련 테스트와 승인된 upload guard다. 글수정 디자인, Navigation, 댓글 인라인 위치/키보드, moderation, 댓글·게시글 작성 제한, RLS, MainActivity는 변경하지 않았다. 더보기 header 등 본문 밖의 기존 계절 action은 유지한다. 삭제·오류의 의미색도 유지한다.

## 2. 서버 반영

- 실제 linked remote: `grmekesqoydylqmyvfke`, `public.guard_community_image_upload()`.
- 첫 migration: `20261008180014_community_image_five_photo_limit`. 이후 최신 지시 migration: `20261008181510_community_remove_image_upload_window_limit`.
- 최종 함수 MD5 `433be514ff3012c9d7d05977e218bdf2`: 승인된 두 변경을 적용한 로컬 정의와 remote가 정확히 일치한다.
- 게시글당 5장, active actor, 본인 경로, 본인 active/non-deleted post 검사 유지. 함수 권한·security definer·search_path·Storage 정책 변경 없음. 기존 asset tracking/cleanup 계약도 유지한다.
- 제거한 것은 사진 업로드의 계정별 시간 제한이다. 댓글/게시글/신고의 기존 제한은 그대로다. 시간 제한 제거로 연속 업로드의 저장공간·트래픽 비용이 커질 수 있다. 대체 quota를 임의 도입하지 않았다.
- DDL 2회, 직접 사용자 row 변경 0. 실제 사진을 올려 한도를 넘겨 보는 운영 QA는 하지 않았다.
- security advisors 비교에서 신규 finding 없음. 기존 view/search_path/definer 권한 등 경고는 해결했다고 주장하지 않는다. guard의 기존 권한 경고 참고: [anon definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). 별도 보안 작업은 시작하지 않았다.
- 이전 글등록 보고서는 posts 제약만 확인했으므로 전체 Storage guard 확인을 대신하지 못했다. 이전의 앱 UX 5장/실제 업로드 미검증 경계를 이번 조사와 분리한다.

## 3. 검증

| 검사 | 실제 결과 |
| --- | --- |
| TypeScript | 최종 PASS |
| Scoped lint | 20파일 오류·경고 0. 늦게 승인된 SQL 계약 테스트도 별도 오류·경고 0 |
| Targeted | 11 suites / 150 tests PASS |
| Full suite | 1회, 199 suites / 2,039 tests PASS |
| 이후 시간 제한 제거 | 앱 source 변화 없이 SQL와 계약 테스트만 변경. 추가 1 suite / 2 tests PASS, 타입 재확인 PASS. 전체 suite를 반복 실행한 것으로 집계하지 않음 |
| Diff check | 이번 범위 PASS. 기존 무관한 `eslint.log`, `20261007074134...sql`의 EOF 공백 2건은 보존 |
| Build | 증분 debug 1회, 5분 32초, 742 tasks: 569 실행 / 106 cache / 67 up-to-date |
| Install | `install -r` 1회, 설치 APK 일치 |
| Native UX | PO 직접 확인 대기. 실행 연결 확인과 화면 QA를 구분 |

초기 검사에서 테스트의 memo 조회/옛 글쓰기 기대값, RN absoluteFill 타입, 남은 unused import를 바로잡았다. 판정 조건을 완화하지 않았다. RN 의존성 deprecated/JSX, 기존 Watchman recrawl 경고가 있었으며 캐시·Watchman을 임의 초기화하지 않았다.

## 4. 설치 후보와 개발 연결

- APK: `/private/tmp/nuri-community-live-YJWoCz/nuri-community-live-debug.apk`.
- SHA-256: `b131d108d328a0dce1b27ba16ea658be15c7c9756e01cc6ed6974766c7892876`.
- versionName `1.0`, versionCode `1`, app ID `com.nuri.app`, debuggable true.
- 원래 Release 서명을 task-local init script로 debug에 지정했다. repo Gradle/native 설정 수정 없음. signer `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3` 일치.
- Galaxy S24 `SM-S937N / R5CY613NMSY`, 1080×2340, density450, fontScale1.0, THREE_BUTTON 유지.
- UID `10402`, first install `2026-06-02 19:16:57` 동일. uninstall/clear-data/logout/계정 변경 없음. 로그인·선택 펫의 육안 재확인은 PO에게 맡긴다.
- Metro `127.0.0.1:8081`, USB reverse 연결, `com.nuri.app (samsung SM-S937N)` inspector 연결 확인.
- Fast Refresh: RN 0.87.1 기본값 true, 별도 false 저장값 없음. 개발 설정만 읽었으며 private credentials/session은 출력·보존하지 않았다. 소스를 일부러 바꿔 UI를 reload하는 추가 QA는 하지 않았다.
- 개발 APK는 이 Mac의 Metro 연결이 필요하다. USB와 Metro를 유지한다. 이 APK hash만으로 JS 실행본을 고정할 수 없으므로 [source fingerprint](nuri-community-live-corrective-2026-10-09-evidence/candidate-source.json)를 함께 남긴다.

## 5. 보존과 증거

- branch `codex/task6-community-content-policy`, HEAD `e49356c14f731599d0a428c52fff368aa997ce18`, staged NONE 유지. commit/push/cleanup 0.
- 이전 Release APK/AAB, 서명·config, baseline 1,779개 파일 유지. 기존 dirty를 되돌리지 않았다. source 변경은 요청한 Community 범위뿐이다.
- 기록·사진·댓글 생성/수정/삭제 0. 앱 실행은 Metro 연결 목적 1회이며 자동 화면 복원/일반 조회의 서버 side effect는 별도 측정하지 않았다.
- [검증](nuri-community-live-corrective-2026-10-09-evidence/validation.json), [서버 계약](nuri-community-live-corrective-2026-10-09-evidence/server-contract.json), [설치](nuri-community-live-corrective-2026-10-09-evidence/install-result.json), [연결](nuri-community-live-corrective-2026-10-09-evidence/metro-connection.json), [보존](nuri-community-live-corrective-2026-10-09-evidence/preservation.json).
- 원시 로그·APK는 `/private/tmp/nuri-community-live-YJWoCz/`에 보존한다. 큰 binary/영상·개인 이미지의 repo 복제 없음.

## 6. PO 확인

1. 새 글 정상 열람 → 뒤로가기: 글이 남고 제목이 즉시 보라색인지 확인.
2. 새 게시글 본문 입력: 사진 도구가 키보드 위로 따라오고 5장 모두 보이는지 확인. 한 장 삭제/재첨부 포함.
3. 실제 5장 등록: pending 원형 wave, 등록 문구 고정, 최종 사진 5장 표시 확인. 기존 부분 업로드 실패의 텍스트 등록/경고 계약은 유지했으므로 네트워크 실패까지 무조건 성공한다고 주장하지 않는다.
4. 목록 흰색 `+`, 본문·댓글 중립색, 등록 버튼 계절색과 읽은 제목 보라색 확인.

STATUS: DEBUG_INSTALLED_METRO_CONNECTED_PENDING_PO_REVIEW

METRO: ON

FAST_REFRESH: ON_BY_VERIFIED_DEFAULT

NURI_NATIVE_UX_QA: PO_DIRECT_PENDING

DEVICE_OWNER: PO

COMMIT: NO

PUSH: NO

STORE: HOLD

AUTO_START_NEXT_WORK: NO

PO 승인을 기다립니다.
