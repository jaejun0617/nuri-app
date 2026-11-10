# 누리앱 팝업 모달 패널 전역 조사

> 2026-11-10 MD 정리 8차 전달 안내: 아래는 2026-11-05의 디자인 감사 원문이다. 당시 소스·설치 기준과 검증 한계를 보존하며 현재 디자인 승인이나 변경 지시가 아니다. 이후 [11/06 고정 기준과 후속 예외](../project-memory/핵심-결정사항.md#2026-11-06-po-고정-모든-후속-디자인의-cta와-글자-크기)를 되돌리지 않는다. 원문의 소스 행 링크는 당시 조사 위치이며 현재 후보의 같은 동작을 보증하지 않는다. 표의 ‘기존 실기기 수락 원장’ 링크가 가리키는 `2026-11-05-재개-p0-k-로그인-중앙-표시-중단-사진-복구` 절은 아직 로컬 전용이며 이번 원장 19:46 전달에 포함하지 않는다. 저장소 밖 설치 영수증·캡처·영상은 이번에 공개하거나 존재·내용을 재검증하지 않았다. 아래 ‘다음 작업’도 당시 제안이다.

2026년 11월 5일 KST · Android 우선 · 디자인 검수 NURI-11 · 앱 소스 `e6c22f8`

## 결과

첨부 화면의 **‘체중 기록 삭제’는 Android 기본 확인창**이다. 뒤에 보이는 **‘체중 기록 수정’은 누리앱이 디자인한 하단 패널**이다. 삭제하기를 누르면 패널에서 React Native의 `Alert.alert`를 호출해 기본 확인창이 한 겹 더 열린다. 아이 프로필 수정도 같은 패널을 등록 모드로 사용한다. 기존 기록을 넘겨 수정·삭제를 여는 호출자는 건강관리다. [삭제 확인 호출](../../src/components/health/WeightLogEntrySheet.tsx#L218) · [건강관리 연결](../../src/screens/HealthReport/HealthReportScreen.tsx#L1871) · [프로필 수정 연결](../../src/screens/Pets/PetProfileEditScreen.tsx#L1710)

앱 내부 문구로 열리는 기본 팝업 호출은 **일반 사용자 경로 61곳, 운영자 전용 3곳, 개발 전용 20곳, 현재 경로 미연결 2곳**으로 총 86곳이다. 코드 호출 지점을 세었으므로 같은 제목의 반복, 제목의 조건 분기, 공통 훅의 화면별 재사용은 화면 제목 개수와 다르다. OS 권한, 사진 선택기, 외부 소셜 인증 창은 별도로 분류했다.

## 1. 앱 자체 디자인이 적용되지 않은 팝업

아래 제목은 화면에 표시되는 문구다. 괄호의 숫자는 소스에서 확인한 호출 지점 수다. 오류로 인해 제목이 바뀌는 공통 분기는 표 아래에 적었다.

| 화면과 진입 경로 | 제목과 표시 조건 | 소스 |
| --- | --- | --- |
| 건강관리 → 체중 → 측정 이력 → 체중 기록 수정 → 삭제하기. 건강관리와 아이 프로필 수정 → 체중 기록 남기기 | **체중 기록 삭제**와 수정·삭제 실패 시 **기록 수정을 반영하지 못했어요**, **기록 삭제를 완료하지 못했어요**는 건강관리 경로에서 표시된다. 등록 실패 시 **기록 저장이 잠시 멈췄어요**는 두 화면에서 표시된다. 공유 패널에 호출 3곳이 있다. | [체중 패널](../../src/components/health/WeightLogEntrySheet.tsx#L161) |
| 건강관리 → 기록 → 일정 알림 조작 | **알림을 바로 켤 수 없어요**, **알림 설정 실패** (2) | [건강관리](../../src/screens/HealthReport/HealthReportScreen.tsx#L997) |
| 전체메뉴 → 알림함 → 알림 행 관리 버튼 | **알림 관리** → **이 알림을 삭제할까요?**, **알림을 모두 삭제할까요?** (2) | [알림함](../../src/screens/Notifications/UserNotificationsScreen.tsx#L62) |
| 홈 달력 → 일정 추가, 전체일정 → 일정 추가 | **시간 확인**, **알림 권한 필요**, **알림 권한 확인**, **로그인 정보를 확인해 주세요.**, **반려동물을 찾을 수 없어요.**, **일정 제목을 입력해 주세요.**, **저장된 일정을 확인했어요**, **일정 저장이 잠시 멈췄어요** (공통 9) | [일정 추가 훅](../../src/hooks/useScheduleCreateForm.ts#L150) · [홈 달력](../../src/components/home/ScheduleCalendarSheet.tsx#L144) |
| 일정 상세 → 일정 수정 | **일정을 불러오지 못했어요**, **시간 확인**, **알림 권한 필요**, **일정 제목을 입력해 주세요.**, **일정 수정을 반영하지 못했어요** (5) | [일정 수정](../../src/screens/Schedules/ScheduleEditScreen.tsx#L254) |
| 추억 기록 작성 및 산책 기록 작성 | **저장된 기록을 확인했어요**(산책 복구, 일반 저장 복구), **기록 저장이 잠시 멈췄어요**(초안 복구, 저장 실패) (4) | [작성](../../src/screens/Records/RecordCreateScreen.tsx#L568) · [산책 복구](../../src/screens/Records/RecordCreateScreen.tsx#L981) · [저장 복구](../../src/screens/Records/RecordCreateScreen.tsx#L1278) |
| 추억 상세 → 이 기록 관리 → 기록 수정하기 | **대기 중인 사진을 저장할까요?**, **사진 저장을 확인하지 못했어요**, **이 기기의 초안을 불러올까요?**, **관리 항목을 1개 이상 선택해 주세요.**, **금액을 확인해 주세요.**, **제목을 입력해 주세요.**, **로그인 정보가 없어요**, **기록 수정을 반영하지 못했어요** (8) | [사진 복구](../../src/screens/Records/RecordEditScreen.tsx#L390) · [입력 검사](../../src/screens/Records/RecordEditScreen.tsx#L664) · [저장 실패](../../src/screens/Records/RecordEditScreen.tsx#L867) · [초안](../../src/screens/Records/RecordEditScreen.tsx#L997) |
| 추억 상세 → 이 기록 관리 → 기록 삭제 실행 후 실패 | **기록 삭제를 완료하지 못했어요** (1). 실행 전 삭제 확인은 누리 디자인이다. | [삭제 실패](../../src/screens/Records/RecordDetailScreen.tsx#L1121) |
| 날씨 → 활동 가이드 → 활동 기록 | **아이를 먼저 선택해 주세요.**, **로그인이 잠시 끊어졌어요**, **기록 제목을 입력해 주세요.**, **저장된 기록을 확인했어요**, **기록 저장이 잠시 멈췄어요** (5) | [활동 기록](../../src/screens/Weather/WeatherActivityRecordScreen.tsx#L213) · [저장 복구](../../src/screens/Weather/WeatherActivityRecordScreen.tsx#L301) |
| 첫 아이 등록 및 아이 추가 | **날짜 확인**, **기본 정보 확인**, **이미지 업로드 실패**, **아이 프로필 등록이 잠시 멈췄어요** (4) | [날짜 검사](../../src/screens/Pets/PetCreateScreen.tsx#L1419) · [등록](../../src/screens/Pets/PetCreateScreen.tsx#L1747) |
| 아이들 프로필 관리 → 프로필 수정 | **프로필을 열지 못했어요**, **날짜 확인**, **이름을 입력해 주세요.**, **이름 변경 제한**, **아이 프로필 수정을 반영하지 못했어요** (5). 체중 패널은 첫 행에 포함했다. | [프로필 로딩](../../src/screens/Pets/PetProfileEditScreen.tsx#L356) · [입력 및 저장](../../src/screens/Pets/PetProfileEditScreen.tsx#L546) |
| 아이들 프로필 관리 → 삭제 대상 재확인 실패 | **삭제할 수 없어요** (1). 정상 진입의 삭제 동의 및 문구 입력은 누리 디자인이다. | [프로필 관리](../../src/screens/Pets/PetManagementScreen.tsx#L130) |
| 로그인 홈 | **Google 로그인**, **카카오 로그인**(인증 시작 또는 교환 실패에 따른 제공자명), **회원 정리를 마치지 못했어요**, **로그아웃을 마치지 못했어요** (3) | [로그인 홈](../../src/screens/Auth/SignInScreen.tsx#L117) |
| 소셜 로그인 복귀 | **소셜 로그인을 완료하지 못했어요**, **로그인 상태를 확인하지 못했어요** (2) | [OAuth 복귀](../../src/screens/Auth/OAuthCallbackScreen.tsx#L73) |
| 첫 로그인 → 닉네임 설정 | **닉네임 저장이 잠시 멈췄어요** (1) | [닉네임 설정](../../src/screens/Auth/NicknameSetupScreen.tsx#L511) |
| 비밀번호 재설정 요청·링크 복귀·새 비밀번호 입력 | **요청을 처리하지 못했어요**, **비밀번호 재설정을 이어가지 못했어요**, **비밀번호를 다시 확인해 주세요**, **비밀번호가 일치하지 않아요** (4). 재설정 라우트는 등록돼 있으며 현재 계정별 진입 가능 여부는 미확인이다. | [요청](../../src/screens/Auth/PasswordResetRequestScreen.tsx#L70) · [링크 복귀](../../src/screens/Auth/PasswordResetRecoveryScreen.tsx#L48) · [입력](../../src/screens/Auth/PasswordResetFormScreen.tsx#L106) |
| 전체메뉴 → 로그아웃 또는 회원탈퇴 요청 실패 | **로그아웃을 마치지 못했어요**, **회원 정리를 마치지 못했어요** (2). 실행 전 확인은 누리 디자인이다. | [전체메뉴 계정 처리](../../src/screens/More/MoreDrawerContent.tsx#L1389) |

공통 오류 매핑은 위 기본 제목을 **이미 함께하고 있는 계정이에요**, **이메일 확인이 필요해요**, **요청이 잠시 몰렸어요**, **로그인이 잠시 끊어졌어요**, **권한을 확인하지 못했어요**, **사진 업로드가 잠시 멈췄어요**, **비밀번호를 다시 확인해 주세요**로 바꿀 수 있다. 실제 분기는 오류 조건을 따른다. [공통 오류 제목](../../src/services/app/errors.ts#L155)

| 별도 범위 | 제목 또는 제공 주체 | 소스 |
| --- | --- | --- |
| 앱 운영자 → 동물병원 검수 | **검수 처리 실패** (1) | [병원 검수](../../src/screens/AnimalHospital/AnimalHospitalAdminScreen.tsx#L349) |
| 앱 운영자 → 집사 꿀팁 가이드 작성·편집 | **입력 확인**, **저장 실패** (2) | [가이드 편집](../../src/screens/Guides/GuideAdminEditorScreen.tsx#L174) |
| 개발 → DevTest | **OK**, **에러**, **동의 이력 없음**, **권한 필요**, **Sentry 테스트**, **네이티브 크래시 테스트** (20) | [개발 화면](../../src/screens/DevTest/DevTestScreen.tsx#L100) · [등록 조건](../../src/navigation/RootNavigator.tsx#L637) |
| 라우트 미연결 → 예전 MoreScreen | **로그아웃을 마치지 못했어요**, **회원 정리를 마치지 못했어요** (2). 현재 진입은 MoreDrawer다. | [예전 화면](../../src/screens/More/MoreScreen.tsx#L147) · [현재 메뉴 연결](../../src/navigation/AppTabsNavigator.tsx#L216) |
| OS → 위치, 알림 권한 | Android가 제목을 렌더링한다. 위치는 산책 및 내 위치 사용, 알림은 일정 추가·수정에서 권한 상태에 따라 표시된다. 전체메뉴의 알림 설정에서는 기기 설정 화면으로 이동할 수 있다. 앱 안내창 **알림 권한 필요**, **위치 사용을 허용해 주세요**는 각각 기본 앱 호출과 누리 커스텀으로 별도 분류했다. | [위치](../../src/services/location/permission.ts#L62) · [알림](../../src/services/schedules/notifications.ts#L599) |
| OS → 사진 선택, 구형 Android 사진 접근 권한 | 아이 등록·프로필 수정, 추억 작성·수정, 커뮤니티 작성·수정, 날씨 활동 기록이 공유한다. OS 및 선택기가 제목을 정한다. Android 13 이상은 이 공통 함수에서 저장소 권한 팝업을 생략한다. | [공통 사진 선택](../../src/services/media/photoPicker.ts#L78) |
| 외부 → Google·카카오 인증과 계정 선택 | Android Auth Tab, 브라우저 및 제공자가 표시하는 인증 UI다. 누리 홈의 진행 오버레이, 앱 복귀 시 오류는 별도 집계했다. | [로그인 진입](../../src/screens/Auth/SignInScreen.tsx#L102) · [기존 실기기 수락 원장](../qa/nuri-integrated-closeout-2026-10-25.md#2026-11-05-재개-p0-k-로그인-중앙-표시-중단-사진-복구) |

## 2. 누리앱이 디자인한 팝업 모달 패널

‘디자인 적용’은 앱 소스가 표면·글자·버튼·배치 등을 그린다는 의미다. 표시 제목이 없으면 열리는 동작을 적었다. 데이터에 따라 달라지는 제목은 표시 규칙을 적었다. 이 분류만으로 최종 디자인 승인을 판단할 수 없다.

| 화면과 진입 경로 | 표시 제목 | 형태와 소스 |
| --- | --- | --- |
| 홈 → 아이 선택 | **함께할 아이를 선택해요** | [하단 패널](../../src/screens/Main/components/LoggedInHome/HomePetSelectionSheet.tsx#L60) |
| 홈 → 아이 소개 더 알아보기 | **아이 이름의 소개와 취향** | [계절별 프로필 패널](../../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx#L1359) |
| 홈 → 달력 날짜 선택 | **선택한 날짜**를 요일과 함께 제목으로 표시 | [일정 목록 패널](../../src/components/home/ScheduleCalendarSheet.tsx#L391) |
| 홈 → 달력 → 일정 추가 | **일정 추가**, **일정 날짜와 시간**, **알림 시간 확인**, **저장하지 않고 나갈까요?** | [입력 패널 및 자식 창](../../src/components/home/ScheduleCalendarSheet.tsx#L391) · [자식 창](../../src/components/home/ScheduleCalendarSheet.tsx#L862) |
| 홈 → 알림 벨 | **알림** | [빠른 알림 패널](../../src/screens/Notifications/HomeQuickNotificationsScreen.tsx#L65) · [투명 모달 라우트](../../src/navigation/RootNavigator.tsx#L589) |
| 홈 → Android 뒤로가기 | **앱을 종료할까요?** | [확인창](../../src/screens/Main/MainScreen.tsx#L187) |
| 첫 아이 등록 후 → 홈 | **NURI에 온 걸 환영해요!** | [온보딩 모달](../../src/components/onboarding/FirstPetWelcomeModal.tsx#L91) |
| 하단 툴바 → 전체메뉴 | **전체메뉴** | [메뉴 오버레이](../../src/navigation/AppTabsNavigator.tsx#L216) · [표시 제목](../../src/components/MoreDrawer/MoreMenuPresentation.tsx#L64) |
| 전체메뉴 → 닉네임 수정, 펫 강조색, 앱 글꼴, 알림 설정 | **닉네임 수정**, **테마 설정**, **앱 글꼴**, **알림 설정** | [설정 모달 및 하단 패널](../../src/screens/More/MoreDrawerContent.tsx#L1890) · [알림 설정](../../src/screens/Notifications/NotificationSettingsSheet.tsx#L56) |
| 전체메뉴 → 로그아웃, 회원탈퇴 | **로그아웃할까요?**, **회원탈퇴 전 확인해 주세요**, **정말 NURI를 떠나시겠어요? 🥺**, **상태를 조금 더 확인하고 있어요**, **안전하게 정리하고 있어요** | [확인창 및 계정 상태](../../src/screens/More/MoreDrawerContent.tsx#L1946) · [상태별 제목](../../src/screens/More/MoreDrawerContent.tsx#L938) |
| 로그인 홈 → 계정 상태 안내 | **안전하게 로그아웃 되었습니다.**, **탈퇴 요청이 접수되었어요.**, **비밀번호가 변경되었습니다.**, **잠시만요! 계정 삭제가 진행 중이에요** | [안내 모달](../../src/screens/Auth/SignInScreen.tsx#L213) · [표시 문구](../../src/services/auth/notices.ts#L16) |
| 로그인 홈 → 소셜 인증 복귀 후 세션 교환 | **누리에 로그인하고 있어요** | [글라스 진행 오버레이](../../src/screens/Auth/SocialLoginSurface.tsx#L227) |
| 건강관리 → 기록하기 | **건강 기록하기** | [기록 종류 선택 패널](../../src/screens/HealthReport/HealthReportScreen.tsx#L1976) |
| 건강관리 → 인사이트 → 지표 상세 | **건강 이벤트**, **기록한 날**, **체중 기록**, **자주 남긴 기록** | [상세 패널](../../src/screens/HealthReport/HealthReportScreen.tsx#L1887) · [지표 제목](../../src/screens/HealthReport/HealthReportScreen.tsx#L1104) |
| 건강관리 → 체중, 아이 프로필 수정 → 체중 | **체중 기록 남기기**, **측정 날짜**는 두 화면에 표시된다. **체중 기록 수정**은 건강관리 측정 이력에서 표시된다. | [공유 하단 패널](../../src/components/health/WeightLogEntrySheet.tsx#L161) · [날짜 선택 모달](../../src/components/health/WeightLogEntrySheet.tsx#L456) |
| 아이 등록 → 첫 글꼴 선택, 등록 완료 | **어떤 분위기의 NURI가 좋으세요?**, **등록이 완료되었어요!** | [온보딩 글꼴](../../src/components/onboarding/FirstPetFontSelectorModal.tsx#L55) · [등록 완료 모달](../../src/screens/Pets/PetCreateScreen.tsx#L2335) |
| 아이 등록 → 날짜 또는 글꼴 선택, 작성 중 닫기 | **생일 선택**, **입양일 선택**, **추모 날짜 선택**, **앱 글꼴**, **등록을 멈추고 나갈까요?** | [제목 결정](../../src/screens/Pets/PetCreateScreen.tsx#L1392) · [날짜 및 나가기](../../src/screens/Pets/PetCreateScreen.tsx#L2388) · [글꼴 연결](../../src/screens/Pets/PetCreateScreen.tsx#L2329) |
| 아이 프로필 수정 → 날짜 | **날짜 선택** | [날짜 모달](../../src/screens/Pets/PetProfileEditScreen.tsx#L1699) |
| 아이들 프로필 관리 → 관리 메뉴, 삭제 | **선택한 아이 이름**(메뉴 제목), **아이 프로필을 삭제할까요?**, **아이 프로필을 삭제하지 못했어요** | [아이 관리 메뉴](../../src/components/pets/PetManagementCard.tsx#L382) · [삭제 동의](../../src/components/pets/PetDeleteConfirmDialog.tsx#L150) · [삭제 제한](../../src/screens/Pets/PetManagementScreen.tsx#L356) |
| 활동·칭호 | **아이 선택**, **선택한 칭호 이름 + ‘칭호로 바꿀까요?’**, **활동과 칭호 안내** | [선택 및 안내 모달](../../src/screens/Pets/PetActivityAchievementsScreen.tsx#L1043) |
| 누리 랭킹 → 집계 안내 | **랭킹 집계 기준** | [안내 모달](../../src/screens/Ranking/NuriRankingScreen.tsx#L186) |
| 전체일정 → 추가 또는 수정 | **일정 날짜와 시간**, **알림 시간 확인**, **저장하지 않고 나갈까요?** | [일정 추가](../../src/screens/Schedules/ScheduleCreateScreen.tsx#L607) · [일정 수정](../../src/screens/Schedules/ScheduleEditScreen.tsx#L927) |
| 일정 상세 → 완료, 삭제, 결과 안내 | **지금 일정 마침으로 정리할까요?**, **일정을 삭제할까요?**, **기록은 보존돼요**, **삭제 실패**, **상태 변경 실패**, **알림 설정 확인**, **기록 확인** | [확인창](../../src/screens/Schedules/ScheduleDetailScreen.tsx#L922) · [결과 제목 예시](../../src/screens/Schedules/ScheduleDetailScreen.tsx#L358) |
| 타임라인 → 필터 | **월/연도 선택**, **생활 카테고리** | [필터 모달](../../src/screens/Records/TimelineScreen.tsx#L1613) |
| 추억 상세 → 관리, 삭제, 사진 터치 | **이 기록 관리**, **이 기록을 삭제할까요?**, **제목 없음**(사진 확대) | [관리 패널](../../src/screens/Records/RecordDetailScreen.tsx#L1378) · [삭제 확인창](../../src/components/records/TimelineDeleteDialog.tsx#L17) · [전체화면 사진](../../src/screens/Records/RecordDetailScreen.tsx#L576) |
| 추억 기록 작성 → 날짜, 태그, 작성 중 나가기, 저장 보상 | **날짜 선택**, **태그 추가**, **작성을 멈추고 나갈까요?**, **레벨이 한 단계 올랐어요**, **경험치가 예쁘게 쌓였어요**, **산책 기록을 남겼어요** | [작성 모달 연결](../../src/screens/Records/RecordCreateScreen.tsx#L1776) · [기본 날짜 제목](../../src/components/date-picker/DatePickerModal.tsx#L283) · [보상](../../src/screens/Records/RecordCreateScreen.tsx#L1253) |
| 추억 기록 수정 → 날짜, 태그, 수정 완료, 보상 | **날짜 선택**, **태그 추가**, **수정이 완료되었어요**, **레벨이 한 단계 올랐어요**, **활동 경험치가 쌓였어요** | [수정 모달 연결](../../src/screens/Records/RecordEditScreen.tsx#L1266) |
| 월별 지출 → 안내, 아이 필터 | **월별 지출 안내**, **아이 선택** | [안내 및 선택 패널](../../src/screens/Records/MonthlyExpensesScreen.tsx#L173) |
| 날씨 → 활동 기록 → 태그, 기록 완료 | **태그 추가**, **기록 완료!** | [자식 패널 및 완료 모달](../../src/screens/Weather/WeatherActivityRecordScreen.tsx#L553) · [완료 문구](../../src/services/weather/guide.ts#L707) |
| 커뮤니티 목록 → 표시 개수 | **게시글 표시 개수** | [선택 모달](../../src/screens/Community/CommunityListScreen.tsx#L963) |
| 커뮤니티 글쓰기 → 임시저장, 첨부 복구, 작성 중 나가기, 제출 중 | **임시저장된 글이 있어요**, **첨부 이미지를 다시 불러오지 못했어요**, **작성 중인 글을 나갈까요?**, **게시글을 올리고 있어요** | [작성 모달](../../src/screens/Community/CommunityCreateScreen.tsx#L522) · [나가기 제목](../../src/screens/Community/communityPostEditor.shared.ts#L46) · [제출 오버레이](../../src/screens/Community/components/CommunitySubmitProgress.tsx#L59) |
| 커뮤니티 글 수정 → 수정 중 나가기 | **수정 중인 글을 나갈까요?** | [수정 확인](../../src/screens/Community/CommunityEditScreen.tsx#L392) |
| 커뮤니티 게시글 및 댓글 → 관리, 정렬, 차단, 삭제 | **제목 없음**(게시글 메뉴), **댓글 정렬**, **이 사용자를 차단할까요?**, **게시글을 삭제할까요?**, **댓글을 삭제할까요?** | [공유 게시글·댓글 UI](../../src/screens/Community/CommunityDiscussionContent.tsx#L1981) |
| 커뮤니티 게시글 및 댓글 → 신고 | **신고 사유를 선택해 주세요**, **이미 접수된 신고입니다.**, **신고가 안전하게 접수되었습니다.** | [신고 모달](../../src/screens/Community/CommunityDiscussionContent.tsx#L2222) · [접수 결과](../../src/screens/Community/CommunityDiscussionContent.tsx#L2367) |
| GPS 산책 → 일시정지, 마치기 | **잠깐 쉬어가도 괜찮아요.**, **오늘 산책, 기분 좋게 마칠까요?** | [사용자 산책 연결](../../src/screens/Walk/WalkProductScreen.tsx#L413) · [휴식](../../src/screens/DevTest/walkPresentation/WalkRestSheet.tsx#L35) · [종료](../../src/screens/DevTest/walkPresentation/WalkFinishSheet.tsx#L52) |
| GPS 산책 → 시작 전, 화면 닫기, 권한, 복구 | **아직 시작하지 않은 산책이에요**, **산책 시작을 다시 확인해 주세요**, **함께 걸은 길을 기록할게요**, **잠깐 다른 일을 보고 와도 괜찮아요**, **편하게 쉬었다 돌아오세요**, **산책은 기다리고 있을게요**, **위치 사용을 허용해 주세요**, **위치 기능이 꺼져 있어요**, **잠깐, 산책 상태를 확인할게요** | [공통 안내 패널](../../src/screens/Walk/WalkProductScreen.tsx#L503) · [상태별 제목](../../src/screens/DevTest/walkPresentation/noticeModel.ts#L3) |

**운영자·개발·미연결 UI**

| 범위 | 화면과 제목 | 근거 |
| --- | --- | --- |
| 앱 운영자 | 산책 장소 검수 → **Audit detail**, **승인 처리**, **반려 처리**, **보류 처리** | [감사 상세](../../src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx#L903) · [검수 처리](../../src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx#L1010) |
| 개발 전용 | 산책 QA → **QA 정보** 및 사용자 산책 공통 휴식·안내 패널 미리보기 | [QA 패널](../../src/screens/DevTest/WalkDistanceQaPanel.tsx#L612) |
| 현재 앱 호출 미발견 | 예전 MoreScreen의 **로그아웃할까요?**, **정말 NURI를 떠나시겠어요? 🥺**, 계정 상태 모달. 별도 **비밀번호 변경**, **비밀번호 변경 완료** 모달과 공통 `TimePickerModal`도 활성 호출 미발견. 현재 일정 시간 선택은 `DatePickerModal` 내부에 있다. | [예전 메뉴](../../src/screens/More/MoreScreen.tsx#L305) · [비밀번호 변경](../../src/screens/More/MoreDrawerContent.tsx#L268) · [완료](../../src/screens/More/MoreDrawerContent.tsx#L552) · [시간 선택 컴포넌트](../../src/components/time-picker/TimePickerModal.tsx#L194) · [사용 중인 날짜·시간 선택](../../src/screens/Schedules/ScheduleEditScreen.tsx#L929) |

## 3. 검증 범위와 다음 작업

- 기준은 실제 Git 원격과 일치한 `codex/walk-marker-recovery-20261020`의 `e6c22f8`이다. 해당 커밋의 앱 TS·TSX 622개와 Android·iOS 앱 자체 네이티브 호출을 검색했다. JSX, 임베디드 오버레이, 투명 라우트, 메뉴 드로어, 네이티브 권한 진입을 대조했다. 일반 인라인 카드, 토스트, 화면 자체의 로딩 상태, 일반 화면 이동, 별도 웹 관리자 콘솔은 집계 범위 밖이다.
- Galaxy SM-S937N의 설치 APK 해시는 `fba2b2be4181f202908648bfd039299120ae8b5eea08fb087969f8c6b6f73aa2`다. 기존 설치 영수증에서 `e6c22f8`을 가리키는 해시와 일치했다. 체중 삭제의 렌더링은 사용자 첨부로 확인했다. 조사 중 별도 작업에서 로그인 진행 패널의 글꼴·모서리를 바꾼 로컬 후속 커밋 `17d2fcf`가 추가됐다. 두 커밋 사이에 팝업 제목과 호출 위치의 기능 변화는 확인되지 않았다. 나머지는 소스와 연결 기준이며 이번 전수 실기기 렌더링, iOS 외형, Store 배포 상태는 미확인이다. [설치 영수증](</Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT/delivery-login-glass-1105/installation.json>)
- 보고서 한 파일을 추가했다. 제품 코드, 타입, 빌드, 설치, 계정 데이터 및 운영 변경은 0건이다. 테스트와 빌드는 이번 문서 조사에서 실행하지 않았다. 프로젝트 메모리와 릴리스 체크리스트는 검수 및 출시 판정을 바꿀 새 실기기 증적이나 승인 범위가 없어 갱신 대상에서 제외했다. 디자인 인벤토리의 근거는 이 보고서가 소유한다.
- 다음 디자인 작업은 **건강관리의 ‘체중 기록 삭제’ 확인창에 누리 디자인 적용**이다. Android에서 부모 패널이 열린 채로 취소와 뒤로가기, 확인 1회 실행 및 삭제 실패 후 원래 입력 복귀를 검증하는 단위로 잡는다.
