# V1.0 Remaining Task/Risk Closeout

<!-- NURI_APPROVED_FREEZE_20261008_BEGIN -->
## 2026-10-08 PO 통합 승인 release closeout

- [통합 동결](nuri-keyboard-glass-expenses-final-freeze-2026-10-08.md): keyboard 및 glass·월별 지출 FINAL_APPROVED. 최신 PO 지시는 이번 증분 Release/install-r 각 1회·선별 commit/push만 허용하며 이전 단독 승인 시점 NO와 구분한다.
- 타입·scoped lint·대상123·전체192 suites/1,952 tests 및 bounded native 증거를 재사용한다. 승인 후 앱 소스/테스트 변경 0, 추가 전역 keyboard QA 0. 정확한12개 gate와 mixed-candidate 경계를 유지하며 ALL_PATHS_PASS NO다.
- runtime committed-source 일치·APK signer/출처·설치 hash·UID/최초 설치 시각/설정 보존을 확인한다. Store·DB·cleanup·자동 후속 작업은 없다. QA 데이터·기존 APK/AAB/build output과 unrelated dirty 보존.
<!-- NURI_APPROVED_FREEZE_20261008_END -->

<!-- NURI_KEYBOARD_FINAL_APPROVAL_20261008_BEGIN -->
## 2026-10-08 키보드 승인 게이트

- [PO 최종 승인](nuri-global-keyboard-final-approval-2026-10-08.md): K01~K38 FINAL_APPROVED, KEYBOARD_BASELINE COMPLETE_FROZEN_WITH_EXACT_GATES, 알려진 OPEN 0, PASS 26·정확한 기타 상태 12. 최신 전체 38개 재실행이나 ALL_PATHS_PASS로 확대하지 않는다.
- MainActivity global corrective NOT_REQUIRED, global native inset corrective NOT_AUTHORIZED. 추가 keyboard QA/build/install은 하지 않는다. 기존 fixture/consumer gate와 증거는 보존한다.
- 승인 metadata 반영에서 앱 source/test·기기·DB·build/install·cleanup·commit/push는 0. 키보드 승인과 다른 glass/expense 디자인 후보·운영/Store gate는 별개다. STORE HOLD, AUTO_START_NEXT_WORK NO, MASTER_STATE STOPPED_WAITING_FOR_NEXT_PO_INSTRUCTION.
<!-- NURI_KEYBOARD_FINAL_APPROVAL_20261008_END -->

<!-- NURI_GLASS_EXPENSES_20261008_BEGIN -->
## 2026-10-08 최신 glass·expense 후보 경계

- [최신 후보](nuri-glass-forms-monthly-expenses-2026-10-08.md): 일정/기록 glass·전체일정·장식 CTA·모든 소유 펫의 용품/병원비 월합계와 목록. 기존 price·RLS로 구현, schema/RPC/policy/직접SQL변경0. 승인된 정상UI QA 지출2건·1수정·동일값프로필저장1회 및 부수효과는 별도 기록한다.
- 최종 타입PASS·lint43파일errors0/기존warnings25·대상123·192 suites/1,952 tests PASS. full실행actual5회·build/install-r각2회(추가1회PO승인), APK `eae763280deb2bee464ad32413193afebb27484b446743f3be1cb3b37a53cc2d` 설치hashmatch. UID·최초설치시각·QA로그인·선택펫·기기설정 보존.
- 최종 Galaxy S24 384dp/fontScale1.0/THREE_BUTTON에서 폼폭·월합계200/150·네계절지출·K14/K15/K22/K23 scoped revalidation PASS. 과거OPEN4는 이번delta로대체하되 다른22PASS·gate12는이전증거재사용이다. 38개전체최종APK재실행·ALL_PATHS_PASS·iOS·확대글꼴·장기성능으로확대하지않는다.
- 보호baseline1690파일누락0·unrelatedhash변경0·최종설치후sourcedelta0. 기존QA100/사진/댓글·APK/AAB·build출력·signing보존. STAGED NONE, COMMIT NO, PUSH NO, CLEANUP NO. DIRTY_QA_NOT_STORE_RC, STORE HOLD, IMPLEMENTED_PENDING_PO_APPROVAL. GLOBAL_CTA별도시각한계2개와운영/Store게이트는유지한다.
- DEVICE_OWNER PO, CODEX_UI_CONTROL STOPPED_AFTER_QA. 다음한작업은이번설치후보PO검토이며추가구현·빌드·설치·cleanup은자동시작하지않는다. 아래후보들은당시이력이다.
<!-- NURI_GLASS_EXPENSES_20261008_END -->

<!-- NURI_KEYBOARD_OPEN_DEFECT_20261008_BEGIN -->
## 2026-10-08 최신 키보드 후보 결함 경계

- [OPEN corrective native 보고서](nuri-global-keyboard-open-defect-final-corrective-2026-10-08.md): K29 PASS, K14/K15/K23 FAIL, K22 layout 회귀 OPEN. 현재 키보드 결함 4 K-ID가 있으므로 아래 과거 NO_KNOWN_FUNCTIONAL_BLOCKERS 및 bounded PASS를 현재 전체 승인으로 읽지 않는다.
- 타입 PASS·scoped lint 0 errors·대상 34 tests·최종 전체 190 suites/1,939 tests PASS. Full run 실제 2회(2번째 PO 추가 승인). 단위 테스트는 Weather native window/IME 복귀와 Community open-IME 48dp 여백 회귀를 보증하지 못했다.
- Incremental Release build/install-r 각 1회. APK `7f24f510a4fc2a3f3b3a9aebf2974918b635483fd72051b425a801f18af8783b`, installed match PASS; UID·최초 설치 시각·QA 로그인·선택 펫·기기 기본 설정 보존. DIRTY_QA_NOT_STORE_RC.
- 원장 38개 모두 accounted: PASS 22/OPEN 4/BLOCKED 6/NOT_REACHABLE 2/DEV 1/UNUSED 3. 설명 없는 NOT_RUN/PARTIAL/WIP 0. 이전 APK 증적 및 gate를 재사용했으며 ALL_PATHS_PASS·전체 E2E·Store 검증을 선언하지 않는다.
- MainActivity/global inset/공통 input/DB/Supabase 변경 0, 저장/전송/삭제 0, 정상 조회 counter 부수 효과는 별도 기록. 기존 source dirty·artifact·build outputs·QA 데이터 보존, staging/commit/push/cleanup 0.
- STORE HOLD. DEVICE_OWNER PO, CODEX_ADB_CONTROL STOPPED_AFTER_QA. 다음 한 작업은 남은 두 원인 묶음·K22 회귀의 PO 범위 검토다. 추가 구현·빌드·설치를 자동 시작하지 않는다.
<!-- NURI_KEYBOARD_OPEN_DEFECT_20261008_END -->

<!-- NURI_COMMUNITY_SEARCH_COMMENT_20261007_BEGIN -->
## 2026-10-07 최신 Community 후보 경계

- [검색·댓글 및 supporting polish](nuri-community-search-comment-corrective-2026-10-07.md): 타입 PASS·19파일 lint 오류 0/기존 경고 16·188 suites/1,917 tests PASS. 별도 승인 incremental Release/install-r 각 4회, 최신 APK e30a433d SHA·signer·embedded bundle 및 native base.apk 일치.
- 실제 model SM-S937N·384dp/fontScale 1.0에서 검색/메뉴/댓글/첫 reply keyboard 및 추억 분류·문구·흰색 X bounded PASS. 이전 frozen 문구/X의 미설치 표기는 이 설치로 해소됐다. 전체 device matrix·Store E2E·production 검색 benchmark는 미실행.
- 승인 migration의 read search 및 NULL HINT 처리만 적용. 기존 목록/create/guard hash·RLS/moderation 유지. 새 public read SECURITY DEFINER 권한 advisor 2 WARN은 공개해 기록하며 보안 전체 PASS로 승격하지 않는다.
- QA100·기존 기록/사진 보존, QA 댓글 2개·답글 1개 보존. Auth 한 QA row digest 변화의 실제 column 미확인. 정상 post counter/updated_at은 content 보존 비교에서 제외한다.
- DIRTY_QA_NOT_STORE_RC, IMPLEMENTED_PENDING_PO_APPROVAL. 기존 clean-RC dirty 거절을 우회하지 않았고 unrelated dirty/staging/cache/artifact를 보존했다. COMMIT NO, PUSH NO, CLEANUP NO, STORE HOLD, 다음 한 개 PO 후보 검토.
<!-- NURI_COMMUNITY_SEARCH_COMMENT_20261007_END -->

<!-- NURI_MEMORY_DETAIL_FINAL_FREEZE_20261007_BEGIN -->
## 2026-10-07 추억 상세 source 동결 경계

- PO 디자인 승인: COMPLETE_FROZEN_BY_PO_APPROVAL. [최종 동결 보고서](nuri-timeline-memory-detail-final-freeze-2026-10-07.md)의 상세·추가 corrective 범위만 승인한다. 아래 PO_PENDING은 이 승인 전 후보 이력이다.
- 직전 타입·대상 80개·전체 1,906개 PASS·lint 오류 0, 현재 e37ac813 APK의 선별 native QA. 마지막 문구·정렬·흰색 X는 source에 포함하지만 미설치·native NOT_RUN이다. 이번 Git closeout의 신규 build/test/install/device/DB/cleanup은 0회다.
- 이전 documentation/storage dirty 전체를 등록하지 않고 HEAD에 이 블록만 선별한다. QA 3기록·3사진·QA100·기존 APK/AAB·서명·build cache는 유지한다.
- 최종 clean RC·전체 native/large-font matrix·장기 crash 회귀·운영 유예 게이트·GLOBAL_CTA 두 시각 한계는 기존대로 남는다. PO source 동결은 이 검증의 PASS나 Store 제출 승인이 아니다.
- STORE: HOLD. AUTO_START_NEXT_WORK: NO. NEXT_ACTION: PO NEXT DESIGN DIRECTION.
<!-- NURI_MEMORY_DETAIL_FINAL_FREEZE_20261007_END -->

<!-- NURI_TIMELINE_FINAL_FREEZE_20261007_BEGIN -->
## 2026-10-07 Timeline 최종 승인 종료

- [x] PO최종승인: control13sp/category label·count12sp, 기존padding·44dp touch·4계절·65%glass·실제통계계약유지.
- [x] 임시670XP/1,111개preview모듈·연결·전용테스트제거. 실제507XP=원장507,canonical11·Progress23% read-only/렌더검증. DBreset/backfill없음.
- [x] TypeScript·lint0errors/새issue0/기존warning1·대상20/375·전체183/1,860·diff PASS.
- [x] 증분Release217.525초/install-r15.430초각1회,24b21ea0·원본픽셀·UID/설정MATCH. clean/uninstall/clear-data/앱화면조작없음.
- [x] 이번20개데이터영역·RLS/policy·263함수hashMATCH·QA100유지,remote추가mutation0. 이미반영된펫별shared산책3회와계정150XP는보존.
- [x] PO디자인동결범위확정. 최종선별commit/origin/CI확인은 /private/tmp/nuri-timeline-final-freeze-20261007-074201/FINAL_REPORT.md가소유한다. 공유문서무관한dirty·산출물유지.
- [ ] 기존지정색작은글자대비경계·native확대/다른기기·영구XP앱저장·다중세션부하·PRE_STORE운영게이트는별도검증이다. PO디자인승인을Store전체승인으로취급하지않는다.
- TIMELINE_DESIGN=COMPLETE_FROZEN,Store HOLD,cleanup NO. 아래preview승인대기는역사기록이며현재다시열지않는다. 다음1개는PO NEXT DESIGN DIRECTION 대기다.
<!-- NURI_TIMELINE_FINAL_FREEZE_20261007_END -->

<!-- NURI_TIMELINE_STATS_READABILITY_20261007_BEGIN -->
## 2026-10-07 Timeline Readability / Temporary Numeric Review Gate

- [x] white alpha65%·목표XP #243042·월/정렬 visible3dp/44dp tap. 계절tokens·원본·기존기능보존,로컬합성분석과native시각QA분리.
- [x] PO승인QA화면표시670XP/1,111기록·Progress88%. 실제QA507/11·원장/store/list/filter유지,조건불일치/오류/로딩시원본통과·preview off복귀테스트.
- [x] 타입/lint새issue0·대상20/383·전체183/1,868·diff PASS.증분Release212.177초/install-r15.577초각1회,f6577720·UID/설정·source/input/PNG보존.
- [ ] PO설치후가독성/큰숫자/Progress시각승인.이번native실행/캡처0회이며설치확인은렌더증거가아니다.
- [ ] 최종승인closeout전임시preview모듈/연결제거,최신실제값복귀·재검증·실제값후보설치후승인Timeline선별commit/push·동결.임시표시를Store/승인커밋에남기지않는다.
- public/Storage19영역·정책/263함수·QA100MATCH,DBmutation0.Auth56행hash변동/원인컬럼전체미확인은별도경계다.현재commit/push/freeze/cleanup/Store NO.보고서 docs/qa/nuri-timeline-statistics-readability-preview-2026-10-07.md.
<!-- NURI_TIMELINE_STATS_READABILITY_20261007_END -->

<!-- NURI_TIMELINE_STATISTICS_WALK_XP_20261007_BEGIN -->
## 2026-10-07 Timeline Statistics / Per-Pet Walk XP Candidate

- [x] 승인된 payout function 한 곳의 shared walk3/pet/KST, null-pet guard, account budget150 및 xact lock 이관. local/remote migration20261006220017 일치, ACL/owner/RLS·다른함수 보존.
- [x] 실제 RPC525→564/642 및675→714로 Progress30→46/77 및level-up90→5 검증. 펫/기록/QA100 보호19영역 count/hash·다른262함수 MATCH, rollback-only XP QA, 영구 콘텐츠 mutation0.
- [x] 통계50%·우측 브랜드 제거·월/정렬2dp face와44dp tap, 큰 숫자 자연 높이, focus refresh 로컬 검증.
- [ ] PO 설치 후보 시각 승인. Native 앱 작성으로 영구 XP 증가·다중 세션 부하·native 큰 글꼴 matrix는 미실행이며 SQL/렌더 QA와 구분한다.
- [x] TypeScript·lint 새 issue0·대상19/365·전체182/1,850·diff PASS. 증분 Release206.221초/install-r15.759초 각1회,61실행/934재사용, ef2b4a03 및 UID/설정 보존 MATCH.
- Store HOLD, commit/push/freeze/cleanup·다음 디자인 자동 시작 NO. 세부 결과는 docs/qa/nuri-timeline-statistics-walk-xp-2026-10-07.md에 기록한다.
<!-- NURI_TIMELINE_STATISTICS_WALK_XP_20261007_END -->

<!-- NURI_COMMUNITY_AUTUMN_FREEZE_20261007_BEGIN -->
## 2026-10-07 Community Autumn Frozen

- PO 최신 지시로 COMMUNITY_AUTUMN_DESIGN=COMPLETE_FROZEN. 상태 표시줄 아래 원본 히어로·compact 흰 목록·카테고리 고유 색·목록 footer 계약을 승인 종료한다. 겨울/봄/여름 자산·전역 effectiveSeason은 보존하며 자동 가을 강제나 다른 계절의 새 시각 승인을 만들지 않는다.
- 마지막 보완: pagination borderTop 제거, 작성/맨 위로 그룹 bottom 약76→12dp. native 두 버튼 약64dp 하향, 마지막행→버튼 약12dp·버튼→toolbar 약16dp·작성→toolbar 약12dp, 흰 plus/크기/기능 유지.
- TypeScript·커뮤니티 lint 0/0·13 suites/313 tests·전체180 suites/1,810 tests·diff PASS. 증분 Release/install-r 각1회(241.522초/15.263초), 최신4d46d0bb. S24 첫/중간/끝/질문25/0건·360/384/약430dp·font1.0/1.3/1.5 대표 검증 PASS, 설정/전체/전체/30개/1페이지 복구, bounded FATAL/ANR/RN_FATAL0.
- QA100·기존784행·나머지21보호영역 및 정책/trigger/함수 MATCH. auth.users는56건 동일이나 전체 행 hash 변동, 원인 컬럼 미확인이다. 명시적 Auth/DB mutation 없음. 삭제 preview 미실행, build/cache/APK/증적/원본/무관한 dirty 보존.
- 소스 커밋 `0c075cc90911a876900fa9a8d05419bb42a6b646` origin 일치 확인. 문서도 커뮤니티 블록만 선별하며 타임라인3파일·Weather/저장공간/Home 등 잔여 dirty는 커밋하지 않는다. 설치 APK에는 이전 타임라인 후보가 유지되어 clean Store RC로 분류하지 않는다.
- AUTH/WEATHER/API COMPLETE_FROZEN, Store HOLD, cleanup/QA삭제/다음작업 자동 시작 NO. 다음 1개는 PO NEXT DESIGN DIRECTION 대기다. 보고서 `docs/qa/nuri-community-autumn-freeze-2026-10-07.md`, 증적 `/private/tmp/nuri-community-autumn-closeout-20261007-032614`. 아래 후보/승인대기 기록은 당시 이력이며 현재 가을 승인 상태를 재개하지 않는다.
<!-- NURI_COMMUNITY_AUTUMN_FREEZE_20261007_END -->

<!-- NURI_COMMUNITY_PAGINATION_BOTTOM_SPACING_20261007_BEGIN -->
## 2026-10-07 Community Bottom Spacing and Timeline FAB Candidate

- [x] 원인 확인: footer 뒤 FAB 예약72/128dp 제거, content bottom12dp 단일 소유. measured toolbar/Safe Area 재사용, populated footer 및 empty-result stretch 분리, pagination/nav에 overlay 침범 없음.
- [x] Timeline은 Community와 같은48dp seasonal Primary 원형·24dp white plus·그림자 없음. toolbar+12dp·우측16dp와 기존 기록하기 callback 유지. Hero/행/카테고리/toolbar/Auth/Weather/서버 변경 없음.
- [x] TypeScript·대상13 suites/313 tests·diff PASS. lint0 errors/2 baseline warnings/0 new issues. 증분 Release/install-r 각1회 PASS, 최신 ac824581,240.177초/15.395초, source/input/installed hash MATCH.
- [x] Galaxy S24 첫/중간/마지막/질문25/0건·이전 복귀·대표360/384/약430dp·font1.0/1.3/1.5 PASS. 간격12.33~12.44dp 및15.64~16dp, touch44dp pixel rounding·문구 containment·중앙 hit area·설정/전체/30개/1페이지 복구. bounded FATAL/ANR/RN_FATAL0.
- [x] QA100·기존784행·보호22영역 count/hash·RLS/trigger/핵심함수 보존. DB mutation0. 기존 dirty/body/APK/build/cache/evidence 유지, staged/commit/push/cleanup NO.
- [ ] PO COMMUNITY PAGINATION VISUAL APPROVAL. 실제 상세/등록 실행은 카운터·데이터 보호로 미실행, 다른기기/iOS·모든 폭×font 조합 미검증. 우측 행 일부 가림 및 기존 확대 nav 라벨 밀집은 보호 범위 관찰이다. Store HOLD, 다음 작업 자동 시작 NO.
<!-- NURI_COMMUNITY_PAGINATION_BOTTOM_SPACING_20261007_END -->

<!-- NURI_COMMUNITY_PAGINATION_QA_20261007_BEGIN -->
## 2026-10-07 Community Pagination + QA 100 Candidate

- [x] Compact pagination: content-width, 13sp/18sp/600, horizontal 14dp, radius 6dp, 44dp touch; no shadow/elevation/fixed width; existing cursor/filters/page-size preserved.
- [x] TypeScript; targeted ESLint 0 errors/0 warnings; 9 suites/289 tests; full 180 suites/1,801 tests once; diff check PASS.
- [x] Linked `grmekesqoydylqmyvfke`, safely resolved existing QA author, one transactional authenticated/RLS seed; 100 rows, 25 per category, unique past timestamps/sequence/marker, no images/counters/reports or schema/policy changes.
- [x] Total 784→884/public 3→103; existing-row hashes and 22 protected domains preserved. Authenticated list RPC walk: 30/30/30/13, no duplicate/missing IDs, stable order.
- [x] Incremental Release/install-r once, APK `9bc70167`; S24 first/middle/last/return, filter reset, empty bottom, 50→30 selector, 360dp/fontScale 1.3 PASS; original device settings restored; bounded FATAL/ANR/RN_FATAL 0.
- [x] 100 inserted IDs + batch + cleanup-preview created, preview/delete NOT executed; QA posts preserved for PO review; prior APKs/evidence/build/cache/source/dirty preserved.
- [ ] PO COMMUNITY REVIEW of current candidate. No commit/push/cleanup, Auth/Weather/API frozen, Store HOLD. This is not release authorization.

Report: `docs/qa/nuri-community-pagination-qa-2026-10-07.md`.
<!-- NURI_COMMUNITY_PAGINATION_QA_20261007_END -->

<!-- NURI_COMMUNITY_PANEL_COMPOSE_POLISH_20261007_BEGIN -->
## 2026-10-07 Community panel and compose polish PO gate

- [x] Raise the full white list/filter panel by width-scaled 29/883 overlap; source y=410. Preserve each original 883x439 image and visible feet; skip overlap for image-error fallback.
- [x] Keep pagination centered outside the list. Fix compose 12dp above pagination with a 48dp target and explicit white original Feather plus. Stack scroll-to-top separately with a 12dp gap and reserve last-row scroll clearance.
- [x] Preserve top safe-area, overlay header, compact rows, seasonal assets, write gates/callbacks, Auth, Weather, API and existing dirty source.
- [x] TypeScript, targeted ESLint and diff PASS; targeted 9 suites/289 tests PASS; full 180 suites/1,801 tests PASS once.
- [x] Incremental Release once, 231.739s; 61 executed/934 up-to-date. Galaxy S24 install-r once, 15.251s; installed SHA `861b211c` matches, UID/first install/settings unchanged. APK image pixels and source/input fingerprints match.
- [ ] PO direct native review of feet/panel boundary, white plus above pagination, scroll/top-button clearance and status bar. No native screen operation or capture by agent; FATAL/ANR/RN_FATAL not measured.
- [ ] PO visual approval and later authorized selective Git closeout. This uncommitted design APK is not Store RC. No commit, push, cleanup or automatic next work.
<!-- NURI_COMMUNITY_PANEL_COMPOSE_POLISH_20261007_END -->

<!-- NURI_COMMUNITY_SAFE_AREA_COMPOSE_20261007_BEGIN -->
## 2026-10-07 Community safe-area and fixed compose PO gate

- [x] Reserve the status-bar inset once at screen root; artwork starts immediately below it. Header stays over the single original canvas with only 8dp inner padding; no top write CTA, separate header band or global system-bar change.
- [x] Fixed 48dp seasonal Primary plus at footer right, accessible `게시글 작성`; balanced slots keep arrow-only pagination/page number centered and above the measured toolbar. Preserve login gate, notice restriction, callbacks, original assets and compact rows.
- [x] TypeScript/scoped lint 0 errors/0 warnings; targeted 8 suites/127 tests PASS; full 180 suites/1,801 tests PASS once; diff check PASS. Initial icon/Text selector failure retained and repaired.
- [x] Incremental Release/install-r once each PASS: 270.427s, 61 executed/934 up-to-date; install 15.458s; candidate `76c13adb`. Source/input, signature, bundle markers, four decoded images, installed hash/UID/first-install/settings MATCH.
- [ ] PO direct native review: status-bar boundary, four-season overlay/copy readability, fixed plus/pagination/navigation spacing, narrow/large-font/long-list behavior. No app launch/touch/capture/settings change this candidate; FATAL/ANR/RN_FATAL unmeasured.
- [x] Preserve AUTH/WEATHER/API/admin/backend, QA, unrelated dirty, previous report bodies/evidence/APKs and Android outputs/cache. No staging/commit/push/cleanup/Store/automatic next work. Not a Store RC.
- Report `docs/qa/nuri-community-safe-area-compose-2026-10-07.md`; evidence `/private/tmp/nuri-community-safe-area-compose-20261007-000148`.
<!-- NURI_COMMUNITY_SAFE_AREA_COMPOSE_20261007_END -->

<!-- NURI_COMMUNITY_TOP_ANCHOR_20261006_BEGIN -->
## 2026-10-06 Community original-canvas top anchor PO gate

- 최신 `ed3f9d2f`는 상단 풍경 확장이 아니라 원본 top 0 정렬 설치 후보이며 Store RC가 아니다. 이전 `37447d7e`를 PO 시각 승인으로 처리하지 않는다.
- TypeScript/lint 0 errors/0 warnings·대상 8 suites/117 tests·전체 180 suites/1,791 tests PASS. 전체 실행 2회 모두 PASS, 최종 source 로그 구분 보존. diff check PASS.
- 증분 Release/install-r 각각 1회 PASS. source/input·4장 pixels·설치 hash/UID/최초 설치/화면 설정 MATCH. 앱 실행/터치/캡처 없음. native 시각/확대 글꼴/다른 기기/iOS·FATAL/ANR/RN_FATAL 미확인.
- PO 승인 PENDING. Auth/Weather/API·서버·QA·dirty·이전 보고서/증적/APK·build/cache 보존. Git/cleanup/Store/추가 작업 NO. 증적 `/private/tmp/nuri-community-top-anchor-20261006-233845`, 보고서 `docs/qa/nuri-community-top-anchor-2026-10-06.md`.
<!-- NURI_COMMUNITY_TOP_ANCHOR_20261006_END -->

<!-- NURI_COMMUNITY_OVERLAY_HEADER_20261006_BEGIN -->
## 2026-10-06 Community overlay header PO candidate gate

- `37447d7e`는 이미지 위 header·화살표 pagination 보완 설치 후보이며 Store RC가 아니다. 이전 `4774073c`의 계절색 header 연결을 승인 완료로 처리하지 않는다.
- TypeScript PASS, targeted lint 0 errors/0 warnings, 8 suites/117 tests PASS, full 180 suites/1,791 tests 1회 PASS, diff check PASS. 최초 lint/대상 테스트 OOM과 보완 로그 보존.
- Release 1회/install-r 1회 PASS. source/input·원본 4장 decoded pixels·설치 hash/UID/최초 설치/화면 설정 MATCH. 기기 화면 조작/캡처 없음, native visual/fontScale/다른 기기/iOS·FATAL/ANR/RN_FATAL 미확인.
- PO VISUAL APPROVAL PENDING. AUTH/Weather/API frozen, backend/QA/dirty/이전 보고서/증적/APK/build/cache 보존. commit/push/cleanup/Store/추가 작업 NO.
- 증적 `/private/tmp/nuri-community-overlay-header-20261006-231811`, 보고서 `docs/qa/nuri-community-overlay-header-2026-10-06.md`.
<!-- NURI_COMMUNITY_OVERLAY_HEADER_20261006_END -->

<!-- NURI_COMMUNITY_COMPOSITION_20261006_BEGIN -->
## 2026-10-06 Community Composition Candidate

- [x] Preserve native compact rows/comment rail, exact artwork/ratio, approved seasonal palette, white list/gray inactive chips, fixed pagination and callbacks. Opt-in list header options plus edge connection; no full-image header crop/stretch.
- [x] Reduce visual chip face to 32dp while retaining 44dp touch; natural control heights, lighter title/labels and compact pagination. Local widths 360/384/400/430/768dp and default header regression covered.
- [x] TypeScript/scoped lint 0 errors/0 warnings, targeted 8 suites/114 tests, full 180 suites/1,788 tests once PASS. Initial fixture/selector failures retained after repair; diff check PASS.
- [x] Additional incremental Release/install-r once each PASS. 244.840s; 61 executed/934 up-to-date; candidate `4774073c`. Source/input, signed embedded bundle/font, four decoded bitmaps, installed hash/UID/first-install/settings MATCH.
- [ ] PO direct native review: four-season header/top blend/tabs/chips/page controls, large-font/narrow clipping, long-list scroll, artwork legibility. No app launch/touch/capture this candidate; fatal counters unmeasured, no prior native PASS reused.
- [x] Preserve AUTH/Weather/API/admin, pet personalization, QA/unrelated dirty, previous document bodies/evidence/APKs and Android outputs/cache. No staging/commit/push/cleanup/remote/Store/automatic next task. Existing CTA limitations remain separate.
- Report: `docs/qa/nuri-community-composition-2026-10-06.md`; evidence `/private/tmp/nuri-community-composition-20261006-225113`.
<!-- NURI_COMMUNITY_COMPOSITION_20261006_END -->

<!-- NURI_COMMUNITY_HERO_CORRECTIVE_20261006_BEGIN -->
## 2026-10-06 Community Hero Native Corrective Candidate

- [x] Reproduced oversized/cropped hero in `483f29e5`: 1080×1234px versus expected 1080×536.942px. Override both RN intrinsic dimensions with measured viewport width and original ratio height; preserve four assets and callbacks.
- [x] TypeScript, scoped lint 0 errors/0 warnings, targeted 8 suites/112 tests, full 180 suites/1,786 tests PASS once this corrective. Numeric sizing at 360/384/400/430/768dp, fallback, resize and invalid-layout guards covered.
- [x] Additional Release/install-r once each PASS, 235.609s, 61 executed/934 up-to-date. Current candidate `fa7fdaa8`; source/input, signature, four decoded images, installed hash/UID/first-install/settings MATCH.
- [x] S24 384dp/fontScale 1.0 four seasons: 1080×537px, whole composition/copy, compact three rows and unchanged fixed footer; visible autumn restored. Bounded QA log FATAL 0/RN error lines 0/ANR 0; no content mutation or device-settings change.
- [ ] PO visual approval. Large fonts, other devices, iOS, long-list overflow after correction and attachment indicator native remain unverified. Three existing rows fit; upward gesture did not create an offset. Earlier static-only ratio claim is not native evidence.
- [x] Preserve previous report/evidence/APKs, unrelated dirty, AUTH/Weather/API/admin, build/.cxx/.gradle/cache. No staging/commit/push/cleanup/Store. Existing unrelated CTA limitations remain open.
- Report: `docs/qa/nuri-community-hero-native-corrective-2026-10-06.md`; evidence `/private/tmp/nuri-community-hero-native-20261006-215829`. The following initial-candidate checklist is historical.
<!-- NURI_COMMUNITY_HERO_CORRECTIVE_20261006_END -->

<!-- NURI_COMMUNITY_SEASONAL_20261006_BEGIN -->
## 2026-10-06 Community Seasonal List PO Candidate

- [x] Exact four supplied seasonal PNGs, original ratio/contain, white list, seasonal tabs/chips, gray inactive chips, compact rows/category once/image attachment indicator. Existing backend and write/notice policies preserved.
- [x] Pagination outside FlatList; measured toolbar height consumed by Community only; standalone safe inset. Preserve other tab geometry and Home reselect.
- [x] TypeScript PASS, scoped ESLint 0 errors/0 warnings, targeted 8 suites/106 tests, final full 180 suites/1,780 tests PASS. Two full executions; initial formatting-only source guard failure retained.
- [x] Release build once PASS, 811.931s, 873 executed/112 cache/10 up-to-date. Recreated outputs after earlier cleanup; no new clean/rebuild.
- [x] APK signature/bundle/source/input PASS, 4 hero assets decoded-pixel match after resource-table mapping. Install-r once PASS; SHA `483f29e5`, UID/first-install/settings preserved.
- [ ] PO native visual approval: four seasons, bitmap text legibility, compact category/image indicator, filters, fixed footer and pagination callbacks, narrow/large-font clipping. Device UI operations delegated to PO; native/iOS/landscape/tablet QA unexecuted and fatal counters unmeasured.
- [x] AUTH/Weather/API/admin and unrelated dirty preserved. No remote changes/staging/commit/push/cleanup/Store. New build outputs/caches, original assets, candidate APK and old evidence retained.
- [ ] Existing CTA known limitations remain separate: duplicate Primary in empty Timeline and intermittent first-entry schedule-detail compositing.
- Report: `docs/qa/nuri-community-seasonal-list-2026-10-06.md`; evidence `/private/tmp/nuri-community-seasonal-hero-20261006-211950`.
<!-- NURI_COMMUNITY_SEASONAL_20261006_END -->

<!-- NURI_GLOBAL_CTA_APPROVAL_20261006_BEGIN -->
## 2026-10-06 Global CTA Final PO Approval and Freeze

- [x] PO final approval received for the reported candidate; selective commit/push and freeze authorized. Earlier candidate approval-pending items are history.
- [x] Preserve validated runtime, tests and installed candidate `7cd74281`; no new tests/build/install/device operations/remote deployment or cleanup in this closeout.
- [x] Include direct schedule-detail dependencies with CTA changes; exclude unrelated dirty and shared-document sections. Git outcome belongs to `/private/tmp/nuri-global-cta-approval-closeout-20261006-194340/FINAL_REPORT.md`.
- [ ] Known limitations remain unfixed: duplicate solid Primary on empty Timeline; intermittent first-entry schedule-detail compositing/contrast failure. Final PO approval does not change the technical native result to PASS.
- [ ] Previously unexecuted mutation/iOS/long-term QA remain unverified. No automatic corrective execution or Store authorization.
- [x] AUTH/Weather/API frozen, QA/evidence/APK/build cache preserved. NEXT_STATE=WAITING_FOR_PO_NEXT_DESIGN_DIRECTION; Store HOLD.
- Approval contract: `docs/qa/nuri-global-cta-final-approval-2026-10-06.md`.
<!-- NURI_GLOBAL_CTA_APPROVAL_20261006_END -->

<!-- NURI_GLOBAL_CTA_20261006_BEGIN -->
## 2026-10-06 Global Role-Based CTA PO Candidate

- [x] Typed role + global effectiveSeason; autumn #B95000; seasonal Primary separated from personal pet theme.
- [x] Schedule detail Edit/Complete/Delete entry hierarchy, explicit confirm/cancel roles, neutral draft-preserving exit/logout, cleanup distinct from final deletion.
- [x] Shared opt-in preserves AUTH/Weather/admin/onboarding/PetCreate, native Alert appearance, backgrounds/glass/icons/personalization and existing callback contract.
- [x] TypeScript PASS; scoped lint 0 errors, 33 unchanged baseline warnings; targeted 13 suites/112 tests PASS. Final full run 179 suites/1,759 tests PASS after test compatibility repair; 2 full executions in total, initial failure retained.
- [x] Incremental Release/install-r once each PASS; 212.787s, 61 executed/934 up-to-date; installed candidate SHA `7cd74281`, signature/input/source and UID/first install preserved.
- [x] Native seasonal matrix 16 verified views, final-delete dialog opened/cancelled, dedicated disabled state, 360dp/system fontScale 1.5 stacked detail actions; original season/density/font restored. No destructive mutation; bounded QA FATAL/ANR/RN_FATAL 0.
- [ ] Corrective: Timeline empty CTA and floating CTA are both solid Primary. Detail first-entry native compositing can wash out the palette (observed 2.66~3.02:1); re-entry is not a fix. Additional execution awaits PO response. Overall native acceptance is not PASS.
- [ ] PO visual approval and subsequent selective Git closeout. No staging/commit/push/cleanup/Store; preserve QA/unrelated dirty/protected evidence/build cache.
- Contract `docs/domains/cta-role-system.md`; evidence `/private/tmp/nuri-global-cta-role-system-20261006-183103/FINAL_REPORT.md`.
<!-- NURI_GLOBAL_CTA_20261006_END -->

<!-- NURI_SCHEDULE_DETAIL_20261006_BEGIN -->
## 2026-10-06 Schedule Detail Installed PO Candidate

- [x] Approved detail redesign: exact ScheduleList seasonal reading canvas, Home frosted material, date-first hierarchy, compact metadata/memo, original icon color and no pencil on Edit.
- [x] Partial completion update, no automatic record creation, explicit schedule-origin RecordCreate, scoped drafts/pending link recovery and schedule-aware record return. Existing DB/RLS/FK contract reused; no migration/policy/Edge/QA data mutation.
- [x] TypeScript PASS, scoped ESLint 0 errors/0 warnings, 20 suites/188 focused tests and full 176 suites/1,720 tests PASS.
- [x] One incremental Release PASS, 237.827 seconds, 61 executed/934 up-to-date. One install-r PASS. SHA `5b075cd8d52a9542973f949fb09dd6cbb9e1be39b74ce14a7ac6475d80cfb12d`. Source/input, signer/bundle/font and installed hash/UID/first-install/settings MATCH. Model `SM-S937N`. No clean/new AAB/launch/touch/capture.
- [ ] PO native visual review, long content/enlarged fonts, actual completion/record/link/edit/back flow, alarm delivery and iOS: not executed by this installation task.
- [ ] PO final approval and selective Git closeout: pending. No commit/push/cleanup/Store. Preserve unrelated shared-document content, QA, protected artifacts/reports and incremental outputs/cache. AUTH/Weather UI/API remain frozen.
- Contract: `docs/domains/schedule-detail-design.md`. Evidence: `/private/tmp/nuri-schedule-detail-20261006/FINAL_REPORT.md`.
<!-- NURI_SCHEDULE_DETAIL_20261006_END -->

<!-- NURI_WEATHER_FINAL_APPROVAL_20261006_BEGIN -->
## 2026-10-06 Weather PO Final Approval Closeout

- [x] PO final approval recorded for seasonal artwork, actual Home background hue, no-panel alignment, lower continuity and the 30-minute contract. Prior pending entries below are historical candidate records.
- [x] Remove only the Weather detail seasonal review controls/component; preserve title/back, Home review controls, shared preference and real weather/day phase.
- [x] Current source: TypeScript PASS, scoped ESLint 0 errors/0 warnings, 22 suites/325 focused tests and full 171 suites/1,676 tests PASS.
- [x] Selective Git scope: approved Weather implementation/tests, 22 runtime artwork assets, artwork/generation manifests and Weather portions of shared documentation. Leave unrelated shared-document changes and other dirty files unstaged.
- [x] No new build/install/device operation/remote deployment/cleanup. Existing installed `60bc57d7` still has the review buttons; source removal is not installed. Preserve original PNGs, QA, protected APK/AAB/reports and incremental outputs/cache.
- [ ] Full native weather/day matrix, enlarged fonts, iOS and quantitative raw-image contrast: not performed by this closeout; PO approval is not execution evidence for these checks.
- PRE_STORE operational gates preserved; AUTH/API frozen; Store HOLD; wait for PO NEXT DESIGN DIRECTION. Git/asset preservation evidence: `/private/tmp/nuri-weather-approval-closeout-20261006/FINAL_REPORT.md`.
<!-- NURI_WEATHER_FINAL_APPROVAL_20261006_END -->

<!-- NURI_WEATHER_HOME_PALETTE_20261006_BEGIN -->
## 2026-10-06 Weather Hero Actual Home Background Hue Installed Candidate

- PO explicitly selected the original background hue, not a darker related hue. Autumn `#F7C896`, winter `#D4EAFE`, spring `#FFDCE7`, summer `#C9F2F8` apply to the five hero information text fields in both day and night. Consume `HomeAmbientVisual.primaryColor` shared with the existing background wash; do not change Home rendering values.
- Preserve location icon's previous day/night color, hero no-panel layout/53dp temperature/recent 24dp, 22 artwork assets/lower blend/upper rollback/season controls/30-minute API/AUTH/QA/dirty/build outputs-cache.
- Current source PASS: TypeScript, scoped ESLint 0 errors/0 warnings, 22 suites/325 tests, full 171 suites/1,676 tests, diff check. Following PO install authorization, one incremental Release 259.214 seconds (61 executed/934 up-to-date) and one install-r PASS. Latest SHA `60bc57d7fd9a205bd9058cc30c5491d7189ce13d069492338fec70e52207332e`. Source/inputs, signer/bundle/font/22 artwork hashes/palette markers and installed hash/UID/first install/settings MATCH. Model `SM-S937N`.
- No launch/touch/capture/remote/commit/push/cleanup/Store. Native contrast and visual approval remain unverified; pastel colors are not claimed as universally accessible over all artwork.
- Report: `/private/tmp/nuri-weather-home-palette-20261006/FINAL_REPORT.md`.
<!-- NURI_WEATHER_HOME_PALETTE_20261006_END -->

<!-- NURI_WEATHER_HERO_ALIGN_20261006_BEGIN -->
## 2026-10-06 Weather Hero No-Panel Alignment Installed Candidate

- Latest PO rescinded the hero glass only. Remove blur/tint/rim/internal padding/width cap. Align information at horizontal 18dp/top 12dp; temperature 56→53dp, line height 60→57dp. Keep recent-state 24dp, approved seasonal foreground, real copy/data, icons and other detail glass cards.
- PASS current source: TypeScript, scoped ESLint 0 errors/0 warnings, 19 suites/270 focused tests, full 171 suites/1,672 tests. Assert hero blur absence, alignment/size/natural layout/season-state contract. Retired panel contrast assertions are not current raw-image contrast evidence; native visual/font/weather matrix remains unverified.
- One incremental Release 216.654 seconds (61 executed/934 up-to-date) and one install-r PASS. SHA `0c6f0ae0e6786ac02a692786828e5e4c208c7d7e666e666798825af09e1dc575`. Source/inputs, signer/bundle/font/22 artwork hashes, glass/tint/upper blend absent and information/lower blend/season controls present, installed hash/UID/first install/settings MATCH. Model `SM-S937N`.
- Preserve images/lower blend/upper rollback/season controls/30-minute API/AUTH/QA/unrelated dirty/protected artifacts-reports/incremental outputs-cache. No native launch/touch/capture/remote/commit/push/cleanup/Store. Await PO visual acceptance. Report: `/private/tmp/nuri-weather-hero-align-20261006/FINAL_REPORT.md`.
<!-- NURI_WEATHER_HERO_ALIGN_20261006_END -->

<!-- NURI_WEATHER_HERO_GLASS_20261006_BEGIN -->
## 2026-10-06 Weather Hero Reading Glass Installed Candidate

- PO requested a compact frosted surface for district/temperature/condition/high-low/feels-like. Reuse seasonal Weather primary/surface tokens: autumn brown, winter blue, spring rose, summer green; light-day/dark-night material, natural height and full available width for enlarged fonts. No new library/shared glass changes/shadow/reflection.
- PASS this source: TypeScript, scoped ESLint 0 errors/0 warnings, 19 suites/270 targeted tests, full 171 suites/1,672 tests. Eight seasonal day-night alpha/fallback contrast tests meet 4.5:1 (worst 4.53:1); not native visual or final accessibility evidence. Initial icon-Text counting test failures preserved separately.
- One incremental Release build 216.027 seconds (61 executed/934 up-to-date), one install-r PASS. SHA `6ac73be210d0f9c2b4d08a7870898c8b4179637583b463536edce3dcfac7dc6a`. Source/inputs, signer/bundle/font, 22 artwork hashes, glass/tint marker presence, upper blend absence/lower blend/season controls presence, installed hash/UID/first install/settings MATCH. Model `SM-S937N`.
- Preserve images/lower blend/upper rollback/season controls/30-minute API/AUTH/QA/unrelated dirty/protected APK-AAB-reports/incremental outputs-cache. No launch/touch/capture/remote change/commit/push/cleanup/Store. PO visual approval pending. Report: `/private/tmp/nuri-weather-hero-glass-20261006/FINAL_REPORT.md`.
<!-- NURI_WEATHER_HERO_GLASS_20261006_END -->

<!-- NURI_WEATHER_TOP_ROLLBACK_INSTALL_20261006_BEGIN -->
## 2026-10-06 Upper Rollback Installed Candidate

- PO authorized an additional incremental Release build/install-r: one each PASS. No new runtime edits. 218.611 seconds, 61 executed/934 up-to-date. SHA `f79127e76e694a0dfd72ee8eeca51e9afb5d69a09ebfcb2e3321ccbc1f08d2e2`.
- Source/inputs, APK signer/bundle/font, 22 packaged artwork hashes, upper blend marker absent/lower blend and season controls present, installed hash/UID/first-install/settings MATCH. Connected model `SM-S937N`.
- Reuse prior upper rollback TypeScript/scoped lint 0 errors/0 warnings and 19 suites/262 tests. Previous full suite 171/1,649 belongs to the earlier seasonal candidate; not rerun or claimed for this source. No remote deploy or native screen interaction/capture.
- PO visual acceptance pending. No commit/push/cleanup/Store. Preserve original/source-only reports, protected APK/AAB, source/artwork/QA/unrelated dirty and incremental outputs/cache. Report: `/private/tmp/nuri-weather-top-rollback-20261006/INSTALL_REPORT.md`.
<!-- NURI_WEATHER_TOP_ROLLBACK_INSTALL_20261006_END -->

<!-- NURI_WEATHER_TOP_ROLLBACK_20261006_BEGIN -->
## 2026-10-06 Upper Weather Blend Rollback

- PO rescinded upper continuity only: remove sky-colored header/status-bar surface, upper hero fade and joining margin compensation. Preserve seasonal controls, 22 artwork assets, typography/day-night contrast, lower 18% blend and 30-minute data contract.
- Source/local validation evidence: `/private/tmp/nuri-weather-top-rollback-20261006/FINAL_REPORT.md`. No additional build/install/device interaction/remote deployment. Installed `7c50e00d` still contains upper continuity; rollback native QA is not claimed.
- Local gates PASS: TypeScript, scoped ESLint 0 errors/0 warnings, 19 suites/262 tests, git diff check and baseline preservation. Full-suite and physical-device execution not repeated.
- Keep existing dirty, original artwork, protected APK/AAB/reports, QA and incremental build/cache. No commit/push/cleanup/Store. Await PO follow-up.
<!-- NURI_WEATHER_TOP_ROLLBACK_20261006_END -->

<!-- NURI_WEATHER_SEASONS_30M_20261006_BEGIN -->
## 2026-10-06 Seasonal Weather / 30-Minute Candidate

- PO-authorized exception: 18 winter/spring/summer artwork assets, 22 total including autumn, seasonal review controls, upper/lower visual continuity, fresh/active refresh 30 minutes. AUTH/provider architecture/icons/other Home UI unchanged.
- Artwork: original RGB-identical lossless WebP, no crop/resize. Real weather/day phase retained; autumn snow common fallback retained. Review controls use the existing device-local global season override.
- Backward compatibility: new header requests 30-minute freshness; previous v1/legacy responses retain 15 minutes. Shared cache 30-minute fresh/60-minute stale, existing rows/timestamps not extended or deleted.
- Remote linked project only: nuri-weather-v1 v2 / weather-cache v7 ACTIVE, all eight deployed files per function match local hashes. Smoke confirms 1800/900/3600 seconds, original timestamp/cache preservation, malformed coordinates 400 and unauthenticated gateway 401. No migration/policy/Auth/QA write.
- Gates PASS: TypeScript, scoped lint 0 errors/0 warnings, 19 suites/247 tests, 171 suites/1,649 full tests, git diff check. Incremental Release build 1 (273.904 seconds; 66 executed/929 up-to-date) and install-r 1 PASS. SHA `7c50e00dd386ebc03be76c9b375893ff3f2985aff5e486988d2b88cf28fcb16b`; 22 packaged artwork hashes, signer/bundle/font, installed hash/UID/first-install/settings match.
- PO chose install only: no app launch/touch/capture. Connected model `SM-S937N`. Browser composition checks at 320/390/1440 widths are not native QA. Native visual/font/weather matrix, 30-minute physical wait, iOS and long-run performance remain unverified.
- Final visual approval pending. No staged files/commit/push/cleanup/Store; preserve source, unrelated dirty, QA, original artwork, protected APK/AAB and incremental outputs/cache. Report: `/private/tmp/nuri-weather-seasons-20261006/FINAL_REPORT.md`.
<!-- NURI_WEATHER_SEASONS_30M_20261006_END -->

<!-- NURI_WEATHER_AUTUMN_HERO_20261006_BEGIN -->
## 2026-10-06 Autumn Weather Hero Candidate

- PO-authorized four autumn scenes: normal day/night and rain day/night. Autumn snow excluded; drafts/common snow/data and other-season originals preserved.
- Lossless RGB-identical assets; effective season + original weather/day-phase; smaller district/temperature; light/dark text and opaque bottom fade matching continuation.
- Type/lint/targeted/full suite/build/install evidence: `/private/tmp/nuri-weather-autumn-hero-20261006/FINAL_REPORT.md`. Final PO visual acceptance pending; native font/branch matrix is not inferred from source tests.
- Weather API v1 and AUTH frozen. Home/icons/QA/season controls remain; no commit/push/cleanup/Store; retain all incremental outputs/cache and protected evidence.
- Canonical visual contract: `docs/domains/weather-hero-artwork.md`.
- Local gates PASS: TypeScript, scoped lint 0 errors/0 warnings, 19 suites/218 focused tests, 171 suites/1,620 full tests, git diff check. Install/render approval remains a separate gate.
- Incremental Release build and install-r: one each PASS. Installed SHA `cbcd1dae45c8c09edee7568208909a72356c7b9b5b598f6168ff16da3a0b0d8b`; four packaged artwork hashes, signer/bundle/font, installed hash/UID/first-install/device settings MATCH. No native screen interaction or visual acceptance claimed. Daytime small-copy contrast remains for PO review; no additional corrective build/install run.
<!-- NURI_WEATHER_AUTUMN_HERO_20261006_END -->

<!-- NURI_WEATHER_API_V1_20261005_BEGIN -->
## 2026-10-06 NURI Weather API v1 core

- Weather API v1은 제품 UI와 Store 상용 운영 자격을 분리한다. API core 검증 PASS가 Store upload 승인 또는 예보 적중률 보장은 아니다.
- 계약/운영 절차: `docs/domains/weather-api-v1.md`. active Open-Meteo Forecast/AQ, 국내 관측/특보/AirKorea/nowcast READY_INACTIVE. 새 결제·키 발급 없음.
- 새 Edge v1와 legacy v6 각 8개 파일 local/remote SHA match. 15분 fresh/1시간 stale·0.02도 bucket·KST·원본 조회 시각·0/null을 유지한다. 동시 요청 8개에서 외부 forecast 1회+AQ 1회, TTL 900/3600초와 active lease 0 확인.
- 타입/lint 및 170 suites/1,595 tests PASS. 이전 Weather 고정 높이 assertion 12개만 승인된 minHeight 계약으로 보정했다. 증분 Release/실기기/Git 최종 결과는 `/private/tmp/nuri-weather-api-v1-20261005/FINAL_REPORT.md`를 따른다.
- QA row·계정·pet·AUTH·계절 control·기존 dirty·산출물/캐시를 보존한다. 새 weather 전용 운영 테이블만 추가했으며 기존 사용자/Storage/Auth 정책은 변경하지 않았다. Store HOLD, 디자인/Store 자동 시작 없음.
<!-- NURI_WEATHER_API_V1_20261005_END -->

<!-- NURI_WEATHER_UX_PO_CLOSEOUT_20261005_BEGIN -->
## 2026-10-05 Weather UX PO 승인 및 API 작업 분리

- PO가 Home Weather, 상세 화면, 시간대별 강수 UI와 현재 데이터 계약을 승인했다. 기존 아래 후보 기록의 승인 대기는 이 결정으로 종료한다.
- 승인 설치 후보 `6bf9ebf5`와 동일한 Weather runtime, 테스트, 기존 배포 v5 source를 선별 closeout한다. 무관한 dirty, QA, 계절 자산, AUTH, 빌드 산출물은 유지한다. 이번 Git closeout을 위해 재빌드·재설치·재배포하지 않는다.
- 다음은 별도 NURI Weather API v1 canonical 계약이다. NURI-owned 계약·provider adapter·분산 캐시/lease·비용 방어·관측성·앱 전환·remote 배포/검증을 수행하되 승인된 UI는 유지한다. 자격증명 없는 국내 provider는 READY_INACTIVE이며 외부 결제·키 발급·Store 작업은 하지 않는다.
- UX 증적: `/private/tmp/nuri-weather-ux-simplification-20261005`. 선별 Git 증적: `/private/tmp/nuri-weather-po-closeout-20261005`. 타입·lint·14 suites/128 tests 및 설치/화면 증적을 재사용한다. Full suite는 기존 167 suites/1544 tests 결과를 재사용한다.
- Store는 HOLD이며 상용 이용 자격·국내 provider 운영 자격·장기 예측 정확도는 별도 운영 게이트다.
<!-- NURI_WEATHER_UX_PO_CLOSEOUT_20261005_END -->

<!-- NURI_WEATHER_UX_20261005_BEGIN -->
## 2026-10-05 Weather UX Simplification Candidate

- [x] Exact species-neutral Home generic copy without pet substitution; preserve dynamic risk priority/copy. Fresh detail removes repeated technical metadata and retry; recent/error/unavailable retain concise state and retry. One source/disclaimer footer.
- [x] One existing frosted panel for hourly precipitation; measured responsive slots, small existing Nuri droplet, primary probability/tertiary mm, original hourly intervals and actual-zero/missing distinction. No image/icon edits or invented summary.
- [x] TypeScript PASS; scoped ESLint 0 errors/0 warnings; 14 suites/128 targeted tests; diff check PASS. Previous 167 suites/1544 full tests REUSED, not rerun.
- [x] Incremental Release1 (213.132s; 61 executed/934 up-to-date), install-r1; APK `6bf9ebf504d6b66e9003715ad16649e6553531862feb9718b7b45af33498613e`. Source/input/signature/bundle/font/installed hash/UID/first install/settings match. Uncommitted PO QA candidate, NOT Store RC.
- [x] Authorized Weather-only S24 native: exact Home body; fresh meta/retry absent; 3 unclipped hourly zero slots; forecast/AQ/sunrise-sunset/outdoor/footer; Home return. Bounded fatal/ANR/RN-fatal sample 0/0/0.
- [ ] PO visual approval. Native risk/stale/error/missing/many-slot/large-font variations, iOS, forecast accuracy and full performance NOT_VERIFIED this turn; source/targeted logic tests are distinct evidence.
- [ ] Commercial provider entitlement and production resilience/observability/location privacy gates before Store. Domestic observed/warning/AQ/nowcast and multi-source plan are proposals only, no new credentials/integration/deployment.
- [x] Preserve original data/refresh/TTL/v8 contracts, QA/account/Auth/season controls/assets, unrelated dirty and protected evidence. No commit/push/cleanup/AAB/Store; retain incremental build/.cxx/Gradle cache. Report `/private/tmp/nuri-weather-ux-simplification-20261005/FINAL_REPORT.md`.
<!-- NURI_WEATHER_UX_20261005_END -->

<!-- NURI_WEATHER_RELIABILITY_20261005_BEGIN -->
## 2026-10-05 Weather Reliability Candidate

- 구현/객관 검증: TypeScript PASS; scoped lint 0 errors/0 warnings; related 14 suites/119 tests; final full 167 suites/1544 tests; diff check PASS. weather-cache ACTIVE v5/source match; regional API response/hourly168/TTL900+3600/RLS preservation PASS.
- Release QA: incremental build1/adb install-r1 PASS; `eb0d2a01c346e1b93dffe4f2be37750fae6d43a53a08da3f39d1d8faaa9cba1e`; signer, debuggable=false, cleartext=false, embedded bundle/font, installed hash, UID/first install/settings PASS. Uncommitted QA candidate; not exact-commit Store RC.
- 증거 경계: native UI/자동 갱신 체감/새 GPS/performance/iOS/forecast skill NOT_VERIFIED. Provider free mode; commercial entitlement/KMA and AirKorea observation/alerts/distributed rate limit remain operational gates. Source tests are not forecast accuracy proof.
- PO approval PENDING. Assets/icons/QA/Auth/season controls protected; Store HOLD; no commit/push/cleanup/images. Report `/private/tmp/nuri-weather-reliability-20261005/FINAL_REPORT.md`.
<!-- NURI_WEATHER_RELIABILITY_20261005_END -->

<!-- NURI_WEATHER_SERVICE_20261005_BEGIN -->
## 2026-10-05 Weather Service Copy / Frosted Detail Candidate

- [x] Home inner district/date/copy/metric fills removed; outer frost and seasonal background preserved. Detail uses Home frost, single bottom inset owner and natural large-font metric height. No icon original or image asset edits/generation.
- [x] Read-only linked weather-cache ACTIVE v4 / response units verified. Normalize km/h wind to m/s; KST forecast/sunrise/sunset/fetched-at; daily maximum UV; PM2.5 boundary/concentrations; ozone μg/m³ without ppm grading. Remove fabricated pressure/visibility and fake missing zero/good values.
- [x] Shared species-neutral conditional advice and explicit model-prediction limits. Preserve existing day/night image resolver; no official KMA alerts/observations or hourly forecast integration. Cache v7 without deleting v6 entries.
- [x] TypeScript PASS; targeted lint 0 errors/0 warnings; 13 suites/101 targeted tests and 166 suites/1526 full tests PASS. Preserve initial interrupted full-run log separately from final successful run.
- [x] One incremental Release build (232.173s, 61 executed/934 up-to-date) and one S24 install-r. SHA `64fc31a4aab077cce1f6559d3e7eb0645fc02d5f0ccd0591d0e1064cd30d482f`; signer, embedded bundle/font, source/input, installed hash/UID/firstInstall/settings match. Uncommitted QA candidate, not Store RC.
- [ ] PO visual/UX approval of Home transparency and detail spacing/glass/copy. No app launch/touch/scroll/capture this turn; native contrast/motion/performance, large-font physical QA and iOS remain unverified.
- [x] No remote write/config/deploy, staging/commit/push or cleanup. Preserve QA/account/auth/season controls, unrelated dirty, protected APK/AAB/evidence and all incremental build/cache outputs. Before-to-after copy report: `/private/tmp/nuri-weather-service-design-20261005/FINAL_REPORT.md`. Store HOLD.
<!-- NURI_WEATHER_SERVICE_20261005_END -->

<!-- NURI_UX_PO_CLOSEOUT_20261005_BEGIN -->
## 2026-10-05 PO Approved Calendar / Frosted Home / Consolidated UX Closeout

- [x] PO final approval of the installed `28440d50` candidate, including Calendar/Home frost/autumn changes and consolidated input/list/modal UX. Prior pending-review entries below are historical and superseded.
- [x] Reuse TypeScript, lint 0 errors/28 existing warnings/0 new, 31 suites/512 targeted tests, 164 suites/1494 full tests and targeted S24 native evidence. Verify installed-candidate runtime source identity; no new runtime edit/build/install/device/DB operation.
- [x] Selective commit/normal push authorized for approved source/assets/tests/document blocks only. Preserve unrelated document bodies, research, Supabase temp, historical QA/designs and unused assets. Actual Git/preservation result: `/private/tmp/nuri-ux-po-closeout-20261005/git-final.json`.
- [x] Whole-app redesign inventory based on current route/screen/overlay source, not all-screen physical QA. Keep approved foundations and state/data/moderation contracts. Full candidate list: `/private/tmp/nuri-ux-po-closeout-20261005/FINAL_REPORT.md`.
- [x] AUTH frozen, QA/account preserved, season controls KEEP, Store HOLD. No cleanup without a new explicit instruction; build/cache/APK/evidence retained. No automatic next design. Existing iOS/other-keyboard/native-matrix/admin/community targeted proof/performance gaps are unchanged.
<!-- NURI_UX_PO_CLOSEOUT_20261005_END -->

<!-- NURI_UX_CONSOLIDATED_20261005_BEGIN -->
## 2026-10-05 Consolidated Schedule/Home/Input UX Candidate

- [x] Calendar opaque full-width sheet, measured keyboard viewport clamp, fixed header/X/footer, embedded NURI discard confirmation and first-close touch contract. Continue retains transient draft/focus/IME; no schedule save performed.
- [x] IME-open bottom-inset audit: Calendar/Weight/Tag/DatePicker/Password design gap, Weather root+content duplicate inset, CommunityEdit/Detail report/composer, GuideAdmin single controller. Existing RecordCreate/Profile/Auth contracts preserved. RecordEdit top/left/right SafeArea added without a new bottom inset.
- [x] Local TypeScript; targeted lint 0 errors/28 existing warnings/0 new; 31 suites/512 targeted tests and 164 suites/1494 full tests PASS. Structural audit covers 149 TSX/29 Modal declarations, not all-screen physical QA.
- [x] Four individually approved incremental release builds/install-r in this batch. Latest `28440d50de6afd93a1b25678ff9dd9f6db322640499dfaa698704aa441616014`, final build 263.419s/61 executed/934 up-to-date. Signer, embedded JS/font, source/input fingerprint, installed hash/UID/firstInstall PASS. Uncommitted design QA candidate, not Store RC.
- [x] S24 native evidence: Calendar settled header/X/save, first close/continue draft focus; Weight inputs/scroll/close; normal record/tag; indoor record CTA; CommunityCreate; final RecordEdit header below statusbar and stable through scroll with save/cancel above IME. Indoor action gap reduced 124dp to 12dp; Calendar approximately 13dp. PNG/XML are sequential; transitional captures are not final geometry proof.
- [x] Unchanged logic evidence reused for Home reselect/away-back position, Community Home tab recordings, four schedule filters and Timeline filtered-empty footer. Third-to-final runtime delta is RecordEdit only. Sampled motion has no sharp underlay/skeleton/Top layer; no universal ghost-free or full performance claim. Bounded final runtime fatal/ANR/RN error sample 0/0/0.
- [ ] PO final visual/UX approval. iOS, other physical keyboards/devices, this-turn native width/large-font matrix, password/admin entry, CommunityEdit/report/composer native targeted proof, schedule search persistence native proof and full performance remain unverified.
- [x] No QA save/edit/delete, DB/config/settings mutation, cleanup, staging, commit or push. Protected artifacts/evidence and unrelated dirty preserved. AUTH frozen, season controls KEEP, Store HOLD, build/cache retained. Evidence: `/private/tmp/nuri-ux-consolidated-20261005-173000/FINAL_REPORT.md`. Older pending Calendar clamp notes below are superseded by this candidate.
<!-- NURI_UX_CONSOLIDATED_20261005_END -->

<!-- NURI_SCHEDULE_NATIVE_20261005_BEGIN -->
## 2026-10-05 App-Wide Modal / Keyboard Structural Audit

- [x] Parse 150 TSX files and 29 native Modal declarations. Correct duplicated keyboard owners in Calendar/Weight/Password, fixed controls in Weight/Confirm/PetDelete, legacy ScheduleEdit bottom compensation, Health inner Pressable propagation and Calendar frame/rim/reading corners. Preserve consent, saving and callback contracts.
- [x] Local TypeScript, lint 0 errors/8 existing warnings, 20 targeted suites/278 tests and 162 full suites/1481 tests PASS, including the final keyboard viewport clamp. Structural regression fixtures detect the prohibited patterns; this is not all-screen native certification.
- [x] Two approved incremental Release builds/install-r. Current installed SHA-256 `36c239aac63fe951484edc6b2c9e55dbe48da4584bf6d24d18312ba90108ba75`; signer, embedded bundle, source/input fingerprint, installed hash, UID and first-install checks PASS. Build/cache preserved.
- [x] Native Weight header/close/save remain visible with input focus and keyboard scroll. Health insight/write-action blank touches do not dismiss. Calendar agenda is full width, round top corners and fixed actions above system navigation. Recorded transition samples mask sharp underlay during motion; small gfx intervals are not a full performance gate.
- [ ] Final Calendar keyboard clamp installed/native validated: 36c239aa still pushes header/close out of bounds after bottom note focus. Local measured-parent-height clamp is ready; additional build/install approval requested. Do not close this defect from local tests alone.
- [ ] PO final visual/UX approval; iOS, password modal unavailable to current OAuth account, onboarding/admin native flows and full performance gate remain unverified. Initial top ghost cause was not reproduced; no universal collision/ghost guarantee.
- [x] No QA/DB writes, logout, device-setting changes, cleanup, staging, commit or push. AUTH frozen, season controls KEEP, Store HOLD. Evidence: `/private/tmp/nuri-schedule-native-followup-20261005-132532/FINAL_REPORT.md`.
<!-- NURI_SCHEDULE_NATIVE_20261005_END -->

<!-- NURI_SCHEDULE_UX_20261005_BEGIN -->
## 2026-10-05 Schedule Readability, Sheet Motion and Home Top Return Candidate

- [x] Modal-local safe-area provider/view, translucent system bars and safe footer placement; readable search/form placeholders, secondary labels and original-geometry X control. Replace the fixed time column with time above title. Reduce schedule-list ornaments to small edge bubbles/lights while preserving Home decoration and seasonal assets.
- [x] Stationary backdrop fade and UI-thread sheet translation, 300ms entrance/240ms exit; invoke dismissal/detail/save completion only after successful exit. Measure agenda height, bound the sheet to the viewport and animate agenda/form height over 220ms. Preserve saving/draft guards and existing scheduling/notification contracts.
- [x] Home bottom-to-top return: remove the entire button layer before next-frame scrolling, remove Android ripple/elevation and prevent stale momentum/layout callbacks from redisplaying it. Preserve normal visibility and user-scroll behavior.
- [x] TypeScript/diff check PASS; targeted lint 0 errors/16 existing warnings; targeted 14 suites/244 tests and final full 159 suites/1457 tests PASS. One incremental Release build: 244.659 seconds, 995 tasks with 61 executed/934 up-to-date. One Galaxy S24 install-r PASS; SHA-256 `28a89fe74bee7e93ace3523dc3b0a25cca93b29793b3b701a874ed70a36af933`, signer/bundle/font/source/input/installed-hash/UID/first-install verification PASS. Uncommitted design QA APK, not an exact-commit Store RC.
- [ ] PO direct native approval: footer/system navigation separation, X/search/secondary legibility, long-title/agenda height, open/close/form/keyboard motion, bottom-to-top ghost and later button reappearance. Native motion/performance and iOS remain unverified. PO took over device QA during the build; after that, installation only. One old-candidate baseline screenshot is not new-candidate validation.
- [x] Existing QA metadata/protected APK/AAB/evidence/unrelated dirty retained. No DB changes, cleanup, staging, commit or push. Build/cache KEEP, AUTH frozen, season controls KEEP, Store HOLD. Evidence: `/private/tmp/nuri-schedule-ux-20261005-125000/FINAL_REPORT.md`.
<!-- NURI_SCHEDULE_UX_20261005_END -->

<!-- NURI_CALENDAR_COMPLETION_20261005_BEGIN -->
## 2026-10-05 Calendar Completion Candidate

- [x] One bounded bottom modal owns agenda and inline registration; hide Home CTA while open. Remove only month-row Today, preserve today highlighting and max-one Home preview.
- [x] Shared full-screen/sheet generation controller: KST semantics, category ownership, reminders, native alarm lifecycle, draft protection and duplicate-insert prevention. Backend and notification engine unchanged.
- [x] Full hub: seasonal background, title/note search, all/upcoming/past by saved KST start date, today included in upcoming, date grouping, virtualized rows and Today jump. Repeat definitions appear once; calendar owns occurrence expansion. Entry/return and health separation preserved.
- [x] Autumn-only generated apricot-v3 RGBA sphere: transparent outer corners, pigmented center. Original assets, other seasons and decoration geometry retained.
- [x] TypeScript/diff check PASS; lint 0 errors/16 existing warnings/0 new; final targeted 13 suites/233 tests and full 159 suites/1450 tests PASS. One incremental Release build and one install-r PASS. SHA-256 `1a03b169a5014485c108c43faaeaace28c6e0c042587eefa61bddf60570d3f35`; signed, embedded bundle, debuggable/cleartext false; font, installed hash, UID, first install timestamp and build source/inputs match.
- [ ] PO native visual/UX approval; keyboard behavior, date-picker layering, long-list performance and iOS verification. Structural width/font tests are not native pixel evidence.
- [x] QA/evidence/canonical APK/AAB/auth freeze/season controls/Store HOLD retained. Cleanup/staging/commit/push NONE; build/cache KEEP. Evidence: `/private/tmp/nuri-calendar-completion-20261005-035700/FINAL_REPORT.md`. Earlier separate-screen/Today-control candidate below is superseded.
<!-- NURI_CALENDAR_COMPLETION_20261005_END -->

<!-- NURI_HOME_CALENDAR_FROST_20261005_BEGIN -->
## 2026-10-05 Home Calendar, Shared Frost and Autumn Candidate

- [x] Authorized expansion of the previous material-only pilot: 42 date cells, month/today controls, actual category dots/counts, max one selected-day Home preview and a bounded day-agenda modal. Reuse ScheduleCreate with a prefilled KST date and existing ScheduleDetail/List; retain the More-menu entry. The previous max-seven Home list contract is superseded for this candidate.
- [x] Read-only occurrences from the loaded pet cache, not a seven-row slice: KST midnight, all-day/multi-day exclusive end, daily/weekly/monthly/yearly recurrence and invalid/deleted/duplicate rows covered. Existing persistence, native alarms, health-schedule ownership, remote rows and backend policies unchanged. Large server-side schedule completeness not audited.
- [x] Shared native frost for Home outer panels, including Weather: amount 18, rounds 2, additional seasonal tint 10%, bright rim, no shadow/elevation. Keep foreground content in the capture-excluded subtree and preserve inner widgets/icons/Hero/season controls. Native material overlay is separate from the additional tint.
- [x] Autumn-only warm amber/apricot/maple palette and a generated RGBA globe with transparent corners/core; original globe and winter/spring/summer background descriptors preserved. Globe/starlight positions unchanged.
- [x] TypeScript PASS; targeted lint 0 errors/16 existing warnings/0 new; targeted 13 suites/250 tests and full 157 suites/1427 tests PASS. Initial failed evidence retained. Width/font style tests and native blur mocks are not native rendering/performance evidence.
- [x] One incremental Release QA build PASS: 995 tasks, 66 executed/929 up-to-date, 263.500 seconds. One Galaxy S24 install-r PASS. APK SHA-256 `1fcd23a5e15aca2615c3b0f4d9ae719fee2425daac13d238f5a73e7be54c9c70`; signer, embedded bundle/font, installed hash, UID, firstInstallTime and source/input fingerprints verified. Uncommitted design QA artifact, not an exact-commit Store RC.
- [x] No device launch/touch/scroll/capture, DB mutation, cleanup, staging, commit or push. Preserve existing QA/protected artifacts/unrelated dirty and retain build outputs/caches. AUTH frozen, season controls KEEP, Store HOLD.
- [ ] PO native calendar height/modal/create UX, four-season material/legibility/autumn-color approval and scroll feel; native performance and iOS build/rendering remain unverified. Evidence: `/private/tmp/nuri-home-calendar-frost-autumn-20261005-033500/FINAL_REPORT.md`. Earlier pilot-only entries below are history.
<!-- NURI_HOME_CALENDAR_FROST_20261005_END -->

<!-- NURI_SCHEDULE_FROSTED_20261005_BEGIN -->
## 2026-10-05 Schedule-Only Native Frosted Glass Candidate

- [x] Material-only pilot: pinned native blur 6.0.2 and isolated Schedule wrapper; retain max 7 preview items, section spacing/width, existing empty/loading/error states and schedule navigation/alarm contracts. Calendar, date modal and full schedule hub not implemented this turn.
- [x] Blur amount 18/rounds 2, additional seasonal tint 10%, bright rim, no native shadow/elevation. Content stays inside the Android capture-excluded subtree; no whole-view filter/opacity. The native material overlay is additional to the tint.
- [x] TypeScript PASS; targeted lint 0 errors/16 existing warnings/0 new; targeted 8 suites/151 tests and full 155 suites/1401 tests PASS. Initial selector/mock failures and repaired test evidence retained. Mock-based checks are not native visual/performance evidence.
- [x] One incremental Release QA build PASS: 995 tasks, 123 executed/3 from cache/869 up-to-date, 387.321 seconds. One Galaxy S24 install-r PASS. APK SHA-256 `8923b821033955686ff963586c9f131890cfcee1ffd916ed494958cdd972add9`; signature, embedded bundle/font, installed hash, UID, firstInstallTime and source/input fingerprints verified. Permissions unchanged: 18 before/after.
- [x] No automated launch/touch/scroll/capture, DB mutation, staging, commit or push. Existing QA/protected artifacts/unrelated dirty preserved; build outputs and caches retained. AUTH frozen, season controls KEEP, Store HOLD. This is an uncommitted design QA artifact, not an exact-commit RC.
- [ ] PO native material/legibility/scroll approval across four seasons; native performance and iOS build/rendering remain unverified. Evidence: `/private/tmp/nuri-schedule-frosted-20261005-025219/FINAL_REPORT.md`. Earlier entries below are history.
<!-- NURI_SCHEDULE_FROSTED_20261005_END -->


<!-- NURI_DESIGN_CLOSEOUT_20261005_BEGIN -->
## 2026-10-05 PO Final Design Approval and Selective Closeout

- [x] PO final Galaxy S24 approval: 110 custom NURI icons, original-color feature/More icons, themed navigation, frequent/summary glass, icon-background removal, bottom-shadow removal and the +16dp Hero identity-to-CTA group spacing.
- [x] Reuse the approved installed QA APK SHA-256 `44de5c7c5d274b9b508222bf4993489ac28ebc3aaa822428622021ffbf324717`, source/input fingerprints, signature/bundle/font checks and existing full-icon 154 suites/1298 tests, glass 9 suites/341 tests and Hero 5 suites/92 tests. No additional runtime edit, build, install, device operation or DB mutation for closeout.
- [x] PO authorizes selective commit and normal push of approved source/assets/tests/document blocks only. Exclude and preserve preexisting unrelated document bodies, research, Supabase temp, historical designs/QA and untracked seasonal inputs. Actual Git result: `/private/tmp/nuri-hero-spacing-20261005-005707/FINAL_REPORT.md`.
- [x] Keep outputs and caches until an explicit removal instruction. This QA artifact is not an exact-commit Store RC; iOS native rendering and performance remain separate unverified boundaries. AUTH frozen, QA/season controls preserved, Store HOLD, no automatic next work. Earlier pending-review entries below are history.
<!-- NURI_DESIGN_CLOSEOUT_20261005_END -->

<!-- NURI_HERO_SPACING_20261005_BEGIN -->
## 2026-10-05 Hero Profile Group Spacing Installed Candidate

- [x] Preserve the fixed recent-memory chip and lower the existing identity-to-CTA group by 16dp across four seasons. Body paddingTop 14→30dp; internal spacing, assets, data/navigation and CTA dimensions unchanged. Real layout expansion, not a transform: Hero and Weather start move +16dp while keeping the CTA inside its touch ancestors.
- [x] Source scope: one runtime style file and one test. TypeScript PASS; target lint 0 errors/0 warnings; 5 suites/92 tests PASS, including shared four-season grouping and existing memory-chip/CTA geometry contracts.
- [x] One incremental Release QA build PASS: 952 tasks, 61 executed, 891 up-to-date, 296.519 seconds. One Galaxy S24 install-r PASS. APK SHA-256 `44de5c7c5d274b9b508222bf4993489ac28ebc3aaa822428622021ffbf324717`; signature, embedded bundle, font, installed hash, UID and firstInstallTime verified.
- [x] Outputs and caches retained under the latest PO policy. No cleanup, automated app launch/touch/scroll/capture, DB changes, staging, commit or push. Existing required artifacts, current QA and unrelated dirty preserved. The earlier historical 12-file QA absence remains unexplained.
- [ ] PO final native visual approval of spacing and Hero→Weather rhythm. Uncommitted design QA candidate, not a Store RC. AUTH frozen, season controls kept, Store HOLD. Evidence: `/private/tmp/nuri-hero-spacing-20261005-005707/FINAL_REPORT.md`. Earlier blocks below are history.
<!-- NURI_HERO_SPACING_20261005_END -->

<!-- NURI_HOME_NO_REFLECTION_20261005_BEGIN -->
## 2026-10-05 Bottom Shadow Removal Installed Candidate

- [x] Corrected intent: remove bottom shadows, not reflections. Restore the interim reflection-removal edits before any build/install. Remove only the common contact-shadow layer and dark bottom-rim colors; preserve reflections, glints, guide sheen, glass opacity, geometry, icons, seasonal assets and data/navigation contracts.
- [x] Final source scope: one runtime material file and three tests. TypeScript PASS; target lint 0 errors/0 warnings; 9 suites/341 tests PASS, including four-season/width/font contracts, reflection preservation and shadow absence.
- [x] One incremental Release QA build PASS: 952 tasks, 61 executed, 891 up-to-date, 275.493 seconds. One Galaxy S24 install-r PASS. APK SHA-256 `f4a21fe39e1dc793ef70f849e6c771e1011a53fae6255e836ddd2f470dcade76`; signature, embedded bundle, font, installed hash, UID and firstInstallTime verified.
- [x] Build outputs and all caches retained under the latest PO policy. No cleanup, app launch, touch, scroll, capture, DB changes, staging, commit or push. Required artifacts, current QA and unrelated dirty preserved. The earlier historical 12-file QA absence remains unexplained.
- [ ] PO final native visual approval. Uncommitted design QA candidate, not a Store RC. AUTH frozen, season controls kept, Store HOLD. Evidence: `/private/tmp/nuri-home-no-reflection-20261005-004425/FINAL_REPORT.md`. Earlier blocks below are history.
<!-- NURI_HOME_NO_REFLECTION_20261005_END -->

<!-- NURI_SUMMARY_GLASS_INSTALL_20261005_BEGIN -->
## 2026-10-05 Summary Glass Installed Candidate and Build Retention

- [x] One authorized Android release QA build and install-r. APK SHA-256 `c541981c6bbcf2a1ce8552de8afe0c5f2641b7a9f3aded688a2ba4731626272d`; signer, embedded bundle, icon font, installed hash, UID and firstInstallTime verified. Production source and declared inputs unchanged during this installation task.
- [x] Prior TypeScript, target lint and 9 suites/341 tests reused. Existing required APK/AAB and the 1,729 QA evidence files present at this task baseline preserved. The earlier 12-file historical QA absence remains unexplained; this task does not resolve that boundary.
- [x] Latest PO policy: consolidate design changes, incremental Release build once, install-r, PO direct review, retain outputs for the next iteration. Do not clean build output, .cxx, .gradle, task build-temp or caches before an explicit PO removal instruction. No cleanup this turn.
- [ ] Final PO native visual approval. No additional app launch, touch, scroll, capture, DB operation, staging, commit or push. This uncommitted design QA candidate is not a Store RC. AUTH frozen, QA and season controls kept, Store HOLD.
- [x] Workflow and project memory updated to supersede the previous automatic cleanup policy. Evidence: `/private/tmp/nuri-summary-glass-install-20261005-002304/FINAL_REPORT.md`. Earlier blocks below are history.
<!-- NURI_SUMMARY_GLASS_INSTALL_20261005_END -->

<!-- NURI_SUMMARY_GLASS_20261005_BEGIN -->
## 2026-10-05 전체요약 유리 후속 디자인 후보

- [x] 전체요약 산책·식사·생활·한 줄 요약 패널을 기록 위젯의 26% 중립 유리 재질로 통일, 공통 paint로 geometry·touch·접근성 계약 유지.
- [x] 기록 위젯 4개 테마색 원형 바탕 제거. 원본 아이콘색·위치 슬롯·시간 칩 유지, 전체요약은 기존 바탕 없는 아이콘 유지.
- [x] TypeScript, 대상 lint 0 errors/0 warnings, 9 suites/341 tests, diff check. 4계절·4폭·3글꼴의 로컬 참고 화면 48개 조합에서 asset load·내용 경계·전후 높이 동일 확인.
- [ ] 새 후보 빌드·설치·native 시각 PO 승인·native 성능. 현재 설치 `dcb92954`는 이 후속 변경을 포함하지 않는다.
- [ ] 최종 PO 승인 후 selective Git closeout. 이번 staging/commit/push 없음, AUTH 동결·QA 보존·계절 버튼 KEEP·Store HOLD. 증적 소유자: `/private/tmp/nuri-summary-glass-20261005-000410/FINAL_REPORT.md`.
<!-- NURI_SUMMARY_GLASS_20261005_END -->

<!-- NURI_FREQUENT_GLASS_INSTALL_20261004_BEGIN -->
## 2026-10-04 Frequent Glass Installed Review Candidate

- [x] One authorized Android QA build and update install. APK SHA-256 `dcb92954d696dbefc4b99aee33e0dc72735c47cc4611a3f3941b421fc35592d2`; signature, embedded bundle, icon font and installed hash verified. Actual UID and firstInstallTime captured before/after and unchanged. Source and declared inputs unchanged during build.
- [x] Reuse prior typecheck, target lint and 7 suites/266 tests. No app launch, touch, scroll, capture, database operation or further production-source change. This dirty design candidate is not an exact-commit RC.
- [x] Audited exact-path Android outputs and task build-temp cleanup: 3.311GiB allocated, 2.800GiB observed free-space increase. Preserve required APK/AAB, evidence, QA, source/assets, unrelated dirty, credentials, toolchain, dependencies and global caches. Shared Watchman retained.
- [ ] PO final native visual approval. No staging, commit or push. AUTH freeze, QA, season controls and Store HOLD remain intact. Source of truth: `/private/tmp/nuri-frequent-glass-install-20261004-234846/FINAL_REPORT.md`. Earlier blocks below are history.
<!-- NURI_FREQUENT_GLASS_INSTALL_20261004_END -->

<!-- NURI_FREQUENT_GLASS_20261004_BEGIN -->
## 2026-10-04 Frequent Records Glass Candidate

- [x] Change only the four quick-record inner surfaces to 26% fill, asymmetric rims, a glint and a 5dp contact shadow. Keep shared Home material, outer glass, seasonal background, icon colors, 2x2 geometry, large-font sizing and record/navigation contracts.
- [x] Typecheck PASS; target lint 0 errors/0 warnings; 7 suites/266 tests PASS; diff check PASS. Local season/width/font matrix and browser-reference fit checks cover 48 combinations; these do not establish native appearance or performance.
- [ ] PO visual approval and any separately authorized build/install. No new build, install, device operation, DB operation, staging, commit, push or artifact cleanup this turn. Existing installed `e08b0d95` icon candidate does not include this glass change.
- [x] Frozen AUTH, current QA, seasonal controls, unrelated dirty and Store HOLD preserved. Source of truth: `/private/tmp/nuri-frequent-glass-20261004-233329/FINAL_REPORT.md`. Earlier blocks below are history.
<!-- NURI_FREQUENT_GLASS_20261004_END -->

<!-- NURI_CUTE_INSTALL_20261004_BEGIN -->
## 2026-10-04 Cute Global Icons Installed PO Candidate

- [x] PO approved the design direction and one build/install. Global 110-icon wiring verified; functional/menu/recommendation source colors, pet-theme navigation, arrows/weather/official-brand exclusions preserved.
- [x] Android assembleRelease once PASS; APK verifier ACCEPTED; embedded NuriIcons font matches; source and declared inputs unchanged during build. Existing type/lint/full-suite evidence reused: 154 suites/1298 tests PASS.
- [x] Galaxy S24 update install once Success. Installed APK SHA-256 `e08b0d95db5b78b188ca43b476584c29c63f203fd0ad20a0c61b638b3281ab8f` matches; firstInstallTime unchanged. No app launch, touch, scroll, capture, uninstall, data clear or DB operation. Pre-install UID was not captured; the helper's missing-value equality is not UID preservation evidence.
- [ ] PO final native visual approval. Native performance and iOS behavior remain unverified. This uncommitted design candidate is not an exact-commit RC; no staging/commit/push/artifact cleanup until final approval.
- [x] Frozen AUTH, QA data, season controls and Store HOLD preserved. Canonical results: `/private/tmp/nuri-cute-icons-install-20261004-230741/FINAL_REPORT.md`. Older entries below are historical.
<!-- NURI_CUTE_INSTALL_20261004_END -->

<!-- NURI_CUTE_ICONS_20261004_BEGIN -->
## 2026-10-04 NURI Jelly Object Candidate

- [x] Redraw 88 object silhouettes within the existing editable 110-icon catalog. Keep clinical/control semantics, species-neutral motifs, original functional/menu colors and pet-theme navigation. No new app dependency or business/data contract.
- [x] Typecheck PASS; lint 0 errors/48 existing warnings/0 new diagnostics; full suite 154 suites/1298 tests PASS; 3959 local rendering checks and 467 vector bounds PASS. Identical Android/iOS font bytes; these are not native visual evidence.
- [ ] Additional QA build/install: not performed, prior approval question remains unanswered. Installed first-stage candidate is not the jelly revision. Native appearance/performance/iOS acceptance remain unverified.
- [ ] PO final approval. No staging/commit/push/cleanup in this turn. Preserve frozen AUTH, QA, season controls and Store HOLD. Evidence: `/private/tmp/nuri-cute-icons-20261004-225302/FINAL_REPORT.md`.
<!-- NURI_CUTE_ICONS_20261004_END -->

<!-- NURI_GLOBAL_ICONS_20261004_BEGIN -->
## 2026-10-04 Global NURI Icon Candidate

- [x] Source-color functional/menu/recommendation/state icons, explicit pet-theme navigation mode, editable 110-shape catalog and identical Android/iOS font bytes. No new app dependency or data/navigation contract.
- [x] Keep arrows, standalone weather card and official brands unchanged. Preserve current QA, AUTH freeze, season review controls and unrelated dirty.
- [x] Typecheck PASS; target lint 0 errors/48 existing warnings/0 new diagnostics; full suite 154 suites/1295 tests PASS; 3478 local rendering checks and 430 actual vector bounds PASS.
- [ ] Additional Android QA build/install: awaiting PO response. Existing first-stage installation is not evidence for this global candidate. Native appearance, iOS rendering and performance acceptance remain unverified.
- [ ] PO final approval. No staging/commit/push/cleanup before approval. This is an uncommitted design candidate, not an exact-commit release. Evidence owner: `/tmp/nuri-global-icons-20261004-222219/FINAL_REPORT.md`. Store HOLD.
<!-- NURI_GLOBAL_ICONS_20261004_END -->

<!-- NURI_ICON_CANDIDATE_20261004_BEGIN -->
## 2026-10-04 NURI Icon Design Candidate

- [x] PO authorizes seven functional and five navigation concepts, implementation and Galaxy S24 installation. Timeline is shared across both sets; arrows and unapproved medical subtypes stay unchanged.
- [x] Native font registration on Android/iOS, fixed icon geometry and pet-theme navigation tint are implemented without new app dependencies.
- This uncommitted design QA build is not an exact-commit RC. Actual tests, source/input hashes, artifact verification and installation results belong to `/tmp/nuri-icons-20261004-214355/FINAL_REPORT.md`.
- [ ] PO final native visual approval. iOS native rendering and performance acceptance are not established by Android installation or local tests. No staging/commit/push; AUTH remains frozen, season review controls and QA remain preserved, Store stays HOLD.
<!-- NURI_ICON_CANDIDATE_20261004_END -->

<!-- NURI_REMOVE_TODAY_PHOTO_20261004_BEGIN -->
## 2026-10-04 Home Today Photo Removal

- [x] PO authorizes removal without a replacement. Home no longer mounts Today Photo or its measured wrapper; recent records flow directly into community.
- [x] Preserve photo recording, Timeline, recall service, seasonal assets, QA, AUTH freeze and season review controls. No server or data changes.
- Local validation, one exact-commit Android QA build, selective commit/push and safe generated-only cleanup are recorded in `/tmp/nuri-remove-today-photo-20261004-191631/FINAL_REPORT.md`; implementation is not native installation evidence.
- Device installation is not requested. Store remains HOLD. Stop after closeout; no automatic replacement design.
<!-- NURI_REMOVE_TODAY_PHOTO_20261004_END -->

<!-- NURI_FOUNDATION_20261004_BEGIN -->
## 2026-10-04 Pre-Design Foundation Gate

- [x] PO AUTH visual/UX PASS; offline/Kakao COMPLETE_FROZEN; native cancel/back NOT_RUN remains an evidence gap.
- [x] Source-validation workflow, non-deployable CI fixture, input/provenance tamper guards and critical logical automation implemented; execution results belong to `/tmp/nuri-foundation-20261004/FINAL_REPORT.md`.
- [x] Web production source/health/independent deployment record aligned; production monitor run 37191169067 PASS, no hardcoded expected hash.
- [x] Read-only remote RLS/ownership review and release/recovery runbooks. No production restore, QA write, visual change or app rebuild.
- [ ] Signed CI: existing GitHub signing secrets/environment unavailable; protected provisioning approval required.
- [ ] Crashlytics event receipt, commit/symbol/source-map attribution and payload redaction proof; current implementation alone is not operational PASS.
- [ ] Current database/media/auth recovery set and timed isolated restore; Free plan and old public dumps are not complete recovery evidence.
- [ ] Existing security advisor function/grant/search-path findings require contract-specific review, not automatic grant changes.
- Store HOLD. Season control/QA/canonical APK+AAB preserved. Next: PO NEXT DESIGN DIRECTION; design-sensitive audits deferred.
<!-- NURI_FOUNDATION_20261004_END -->

## 2026-10-04 Auth Final Corrective Gate

- [x] Separate network failure from definitive invalid auth; SDK-local session and explicit logout contract; same-user silent revalidation.
- [x] Exact Kakao HTTPS app redirect, dual legacy parser, callback single-flight and narrow Android autoVerify filter; Google source contract preserved.
- [x] Node 24.20.0 / Yarn 3.6.4; typecheck; target lint 0 diagnostics; 7 suites / 48 target tests; full suite once: 151 suites / 1,118 tests PASS.
- Execution-only host deployment, exact redirect allowlist delta, signed exact-HEAD artifact, S24 zero-tap/offline acceptance, Git and cleanup results: `/tmp/nuri-auth-final-corrective-20261004/FINAL_REPORT.md` is authoritative. No pre-recorded native PASS.
- [ ] Final PO visual/UX approval. Store release/upload remains HOLD; season review control stays visible; no automatic next design work.

## 2026-10-04 RC Input Recovery Gate

- [x] Classify public Supabase client inputs without logging values; preserve ignored/protected source inputs.
- [x] Official clean-checkout input manifest, shared validator, undeclared-relative-import guard, and DEV=false Android bundle gate before Gradle.
- [ ] Exact final HEAD APK/AAB, native acceptance and final preservation: `/tmp/nuri-rc-recovery-20261004/FINAL_REPORT.md` is the execution evidence owner.
- [ ] PO visual approval and separate Play Store readiness. Season review control remains visible.


## 2026-10-04 Consolidated PRE-RC Gate

- [x] Local implementation: width-safe Weather, selected-only Community category fill, 22dp recommendation glyph, app-wide persisted seasonal override and missing onboarding variants.
- [x] Linked KST all-day constraint migration 20261004051105; existing 12 rows/RLS identical immediately before and after.
- [x] Node 24.20.0 / Yarn 3.6.4, typecheck; full Jest 144 suites / 1056 tests; target lint 0 errors / 25 existing warnings / 0 new diagnostics.
- [ ] Committed-source APK/AAB and physical QA execution results: /tmp/nuri-final-batch-20261004/FINAL_REPORT.md is the post-execution evidence owner.
- [ ] Final PO visual approval and Store release approval. Review buttons remain visible by PO decision.
- Permanent order: final artifact copy → evidence/Git verify → safe generated-only cleanup → disk verify → report → STOP.


## 2026-10-04 Home · 프로필 등록 QA corrective · PO 최종 승인

- [x] 세 취향 입력 추가 후 같은 입력 focus·키보드 유지, 새 chip 아래까지 측정 기반 animated scroll, 정규화·중복 방지·draft 보존.
- [x] 등록 1단계 프로필 컬러 아래·2단계 상세 정보 안에 앱 글꼴 폼 필드. 기존 전체 preference·설정 모달 재사용, 실제 Pretendard 선택·귀염발랄체 복원.
- [x] Hero 실제 padding layout과 뒤 transparent wrapper touch 보완. 최신 설치본 중앙 터치로 프로필 상세 진입. 부모 높이·이후 시작 위치 +14dp 명시.
- [x] Recent CTA 공용 material·중앙 정렬, 확대 글꼴 header action·Weather·Frequent·하단 메뉴 보완, 상단 여백 없는 absolute 계절 버튼.
- [x] Node 24.20.0·Yarn 3.6.4, TypeScript·대상 lint 오류 0·새 진단 0·기존 경고 19, 29개 스위트 368개 관련 테스트·diff check PASS.
- [x] 마지막 앱 글꼴 필드 후속 Release·install 각 1회 성공. 10월 4일 누적 build 5회·install 4회. latest `9e6a110c` 설치 hash 일치·594개 build 입력 변경 0.
- [x] 정상 앱 UI QA 15기록·8일정·3공개 글 생성, scoped remote SELECT 보존 확인. 개인 원본·기존 실제 항목 변경 없음, QA 삭제 없음.
- [x] 동일 S24의 360/384/400/430dp·font scale 1.0/1.3/1.5 12조합·179캡처, 일정 7·건강 5·일기 7 native preview. 원래 1080×2340px·density 450·font scale 1.0 복원. 여러 물리 기기 검증은 아님.
- [x] 한국시간 13:02 실제 알림·반복 진동과 Home 중지·IDLE·notice 제거. 이전 OS notification 중지·일정 목록 이동도 별도 확인.
- [x] 실제 warm scroll/Top 3회 성능 기록. 짧은 native 관찰·보존 로그의 NURI Fatal·ANR·RN 오류 패턴 0, 장시간 누수 확인으로 간주하지 않음.
- [ ] KST 종일 일정 저장과 remote UTC 자정 제약 충돌 해결: 별도 서버 계약 검토 필요, 이번 작업에서 migration 없음.
- [ ] 360dp 기본 글꼴의 Weather 풍속 말줄임 보완: 현재 compact 4열의 잔여 표시 문제.
- [x] Galaxy S24에서 PO의 10개 Home·등록 시각/UX 항목 직접 검토·최종 승인 완료. 현재 corrective scope 동결.
- [ ] 계절 검토 버튼 production 노출 승인: 현재 유지, Final RC 전에 제거 또는 production 비노출 확정 필요.
- [ ] 다른 물리 기기의 native 확인·장시간 bitmap 메모리 검증·Test Hygiene/Full Suite·Final Release Hardening. 전체 release gate HOLD.
- 이번 10월 4일 task-owned 변경만 선별 commit·push 대상으로 삼는다. 기존 10월 2일 dirty·research·metadata·output·unrelated asset은 제외한다. QA 데이터·증적·APK는 보존하고 추가 build·install·QA·cleanup·계절 버튼 제거·다음 작업은 하지 않는다. 기존 증적은 `docs/qa/nuri-home-profile-qa-corrective-2026-10-04.md`, Git 결과는 `/tmp/nuri-home-qa-fixes-20261004/git-closeout/final.json`을 따른다.

## 2026-10-01 Home editorial Git·cleanup 종료 결과

- [x] 승인 source·asset·test·문서 46개 파일을 `44284adff5454676268db6bc6f62a6b36b7f2f2a`로 선별 commit·기존 브랜치 push, 실제 remote SHA 일치·ahead/behind 0/0 확인.
- [x] 종료 전 20개 스위트 275개 테스트 PASS, 승인 입력 809개 hash 동일·과거 dirty 제외·보존.
- [x] push 이후 네 Git-ignored Android generated 경로 정리. 측정 3.51GiB·실제 여유 공간 증가 2.99GiB·최종 51.75GiB.
- [x] 프로젝트 1,353개·기존 QA 5,466개 hash 및 Git 상태 동일. 승인·직전·안정 APK, 자산·signing·wrapper·SDK·개인 파일 보존.
- [x] 계절 버튼·설치본 유지, 추가 source 수정·build·install·기기 조작·시스템 관리 공간 정리 없음.
- [ ] 최신 자동 runtime·bitmap 메모리·스크롤 성능·다중 화면 폭과 큰 글꼴 native 확인: 미확인. 다음 후보로 제안하되 새 승인 전에는 실행하지 않는다.
- 종료 증적: `/tmp/nuri-tip-recent-community-20261001/git-closeout`. 아래 실행 예정은 이전 이력이다.

## 2026-10-01 Home editorial PO 최종 승인·종료 계약

- [x] PO가 최신 `ca7d2751`의 Today Tip·Recent empty·Community 다섯 탭과 Recent 표시 corrective를 최종 승인.
- [x] 승인 입력 809개 동일, 최신 타입·수정 범위 lint 오류/경고 0·관련 20개 스위트 275개 테스트 PASS 증적 보존.
- [x] 계절 버튼·현재 설치본 유지. 추가 source 변경·build·install·기기 조작 없음.
- [x] 승인 source·PNG 28개·manifest·관련 테스트·이번 문서만 선별 commit·push, 이후 재생성 가능한 산출물 정리 지시 수신. 기존 dirty·필수 APK·증적·toolchain 보존.
- [ ] 최신 자동 runtime smoke·native bounds·bitmap 메모리·스크롤 성능: 미확인. PO 시각 승인과 별도 관리한다.
- 실제 Git·정리·보존 검증은 `/tmp/nuri-tip-recent-community-20261001/git-closeout`에 기록한다. 아래 후보 승인 대기는 이전 이력이다.

## 2026-10-01 오늘의 팁·최근 기록·커뮤니티 후보

- [x] 후속 Recent 그림만 20% 확대·가로 중심 약 27~30dp 안쪽 이동, 기존 slot 높이·PNG·문구·버튼·다른 섹션 유지. 타입·수정 두 파일 lint 오류/경고 0·20개 스위트 275개 테스트 PASS.
- [x] 추가 승인 Release·install 각 1회 완료, 작업 누적 각 2회. 최신 `ca7d2751`·verifier ACCEPTED·Success, 809개 build input hash 동일·28개 packaged 그림 픽셀 동일. 직전 후보·승인 APK 보존.
- [x] Recent·Community 네 계절 시안 8장, production genuine-alpha PNG 28개와 source·prompt·hash manifest 생성. Community 다섯 탭별 서로 다른 그림 20개.
- [x] bounded frame·absolute Image, 작은 폭·큰 글꼴 세로 배치, confirmed-empty·loading·error 구분과 기존 실제 데이터·action·캐시·정렬 계약 보존.
- [x] 대상 세 구간만 단일 canvas 구체·별빛 보완. 승인 Hero·다른 섹션·outer glass·계절 버튼 유지.
- [x] Node 24.20.0·Yarn 3.6.4, TypeScript·대상 lint 오류 0·새 경고 0·기존 19개, 20개 스위트 271개 테스트·diff check PASS.
- [x] 승인 QA Release·install 각 1회 완료, verifier ACCEPTED·Success, APK `45d0b72b`. 새 PNG 28개 실제 포함·alpha와 보이는 RGB 원본 동일, build input 809개 hash 동일.
- [x] 기존 dirty·증적·승인 APK 보존. 설치 외 기기 실행·터치·스크롤·캡처와 Git·cleanup 없음.
- [ ] 최신 native 높이·시각 합성·성능·runtime smoke·Fatal·ANR·RN Fatal: 기기 조작 중단으로 미확인.
- [ ] PO 최종 시각 승인. 계절 버튼 제거·추가 빌드·설치·staging·commit·push·cleanup·다음 자동 작업 없음.

보고서: `docs/qa/nuri-home-tip-recent-community-four-season-candidate-2026-10-01.md`. 아래는 이전 승인 기준과 작업 이력이다.

## 2026-10-01 전체 요약 Git 종료

- [x] 전체 요약 PO 최종 승인 후 별도 선별 commit·기존 브랜치 push 지시 수신.
- [x] 승인 source·asset 559개 hash 동일, 종료 전 19개 스위트 211개 테스트 PASS. 추가 build·install·기기 조작 없음.
- [x] 무관한 dirty·공유 문서 과거 hunk를 제외하며 계절 버튼·승인 APK·증적 보존.
- [x] 승인 변경 20개 파일의 source commit `d1130895b3271e46fbf28631c8cecbcee23eb09a`·기존 브랜치 push와 실제 원격 SHA 일치·ahead/behind 0/0 확인. 결과는 `/tmp/nuri-summary-four-season-20261001/git-closeout.json`에 기록한다.
- 완료 기록은 문서만 후속 커밋하며 승인 source·asset·설치본을 변경하지 않는다.
- 다음 기능·main 병합·스토어 배포·cleanup·버튼 제거는 자동 실행하지 않는다. 아래 Git 미승인 표시는 이전 이력이다.

## 2026-10-01 전체 요약 최종 PO 승인

- [x] 최신 `84961478` 설치 후보의 전체 요약 네 계절 PO 최종 시각 승인 수신.
- [x] 승인 상태를 QA·project-memory에 기록. 이번 턴 앱 source·asset·계절 버튼·설치본 변경 없음.
- [x] 기존 타입·lint·19개 스위트 211개 테스트, QA Release·install 각 1회 증적 보존. 추가 build·install·test 미실행.
- [ ] 최신 자동 runtime smoke·Fatal·ANR·RN Fatal·native bounds 측정: 기기 조작 중단으로 미확인, PO 승인과 별도 관리.
- 이번 전체 요약의 staging·commit·push·cleanup·버튼 제거·다음 기능은 자동 진행하지 않는다. 다음 PO 지시를 기다린다. 아래 후보 승인 대기는 이전 이력이다.

## 2026-10-01 전체 요약 네 계절 후보

- [x] 승인 시안의 큰 실제 total·고유 KST 날짜·계절별 투명 보관함·세 보조 유리 위젯·기존 insight action 구현.
- [x] PNG 네 개 genuine alpha, 최대 176dp frame, 작은 폭·큰 글꼴 세로 배치·줄바꿈, loading/error/empty·기존 집계/filter contract.
- [x] Summary zone의 구체·별빛·가을 field만 보완. 다른 승인 section·Hero·outer glass·단일 canvas·계절 버튼 유지.
- [x] TypeScript·대상 ESLint 오류 0·새 경고 0·기존 17개, 19개 스위트 211개 테스트, diff check PASS.
- [x] 이번 QA Release·install 각 1회 PO 승인. 설치 외 기기 조작 중단 유지.
- [x] 승인 QA Release·install 각 1회 완료. Verifier ACCEPTED·Success, APK `84961478`, 네 PNG 실제 포함·build 입력 559개 hash 및 Git 상태 동일.
- [ ] 최신 native height·시각 합성·runtime smoke·Fatal·ANR·RN Fatal: 자동 기기 검토 중단으로 미확인.
- [ ] PO 최종 시각 승인. staging·commit·push·cleanup·다음 자동 작업 없음.

보고서: `docs/qa/nuri-home-total-summary-four-season-candidate-2026-10-01.md`. 아래는 기존 승인 기준과 이전 후보 이력이다.

## 2026-10-01 세 빈 섹션 최종 PO 승인·버튼 유지

- [x] 건강관리·일정·오늘 한장 계절별 빈 상태와 section geometry를 유지한 일정·사진 표시 확대 PO 최종 승인.
- [x] 최신 QA Release·install 각 1회 PASS, verifier ACCEPTED·Success, APK `a6914fe5`. 최초 후보 포함 scope 누적 각 2회.
- [x] 종료 전 관련 17개 스위트 187개 테스트 PASS. Full test·추가 build·install 없음.
- [x] PO의 최신 지시로 계절 버튼과 local selection을 유지한다. 버튼 제거·추가 빌드·설치는 하지 않는다.
- [x] 승인 source·12 PNG·관련 테스트·이번 문서 block만 선별 commit·기존 브랜치 push 승인. 무관한 dirty·공유 문서의 과거 hunk·기존 APK·증적은 보존한다.
- [ ] 최신 전체 자동 runtime smoke·Fatal·ANR·RN Fatal. 설치 외 기기 조작 중단으로 미확인이며 PO 시각 승인과 별도로 관리한다.
- 다음 기능·main 병합·스토어 배포·cleanup 자동 시작 없음. 실제 Git 종료 결과는 `/tmp/nuri-empty-art-scale-20261001/git-closeout.json`을 따른다. 아래 pending은 이전 후보 이력이다.

## 2026-10-01 세 빈 섹션 계절 후보

- [x] 건강관리·일정·오늘 한장 confirmed-empty 리디자인과 네 계절 투명 PNG 12개 구현. 건강관리 강아지·발바닥 제거, 허구 데이터 없음.
- [x] 그림 최대 Health 128dp·Schedule 136dp·Photo 168dp, absolute Image·square frame, 확대 글꼴 Health 세로 전환과 CTA 줄바꿈 계약.
- [x] loading/error/unknown과 empty 구분, 실제 photo selection·상세·일정·건강 action과 승인 배경·glass·일기 유지.
- [x] overlay가 아닌 Home 상단 임시 네 계절 버튼. Home local selection, global theme/date·공통 foreground 보존.
- [x] TypeScript·대상 lint 오류 0·새 경고 0·기존 19개, 17개 스위트 185개 테스트와 diff check PASS.
- [x] 추가 QA Release·install 각 1회 PO 승인. 설치 외 기기 실행·터치·스크롤·캡처 중단 유지.
- [x] 승인 QA Release·install 각 1회 완료, verifier ACCEPTED·install Success. SHA-256 `86cb8f48e44be07fe603335952b2df238f3881e4105b23bec008539a3ce2ca51`, 새 PNG 12개 실제 APK 포함 확인.
- [ ] 최신 native 높이·전체 시각 합성·runtime QA·Fatal·ANR·RN Fatal. 현재 미확인.
- [ ] PO 최종 디자인 승인. 승인 전 버튼 제거·staging·commit·push·cleanup과 다음 작업 없음.

보고서: `docs/qa/nuri-home-three-empty-sections-candidate-2026-10-01.md`. 아래 일기 최종 승인 기록은 기존 승인 baseline이다.

## 2026-10-01 이번 달 일기 최종 PO 승인과 검토 버튼 제거

- [x] 승인 source·asset·test·문서 26개 파일만 선별 commit `410483dfb301425cebb7f5db6e730324c34629ca`·push, 실제 remote SHA와 ahead/behind 0/0 확인. 무관한 기존 dirty 제외·보존.
- [x] 최신 `971128d2` 설치 후보의 PO 직접 검토·최종 승인 수신.
- [x] 네 계절 투명 notebook, 최대 200dp frame, 중앙 정렬 기록하기와 탑 버튼 비겹침 corrective 반영.
- [x] 정상 조회 완료·표시 항목 0개인 헤더는 목록 버튼과 대체 문구 모두 제거. 실제 데이터·본문 실행 action과 loading/error 구분 보존.
- [x] 임시 계절 버튼·선택 state 제거, 배경과 일기 이미지에 기존 KST 자동 판정 연결.
- [x] TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 13개 스위트 168개 테스트와 diff check PASS.
- [x] 승인 추가 Release·install 각 1회, verifier ACCEPTED·install Success. 최종 `c0543274e92aa78b5cae82581e202c5c14199d4e091fc33bcb51b9bfbfcc7a2c`, 작업 누적 build 6회·install 5회.
- [x] 승인·최종 APK·증적 보존 후 regenerable output/cache 8곳 정리. 실제 available 약 4.24GiB 증가, 프로젝트 1,268개·증적 284개 hash 동일.
- [x] Metro·Fast Refresh OFF. 설치 외 기기 조작 중단, 원격 DB·앱 데이터·시스템·공유 전역 cache 변경 없음.
- [ ] 최신 자동 Fatal·ANR·RN Fatal·확대 글꼴·다른 물리 폭·populated diary runtime QA는 미확인. PO 시각 승인과 구분한다.

보고서: `docs/qa/nuri-home-monthly-diary-final-approval-2026-10-01.md`. 아래 대기는 이전 후보 이력이다.

## 2026-09-30 네 계절 Home 최종 승인 및 검토 버튼 제거

- [x] 마지막 `cfe40e21` 후보의 최종 PO 시각 승인 수신.
- [x] 임시 계절 버튼·선택 state·QA override 제거, KST 자동 배경 선택과 승인 공통 foreground 연결.
- [x] 승인 Hero·색감·구체·별빛 배치·유리 50%/60%·UI와 기능 유지.
- [x] TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 관련 16개 스위트 184개 테스트 PASS.
- [x] 버튼 없는 최종 Release·install 각 1회 PO 승인 수신.
- [x] 최종 Release 1회·install 1회, verifier ACCEPTED·install Success. 최종 SHA-256 `6bd2e2ae29ba3ad6c3da90320ab7101f37fe7cf1616e189fc386341460718f4b`, Metro·Fast Refresh OFF.
- [x] 최종 APK와 승인 기준 APK 보존 후 재생성된 프로젝트 native cache 6곳 정리. source·기존 dirty 보존, 약 4.00GiB 회수.
- [x] 승인된 source·자산·문서 hunk 26개 파일만 선별 commit `55f8c9e3584c0046bfc812e5fee7cf8943e44c93`·push, 실제 remote SHA 일치 및 ahead/behind 0/0 확인. 완료 확인 기록은 문서 전용 후속 커밋이다.
- [ ] 최신 자동 runtime QA·Fatal·ANR·RN Fatal·Red Screen·확대 글꼴·Memorial 증적. 기기 조작 중단으로 미확인.

보고서: `docs/qa/nuri-home-four-season-final-approval-2026-09-30.md`. 아래 PO 승인 대기는 이전 후보 이력이다.

## 2026-09-30 세 장식 균형과 디스크 정리

- [x] PO의 마지막 하단 배치 지시 반영. cropped 구체·complete 구체·별빛 각 12개, 제목 옆·패널 gap 활용.
- [x] Hero·네 계절 palette·UI·유리·구체 자산·임시 버튼 보존. source 3개·test 2개 수정, 새 native dependency 없음.
- [x] TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 16개 스위트 189개 테스트와 diff check PASS.
- [x] 승인 추가 release·install 각 1회 완료, verifier ACCEPTED, install Success, Metro OFF, 기존 앱 데이터 유지.
- [x] 오래된 후보 APK 6개 및 Git-ignored native build cache 삭제. 약 4.99GiB 확보. 최신·직전·승인 가을 APK와 source·로그·시안·증적·기존 dirty 보존.
- [x] 기기 조작 중단 유지. 설치 외 실행·터치·스크롤·전환·캡처 없음.
- [ ] 최신 실기기 합성·가독성·성능·Fatal·ANR·RN Fatal·Red Screen 검증. 미확인.
- [ ] PO 최종 승인 및 후속 임시 버튼 제거·재검증·선별 커밋·푸시.

최신 설치 SHA-256: `cfe40e218e4ff324783f35ab1fbb1188f3e7c69c54fd256ab17223753ba93c96`. 계절 작업 누적 각 8회, 이번 후보 각 1회다.
보고서: `docs/qa/nuri-home-four-season-three-family-balance-2026-09-30.md`. 아래는 이전 이력이며 일부 오래된 APK 파일은 이번 정리로 삭제됐고 checksum·로그·증적은 보존했다.

## 2026-09-30 좌우 색·봄 pink·별빛 corrective

- [x] 직전 후보 PO 미승인과 남은 흰 edge·봄 emerald·하단 별빛 지적 반영.
- [x] 기존 mesh 이동 보존, 중앙 투명 edge wash와 lower field 색 보완, 봄 mint 제거, 실제 section-anchor 별빛 28개 적용.
- [x] UI·유리 50%/60%·구체 60개·Hero 별빛 9개·임시 버튼 보존. 새 자산·native dependency·애니메이션 없음.
- [x] Node 24.20.0, Yarn 3.6.4, TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 16개 스위트 187개 테스트, diff check PASS.
- [x] PO 승인 추가 release·install 각 1회 완료, verifier ACCEPTED, install Success, Metro OFF, 앱 데이터 유지.
- [x] 기기 조작 중단 유지. 설치 외 실행·터치·스크롤·전환·캡처 없음.
- [ ] 최신 실기기 합성·가독성·성능 및 Fatal·ANR·RN Fatal·Red Screen 검증. 미확인.
- [ ] PO 최종 시각 승인, 이후 임시 버튼 제거·재검증·선별 커밋·푸시.

최신 설치 SHA-256: `1e3291e62436fcdf84d57786db373a338513f08a258b692c9247f387ccdcae2d`. 계절 작업 누적 release·install 각 7회, 이번 corrective 각 1회다.
보고서: `docs/qa/nuri-home-four-season-edge-pink-starlight-corrective-2026-09-30.md`. 아래는 이전 후보 이력이다.

## 2026-09-30 하단 mesh 복원·흰 구간 선택 감소 corrective

- [x] PO의 통일 후보가 밋밋하다는 판단과 기존 mesh 유지·흰 구간만 감소 지시 반영.
- [x] lower base·tail 덮개 제거, 기존 세 가지 색 field 복원, 밝은 lower neutral 선택 감소, 가을 흰 빈 구간 보완. Hero descriptor·구체·UI·glass 유지.
- [x] TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 16개 스위트 185개 테스트, diff check PASS.
- [x] 이번 corrective 추가 Release·install 1회 PO 승인 및 완료. verifier ACCEPTED, install Success, Metro OFF, 앱 데이터 유지.
- [x] 기기 조작 중단 유지. 설치 외 실행·제스처·캡처 없음.
- [ ] 최신 source의 실기기 합성 및 Fatal·ANR·RN Fatal 검증. 현재 미확인.
- [ ] PO 최종 시각 승인 및 이후 버튼 제거·재검증·선별 커밋·푸시.

최신 설치 SHA-256: `b5529e8accbc91b419ced2943cae88adc8cbe0f87052a0cb3a626ce56c257d99`. 누적 release·install 각 6회이며 이번 corrective 각 1회다.
최신 source 보고서: `docs/qa/nuri-home-four-season-white-pocket-corrective-2026-09-30.md`. 아래는 이전 후보 이력이다.

## 2026-09-30 네 계절 하단 색 통일 후보

- [x] PO의 하단 white pocket 보정 지시와 추가 Release·설치 1회 승인 수신.
- [x] 네 계절 lower base 통일, Hero tail 16% transition, 하단 white wash 제거. 구체·주요 Hero 색·유리·UI 보존.
- [x] TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 관련 16개 스위트 182개 테스트와 diff check.
- [x] Release·install 각 1회, verifier ACCEPTED, 앱 데이터 유지, Metro OFF. 누적 각 5회.
- [x] 기기 조작 중단 지시 유지. 승인 설치 외 자동 제스처·캡처·cold launch 없음.
- [ ] 최신 전체 실기기 QA·Fatal·ANR·RN Fatal 확인. 현재 미확인.
- [ ] PO 최종 시각 승인.
- [ ] 승인 후 버튼 제거와 재검증, 선별 커밋·푸시.

최신 SHA-256: `55b6784f93c95efd8e9cb0e3e3fb129554a8bd1224a3d586bec992fcc3689ab8`.
보고서: `docs/qa/nuri-home-four-season-lower-tone-2026-09-30.md`. 아래는 이전 후보 이력이다.

## 2026-09-30 세 계절 참조 corrective 후보

- [x] 첨부 겨울·봄·여름 재질·mesh 교정, 가을 및 승인 Home UI·유리 보존, 검토용 네 계절 버튼 유지.
- [x] TypeScript, 대상 lint 오류 0·새 경고 0·기존 20개, 관련 16개 스위트 178개 테스트와 diff check.
- [x] 이번 corrective release·install 각 1회, verifier ACCEPTED, 앱 데이터 유지, Metro OFF. 이전 3회를 포함한 누적 각 4회.
- [x] Cold Home 실행, 가을 공통 unique label 13개 bounds 동일, 확인 구간 Fatal·ANR·RN Fatal 0건.
- [x] PO 직접 검토 중 기기 조작 중단 요청 이행. 추가 터치·스크롤·전환·캡처 없음.
- [ ] 세 계절 전체 통제 실기기 QA. 현재 일부 화면 관찰이며 PNG/XML 불일치는 geometry 증거에서 제외한다.
- [ ] PO 최종 시각 승인.
- [ ] 승인 후 임시 버튼 제거, 재검증과 선별 커밋·푸시.

최신 APK SHA-256: `cc28e0f2f03e89029ff8db383bc29d38dfd09523792279b3344708358a53ccb7`.
보고서: `docs/qa/nuri-home-three-season-reference-corrective-2026-09-30.md`. 아래 가을 승인은 유지되는 이전 baseline 승인으로 이번 세 계절 승인을 뜻하지 않는다.

## 2026-09-30 Home 최종 PO 직접 검증 완료

- [x] PO 직접 검증 완료 및 승인된 Home 작업의 선별 커밋 지시 수신.
- [x] 최신 문구 수정 설치본과 현재 승인 source 유지. 추가 앱 변경·빌드·설치 없음.
- [x] 관련 없는 날짜 입력·이전 요약 문서 변경, 미사용 이미지와 임시 파일을 커밋에서 제외하는 종료 범위 확정.
- [x] push 및 다음 작업 자동 착수 없음. 새 지시 대기.

최신 설치 SHA-256: `3db179257623a599e344c9e04f3231b85c711fb4283464e4b8660efe39e70069`.
아래 후보별 미승인·설치 대기는 진행 당시 이력이다. 현재 최종 PO 승인 상태는 이 항목과 최신 후보 보고서를 따른다.

## 2026-09-30 승인된 Home 후속 문구 수정본 설치

- [x] PO의 추가 1회 빌드·설치 승인 수신. 시각 최종 승인과 Git closeout은 별개.
- [x] `파충류 · 전 연령`, `공통 · 전 연령` caption 제거와 지정 안내 줄바꿈 포함.
- [x] 추가 source 변경·그림자 조정 없음. 보존 대상 9개 source baseline 동일.
- [x] Node 24.20.0, Yarn 3.6.4, TypeScript, 대상 lint 오류 0개·새 경고 0개·기존 경고 20개, 12개 스위트 106개 테스트, diff check.
- [x] 승인된 추가 Release·설치 각 1회, verifier ACCEPTED, embedded bundle, Metro OFF, 앱 데이터 유지.
- [x] Galaxy S24 문구 제거·두 줄 안내·겹침 없음, 추천 상세·전체 목록 이동·복귀, 전체 Home·Diary 끝·맨 위·Bottom Navigation 확인.
- [x] Hero 공통 label 43개 bounds 동일. 16:31:29~16:41:34 KST, PID 9351 FATAL 0, ANR 0, RN Fatal 0, Red Screen 없음.
- [x] 최신 후보의 최종 PO 직접 검증 완료. 그림자 제안은 미적용.

최신 APK SHA-256: `3db179257623a599e344c9e04f3231b85c711fb4283464e4b8660efe39e70069`.
보고서: `docs/qa/nuri-home-layered-glass-recommendation-candidate-2026-09-30.md`.
staging, commit, push 및 자동 다음 작업 없음. 아래 설치 대기 항목은 승인 전 후보 이력이다.

## 2026-09-30 Home 내부 유리·추천 팁 후보

- [x] 내부 8개 위젯·한 줄 요약 CTA·추천 카드 60% 유리, 14%~3% 반사광, no-shadow·no-elevation.
- [x] 바깥 유리 50%, Hero·Weather·bubble canvas 및 기록 위젯 geometry 보존.
- [x] 일반 헤드라인 20dp, 추천 22dp/30dp 계층과 실제 카탈로그 내용·태그·navigation 유지.
- [x] TypeScript, 대상 ESLint 오류 0개·새 경고 0개·기존 경고 20개, 12개 스위트 105개 테스트, diff check.
- [x] Release·설치 각 1회, 서명 verifier ACCEPTED, embedded bundle, Metro OFF.
- [x] Galaxy S24 전체 Home·Diary 끝, 요약 CTA·추천 상세·목록 이동·복귀. Hero 공통 UI label 49개 bounds 동일.
- [x] 15:45:27~16:09:15 KST, PID 5860 FATAL 0, ANR 0, RN Fatal 0, Red Screen 없음.
- [x] 설치 후 audience caption 제거·안내 줄바꿈 source 반영과 재검증.
- [ ] 후속 두 문구 수정본 추가 빌드·설치 여부 결정 및 실기기 반영.
- [ ] 위젯 전용 약한 그림자 시험 여부 결정. 현재 미적용.
- [ ] 이번 후보 최종 PO 시각 승인.

설치 APK SHA-256: `8a2ded488a6c394d9121f152501c9ad24ad1e1a2dc7043b060fd355adbe61e4e`.
설치본에는 후속 두 문구 변경이 아직 없다. 보고서: `docs/qa/nuri-home-layered-glass-recommendation-candidate-2026-09-30.md`.
staging, commit, push 및 자동 다음 작업 없음. 아래는 이전 후보 검증 이력이다.

## 2026-09-30 Home 섹션 리듬·위젯·버블 후보

- [x] 날씨 기준 패널 간격 52dp: list gap 40dp와 기존 root margin 12dp. Hero 버튼·날씨 fold 유지.
- [x] 10개 공통 헤더, headline icon 제거, 8개 목록 CTA 중앙 label·오른쪽 arrow·`전체 보기` 통일.
- [x] Frequent·Summary 위젯 공통 반사광·베벨 재질. 바깥 glass 50%, no-shadow·no-elevation 유지.
- [x] Home 커뮤니티만 선택 글꼴 적용. 커뮤니티 전용 화면·Weather 고정 글꼴 유지.
- [x] 하단 41 small·8 medium·3 corner large bubble. 실제 layout anchor, 한 canvas, Hero 보존.
- [x] TypeScript, 대상 ESLint 오류 0개·새 경고 0개, 관련 9개 스위트 82개 테스트, diff check. 기존 경고 23개 유지.
- [x] 서명 검증 ACCEPTED, Release 1회, `adb install -r` 1회, Metro OFF.
- [x] Galaxy S24 전체 Home·대표 navigation·복귀. gap 146~147px, header x 84px, Hero 고유 label 40개 bounds 동일.
- [x] 확인 구간 FATAL 0, ANR 0, RN Fatal 0, Red Screen 없음. 기록 저장과 원격 운영 변경 없음.
- [ ] 이번 통합 후보의 최종 PO 시각 승인.

현재 APK SHA-256: `585d8e1df5cfd6b54b2bc17ba1a066d7b581cc4bc4910f0e3c3310f6380e7b04`.
보고서: `docs/qa/nuri-home-section-rhythm-widget-bubble-candidate-2026-09-30.md`.
staging, commit, push 및 자동 다음 작업 없음. 아래 50% 분석의 버블 미적용 항목은 이전 이력이다.

## 2026-09-30 Home Glass 50% 투과감 시험

- [x] PO의 58% 시험 및 추가 조정 지시에 따른 Autumn Home 채움 50% 후보.
- [x] Profile Edit 70%, 다른 계절, 테두리 72%, 기존 radius와 내부 UI 보존. 부모 opacity 미사용.
- [x] Single glass surface, transparent root, shadowOpacity 0, elevation 0 유지.
- [x] Hero, Weather, Home composition·styles, Profile Edit palette 및 배경 source 작업 전후 해시 동일.
- [x] TypeScript, 대상 ESLint 오류·경고 0개, 관련 6개 스위트 66개 테스트, diff check 통과.
- [x] 58% Release·설치 각 1회, 새 PO 추가 지시에 따른 50% Release·설치 각 1회.
- [x] Galaxy S24 전체 Home, 날씨 상세 이동·복귀, Timeline 이동·Home 복귀, 맨 위로 이동 확인.
- [x] Hero 공통 label 44개 bounds 동일. 확인 구간 Fatal, ANR, RN Fatal 0건 및 Red Screen 없음.
- [ ] 50% 후보 재질 PO 직접 시각 승인.
- [x] 하단 버블 분석안 적용 지시 수신 및 위 통합 후보에 구현. 최종 시각 승인은 대기.

현재 APK SHA-256: `1caa2a8c936c0d448eae3cf685bf8ee61d5efce2fbc6cf64a783104942fb7d3c`.
현재값은 기존 승인 재질에 대한 별도 시험이며 최종 freeze가 아니다. staging, commit, push 및 자동 다음 작업 없음.
분석과 증적은 `docs/qa/nuri-home-glass-transmission-bubble-analysis-2026-09-30.md`에 기록했다.

## 2026-09-30 Autumn Glossy Bubble 후보

- [x] 최신 Hero 시안 기반 좌측 중단·우측 하단 glossy sphere 및 edge crop.
- [x] Weather부터 마지막 일기까지 작은 버블과 빛을 하나의 canvas로 연결.
- [x] 기존 승인 glass와 Weather, Hero stage, Home styles 소스 보존.
- [x] 360dp, 400dp, 430dp 크기·중앙 corridor 및 dynamic content 계약 확인.
- [x] TypeScript, 대상 ESLint 새 오류·경고 0개, 관련 6개 스위트 66개 테스트, diff check 통과.
- [x] 서명 검증된 Release 1회 및 Galaxy S24 설치 1회.
- [x] 전체 Home scroll, 날씨 상세 이동·복귀, 하단 메뉴 이동, 맨 위로 돌아가기 확인.
- [x] 변경 전후 공통 UI 항목 46개 bounds 동일. NURI 확인 구간 Fatal, ANR, RN Fatal 0건, Red Screen 없음.
- [ ] PO 배경 직접 시각 승인.

APK SHA-256: `c9509cf54c1ddc3bb2342f6e83f71666488f0c385c28a4b2f81a21f2dc0bef74`.
현재 glass 승인은 유지한다. 배경 승인, staging, commit, push, 다른 계절은 자동 진행하지 않는다.
대표 증적 6장과 별도 QA 도구 사건은 `docs/qa/nuri-autumn-glossy-bubble-candidate-2026-09-30.md`에 기록했다.

## 2026-09-30 메인홈 유리패널 재질 통일 후보

- [x] 프로필 수정의 실제 채움·테두리와 Home 공통 표면 일치.
- [x] Home transparent root, single material surface, shadowOpacity 0, elevation 0 유지.
- [x] 날씨 기존 스타일 46개와 본문·지표 구성 소스 대조 일치.
- [x] 360dp, 400dp, 430dp 날씨 높이·모서리·터치 동작 테스트 통과.
- [x] TypeScript, 대상 ESLint 오류·경고 0개, 관련 테스트 6개 스위트 60개 통과.
- [x] 서명 검증된 Android Release 1회 및 Galaxy S24 설치 1회.
- [x] 실기기 Home 전체 scroll, 날씨 상세 이동·복귀, 기록 입력 진입, 하단 메뉴 이동 및 마지막 일기 렌더 확인.
- [x] 확인 구간 앱 Fatal, ANR, RN Fatal 0건. Red Screen 없음.
- [x] 주요 Hero와 하단 메뉴 bounds 변경 전 동일.
- [x] 현재 유리패널 재질 PO 승인.

배경 버블, Hero, 기능 데이터, 원격 운영 계약의 변경은 없다. staging, commit, push는 하지 않는다.
승인 범위는 현재 패널 재질이다. 배경 버블 디자인 및 배경 완성 후 재질 재평가는 별도 지시 대상이며 전체 배경 최종 freeze로 해석하지 않는다.
설치 APK SHA-256: `b1d395a521d6fa8390fd4130f366dd655d64f3b30ddbc43117bb268324b08371`.

## 2026-08-18 AUTH-001 current app/source closeout

- [x] Auth policy is Google ON, Kakao ON, Naver completely removed, Apple OFF.
- [x] Current Auth user surface/runtime/route/navigation branch/helper/config/env/dependency/feature flag/fallback has no Naver entry.
- [x] Google/Kakao OAuth start, callback, session persistence, profile fetch, and onboarding contracts are preserved.
- [x] Remote Provider catalog is a non-blocking NURI-09 read-only follow-up.
- [ ] Signed RC Google/Kakao regression remains pending NURI-12 because release signing is externally blocked.

Current Auth source of truth is the repository code and the latest Auth domain/console documents. The dated records below are historical release evidence and must not be used to restore or reintroduce a removed provider.

## Historical release evidence

## 2026-07-23 날씨 상세 지표 낮/밤 색상 release gate

- [x] 체감·습도·바람·자외선 지표의 낮 색상 `#111827` 적용.
- [x] 체감·습도·바람·자외선 지표의 밤 색상 `#FFFFFF` 분기 적용.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `4593f7f875486a1312528f722a7bc25caa310dcb346fe1c0ad0be1ad628676e2`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-detail-metrics-daynight-20260723.png`, `/tmp/nuri-qa/weather-detail-metrics-daynight-20260723-logcat.txt`.

## 2026-07-23 날씨카드 38px·카드 여유 공간 최종 release gate

- [x] 온도 숫자 본체 `38px / lineHeight 40px / weight 800` 적용.
- [x] 카드 최소 높이 `216dp outer / 213dp surface`, 중앙 영역 `100dp` 적용.
- [x] 산책 문구와 하단 metrics bar 사이 여백 `10dp` 적용.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `df16452225cae4be55bccd9c780008c2fa2ea84724c31ae2e93b7e7df769cb21`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-temperature-38px-spacing.png`, `/tmp/nuri-qa/weather-card-temperature-38px-spacing-logcat.txt`.

## 2026-07-23 날씨카드 온도 본체 최종 release gate

- [x] 온도 숫자 본체 `24px / lineHeight 28px` 적용.
- [x] 작은 `°`, `C` 단위의 상단 정렬 유지.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `d160914657d6cc290f30a378db5810f171617cc5e3e7be980c49fce7f391c61a`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-temperature-24px.png`, `/tmp/nuri-qa/weather-card-temperature-24px-logcat.txt`.

## 2026-07-23 날씨카드 상단 meta 폰트 최종 release gate

- [x] 지역명과 월·일·요일을 날씨 서브 카피와 같은 `9px / lineHeight 13px`로 적용.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `019f3b12ece2837303c137bdbdc8346836e18c6ba947022f0d1e5e3822aa8dbb`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-font-match.png`, `/tmp/nuri-qa/weather-card-font-match-logcat.txt`.

## 2026-07-23 날씨카드 메타·지표·아이콘 최종 release gate

- [x] 지역·날짜 폰트를 12px로 조정.
- [x] 날짜 옆 해·달 아이콘 제거.
- [x] 온도 `°C` 단위를 숫자 상단에 정렬.
- [x] 메인 산책 안내 14px, 주의 제목 1px 축소.
- [x] 체감·습도·바람 아이콘·라벨·값을 `#FFFFFF`로 적용.
- [x] 날씨 이모티콘을 좌측 날씨 영역 중앙 정렬.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `a7b254b4ec6de20de3368ce4567a3a1e479fa1186c2750f8554d93fb236db497`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] Supabase 변경 없음, app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-user-adjustment.png`, `/tmp/nuri-qa/weather-card-user-adjustment-logcat.txt`.

## 2026-07-23 날씨카드 날짜·지역·온도 표기 최종 release gate

- [x] 상단에서 `오늘`과 시간을 제거하고 월·일·요일만 표시한다.
- [x] 지역과 날짜를 양끝 정렬하고 같은 `textPrimary` 색상·13px로 맞췄다. 하단 체감·습도·바람·자외선 값보다 2px 크다.
- [x] 카드 높이와 본문 밀도를 축소했다.
- [x] 온도 숫자와 작은 `°`, `C`를 분리해 레퍼런스처럼 표시한다.
- [x] 산책 안내에서 불필요한 `딱`을 제거했다.
- [x] Android `SM_S937N / R5CY613NMSY`에 최신 APK 재설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `e74f771a6e0ca7ddc46e501833eaa21daf68607fa1bbf161f6c79d68022f0747`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install, Supabase dry-run 통과.
- [x] 최종 app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-final-closeout.png`, `/tmp/nuri-qa/weather-card-final-closeout-logcat.txt`, `/tmp/nuri-qa/weather-card-day-refinement.png`.

## 2026-07-23 날씨카드 세부 비율 조정 release gate

- [x] 본문·주의 패널 타이포 축소 및 주의 패널 폭 확대.
- [x] 하단 지표의 외곽 radius/border 제거, 상단선과 체감·습도·바람 우측 구분선 적용.
- [x] 야간 날씨 영역의 달 중복 제거, 날짜/시간 meta 행 달 아이콘 유지.
- [x] 온도 숫자와 `°C` 단위 분리 및 단위 크기 축소.
- [x] Android `SM_S937N / R5CY613NMSY`에 최종 APK 재설치·cold start·Home 카드 확인.
- [x] 최종 표기 조정 전 중간 artifact 기록. 최신 최종 artifact는 위 closeout 항목을 사용한다.

증적: `/tmp/nuri-qa/weather-card-day-refinement.png`, `/tmp/nuri-qa/weather-card-night-refinement-final.png`, `/tmp/nuri-qa/weather-card-refinement-final-logcat.txt`.

## 2026-07-23 홈 날씨카드 리디자인 release gate

- [x] 낮/밤 날씨카드 variant, 글래스 surface, 외곽선, 위치/시간 meta, 주의 패널, 4개 지표 bar 구현.
- [x] 선택 펫 테마 primary 색상을 강조 카피·주의 패널 제목에 연결하고 날씨 일러스트의 시맨틱 색상은 유지.
- [x] 좁은 화면 compact layout과 긴 한글 카피 overflow 방지 확인.
- [x] Android `SM_S937N / R5CY613NMSY`에 최종 APK 설치·cold start·Home 날씨카드 확인.
- [x] 최초 리디자인 APK SHA-256은 세부 조정 전 artifact로 보관하며, 최신 최종 APK는 위 세부 비율 조정 closeout 항목을 기준으로 한다.
- [x] 최초 리디자인 단계의 Jest `67 suites / 268 tests`와 release gate 통과 기록을 보존한다. 최신 결과는 위 closeout 항목을 사용한다.
- [x] 최종 app-scoped fatal scan 0건. 임시 day phase override는 QA 캡처 후 제거했으며 최종 코드에는 남아 있지 않음.

이전 증적: `/tmp/nuri-qa/weather-card-day.png`, `/tmp/nuri-qa/weather-card-night-final.png`, `/tmp/nuri-qa/weather-card-final-logcat.txt`.

## 2026-07-22 날씨 안전 안내·펫 이름 하드코딩 버그 release gate

- [x] 현재 기온·체감온도 기반 27℃/30℃/33℃ 더위 및 0℃/-5℃ 추위 안내.
- [x] 비·눈·천둥 행동 안내 및 안내 내부 아이콘 제거.
- [x] 비 시나리오의 펫 이름 `누리와` 하드코딩 제거, `아이와` 일반 문구로 교체.
- [x] `adminQA`의 실제 펫 이름 `AdminQAPet`을 홈·상세 날씨 문구에 동적으로 표시하고 `누리와` 미노출 확인.
- [x] 최종 APK 새 빌드·설치, 홈 `비 오는 날 주의`, 상세 비·더위 안내, Android back 확인.
- [x] Jest `67 suites / 268 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal 패턴 0건; 별도 Android 시스템 AppOps 로그는 앱 fatal이 아님을 분류.
- [x] Supabase schema/RPC/RLS/seed 변경 없음, dry-run remote up to date.

최종 APK SHA-256: `00fece6b5300524e58142ab6908e486418162954d898c1180de69e0ee7cc4d92`.
증적: `/tmp/nuri-qa/weather-personalized-home.png`, `/tmp/nuri-qa/weather-personalized-detail.png`, `/tmp/nuri-qa/weather-personalized-back.png`, `/tmp/nuri-qa/weather-personalized-home.xml`, `/tmp/nuri-qa/weather-personalized-detail.xml`, `/tmp/nuri-qa/weather-personalized-logcat.txt`.

## 2026-07-22 대댓글 정렬·세로선 제거 release gate

- [x] reply vertical guide/lead marker 제거.
- [x] reply avatar/name을 부모 댓글 `답글쓰기` action 시작선에 정렬.
- [x] 댓글별 가로 divider와 parent thread 외곽 border 유지.
- [x] 일반 댓글, 글쓴이 댓글, 대댓글 2개와 author accent를 Android에서 확인.
- [x] keyboard, CTA, Android back 확인.
- [x] 최신 APK SHA-256 `6b5e22a3e9dcde258570fd27061222731f2651ce57c389b17fa12f066e2be255`.
- [x] Jest `66 suites / 257 tests`, typecheck, lint, release build/install 통과.
- [x] public active hospital `5,427건`, coordinate missing `122건`, `(0,0)` `0건` read-only audit.
- [x] push token remote audit: `5건` 모두 `revoked`, active token `0건`; actual push dispatcher 비활성.
- [x] Supabase dry-run remote up to date, destructive migration 없음.
- [x] app-fatal scan `0 matching app-fatal patterns`.

증적: `/tmp/nuri-qa/community-final-release-cold-start.png`, `/tmp/nuri-qa/community-final-release-list.png`, `/tmp/nuri-qa/community-final-release-detail.png`, `/tmp/nuri-qa/community-final-release-comments.png`, `/tmp/nuri-qa/community-final-release-keyboard.png`, `/tmp/nuri-qa/community-final-release-logcat-final-app-fatal-scan.txt`.

## 2026-07-22 답글 알림·댓글 스레드 visual release gate

- [x] Home 알림 overlay를 낮은 elevation·중립 icon·작은 카드 밀도로 확인.
- [x] 댓글 thread 외곽 border와 row 간격 확인.
- [x] `답글쓰기` 아래에 1-depth 답글이 정렬되고 parent thread 내부 divider/guide line으로 구분됨을 확인.
- [x] controlled top-level 댓글 알림과 답글 알림을 각각 생성.
- [x] 댓글 알림 unread `+1`, 답글 알림 unread `+1` 확인.
- [x] 두 알림 모두 작성자·게시글 문구·`postId/commentId` target 일치 확인.
- [x] 답글 알림 탭 후 부모 댓글 자동 확장 및 실제 답글 위치 이동 확인.
- [x] 답글 target 화면에서 `답글쓰기`, nested reply, 댓글 입력창과 Android navigation bar overlap 없음 확인.
- [x] QA prefix 댓글·답글 5건 soft cleanup, active QA row `0건` 확인.
- [x] 최신 APK SHA-256 `c61972c0e1c170f310701894c83dd18cf334cf424603de09eb5f3be13db5623d`.
- [x] Jest `66 suites / 257 tests`, typecheck, lint, diff check, release build/install 통과.
- [x] app-fatal scan `0 matching app-fatal patterns`, Supabase dry-run remote up to date.

최신 artifact 증적: `/tmp/nuri-qa/community-final-release-cold-start.png`, `/tmp/nuri-qa/community-final-release-list.png`, `/tmp/nuri-qa/community-final-release-detail.png`, `/tmp/nuri-qa/community-final-release-comments.png`, `/tmp/nuri-qa/community-final-release-logcat-final-app-fatal-scan.txt`.

## 2026-07-22 Community Comment Notification Deep Link Closeout

- [x] 댓글 알림 read model에 안전한 `postId/commentId` action target 추가.
- [x] Home 알림 overlay에서 댓글 알림을 누르면 대상 게시글 상세로 이동.
- [x] 알림함에서도 댓글 알림을 누르면 동일한 게시글·댓글 target으로 이동.
- [x] 부모 댓글 thread와 1-depth 답글 자동 확장.
- [x] 대상 댓글·답글 위치 보정 스크롤과 시각적 강조.
- [x] 유효하지 않은 댓글 target의 게시글 상세 fallback.
- [x] `get_user_notifications_v2` anon read 차단 확인.
- [x] controlled secondary 댓글 알림의 작성자·게시글 문구와 target 일치 확인.
- [x] Android `SM_S937N / R5CY613NMSY` 실기기 증적 확보.
- [x] 최신 APK SHA-256 `11aa59e2f75e792b280437cab052c306c165d1d252fa3fe9abb6762473a64d0f`.
- [x] Jest `66 suites / 257 tests`, typecheck, lint, release build/install 통과.
- [x] QA 댓글 soft cleanup, notification read 처리, fixture `100 posts / 300 comments` 복구.
- [x] actual push/broadcast와 hard delete 미사용.

증적: `/tmp/nuri-qa/community-notification-deeplink-home.png`, `/tmp/nuri-qa/community-notification-deeplink-sheet-3.png`, `/tmp/nuri-qa/community-notification-deeplink-comment.png`, `/tmp/nuri-qa/community-notification-deeplink-comment.xml`, `/tmp/nuri-qa/community-notification-deeplink-logcat-full.txt`.

## 2026-07-22 Community List/View/Comment Notification Closeout

- [x] 제목과 말풍선 20dp row 중앙 정렬, 한 줄 ellipsis.
- [x] 62dp row, 세로 padding 8dp, 1px divider, 우측 댓글 rail.
- [x] 기존 `질문`, `팁 공유`, `일상`, `정보` category 유지.
- [x] controlled secondary 첫 조회 `+1`, 동일 viewer 재조회 `deduped/+0`.
- [x] Android 목록에 첫 fixture `조회 1` 반영.
- [x] controlled secondary 댓글 -> `adminQA` unread `+1` 및 Home bell badge.
- [x] 알림 overlay에 작성자와 대상 게시글 문구 표시.
- [x] actual push/broadcast/segment 호출 0.
- [x] `comment_count` drift corrective trigger와 active source count 복구.
- [x] QA 댓글 soft-delete, 알림 read, fixture active `100 posts / 300 comments` 복구.
- [x] typecheck, lint, Jest `66 suites / 256 tests`, release build/install.
- [x] APK SHA-256 `c5c54e667cbb8def21fb7fa63c45478d7ef1de3978b9edd7e20a97d2dd568a0a`.
- [x] app-scoped Fatal/ANR/unhandled/RN fatal/Fatal signal 0.

## 2026-07-19 Community List/Detail/Comment Redesign

- [x] compact editorial post row와 우측 댓글 수 rail
- [x] 가로 카테고리 tab과 44px touch target
- [x] 목록 row별 최신 댓글 N+1 request 제거
- [x] 상세 flat comment thread와 1-depth reply hierarchy
- [x] 글쓴이 댓글·답글 NURI accent 및 `글쓴이` badge
- [x] 게시글 100건, top-level 댓글 200건, 답글 100건 controlled fixture
- [x] fixture authenticated session/RLS/content policy 통과
- [x] fixture exact-prefix audit/soft-hide/restore guard
- [x] 기존 과거 QA 게시글 6건 approval/audit soft-hide, hard delete 0
- [x] cursor pagination 100건 Android scroll smoke
- [x] 댓글 input keyboard/CTA/back/nav overlap smoke
- [x] typecheck, lint, Jest `65 suites / 252 tests`
- [x] NURI app fatal/ANR/unhandled/RN fatal/Fatal signal 0

DB/RPC/RLS migration, 앱 전체 디자인, 폰트, Play Store 자산, actual push는 변경하지 않았다.

## 2026-07-19 Kakao Existing Account OAuth Re-verification

- [x] remote Kakao controlled 계정/profile/pet 유지 확인.
- [x] 실제 Kakao OAuth callback 성공 후 기존 Home/pet 복원.
- [x] `NicknameSetup` 잘못된 재진입 없음.
- [x] force-stop 후 Kakao session restore.
- [x] Kakao OAuth Android back cancel 후 로그인 화면 복귀와 spinner 종료.
- [x] profile/pet timeout, callback loop, fatal/ANR 0.
- [x] QA 종료 후 `adminQA` Home 복구 및 cross-account data 혼입 0.

## 2026-07-19 Existing Google Account Re-login Regression

- [x] controlled Google QA 계정이 remote auth/profile/pet에 유지되고 삭제·비활성 상태가 아님을 server-side로 확인.
- [x] Supabase auth callback의 profile/pet read를 auth lock 밖으로 지연.
- [x] profile `idle/loading/error` 상태를 신규 onboarding 근거로 사용하지 않음.
- [x] 실제 Android logout -> Google chooser -> callback -> 기존 Home/pet 복구.
- [x] force-stop 후 Google session 및 기존 pet 복원.
- [x] controlled Google QA pet 생일 `2016-10-21` 앱 UI 저장 및 Home/remote 확인.
- [x] typecheck, lint, Jest `64 suites / 249 tests`, Supabase dry-run, release build/install, fatal/ANR 0.

Artifact SHA-256: `ca28a6f2f1289c3aa5240de8930eabbbc946cb6df64d692bdda76a584d705207`. Google QA 생일은 테스트 입력 규칙이며 제품 기본값이 아니다.

## 2026-07-19 Final Release Gate

- [x] Google/Kakao 실제 성공, clean cancel, callback, onboarding, session restore.
- [x] Google/Kakao만 public 노출, Naver/Apple 미노출.
- [x] 일반 사용자 입력 구현 inventory와 24개 visible surface keyboard/back/nav sweep.
- [x] `adminQA` opt-in/out, permission, register, logout revoke 및 controlled account switch isolation.
- [x] 최신 release APK 핵심 도메인 회귀, app-scoped fatal/ANR 0.
- [x] 병원 public-safe projection과 `(0,0)` coordinate fallback.
- [x] typecheck, lint 0 warning/error, 64 suites/249 tests, release build/install.
- [x] Supabase remote up to date, destructive diff 0, anon admin/write smoke 차단.

Artifact SHA-256: `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4`. 현재 승인 범위의 release criterion은 모두 완료다. actual push, broadcast/segment, hard delete, 디자인·폰트, Play Store는 정책 비활성 또는 별도 승인 범위다.

## 2026-07-15 OAuth 보강 기준

- release APK build/install: 성공.
- APK SHA-256: `8bbc30195880ba02688b846551654486a695a94b0cdc84f15d01cb95e7d92d1e`.
- Android 기기: `SM_S937N / R5CY613NMSY`.
- provider surface: Google/Kakao 버튼 노출, Naver/Apple 미노출.
- Google smoke: account chooser 진입과 callback/session/onboarding 분기 확인.
- Kakao smoke: web flow 진입과 callback/onboarding 분기 확인.
- 취소 복귀: Chrome/provider session 상태 때문에 Android back이 순수 로그인 화면 복귀로 분리되지 않았으므로 100% closeout으로 쓰지 않는다.
- adminQA 고정 계정: one-time `token_hash` callback으로 Home 복구. 비밀번호, token, provider email은 문서화하지 않음.
- 검증: typecheck 통과, lint 0 error/기존 warning 4건, Jest `63 suites / 247 tests` 통과, Supabase dry-run remote up to date, release build/install 성공, 앱 fatal/ANR/unhandled/RN fatal/Fatal signal 0건.
- 계속 비활성: hard delete, 전체/segment broadcast, actual push, 앱 내부 admin UI, Naver public surface, Apple login, Play Store 자산, 앱 전체 디자인/폰트 리뉴얼.
- 조건부 잔여: controlled Google/Kakao provider identity와 정리된 browser session으로 순수 취소 후 로그인 화면 복귀 smoke. 이 항목 없이 QA·보안 100%로 쓰지 않는다.

## 2026-07-15 최종 Release Gate 보강 기준

- release APK build/install: 성공.
- APK SHA-256: `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524`.
- Android 기기: `SM_S937N / R5CY613NMSY`.
- 코드 수정: Supabase `token_hash` callback 처리, 병원 상세 public raw address 차단.
- 최신 smoke: adminQA 직접 로그인/Home, Timeline, Community list/detail/comment keyboard/back, Hospital list/detail public-safe, Walk list/detail/search/back, Notification opt-in/permission/opt-out, logout, secondary QA account switch, adminQA 복구.
- refined logcat: 앱 `FATAL EXCEPTION`, `ANR`, `Unhandled promise`, `ReactNativeJS fatal`, `Fatal signal` 0건.
- 검증: typecheck 통과, lint 0 error/기존 warning 4건, Jest `63 suites / 247 tests` 통과, Supabase dry-run remote up to date, diff check 통과.
- 계속 비활성: hard delete, 전체/segment broadcast, actual push, 앱 내부 admin UI, Naver public surface, Apple login, Play Store 자산, 앱 전체 디자인/폰트 리뉴얼.
- 조건부 잔여: controlled Google/Kakao provider identity 기반 실제 외부 OAuth 성공·취소·복귀 smoke 1건. 이 항목 없이 QA·보안 100%로 쓰지 않는다.

## 2026-07-14 앱 본 프로젝트 closeout 기준

- 관리자 홈페이지 단계별 본구현은 종료한다. 이후 허용 작업은 운영 장애, 보안 패치, 실제 회귀 수정뿐이다.
- custom domain/DNS/SSL, Cloudflare Access 또는 유료 Vercel 보호 계층, 외부 runtime monitoring, 실제 MFA/recovery material, 상시 2인 운영 체계는 외부 운영 조건이며 앱 release blocker가 아니다.
- 이번 점검에서 승인 범위 내 P1 코드 gap으로 확인된 `deleteCommunityComment` hard delete fallback을 제거했다. 댓글 삭제는 soft update only다.
- release APK build/install: 성공.
- APK SHA-256: `59a152f3fe0d95bfc0579b8eb8942e16053047bd7d9f31dcaa346404493612b9`.
- Android 기기: `SM_S937N / R5CY613NMSY`.
- 최신 smoke: Home, Community list/detail, 댓글 keyboard/back, Hospital list/detail/back, Walk list/search keyboard/back.
- refined logcat: `FATAL EXCEPTION`, `ANR`, `Unhandled promise`, `ReactNativeJS fatal`, `Fatal signal` 0건.
- 검증: typecheck 통과, lint 0 error/기존 warning 6건, Jest 62 suites / 244 tests 통과, Supabase dry-run remote up to date.
- 계속 비활성: hard delete, 전체/segment broadcast, actual push, 앱 내부 admin UI, Naver public surface, Apple login, Play Store 자산, 앱 전체 디자인/폰트 리뉴얼.

운영 메모:

- 2026-07-13 NURI Admin Final Gap Closure & Evidence Closeout 재판정:
  nuri-web private GitHub remote `git@github.com:jaejun0617/nuri-web.git` 생성과 `main` push는 완료했다.
  최신 nuri-web production runtime 검증 commit은 `bb840f8`이고 production URL `https://nuri-web-beryl.vercel.app`은 `/api/health`에서 `database=connected`, `version=bb840f857574`를 반환한다.
  최신 deployment ID는 `dpl_D5xyVzS65SA3Cz69Wn5FrKoxoHUA`이며, 직전 Vercel `UNKNOWN` source deploy 문제는 env 재등록과 prebuilt artifact deploy로 복구했다.
  GitHub Actions production monitor 정상 run과 강제 실패 test alert issue 생성/종료를 확인했다.
  Android `SM_S937N / R5CY613NMSY`에서는 latest release APK install, cold start, Home, 커뮤니티 리스트, logcat fatal/ANR/unhandled/RN fatal/Fatal signal 0건까지 확보했다.
  2인 운영자 서버 smoke는 `pet_nuri` 요청, `pet_nuri_reviewer` 승인/실행, 자기 승인 차단, undo 원상복구까지 통과했다.
  2026-07-14 기준 Android moderation integration evidence와 앱 source-of-truth 재정렬을 반영해 관리자 홈페이지 단계별 본구현은 종료한다.
  MFA/recovery material, Sentry/Better Stack류 runtime monitoring, custom domain, 상시 2인 운영 체계는 앱 release blocker가 아닌 외부 운영 조건으로 기록한다.

- 2026-07-13 NURI Admin Final Production Completion & Project Handoff Closeout: `nuri-web /admin`
  당시 코드 범위 completion으로 기록했고, 2026-07-14 앱 source-of-truth 재정렬에서 단계별 본구현 종료로 확정한다. audit/operations/domain CSV/PDF export,
  export security test, 앱 hidden/private/deleted direct detail read-path 차단, Android
  현재 세션 cold start/logcat smoke를 완료했다. custom domain/DNS, 외부 access layer,
  MFA/recovery QA와 runtime error monitoring은 외부 소유권/계정/비밀 입력 조건이다.
  앱 내부 admin UI, hard delete, 전체/segment broadcast, 실제 push 발송, Play Store 자산,
  앱 디자인 리뉴얼은 열지 않았다.

- 2026-07-13 NURI Admin Final Operations Platform Completion: `nuri-web /admin`은 role/capability,
  MFA factor 로그인 guard, 2인 승인 실행, conflict-safe rollback batch 실행, operator/MFA/recovery
  route, notification opt-in/token lifecycle, monitoring summary까지 보강됐다. 앱 repo additive
  migration `20260713190000_admin_final_operations_platform.sql`과 corrective capability backfill
  `20260713193000_admin_final_operator_capability_backfill.sql`은 remote에 반영됐다. 앱 내부
  관리자 UI, hard delete, 전체/segment broadcast, 실제 push 발송, Play Store 자산, 앱 디자인
  리뉴얼은 열지 않았다. Android 실기기 직접 증적은 현재 device 미연결이면 완료로 보지 않는다.

- 2026-07-13 NURI Admin Production Deployment & Operations Cutover: `nuri-web /admin`은 Vercel production HTTPS 환경에 배포됐다. production URL은 `https://nuri-web-beryl.vercel.app`, 최신 deployment ID는 `dpl_D5xyVzS65SA3Cz69Wn5FrKoxoHUA`이다. production auth는 Supabase `admin_operator_accounts` credential store를 사용하고 local file credential fallback은 차단했다. `/admin`/`approvals`/`rollback` 비로그인 redirect, `/api/health` database connected, anon dashboard/action history RPC 차단, service-role dashboard summary smoke를 통과했다. `pet_nuri`/`pet_nuri_reviewer` 비밀번호 변경과 2인 승인 서버 smoke는 완료했다. custom domain은 NURI 소유 domain/DNS 확인 전까지 조건부다. MFA/recovery와 Android app read-path e2e는 별도 증적이 필요하다. Play Store 자산, 앱 디자인 리뉴얼, push actual, hard delete, broadcast는 열지 않았다.

- 2026-07-13 관리자 홈페이지 본구현 5차/Admin Ops Production Transition Closeout: `nuri-web /admin`에 2인 승인 queue, rollback request, production-safe notification policy, action policy dashboard, 최소 `npm test`를 추가했다. 앱 repo additive migration `20260713093000_admin_operations_phase5_production_transition.sql`은 remote 반영과 dry-run up-to-date를 확인했다. anon negative smoke와 service-role approval/self-review/rollback smoke를 통과했다. 실제 hosting/DNS/public URL은 PO 승인 전까지 보류한다. Play Store 자산, 앱 디자인 리뉴얼, push actual, hard delete, broadcast는 열지 않았다.
- 이 문서는 v1.0 기능 기준선 evidence와 v1.1 착수 전 닫아야 하는 잔여 task/risk를 함께 관리한다.
- 2026-06-02 KST 기준 exact release APK 설치 smoke와 일반 사용자 최종 smoke, 동물병원 admin/super_admin 운영자 서버 조작 QA는 수행됐다.
- 2026-06-04 KST 기준 `profiles.role` self-escalation은 corrective migration과 remote 회귀 테스트로 차단했다.
- Play Store 제출 자산은 V1.0 기능/QA blocker가 아니며, NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 진행한다.
- task18 상세 실행 순서, 캡처 파일명, 보관 규칙은 `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`를 따른다.
- v1.0은 기능 개발 Code Freeze 기준선이며 스토어 제출 완료 버전이 아니다.
- 현재 unchecked 운영 evidence 항목은 신규 기능 개발이 아니며, V1.1 또는 운영 보강 트랙에서 다룬다. Play Store 제출 자산은 V1.1 작업이 아니라 최종 제출 직전 준비로 분리한다.
- v1.1은 v1.0 미완성 이월이 아니라 신규 업데이트 트랙이다.
- 과금, Premium AI reply, Guestbook private letters 확장, Typography foundation rollout은 v1.1 신규 업데이트 후보로 관리한다.
- 2026-06-23 release candidate smoke는 release APK update install 기준으로 사용자-facing 핵심 경로를 재확인했다. Play Store 자산은 여전히 V1.0/V1.1 전체 완료 후 최종 제출 직전 단계다.
- 2026-06-30 신규 QA 계정 full E2E/navigation audit에서 로그아웃 후 email/password 재로그인 stale onboarding blocker를 발견해 최소 수정했다. 재빌드한 release APK에서 cold start와 logout -> email login home 복귀를 확인했고, 주요 화면 17개 back audit과 병원 전국 coverage read-only audit을 통과했다.
- 2026-06-30 V1.1 추가 업데이트 1차 MVP로 회원탈퇴 입력 확인, 최근 로그인 표시, 타임라인 카테고리 count를 구현했고 edge QA를 수행했다. 신규 DB/migration/seed/design 변경은 없고 focused tests, Android 회원탈퇴 모달, 최근 로그인 email cold start, Kakao/Google OAuth 진입, 타임라인 작성/수정/삭제 count 갱신 smoke를 통과했다.
- 2026-07-01 이후 모든 실기기 QA에는 키보드바/키보드 회피/입력창 가림/primary action 접근성/모달 크기/문구 잘림/Android back dismiss 확인을 포함한다. 이 기준은 디자인 리뉴얼이 아니라 release blocker 방지용 QA gate다.
- 2026-07-01 V1.1 추가 업데이트 2차 MVP로 데일리 streak/데일리판, 앱 내부 알림 read path, XP/레벨/칭호 최소 MVP를 구현했다. additive migration/RPC/RLS를 적용했고, `adminQA` 일반 사용자 계정 기준 타임라인 데일리판/XP 카드, 알림함 read/mark read, keyboard bar smoke를 확인했다. 2026-07-02에는 홈 알림 UX를 inline panel에서 상단 floating notification shade로 수정해 홈 콘텐츠가 밀리지 않도록 닫았다. 같은 날 알림별 X는 제거하고, 카드가 이동하며 사라지는 좌우 스와이프 dismiss, 전체삭제, 화살표-only 펼침/접힘을 user-scoped dismiss와 client UI 상태로 추가했다. release APK에서 `ADMIN_QA_NOTICE` 다중 알림 누적/스크롤/삭제/빈 상태/펼침·접힘을 확인했다. 운영자 발송 UI, push, 홈 위젯, 무지개다리 서비스, 디자인 전체 조정, Play Store 자산은 열지 않았다.
- 2026-07-02 V1.1 final sign-off 기준, V1.0 회귀와 V1.1 산책 POI/1차 MVP/2차 MVP/notification 최신 UX/RLS/RPC/Android `adminQA` smoke를 재검증했고 `V1.1 final sign-off 가능`으로 판정한다. V1.1.1 scope audit에서 Android 홈 위젯 native/JS 일부 코드가 release scope에 남아 있음을 확인해 receiver를 disabled/exported false로 막고 native package 등록을 제거했다. push remote notification, 운영자 발송 UI, 무지개다리 서비스, 고급 XP/랭킹은 release build에 의도치 않게 노출되지 않는다.
- 2026-07-02 V1.1.1 1차로 `전체메뉴 > 나의 반려동물 > 활동·칭호` 대시보드를 추가했다. 기존 XP ledger/RLS/RPC를 재사용해 현재 성장, 펫별 활동, 산책/타임라인/건강관리, 공통 커뮤니티/댓글, 칭호·훈장 보관함을 표시한다. 커뮤니티/댓글은 user-level 공통 활동으로만 표시해 멀티펫 카드에 중복 합산하지 않는다. 2026-07-09 고도화에서 Lv.1~30과 privacy-limited `누리 랭킹` MVP를 추가했으며, 공개 경쟁형 리더보드는 후속으로 유지한다.
- 2026-07-03 V1.1.1 closeout 갱신: 홈 간편 알림창 swipe dismiss와 `모두 치우기`는 전체보기 삭제가 아니라 home-only local/user-scoped hide로 분리했다. 전체보기/알림함 개별 삭제와 전체삭제는 기존 서버 RPC의 user-scoped hide를 유지하며, read/home dismiss/inbox delete는 분리 상태다. service role key가 현재 셸에 없어 adminQA 새 알림 row 생성 smoke는 미수행했고, focused test와 기존 read path evidence로 보완한다.
- 2026-07-03 활동·칭호 조건부 closeout 해소: `adminQA`에 QA 전용 `AdminQAPet2`를 추가해 실제 멀티펫 edge를 확인했다. `AdminQAPet2` 기준 산책 2건, 식사 1건, 일기장 1건, 생활 1건을 저장했고, 활동·칭호는 총 `120 XP`, AdminQAPet `60 XP · 훈장 2개`, AdminQAPet2 `45 XP · 훈장 1개`, AdminQAPet2 카테고리 `전체 5 / 산책 2 / 식사 1 / 일기장 1 / 생활 1`을 표시했다. 같은 날 산책 2건은 streak/timeline에는 반영되지만 XP daily cap으로 추가 산책 XP가 중복 지급되지 않았다. pet/common owner label을 칭호·훈장 조건에 표시하도록 보강했다.
- 2026-07-03 알림 live row 조건부: authenticated 안전 생성 RPC나 QA fixture가 없고 `user_notifications`는 select-only RLS라 새 알림 row 기반 live retention smoke는 수행하지 않았다. service role key는 요구하거나 노출하지 않았고, home quick dismiss와 inbox delete 분리는 focused test와 기존 read path evidence로 보완한다. release blocker는 아니다.
- 2026-07-09 V1.1.1 고도화 1차: additive remote migration으로 운영자 알림 campaign/audit table, admin-only 발송 RPC, QA-only self notification RPC, Lv.1~30 curve, 장기 activity summary RPC, privacy-limited ranking RPC를 적용했다. 전체메뉴에는 `누리 랭킹` 사용자 read-only 화면만 추가했고, 운영자 발송 UI는 앱 내부에 노출하지 않았다. push notification은 실제 발송/permission prompt/token 저장을 열지 않고 정책 문서로만 정리했다. 랭킹 RPC는 email/phone/user_id/pet_id/raw id를 반환하지 않고 pending deletion 사용자를 제외한다. Android 실기기 ranking smoke와 notification live retention evidence는 이번 고도화 closeout evidence로 별도 캡처한다.
- 2026-07-10 운영자 알림 관리 콘솔/live retention closeout: 앱 내부 일반 사용자 UI가 아닌 `admin-console/notification-console.html` 별도 정적 콘솔을 추가했다. `admin_send_qa_user_notification_v1`와 `admin_notification_audit_feed_v1`를 remote에 적용했고, `profiles.deleted_at` 가정을 제거하는 corrective migration도 적용했다. anon admin RPC는 401/42501, non-admin admin send는 42501로 차단된다. 실제 admin wrapper 경로로 `adminQA` 단일 대상 새 알림 row를 만들고 Android에서 홈 표시, home swipe dismiss, 알림함 유지, 알림함 개별 삭제, 전체삭제, 홈 재노출 없음까지 확인했다. service role key/push secret/전체 broadcast는 사용하지 않았다.
- 2026-07-11 V1.1.1 고도화 final closeout: Android `SM_S937N / R5CY613NMSY`에서 `누리 랭킹` 종합/산책/글/댓글/건강/생활/미용 탭, 기둥그래프, raw id/email/phone/pet_id 미노출 상태를 유지한다. PremiumRewardModal은 max 상태에서 progress bar와 `최고 레벨 달성` 문구를 표시하도록 보강했고 focused max state test로 over-max crash 없음까지 고정했다.
- 2026-07-11 pre-store 필수 polish: 성장 시스템을 Lv.1~100 / max `1,250,000 XP`로 확장하고, 기존 Lv.1~30 threshold는 유지했다. 향후 XP 지급은 base 1.3배 + level-band 감쇠를 적용하며 daily cap/source idempotency는 유지한다. 메인 홈에는 현재 펫의 pet-level 대표 칭호 badge를 추가했고, user-level 공통 칭호는 펫 칭호처럼 오표시하지 않는다. adminQA 첫 pet에 산책/식사/일기장/생활-미용/건강 QA 게시글을 실제 생성해 XP ledger 12건 / 262 XP, Lv.3, pet-level `추억 수집가` 홈 badge 표시까지 확인했다. push 실제 발송, Play Store 자산, 홈 위젯, 무지개다리는 열지 않았다.
- 2026-07-11 홈/주요 도메인 로딩 최적화: Home shell은 세션/user 기준으로 즉시 표시하고, 기록/일정 bootstrap, 날씨 refresh, 추천 가이드 fetch, 대표 칭호 RPC는 interaction 이후 또는 cache/background refresh로 분리했다. `활동·칭호`는 skeleton card를 먼저 보여주고, `누리 랭킹`은 탭별 cache/skeleton으로 이전 탭 데이터 flicker를 줄인다. DB/RPC/RLS/seed 변경은 없다.
- 2026-07-11 실서비스급 최적화/안정화: Home 기록/일정 preview에 `userId + petId` scoped disk cache를 추가했고, schema version/3일 TTL/corrupt fallback/logout clear를 적용했다. 활동·칭호 service는 `get_user_activity_long_summary_v1`를 우선 사용해 level summary와 community/comment count 중복 query를 줄인다. `누리 랭킹`은 React Query category key 기반 cache/stale policy로 전환했다. Timeline/Community의 count/summary/initial fetch는 interaction 이후로 지연해 첫 paint와 경쟁하지 않게 했다. Play Store 자산, push 실제 발송, 관리자 홈페이지 본구현, 앱 폰트/디자인 전체 리뉴얼은 진행하지 않았다.
- 2026-07-11 병원/산책 조건부 closeout: Android `SM_S937N / R5CY613NMSY` release build에서 `우리동네 동물병원` 리스트/상세/back, `산책` 리스트/상세/back direct visual smoke를 확보했다. 병원 public text 기준 운영시간/24시/야간/주말/응급/특수동물/주차/장비/홈페이지/SNS/raw/internal/source 노출 0건, 산책 위치/API 준비 전 crash 0건, logcat fatal/ANR/unhandled/RN fatal 0건으로 확인했다.
- 2026-07-11 관리자 홈페이지 1차: 앱 내부 일반 사용자 화면이 아닌 `admin-console/index.html` 별도 정적 admin web shell을 추가했다. 1920px/1440px/tablet/mobile responsive QA를 수행했고, 기존 `notification-console.html` 진입 링크를 유지한다. 인증/권한 gate, public hosting, 실운영 데이터 write 기능은 본구현 트랙으로 분리한다.
- 2026-07-12 관리자 홈페이지 source of truth 정정: 앱 repo의 `admin-console`은 QA/임시 콘솔 및 참고 자산으로만 보고, 실제 관리자 홈페이지 본구현은 별도 `nuri-web` 프로젝트의 `/admin` 트랙에서 진행한다. `nuri-web` 관리자 홈은 NURI Ops dashboard로 리디자인했고, Users/Pets/Timeline/Health/Walk/Hospitals/Community/Notifications/Rankings/Activity/Reports/QA/Settings/Audit Logs/Guides CMS IA를 담는다. 현재 실제 write 기능은 가이드 CMS만 유지하고, 유저 조치/게시글 삭제/공지 발송/전체 broadcast는 권한/RLS/audit 본구현 전까지 disabled 상태로 둔다.
- 2026-07-12 관리자 홈페이지 인증/한글화 closeout: `nuri-web /admin`은 관리자 로그인, HttpOnly cookie 세션, 비밀번호 변경 화면, 로그아웃을 갖췄다. 관리자 ID는 `pet_nuri`이고 초기 비밀번호 값은 코드/문서/로그에 남기지 않는다. `/admin` 비로그인 접근은 `/admin/login`으로 redirect되고, 관리자 세션 기반 1920/1440/tablet/mobile visual QA를 완료했다. 위험 write/broadcast는 계속 비활성이다.
- 2026-07-12 관리자 홈페이지 본구현 2차: `nuri-web /admin`에 신고/콘텐츠 soft action, 동물병원 검수 action, 사용자 검토 flag, 공통 확인 모달, 운영 action audit log를 추가했다. 앱 repo에는 additive migration `20260712130000_admin_operations_phase2_actions.sql`로 overlay 상태 table과 admin-only RPC를 추가/remote 반영했다. hard delete, 사용자 권한 상승, 전체 broadcast, 앱 내부 admin UI 노출은 계속 금지 상태다. nuri-web lint/build/diff와 responsive screenshot QA, Supabase anon 차단/service-role smoke를 통과했다.
- 2026-07-12 관리자 홈페이지 본구현 3차/4차: `nuri-web /admin`에 role/capability model, action disabled reason, server action capability guard, `/admin/notifications`, 운영 통계 dashboard, audit before/after diff, action history, conflict-safe undo UI를 추가했다. 앱 repo에는 additive migration `20260712143000_admin_operations_phase3_undo_stats.sql`로 undo link table, v2 action RPC, undo/history/dashboard summary RPC, nuri-web 서버 전용 QA 알림 wrapper를 추가/remote 반영했다. hard delete, 권한 상승, 전체 broadcast, push 실제 발송, 앱 내부 admin UI 노출은 계속 금지 상태다. nuri-web lint/build/diff, responsive screenshot QA, Supabase anon negative smoke/service-role read smoke를 통과했다.
- 디자인 수정은 이번 release QA 턴에서 하지 않았다. 앱 폰트/디자인 전체 리뉴얼은 별도 트랙으로 유지하며, Play Store 자산 패키지는 모든 기능 안정화, 관리자 홈페이지, 앱 전체 디자인 재정비, 최종 QA 이후 최종 제출 직전 단계에서만 진행한다.

## 2026-06-30 Full App E2E / Navigation / Hospital Coverage RC QA

- [x] 신규 QA 계정 생성 및 신규 사용자 플로우 검증
  - 테스트 계정: `qa0623145019@example.com`
  - 비밀번호: 문서화하지 않음
  - Splash, Login/Signup, Google/Kakao 버튼, Nickname, Pet Create, Home 진입 확인
- [x] 신규 계정 release blocker 수정
  - 로그아웃 후 email/password 재로그인에서 profile/pet이 있는데도 `NicknameSetup`으로 잘못 진입하는 문제를 수정했다.
  - `authStore.setSession` 로그인 세션 boot gate와 `shouldReloadUserScopedState` same-user reload 기준을 보강했다.
  - focused auth/app boot tests 13/13 통과, release APK rebuild/install 후 cold start와 재로그인 home 복귀 확인.
- [x] 전체 기능 E2E smoke
  - Home, Profile/Pet, Pet Edit/Create guard, Health, Timeline, Animal Hospital, Walk/POI, Community/Policy, Weather, 전체메뉴/설정, Logout/session restore 확인.
- [x] navigation/back audit
  - 주요 사용자-facing 화면 17개에서 상단 뒤로가기와 Android system back을 확인했다.
  - Animal Hospital 전화/길찾기 CTA와 Community policy 외부 문서에서 앱 복귀 확인.
- [x] Animal Hospital 전국 커버리지 read-only audit
  - public active count 5,427건
  - 서울/경기/인천/부산/대구/대전/광주/울산/세종/제주/강원/충청/전라/경상 대표 좌표 모두 10km/20건 반환
  - 판정: `우리동네 병원 찾기 전국 확장 완료, coordinate missing 122건은 release blocker 아님`
  - coordinate missing 122건은 V1.1 데이터 품질 보강 후보
- [x] Walk/POI 회귀
  - approved/public/active POI 1,145건 유지
  - nearby/search/detail RPC 정상, direct anon table select `42501`, Ready 권역 Kakao 차단 유지
- [x] crash-free
  - Android `SM_S937N` logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## 2026-06-30 Animal Hospital Coordinate Missing / V1.1 Planning Update

- [x] Animal Hospital coordinate missing 122건 read-only audit
  - public active count: 5,427건
  - coordinate missing public active: 122건
  - primary address 보유: 122건
  - road address 보유: 110건
  - lot address 보유: 121건
  - official phone 보유: 82건
  - providerPlaceUrl 보유: 0건
  - 판정: `우리동네 병원 찾기 전국 확장 완료, coordinate missing 122건은 release blocker 아님`
- [x] coordinate missing UX 판정
  - nearby 좌표 기반 리스트는 좌표가 있는 병원만 반환한다.
  - text search/detail은 주소/전화가 있으면 정보형으로 표시한다.
  - 좌표가 없으면 지도 preview와 좌표 기반 길찾기 URL은 열지 않고 주소 기준 안내로 안전 처리한다.
  - 병원 좌표 보정은 V1.1 데이터 품질 보강 후보이며 이번 턴에서 DB write/seed 수정은 하지 않았다.
- [x] V1.1 추가 업데이트 공식 작업서 생성
  - 문서: `docs/planning/v1.1-additional-update-plan-and-checklist.md`
  - 대상 기능: 타임라인 카테고리 count, 최근 로그인 방식, 무지개다리 서비스 제안, 연속 출석/데일리판, 홈 위젯, 회원탈퇴 입력 확인, 알림 수신 검증, XP/레벨/칭호
  - 1차 MVP는 구현 완료 상태이며, 2차 MVP는 2026-07-01 기준 정책 v1 확정과 최소 구현까지 진행했다. V1.1.1 후보는 별도 트랙으로 유지한다.
- [x] 운영/출시 기준 갱신
  - Supabase/Codex 운영비: PO 확정 완료
  - 디자인 조정: 앱 폰트/디자인 전체 리뉴얼은 별도 트랙으로 진행
  - Play Store 자산 패키지: 모든 기능 안정화, 관리자 홈페이지, 앱 전체 디자인 재정비, 최종 QA 이후 최종 제출 직전 진행
  - admin 운영자 QA: 별도 홈페이지/관리 페이지 트랙으로 이동

## 2026-06-30 V1.1 추가 업데이트 1차 MVP 구현

- [x] 회원탈퇴 입력 확인
  - `회원탈퇴` 직접 입력 전 `탈퇴 요청하기` disabled 확인
  - 7일 유예 탈퇴 flow와 복구/차단 계약 유지
  - 취소와 Android back dismiss 확인
  - `회원탈퇴` 정확 입력, 오타/공백 trim, 탈퇴 요청 성공 시 최근 로그인 기록 삭제는 focused test로 고정
  - 실제 탈퇴 예약 실행은 QA 계정 보호와 실기기 한글 입력 자동화 제약 때문에 미수행. release blocker 아님
- [x] 최근 로그인 방식 표시
  - 저장 provider는 `email`, `google`, `kakao`만 허용
  - 이메일 주소와 소셜 계정 식별자는 저장하지 않음
  - 로그아웃 후 로그인 화면 email 영역 `최근 로그인` 표시와 cold start 유지 확인
  - Kakao는 실제 OAuth callback 후 신규 온보딩 진입 확인
  - Google은 account chooser와 `nuri://auth/callback` redirect 진입 확인
  - social 최종 pill은 외부 계정 consent/신규 온보딩 완료 조건 때문에 focused provider persistence test로 보완
- [x] 타임라인 카테고리 count
  - 전체/산책/식사/일기장 count badge 표시
  - 현재 선택 반려동물 기준 minimal metadata aggregation 사용
  - 신규 RPC/migration 없음
  - QA 계정에서 `QA_COUNT_TEST_WALK` 작성 후 전체 1/산책 1 확인
  - 작성 글을 식사로 수정 후 산책 0/식사 1 확인
  - 작성 글 삭제 후 전체 0/식사 0과 empty UX 원복 확인
- [x] 검증
  - focused tests: account deletion confirmation, recent login provider, timeline category count, auth boot/onboarding regression 통과
  - Android: 타임라인 count write/edit/delete, 회원탈퇴 모달 disabled/cancel/back, 로그아웃 후 최근 로그인 pill, Kakao/Google OAuth 진입 확인
  - 금지 범위 준수: 디자인, Play Store 자산, admin UI, seed, DB, migration 변경 없음

## 2026-07-01 실기기 키보드바 QA 기준

- [x] 키보드바 QA 기준을 release checklist에 추가
  - 대상: 로그인 이메일/비밀번호, 닉네임, 펫 이름, 날짜 직접 입력, 회원탈퇴 입력 모달, 타임라인 작성/수정, 커뮤니티 작성/댓글, 병원 검색, 산책 검색, 앱 내 모든 TextInput.
  - 기준: 키보드가 떠도 입력창과 해당 화면의 primary action이 가려지지 않는다.
  - 기준: 완료/취소/저장/로그인 버튼이 접근 가능하다.
  - 기준: Android system back으로 keyboard가 먼저 dismiss되고, dismiss 후 layout이 깨지지 않는다.
  - 기준: 모달 높이/너비가 답답하지 않고 문구가 잘리지 않는다.
  - 기준: NURI의 귀여움, 따뜻함, 고급스러운 정돈감을 해치지 않는다.
- [x] Android 로그인 입력 keyboard smoke
  - 기기: `SM_S937N / R5CY613NMSY`
  - 로그인 화면 이메일 입력 focus 시 IME top `y=1395`, IME height `945` 확인.
  - 이메일/비밀번호 입력과 로그인 primary button은 키보드 위에 남아 접근 가능.
  - Android back으로 keyboard dismiss 후 로그인 화면 layout 유지.
  - 입력 중 소셜 버튼은 키보드 아래 위치하지만 입력 상태의 primary action은 로그인 버튼이므로 blocker 아님.
- [ ] 다음 실기기 QA에서 회원탈퇴 모달, 닉네임, 펫 날짜, 커뮤니티 댓글, 병원/산책 검색의 keyboard evidence를 화면별로 누적한다.
- [x] 타임라인 작성 keyboard evidence 누적
  - 2026-07-01 Android `SM_S937N / R5CY613NMSY`에서 타임라인 기록 작성 화면의 제목/내용 입력 focus, IME 표시, 상단/하단 완료 버튼 접근 가능, Android back keyboard dismiss, dismiss 후 draft 보존 모달을 확인했다.

## 2026-07-01 V1.1 추가 업데이트 2차 MVP 구현 / adminQA smoke

- [x] 고정 테스트 계정 정책 반영
  - 테스트 계정 표시명: `adminQA`
  - 권한: 일반 사용자
  - admin/super_admin 권한 부여 없음
  - 테스트 pet: `AdminQAPet`
  - 비밀번호, token, provider 계정 전체값, 이메일 전체값 문서화 없음
- [x] additive DB/RPC/RLS 구현
  - migration: `20260701090000_v11_second_mvp_activity_notifications_xp.sql`
  - corrective migration: `20260701093000_fix_v11_xp_award_ambiguous_columns.sql`
  - tables: daily activity, streak summary, announcement/user notification/read receipt, XP ledger, level summary, title
  - RPC: daily status/record/remove, notification unread/list/mark read, XP award/level/title
  - RLS: authenticated user-owned select, anon direct select row 0, unauthenticated RPC permission denied
- [x] 데일리 streak / 데일리판
  - 타임라인 산책 카테고리 작성 성공 시 KST user+pet+date 기준 하루 1회 인정
  - 같은 날 중복 작성은 streak 중복 증가 없음
  - 타임라인 화면에 오늘 완료, current/best streak, 하루 1회 안내 표시
  - 삭제/카테고리 변경 시 당일 source 제거와 summary 재계산 경로 구현
- [x] 알림 read path
  - 전체메뉴 `알림함` entry와 unread dot/count 추가
  - `UserNotifications` 화면에서 목록, empty state, mark read 제공
  - 홈 상단 알림 아이콘에서 `오늘의 메시지로 하루를 시작해요` 문구 아래 위치에 floating notification shade overlay 제공
  - 홈 알림 카드는 제목 1줄, 본문 preview 최대 2줄, 날짜 하단, 화살표-only 펼침/접힘 구조로 제공
  - 알림별 작은 X는 제거하고, 좌우 스와이프 시 카드가 이동하면서 user-scoped dismiss 처리
  - 운영자 발송 UI와 push는 제외
- [x] XP / 레벨 / 칭호 MVP
  - source idempotency, daily cap, Lv.1~10 level curve, 최소 칭호 지급 구현
  - 타임라인 작성과 산책 카테고리 작성에 XP 연결
  - 타임라인 활동 성장 카드에 total XP, level, 최신 칭호, 다음 레벨 progress 표시
  - V1.1.1 1차: 전체메뉴 `활동·칭호` 화면에서 pet-scoped 활동과 user-scoped 공통 활동을 분리 표시
  - Lv.1~100 확장과 XP reward 감쇠는 2026-07-11 서버/app curve와 focused test로 반영
- [x] Android `adminQA` smoke
  - release APK rebuild/install/cold start
  - 로그인 후 홈 진입, 타임라인 데일리판/XP 카드 표시
  - 전체메뉴 알림함 진입, unread count, 목록, mark read 확인
  - 타임라인 작성 입력과 keyboard bar smoke 확인
  - logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## 2026-07-01 V1.1 추가 업데이트 2차 MVP edge QA closeout

- [x] `adminQA` 고정 계정 상태 확인
  - 권한: 일반 사용자
  - profile, nickname, `AdminQAPet`, onboarding 정상
  - pending deletion 없음
  - admin/super_admin 권한 부여 없음
  - 무작위 신규 QA 계정 생성 없음
- [x] 데일리 streak edge
  - transaction rollback smoke로 KST 다음날 current streak 증가 확인
  - missed day reset 확인
  - best streak 유지 확인
  - 같은 날 중복 작성 시 streak 중복 증가 없음
  - 삭제/카테고리 변경 후 당일 상태 재계산 확인
  - user/pet isolation 확인
- [x] 알림 read path edge
  - unread count, 목록, mark read, mark read idempotency 확인
  - 알림별 X 제거, 카드 이동형 좌우 스와이프 dismiss, 전체삭제 확인
  - collapsed/expanded card, 아래/위 화살표 tap, 세로 swipe 펼침/접힘 확인
  - 삭제는 원본 데이터 hard delete가 아니라 user-scoped dismiss로 처리
  - 사용자 알림과 활성 공지 read path 확인
  - cross-user notification hidden 확인
  - 전체메뉴 badge/dot과 알림함 진입점 유지
  - 홈 상단 알림 아이콘 탭 -> floating notification shade overlay -> X/backdrop/Android back 닫기 확인
  - 2026-07-02 코드 기준 inline panel 제거와 overlay shade 구현, typecheck/lint/focused test/release build 통과
  - 2026-07-02 `SM_S937N / R5CY613NMSY`에서 overlay screenshot/uiautomator bounds, open 전후 홈 콘텐츠 y좌표 유지, adminQA empty/list/read path 가능 범위를 재확인했다. 최신 final sign-off smoke에서는 adminQA inbox가 이전 전체삭제 후 empty 상태였으므로 live item gesture는 focused test와 직전 다중 알림 실기기 evidence로 보완한다.
- [x] XP / 레벨 / 칭호 edge
  - source idempotency 확인
  - 150 XP/day cap 확인
  - Lv.1~10 level curve 확인
  - title 1회 지급과 중복 방지 확인
  - cross-user XP/title hidden 확인
  - 삭제/신고/차단 콘텐츠 XP clawback은 V1.1.1 정책 후보이며, 같은 source_id 반복 지급 방지는 동작함
- [x] RLS/RPC 보안 재검증
  - anon direct table select row 0
  - anon RPC `42501` 계열 거부
  - authenticated own-data only
  - cross-user/cross-pet hidden
  - raw/internal/admin field와 secret/token 노출 없음
- [x] Android `adminQA` edge smoke
  - release APK rebuild/install
  - 타임라인 데일리판과 활동 성장 카드 확인
  - 전체메뉴 알림함과 알림 목록/읽음 확인
  - 홈 상단 알림 아이콘, 상단 floating notification shade, `ADMIN_QA_NOTICE` 항목, X/backdrop/Android back 닫기 확인
  - `ADMIN_QA_NOTICE` 다중 알림 상태에서 내부 스크롤, 높아진 overlay panel, 카드 이동형 좌우 스와이프 dismiss, 알림별 X 없음, 화살표-only 펼침/접힘, 전체삭제 후 empty state 확인
  - overlay open 전후 홈 콘텐츠와 하단 네비게이션 layout이 밀리지 않는지 확인
  - 타임라인 작성 keyboard bar smoke 확인
  - logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## 2026-07-02 V1.1 final sign-off / V1.1.1 scope audit

- [x] V1.1 final sign-off 판정
  - 판정: `V1.1 final sign-off 가능`
  - V1.0 회귀 blocker 없음.
  - V1.1 산책 POI closeout 가능 상태 유지.
  - V1.1 1차 MVP는 release blocker 없이 조건부 closeout 유지.
  - V1.1 2차 MVP는 notification/daily streak/XP final sign-off 가능.
- [x] notification 최신 UX 기준
  - 알림별 작은 X 제거는 최신 UX 정리 결과이며 release blocker가 아니다.
  - 주요 삭제 UX는 좌우 swipe dismiss와 `전체삭제`로 유지한다.
  - collapsed/expanded는 화살표-only indicator와 위/아래 스와이프를 사용한다.
  - 삭제는 user-scoped dismiss이며 공지 원본 hard delete가 아니다.
- [x] V1.1.1 후보 scope audit
  - push remote notification: 미구현/후속. local schedule notification infra는 별도 기존 범위.
  - 운영자 발송 UI: 앱 내부 미구현/후속. 일반 사용자와 `adminQA`에 노출되지 않음.
  - 홈 위젯: Android native/JS 일부 코드 존재. V1.1 release scope leak을 막기 위해 receiver disabled/exported false와 native package 미등록으로 차단.
  - 무지개다리 서비스: pet memorial profile state는 있으나 상품/문의/결제 flow는 미구현/후속.
  - 고급 XP/랭킹: privacy-limited `누리 랭킹` MVP 구현. leaderboard/ranking public exposure는 제한 필드와 마스킹 정책으로만 허용.
- [x] 보안 smoke
  - private tables anon direct select row 0.
  - user RPC anon 호출 `42501` 계열 거부.
  - notification dismiss는 user-scoped hide.
  - XP/streak는 user/pet isolation 유지.
  - walk/hospital public projection은 기존 public-safe 계약 유지.

## V1.0 기능 기준선과 잔여 task/risk closeout

- [x] V1.0 기능 개발 Code Freeze
- [x] Supabase DB Migration Dry-run / 원격 Apply
- [x] 지도/API 비용 방어 V1.0 provider runtime 차단 repo contract 반영
- [x] Naver OAuth V1.0 public surface soft disable
- [x] 운영자 QA / 실기기 최종 스모크
  - 2026-06-02 release APK를 기존 debug 설치본 uninstall 후 설치했고, release 앱에서 홈, 타임라인, 커뮤니티, 편지함, 전체메뉴, 건강관리, 산책 리스트/상세, 동물병원 리스트/상세/전화/길찾기를 crash 없이 확인했다.
  - admin/super_admin QA 세션에서 `동물병원 운영` 메뉴, 운영 화면 summary, review queue 표시를 확인했다.
  - approve/reject/held/action log/public projection은 동일 admin 세션의 Supabase RPC로 확인했다. UI 버튼 직접 탭 3회 증적은 ADB 입력/필터 불안정으로 P2 evidence gap으로 분류한다.
- [x] V1.0 P0 보안 blocker 수정
  - 2026-06-02 QA admin 세션 확보 중 authenticated 사용자가 public client로 자기 `profiles.role`을 `super_admin`으로 갱신할 수 있음을 확인했다.
  - 2026-06-04 `20260604090000_block_profile_role_self_escalation.sql`을 remote에 적용해 public client의 role insert/update를 DB trigger에서 차단했다.
  - 일반 authenticated role update는 `PROFILE_ROLE_UPDATE_FORBIDDEN`으로 거부됐고, 일반 profile update는 유지됐으며, 악성 role update 후 admin RPC는 `ANIMAL_HOSPITAL_ADMIN_REQUIRED`로 거부됐다.
- [ ] 앱 스토어 출시 자산 셋업
  - V1.0 기능/QA blocker가 아니며 V1.1 작업도 아니다. NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 진행한다.
- [x] 최종 제출용 RC 빌드 확정
  - 2026-05-29 `./gradlew assembleRelease`는 성공했고 `android/app/build/outputs/apk/release/app-release.apk`를 생성했다.
  - APK SHA-256: `1eb37508359fec609266e7a17205f0b7516861e2333100ca74af80b92e60694c`
  - 2026-06-02 기존 debug 서명 설치본을 uninstall한 뒤 동일 release APK를 설치했다.
  - 설치된 base APK SHA-256은 release artifact와 동일하고, signer는 NURI Upload certificate이며, installed package flags에서 `DEBUGGABLE`이 제거된 것을 확인했다.
- [x] final RC evidence baseline 고정
  - evidence: `docs/qa/final-rc-evidence-2026-05-29.md`
  - project report: `docs/qa/nuri-project-report-2026-05-29.md`
  - 최종 제출용 release build artifact/provenance는 위 `최종 제출용 RC 빌드 확정`에서 별도로 닫는다.
- [x] release risk ledger 전수 정리와 남은 P0/P1/P2 재분류
  - evidence: `docs/qa/v1.0-remaining-task-risk-ledger.md`

이 항목들은 신규 기능 개발이 아니며, 2026-06-04 기준 P0/P1 closeout은 닫힌 상태다. Play Store 제출 자산은 별도 final submission prep으로 분리한다.

## 지도/API 비용 방어 Release Gate

- [x] production Google Places runtime 호출 차단 repo contract를 반영한다.
  - `NURI_PLACE_ENRICHMENT_HARD_CAP` 미설정 또는 `0`이면 `place-enrichment-demand`가 Google Places/Text Search/Photo fetch를 수행하지 않고 existing/canonical 값으로 safe skip한다.
  - 명시적으로 양수 hard cap을 설정한 환경에서만 provider runtime이 열린다.
- [x] `place-enrichment-worker` cron이 hard cap 0에서 외부 provider 호출 없이 no-op으로 종료되는 repo contract를 반영한다.
  - worker는 hard cap 0이면 background target claim 전에 `processed=0`, `requested=0`, `providerRuntimeDisabled=true` summary로 종료한다.
  - production cron 자체 pause는 remote 운영 설정이므로 DB migration으로 처리하지 않는다.
- [x] Google Place Photos 기반 썸네일 runtime 보강 중단 contract를 반영한다.
  - hard cap 0에서는 cached/provider photo overlay도 반환하지 않고, 화면은 기존 canonical/approved thumbnail 또는 placeholder만 사용한다.
- [x] 동물병원 Localdata canonical/approved 데이터 fallback을 유지한다.
  - 리스트 UX는 `썸네일`, `동물병원` label, 병원명, 전화번호, 주소 미노출, 텍스트 좌측 정렬, 카드 내부 세로 중앙 정렬 결정을 유지한다.
  - 상세 UX는 주소, 전화 CTA, 길찾기 CTA를 유지하고 provider 미검수 운영정보를 열지 않는다.
- [x] 길찾기 외부 앱 deep link 위임 결정을 유지한다.
  - 앱 내부 route API를 새로 열지 않고 기존 외부 지도 앱 resolver 동선을 사용한다.
- [x] 산책/location discovery runtime fan-out 방어를 보강한다.
  - 앱 클라이언트는 Kakao REST key를 직접 쓰지 않고 `location-discovery-seed`만 호출한다.
  - 클라이언트 요청 캐시와 Edge Function URL 캐시를 추가해 동일 keyword/address/coord2region 요청 반복 호출을 줄인다.
- [x] linked production Edge Function 배포 상태를 확인한다.
  - 2026-05-27 KST remote 기준 `place-enrichment-demand` ACTIVE v12, `place-enrichment-worker` ACTIVE v9, `location-discovery-seed` ACTIVE v10으로 재배포했다.
  - `place-enrichment-demand` 직접 POST smoke는 function JWT 요구와 현재 shell의 사용자 JWT 부재로 `UNAUTHORIZED_INVALID_JWT_FORMAT`까지 확인했다. 앱 로그인 사용자 세션 기준 Android smoke는 별도 실기기 gate에 포함한다.
- [x] production secret 상태를 확인한다.
  - `NURI_PLACE_ENRICHMENT_HARD_CAP=0`으로 설정했다. `secrets list` digest가 `0`의 SHA-256과 일치한다.
  - `GOOGLE_PLACES_API_KEY`는 production secret에서 제거했다. `GOOGLE_MAPS_API_KEY`는 production secret 목록에 없다.
- [x] provider key 누락 또는 hard cap 0 상태에서 앱 crash 없음 확인을 Android smoke에 포함한다.
  - 2026-05-27 KST Android 실기기 `R5CY613NMSY` / `SM_S937N`, `com.nuri.app` `versionName=1.0`, `versionCode=1`, 로그인 사용자 `test님` 세션 기준으로 확인했다.
  - 동물병원: More -> `우리동네 동물병원` -> 리스트 -> 상세 -> `전화하기` -> `길찾기`를 직접 조작했다. 리스트는 `동물병원` label, 병원명, 전화번호 또는 `전화번호 확인 중`만 표시하고 주소는 노출하지 않았다. 상세는 주소, 전화 CTA, 길찾기 CTA를 표시했다.
  - 전화 CTA는 `com.skt.prod.dialer` dialer intent로 위임됐고, 길찾기 CTA는 Android resolver에 네이버지도, 지도, 카카오맵, TMAP 선택지를 표시했다.
  - 산책/location discovery: More -> `우리동네 산책 장소 찾기` -> `우리동네 산책 리스트` -> `산책 장소 상세`를 직접 조작했다. 결과 카드, 상세, 지도 미리보기, 주변 산책 장소 영역은 crash 없이 표시됐다.
  - logcat `/tmp/nuri-smoke-logcat.txt`: `fatal=0`, `promise=0`, `places=0`, `direct_google_api=0`, `place-enrichment-demand called=1`, `place-enrichment-demand skipped=1`, `location-discovery-seed called=10`, `location-discovery-seed completed=10`.
  - 관찰된 `Unhandled SoftException` 10건은 `react-native-fast-image`의 React Native New Architecture interop warning이며 fatal crash, promise rejection, Places/Photos provider 호출은 아니다. V1.0 지도/API 비용 방어 gate blocker로 분류하지 않는다.

## Supabase Migration Apply Gate

- [x] `npx supabase db push --dry-run`으로 pending migration 목록을 먼저 확인한다.
  - 결과: `Remote database is up to date.`
- [x] pending 목록에 이번 배포에서 승인된 migration만 포함되어 있는지 확인한다.
  - 결과: local migration 30개와 remote migration이 `20260429130000`까지 일치하며 local-only/remote-only migration은 없다.
- [x] 의도하지 않은 pending migration이 1개라도 있으면 remote apply를 중단한다.
  - 결과: pending migration 0개라 apply는 no-op이다.
- [x] migration 간 적용 순서가 중요한 경우 corrective/feature migration을 분리 적용할지 PO/엔지니어링 승인 후 결정한다.
  - 결과: 신규 apply 대상이 없어 no-op이다.
- [x] remote apply 후 `npx supabase migration list`로 remote 반영 여부를 확인한다.
  - 결과: post-apply migration list도 local/remote가 `20260429130000`까지 일치한다.
- [x] `npx supabase db lint --linked --schema public --fail-on error`를 실행한다.
  - 결과: error 0건, 기존 `public.delete_my_account` unused parameter warning 1건만 유지된다.
- [x] 신규/수정 RPC는 직접 호출 결과와 EXPLAIN ANALYZE evidence를 남긴다.
  - 결과: 이번 gate에서 신규/수정 RPC는 없으므로 직접 호출/EXPLAIN은 no-op이다. Supabase generated types로 public/auth catalog를 읽어 핵심 table/function signature 존재를 확인했다.
- [x] 앱에서 해당 RPC success log 또는 화면 evidence를 확보한다.
  - 결과: 신규 앱 RPC 호출 경로가 없으므로 no-op이다. 기존 animal hospital/weather/account/community evidence는 유지한다.
- [x] release note에 적용 migration, rollback 여부, 사후 검증 결과를 기록한다.
  - 결과: remote apply no-op, rollback 없음, DB release blocker 없음.

### 2026-05-06 DB release gate evidence

| 항목 | 상태 | evidence |
|---|---|---|
| local migration 목록 | closed | 30개 SQL migration, 중복 timestamp 없음, 최신 `20260429130000_weather_cache_proxy.sql` |
| remote migration list | closed | local/remote `20260329024024`부터 `20260429130000`까지 일치 |
| pre-apply db diff --linked | blocked | Supabase CLI diff가 shadow DB/temp role 경로에서 실패했다. pending migration 0개, `db push --dry-run` no-op, generated types catalog 확인으로 destructive apply risk는 no-op으로 판정한다. |
| pre-apply db lint | blocked | `npx supabase db lint`는 local Postgres `127.0.0.1:54322` 미기동으로 실패했고, linked lint 1차는 temp role auth 실패였다. remote apply가 no-op이므로 post-apply linked lint를 최종 lint evidence로 사용한다. |
| remote apply | no-op | `npx supabase db push`: `Remote database is up to date.` |
| post-apply migration list | closed | local/remote `20260429130000`까지 일치 |
| post-apply db lint | closed | `npx supabase db lint --linked --schema public --fail-on error`: error 0건, 기존 warning 1건 |
| post-apply db diff --linked | blocked | `SUPABASE_DB_PASSWORD` 미설정/temp role SASL auth 실패. remote apply가 no-op이고 migration list가 일치하므로 DB release blocker로 보지 않는다. |
| generated public/auth catalog | closed | `npx supabase gen types typescript --linked --schema public/auth` 성공 |

### 2026-05-06 RPC / DB catalog evidence

| 항목 | 확인 방식 | 결과 | release 판정 |
|---|---|---|---|
| account deletion | generated public types + applied migrations | `account_deletion_requests`, `account_deletion_cleanup_items`, `request_account_deletion`, `delete_my_account`, `claim_due_account_deletion_requests`, `execute_account_deletion_request` signature 존재 | closed |
| community moderation / reports / image cleanup | generated public types + applied migrations | `community_moderation_queue`, `community_moderation_actions`, `community_image_assets`, moderation functions signature 존재 | closed |
| animal hospital public search RPC | generated public types + applied migrations | `animal_hospital_public_search_v1` signature 존재, latest migration applied | closed |
| weather-cache DB contract | generated public types + applied migrations + functions list | `nuri_weather_cache` table 존재, `weather-cache` Edge Function ACTIVE v2 | closed |
| health report weight log / summary contract | generated public types + applied migrations | `pet_weight_logs` table, latest-weight trigger/function migration 적용 상태 | closed |
| auth/profile trigger/RLS contract | generated public/auth types + applied migrations | `profiles`, auth `users`, `handle_new_user`/`on_auth_user_created` migration contract 적용 상태 | closed |
| Guestbook 기본 방명록/letters 노출 위험 | generated public types + applied migrations | `letters` table은 user/pet 소유 모델로 남아 있고 v1.0 확장 migration 없음 | closed |

## 이미 닫힌 항목

- [x] 정책 문서 public 연결
  - 회원가입의 `이용약관`, `개인정보처리방침`, More의 `계정 삭제 안내`가 실제 public 문서를 열고 Android 실기기에서 앱 복귀까지 확인됐다.
- [x] 비밀번호 재설정 복귀
  - recovery 링크 복귀, 비밀번호 변경, `SignIn` 복귀가 Android 실기기에서 검증됐다.
- [x] 계정 탈퇴 7일 유예 기본 동선
  - 요청, 유예, 복구 가드, 보수적 안내 UX가 앱에 반영됐다.
- [x] 계정 탈퇴 자동 파기 worker
  - remote worker 배포, due request claim, finalizer, storage cleanup, `completed` 수렴까지 E2E로 검증됐다.
- [x] 커뮤니티 신고 정책과 auto-hide
  - blocked-term, stable error contract, auto-hide, reporter flag trace, moderation queue/action log, hidden 이미지 비노출이 remote 기준으로 검증됐다.
- [x] 커뮤니티 인앱 정책 notice
  - notice, helper box, 정책 팝업, 앱 복귀까지 실기기 확인이 끝났다.
- [x] 닉네임 정책과 Android 기본 레이아웃
  - 닉네임 `2..10`, Community header, Timeline 탭 유지, bottom gap 보정이 실기기 기준으로 닫혔다.
- [x] Google/Kakao/Naver OAuth 앱 코드 연결
  - SignIn/SignUp의 Kakao/Google 버튼은 placeholder Alert가 아니라 Supabase `signInWithOAuth` web flow를 시작한다.
  - Naver는 `signInWithNaver()`와 provider mapping code를 유지하지만 V1.0 public surface에서는 버튼을 숨긴다.
  - OAuth callback은 `nuri://auth/callback`으로 분리했고, password reset의 `nuri://auth/reset`과 라우트를 섞지 않는다.
  - OAuth 성공 후 session 복구는 기존 Splash/AppProviders boot contract를 사용하므로 nickname/pet onboarding 분기를 새로 만들지 않는다.
  - email/password login, email signup, password reset, policy link UI는 유지한다.
  - Naver는 Supabase custom OAuth/OIDC provider id `custom:naver`를 사용한다.
  - Apple은 Android-first v1.0 범위에서 제외한다.
- [x] Social login activation-ready 코드 계약 고정
  - Google/Kakao/Naver provider mapping은 앱 코드에서 각각 `google`, `kakao`, `custom:naver`로 고정한다.
  - Google/Kakao readiness flag 기본값은 `true`, Naver readiness flag 기본값은 `false`다.
  - Naver는 env가 실수로 켜져도 V1.0 public-surface guard에서 닫힌다.
  - readiness false provider는 SignIn/SignUp 화면에서 숨기고, 직접 함수 호출도 `provider_setup_required`로 안전하게 중단한다.
  - readiness true 전환 후에는 기존 Supabase OAuth web flow와 `nuri://auth/callback`을 그대로 사용한다.
  - public readiness flag는 `.env.example`에 boolean으로만 기록하며 secret 값은 기록하지 않는다.
- [x] Social login provider release gate 갱신
  - PO credential 입력 후 Google/Kakao는 V1.0 public provider로 고정한다.
  - Naver는 V1.0 public surface에서 soft disable하고, 성공 session smoke 미완료를 V1.0 blocker로 보지 않는다.
  - OAuth 성공 smoke는 Google/Kakao만 V1.0 release gate로 본다.
- [x] Social provider console 직접 확인 결과를 release gate에 반영한다.
  - 2026-05-11 Chrome 기준 Google Cloud Console은 당시 선택 project의 결제 계정 문제로 `재검토 요청` 화면에 막혀 OAuth credential 생성이 불가했다. 이후 PO 결정에 따라 해당 테스트 계정/project는 NURI OAuth 경로에서 격리한다.
  - Kakao Developers `Nuri-app`은 존재하지만 Kakao Login, 동의항목, 간편가입, 연결 해제 설정이 모두 `설정 안 함`이다.
  - Naver Developers `nuri_app`은 존재하고 네이버 로그인 API, 연락처 이메일 필수 항목, Android package `com.nuri.app`이 확인됐다. Supabase OAuth용 PC/모바일 웹 Callback URL 보강은 PO action required다.
  - Supabase Dashboard 기준 Google/Kakao provider는 disabled, Custom provider `custom:naver`는 Enabled, Redirect URLs에는 `nuri://auth/reset`과 `nuri://auth/callback`이 등록되어 있다.
- [x] 외부 지도 전환 기본 동선
  - 장소 상세의 외부 지도 열기 동선은 PO 확인 기준 완료로 분류한다.
- [x] 건강관리 리포트 Phase 1 MVP
  - repo 구현, linked remote migration 적용, insert/update/delete/fallback row-level 검증, Android 실기기 핵심 동작이 완료됐다.
  - 적용된 remote migration은 `task7_normalize_invalid_pet_weight_snapshots`, `task7_health_report_weight_logs`이며, `pet_weight_logs` table/function/trigger와 `pets.weight_kg` latest snapshot 계약이 확인됐다.
  - 첫 insert 직후 즉시 반영, update, delete/fallback, 홈 `petStore` 최신 체중 반영, Android 키보드 back 처리가 실기기 기준으로 확인됐다.
- [x] 날씨 도메인 비용 방어
  - `20260429130000_weather_cache_proxy.sql` linked remote apply, `public.nuri_weather_cache` RLS/권한 확인, `weather-cache --no-verify-jwt` deploy, 수동 smoke, Android 실기기 홈/상세 QA까지 완료됐다.
  - 수동 smoke 기준 1차 `source=provider`, 2차 `source=fresh_cache`로 bucket당 60분 서버 캐시가 동작했다.
  - Android `SM_S937N` logcat 기준 앱 클라이언트의 Open-Meteo 직접 호출은 0건이고, `weather-cache completed source=fresh_cache`만 확인됐다.

## v1.0 잔여 task/risk 확인 항목

### 0-0. V1.0 Remaining Task/Risk Ledger

- [x] v1.0 잔여 task/risk를 단일 ledger로 고정한다.
  - 2026-06-04 기준 P0: 0건
  - 2026-06-02 기준 P1: 0건
  - 2026-06-04 기준 P2: 4건
  - evidence: `docs/qa/v1.0-remaining-task-risk-ledger.md`
- [x] 반복 방지 기준을 문서화한다.
  - 이미 close된 도메인은 새 blocker 증거 없이 재오픈하지 않는다.
  - social login app-side 구현은 다시 열지 않고 provider 설정과 smoke만 본다.
  - clean RC artifact 전에는 RC smoke를 반복하지 않는다.

### 0-1. Release Evidence Pack hard-close

- [x] 2026-04-30 Android RC smoke 결과를 release evidence pack으로 고정했다.
  - 기준: dirty working tree + Android `SM_S937N`에 설치된 `com.nuri.app` `versionName=1.0`, `versionCode=1`
  - 통과: 앱 실행, 로그인 세션 진입, 홈, 타임라인, 건강관리, 산책 리스트, 동물병원, 날씨 홈/상세, 커뮤니티, 앱 재실행/복귀
  - crash/ANR: `FATAL EXCEPTION` 0건, `ANR` 0건, React Native fatal pattern 0건
  - evidence: `docs/qa/release-evidence-pack-2026-04-30.md`
- [x] linked remote read-only evidence를 release evidence pack으로 고정했다.
  - `supabase migration list --linked`: local/remote `20260429130000`까지 일치
  - `supabase db lint --linked --schema public --fail-on error`: error 없음, 기존 `delete_my_account` unused parameter warning만 확인
  - `supabase functions list`: `weather-cache` ACTIVE v2 확인
- [x] v1.0 final RC evidence baseline을 고정한다.
  - 기준: 2026-05-29 KST, branch `codex/task6-community-content-policy`, HEAD `c03edd0`
  - 포함: worktree 시작 상태, 수정 파일 목록, 최소 검증 명령, Android 기기 정보, V1.0 provider 최종 상태, Naver soft disable, pet date UX, V1.1 이동 항목
  - evidence: `docs/qa/final-rc-evidence-2026-05-29.md`
  - 최종 제출용 release build artifact와 설치 앱 version/signing provenance는 `최종 제출용 RC 빌드 확정`에서 별도로 닫는다.

### 0-1-1. 2026-06-23 Release Candidate Smoke

- [x] release APK update install
  - Android `SM_S937N` / `R5CY613NMSY`에 `android/app/build/outputs/apk/release/app-release.apk` update install 성공
  - installed package: `versionName=1.0`, `versionCode=1`, `lastUpdateTime=2026-06-23 08:49:08`
- [x] 사용자-facing 핵심 플로우 smoke
  - 홈, 로그인 세션 복귀, Profile/Pet 카드, Weather, 전체메뉴, Community/Policy, Timeline read path 확인
  - Health Report read path와 `건강 기록하기` write entrypoint 진입 확인. 운영 DB에 테스트 기록은 남기지 않음
  - Animal Hospital 리스트/상세/전화하기/길찾기 CTA 표시 확인
  - Walk/POI 리스트, empty UX, detail tap, gate 밖 safe UX 확인
  - 로그아웃 확인 모달, 로그아웃 완료, 로그인 홈 복귀, `카카오로 시작하기`/`Google로 시작하기` 버튼 노출 확인
- [x] 산책 POI 회귀
  - approved/public/active POI 1,145건 유지
  - public nearby 20건, `호수공원` search 6건, detail 1건
  - pending/rejected/held public active leak 0건
  - public RPC internal key leak 0건
  - anon direct `walk_pois` select: `42501 permission denied`
  - anon admin RPC: `WALK_POI_ADMIN_REQUIRED`
  - Ready 권역: `kakaoBlocked: true`, `gateLimited: true`, `resultCount: 8`
  - gate 밖 좌표: `gateLimited: false`, `kakaoBlocked: true`, safe empty UX 표시
- [x] crash-free logcat
  - `FATAL EXCEPTION`: 0건
  - `ANR in`: 0건
  - `Unhandled promise` / `Possible Unhandled Promise Rejection`: 0건
  - `ReactNativeJS fatal`: 0건
- [x] 운영비 readiness
  - Supabase project `NURI`: CLI 기준 `ACTIVE_HEALTHY`
  - DB size: 약 177MB
  - Edge Functions: 6개 ACTIVE
  - 실제 Supabase plan/청구 사용량과 Codex 실제 플랜은 dashboard/account owner 확인 필요

### 0-2. Google/Kakao OAuth provider setup gate + Naver soft disable

- [x] 2026-05-28 PO 최종 결정 기준 V1.0 public social provider를 Google + Kakao로 확정한다.
  - `.env.example`과 `src/services/supabase/socialOAuthConfig.ts` 기준 Google/Kakao readiness flag 기본값은 `true`, Naver는 `false`다.
  - Naver는 env 오입력 방지용 public-surface guard에서도 닫는다.
  - SignIn/SignUp 화면에서 `카카오로 시작하기`, `Google로 시작하기`만 V1.0 public entrypoint로 노출한다.
  - Supabase authorize endpoint smoke history: Google은 `accounts.google.com`, Naver는 `nid.naver.com`, Kakao는 `kauth.kakao.com`으로 HTTP 302 이동한 이력이 있다. V1.0 public provider scope는 Google/Kakao만 유지한다.
- [x] Google Android 실기기 성공 smoke를 수행한다.
  - Android 실기기 `R5CY613NMSY` / `SM_S937N`에서 Google 버튼 탭, provider web flow, 앱 복귀, session 생성, 기존 사용자 홈 진입을 확인했다.
  - 2026-05-28 같은 실기기에서 Google 버튼 노출과 account chooser web flow 진입, back/cancel 복귀 crash 없음도 재확인했다.
  - secret/client id/client secret/token 전체값은 문서와 로그에 기록하지 않는다.
- [x] Kakao Android 실기기 성공 smoke와 닉네임/프로필 UX를 확인한다.
  - Android 실기기에서 Kakao 버튼 탭, provider web flow, 앱 복귀, session 생성을 확인했다.
  - Kakao 신규 사용자 계정은 nickname/provider profile image 선택 동의값이 없어도 `NicknameSetup`으로 진입했고, `nuri0527` 닉네임 중복확인/저장 후 `PetCreate` 온보딩으로 이동했다.
  - 2026-05-28 같은 실기기에서 Kakao 신규 사용자 `kakao0528` 닉네임 중복확인/저장, `PetCreate`, `KakaoPet` 테스트 펫 등록, 홈 진입까지 확인했다.
  - V1.0 NURI 사용자 표시 source of truth는 provider metadata가 아니라 앱 내부 confirmed profile이다. public community author surface는 confirmed nickname만 사용하고 provider avatar는 자동 노출하지 않는다.
- [x] Naver Android 실기기 성공 smoke를 V1.0 범위에서 제거하고 public entrypoint를 soft disable한다.
  - Android 실기기에서 Naver 버튼 노출, `custom:naver` authorize 302, Naver web flow 진입, 앱 복귀 crash 없음은 확인했다.
  - Naver 페이지에서 `pet_nuri 서비스 설정 오류`가 표시되어 session 생성 전 차단됐다.
  - 2026-05-28 PO 결정에 따라 Naver는 V1.0 제외/soft disable로 분류한다. Supabase `custom:naver` provider와 관련 코드는 hard delete하지 않는다.
  - 2026-05-28 Android SignIn 화면에서 Naver 버튼 미노출을 확인했다.

- [x] PetCreate/PetProfileEdit 날짜 직접 입력 UX를 V1.0에 반영한다.
  - 공통 DatePicker modal은 `YYYY-MM-DD` 직접 입력, calendar/input state sync, invalid date validation, maximum date guard를 제공한다.
  - PetCreate와 PetProfileEdit 날짜 모달에는 `날짜 직접 입력`, `과거 날짜는 YYYY-MM-DD로 입력` 안내가 표시된다.
  - Android 실기기에서 `2010-99-99` 입력 시 `월은 1~12 사이에서 입력해 주세요.` 오류가 표시되어 저장이 막혔다.
  - Android 실기기에서 `2010-05-12` 입력 후 적용했고, PetCreate 저장 후 홈 카드에 `생년월일 2010.05.12`가 표시됐다.
  - DatePicker 라이브러리 교체, DB migration, 펫 등록 전체 재설계는 수행하지 않았다.

- 판정
  - Google: `closed`. App-side entrypoint, Supabase authorize, Android success session smoke까지 닫혔다.
  - Kakao: `closed`. App-side entrypoint, Supabase authorize, Android success session smoke, 닉네임 미확정 온보딩 분기까지 닫혔다.
  - Naver: `soft-disabled-for-v1`. App-side entrypoint와 Supabase authorize 302는 운영 히스토리로 남기고, V1.0 public surface에서는 버튼을 숨긴다.
  - Apple: `HIDE_FOR_V1`
- [x] Google 테스트 계정과 `My First Project` 비용 리스크를 NURI 운영 OAuth 경로에서 분리한다.
  - 현재 Chrome Google 계정은 테스트 계정이며 NURI 운영 계정으로 사용하지 않는다.
  - `My First Project`는 2026년 4월 Places API (New) 과금 `₩112,214` 이력이 있어 OAuth용으로 재사용하지 않는다.
  - 비용 원인은 Google social login이 아니라 Places API Text Search Enterprise, Place Details Photos, VAT다.
  - 새 NURI Google 계정의 OAuth-only project에서는 Google Maps/Places API를 활성화하지 않는다.
- [x] Google/Kakao/Naver provider console setup guide와 보안/API 방어 기준을 고정한다.
  - evidence: `docs/auth/social-provider-console-setup-guide.md`
  - Google/Kakao/Naver credential 발급 절차, Supabase provider 입력 위치, callback/redirect 정합성, secret 미노출 원칙을 한 문서로 묶었다.
  - Social login app-side 구현은 재오픈하지 않는다.
- [x] PO가 Google/Kakao provider console, API key/secret, redirect allow-list를 실제 운영 값으로 준비한다.
  - Google: NURI 전용 신규 Google 계정을 만들고, `NURI Auth` 또는 `NURI OAuth` project에서 OAuth consent screen/Web OAuth Client ID/Secret/Android OAuth Client ID, `com.nuri.app`, SHA-1/SHA-256, Privacy Policy/Terms URL을 준비한다. Authorized redirect URI는 `https://grmekesqoydylqmyvfke.supabase.co/auth/v1/callback`이다.
  - Kakao: 기존 Kakao Developers `Nuri-app`에서 Kakao Login 활성화, REST API Key 확인, Client Secret 활성화, Supabase callback URL Redirect URI 등록, 동의항목 설정, 필요 시 Biz App/앱 정보 검토를 완료한다.
  - Supabase Auth: Google/Kakao provider enable, provider별 client id/secret 등록을 완료한다. Redirect URLs allow list의 `nuri://auth/callback`은 2026-05-11 기준 등록 완료다.
  - 실제 key/secret 값은 repository와 release evidence에 기록하지 않는다.
- [x] Naver provider 준비물 성공 session 확정은 V1.0 범위에서 제거한다.
  - Naver Developers `pet_nuri` 서비스 설정 오류 해소는 V1.1 또는 출시 후 운영 설정 안정화/cleanup 작업으로 이동한다.
  - Supabase custom OAuth/OIDC provider id `custom:naver`는 유지하지만, 앱 public surface에서는 버튼을 숨긴다.
- [x] Naver provider 설정 완료 후 OAuth 성공 smoke는 V1.1 또는 출시 후 evidence로 분리한다.
  - V1.0에서는 Naver 버튼 탭 성공 session을 요구하지 않는다.
  - Google/Kakao 성공 smoke와 Kakao 신규 사용자 온보딩/pet registration smoke는 Android evidence로 닫혔다.
- [x] 2026-05-27 pre-credential Android OAuth readiness closeout 기록을 유지한다.
  - credential 입력 전 상태에서는 readiness false로 깨진 provider 버튼을 숨기고, callback failure route가 Alert 후 SignIn으로 안전하게 복귀하는 것을 확인했다.
  - 이 기록은 credential 완료 전 release-safe evidence이며, 현재 V1.0 판정은 위 2026-05-27 success smoke 항목을 우선한다.
- [x] social OAuth V1.0 약관/개인정보처리방침 고지 UI를 추가한다.
  - Google/Kakao/Naver social login 버튼 하단에 이용약관/개인정보처리방침 확인 및 동의 간주 문구를 표시한다.
  - 기존 정책 링크 source를 재사용한다.
  - v1.0에서는 별도 social consent DB snapshot, 신규 migration, 신규 RPC를 열지 않는다.

### 0. 정적 검증 / 빌드 스냅샷

- [x] `yarn tsc --noEmit` 통과
- [x] `yarn lint` 통과
  - error 0건, warning 4건
- [x] `yarn test --watchAll=false --watchman=false` 통과
  - 2026-04-23 기준 35 suites, 128 tests 통과
- [x] `yarn test:qa` 통과
  - 9 suites, 25 tests 통과
- [x] Android release build 가능
  - `./gradlew assembleRelease` 성공, `android/app/build/outputs/apk/release/app-release.apk` 생성
- [x] Android 단독 실행 smoke
  - adb 연결 기기 `R5CY613NMSY`에서 `com.nuri.app/com.nuri.MainActivity` foreground 확인
- [x] Supabase env 연결 상태
  - tracked config가 linked remote host를 가리키며 `auth/v1/health` 200 응답 확인

### 1. v1.0 잔여 task: 운영자 QA / 실기기 최종 스모크 세부 체크

- [ ] 산책, 장소, 동물병원의 리스트와 상세를 Android 실기기에서 다시 열고 캡처를 남긴다.
- [ ] 공개 라벨과 `내 상태`가 섞여 보이지 않는지 확인한다.
- [ ] stale/conflict 문구가 과한 확신처럼 읽히지 않는지 확인한다.
- [ ] 지도 미리보기와 외부 지도 버튼 역할이 충돌하지 않는지 확인한다.
- [ ] 긴 설명 `더보기/접기`와 스크롤 체감을 캡처한다.
- [x] 동물병원 Android debug build/install/start, More -> 리스트 -> 상세, 리스트 주소 미노출, 좌측 정렬, 좌표 미승인 fallback smoke를 `SM_S937N`에서 확인했다.
  - evidence: `docs/qa/animal-hospital-android-smoke-2026-04-22.md`
- [x] 동물병원 approved phone `tel:` CTA, approved coordinates 길찾기 CTA, approved thumbnail public 노출을 `24시 마이동물의료센터` 샘플로 캡처했다.
  - evidence: `docs/qa/android-animal-hospital-approved-thumbnail-list-2026-04-22.png`
  - evidence: `docs/qa/android-animal-hospital-approved-thumbnail-detail-2026-04-22.png`
  - evidence: `docs/qa/android-animal-hospital-approved-tel-2026-04-22.png`
  - evidence: `docs/qa/android-animal-hospital-approved-map-2026-04-22.png`
- [x] 동물병원 P0-P2 후속 UI/검색/CTA smoke를 `SM_S937N`에서 다시 확인했다.
  - 확인: 최근검색어 미노출, 리스트 주소 미노출, `가까운순/24시 운영/특수동물병원` 칩, verified 24시 필터, `VIP` 전국 검색, 하이픈 전화번호, `tel:` dialer intent, 길찾기 resolver, 지도 preview
  - evidence: `docs/qa/animal-hospital-android-smoke-2026-04-22.md`
  - evidence: `docs/qa/animal-hospital-p0-p2-closeout-2026-04-22.md`
- [x] 동물병원 provider/admin/location 보강 후 Android 실기기 재캡처를 `SM_S937N`에서 확인했다.
  - 확인: 리스트 주소 미노출, 좌측 정렬/세로 중앙, `031-945-5000` 하이픈 표시, 상세 hero/전화/길찾기/지도 preview, `tel:` dialer, 지도 resolver, 지도 열기 resolver
  - evidence: `docs/qa/animal-hospital-provider-location-admin-closeout-2026-04-23.md`
  - evidence: `docs/qa/animal-hospital-android-smoke-2026-04-23.md`
- [x] 동물병원 v1.0 public search RPC와 closeout 문서화를 완료했다.
  - linked remote에 `20260428120000_animal_hospital_public_search_rpc_v1.sql`, `20260428123000_fix_existing_rpc_ambiguous_columns.sql`이 동시에 적용됐고, 결과는 정상으로 사후 검증됐다.
  - `supabase db lint --linked --schema public --fail-on error` 통과, 기존 ambiguous column error 제거, `animal_hospital_public_search_v1` 직접 호출, EXPLAIN ANALYZE keyword/nearby path, Android list/search/filter/detail smoke, `NURI-RPC-SUCCESS` logcat을 확인했다.
  - Android 동물병원 상세의 Google Maps native preview는 v1.0 공식 UX에서 제외하고, `위치 정보 준비 중이에요. 길찾기로 외부 지도에서 확인해 주세요.` fallback을 공식 UX로 확정했다. 이는 임시 크래시 회피가 아니라 `INVALID_ARGUMENT` 재발 방어 목적의 v1.0 결정이며, 전화/길찾기/외부 지도 CTA는 유지한다.
  - native Google Maps preview 정식 복원은 API key/package/SHA 정리 후 v1.1 P2 backlog로 넘긴다.
  - evidence: `docs/qa/animal-hospital-v1-evidence-pack-2026-04-28.md`
- [x] 날씨 홈/상세 Android 실기기 smoke와 API 비용 방어 검증을 `SM_S937N`에서 완료했다.
  - 확인: 홈 날씨 카드 데이터 렌더링, 상세 `오늘의 날씨` 진입, 미세먼지/주간 예보/대기 질 정보 렌더링, 날씨 상세 `날씨 데이터: Open-Meteo` attribution 노출. 2026-07-11 PO 요청 기준 로그인 홈 compact 카드의 attribution 문구는 숨김 처리했다.
  - logcat 확인: `weather-cache completed`, `source=fresh_cache`, `hasAirQuality=true`, Open-Meteo direct URL 0건.
  - evidence source of truth: `docs/domains/weather-api-cost-defense.md`

### 1-1. 동물병원 DB migration release note

- 2026-04-28 동물병원 DB 안정화 과정에서 아래 2개 migration이 Linked Remote DB에 동시에 적용됐다.
  - `20260428120000_animal_hospital_public_search_rpc_v1.sql`
  - `20260428123000_fix_existing_rpc_ambiguous_columns.sql`
- 원래는 corrective migration 단독 적용 후 public search RPC 적용이 더 보수적인 순서였으나, v1.0 출시 전 제품 판단에 따라 동시 적용을 승인했다.
- rollback은 수행하지 않았다.
  - `supabase db lint --linked --schema public --fail-on error` 통과
  - 기존 ambiguous column error 제거
  - `animal_hospital_public_search_v1` RPC 직접 호출 성공
  - EXPLAIN ANALYZE에서 keyword path pg_trgm index 확인
  - nearby path coordinate partial index + bbox + Haversine distance sort 확인
  - Android 리스트/search/filter/detail smoke 통과
  - `NURI-RPC-SUCCESS` logcat 확인
- 결과는 정상이나, 다음 DB migration부터는 pending migration 목록이 의도와 다르면 remote apply를 중단한다.

### 2. 운영 증적 패키지 마감 세부 체크

- [x] `place-enrichment-worker` background cron lane을 remote에 배포하고 수동 trigger 1회를 성공시킨다.
  - linked remote에 `place-enrichment-worker` Edge Function을 배포했고, `register_place_enrichment_worker_schedule()`로 `*/10 * * * *` pg_cron job을 등록했다. 등록 job id는 `2`다.
  - 2026-04-24 수동 trigger 결과 `limit=3`, `maxUnits=6`, `processed=3`, `enriched=3`, `errors=0`, `chargedUnits=6`을 확인했다.
  - cron budget row는 `track=cron`, `budget_month=2026-04-01`, `request_count=3`, `budget_units=6`으로 증가했다.
- [ ] 계정 탈퇴 worker의 실제 cron 자동 tick 1회 증적을 남긴다.
- [ ] 계정 탈퇴 최종 상태 캡처를 release 보관본으로 정리한다.
- [ ] `community_moderation_queue`, `community_moderation_actions`, `community_image_assets` row-level 캡처를 남긴다.
- [x] `qa-task4-*` 테스트 데이터 정리 또는 격리 근거를 남긴다.
  - `cleanup_v1_release_garbage_data()`와 storage remove를 통해 QA post 18건, report 12건, moderation queue 8건, moderation action 2건, image asset 2건, historical garbage pet 1건을 hard delete 했다.
  - 후검증 기준 target post/report/queue/action/asset/pet 잔존 row는 모두 `0`이다.

### 3. 모니터링/배포 필수 설정

- [x] Sentry는 v1.0 Android 단독 출시에서 보류하고 앱 전송 경로를 비활성화한다.
  - `src/services/monitoring/sentry.ts`는 `sentryEnabled = false`로 잠겨 있고, 이번 턴에도 그대로 유지했다.
- [x] Android `google-services.json` 배치 상태를 확인한다.
- [x] iOS `GoogleService-Info.plist`는 v1.1 iOS 출시 항목으로 이관한다.
- [x] Firebase Crashlytics는 Android release crash 수집용으로 유지한다.
  - `firebase.json` 기본 auto collection을 `false`로 내리고, 런타임에서 release 환경일 때만 `setCrashlyticsCollectionEnabled(true)`를 호출한다.
  - `android/app/build.gradle`의 `firebaseCrashlytics` 설정은 debug에서 upload 비활성화, release에서만 mapping upload 활성화로 고정했다.
- [x] Android release signing config를 upload key 기준으로 전환한다.

### 4. 최종 제출 직전 준비: 스토어 제출 자산

- 스토어 출시 자산 세팅은 V1.0 기능/QA blocker가 아니며 V1.1 작업도 아니다.
- 이 섹션은 NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 닫는다.
- [x] 앱 아이콘 최종본을 확정한다.
- [x] 스플래시 화면 최종본을 확정한다.
- [ ] 앱스토어/플레이스토어 스크린샷을 준비한다.
- [ ] 스토어 설명문, 문의처, 정책 URL을 최종 점검한다.

### 5. 출시 후보 빌드 smoke

- [x] 로그인 세션 진입은 Android RC smoke에서 확인했다.
  - 가입/로그아웃은 기존 auth evidence와 PO 판단 대상이며, 이번 hard-close 턴에서 재수행하지 않는다.
- [x] 비밀번호 재설정, 탈퇴, 커뮤니티 기본 동선은 기존 evidence를 인정한다.
  - 파괴적 플로우는 이번 hard-close 턴에서 재수행하지 않는다.
- [x] 홈, 타임라인, 산책/동물병원, 날씨, 커뮤니티 진입은 Android RC smoke에서 확인했다.
  - 상세 내용은 `docs/qa/release-evidence-pack-2026-04-30.md`에 고정한다.
- [x] 건강관리 진입은 Android RC smoke에서 확인했다.
  - 건강기록/체중 CRUD/fallback은 기존 Phase 1 evidence를 인정하며, 이번 hard-close 턴에서 재수행하지 않는다.

## 2026-07-12 관리자 홈페이지 본구현 1차 체크

- [x] 실제 관리자 홈페이지 source of truth를 `nuri-web /admin`으로 유지
- [x] React Native 앱 내부 일반 사용자 화면에 관리자 UI 미노출
- [x] 신규 관리자 route를 protected route group에 추가
  - `/admin/reports`
  - `/admin/community`
  - `/admin/hospitals`
  - `/admin/users`
  - `/admin/users/[id]`
  - `/admin/pets`
  - `/admin/pets/[id]`
  - `/admin/audit-logs`
- [x] Dashboard/sidebar를 실제 1차 route로 연결
- [x] 신고/콘텐츠, 커뮤니티, 동물병원, 사용자, 반려동물, audit log read-only 구현
- [x] 사용자 hard delete, 게시글/댓글 hard delete, 사용자 권한 상승, 동물병원 approve/reject/hold, 전체 broadcast 비활성 유지
- [x] raw UUID/email/phone/password/token/secret UI 노출 방지
- [x] DB/RPC/RLS/seed 변경 없음
- [x] Play Store 자산 없음

## 2026-07-12 관리자 홈페이지 본구현 3차/4차 체크

- [x] `nuri-web /admin` role/capability model 구현
- [x] action별 capability disabled reason 표시
- [x] server action capability guard 유지
- [x] `/admin/notifications` 통합 route 추가
- [x] QA 닉네임 단일 대상 알림 발송 wrapper 추가
- [x] 전체 broadcast, segment 발송, push 실제 발송 disabled 유지
- [x] 운영 통계 dashboard read-only RPC 연결
- [x] action history와 audit before/after diff 표시
- [x] conflict-safe undo UI와 undo RPC 추가
- [x] hard delete, 사용자 권한 상승, 게시글/댓글/병원 원본 삭제 없음
- [x] raw UUID/email/phone/password/token/service role key UI 노출 방지
- [x] additive migration remote 반영 및 anon negative smoke 확인
- [x] `nuri-web` lint/build/diff 통과

## 2026-07-14 최종 Release QA Gate 재판정

- [x] 최신 release APK 새 빌드/설치
  - APK SHA-256: `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb`
  - 기기: `SM_S937N / R5CY613NMSY`
  - package: `com.nuri.app`, versionName/versionCode: `1.0` / `1`
- [x] Google OAuth 실기기 smoke
  - Google 버튼 노출, Naver/Apple 미노출
  - provider flow 취소 후 앱 로그인 화면 복귀
  - controlled Google identity 실제 성공, `NicknameSetup -> PetCreate -> Home`, session restore 확인
- [ ] Kakao OAuth 취소/복귀 완전 closeout
  - controlled Kakao identity 실제 성공, `NicknameSetup -> PetCreate -> Home`, session restore 확인
  - Kakao SSO/외부 앱 전환 특성 때문에 순수 취소 후 로그인 화면 복귀는 이번 턴에서 깨끗하게 닫지 못했다.
- [ ] 전체 TextInput keyboard/navigation sweep
  - 로그인, NicknameSetup, PetCreate 일부 입력/validation/back은 확인
  - 게시글 작성/수정, 댓글, 신고, 검색, 건강/체중/날짜, 펫 수정, 닉네임 변경, 탈퇴 확인 등 전체 노출 route sweep은 완료하지 못했다.
- [x] notification token isolation E2E (2026-07-19: logout revoke, controlled account switch, cross-user active binding 0)
  - `adminQA` 재로그인 사용자 입력이 완료되지 않아 opt-in/out, logout revoke, account switch ownership을 최신 APK 실기기에서 닫지 못했다.
  - actual push는 계속 비활성이다.
- [ ] 최종 release regression gate
  - typecheck/lint/Jest/Supabase dry-run/logcat short gate는 통과
  - `adminQA` 세션 기반 Home/Community/Hospital/Walk/Notification/Settings 전체 물리 회귀는 완료하지 못했다.

## 2026-07-14 관리자 Android Evidence Closeout 체크

- [x] Android release APK 최신 빌드/설치
  - 기기: `SM-S937N / R5CY613NMSY`
  - APK SHA-256: `66fc6c761cd862e8943c87c234f45aa180db8dcfcfe6e2fcfa105d8ed8e38c45`
  - package: `com.nuri.app`, versionName/versionCode: `1.0` / `1`
  - lastUpdateTime: `2026-07-14 00:29:23`
- [x] 관리자 soft-hide 앱 read-path 반영
  - QA 게시글: production admin approval flow로 `active -> hidden`, 앱 feed 제거, count `6개 -> 5개`, cold start 후 숨김 유지
  - undo 후 `active` 복구, 앱 feed count `6개` 복원
  - direct detail hidden/null 정책은 `communityReadPathPolicy.test.ts`로 고정
- [x] 댓글 soft-hide 앱 read-path 반영
  - QA 댓글: `active -> hidden`, feed preview `5 -> 4`
  - undo 후 `active` 복구, feed preview `5` 복원
- [x] Android 알림 lifecycle 대표 경로
  - 시스템 알림 권한 허용
  - 운영 알림 opt-in 후 `push_opt_in=true`, provider `disabled`, token status `provider_unavailable`
  - opt-out 후 `push_opt_in=false`, token status `revoked`
  - 실제 push 발송 없음
- [x] Keyboard/nav/back 대표 입력 경로
  - 커뮤니티 댓글 입력 focus 시 keyboard bar가 TextInput/CTA를 가리지 않음
  - Android back으로 keyboard dismiss와 리스트 복귀 정상
- [x] latest logcat
  - `/tmp/nuri-qa/final-android-logcat-20260714.txt`
  - `FATAL EXCEPTION`, `ANR`, `Unhandled promise`, `ReactNativeJS fatal`, `Fatal signal` pattern 0건
- [ ] 남은 외부/운영 조건
  - MFA/recovery 실제 등록/사용 QA
  - 검색 전용 UI hidden 제거 캡처
  - logout/account switch token isolation 실기기 증적
  - custom domain / 외부 runtime monitoring

## v1.1 업데이트 백로그

- 아래 항목은 v1.0 미완성 이월이 아니라 신규 업데이트 후보로 관리한다.

## 2026-07-09 V1.1.1 프리미엄 보상 모달 release 체크

- [x] `PremiumRewardModal` 구현 검토
  - XP 획득량, 누적 XP, 현재 레벨, 레벨업 여부, streak 표시 확인
  - NURI premium pet-app tone 확인
  - 서버 XP/RPC/RLS 계약 변경 없음
- [x] `오늘 하루 안 보기` 정책 검토
  - KST 기준 user-scoped AsyncStorage key
  - 같은 날 재노출 suppress
  - 다음 날 다시 표시 가능한 구조
  - 다른 사용자/서버 데이터 영향 없음
- [x] Android visual QA
  - 기기: `SM_S937N / R5CY613NMSY`
  - XP 지급 모달: `/tmp/nuri-qa/v111-premium-reward-modal-walk-xp.png`
  - 오늘 하루 안 보기: `/tmp/nuri-qa/v111-premium-reward-modal-hide-today.png`
  - cold start persistence: `/tmp/nuri-qa/v111-premium-reward-modal-cold-start-persistence.png`
  - 후속 같은 날 기록 suppress: `/tmp/nuri-qa/v111-premium-reward-modal-suppressed-after-hide.png`
- [x] 회귀 범위
  - 기록 작성 후 상세 이동 유지
  - 기록 수정 완료 premium completion/reward path 확인
  - 날씨 활동 완료 모달 premium tone 적용
  - 활동·칭호 대시보드 반영 유지
  - 알림 home quick dismiss / inbox delete 분리 유지
- [x] 최종 검증 명령
  - typecheck
  - lint
  - focused tests
  - diff check
  - release APK rebuild/install
  - logcat fatal/ANR/unhandled/ReactNativeJS fatal 0건

판정: release blocker 없음. 최종 검증 명령 통과 후 V1.1.1 프리미엄 보상 모달 closeout 가능.

- [ ] Entitlement / billing foundation
  - 실제 결제/과금 구조는 v1.0에서 열지 않고 v1.1 신규 업데이트 후보로 관리한다.
- [ ] Premium AI reply 선행조건
  - AI reply는 v1.0에서 열지 않고 notice/consent/generation log/provider policy를 v1.1에서 별도 설계한다.
- [ ] Guestbook private letters 확장 아키텍처
  - v1.0에서는 기존 단순 방명록 상태로 출시하고 상세/수정/삭제/AI reply 확장은 v1.1 후보로 둔다.
- [ ] Typography foundation rollout
  - v1.0에서는 폰트/타이포 전면 리디자인을 진행하지 않고 v1.1 시각 정비 트랙으로 둔다.
- [ ] 장소/동물병원 `confirmed` 개방 검토
- [ ] 동물병원 admin 계정 조작 증적
- [ ] 커뮤니티 preview batch 최적화
- [ ] 운영자용 moderation/admin UI
- [ ] auth/account baseline-history 정리
- [ ] 외부 API 키 통제, 환경 분리, 운영 도구 정리
- [ ] 건강관리 메뉴 전환
- [ ] 타임라인 건강 입력 제거
- [ ] 생활 병원/약 이관
- [ ] 건강관리 전용 기록하기
- [ ] premium 인사이트 연결
- [ ] Open-Meteo customer API key/계약 확인
  - v1.0 blocker는 아니나 운영 고도화 항목이다.
- [ ] `weather-cache` public endpoint abuse throttle/rate limit
  - v1.0 blocker는 아니나 운영 고도화 항목이다.
- [ ] Apple social login backlog
  - Apple은 Android-first v1.0 범위에서 제외하며 iOS 출시 및 Apple 정책 검토 시점에 별도 판단한다.

## 2026-07-23 자주 쓰는 기록 E2E release evidence

- [x] 홈 `자주 쓰는 기록` 프리미엄 UI
  - 스파클 헤더, 9px 설명 문구, 전체 보기, 산책·식사·건강·미용 카드
  - 모든 화면 1:1:1:1 동일 폭 4열
  - 카테고리 카드 배경 투명, 강한 그림자 제거
  - 폰트: 제목 18/600, 설명 9/400, 전체 보기 12/500, 카테고리 13/600, 상대시간 9/500, 요약 10/500
- [x] 실제 최신 기록 연동
  - 선택된 반려동물 기준 `MemoryRecord` 최신 1건
  - 상대시간·요약·기록 없음·로딩·오류 상태
- [x] 실기기 기록 저장 및 영속성
  - `adminQA`에서 산책·식사·건강·미용 각 1건 저장
  - 저장 직후 홈 반영 및 강제 종료 후 재실행 유지
  - evidence: `/tmp/nuri-qa/frequent-records-four-qa.png`, `/tmp/nuri-qa/frequent-records-after-restart.png`
- [x] 코드 게이트
  - typecheck, lint, 68 suites / 272 tests, release APK build 통과
- [x] 상대시간 실시간 갱신
  - focus·active 상태에서 60초 interval 및 foreground 즉시 sync
  - 실기기 60초 이상 대기 후 네 카드 상대시간 증가 확인
  - evidence: `/tmp/nuri-qa/frequent-records-1x4-window-scrolled.xml`, `/tmp/nuri-qa/frequent-records-1x4-window-after-60s.xml`

## 2026-07-23 자주 쓰는 기록 한국어 요약·타이포그래피 보정 release evidence

- [x] 홈 `자주 쓰는 기록` 최종 타이포그래피와 간격 보정
  - 섹션 제목: `18px / 600` 유지
  - 설명 문구: `10px / 400`
  - 전체 보기: `11px / 500`, 투명 배경, 최소 높이 34dp
  - 카테고리명: `12px / 500`
  - 기록 시간: `9px / 500`, 좌우 padding 10dp
  - 기록 요약: `9px / 500`
  - 로딩·오류 문구: `13px / 500`
  - 스파클 래퍼 26dp, 카테고리 아이콘 24dp, 카드 아이콘 래퍼 36dp
  - `오늘의 말`과 `오늘 한장` 사이 간격을 `todayPhotoSection`으로 확대
- [x] 실제 데이터 기반 한국어 요약 규칙
  - 산책: 기록 시각의 오전/오후 및 저장된 시간·거리 데이터에서 `오전 산책 완료`, `32분 산책 완료`, `1.8km · 32분` 형태를 생성
  - 식사: 저장된 수량·단위에서 `사료 180g` 형태를 생성하며 임의의 `0g`을 만들지 않음
  - 건강: 저장된 감정 태그에서 `컨디션 나빠요`, `컨디션 좋아요`, `컨디션 무난해요`를 생성
  - 미용: 저장된 목욕·털·발톱 관련 metadata에서 `목욕 & 털 정리`, `목욕 완료`, `털 정리 완료`, `발톱 정리 완료`를 생성
- [x] 최신 실기기 재검증
  - `adminQA`의 QA 펫에 아래 새 기록 4건을 저장하고 삭제하지 않음:
    - `QA_walk_morning_20260723`
    - `QA_meal_food_180g_20260723`
    - `QA_health_condition_bad_20260723`
    - `QA_grooming_bath_fur_20260723`
  - 홈 카드 출력: `오전 산책 완료`, `사료 180g`, `컨디션 나빠요`, `목욕 & 털 정리`
  - 앱 강제 종료·재실행 후 동일 출력 및 QA 기록 유지 확인
  - 60초 갱신 전후 산책 `2분 전 → 3분 전`, 식사 `1분 전 → 2분 전` 등 상대시간 진행 확인
  - evidence:
    - `/tmp/nuri-qa/frequent-records-korean-final-before-60s.png`
    - `/tmp/nuri-qa/frequent-records-korean-final-after-60s.png`
    - `/tmp/nuri-qa/frequent-records-korean-final-before-60s.xml`
    - `/tmp/nuri-qa/frequent-records-korean-final-after-60s.xml`
    - `/tmp/nuri-qa/frequent-records-korean-relaunch-scrolled.xml`
    - `/tmp/nuri-qa/frequent-records-korean-final-logcat-20260723.txt`
  - 최종 APK 재설치 evidence:
    - `/tmp/nuri-qa/frequent-records-korean-final-release.png`
    - `/tmp/nuri-qa/frequent-records-korean-final-release.xml`
    - `/tmp/nuri-qa/frequent-records-korean-final-release-logcat.txt`
- [x] 최종 코드 게이트
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `68 suites / 273 tests` 통과
  - release APK build/install 통과
  - APK SHA-256: `5a9d19e5021fdb0553d3cc10caa6fb628ec0a96ac9ce6fe2e658f64c8adc53dd`
  - logcat `FATAL EXCEPTION`, `ANR in`, `Fatal signal`, `ReactNativeJS fatal`, `Unhandled promise` 0건
  - Supabase dry-run: remote up to date. 이 항목은 구조화 입력 migration 적용 전의 이전 typography-only evidence다.

## 2026-07-23 자주 쓰는 기록 구조화 입력·중앙 정렬 최종 release evidence

- [x] 카드 콘텐츠 중앙 정렬
  - 아이콘·카테고리·상대시간·요약을 하나의 중앙 stack과 고정 slot으로 배치
  - 1:1:1:1 동일 폭, 투명 카드, 강한 그림자 없음
- [x] 실제 입력 필드와 홈 요약 계약
  - 산책: `createdAt` 로컬 시간대 기반 오전/점심/오후/저녁/밤
  - 식사: 급여량 숫자 입력, 0 이하 차단, 선택 펫 기본 급여량 자동 입력
  - 건강: 컨디션 선택, 선택 체중 kg
  - 미용: 다중 care type, 전체 미용과 세부 항목 상호 배타
- [x] Supabase additive migration
  - `20260723110000_record_structured_fields.sql` 적용
  - `memories.metadata`, `pets.default_meal_amount_grams`
  - `supabase db push --dry-run`: remote up to date
- [x] Android 실기기 E2E
  - `SM_S937N / R5CY613NMSY`, `adminQA`와 기존 QA 펫
  - 산책 저장, 식사 180g 기본값 저장/자동 입력, 식사 150g 수동 변경, 건강 `지켜봐야 해요`+4.8kg, 미용 `목욕 & 털 정리`
  - 홈 즉시 반영 및 강제 종료·재실행 후 유지
  - 최종 기록은 QA 계정에 유지하고 cleanup하지 않음
- [x] 최종 evidence
  - APK SHA-256: `1ef8949f46732814fe35162d4fc93e0352d09e59d3781062679ac06d1beeb578`
  - `/tmp/nuri-qa/frequent-records-structured-final-release.png`
  - `/tmp/nuri-qa/frequent-records-structured-final-release.xml`
  - `/tmp/nuri-qa/frequent-records-structured-final-release-logcat.txt`
  - app fatal/ANR/ReactNativeJS fatal/unhandled promise 0건
- [x] 코드 게이트
  - typecheck, lint, focused 8 tests, 전체 69 suites / 277 tests, release build/install, Supabase dry-run

## 2026-07-23 최근 기록 리스트 리디자인 release evidence

- [x] 홈 최근 기록 전용 행 UI
  - 공용 타임라인 카드의 100dp 썸네일·세로 rail을 홈에서 제거하고, 날짜 그룹과 88dp 최소 높이의 둥근 행으로 교체
  - 카테고리 아이콘, 카테고리명, 실제 metadata 기반 한국어 요약, 기록 시각과 chevron의 수평 정렬 표시
  - 섹션 제목 `18/600`, 전체보기 `11/500`, 카테고리명 `14/500`, 기록 시간·요약 `11/500`, 상태 문구 `13/500`
- [x] Android 실기기
  - `SM_S937N / R5CY613NMSY`, 최신 release APK 설치
  - 고정된 건강 행 탭 후 해당 `추억상세보기` 이동 및 Android back 복귀 확인
  - evidence: `/tmp/nuri-qa/recent-records-redesign-list-v2.png`, `/tmp/nuri-qa/recent-records-row-navigation-health-v2.png`, `/tmp/nuri-qa/recent-records-redesign-list-v2.xml`
- [x] 최종 코드 게이트
  - typecheck, lint, diff check, release build/install 통과
  - 앱 프로세스 logcat `FATAL EXCEPTION`, `ANR in`, `Fatal signal`, `ReactNativeJS fatal`, `Unhandled promise` 0건
  - APK SHA-256: `c066fe5f5e41a9f8bf68cecca031e11ce6bcd0d5655264efdaa56398fb3d0334`
  - 앱 프로세스 logcat: `/tmp/nuri-qa/recent-records-redesign-logcat-app-v2.txt`

## 2026-07-31 이번 주 요약 리디자인·주간 집계 release evidence

- [x] 레퍼런스 기반 주간 요약 UI
  - 헤더, 2x2 통계 카드, 한 줄 요약, footer 정보 바 구현
  - metric card 높이 144dp, icon 42dp로 압축
  - 최근 기록 섹션과 맞춘 폰트: 제목 18/600, 설명 11/500, 라벨 14/500, 숫자 28/800, 단위 11/500, 요약 제목 14/600, 요약 본문 11/500, footer 11/500/12/700
- [x] 주간 집계 계약 보정
  - KST 월요일 시작·다음 월요일 미만 범위
  - 선택된 펫의 category-first 분류
  - 산책·식사·생활 count, distinct 기록일, 총 기록 계산
  - 건강·일기·병원 명시 category의 잘못된 생활 합산 방지
- [x] 10건 이상 한글 실기기 QA
  - `SM-S937N / R5CY613NMSY`, 고정 QA 계정과 기존 QA 펫 사용
  - 산책 4건, 식사 3건, 생활 3건을 새로 저장하고 기존 산책 1건을 포함한 실제 결과 확인
  - 최종 표시: 산책 5, 식사 3, 생활 3, 기록한 날 1, 총 기록 11개
  - 앱 강제 종료·재실행 후 동일 수치 유지
  - QA 기록은 삭제하지 않고 유지
- [x] 최종 release artifact
  - APK: `android/app/build/outputs/apk/release/app-release.apk`
  - versionName `1.0`, versionCode `1`
  - SHA-256: `876c31e131d261ce78f86024b83acc85d690187389fb7c9e96002b4928f060b7`
  - 임시 `ClipboardActivity`는 최종 빌드 전에 제거
- [x] 검증
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `69 suites / 279 tests` 통과
  - release build/install 통과
  - Supabase dry-run: remote up to date
  - 최종 logcat fatal/ANR/ReactNativeJS fatal 표식 0건
  - evidence: `/tmp/nuri-qa/weekly-summary-final-release-verified.png`, `/tmp/nuri-qa/final-release-weekly-full.xml`, `/tmp/nuri-qa/weekly-summary-qa-10plus-full.png`, `/tmp/nuri-qa/weekly-summary-qa-relaunch-final.png`, `/tmp/nuri-qa/final-release-logcat.txt`

## 2026-07-31 홈 전체 기준선 조사·최근 기록 단일 카드 release evidence

- [x] 홈 범위 변경
  - 로그인 홈 동적 오늘 메시지 영역과 헤더의 정적 오늘 메시지 문구 제거
  - 자주 쓰는 기록 clock icon 제거, 상대시간 텍스트·진입 동작 유지
  - 최근 기록을 외부 카드 1개와 row/inset divider로 정리
  - loading/empty 상태도 동일 외부 카드 안에 유지
  - 커뮤니티 파일 0개 변경
  - 앱 navigation 파일 0개 변경
- [x] 정적 기준선 조사
  - 비커뮤니티·비네비게이션 source 303개
  - 고유 route 52개, 비커뮤니티 화면 파일 74개
  - fontSize 27개, fontWeight 14개, lineHeight 29개, letterSpacing 13개
  - paddingHorizontal 25개, paddingVertical 23개, gap 20개, borderRadius 40개
  - PretendardVariable.ttf 단일 자산 및 shared GuestHome hero style 확인
- [x] Android physical device
  - `SM-S937N / R5CY613NMSY`, Android 16, 1080x2340, density 450
  - release APK install/cold start/home scroll 확인
  - 오늘 메시지 미노출, 자주 쓰는 기록 clock icon 미노출, 최근 기록 단일 card/inset divider 확인
  - evidence: `/tmp/nuri-qa/home-after-recent-card.png`, `/tmp/nuri-qa/home-recent-single-card.png`, `/tmp/nuri-qa/home-final-release-no-today-message.png`, `/tmp/nuri-qa/home-final-release-logcat-app.txt`
- [x] 최종 코드 게이트
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `69 suites / 279 tests` 통과
  - release build/install 통과
  - app-PID filtered logcat fatal/ANR/ReactNativeJS fatal 0건
  - APK SHA-256: `cb21911013ebc74debc2b2f3b54b1d467cb3adf4f4bfd2bdf4b3da6500a0bc60`
  - logcat: `/tmp/nuri-qa/home-logcat-app.txt`

## 2026-07-31 비제외 전역 UI 및 홈 기록 영역 최종 release evidence

- [x] unified typography 적용
  - unifiedTitle: 18/600
  - unifiedLabel: 14/500
  - unifiedBody/unifiedMeta: 11/500
  - unifiedDate: 13/500
  - PretendardVariable 기반, 커뮤니티·네비게이션·날씨 preset/소스 미변경
- [x] 홈 자주 쓰는 기록
  - 4열 동일 폭 유지
  - 외부 gradient 및 항목별 카드 배경 제거
  - marker형 시간 강조, clock icon 없음
  - 공통 `전체 보기` action 적용
- [x] 홈 최근 기록
  - 단일 외부 카드 내부에 헤더·날짜 그룹·row 배치
  - 전체 보기 버튼을 카드 내부로 이동
  - divider를 icon 영역까지 전체 row 폭으로 확장
  - 마지막 row divider 없음
- [x] physical device
  - `SM-S937N / R5CY613NMSY`, Android 16, 1080x2340, density 450, portrait
  - 최종 release APK install/cold start/home scroll 성공
  - Galaxy S24 동일 모델 evidence는 미확인
- [x] 최종 코드 게이트
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `69 suites / 279 tests` 통과
  - Supabase `db push --dry-run`: remote up to date
  - release build 성공
  - APK SHA-256: `15992eeceeed7ce99a205d84d2691384b0e62fb8d17d20554a5a713df853eefb`
  - evidence: `/tmp/nuri-qa/global-ui-final.png`, `/tmp/nuri-qa/global-ui-final-records.png`, `/tmp/nuri-qa/global-ui-final-recent.png`, `/tmp/nuri-qa/global-ui-final-logcat.txt`
  - 앱 PID 기준 Fatal/ANR/ReactNativeJS fatal/Fatal signal/unhandled promise 0건
  - diff check 통과

## 2026-07-31 비제외 전역 UI 최종 보정 release evidence

- unified typography: title `18/600`, label/input `14/500`, body/meta/time/link `11/500`, date `13/500`, Android `PretendardVariable`
- 비제외 입력 화면 24개 파일에 `AppTextInput` 적용. native ref, keyboard, placeholder, selection 계약 유지.
- 커뮤니티 파일 `0`, 하단 네비게이션 파일 `0`, 날씨 및 날씨 상세 파일 `0` 변경.
- TypeScript, lint, Jest `69 suites / 279 tests`, `git diff --check`, release build/install 통과.
- Supabase `db push --dry-run`: remote up to date, 신규 migration 없음.
- APK SHA-256: `112a3fcc050e73eb5f3003a356c9cd57e348072d0b3157a5247335fb37277d92`
- physical device: `SM-S937N / R5CY613NMSY`, Android 16, 1080x2340, density 450, portrait.
- evidence: `/tmp/nuri-qa/global-ui-typography-final.png`, `/tmp/nuri-qa/global-ui-typography-records.png`, `/tmp/nuri-qa/global-ui-typography-frequent.png`, `/tmp/nuri-qa/global-ui-typography-final-logcat.txt`
- app-PID logcat markers: Fatal/ANR/ReactNativeJS fatal/Unhandled promise/SecurityException `0`
- Galaxy S24 동일 모델 evidence는 실제 연결 기기가 `SM-S937N`이므로 미확인.

## 2026-07-31 비제외 typography 모드 최종 release evidence

- [x] 비제외 사용자-facing `AppText` semantic preset 잔여분을 unified 기준으로 전환.
- [x] 공유 `ConfirmDialog`·`PremiumNoticeModal`은 비제외 호출만 `typographyMode="unified"`, 커뮤니티·날씨 호출은 legacy 유지.
- [x] `WaveText` 처리 문구 unified label 적용, 수치 display·아이콘·이모지·구분자·네비게이션은 역할별 예외 유지.
- [x] TypeScript, lint, Jest `69 suites / 279 tests`, `git diff --check`, release build/install 재통과.
- [x] Supabase `db push --dry-run`: remote up to date, 신규 migration 없음.
- [x] APK SHA-256: `0fe640ac958c935e47ec2b501da23b67d22d610e2947a0e442a228071fd810ff`
- [x] physical device: `SM-S937N / R5CY613NMSY`, Android 16, 1080x2340, density 450, portrait.
- [x] evidence: `/tmp/nuri-qa/global-ui-typography-final.png`, `/tmp/nuri-qa/global-ui-typography-final-logcat.txt`
- [x] app-PID logcat markers: Fatal/ANR/ReactNativeJS fatal/Unhandled promise/SecurityException `0`
- [ ] Galaxy S24 동일 모델 evidence: 실제 연결 기기가 `SM-S937N`이므로 미확인.
