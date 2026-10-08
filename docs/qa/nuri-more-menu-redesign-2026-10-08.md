# NURI 전체메뉴 리디자인 최종 승인 보고서

2026-10-08 KST. PO가 **“최종승인을 결정한다 .”**라고 명시적으로 승인했다. 전체메뉴 리디자인은 `FINAL_APPROVED`이며 기존 설치 APK `520f38af`와 source를 유지한다. 승인 반영은 관련 문서만 갱신했고 추가 코드 수정·테스트·빌드·설치·기기 조작·DB·cleanup·commit·push는 하지 않았다.

기존 로컬 검증과 Release 빌드·설치는 각각 보고된 범위 그대로 유지한다. PO의 디자인 승인을 Codex가 미실행한 native 확대 글꼴·TalkBack·전체 E2E 검증 PASS로 확대하지 않는다. 아래 후보 구현·검증 기록 및 원본 evidence JSON의 승인 대기 표시는 당시 실행 이력이며 현재 승인 판정은 이 보고서가 소유한다.

## 1. 범위와 기준

- 디자인 기준: [승인된 전체메뉴 벤치마크 분석](/private/tmp/nuri-more-menu-benchmark-20261008T210113/FINAL_REPORT.md)의 기능 보존형 기본안. 외부 앱의 이미지·아이콘·카피를 복사하지 않았다.
- 기존 source의 `MoreDrawerContent`가 실제 소유 화면이다. 전체메뉴 표시만 분리했으며 `MoreScreen`, 전역 navigation, Auth provider, 모달 입력·키보드 계약은 변경하지 않았다.
- 현재 branch: `codex/task6-community-content-policy`. base HEAD와 origin tracking ref: `e49356c14f731599d0a428c52fff368aa997ce18`. 신규 runtime은 미커밋 후보이며 해당 HEAD만으로 후보 출처를 설명하지 않는다.
- 증거 root: `/private/tmp/nuri-more-menu-redesign-20261008T125732/`. [작은 검증 metadata](nuri-more-menu-redesign-2026-10-08-evidence/validation.json)와 [보존 점검](nuri-more-menu-redesign-2026-10-08-evidence/preservation.json)은 repository QA 구조에도 남겼다.

## 2. 구현 결과

| 영역 | 변경과 보존 |
| --- | --- |
| 상단 | 작은 고정 전체메뉴 제목, 기존 닫기 callback, 기존 앱 설정 그룹으로 스크롤하는 gear. 새 설정 화면은 만들지 않음 |
| 사용자·펫 | 닉네임 수정과 펫 프로필 관리를 별도 행으로 분리. 펫 사진을 누르면 닉네임 수정이 열리던 대상 혼동 해소 |
| 펫 상태 | 실제 펫 수·선택 상태, 사진 없음/로드 실패 대체 심볼. 선택 ID가 없을 때 첫 펫 표시를 선택된 펫이라고 주장하지 않음 |
| 빠른 이동 | 전체일정·추억 다이어리·건강관리·실내 놀이 추천 4개. 기존 목적지·선택 펫·entrySource 유지 |
| 평면 그룹 | 소통과 활동 → 생활 정보 → 앱 설정 → 이용 안내 → 계정. 반복 그룹 카드와 큰 아이콘 배경 제거 |
| 설정 | 펫 강조색의 실제 swatch, 실제 앱 글꼴, 알림 설정, 알림함 unread 표시. 확인하지 않은 알림 권한을 꺼짐으로 표시하지 않음 |
| 계정 | 차단 사용자·로그아웃·회원탈퇴를 계정 그룹에 배치. 탈퇴 진입은 조용한 위험색 행, 기존 2단계 확인과 최종 destructive CTA 유지 |
| 운영 | 기존 ready profile + admin/super_admin 조건만 유지. QA·개발 진입점 추가 없음 |
| 글꼴·계절 | 사용자 글꼴과 테마 구조 유지. effectiveSeason은 빠른 이동의 작은 tint에 적용, 펫 강조색과 분리 |
| 접근성 | 행 button role/label, 장식 아이콘 낭독 제외, 헤더 도구 48dp. 큰 글꼴은 1열·상태값 하단·행 자동 높이 |

고객지원·공지·앱 버전·월별 지출의 새로운 전체메뉴 진입점은 기본 승인안에 없으므로 추가하지 않았다. 기존 기능을 삭제하지 않았으며 모든 기존 destination과 로그인 gate를 테스트했다.

## 3. 수정 파일과 시각 계약

Source 3개, 테스트 2개만 수정·추가했다.

- [MoreDrawerContent](../../src/screens/More/MoreDrawerContent.tsx): 메뉴 재배치와 설정 그룹 스크롤. 계정·권한·서버 callback은 유지.
- [MoreMenuPresentation](../../src/components/MoreDrawer/MoreMenuPresentation.tsx): 헤더·사용자/펫·행·그룹의 화면 로컬 표현.
- [moreMenuVisualTokens](../../src/components/MoreDrawer/moreMenuVisualTokens.ts): More 전용 geometry, 기존 테마·계절·위험색 재사용.
- [기존 메뉴·탈퇴 회귀 테스트](../../__tests__/moreAccountDeleteConfirmDialog.test.tsx), [새 표현 테스트](../../__tests__/moreMenuPresentation.test.tsx).

기본 header minHeight 56dp, 좌우 20dp, 행 minHeight 56dp, 행 내부 좌우 4dp·상하 10dp, 그룹 gap 24dp, 아이콘 20dp, 빠른 이동 아이콘 배경 28dp/radius 8dp, 펫 사진 48dp다. 메뉴 15/22sp, 그룹 13/18sp, 보조 12/18sp를 로컬 `styleOverridesPreset`으로 적용해 기존 AppText preset이 위계를 뒤집지 않게 했다. 전역 typography는 변경하지 않았다.

빠른 이동은 가로 360dp 이상·fontScale 1.3 미만에서 2열이다. 그 외에는 1열로 전환하며 고정 행 높이·강제 글자 축소를 사용하지 않는다. 계절마다 메뉴 순서·크기·배치를 바꾸지 않는다.

## 4. 로컬 검증

| 검사 | 결과 | 경계 |
| --- | --- | --- |
| TypeScript | PASS | pinned Node 24.20.0, tsc noEmit |
| Targeted ESLint | 오류 0, 기존 경고 6 | 기존 모달의 no-shadow 경고, 새 파일 경고 0 |
| 대상 테스트 | 8 suites / 223 tests PASS | 메뉴·계정·복귀·역할·기존 모달 회귀 |
| 최종 표현/메뉴 테스트 | 2 suites / 30 tests PASS | 위 대상과 중복 포함, 숫자를 합산하지 않음 |
| Full suite | **193 suites / 1,975 tests PASS** | 전체 실행 정확히 1회, 실패 0 |
| 동작 소스 비교 | 46개 initializer AST 동일 | navigation·계정·모달 callback/컴포넌트; [결과](nuri-more-menu-redesign-2026-10-08-evidence/behavior-preservation.json) |
| Scope diff check | PASS | 기존 unrelated dirty 문제를 수정하지 않음 |

최초 targeted 실행에서는 새 테스트의 mock·기존 route 이름·폰트 기대값이 맞지 않아 실패했다. fixture를 실제 코드 계약에 맞게 정정하고 pinned runtime으로 다시 검증했다. 최초 실패 로그도 보존했다. Full suite 실패나 재실행은 없다.

360/384/430dp, fontScale 1.0/1.3/1.5, 두 앱 글꼴, 네 계절, dark theme, 긴 이름, 펫 0/1/여러 마리, 이미지 오류, guest·관리자 gate를 **컴포넌트 계약**으로 확인했다. 이를 native 픽셀 배치·TalkBack·오프라인 실기기 PASS로 확대하지 않는다. 신규 network request나 서버 계약은 추가하지 않았으며 remote 조회·DB 작업은 수행하지 않았다.

## 5. Release 설치 후보

| 항목 | 실제 결과 |
| --- | --- |
| Build | 증분 Release 1회, assembleRelease + bundleRelease, SUCCESS 3분 34초 |
| Install | install-r 1회, Success |
| APK | [nuri-more-menu-release.apk](/private/tmp/nuri-more-menu-redesign-20261008T125732/nuri-more-menu-release.apk) |
| APK SHA-256 | `520f38af66c815c6d1ca1f37165267b967796f17304ec23a4e35e450944076d3` |
| AAB | [nuri-more-menu-release.aab](/private/tmp/nuri-more-menu-redesign-20261008T125732/nuri-more-menu-release.aab), Store 제출 안 함 |
| AAB SHA-256 | `bde444000c18fe6d93fa9332dce2b50cc572101c7d5025316886f5e51b91cec8` |
| Identity | com.nuri.app, versionName 1.0, versionCode 1, debuggable false |
| 검증 | 설치 APK hash 일치, 승인 signer 일치, JS bundle 내장, Metro 의존 없음 |
| Device | 지정 Galaxy S24, 실제 SM-S937N / R5CY613NMSY, Android 16 |
| 화면 설정 | 1080×2340, density 450, 384dp, fontScale 1.0, THREE_BUTTON 유지 |
| UID / 최초 설치 | 10402 / 2026-06-02 19:16:57 유지 |
| 마지막 업데이트 | 2026-10-08 22:17:39 KST |

빌드 입력은 [후보 source fingerprint](/private/tmp/nuri-more-menu-redesign-20261008T125732/candidate-source.json)로 구별한다. base HEAD는 출발점이며 현재 미커밋 변경까지 포함한 QA 후보이지 clean Store RC가 아니다. 빌드 도중 및 설치 이후 runtime source 변경은 0이다. [빌드 결과](nuri-more-menu-redesign-2026-10-08-evidence/build-result.json), [설치 결과](nuri-more-menu-redesign-2026-10-08-evidence/install-result.json).

## 6. 보존과 미실행 경계

- 기준선 1,723개 파일과 기존 dirty를 검사했다. 허용한 2개 기존 source/test 파일과 문서 추가 블록 외 변경 0, 누락 0. 이전 문서 본문은 유지하며 새 판단만 상단에 추가했다.
- 이전 APK/AAB·signing·config, 기존 QA evidence·이미지·캐시를 보존했다. 삭제·cleanup·uninstall·clear data 없음.
- App 화면 실행·tap·swipe·키보드·설정 조작 0. 로그인·선택 펫 상태를 바꾸는 동작은 하지 않았다. 설치 후 화면상의 상태는 Codex가 별도로 검사하지 않았으며 runtime 데이터 전체 불변을 별도 DB 감사한 것으로 주장하지 않는다.
- 기존 키보드 승인과 정확한 12개 gate, GLOBAL_CTA 별도 시각 한계, Store HOLD는 유지한다. 전역 38경로 반복·native 변경·security audit 없음.
- Git HEAD/branch/index 유지. staged NONE, commit NO, push NO. 관련 project-memory 4개·release checklist·research index에 후보와 검증 경계를 반영했다.

## 7. 승인 전 PO 확인 안내 이력

승인 전 설치된 앱의 **전체메뉴**에서 다음 항목을 확인하도록 안내했다. PO 최종 승인 후 동일 항목의 반복 검증을 요청하지 않는다.

1. 상단 닉네임과 펫 관리가 구별되고, 빠른 이동 4개 및 아래 메뉴의 글자·간격이 적절한지.
2. 상단 설정 버튼이 앱 설정 그룹으로 이동하고, 닫기 버튼이 기존 화면으로 돌아가는지.
3. 전체일정 또는 약관에 들어갔다 돌아왔을 때 전체메뉴와 스크롤 복귀가 자연스러운지.
4. 가장 아래 계정 메뉴가 하단 내비게이션에 가리지 않는지.

PO 최종 승인을 기록하되 항목별 실기기 계측 결과를 새로 만들지 않았다. Codex native 화면 검증은 미실행이며 확대 글꼴·TalkBack 추가 실기기 검증은 별도 범위다.

## 8. 최종 상태

IMPLEMENTATION: FINAL_APPROVED

DESIGN_BASELINE: COMPLETE_FROZEN_BY_PO_APPROVAL

LOCAL_VALIDATION: PASS

BUILD_COUNT: 1

INSTALL_COUNT: 1

PO_DESIGN_APPROVAL: FINAL_APPROVED

CODEX_NATIVE_VISUAL_QA: NOT_RUN

DEVICE_OWNER: PO

CODEX_UI_CONTROL: NONE

COMMIT: NO

PUSH: NO

STORE: HOLD

AUTO_START_NEXT_WORK: NO

MASTER_STATE: STOPPED_WAITING_FOR_NEXT_PO_INSTRUCTION

다음 PO 지시를 기다립니다.
