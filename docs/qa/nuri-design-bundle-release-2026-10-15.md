# NURI Approved Design Bundle Release

기준일: 2026-10-15

## Approval And Source

- PO가 누적 디자인의 메인홈 캡처·Release 빌드·선택 커밋·푸시를 승인했다. 추가로 미푸시 보안·Walk Phase 1~3 기반 이력을 보존한 `codex/mint-background-review` 전용 브랜치 공개도 명시 승인했다.
- 디자인/runtime source: `3c403f2017319378c6f4cdfa8a48b4210101f292`.
- 빌드 tree: `030c4d1e8d04c507faa9a617315bc83c4018209e`.
- 디자인 커밋: 검토한 106개 경로만 포함한다. presentation70·tests30·documentation6이며 원본 저장소의 dirty181·증적·빌드 산출물·보호된 설정은 포함하지 않는다.
- 이 보고서와 전달 후 메모리 변경은 문서 전용 후속이다. APK는 위 runtime commit에 귀속하며 문서 후속으로 재빌드하지 않는다.
- 원격 수락 SHA와 최종 푸시/보존 확인의 실제 결과는 아래 외부 증적의 `FINAL_REPORT.md` 및 `delivery-result.json`이 소유한다. main 병합·태그·Store 제출은 승인 범위가 아니다.

## Design Scope

- Home의 현재 네 계절 배경, 홈 외 `#F1F5F8` 페이지 바탕, Splash/로그인 흰색 예외를 유지한다.
- 공통 반사광/베벨 글라스와 홈 패널·알림·브랜드 카피, 계절 선택의 전체메뉴 이동, 커뮤니티 중앙 제목 제거, 날씨 카드/상세 Hero 후속을 포함한다.
- 월별 지출은 Home에서 제거하고 전체메뉴 프로필 아래에 실제 이번 달 합계와 화살표를 연결한다. 보조 `전체 펫` 문구는 숨기되 기존 전체 펫 집계는 유지한다. 제목/금액은 같은 행이며 빠른 이동 네 아이콘의 배경 면만 제거한다.
- 승인된 Walk presentation 후속은 작은 원형 펫 사진·실제 날씨·CTA/문구/정렬·명시적인 일회 위치 디자인 확인이다. Native 수집·거리 엔진·Room·서버·보상·Lifetime·XP는 변경하지 않는다.

## Validation

| Gate | Actual |
| --- | --- |
| Full suite | 1회, 248 suites / 2,866 tests PASS |
| TypeScript | PASS |
| Scoped ESLint | 98 files, errors0 / 기존 warnings23 |
| Existing warnings | Home16, More6, Notifications1 |
| Source/import/secret guards | PASS |
| Diff whitespace | PASS |
| Protected domain delta | android/supabase/services/store/scripts/providers/dependencies 0 |
| Accepted security ancestry | PRESERVED |
| Original dirty181 status/content | MATCH |

전체 테스트 이후 제품/테스트 source는 바꾸지 않았으며 승인과 전달 문서만 기록했다. Final Security Re-Audit를 실행하거나 기존 보안 baseline을 재오픈한 것은 아니다.

## S24 Captures

- Galaxy S24 SM-S937N, 원본1080×2340, 현재 가을 계절.
- Home Hero부터 월별 일기까지 연속 스크롤10장, 최신 전체메뉴 지출/빠른 이동 확인1장. 긴 섹션은 앞뒤 캡처를 함께 본다.
- Metro 앱의 실제 화면 캡처다. 새 Release 설치 후 QA나 네 계절 전체 신규 실기기 QA라고 주장하지 않는다.
- 실제 산책/위치 지도 캡처0, 실제 보행0. 기기는 가을 Home Hero로 복귀했다.
- 개인/QA 사진과 콘텐츠가 포함된 이미지는 Git에 넣지 않고 로컬 증적으로만 보존한다.

## Release Artifacts

| Item | Actual |
| --- | --- |
| Canonical QA Release invocation | 1 |
| Install / uninstall / clear data | 0 / 0 / 0 |
| Source at build | CLEAN exact `3c403f2` |
| Application | `com.nuri.app`, version1.0 / code1 |
| Artifact variant | QA release, embedded JS |
| APK verifier | ACCEPTED |
| Approved signer | MATCH |
| debuggable / cleartext / allowBackup | false / false / false |
| AAB signature / signer | Verified / MATCH |
| Protected runtime input hashes | UNCHANGED |

APK SHA-256:
`d5d719e605197f7c8b73b02e84311a5a6034abef194e7b60f18a0b7f2605e180`

AAB SHA-256:
`95f1fd164182bf1c2f3800ec32367bf44ce403eba6cc2b6b0d83c4cb74cc4aa1`

기기에는 기존 Metro 확인 앱을 유지한다. Release APK/AAB는 보존했지만 이번 요청에 없는 설치·Release 실기기 회귀 QA는 하지 않았다. AAB 검증은 별도 receipt이며 Store 업로드/CA 신뢰 승인으로 확대하지 않는다.

## Evidence And Stop

외부 증적 root:
`~/.codex/nuri-design-evidence/design-approved-release-20261015-weSr0I/`

- `SCREENSHOTS.md`, `screenshots-manifest.json`: 캡처와 원본 hash.
- `full-suite.json`, `typecheck.log`, `eslint.json`, `source-guard-final.json`: local validation.
- `reviewed-design-paths.json`, `staged-design-paths.json`: 선별 커밋 범위.
- `build-artifacts.json`, `aab-verification.json`, `manifest-verification.json`: 산출물 검증.
- `release/2026-10-14T23-27-46-166Z-3c403f2-UkYaFh/artifacts/`: canonical APK/AAB·서명/출처 sidecar. 경로의 UTC 날짜는 한국 시간 2026-10-15다.
- `FINAL_REPORT.md`, `delivery-result.json`: 원격 수락 및 최종 보존 확인.

원격 DB/Storage 변경 명령0, 새 서버 코드/배포0이다. 앱의 정상 조회에 따른 기존 counter/cache 부수 효과를 별도 서버 digest 검증했다고 주장하지 않는다. 원본 dirty181·native/거리·계정/펫을 보존하고 build cache/증적을 정리하지 않는다.

STORE HOLD. Walk 실외 QA·Handling/Responsive·Final Source Freeze·Final Security Re-Audit·다음 디자인 자동 시작은 하지 않는다. 전달 후 PO의 다음 디자인 지시를 기다린다.
