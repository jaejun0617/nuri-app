# NURI 앱 전역 키보드 입력 경로 감사

커뮤니티만 보완해서는 앱 전체 키보드 품질을 닫을 수 없다. 모든 입력 경로를 먼저 등록하고 같은 실기기 기준으로 확인한 뒤, 공통 원인과 화면별 원인을 나눠 최소 수정해야 한다. 이 보고서는 정적 목록과 교차 검토 결과이며 전역 실기기 QA 완료 보고서가 아니다.

## 1. 범위와 기준

- 기준일: 2026-10-07 KST.
- HEAD: `26891aaed1fbee37141ecbd89e4d4c18970b4a1d`.
- Branch: `codex/task6-community-content-policy`. HEAD보다 현재 dirty source가 이번 코드 판단 기준이며 기존 변경을 보존했다.
- 필수 engineering 문서 3개, project-memory 현재 상태·결정·우선순위·로그, Master Routing Policy, [직전 영상 분석](nuri-keyboard-scroll-analysis-2026-10-07.md)과 [최근 후보 QA](nuri-community-search-comment-corrective-2026-10-07.md)를 기준으로 한다.
- Primary: NURI-00 조사 통합. Supporting: NURI-11 입력 경로 교차 검토, NURI-12 Android/inset 검토. 두 룸 모두 WRITE_LOCKED 읽기 전용으로 완료했다.
- SOURCE_EDIT, TEST, BUILD, INSTALL, ADB, DEVICE_QA, DB_MUTATION, CLEANUP, STAGING, COMMIT, PUSH: 이번 조사 각각 0.
- 별도 `nuri-web`, `admin-console` 브라우저 도구, 외부 OAuth 브라우저의 웹 입력은 native 앱 소유 입력 수에 합산하지 않는다. 앱 안에서 이 외부 화면으로 나갔다가 돌아오는 키보드/포커스 복귀는 후속 QA 대상이다.

## 2. 정적 범위와 누락 방지

TypeScript AST로 `src`의 TS/TSX 450개와 `App.tsx`를 검사했다. RN TextInput, AppTextInput, styled 입력의 실제 별칭, 공통 입력 래퍼의 호출부를 구분하고 route/consumer 검색 및 독립 교차 검토를 수행했다.

| 항목 | 결과 | 의미 |
| --- | ---: | --- |
| 검사 파일 | 451 | 실제 파일 내용을 파싱한 정적 범위 |
| 입력 선언을 가진 파일 | 33 | 공통 구현·미사용 코드·개발 화면 포함 |
| AppTextInput 소비 선언 | 61 | 래퍼 내부 선언은 여러 필드에 재사용될 수 있음 |
| raw TextInput 소비 선언 | 7 | Community 검색·편집·댓글/신고 및 Weather 작성 |
| AppTextInput 내부 native 구현 | 1 | 별도 사용자 화면이 아님 |
| styled 입력 소비 선언 | 4 | DevTest의 S.Input |
| 입력 선언 합계 | 73 | 독립 화면 수나 런타임 입력창 수가 아님 |
| 추가 입력 래퍼 호출부 | 30 | Field 17, AuthField 2, InputField 3, PasswordField 3, MultiInputSection 4, NicknameInputSection 1; 73에 단순 가산하지 않음 |
| 검증 항목 | 38 | 화면·모달·댓글/답글·공통 입력 및 비활성 후보를 분리한 계약 목록 |
| 이번 전역 실기기 실행 | 0 | 아래 모든 항목의 DEVICE 상태는 NOT_RUN_THIS_TURN |

`React.createElement` 입력, 앱 내부 WebView/contentEditable, 별도 외부 editable 위젯, first-party Android/iOS native EditText/UITextField는 이번 소스에서 미발견이다. TimePickerModal은 wheel 선택이고 RegistrationFontField는 폰트 선택 버튼이므로 키보드 입력으로 잘못 집계하지 않았다.

[입력 선언·wrapper·container와 38개 상태 원장](nuri-global-keyboard-audit-2026-10-07-evidence/inventory.json), [교차 검토 원문과 통합 판단](nuri-global-keyboard-audit-2026-10-07-evidence/peer-reviews.json)을 보존한다. 정적 목록이 있다고 물리 입력 경로가 전부 PASS인 것은 아니다. 관리자 gate, recovery 세션, 개발 전용 및 잔존 코드는 미확인을 그대로 남긴다.

## 3. 전체 입력 검증 목록

모든 행의 이번 실기기 상태는 **NOT_RUN**이다. 연결 확인은 route 등록 또는 소비 컴포넌트 확인일 뿐, 현재 계정에서 접근 가능한지까지 확인한 결과가 아니다. 같은 공통 모달도 각 parent의 header·Safe Area·기존 키보드 조건이 다르므로 호출자별로 검증한다.

| ID | 영역 | 코드 | 필수 분기·입력 | 현재 처리 | 연결 |
| --- | --- | --- | --- | --- | --- |
| K01 | 로그인 | [SignInScreen.tsx](../../src/screens/Auth/SignInScreen.tsx#L871) | 이메일·비밀번호, 계절 login 및 일반 branch | legacy aware | 연결 확인 |
| K02 | 회원가입 | [SignUpScreen.tsx](../../src/screens/Auth/SignUpScreen.tsx#L796) | 이메일·비밀번호·확인, 계절/일반 branch | legacy aware 또는 core KAV | 연결 확인 |
| K03 | 비밀번호 재설정 요청 | [PasswordResetRequestScreen.tsx](../../src/screens/Auth/PasswordResetRequestScreen.tsx#L124) | 이메일 | core KAV Android undefined | 연결 확인 |
| K04 | 비밀번호 재설정 | [PasswordResetFormScreen.tsx](../../src/screens/Auth/PasswordResetFormScreen.tsx#L175) | 새 비밀번호·확인; recovery session gate | core KAV Android undefined | 연결 확인 |
| K05 | 온보딩 닉네임 | [NicknameSetupScreen.tsx](../../src/screens/Auth/NicknameSetupScreen.tsx#L180) | 닉네임·Sticky CTA | controller aware + Sticky | 연결 확인 |
| K06 | 홈 일정 시트 | [ScheduleCalendarSheet.tsx](../../src/components/home/ScheduleCalendarSheet.tsx#L529) | 추가/수정 제목·알림 숫자·메모; 목록/편집 mode | controller KAV + bounded scroll | 연결 확인 |
| K07 | 펫 등록 | [PetCreateScreen.tsx](../../src/screens/Pets/PetCreateScreen.tsx#L655) | 1/2단계, 추모/생존, 날짜·이름·종 상세·몸무게·활동·좋아함·싫어함·태그 | controller aware + Sticky | 연결 확인 |
| K08 | 펫 프로필 수정 | [PetProfileEditScreen.tsx](../../src/screens/Pets/PetProfileEditScreen.tsx#L999) | 추모/생존, 날짜·이름·종 상세·활동·좋아함·싫어함·태그 | controller aware + Sticky | 연결 확인 |
| K09 | 몸무게 기록 시트 | [WeightLogEntrySheet.tsx](../../src/components/health/WeightLogEntrySheet.tsx#L315) | 몸무게 decimal·메모·날짜 자식 modal | controller KAV + bounded scroll | 연결 확인 |
| K10 | 펫 삭제 확인 | [PetDeleteConfirmDialog.tsx](../../src/components/pets/PetDeleteConfirmDialog.tsx#L256) | 확인 문구 입력만; 삭제 실행 금지 | controller KAV + bounded scroll | 연결 확인 |
| K11 | 공통 날짜 입력 모달 | [DatePickerModal.tsx](../../src/components/date-picker/DatePickerModal.tsx#L692) | 직접 날짜·선택적 시간/분; 각 caller의 inset·기존 keyboard 전환 확인 | controller KAV + animated gap | 연결 확인 |
| K12 | 기록 작성 | [RecordCreateScreen.tsx](../../src/screens/Records/RecordCreateScreen.tsx#L1476) | 제목·본문·비용·산책 분·건강 몸무게; 카테고리/returnTo별 조건 | controller aware | 연결 확인 |
| K13 | 기록 수정 | [RecordEditScreen.tsx](../../src/screens/Records/RecordEditScreen.tsx#L884) | 제목·본문·비용·태그; 기존 사진/카테고리 조건 | controller aware + DidShow boolean padding | 연결 확인 |
| K14 | 기록 태그 모달 | [RecordTagModal.tsx](../../src/screens/Records/components/RecordTagModal.tsx#L119) | 태그 입력·추가·재입력; parent keyboard → modal → 복귀 | controller KAV + animated gap | 연결 확인 |
| K15 | 날씨 활동 기록 | [WeatherActivityRecordScreen.tsx](../../src/screens/Weather/WeatherActivityRecordScreen.tsx#L398) | 제목·메모; 태그 모달 | controller aware | 연결 확인 |
| K16 | 일정 검색 | [ScheduleListScreen.tsx](../../src/screens/Schedules/ScheduleListScreen.tsx#L255) | 검색 → 결과 스크롤 → 검색 복귀 | SectionList handled / on-drag | 연결 확인 |
| K17 | 일정 생성 | [ScheduleCreateScreen.tsx](../../src/screens/Schedules/ScheduleCreateScreen.tsx#L253) | 제목·알림 숫자·메모·날짜 모달 | controller aware | 연결 확인 |
| K18 | 일정 수정 | [ScheduleEditScreen.tsx](../../src/screens/Schedules/ScheduleEditScreen.tsx#L564) | 제목·알림 숫자·메모·날짜 모달 | controller aware | 연결 확인 |
| K19 | 커뮤니티 검색 | [CommunityListScreen.tsx](../../src/screens/Community/CommunityListScreen.tsx#L541) | 검색 열기/닫기·입력·결과·필터·페이지, 두 navigation container | FlatList handled / on-drag | 연결 확인 |
| K20 | 커뮤니티 작성 | [CommunityCreateScreen.tsx](../../src/screens/Community/CommunityCreateScreen.tsx#L407) | shared editor 제목·본문, validation·draft·종료 확인 | controller aware | 연결 확인 |
| K21 | 커뮤니티 수정 | [CommunityEditScreen.tsx](../../src/screens/Community/CommunityEditScreen.tsx#L354) | shared editor 제목·본문, validation·draft·종료 확인 | controller aware | 연결 확인 |
| K22 | 커뮤니티 댓글 | [CommunityDetailScreen.tsx](../../src/screens/Community/CommunityDetailScreen.tsx#L1291) | root composer · 긴 본문·한국어 조합·list scroll·오류 draft | core KAV + DidShow inset + explicit drag dismiss | 연결 확인 |
| K23 | 커뮤니티 답글 | [CommunityDetailScreen.tsx](../../src/screens/Community/CommunityDetailScreen.tsx#L1360) | root/child reply·타깃 교체·접기/펼치기·viewport 밖 왕복·댓글 복귀 | same KAV + delayed reveal + conditional input mount | 연결 확인 |
| K24 | 커뮤니티 신고 | [CommunityDetailScreen.tsx](../../src/screens/Community/CommunityDetailScreen.tsx#L1872) | 선택 사유·기타 텍스트; parent keyboard/modal 전환; 신고 제출 금지 | controller KAV + animated gap | 연결 확인 |
| K25 | 편지함 | [GuestbookScreen.tsx](../../src/screens/Guestbook/GuestbookScreen.tsx#L262) | selected pet multiline 편지·긴 입력·목록·fixed nav | plain ScrollView handled + fixed bottom padding | 연결 확인 |
| K26 | 비밀번호 변경 모달 | [MoreDrawerContent.tsx](../../src/screens/More/MoreDrawerContent.tsx#L518) | 현재·새 비밀번호·확인·secure toggle; 변경 제출 금지 | controller KAV + bounded scroll + animated gap | 연결 확인 |
| K27 | 닉네임 수정 모달 | [MoreDrawerContent.tsx](../../src/screens/More/MoreDrawerContent.tsx#L1277) | 닉네임·validation·닫기/재열기; 저장 금지 | controller KAV + bounded scroll | 연결 확인 |
| K28 | 계정 탈퇴 확인 | [MoreDrawerContent.tsx](../../src/screens/More/MoreDrawerContent.tsx#L2924) | 확인 문구 입력만; 탈퇴 실행 금지 | keyboardAware ConfirmDialog | 연결 확인 |
| K29 | 가이드 검색 | [GuideListScreen.tsx](../../src/screens/Guides/GuideListScreen.tsx#L366) | 검색·결과·sort/filter·clear | FlatList handled / on-drag Android | 연결 확인 |
| K30 | 가이드 관리자 검색 | [GuideAdminListScreen.tsx](../../src/screens/Guides/GuideAdminListScreen.tsx#L168) | 검색·결과·관리자 gate | FlatList handled / on-drag Android | 연결 확인 |
| K31 | 가이드 관리자 편집 | [GuideAdminEditorScreen.tsx](../../src/screens/Guides/GuideAdminEditorScreen.tsx#L338) | 17 Field 호출: 제목·slug·설명·본문·카테고리·종·tags·검색·숫자·이미지 URL | controller aware | 연결 확인 |
| K32 | 동물병원 검색 | [AnimalHospitalListScreen.tsx](../../src/screens/AnimalHospital/AnimalHospitalListScreen.tsx#L228) | 병원/지역 검색·clear·결과 scroll·복귀 | plain search/header + result list | 연결 확인 |
| K33 | 산책 장소 검색 | [LocationDiscoveryListScreen.tsx](../../src/screens/LocationDiscovery/LocationDiscoveryListScreen.tsx#L358) | 공원/지역 검색·최근검색·clear·결과·filters | plain search/header + result list | 연결 확인 |
| K34 | 병원 관리자 | [AnimalHospitalAdminScreen.tsx](../../src/screens/AnimalHospital/AnimalHospitalAdminScreen.tsx#L505) | 검색·검토 메모; 운영 action 제출 금지 | plain ScrollView handled | 연결 확인 |
| K35 | 산책 POI 운영 사유 | [WalkPoiAdminReadOnlyScreen.tsx](../../src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx#L1049) | 운영 사유 modal; 운영 action 제출 금지 | core KAV Android undefined | 연결 확인 |
| K36 | 개발용 입력 | [DevTestScreen.tsx](../../src/screens/DevTest/DevTestScreen.tsx#L437) | email/password/nickname/pet name styled 입력 4곳; Release route 없음 | plain ScrollView | DEV_ONLY |
| K37 | 구형 More 탈퇴 입력 | [MoreScreen.tsx](../../src/screens/More/MoreScreen.tsx#L345) | 잔존 코드; 활성 화면으로 합산하지 않음 | legacy ConfirmDialog, keyboardAware 미지정 | 미사용 후보 |
| K38 | 미사용 추모 입력 컴포넌트 | [PetMemorialFields.tsx](../../src/components/pets/PetMemorialFields.tsx#L112) | 잔존 코드; 재사용 시 QA 등록 필요 | parent-dependent | 미사용 후보 |

K11의 입력 3곳은 시간·분과 직접 날짜다. K07의 MultiInputSection은 활동·좋아함·싫어함·태그에서 각각 호출된다. K31의 Field는 17번 호출된다. 숫자만 센 뒤 같은 래퍼의 서로 다른 배치를 하나의 PASS로 축약하지 않는다. K37/K38은 현재 consumer 미발견이며 이번 작업에서 삭제하지 않았다.

## 4. 코드에서 확정된 불일치

### 댓글 스크롤과 작성 유지가 충돌한다

[CommunityDetailScreen](../../src/screens/Community/CommunityDetailScreen.tsx#L1502)의 `keyboardDismissMode="on-drag"`와 `onScrollBeginDrag={Keyboard.dismiss}`는 목록을 움직이면 키보드·초점을 닫는 명시 경로다. 사용자가 원하는 “키보드를 연 채 스크롤하고 입력창으로 돌아와 이어 쓰기”와 직접 충돌한다. `keyboardShouldPersistTaps="handled"`만으로 drag 닫기는 해결되지 않는다. [React Native Keyboard](https://reactnative.dev/docs/keyboard), [ScrollView 정책](https://reactnative.dev/docs/scrollview#keyboarddismissmode).

반대로 전송 성공·명시 취소·뒤로가기·모달 닫기의 의도된 dismiss는 보존할 수 있다. 검색의 on-drag는 별도 사용성 결정이며 댓글 규칙을 모든 화면에 강제하지 않는다.

### 커스텀 Bottom Navigation은 기본 hide 옵션을 직접 처리하지 않는다

[AppTabsNavigator](../../src/navigation/AppTabsNavigator.tsx#L144)는 `tabBarHideOnKeyboard: true`를 지정하지만 실제 `CustomTabBar`는 [AppNavigationToolbar](../../src/components/navigation/AppNavigationToolbar.tsx)를 그대로 렌더링하며 keyboard 상태를 전달하지 않는다. 기본 BottomTabBar의 hide 동작이 이 커스텀 UI에 자동 이식되는 구조는 아니다. 편지함·탭 내부 기록 수정·커뮤니티 검색에서 별도 확인이 필요하다. Root stack에 있는 커뮤니티 상세 영상의 원인으로 이 탭 문제를 그대로 대입하지 않는다.

### AppTextInput은 전역 키보드 처리 장치가 아니다

[AppTextInput](../../src/app/ui/AppTextInput.tsx#L46)은 TextInputProps/ref와 글꼴을 전달한다. 화면의 높이·scroll·keyboard inset·dismiss 정책을 통합하지 않는다. 이 파일 하나를 고친다고 모든 입력 화면이 해결되지 않는다. 접근성 label 부재도 교차 검토에서 발견했지만 이번 키보드 원인의 확정 증거로 취급하거나 접근성 구현으로 범위를 넓히지 않았다.

## 5. 실제 원인 추적이 필요한 전역 위험

| 위험 | 확인된 코드 사실 | 아직 확정하지 않은 것 |
| --- | --- | --- |
| 여러 키보드 처리 방식 혼재 | Auth는 legacy aware, 일부 화면은 core KAV, 기록/펫/일정은 controller aware, 모달은 controller KAV, 편지함·일부 검색/관리자는 plain scroll | 혼재 자체가 모든 화면에서 오류라는 판정 |
| 전환 완료 후 높이 반영 | [useKeyboardInset](../../src/hooks/useKeyboardInset.ts#L10)은 Android DidShow/DidHide에 상태 변경; RecordEdit은 boolean에 따라 toolbar/bottom padding·card 스타일을 교체 | 각 화면의 실제 점프 시각·크기 |
| 수동 reveal과 입력 노드 전환 | Community의 180ms 최초/160ms 재시도·DidShow 후 50ms 보정, `animated:false` scroll, 조건부 root/inline 입력 이동 | 조합 유실·선택 범위 유실의 개별 native 원인 |
| native inset 정책 차이 | [MainActivity](../../android/app/src/main/java/com/nuri/MainActivity.kt#L46)는 decorFits=true; 활성 keyboard-controller는 fits=false 및 root inset/margin 정책 설정; gradle edgeToEdgeEnabled=false | 실제 화면에서 inset이 두 번 더해지는지, 시스템 바 색상 전환에 얼마나 기여하는지 |
| plain scroll 하단 예약 | 편지함은 고정 bottom padding과 multiline 입력, 관리자 병원 화면은 plain ScrollView | 실제 가림·끝까지 scroll 불가 여부 |
| legacy Auth reveal | 설치된 legacy aware는 Android DidShow/DidHide 및 별도 측정/offset 경로 사용; login 80/24, signup 96의 extraScrollHeight | 현재 기기에서 과보정인지 필요한 CTA 보호인지 |
| header와 body 좌표 | Community 목록은 자체 top inset, 상세는 별도 custom native header가 top inset을 소유 | 서로 다른 두 화면의 inset 사용을 같은 화면의 중복으로 단정할 수 없음 |

NURI-12의 “상단 충돌 가능성”은 측정 전 가설로만 채택했다. Community 목록의 hero/panel 겹침이나 header padding을 먼저 지우는 수정은 승인하지 않는다.

RN core KAV도 LayoutAnimation 경로가 있으므로 “전혀 애니메이션이 없다”는 설명은 부정확하다. 다만 Android JS DidShow/DidHide 높이만으로 IME 전환 전체를 따라가는 것은 다르다. 전환 동기화는 native IME animation/inset과 UI-thread 진행률을 기준으로 판단해야 한다. [Android 키보드 제어·애니메이션](https://developer.android.com/develop/ui/views/layout/sw-keyboard).

FlatList는 focused cell 보존 경로가 있으므로 “화면 밖이면 무조건 입력창이 unmount된다”도 확정 원인이 아니다. 실제 mount/unmount, focused native tag, selection을 추적해야 한다. 가상화를 전역으로 끄지 않는다.

## 6. 전역 실기기 감사 계약

**코드 조사, 실기기 측정, 수정, 회귀를 분리한다.** 입력창이 키보드 위에 정지해 있다는 캡처 한 장으로 열림·닫힘·스크롤 유지까지 PASS로 확대하지 않는다. 이전 기본 설정 bounded QA와 이번 38개 감사 원장은 별개다.

각 ID와 조건부 분기에 아래 항목을 기록한다.

1. 같은 APK checksum, 실제 기기 model/OS·화면 폭·fontScale, keyboard 앱/모드. 이전 후보 QA의 SM-S937N·384dp·fontScale 1.0은 과거 기록이며 이번에 새로 확인한 기기 값이 아니다.
2. 첫 진입/재진입·키보드 열림/닫힘·한글 조합·숫자/소수/이메일/secure 입력·빠른 필드 이동.
3. 키보드를 연 채 상하 스크롤, 입력이 viewport 밖으로 나갔다 복귀, 긴 multiline 줄 증가, 마지막 필드·CTA 접근.
4. root→reply→child reply, parent form→modal→복귀, 날짜/태그/몸무게·취소/닫기·Android back. focus와 caret, draft, reply target을 각각 확인한다.
5. IME top/height/progress, root viewport, header bottom, scroll viewport/offset, 입력 bounds, Safe Area, toolbar bounds. 키보드 높이를 content와 wrapper가 이중 소유하는지 추적한다.
6. 가림·갑작스러운 점프·거대한 빈 공간·scroll 잠김·의도하지 않은 blur·첫 탭 무반응을 항목별 기록한다. 의도된 dismiss와 오류를 구분한다.
7. keyboard 상태에서 오류/느린 요청·연속 탭에도 draft·입력 상태를 보존하는지 별도 승인된 QA write 경로로 검증한다. 이번 감사에서는 제출을 실행하지 않는다.
8. 기본 설정에서 전 항목을 먼저 닫는다. 360dp/430dp·fontScale 1.3/1.5는 기기 설정 변경 범위를 별도로 승인받아 수행하고 원복한다. 기본 QA를 확대 설정 PASS로 대체하지 않는다.

시스템 키보드의 테마·추천 도구 바, 브라우저 autofill accessory, Android navigation bar, 앱 Bottom Navigation은 서로 다르다. 앱 inset 오류를 고치기 위해 Samsung keyboard 설정이나 시스템 바를 임의로 숨기지 않는다. 30fps 참고 영상으로 실기기 60/120Hz frame 성능을 판정하지 않는다.

전체 감사의 완료 조건은 각 항목이 재현 경로·측정·캡처와 함께 PASS 또는 구체적 OPEN/BLOCKED로 닫혀 있고 **NOT_RUN이 숨겨져 있지 않은 것**이다. 모든 PASS가 아닌데 `GLOBAL_KEYBOARD_QA_PASS`라고 보고하지 않는다.

## 7. 보호 경계

- 이번 기기 조작 승인 없음. 이전 태스크의 device 사용 승인을 전역 QA의 상시 권한으로 재사용하지 않았다.
- 로그아웃·계정 변경·비밀번호/닉네임 저장·삭제/탈퇴·관리자 review action·moderation 변경 금지.
- recovery/admin/개발 전용 경로는 현재 후보에서 접근 불가하면 gate와 필요한 안전 fixture를 기록한다. 검증을 위해 사용자 계정·role·DB를 임의로 변경하지 않는다.
- 입력 내용·비밀번호·세션·토큰·개인 영상 화면을 report나 trace에 저장하지 않는다. 이 evidence에는 코드 위치·정책·판정만 저장했다.
- QA100·기존 QA 댓글/답글/사진·사용자 데이터·기존 빌드·temp 영상 증적·dirty는 보존한다.

## 8. 최종 권장 순서

1. 이 38개 원장을 기준으로 **전역 실기기 키보드 감사**를 수행한다. 지금 바로 모든 화면 구현을 교체하지 않는다.
2. root native inset, header/Safe Area, toolbar의 소유권을 trace로 확정한다. 키보드에 따른 크기/이동은 한 가지 진행률을 기준으로 만들고 같은 공간을 중복 예약하지 않는다.
3. 작성 유지·검색·보호 확인·모달의 동작 계약을 분리한다. 공통 motion/inset 기준은 맞추되 각 업무의 의도된 닫기를 보존한다.
4. 확정 원인만 feature owner별로 순차 수정한다. 기존 controller와 animated gap/bounded scroll을 우선 재사용하며 새 라이브러리나 전역 대체 abstraction을 먼저 도입하지 않는다. aware scroll과 Sticky CTA는 각각 scroll reveal/버튼 이동을 맡을 수 있으므로 조합 자체를 중복으로 금지하지 않는다.
5. 변경된 화면뿐 아니라 영향을 받는 모든 ID를 같은 실기기·후보에서 재검증한다. 타입·lint·focused regression 뒤 build/install은 승인된 횟수만 수행한다.

앞선 “Community scoped corrective 먼저”는 영상만 놓고 잡은 최소 수정안이었다. 새 지시에 따른 다음 작업은 **전역 실기기 감사 먼저**로 변경한다. Community의 명시 drag dismiss는 이미 확인한 항목이지만 이 하나를 닫았다고 앱 전체를 완료 처리하지 않는다.

## 9. 결과와 현재 상태

- STATIC_INVENTORY: COMPLETE_FOR_SCANNED_FIRST_PARTY_SOURCE.
- CROSS_REVIEW: NURI-11 및 NURI-12 읽기 전용 완료. 결과의 가설과 확정 사실을 분리했다.
- GLOBAL_PHYSICAL_KEYBOARD_QA: NOT_RUN.
- IMPLEMENTATION: NOT_STARTED.
- SOURCE_DIFF_SHA256: `33165ca03762ff85f9f47053407a6dada1787384e5c95f070c8464bee7c06d8f`. 시작/종료 동일.
- HEAD/branch/index 및 기존 runtime/test dirty: 보존. 앱 source 수정 0, test/build/install/ADB/DB/cleanup/commit/push 0.
- 문서 검증: 새 보고서 구조·로컬 상대 링크 파일/행·JSON·git diff --check 확인. 앱 TypeScript/lint/테스트·실기기 렌더 재검증을 의미하지 않는다.
- Project-memory: 현재 상태·최근 로그·우선순위에 새 전역 감사 경계만 추가. 기존 동결/후보 승인과 이력을 유지했다. Release Checklist의 기능 PASS를 확대하지 않았다.
- STORE: HOLD. AUTO_START_NEXT_WORK: NO.
- NEXT_ACTION: PO 범위 승인 후 전역 실기기 키보드 감사. MASTER_STATE: STOPPED_WAITING_FOR_PO_GLOBAL_KEYBOARD_QA_SCOPE.

PO 승인을 기다립니다.
