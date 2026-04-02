# 긴 폼 화면 KeyboardController 단일 스크롤 표준안

## 문서 목적

- Android 실기기에서 긴 폼 화면의 키보드 대응을 한 가지 방식으로 잠근다.
- `adjustResize` + 라이브러리 자동 스크롤 + 수동 키보드 inset padding이 겹치며 생기던 레이아웃 점프를 다시 열지 않게 한다.
- 새 입력 화면을 만들 때 재사용할 수 있는 코드 계약과 금지 패턴을 명확히 남긴다.

## 적용 대상

- 스크롤 기반 긴 폼 화면
- 예: 생성/수정 폼, 단계형 온보딩 폼, 하단 CTA가 스크롤 마지막에 자연스럽게 따라오는 화면

현재 적용 완료 화면:

- `src/screens/Schedules/ScheduleCreateScreen.tsx`
- `src/screens/Pets/PetProfileEditScreen.tsx`
- `src/screens/Pets/PetCreateScreen.tsx`

현재 강제 대상에서 제외하는 구조:

- 중앙 모달 입력
- 하단 고정 composer 구조
- 댓글/채팅처럼 `본문 + 리스트 + 하단 입력창`이 공존하는 화면
- `RecordCreate`처럼 별도 UX 롤백 판단이 이미 잠긴 화면

## 표준 구조

1. 최외곽 키보드 대응 컨테이너는 `react-native-keyboard-controller`의 `KeyboardAwareScrollView` 하나만 쓴다.
2. `contentContainerStyle.paddingBottom`은 `insets.bottom + 32` 같은 정적 안전값으로 둔다.
3. CTA는 `absolute`로 띄우지 않고 스크롤 뷰의 마지막 자식으로 넣는다.
4. 스크롤 중 키보드는 닫히지 않게 유지한다.
5. 하단 입력 포커스 보정은 필요한 필드에서만 `assureFocusedInputVisible()`로 처리한다.

## 필수 코드 계약

```tsx
<KeyboardAwareScrollView
  ref={scrollRef}
  contentContainerStyle={[
    styles.scrollContent,
    { paddingBottom: insets.bottom + 32 },
  ]}
  keyboardDismissMode="none"
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
  <View style={styles.card}>{/* form fields */}</View>

  <View style={styles.footerActions}>
    <TouchableOpacity>{/* CTA */}</TouchableOpacity>
  </View>
</KeyboardAwareScrollView>
```

포커스 보정이 필요한 경우:

```tsx
const handleFocusVisibleInput = useCallback(() => {
  requestAnimationFrame(() => {
    scrollRef.current?.assureFocusedInputVisible();
  });
}, []);
```

## 금지 패턴

- `useKeyboardInset`으로 `paddingBottom`을 동적으로 흔드는 방식
- `keyboardInset + n` 같은 수동 하단 여백 공식
- `KeyboardAvoidingView`와 `KeyboardAwareScrollView`의 중첩
- `keyboardDismissMode="on-drag"` 또는 스크롤 중 dismiss 허용
- CTA를 `position: absolute`로 띄우는 구조
- 구형 `react-native-keyboard-aware-scroll-view` API에 새 화면을 추가하는 것

## 이유

- Android `adjustResize`가 이미 루트 레이아웃 크기를 바꾸는데, 여기에 동적 padding과 추가 자동 스크롤을 겹치면 레이아웃이 이중, 삼중으로 반응한다.
- 긴 폼은 하단 CTA를 억지로 키보드 위에 붙이는 방식보다, 스크롤 흐름 안에서 자연스럽게 내려가게 두는 편이 흔들림이 적고 유지보수도 쉽다.
- `keyboardDismissMode="none"`과 `keyboardShouldPersistTaps="handled"` 조합이 있어야 키보드를 유지한 채 스크롤하고, CTA도 한 번에 누를 수 있다.

## 실무 적용 규칙

- 새 긴 폼을 만들면 먼저 이 문서를 기준으로 구현한다.
- 예외 구조가 필요하면 이 문서 위에 덧칠하지 말고, 예외 문서를 별도로 만든다.
- 실기기에서 검증하지 않은 keyboard UX는 문서상 완료로 올리지 않는다.

## 검증 체크

- 키보드가 열린 상태에서 위아래 스크롤해도 키보드가 닫히지 않는가
- 하단 CTA가 키보드가 열린 상태에서도 한 번의 터치로 눌리는가
- 하단 입력 포커스 시 화면이 튀지 않고 필요한 만큼만 올라오는가
- `useKeyboardInset` 기반 수동 padding 계산이 남아 있지 않은가
