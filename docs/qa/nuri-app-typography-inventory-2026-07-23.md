# NURI 앱 전 도메인 타이포그래피 인벤토리

기준일: 2026-07-23

이 문서는 현재 `src` 코드에 실제 선언된 `fontSize`·`fontWeight`와 공통 `AppText` preset을 분리해 기록한다. React Native 값은 CSS px가 아니라 화면 밀도에 대응하는 논리 단위다.

## 1. 공통 기준

### 기본 폰트

- Android/iOS: `PretendardVariable`
- 선언 위치: `src/app/theme/tokens/typography.ts`
- 공통 컴포넌트: `src/app/ui/AppText.tsx`
- `AppText`는 `preset -> weight override -> style override` 순서로 합성한다.

### semantic preset

| preset/role | fontSize | lineHeight | fontWeight |
| --- | ---: | ---: | ---: |
| `screenTitle` | 20 | 24 | 700 |
| `sectionTitle` | 18 | 24 | 600 |
| `cardTitle` | 16 | 22 | 600 |
| `display` / `title1` | 28 | 36 | 700 |
| `titleLg` / `title2` | 24 | 32 | 700 |
| `titleMd` | 20 | 28 | 700 |
| `titleSm` / `headline` | 18 | 26 | 600 |
| `body` | 16 | 24 | 400 |
| `bodySm` | 14 | 22 | 400 |
| `bodyStrong` | 14 | 20 | 600 |
| `secondary` | 13 | 18 | 400 |
| `button` | 16 | 20 | 600 |
| `tab` | 13 | 18 | 600 |
| `helper` / `caption` alias | 13 | 18 | 400 |
| `caption` role | 12 | 18 | 400 |

### 수치 토큰

- 크기: `xs=12`, `sm=13`, `md=14`, `lg=16`, `xl=20`, `xxl=24`, `display=28`
- 굵기: `regular=400`, `medium=500`, `semibold=600`, `bold=700`, `extrabold=800`
- 추가 화면 예외에서 `900`을 사용한다. 이는 현재 코드에 직접 선언된 강한 제목·숫자 스타일이다.

## 2. 도메인별 사용 현황

표의 `직접 값`은 해당 파일이 preset 또는 기본 스타일을 덮어쓰는 값이다. 직접 `fontSize`가 없는 파일의 크기는 위 preset 또는 같은 화면의 상위 스타일에서 상속된다.

### 인증·온보딩

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/screens/Auth/SignInScreen.styles.ts` | preset 기반 | 600, 700, 800, 900 |
| `src/screens/Auth/SignInScreen.tsx` | 13, 12 | 600, 700, 900 |
| `src/screens/Auth/SignUpScreen.styles.ts` | preset 기반 | 700, 800, 900 |
| `src/screens/Auth/SignUpScreen.tsx` | 12 | 700, 900 |
| `src/screens/Auth/NicknameSetupScreen.styles.ts` | preset 기반 | 700, 800, 900 |
| `src/screens/Auth/PasswordResetFlow.styles.ts` | preset 기반 | 600, 700, 800, 900 |
| `src/screens/Auth/WelcomeTransitionScreen.styles.ts` | 16, 12 | 700, 900 |
| `src/screens/Auth/_shared/authTheme.ts` | 화면 스타일 토큰 참조 | 화면별 override |

### 홈·메인·날씨

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/screens/Main/MainScreen.styles.ts` | 11, 12, 13, 15, 16, 20, 44 | 600, 700, 800, 900 |
| `src/screens/Main/components/GuestHome/GuestHome.styles.ts` | preset/상위 스타일 기반 | 600, 700, 800, 900 |
| `src/screens/Main/components/GuestHome/GuestHome.tsx` | 14 | 900 |
| `src/screens/Main/components/LoggedInHome/LoggedInHome.styles.ts` | 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 28 | 400, 500, 600, 700, 800, 900 |
| `src/components/weather/WeatherGuideHomeCard.tsx` | 8, 9, 10, 11, 13, 21, 38, 42, 50 | 500, 600, 700, 800 |
| `src/components/weather/WeatherForecastStrip.tsx` | 11, 12, 13, 14, 16, 21 | 600, 700 |
| `src/components/weather/WeatherTemperatureNotice.tsx` | 11, 12, 13 | 500, 700, 800 |
| `src/components/weather/ActivityGuideHeroCard.tsx` | 10, 11, 14, 15 | 400, 700 |
| `src/components/weather/AirQualityInsightCard.tsx` | 12, 13, 16 | 600, 700 |
| `src/components/weather/IndoorActivityCard.tsx` | 13, 15 | 400, 700 |
| `src/screens/Weather/ActivityGuideScreen.tsx` | 11, 13, 14, 15, 17 | 400, 700, 900 |
| `src/screens/Weather/IndoorActivityRecommendationsScreen.tsx` | 11, 13, 15, 17 | 400, 600, 700, 900 |
| `src/screens/Weather/WeatherActivityRecordScreen.tsx` | 11, 13, 14, 15, 16, 17, 22 | 400, 500, 600, 700, 900 |
| `src/screens/Weather/WeatherInsightScreen.tsx` | 11, 12, 13, 14, 15, 16, 17, 28, 54, 76 | 500, 600, 700, 800, 900 |

날씨 홈카드의 현재 기준은 온도 본체 `38 / lineHeight 40 / 800`, 작은 `°=13 / 700`, `C=21 / 700`, 메인 카피 `10 / 600`, 서브 카피 `9 / 500`, 주의 제목 `11 / 800`, 주의 본문 `10 / 600`, 지표 라벨 `9 / 600`, 지표 값 `11 / 800`이다. 370dp 이하 compact 분기에서는 날씨 이모티콘 42, 본문 8~10, 주의 제목 9, 주의 본문 9를 사용한다.

### 타임라인·건강·기록

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/components/health/WeightLogEntrySheet.tsx` | 15, 16 | preset 기반 |
| `src/screens/HealthReport/HealthReportScreen.tsx` | preset/상위 스타일 기반 | 800, 900 |
| `src/screens/Records/RecordCreateScreen.styles.ts` | preset 기반 | 700, 800, 900 |
| `src/screens/Records/RecordDetailScreen.styles.ts` | 16 | 500, 600, 700, 800 |
| `src/screens/Records/RecordEditScreen.styles.ts` | 11, 13, 14, 15 | 700, 800, 900 |
| `src/screens/Records/TimelineScreen.styles.ts` | 10, 11, 12, 14, 16, 30 | 500, 600, 700, 800, 900 |
| `src/screens/Records/components/RecordTagModal.tsx` | preset 기반 | preset 기반 |
| `src/components/date-picker/DatePicker.styles.ts` | 14, 17, 18, 22 | 700, 800 |
| `src/components/date-picker/DateWheelPicker.tsx` | 선택 17 / 비선택 13, 11 | 선택 800 / 비선택 600, 700 |
| `src/components/time-picker/TimePicker.styles.ts` | 24 | 800 |
| `src/components/time-picker/TimePickerModal.tsx` | 선택 28 / 비선택 22, 11, 12, 14, 18, 22 | 600, 700, 800 |

### 커뮤니티

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/screens/Community/CommunityListScreen.styles.ts` | preset 기반 | 700, 800 |
| `src/screens/Community/CommunityDetailScreen.styles.ts` | preset 기반 | 600, 700, 800 |
| `src/screens/Community/CommunityDetailScreen.tsx` | preset 기반 | 700 |
| `src/screens/Community/CommunityEditScreen.tsx` | preset 기반 | 700 |
| `src/screens/Community/components/PostCard.styles.ts` | 제목 15, meta 12, 댓글 수 14 | 제목 600, meta 500 |
| `src/screens/Community/components/CommunityPostEditorForm.styles.ts` | 입력 16 | 600, 700, 800 |
| `src/screens/Community/components/PostCard.tsx` | preset 기반 | preset 기반 |
| `src/screens/Community/components/CommentActionRow.tsx` | preset 기반 | preset 기반 |
| `src/screens/Community/components/CommentThreadItem.tsx` | preset 기반 | preset 기반 |
| `src/screens/Community/components/ReplyCommentItem.tsx` | preset 기반 | preset 기반 |
| `src/screens/Community/components/CommunityPostEditorForm.tsx` | preset 기반 | preset 기반 |
| `src/screens/Community/components/CommunityPostListItem.tsx` | preset 기반 | preset 기반 |
| `src/navigation/CommunityStackHeader.tsx` | preset `titleSm` = 18 / 600 | preset 기반 |

### 반려동물·프로필·성장

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/screens/Pets/PetCreateScreen.styles.ts` | 12, 13, 14, 15, 16 | 600, 700, 800, 900 |
| `src/screens/Pets/PetProfileEditScreen.styles.ts` | preset 기반 | 700, 800, 900 |
| `src/screens/Pets/PetProfileEditDoneScreen.styles.ts` | preset 기반 | 800, 900 |
| `src/screens/Pets/PetManagementScreen.tsx` | preset 기반 | 900 |
| `src/screens/Pets/PetActivityAchievementsScreen.tsx` | preset 기반 | 700, 800, 900 |
| `src/components/pets/PetManagementCard.tsx` | preset 기반 | 700, 900 |
| `src/components/pets/PetMemorialFields.tsx` | 11, 12, 13, 14 | 600, 700, 800 |
| `src/components/pets/PetThemePicker.tsx` | 12, 13 | 600, 700 |
| `src/components/pets/PetAvatar.tsx` | preset 기반 | 900 |
| `src/components/pets/PetSelectedBadge.tsx` | preset `caption` = 12 / 400 기반 | 900 |
| `src/screens/Ranking/NuriRankingScreen.tsx` | 11, 12, 13, 14, 15, 16, 17, 19, 25 | 600, 700, 900 |

### 동물병원·산책·지도

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/components/animalHospital/styles.ts` | preset/상위 스타일 기반 | 600, 700, 800 |
| `src/components/animalHospital/AnimalHospitalCard.tsx` | preset `headline`/`caption` | preset 600/400 |
| `src/screens/AnimalHospital/AnimalHospitalListScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/AnimalHospital/AnimalHospitalDetailScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/AnimalHospital/AnimalHospitalAdminScreen.tsx` | preset/상위 스타일 기반 | 700, 800, 900 |
| `src/components/locationDiscovery/LocationDiscovery.styles.ts` | preset/상위 스타일 기반 | 700, 800, 900 |
| `src/components/maps/LocationDiscoveryMapPanel.tsx` | preset `headline`/`caption` | 900 override |
| `src/components/maps/NativeLiteMapPreview.tsx` | preset `caption` | 800 override |
| `src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx` | 14 및 상위 스타일 | 800, 900 |
| `src/components/locationDiscovery/LocationDiscoveryCard.tsx` | preset 기반 | preset 기반 |
| `src/components/locationDiscovery/LocationDiscoverySearchBar.tsx` | preset 기반 | preset 기반 |
| `src/components/locationDiscovery/LocationDiscoveryStatusCard.tsx` | preset 기반 | preset 기반 |
| `src/screens/LocationDiscovery/LocationDiscoveryListScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/LocationDiscovery/LocationDiscoveryDetailScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/LocationDiscovery/NearbyWalkListScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/LocationDiscovery/NearbyWalkDetailScreen.tsx` | preset 기반 | preset 기반 |

### 가이드·콘텐츠 CMS

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/components/guides/GuideListCard.tsx` | preset 기반 | 700, 800, 900 |
| `src/components/guides/GuideAdminListCard.tsx` | preset 기반 | 700, 800, 900 |
| `src/components/guides/GuideRecommendationCard.tsx` | preset 기반 | 700, 800, 900 |
| `src/screens/Guides/GuideListScreen.styles.ts` | 14 및 preset | 600, 700, 800, 900 |
| `src/screens/Guides/GuideDetailScreen.styles.ts` | preset 기반 | 800, 900 |
| `src/screens/Guides/GuideAdminListScreen.tsx` | 14 및 preset | 600, 800, 900 |
| `src/screens/Guides/GuideAdminEditorScreen.tsx` | 14 및 preset | 600, 800, 900 |
| `src/screens/Guides/GuideListScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/Guides/GuideDetailScreen.tsx` | preset 기반 | preset 기반 |
| `src/screens/Guides/GuideAdminEditorScreen.tsx` | 14 및 preset | 600, 800, 900 |

### 알림·설정·공통 화면

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/screens/Notifications/UserNotificationsScreen.tsx` | 11, 12, 14 및 preset | 600, 700, 800, 900 |
| `src/screens/More/MoreScreen.tsx` | 12, 13, 14, 15, 16, 22 | 700, 800, 900 |
| `src/screens/More/MoreDrawerContent.tsx` | 11, 12, 13, 14, 15, 16, 17 | 500, 600, 700, 800 |
| `src/screens/Home/HomeScreen.tsx` | 16 | preset 기반 |
| `src/screens/Common/EditDoneScreen.styles.ts` | preset 기반 | 900 |
| `src/screens/Guestbook/GuestbookScreen.tsx` | 15 및 preset | 600, 700, 800, 900 |
| `src/components/common/ConfirmDialog.tsx` | 15, 19 | 600, 800, 900 |
| `src/components/common/PremiumNoticeModal.tsx` | 11, 15, 20 | 600, 800, 900 |
| `src/components/common/PremiumRewardModal.tsx` | 10, 11, 12, 13, 15, 20, 21, 28 | 600, 800, 900 |
| `src/components/common/GuestLockedState.tsx` | preset 기반 | 600, 800, 900 |
| `src/components/common/ExpandableBodyText.tsx` | preset 기반 | 900 |
| `src/components/common/GlobalToast.tsx` | preset 기반 | 900 |
| `src/components/navigation/HeaderTextActionButton.tsx` | preset 기반 | 900 |
| `src/components/navigation/AppNavigationToolbar.tsx` | preset 기반 | preset 기반 |

### 일정·시간·기타 운영 화면

| 파일 | 직접 fontSize | 직접 fontWeight |
| --- | --- | --- |
| `src/screens/Schedules/ScheduleCreateScreen.styles.ts` | 10 및 preset | 700, 800, 900 |
| `src/screens/Schedules/ScheduleDetailScreen.styles.ts` | preset 기반 | 700, 800, 900 |
| `src/screens/Schedules/ScheduleListScreen.styles.ts` | preset 기반 | 700, 800, 900 |
| `src/components/time-picker/TimePicker.styles.ts` | 24 | 800 |
| `src/screens/DevTest/DevTestScreen.styles.ts` | 공통/개발 화면 스타일 | 별도 direct typography 없음 |

## 3. 해석 기준과 리스크

- 공통 화면은 `AppText preset`을 우선 사용하므로 파일에 `fontSize`가 직접 없다고 해서 폰트가 없는 것이 아니다. 실제 값은 위 공통 preset 표로 해석한다.
- 일부 legacy style은 `900`을 사용한다. 현재 Android에서 정상 렌더링되지만, 향후 폰트 토큰 정규화 시 `800` 또는 semantic `bold`로 통합할 후보이다. 이번 턴에는 시각 리디자인 범위를 넓히지 않았다.
- 화면별 직접 값이 많아 전체 폰트 리뉴얼을 지금 진행하면 커뮤니티·홈·기록·펫 화면의 회귀 범위가 커진다. 폰트 전면 교체는 별도 PO 승인 트랙으로 유지한다.
- 날씨카드의 38px은 전체 앱의 공통 display 토큰이 아니라 레퍼런스 재현을 위한 컴포넌트 전용 예외다.

## 4. 검증 기준

- 기준 코드 커밋: `10f6a00`
- 최신 release APK SHA-256: `df16452225cae4be55bccd9c780008c2fa2ea84724c31ae2e93b7e7df769cb21`
- 실기기: `SM_S937N / R5CY613NMSY`
- Jest: `67 suites / 269 tests` 통과
- typecheck/lint: 통과
- app-scoped fatal scan: 0건
- 실기기 증적: `/tmp/nuri-qa/weather-card-temperature-38px-spacing.png`
