# NURI Hero / Pet Profile Design Release Delivery

기준일: 2026-10-15

## Approval And Source

- PO 승인: Metro 종료, 누적 후속 디자인 Release 빌드, 기존 앱 위 설치, 선택 커밋과 전용 브랜치 정상 push.
- Branch: `codex/mint-background-review`.
- Base: `577a7ec0e513b13de3c66c3f30309ccc4b974ce4`.
- Design/runtime commit: `28e7ccfcb9b489f8db0f38ac6e9c72e5144c71fe`.
- Build tree: `2ddf47cb128102028d686e1e393e147a72af10e0`.
- Reviewed commit: 제품10·테스트8·문서4, 총22경로. 원본 저장소 dirty181·증적·산출물·보호 설정은 제외한다.
- 이 보고서/설치 결과 메모리는 문서 전용 후속이다. runtime 차이가 없으므로 재빌드하지 않는다.
- 실제 원격 수락과 문서 후속을 포함한 최종 HEAD는 아래 외부 `delivery-result.json`/`FINAL_REPORT.md`가 소유한다. main 병합·태그·force push·Store 제출은 승인하지 않는다.

## Design Scope

- Home 상단 카피 제거, 현재 선택 펫 사진의 전폭/원본 비율 배경과 임시 링 비표시, 연속 계절 면과 전폭 정보 글라스.
- 칭호·점·이름의 중앙 정렬, 작은 함께한 시간/기존 양쪽 하트, 최신 기록 안내와 더 알아보기의 세로 글라스 버튼. 구분선은 제거하고 Frequent Records의 반사광/베벨 재질·18dp 화살표·48dp 터치를 재사용한다.
- 품종/나이/몸무게/성별은 기존 더 알아보기 시트 첫 리스트로 이동한다. 실제 펫 이름의 소개와 취향, `이런 아이에요` 다음 줄 실제 요약, 부재 값 미입력/긴 값 줄바꿈을 사용한다.
- 정보→날씨 및 날씨 아래 섹션 간52dp, 기존 다른 카드 폭/계절색은 유지한다.
- 아이들 프로필 관리의 원본 사진 contain/좌우 카드, 이름·품종 아래 다섯 정보 행과 역할별 CTA, 추억 상세의 작은 프로필/글라스 리스트·계절 primary 더보기/화살표.
- android·Supabase·서비스/store·Walk 엔진·의존성·공통 token 변경0. 전체 앱 디자인/Handling/Responsive 최종 동결이 아니다.

## Validation

| Gate | Actual |
| --- | --- |
| Final full suite | 1회, 252 suites / 2,975 tests PASS |
| TypeScript | PASS |
| Scoped lint | 18 files, errors0 / existing warnings18 / new0 |
| Warning owners | Home16, PetManagementScreen2; 기준 source와 동일 |
| Source/import/secret guards | PASS |
| Diff whitespace | PASS |
| Validated product/test bytes | Commit/build에서 동일 |
| Security commit ancestry | PRESERVED |
| Original dirty181 status/content | MATCH |

기존 각 디자인의 fail-first/targeted receipt는 project-memory의 해당 증적 root에 보존한다. 전체 테스트 이후 제품/테스트 source 변경0이다. 이전 전달의 CI OAuth fixture origin 불일치는 별도 알려진 harness 문제이며 이번 디자인 범위에서 수정하지 않는다. 새 push CI의 실제 결과도 원격 receipt와 구분하며 로컬 PASS를 CI PASS라고 부르지 않는다.

## Release And Installation

| Item | Actual |
| --- | --- |
| Canonical QA Release invocation | 1 |
| Replace install | 1 |
| Uninstall / clear data | 0 / 0 |
| Source at build | CLEAN exact runtime commit |
| Application | com.nuri.app, version1.0 / code1 |
| Artifact | QA release, embedded JS |
| APK verifier | ACCEPTED |
| Approved signer / installed SHA | MATCH / MATCH |
| debuggable / cleartext / allowBackup | false / false / false |
| AAB cryptographic signature / signer | Verified / MATCH |
| Protected runtime/build input hashes | UNCHANGED |
| Metro dependency | NONE; Metro OFF |

APK SHA-256:
`381495b8054b2de738ba492edf82382124a2185cad2817e7426c094f70d3e569`

AAB SHA-256:
`717f19a316ce4c6a2c3fa1272b832f3522265e992d06c4b21e7911e9641793f0`

기존 approved signing identity를 사용한다. Keychain 값/keystore를 출력하거나 복사하지 않는다. AAB의 암호학적 검증을 CA 신뢰나 Store 승인으로 확대하지 않는다.

## Device Boundary

- Galaxy S24 SM-S937N, 기존 앱 ID/UID10402·최초 설치2026-06-02 19:16:57·1080×2340/density450/fontScale1.0 유지.
- 재로그인 없이 Home 탭/함께한 시간/더 알아보기와 선택 펫 누리 표시를 접근성 계층으로 확인했다. 사진 pixel fidelity/모든 화면 시각 QA를 새로 완료했다고 주장하지 않는다.
- 최초 부트스트랩 직후의 홈 표시 미확인 receipt와 이후 준비 완료 receipt를 모두 유지한다. 추가 build/install 없이 홈 표시가 확인됐고 현재 앱 프로세스 fatal/JS error0이다.
- Walk service 미실행, 실제 GPS/보행 QA0, 실제 지도 screenshot0, raw coordinate evidence0. 기기 조작은 설치와 앱 실행/상태 조회에 한정한다.
- uninstall·clear data·logout·계정/펫 편집0이다. 서버 변경 명령/배포0이며 정상 앱 조회의 부수 효과를 별도 DB snapshot으로 검증했다고 주장하지 않는다.

## Evidence And Stop

외부 root:
`~/.codex/nuri-design-evidence/hero-profile-release-20261015-YAK4XT/`

- source-before / reviewed-design-paths / staged-design-paths: 선별 범위·원본 파일 hash.
- full-suite / typecheck / eslint / lint-baseline-comparison / local-validation: 로컬 gate.
- build-source / protected-inputs-before / preservation-during-build: 출처·보존.
- build-artifacts / additional-artifact-verification / device-before / device-after / launch-sanity / launch-ready: 빌드·설치와 초기/준비 완료 구분.
- `release/2026-10-15T05-03-34-137Z-28e7ccf-IrH0F4/artifacts/`: canonical APK/AAB·검증/provenance.
- delivery-result / FINAL_REPORT: 실제 원격 수락·최종 HEAD·원본 보존·최종 정지 상태.

증적/기존 산출물/cache를 정리하지 않는다. 원본 dirty181과 기존 보안20/20·Walk baseline을 유지한다. STORE HOLD, 다음 산책 GPS 작업은 PO 지시까지 대기하며 자동 시작하지 않는다.
