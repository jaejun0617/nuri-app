# NURI Community Keyboard And Scroll Final Analysis

기준일: 2026-10-07 KST. 분석과 보고서 작성만 수행했다. 구현, 앱 검증, 기기 조작, DB 작업, 빌드, 설치, commit, push는 수행하지 않았다.

## 최종 판단

PO의 목표는 **키보드를 연 채 댓글 목록을 자유롭게 스크롤하고, 입력 영역으로 돌아와 작성하던 내용을 계속 입력하는 것**이다. 입력창이 화면 밖으로 이동하는 것과 입력창이 닫히거나 작성 상태가 사라지는 것은 서로 다르다.

누리의 현재 댓글 화면은 스크롤 시작 시 키보드를 닫도록 명시되어 있어 이 목표와 직접 충돌한다. 키보드의 움직임과 별도로 실행되는 최종 높이 적용, 지연 측정, 즉시 스크롤도 전환 중 점프를 만들 수 있는 구조다. 웹으로 재개발하거나 React Native를 교체할 필요는 없다.

마지막 참고 영상은 인라인 답글 폼에서도 이 동작이 가능함을 보여준다. 앞선 분석의 공통 하단 입력창 제안은 필수 해결 조건이 아니다. **이번 최종 권장안은 기존 하단 댓글과 인라인 답글 배치를 우선 보존하고, 스크롤 중 키보드 유지와 전환 동기화를 하나의 Community corrective로 해결하는 것이다.** 공통 하단 입력창으로의 디자인 변경은 이번 분석으로 승인된 것이 아니다.

## 분석 범위와 근거

실제 working tree의 코드, 설치된 라이브러리 구현, 사용자 제공 영상 5개, 기존 QA 보고서를 비교했다. 기준 HEAD는 `26891aaed1fbee37141ecbd89e4d4c18970b4a1d`, branch는 `codex/task6-community-content-policy`다. 미커밋 Community 후보를 포함한 기존 dirty 상태를 그대로 분석했다.

| 영상 | 길이 | 확인 목적 |
| --- | ---: | --- |
| 스무스하게.mp4 | 11.633초 | 브라우저 인증 입력과 키보드 보조 바 |
| 스무스2.mp4 | 7.300초 | 긴 상품 화면의 스크롤과 하단 구매 바 |
| 스무스3.mp4 | 36.033초 | 댓글과 인라인 답글 작성 중 스크롤 |
| 커뮤니티영상1.mp4 | 16.867초 | 누리 답글 전환과 입력 동작 |
| 커뮤니티영상2.mp4 | 10.867초 | 누리 하단 입력창과 키보드 열기 및 닫기 |

다섯 영상은 1080x2340, 30fps 녹화다. 녹화 프레임 수를 앱의 실제 렌더링 성능이나 60Hz 이상에서의 품질 측정으로 해석하지 않는다. 영상만으로 누리 APK의 정확한 버전, 웹 내부 DOM 구조, 개별 한글 조합 실패 원인을 확정하지 않는다.

원본은 `/Users/shinjaejun/Downloads`에 유지한다. [작은 근거 manifest](nuri-keyboard-scroll-analysis-2026-10-07-evidence/manifest.json)에 파일 식별 hash와 분석 경계를 기록했다. 인증 영상의 개인정보, 외부 댓글의 사용자 정보, 원본 영상과 화면 이미지는 repository에 복제하지 않았다.

## 마지막 영상에서 확인한 동작

`스무스3.mp4`는 주소 표시줄에 `m.dcinside.com`이 보이는 브라우저 댓글 화면이다. 아래 시점은 원본 시작 기준의 대략적인 구간이다.

| 구간 | 실제 관찰 | 누리의 목표 계약 |
| --- | --- | --- |
| 약 5~9초 | 키보드를 연 채 위아래로 스크롤한다. 입력 폼이 화면 밖으로 이동했다가 돌아오며 이후 입력이 이어진다. | 스크롤만으로 키보드와 작성 세션을 닫지 않는다. |
| 약 16~18초 | 선택한 댓글 아래 답글 폼에서 한글 입력이 이어진다. | 인라인 폼 자체는 문제가 아니며 초점과 조합을 안정적으로 유지해야 한다. |
| 약 29~32초 | 다른 답글 폼에 입력 초점을 준 뒤 키보드를 유지하면서 목록을 이동한다. | 입력 폼을 계속 화면 안으로 강제 복귀시키지 않는다. |
| 여러 등록 구간 | 등록 처리와 함께 키보드가 닫히는 장면도 있다. | 키보드를 절대 닫지 않는 정책이 아니라, 사용자의 단순 탐색 때문에 닫히지 않는 정책이다. |

참고 사이트의 광고, 버튼 모양, 폼 크기, 브라우저 툴바는 복제 대상이 아니다. 핵심은 스크롤과 입력 초점의 독립성이다. 브라우저 인증 화면의 자동완성 보조 바와 숫자 키패드 구성 차이도 누리의 오류로 분류하지 않는다.

## 확인된 코드 문제

### 스크롤이 키보드를 닫는다

[CommunityDetailScreen](../../src/screens/Community/CommunityDetailScreen.tsx)의 1502행은 `keyboardDismissMode="on-drag"`, 1505행은 `onScrollBeginDrag={Keyboard.dismiss}`다. 드래그를 시작하면 앱이 직접 키보드를 닫고 초점을 해제한다. 두 처리 모두 정리해야 하며 한쪽만 바꿔서는 목표를 만족하지 못한다.

`keyboardShouldPersistTaps="handled"`는 자식이 처리한 탭에 대한 정책이지 드래그 시 키보드 유지 설정이 아니다. 댓글 탐색 중 빈 영역 탭도 작성 세션을 유지하도록 scoped `always` 정책을 검토하고, 메뉴와 화면 이탈 등 명시적 닫기 경로는 유지한다. [React Native ScrollView 공식 계약](https://reactnative.dev/docs/scrollview#keyboarddismissmode), [탭 유지 계약](https://reactnative.dev/docs/scrollview#keyboardshouldpersisttaps)

### 키보드 전환과 화면 보정이 분리되어 있다

같은 화면 1483행의 기본 React Native `KeyboardAvoidingView`와 [useKeyboardInset](../../src/hooks/useKeyboardInset.ts)은 Android 표시 및 숨김 이벤트를 사용한다. 입력창의 하단 여백도 `keyboardInset > 0`에 따라 두 값 사이에서 바뀐다. 움직임의 진행률을 따라 변화하는 구조가 아니다.

640~724행의 인라인 보정은 초기 180ms, 재시도 160ms, 최대 4회, 표시 이벤트 뒤 50ms 대기를 사용한다. `measureInWindow`로 측정한 뒤 `scrollToOffset`을 `animated: false`로 실행한다. 사용자 스크롤과 분리된 사후 위치 보정이므로 순간 이동과 추가 재보정을 유발할 수 있다. `animated: true`로만 바꾸면 키보드와 서로 다른 애니메이션이 남아 근본 해결이 아니다.

누리 영상 2의 약 3~4초 구간에서는 입력창이 최종 위치 쪽으로 먼저 이동하고 키보드가 뒤따라 올라오며 일시적인 큰 공백이 보인다. 닫히는 과정에도 움직임이 분리된다. **영상의 현상과 현재 코드의 비동기 보정 구조는 일치하지만, 개별 프레임에서 어느 이벤트가 먼저 발생했는지는 기기 trace로 확정해야 한다.** [React Native Keyboard 공식 계약](https://reactnative.dev/docs/keyboard), [Android 동기화 방식](https://developer.android.com/develop/ui/views/layout/sw-keyboard)

### 입력창 위치 전환과 초점 요청이 겹친다

1360행은 답글 입력창을 댓글 행 안에 렌더링하고, 1538행은 일반 댓글 입력창을 목록 밖 하단에 렌더링한다. [CommentThreadItem](../../src/screens/Community/components/CommentThreadItem.tsx) 274행과 [ReplyCommentItem](../../src/screens/Community/components/ReplyCommentItem.tsx)의 조건부 삽입 때문에 대상 변경 시 실제 입력 노드의 위치와 생명주기가 바뀐다.

`autoFocus`, 수동 `focus()`, `onFocus`에서의 reveal이 겹친다. draft 문자열 보존은 native 초점, 커서 선택, 진행 중인 한글 조합까지 보존한다는 뜻이 아니다. 노드 교체와 요청 순서의 경쟁은 확인된 위험이며, 영상의 모든 입력 실패가 이 원인이라고 단정하지 않는다.

화면 밖으로 이동했다고 반드시 입력 노드가 제거되는 것도 아니다. 설치된 React Native의 `VirtualizedList`에는 마지막 초점 셀 주변을 유지하는 render region 처리가 있다. 현재 `removeClippedSubviews={false}`도 유지되어 있다. 인라인 입력이 실제로 focus capture를 유지하는지와 대상 전환 시 native tag가 달라지는지를 측정해야 한다. 모든 행을 무조건 렌더링하는 우회는 사용하지 않는다.

### 입력 중 댓글 목록도 다시 렌더링될 수 있다

draft 변경마다 인라인 composer element가 새로 만들어지고 모든 thread에 prop으로 전달된다. `renderCommentThread`도 해당 element에 의존한다. `memo`된 행에도 새로운 prop이 전달되는 구조라 입력 중 불필요한 렌더링을 줄일 여지가 있다. 실제 프레임 저하의 비중은 profiler 미실행 상태이므로 확정하지 않는다.

## 전역 코드에서 확인한 경계

| 영역 | 현재 처리 | 판단 |
| --- | --- | --- |
| App root | Keyboard Controller Provider | Provider만으로 모든 화면의 회피와 초점 정책이 통일되지는 않는다. |
| 로그인과 회원가입 | 기존 `react-native-keyboard-aware-scroll-view` | 후속 정합성 검토 대상이다. Auth 동결 범위는 이번에 수정하지 않는다. |
| 기록 작성과 수정, Community 작성과 수정 | Keyboard Controller ScrollView | 공통 엔진을 사용하는 범위다. 기록 수정의 표시 여부 기반 여백 변경은 전환 품질 검토 대상이다. |
| 댓글 상세 | 기본 KAV와 표시 이벤트, 수동 인라인 보정 | 이번 목표와 직접 충돌하는 우선 corrective 대상이다. |
| 일정과 체중, 날짜 등 모달 | Controller KAV와 bounded scroll, 진행률 기반 gap | 화면 유형별 역할을 유지한다. 모든 모달이 잘못됐다고 판정하지 않는다. |
| 시스템 바 | MainActivity와 Controller native inset 설정 | 설정 주체와 실행 순서를 기기에서 확인해야 한다. |
| 커스텀 하단 탭 | hide-on-keyboard 옵션과 별도 toolbar | 기본 탭바의 숨김 로직을 그대로 사용하지 않아 별도 처리가 필요하다. |

[MainActivity](../../android/app/src/main/java/com/nuri/MainActivity.kt) 46행의 `setDecorFitsSystemWindows(true)`와 설치된 Controller의 `EdgeToEdgeReactViewGroup.kt` 142행 이후 `false` 설정은 서로 다른 정책이다. Activity는 시작, 복귀, 초점 회복 시 흰색 navigation bar와 밝은 바 아이콘 정책도 재적용한다. 실제 충돌 시점과 영상의 색상 변화 기여도는 아직 미확인이다. `adjustResize` 자체를 오류로 판정하거나 검증 없이 `adjustNothing`으로 바꾸지 않는다.

[AppTabsNavigator](../../src/navigation/AppTabsNavigator.tsx)의 `tabBarHideOnKeyboard`는 커스텀 `CustomTabBar`에 구현되지 않았고 [AppNavigationToolbar](../../src/components/navigation/AppNavigationToolbar.tsx)에도 키보드 숨김 로직이 없다. CommunityDetail은 Root Stack 화면이므로 이 문제를 이번 댓글 영상의 직접 원인으로 혼동하지 않는다.

## 최소 corrective 권장안

**첫 구현 단위는 Community 댓글과 답글의 keyboard 및 scroll 계약 보완이다. 기존 디자인, 데이터, 서버 제한은 유지한다.**

1. 드래그 시 두 키보드 닫기 처리를 제거한다. 댓글 목록의 터치 유지 정책을 명시하고 사용자 스크롤을 우선한다.
2. 현재 기본 KAV를 기존 Keyboard Controller의 진행률 기반 회피로 교체한다. 실제 화면 위치에 맞춘 offset을 검증하고, 키보드 높이를 다른 padding에 다시 더하지 않는다. KAV와 StickyView를 동일 영역에 중복 적용하지 않는다. [Controller KAV 공식 문서](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-avoiding-view)
3. 인라인 폼을 유지하되 focus 요청과 최초 노출을 한 경로에서 관리한다. 일정 시간 뒤 보정하는 반복 타이머를 없애고 실제 layout 및 키보드 진행 이벤트를 기준으로 가려진 만큼만 노출한다. 사용자가 드래그를 시작하면 진행 중인 자동 reveal을 중단해 입력창으로 되끌어오지 않는다.
4. 같은 대상에 작성하는 동안 입력 노드를 재생성하지 않는다. 초점 셀의 offscreen 보존, selection, 한글 조합, 대상 전환 프로토콜을 검증한다. 인라인 editor의 state와 props를 분리해 무관한 댓글 행의 재렌더링을 줄인다.
5. 성공 전송, 답글 작성 취소, Android 뒤로가기, 메뉴와 신고 진입 등 명시적 전환의 닫기 정책을 각각 유지하거나 명시한다. 실패 시 draft, 중복 요청 잠금, 재시도, rate limit과 moderation 계약은 보존한다.

Community 보완 후에만 전역 native inset 정책을 확인하고, 충돌이 입증된 최소 설정을 별도 승인 범위로 정리한다. 이후 작성 폼, 모달, 하단 입력창의 세 유형에 같은 원칙을 적용한다. 전역 엔진 변경과 Auth 재작업을 Community 수정에 끼워 넣지 않는다.

## 실기기 완료 기준

아래는 후속 구현의 검증 조건이며 이번 턴의 PASS 결과가 아니다.

| 시나리오 | 합격 조건 |
| --- | --- |
| 댓글 입력 후 키보드를 연 채 상하 드래그와 fling | 키보드가 닫히지 않고 스크롤된다. draft와 답글 대상이 유지된다. |
| 인라인 폼을 화면 밖으로 이동한 뒤 복귀 | 입력 노드와 초점이 불필요하게 해제되지 않으며 이어서 입력할 수 있다. |
| 키보드 열기와 닫기 전체 영상 | 중간의 큰 공백, 이중 이동, 마지막 순간의 추가 점프가 없다. |
| 사용자가 스크롤하는 중 자동 reveal | 목록을 입력창으로 강제 복귀시키지 않는다. |
| 처음 연 답글과 답글 대상 변경 | 입력창이 누락되지 않고 최초 입력, selection, 한글 조합이 안정적이다. |
| 여러 줄, 이모지, 붙여넣기, 커서 이동 | 입력 내용이 유지되고 필요한 경우에만 caret을 노출한다. |
| 성공 전송과 제한 오류 | 성공과 실패의 draft 정책, 동기 중복 요청 방어, 실제 서버 제한이 유지된다. |
| Android 뒤로가기, 메뉴, 신고, 화면 이탈 | 각 명시적 닫기와 복귀 계약이 정상이고 draft가 의도 없이 유실되지 않는다. |
| 시스템 바와 앱 네비게이션 | 가림, 터치 차단, 색상 번쩍임, 중복 inset이 없다. |

검증은 당시 APK hash와 실제 기기 model을 함께 기록해야 한다. 기본 기기 설정에서 먼저 확인하고 폭, 확대 글꼴, 다른 키보드와 시스템 내비게이션 방식 변경은 별도 승인 후 수행한다. 30fps 화면 녹화만으로 60Hz 이상의 성능 PASS를 선언하지 않는다. 초점 native tag, blur 이유, IME top과 progress, viewport와 scroll offset을 민감한 입력 내용 없이 기록해 원인과 결과를 연결한다.

## 이전 QA와 이번 결과의 구분

[이전 corrective 보고서](nuri-community-search-comment-corrective-2026-10-07.md)의 댓글 등록, 제한 오류 후 draft 유지, 정지 상태의 입력창 가림 해소, fresh mount 입력창 표시 결과는 당시 bounded QA다. 새 영상에서 요구하는 **키보드 유지 스크롤과 전체 전환 동기화**까지 PASS였다는 의미가 아니다.

기존 테스트는 keyboard inset을 0으로 mock하고 component prop과 제출 상태를 확인한다. native 입력 조합과 키보드 애니메이션의 프레임별 이동을 검증하지 않는다. 후속 구현에서는 gesture 계약, focus 및 draft 보존 회귀 테스트와 실제 기기의 전환 영상을 함께 확보해야 한다.

## 이번 작업 상태

- 문서: 이 보고서, 작은 manifest, 현재 상태와 최근 로그의 새 분석 블록만 반영했다. 기존 QA 원문과 dirty 내용은 보존했다.
- 소스와 테스트 코드: 수정 0. 기존 tracked source diff fingerprint, HEAD와 branch 전후 동일, staged NONE을 확인했다. 원본 영상 5개의 SHA-256도 동일하다.
- 문서 검증: Markdown 정적 구조, 내부 링크 41개, manifest JSON parse, `git diff --check` PASS. 앱 테스트나 렌더링 성능 검증 결과가 아니다.
- 앱 TypeScript, ESLint, Jest, build: 미실행. 앱 코드를 변경하지 않았으므로 기존 결과를 새 PASS로 승격하지 않는다.
- 실기기 QA와 설치: 미실행. 사용자 제공 영상 분석은 새 APK의 직접 검증을 대신하지 않는다.
- DB, Supabase, QA 데이터: 작업 없음. 기존 댓글, QA100, 사진, 기록 보존.
- Cleanup, commit, push, staging: 없음. STORE HOLD.
- 현재 상태: ANALYSIS_COMPLETE. IMPLEMENTATION_NOT_STARTED. 다음 한 작업은 PO의 Community keyboard 및 scroll corrective 범위 승인이다.

PO 승인을 기다립니다.
