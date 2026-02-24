# NURI App (React Native)

반려동물과의 시간을 “기록”으로 남기는 NURI 모바일 앱 (구현 단계)

---

## 현재 구현 상태

### 1) 기본 실행/부팅 구조

- `index.js`에서 `AppRegistry.registerComponent()`로 앱 부팅
- `App.tsx`에서 `NavigationContainer`로 네비게이션 컨텍스트 제공
- `RootNavigator`에서 Native Stack 기반 화면 라우팅 구성

### 2) 화면 구성

- `Splash(HomeScreen)`

  - 페이드 인 애니메이션 적용
  - 로고(`src/assets/logo/logo.png`) 표시
  - 문구(현재 진행형 톤):
    - “지금 이 순간도, 함께 기록해요”
    - “우리의 시간을 기억으로 남기다”
  - 2초 후 자동으로 `Main` 이동
  - `navigate('Main')`로 이동하여 **Main에서 뒤로가기 가능** 유지

- `Main(MainScreen)`
  - 임시 placeholder 화면
  - 스타일 분리(`MainScreen.styles.ts`) 완료

### 3) 공통 UI

- `AppText` 공통 Typography 컴포넌트 구성
  - preset 기반 타이포 시스템 확장 가능

---
