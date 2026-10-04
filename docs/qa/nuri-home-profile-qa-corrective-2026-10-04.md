# NURI Home · 프로필 등록 실제 QA corrective report

## 1. 현재 판정

- 구현·로컬 검사·최신 승인 후속 빌드·설치·실기기 QA 수행 완료. PO가 Galaxy S24에서 현재 Home·등록 범위의 최종 시각·UX를 승인했다. 해당 corrective는 COMPLETE_FROZEN이다.
- 최신 설치본: `9e6a110c`. 계절 검토 버튼은 유지하되 production 노출은 승인되지 않았다. Final RC 전에 제거 또는 production 비노출을 별도로 확정해야 한다.
- KST 종일 일정 저장 오류와 작은 화면 기본 글꼴의 날씨 풍속 말줄임은 미해결이다. 전체 운영 release gate가 PASS라고 선언하지 않는다.
- source of truth는 현재 앱 코드·실제 설치 APK·Galaxy S24 native 화면·linked Supabase catalog/QA 행이다. 이전 후보의 실패와 최신 성공 증적을 분리한다.

## 2. 변경과 원인

| 항목 | 원인과 실제 변경 |
|---|---|
| 등록 앱 글꼴 | 헤더 아이콘은 발견하기 어렵다는 PO 지시를 반영했다. 1단계 프로필 컬러 아래, 2단계 상세 정보 안에 라벨 있는 선택 필드를 넣고 기존 앱 전체 preference·설정 모달을 재사용한다. 반려동물별 설정을 새로 만들지 않는다 |
| 추가 후 focus·노출 | 좋아하는 것·싫어하는 것·취미의 추가 후 같은 입력에 focus와 키보드를 유지한다. 새 chip layout·keyboard·viewport를 측정하고 입력이 계속 보이는 범위 안에서 한 번의 native animated scroll로 아래를 드러낸다. 임의 대기시간이나 scroll 리셋을 쓰지 않는다 |
| Hero 더 알아보기 | 기존 중앙 touch 실패를 재현했다. 시각 translateY 14는 부모 touch 영역을 늘리지 않으므로 paddingTop 14로 바꾸고 뒤따르는 투명 Weather·하단 wrapper를 box-none으로 보완했다. 최신 중앙 touch는 실제 상세 진입 PASS |
| Recent CTA | 빈 상태 기록하기는 기존 recordBtn·recordBtnText material을 사용한다. 아이콘 없이 중앙 정렬하고 최소 높이 46dp에서 글꼴에 따라 늘어난다 |
| 확대 글꼴 | header action은 내용에 맞는 치수, 1.3배 이상 header는 CTA를 다음 줄 오른쪽으로 배치한다. 확대 Weather는 내용 기반 높이·안내 세로 배치·2×2 지표, Frequent는 고정 비율을 풀고 하단 메뉴는 한 줄 fitting으로 대응한다 |
| 계절 검토 버튼 | absolute overlay로 올려 별도 Home 상단 여백을 없앴다. overlay 외곽 box-none, 기존 네 버튼·계절 전환 동작 유지 |

Hero 부모 높이와 다음 시작 위치는 14dp 늘어난다. 전체 geometry delta 0이라고 보고하지 않는다. 승인된 배경·구체·별빛·계절 그림·공통 유리·빈 상태·서버 조회/캐시·moderation·알림 구현은 새로 설계하지 않았다. 기존 10월 2일 populated 네 작업과 무관한 dirty는 보존한다.

## 3. 실제 QA 데이터

작성은 정상 앱 UI만 사용했다. SQL은 catalog와 QA 식별자에 한정한 SELECT다. 기존 실제 기록을 수정하지 않고 개인 사진·계정 전환·데이터 초기화를 하지 않았다. 정상 기록 작성의 XP 등 기존 서비스 부수효과는 발생할 수 있으므로 전체 데이터 delta 0이라고 하지 않는다.

| QA 항목 | 유지 수 | 실제 Home 조건 |
|---|---:|---|
| 일기 | 7 | preview 7개, 실제 가로 swipe로 고유 7개 확인 |
| 건강 | 5 | preview 5개, 여러 행과 긴 제목 확인 |
| 산책·사진 | 1 | 실제 첨부·private upload·오늘 한장 표시 |
| 식사 | 1 | QA 1g, 기본 식사값으로 저장하지 않음 |
| 기타·미용 | 1 | Frequent·Recent·Hero memory 표시 확인 |
| 일정 | 8 | preview 최대 7개. 7개 상태를 native 확인 후 최신 중지 재검증용 8번째 실제 알람을 추가 |
| 공개 커뮤니티 | 3 | preview 3개, 실제 첫 글/보조 글과 좋아요·댓글 0 확인 |

- 전체 기록은 15개, canonical Summary는 건강 5개를 제외해 **10기록·1일**이다. QA 총수와 Summary 수를 혼동하지 않는다.
- Recent 3개·Frequent 4종·오늘 사진 1개·Community 3개·일정 7개·건강 5개·일기 7개라는 실제 source 제한을 유지했다. 일정은 기존처럼 과거 일정도 포함한다.
- QA 사진은 기존 production 가을 일기 artwork를 복사한 `/sdcard/Pictures/NURI-QA-20261004.png`다. 개인 원본을 사용하지 않았다.
- QA 식별자는 `/tmp/nuri-home-qa-fixes-20261004/qa-created-records.json`에 있다. 최종 scoped remote 확인은 15기록·8일정·3공개 글이다.
- 새 pet 생성은 하지 않았다. 기존 출처 미확인 draft chip과 QA 추가 chip을 삭제하지 않고 draft를 보존했다.
- **PO 검토까지 QA와 첨부 파일을 모두 유지한다.** 가짜 의료 판단·실측 체중·실제 약속·좋아요·댓글을 만들지 않았다.

## 4. 실기기 UX·반응형

Galaxy S24 `R5CY613NMSY` 한 대에서 진행했다. 다른 화면 폭은 임시 density 모사이며 여러 물리 기기 검증이 아니다.

- 360·384·400·430dp × system font scale 1.0·1.3·1.5: 12조합, PNG/XML 캡처 179쌍. 마지막 large 폭은 약 429.85dp다.
- 모든 조합에서 10개 section header·populated 내용·최하단 도달·Bottom Navigation을 확인했다. header/CTA·Frequent 4개·확대 Weather 지표·긴 일정/건강/Community 제목의 대표 화면을 직접 시각 점검했다.
- 시작 설정 1080×2340px·physical density 450·font scale 1.0으로 복원했고 density override가 없다.
- 앱 글꼴은 Pretendard를 실제 선택한 뒤 원래 **귀염발랄체**로 복원했다. 양 단계 폼 필드·기존 모달·입력 상태 보존을 확인했다.
- 세 취향 입력은 추가 후 focused=true, keyboard shown=true, 새 chip과 입력이 키보드 위에 함께 보였다. PO가 직접 확인 후 부드러운 노출을 포함한 최종 UX를 승인했다.
- Hero 더 알아보기의 현재 bounds 중앙을 눌러 실제 상세 화면을 열고 닫았다. 이전 중앙 실패 증적은 보존했다.
- 최신 설치본에서 네 계절 Hero·하단 캡처·scroll/Top 복귀를 baseline 폭/글꼴로 별도 확인했다. 12조합 전체를 각 계절마다 반복한 것은 아니다. 마지막 화면은 가을 Hero다.
- diary raw label에는 잘린 선행 아이콘으로 같은 행이 두 번 집계된 항목이 있었다. 원본은 보존하고 제목을 기준으로 보정한 고유 7개 결과를 별도로 기록했다. 앱이 8개를 표시한 것으로 판정하지 않는다.

## 5. 실제 알림·진동

기기 timezone은 Asia/Seoul이다. 기기 시간을 바꾸거나 합성 broadcast로 증적을 만들지 않았다.

| 검증 | 실제 한국시간 | 결과 |
|---|---|---|
| 최초 알람 | 11:35:00.105 시작 | 반복 진동 실행 확인 |
| OS 알림 중지 | 11:39:05.787 | cancelled_by_user·IDLE 확인, notification tap의 일정 목록 진입도 확인 |
| 최신 후보 알람 | **13:02:00.021** 시작 | native 반복 진동 status=running, 활성 Home notice 확인 |
| 최신 Home 중지 | **13:03:04.090** 취소 | 현재 notice의 중지 버튼 실제 touch, user stopped log·IDLE·notice 제거 |
| 지연 재확인 | 13:04:02 | 진동 재시작 없음, IDLE 유지 |

최신 알람 ID `c7789fe2-e069-4c2e-b795-b6e1d07b51bb`, 저장 `starts_at=2026-10-04 04:02:00+00`, 정시 reminder [0], synthetic QA다. 이전 후보 Home 중지 실패를 최신 성공으로 덮어쓰지 않으며 이전 증적도 유지한다. 이 확인은 재부팅·Doze·OEM 장시간 제한의 전체 검증은 아니다.

## 6. 로컬·빌드

- Node 24.20.0, Yarn 3.6.4.
- TypeScript PASS, targeted ESLint 오류 0·기존 경고 19·새 진단 0.
- 관련 **29 suites / 368 tests PASS**. full test는 실행하지 않았다.
- git diff --check PASS. APK에 포함된 594개 build input hash 변경 0.
- 마지막 ‘앱 글꼴’ 필드 후속 승인 Release·install 각 1회 성공. 10월 4일 누적 Release 5회·install 4회이며 중간 `10c9995e` smooth 후보는 후속 확대 글꼴 보완으로 superseded되어 설치하지 않았다.
- QA verifier ACCEPTED, bundle embedded, debuggable=false, cleartext=false. Metro·Fast Refresh OFF.
- 설치 완료 한국시간 12:33:31.681, install Success·설치 SHA-256 일치.
- APK: `/tmp/nuri-home-qa-fixes-20261004/font-field-followup/nuri-home-profile-qa-9e6a110c.apk`.
- SHA-256: `9e6a110c8bcf2964557108bda81317ca36fbda8a9f2bccc75f5c25245a6ed4ec`.
- 크기 227,509,244 bytes. 마지막 앱 source 수정 이후 생성한 빌드이며 후속 문서·QA 결과 저장은 APK source 변경이 아니다.

## 7. 짧은 성능 관찰

| 실제 warm scroll/Top | 프레임 | jank | 비율 | 복귀 PSS |
|---|---:|---:|---:|---:|
| 1 | 502 | 28 | 5.58% | 478.44MiB |
| 2 | 503 | 29 | 5.77% | 476.39MiB |
| 3 | 502 | 29 | 5.78% | 475.99MiB |

- 3회 합계 1,507프레임·86 jank, 약 5.71%다. 측정 중 반복 복귀 PSS의 지속 증가를 보지 않았지만 장시간 누수 해소나 성능 개선으로 단정하지 않는다.
- 최신 설치 이후 보존 로그의 NURI scope Fatal·ANR·RN 오류 패턴 0, 관찰 화면 Red Screen 없음. 로그 buffer 범위와 현재 process 관찰의 한계가 있다.
- 전체 기기 로그 수집은 출력 buffer 한도로 실패했다. 이미 완료한 3회 성능 원본은 유지하고 NURI 관련 tag로 로그 수집만 재시도했다. 앱 crash로 판정하지 않는다.
- 여러 물리 기기·저사양 기기·장시간 bitmap 메모리·네트워크 복귀의 전체 운영 QA는 별도다.

## 8. 잔여·보호 범위

1. **KST 종일 일정 저장 오류:** 실제 remote `pet_schedules_all_day_check`가 UTC `date_trunc('day', starts_at)=starts_at`를 요구한다. 앱의 KST 자정은 UTC 전날 15:00이므로 정상 종일 입력이 거부된다. 시간 지정 일정과 실제 알람 성공으로 이 문제를 닫지 않는다. 별도 서버 계약 승인 없이 migration·RPC·RLS를 수정하지 않았다.
2. **360dp / font scale 1.0 Weather 풍속 말줄임:** 보존된 compact 4열에서 `13.5…` 표시가 남는다. 확대 글꼴의 2×2에서는 `13.5m/s`를 확인했다. 모든 폭에서 값이 완전히 읽힌다고 보고하지 않는다.
3. **계절 검토 control production 노출:** 현재 absolute overlay는 검토용으로 유지한다. production 노출은 미승인 상태이며 Final RC 전에 제거 또는 production 비노출이 필요하다. Home·등록 시각·UX의 PO 승인은 완료했지만 전체 release gate는 HOLD다.
4. 기존 dirty·production 자산·개인 파일·모든 QA·현재/직전/안정 APK·SDK·keystore·wrapper·node_modules는 보호한다. 다음 작업을 자동 시작하지 않는다.

## 9. 증적

증적 root: `/tmp/nuri-home-qa-fixes-20261004`.

- 환경·기존 파일: `baseline.json`, `before/`.
- 최종 등록 필드: `font-field-jisu-restored.png/xml`, `font-field-step2-final.png/xml`, `font-field-pretendard-selected.png/xml`.
- 취향 추가·키보드: `font-field-registration-focus.json`, `font-field-focus-likes-added.png/xml`, `font-field-focus-dislikes-added.png/xml`, `font-field-focus-hobbies-added.png/xml`.
- native matrix: `final-responsive-matrix-results.json`, `final-responsive-settings-restored.json`, `final-matrix-*.png/xml`.
- 실제 preview·기록: `final-qa-summary.json`, `qa-created-records.json`, `final-qa-remote-preservation.json`, `final-diary-carousel-normalized.json`.
- Hero 중앙 touch: `final-hero-more-central-pass.png/xml`.
- 실제 알람: `final-alarm-active.json`, `final-alarm-home-active.png/xml`, `final-alarm-home-stopped.json`, `final-alarm-home-after-stop.png/xml`, `final-alarm-home-stop-verified.json`.
- 성능·로그: `final-perf-1.txt`, `final-perf-2.txt`, `final-perf-3.txt`, `final-runtime.json`, `final-runtime-filtered.txt`.
- 계절: `final-season-check.json`, `final-season-*-hero.png/xml`, `final-season-*-lower.png/xml`, `final-home-autumn-restored.png/xml`.
- local/build/install: `validation.json`, `type.txt`, `tests.txt`, `lint-comparison.json`, `font-field-followup/release-result.json`, `font-field-followup/install-result.json`.
- 이전 실패·중간 후보·직전 안정본은 삭제하지 않는다.

## 10. 승인된 안전 산출물 정리

삭제 전 각 경로의 realpath·Git ignored/tracked 여부·크기·수정 시각·열린 파일·active build/Metro를 확인했다. 최신 APK를 별도 보존하고 사용 중이지 않은 아래 네 경로만 정리했다.

| 정확한 프로젝트 경로 | allocated 용량 |
|---|---:|
| `android/app/build` | 3.094GiB |
| `android/app/.cxx` | 0.387GiB |
| `android/build` | 256KiB |
| `android/.gradle` | 0.038GiB |

- 합계 **3.519GiB**, Data volume 여유 **47.714 → 50.719GiB**, 실제 증가 **3.005GiB**다. APFS·다른 앱 활동 때문에 삭제 경로의 allocated 합계와 실제 free delta는 다를 수 있다.
- 정리 전후 프로젝트 tracked/nonignored untracked 1,362개·기존 이번 QA 파일 1,643개 hash 동일, 파일 목록·HEAD·branch·status·staged 동일. projectChanges=[]·qaChanges=[], required file loss 0.
- 현재/직전/안정 APK·모든 QA·첨부·production source/asset·기존 dirty·signing·SDK·wrapper·node_modules·개인 파일을 보존했다. 전역 Gradle·Yarn cache·시스템 관리 데이터는 삭제하지 않았다.
- 이 단계는 정리 전후 불변성 검증이다. 전체 corrective에 승인된 source 변경·QA 생성이 없었다는 의미는 아니다. 보고서 결과 기록은 별도의 의도된 문서 변경이다.
- 실제 정리 증적: `/tmp/nuri-home-qa-fixes-20261004/cleanup-before.json`, `cleanup-result.json`. QA 데이터는 삭제하지 않는다. 추가 build·install은 하지 않는다.
- 종료 재확인: `/tmp/nuri-home-qa-fixes-20261004/final-closeout-verify.json`. 시작 기존 파일 손실 0·예상 밖 변경 0, 공유 문서의 10월 2일 이하 본문 동일, 594개 build 입력 동일, 설치 APK hash 동일, 원래 기기 설정 복원·필수 파일 존재를 확인했다.
- Metro·현재 build·이번 작업이 시작한 watcher 없음. 기존 공유 Watchman PID 43589는 보존했다. 관찰 로그에서 NURI 오류 패턴은 종료 시에도 0이다.

## 11. Git·다음

Closeout 시작 HEAD `d5f2384ddfdf1b7fd649d8ed804d4f740a4577c4`, branch `codex/task6-community-content-policy`, staged NONE. PO 최종 승인에 따라 이번 10월 4일 source·관련 검사·문서만 한 번의 선별 commit·정상 push 대상으로 삼는다. 기존 10월 2일 dirty 및 무관한 research·CLI metadata·output·미커밋 자산은 포함하지 않는다.

관련 project-memory 4개와 release-checklist는 이번 10월 4일 block만 PO 승인 상태로 갱신한다. 이전 이력을 덮어쓰지 않는다. 기존 검사·build·install·실기기 결과를 재사용하며 추가 실행·QA 데이터 변경·cleanup은 하지 않는다.

선별 commit은 승인 APK 전체 입력의 snapshot이 아니다. APK에 함께 포함된 기존 10월 2일 미커밋 변경은 worktree에 그대로 남기고 이번 commit에서 제외한다. 실제 새 commit·remote SHA 일치·index와 보존 결과는 `/tmp/nuri-home-qa-fixes-20261004/git-closeout/final.json`에 별도로 기록한다.

다음 권장 순서는 Weather 360dp 풍속 보완 → KST 종일 일정 서버 계약 → 계절 control production 비노출/제거 → Test Hygiene/Full Suite → Final Release Hardening이다. 이번 턴에서는 자동 시작하지 않고 선별 Git 종료 후 다음 PO 지시를 기다린다.

PO 승인을 기다립니다.
