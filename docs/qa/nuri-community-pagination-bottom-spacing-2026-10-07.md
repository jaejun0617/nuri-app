# NURI COMMUNITY PAGINATION BOTTOM SPACING REPORT

작성일: 2026-10-07 KST. 커뮤니티 하단 여백 corrective와 PO 추가 지시인 타임라인 등록 FAB 정렬만 수행한 설치 후보다. PO 시각 승인 전이며 Store RC가 아니다.

Evidence root: `/private/tmp/nuri-community-pagination-bottom-spacing-20261007-025705`.

## 1. 원인

- ACTUAL_CAUSE: 목록 `paddingBottom`이 작성 버튼만 있을 때 72dp, 맨 위로 버튼도 있을 때 128dp로 증가했다. 이 여백이 pagination footer 뒤에 남아 화면 끝에서 큰 공백을 만들었다.
- DUPLICATED_BOTTOM_INSET: NO. 화면 root는 측정된 toolbar 높이를 이미 한 번 확보하고 있었다. 원인은 Safe Area 중복이 아니라 FAB column 높이를 content 뒤에 예약한 구조다.
- REMOVED_SPACER: 동적 72/128dp padding 제거, 고정 footer `minHeight: 56` 제거. 별도 footerSpacer 또는 음수 margin은 사용하지 않았다.
- BOTTOM_SPACING_OWNER: 추가 하단 시각 여백은 `styles.listContent.paddingBottom: 12` 한 곳에서 소유한다. 기존 footer 내부 paddingBottom 4dp를 포함하면 버튼 끝부터 toolbar 시작까지 설계상 16dp다.

## 2. 최종 간격

- LAST_POST_TO_PAGINATION: 설계 12dp = marginTop 8 + paddingTop 4. native 실제 버튼 터치 영역 기준 약 12.33~12.44dp.
- PAGINATION_TO_BOTTOM_NAV: 설계 16dp. native 실제 약 15.64~16.00dp.
- CONTENT_BOTTOM_PADDING: 12dp, 버튼 표시 여부에 따라 증가하지 않는다.
- SAFE_AREA_OWNERSHIP: 기존 `AppNavigationToolbar`가 bottom inset을 포함하고 `ToolbarHeightContext`가 전체 측정 높이를 제공한다. 목록은 별도 bottom inset을 더하지 않는다.
- BOTTOM_NAV_OWNERSHIP: toolbar는 absolute overlay다. Community root가 측정 높이를 한 번 확보하고 목록 viewport는 그 위를 사용한다. toolbar 자체는 변경하지 않았다.

게시글 1건 이상은 마지막 행 다음의 `ListFooterComponent`로 이어진다. sticky/absolute pagination, marginTop auto, space-between, 큰 minHeight 또는 FAB 높이 기반 spacer를 사용하지 않는다. 0건일 때만 empty-result cell의 flexGrow가 남은 공간을 사용해 footer를 하단에 배치한다.

| Native 상태 | 마지막 행 → 버튼 | 버튼 → 하단 메뉴 |
| --- | ---: | ---: |
| 기본 폭 1페이지 30건 | 12.44dp | 15.64dp |
| 기본 폭 2페이지 30건 | 12.44dp | 16.00dp |
| 기본 폭 3페이지 30건 | 12.44dp | 16.00dp |
| 기본 폭 마지막 4페이지 13건 | 12.44dp | 15.64dp |
| 질문 필터 25건 | 12.44dp | 16.00dp |
| 인기글 0건 | 해당 없음 | 15.64dp |
| 360dp / fontScale 1.5 | 12.33dp | 16.00dp |
| 384dp / fontScale 1.3 | 12.44dp | 16.00dp |
| 약 430dp / fontScale 1.0 | 12.34dp | 15.92dp |

하단 메뉴 간격은 tab label의 위쪽이 아니라 실제 native toolbar 외곽 시작점으로 측정했다. 첫 증적 계산은 Android accessibility dump의 평탄화된 wrapper를 부모 트리로 해석해 잘못된 0 좌표를 얻었다. 원본 실패 결과를 `native-validation-first.json`으로 보존하고 실제 5개 tab 영역을 포함하는 가장 좁은 외곽 rectangle으로 측정 보완한 최종 결과가 위 표다. 앱 코드나 설치를 반복하지 않았다.

## 3. FAB

- FAB_LAYOUT_RESERVATION_REMOVED: YES.
- FAB_OVERLAP: pagination 및 Bottom Navigation과 NONE.
- SCROLL_TOP_OVERLAP: pagination 및 Bottom Navigation과 NONE.
- FAB_VISUAL_DELTA: Community 0. 크기 48dp, 계절 Primary, 흰색 plus 24dp 유지.
- FAB_FUNCTION_DELTA: Community 0. 작성 권한·로그인 확인·navigation callback 유지.

Community overlay bottom offset은 `측정 pagination 높이 + content bottom 12 + 시각 간격 12`다. footer가 글꼴에 따라 커져도 overlay만 따라 이동하며 content 높이는 늘리지 않는다. 맨 위로 버튼의 44dp 원형·크기·기능과 직전 잔상 보완도 보존했다.

PO 추가 지시인 Timeline FAB는 50dp·16dp semantic plus·그림자에서 Community와 같은 48dp 원형·24dp 원래 Feather plus·명시적 흰색 `#FFFFFF`·그림자 없음으로 변경했다. 기존 seasonal `primary` role, 접근성 이름 `기록하기`, `onPressCreate`는 유지했다. 기존 74/82dp 추정 offset 대신 실제 toolbar 높이 + 12dp, 우측 16dp + 수평 inset을 사용한다. native에서 두 FAB의 크기·우측 정렬 MATCH, Timeline의 메뉴 위 간격 12.09dp를 확인했다.

우측 overlay는 게시글 행 오른쪽 일부를 가릴 수 있는 기존 특성을 유지한다. 행 중앙의 터치 영역과 enabled/clickable 상태는 정상이며 pagination/nav 터치는 침범하지 않는다. 조회수 보존을 위해 실제 마지막 게시글 상세 열기와 등록 버튼 실행은 하지 않았다.

## 4. Pagination

- PREVIOUS_NEXT_STYLE: PRESERVED. 13sp / lineHeight 18 / weight 600, paddingHorizontal 14dp, content width, 최소 44dp 터치, 무배경 중앙 숫자 유지.
- PAGE_LOGIC_DELTA: 0.
- PAGE_SIZE_DELTA: 0. 30개 유지.
- FILTER_DELTA: 0.
- SORT_DELTA: 0.

조회 service/store/커서/페이지 계산·이동 callback은 변경하지 않았다. 카테고리별 고유 색, 게시글 행, Hero와 원본 4장, 하단 메뉴, Auth/Weather/API도 이번 baseline 그대로 보존했다.

## 5. State Validation

- FULL_PAGE: PASS. 1→2→3→4 순서 확인.
- LAST_SHORT_PAGE: PASS. 4페이지 13건.
- FILTERED_SHORT_LIST: PASS. 질문 25건, 1페이지로 보정되고 양쪽 disabled.
- EMPTY_RESULT: PASS. 인기글 0건, 하단 footer·양쪽 disabled.
- FIRST_PAGE_DISABLED: PASS. 이전 disabled.
- LAST_PAGE_DISABLED: PASS. 다음 disabled.

4→3 이전 복귀와 3→4 다음 이동도 확인했다. 각 페이지 시작 sequence 001/031/061/091, 목록 시작에서 footer 미표시, 끝에서만 footer 노출을 확인했다. 1~2건짜리 공개 결과는 현재 QA 데이터에 없어 native로 별도 생성하지 않았으며 1건/0건 footer 구조는 테스트로 검증했다.

## 6. Responsive

- 360DP: PASS. density 480 / fontScale 1.5.
- GALAXY_S24: PASS. 기본 384dp / density 450 / fontScale 1.0.
- 430DP: PASS. density 402로 약 429.85dp / fontScale 1.0.
- FONT_SCALE_1_3: PASS. 384dp 대표 조합.
- FONT_SCALE_1_5: PASS. 360dp 대표 조합.
- CLIPPING: pagination 문구 잘림 NONE. 게시글의 기존 한 줄 말줄임은 유지한다.
- OVERLAP: pagination·FAB column·Bottom Navigation 상호 겹침 NONE.

터치는 최소 44dp 계약을 유지한다. 450dpi에서 native 정수 pixel 반올림으로 123~124px, 360dp에서는 132px다. 작은 소수점 차이를 임의 크기 축소로 판정하지 않았다. 실제 문구가 버튼 안에 들어가고 숫자 중앙 정렬·버튼 분리·행 중앙 touch clearance를 확인했다. 하단 탭을 통해 Timeline과 Community 왕복이 정상 동작했다.

대표 조합 검증이며 모든 폭×글꼴 조합, 다른 Android 기기와 iOS 전체 검증은 아니다. 360dp/fontScale 1.5에서 기존 하단 메뉴 라벨은 밀집해 보이는 관찰이 있다. 변경 금지인 Bottom Navigation은 보존했고 이번 pagination 잘림/침범과 구분했다.

화면 설정은 450dpi/fontScale 1.0으로 복구했고 전체/전체/30개/1페이지로 되돌렸다.

## 7. Preservation

- QA_POSTS_100: PRESERVED. `community-pagination-qa-20261007-015104` 100행, sequence 001~100, 질문/정보/일상/자유 각 25건.
- EXISTING_POSTS: PRESERVED. 전체 884 / 공개 active 103 유지.
- DB_MUTATION: NONE. linked `grmekesqoydylqmyvfke`의 읽기 전용 감사만 수행.
- COMMUNITY_FUNCTION: PRESERVED.
- BOTTOM_NAV: PRESERVED.

native QA 전후 QA 100행 전체 row hash `9d00368aca450b2dfb5bedd0763f7ee8`, 기존 784행 hash, Auth/Profile/Pet/Record/Schedule/Storage 등을 포함한 22개 보호 영역의 count/hash가 모두 동일했다. posts RLS 4개·trigger 6개·핵심 함수 4개 정의도 일치한다. 댓글·좋아요·신고·조회수·QA 데이터·Storage mutation은 없다. 정확한 QA ID manifest와 cleanup preview는 기존 증적에 보존하고 실행하지 않았다.

## 8. Validation

- TYPESCRIPT: PASS.
- ESLINT: 0 errors / 2 existing warnings / 0 new issues. Timeline의 기존 `no-shadow` 경고 2개는 변경 전 HEAD와 이름·규칙·내용을 대조했다.
- TARGETED_TEST: PASS. 13 suites / 313 tests.
- GIT_DIFF_CHECK: PASS.
- INCREMENTAL_RELEASE: PASS. 1회, 240.177초, 995 tasks 중 61 executed / 934 up-to-date. clean/Metro/Fast Refresh 없음.
- GALAXY_S24_INSTALL: PASS. install-r 1회, 15.395초. UID·최초 설치 시각·설정·설치 APK hash MATCH.
- FATAL: 0.
- ANR: 0.
- RN_FATAL: 0.

로그는 이번 UI QA 시간대만 검사했으며 raw token/GPS/user log를 저장하지 않았다. 전체 suite는 이 제한된 corrective에서 재실행하지 않았고 기존 결과를 새 실행처럼 보고하지 않는다. footer 여백 단일 소유권·빈 결과 stretch·동적 overlay 측정·잘못된 layout 값 방어·disabled·CTA/toolbar·Community 읽기/쓰기 정책·Timeline entry/query/visual 회귀 테스트를 통과했다.

APK: `/private/tmp/nuri-community-pagination-bottom-spacing-20261007-025705/nuri-community-seasonal-qa-ac824581.apk`.

SHA256: `ac824581ff47d9fffe2ad1dab608d5a88417358f57020c4b43f3a7e7bff97d82`.

실제 build source/input fingerprint와 installed candidate MATCH. 원본 Hero 4장 decoded pixel MATCH.

필수 캡처: [마지막 행과 하단 메뉴](/private/tmp/nuri-community-pagination-bottom-spacing-20261007-025705/walk-page-1-end.png), [마지막 페이지 13건](/private/tmp/nuri-community-pagination-bottom-spacing-20261007-025705/walk-page-4-end.png), [0건 결과](/private/tmp/nuri-community-pagination-bottom-spacing-20261007-025705/empty-popular.png). 추가 지시: [Timeline 등록 버튼](/private/tmp/nuri-community-pagination-bottom-spacing-20261007-025705/timeline-create.png).

## 9. Git

- HEAD: `aab0517e417d6dbc985d4e49af0942d34ae9b224`, 시작/현재 동일.
- BRANCH: `codex/task6-community-content-policy`.
- STAGED: NONE.
- COMMIT: NO.
- PUSH: NO.
- UNRELATED_DIRTY: PRESERVED.

runtime 수정은 Community 화면/스타일, Timeline 화면/스타일 4파일, 테스트 2파일로 제한한다. 관련 project-memory 4개·release-checklist·리서치에는 새 판단 블록만 추가하고 이전 body와 보고서는 유지한다. 기존 빌드 출력 4곳·Gradle cache·QA 증적·과거 APK 10개·이번 APK를 유지한다. cleanup은 하지 않았다.

## 10. Final State

- PAGINATION_BOTTOM_SPACING: CORRECTED_PENDING_PO_APPROVAL.
- LAST_POST_PAGINATION_PROXIMITY: PASS.
- BOTTOM_NAV_PROXIMITY: PASS.
- TIMELINE_CREATE_FAB: MATCHED_COMMUNITY_PENDING_PO_APPROVAL.
- QA_POSTS: PRESERVED.
- AUTH: COMPLETE_FROZEN.
- WEATHER: COMPLETE_FROZEN.
- STORE: HOLD.
- AUTO_START_NEXT_WORK: NO.
- MASTER_STATE: STOPPED_WAITING_FOR_PO_COMMUNITY_PAGINATION_REVIEW.

다음 1개는 PO의 현재 설치 후보 시각 검토다. 추가 변경·QA 삭제·commit/push·Store·cleanup을 자동 시작하지 않는다.

PO 승인을 기다립니다.
