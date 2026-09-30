# NURI Home Layered Glass Recommendation Candidate Report

작성: 2026-09-30. 구현·객관 검증 및 PO 직접 승인 기록이다.

최신 설치본은 후속 문구 수정까지 포함한 SHA-256 `3db179257623a599e344c9e04f3231b85c711fb4283464e4b8660efe39e70069`다. 추가 빌드·설치 승인과 결과는 3번에 기록한다. 6번과 7번의 기존 증적은 첫 설치 후보 이력이다.

PO는 최신 설치본에 대해 `직접 검증 완료 . 커밋 후 작업대기`를 지시했다. 최종 시각 승인과 선별 커밋 승인은 완료됐다. 아래 구현·설치 과정의 승인 대기는 당시 이력이며, 이번 종료에서는 앱 코드 변경·추가 빌드·설치·push 없이 승인된 변경만 커밋하고 대기한다.

커밋 직전 Node 24.20.0·Yarn 3.6.4, TypeScript와 관련 12개 스위트 106개 테스트를 다시 확인했다. 누적 커밋 범위 source·테스트 19개 파일의 ESLint 오류는 0개이며 기존 경고는 23개다. Home 연결 파일 20개와 Community 파일 3개의 진단을 기준 HEAD와 대조해 새 경고 0개를 확인했다. 설치 검증 당시의 경고 20개는 더 좁은 검사 범위의 이력이다. staged diff와 전체 diff check 모두 PASS다.

## 1. 작업 범위와 기준

- PO가 내부 위젯과 전체 기록 한 줄 요약 CTA를 유리 재질로 통일하고, 추천 팁을 첨부 시안의 이중 유리 구성으로 구현하도록 승인했다. Home 헤드라인의 크기 조정도 허용했다.
- 현재 production source가 데이터·기능·Hero·Weather의 기준이다. `우리아이추천팁시안.png`는 추천 영역의 제목 계층, 원형 아이콘, 내부 유리 카드와 태그 구성의 기준이다.
- 시안의 낙엽 wallpaper, 장식 headline icon, 샘플 글과 오렌지 고정 테마는 옮기지 않았다. 기존 Home bubble canvas, 선택 펫 색상, 실제 추천 카탈로그를 유지한다.
- 기존 dirty를 유지했다. 코드 변경은 5개 source 파일, 관련 테스트 2개다. 원격 운영 및 다른 계절 변경은 없다.

## 2. 구현 결과

- 자주 쓰는 기록 4개, 전체 요약 4개, 전체 기록 한 줄 요약 CTA와 추천 카드에 같은 내부 유리 재질을 적용했다. 내부 warm-white 채움은 88%에서 60%로 낮췄고, 반사광은 상단 66%에서 14%, 하단 3%로 정리했다.
- 내부 표면은 white border 76%, top rim 98%, lower edge warm-neutral 18%다. 내부 카드 자체의 shadowOpacity와 elevation은 0이다. 바깥 Home glass 50%와 Profile Edit 70%는 변경하지 않았다.
- 일반 Home 제목은 20dp/28dp로 정리했다. 추천 팁만 `우리 아이를 위한` 22dp/30dp와 `추천 팁` 30dp/38dp의 두 단계다. CTA의 고정 폭, 중앙 label, 오른쪽 화살표와 이동 목적지는 유지했다.
- 추천 카드는 원형 분류 아이콘, 실제 제목, 전체 폭 설명, 실제 카탈로그 태그 최대 3개, 원형 상세 화살표로 구성했다. 태그는 공백 제거·중복 제거 후 사용하며 시안의 예시 태그를 만들지 않는다.
- 카드 높이는 내용에 따라 자연스럽게 결정된다. 제목은 최대 3줄, 요약은 최대 4줄이고 태그는 줄바꿈을 허용한다. 기존 memorial, loading, error, empty 및 추천 선택 경로는 보존했다.
- 추천 카드 높이와 헤드라인은 이번 지시로 변경된 범위다. 전체 UI geometry delta 0으로 보고하지 않는다. Hero, Weather, 기존 기록 위젯 geometry와 navigation은 보존했다.

## 3. 설치 후 추가 지시의 상태

첫 설치 후 PO가 다음 두 문구 수정을 지시했다. 별도 추가 빌드·설치 승인 뒤 두 변경 모두 Galaxy S24에 반영했다.

- Home 추천 카드의 `파충류 · 전 연령`, `공통 · 전 연령` audience caption 표시 부분을 모두 제거했다. 추천 대상 판정용 species·age 데이터와 상세 화면은 제거하지 않았다. 분류명과 실제 태그는 유지했다.
- 안내 문구에 명시적 줄바꿈을 넣었다: `아이의 건강한 하루를 위한` 다음 줄에 `맞춤형 팁을 확인해보세요.`
- 이 두 변경 이후에도 TypeScript, 같은 대상 lint 및 12개 스위트 105개 테스트를 다시 통과했다.
- PO가 두 종류의 caption 제거를 다시 명시하여 파충류와 공통 카탈로그 양쪽의 회귀 테스트를 보완했다. 보완 후 TypeScript, 대상 테스트 lint, 2개 스위트 11개 테스트와 diff check PASS. 추가 source 변경이나 빌드·설치는 없다.
- 기존 Release·설치 각 1회 계약을 준수하여 자동 추가 빌드하지 않았다. PO가 추가 1회 진행을 승인한 뒤 Release 1회와 `adb install -r` 1회를 완료했다. 시각 최종 승인이나 Git closeout 승인으로 해석하지 않는다.

### 승인된 후속 설치 결과

- 추가 source 변경 없이 문구 수정본을 빌드했다. Node 24.20.0, Yarn 3.6.4, TypeScript PASS, 대상 lint 오류 0개·새 경고 0개·기존 경고 20개, 관련 12개 스위트 106개 테스트 PASS, diff check PASS다.
- build timestamp: 2026-09-30 16:31:08 KST. Release verifier ACCEPTED, application ID `com.nuri.app`, version 1.0/code 1, debuggable false, cleartext false, embedded JS bundle, Metro OFF. 이번 승인에 따른 빌드·설치는 각각 1회이며 첫 후보와 합쳐 총 2회다.
- 최신 APK: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/android/app/build/outputs/apk/release/nuri-d2c93da-qa-release.apk`.
- 최신 APK SHA-256: `3db179257623a599e344c9e04f3231b85c711fb4283464e4b8660efe39e70069`.
- 최신 보존 APK: `/tmp/nuri-home-layered-glass-20260930/nuri-d2c93da-copy-refined-3db17925.apk`. 이전 후보 APK도 별도 보존했다. 앱 데이터 유지, 저장·원격 운영 변경 없음.
- Galaxy S24에서 `파충류 · 전 연령`, `공통 · 전 연령` caption 모두 없는 것을 확인했다. 안내는 지정한 두 줄이며 제목·본문 겹침이 없다. 실제 분류·태그와 상세·전용 목록의 대상 정보는 유지한다.
- Hero, Weather부터 10개 Home section과 Diary 끝까지 scroll 확인. Hero 공통 label 43개 bounds는 변경 전 baseline과 동일하다. 추천 상세·전체 목록 이동과 복귀, 맨 위로 이동과 Bottom Navigation을 확인했다. 기기는 Hero 시작 화면으로 준비했다.
- 16:31:29~16:41:34 KST, PID 9351 확인 구간 FATAL 0, ANR 0, RN Fatal 0, Red Screen 없음. 로그: `approved-copy-app-logcat.txt`, `approved-copy-window-logcat.txt`.
- 최신 대표 화면: `/tmp/nuri-home-layered-glass-20260930/approved-copy-recommendation.png`. 같은 이름 XML과 `approved-copy-*.xml`은 최신 UI·이동·전체 section 확인 증적이다.
- 그림자는 추가하지 않았다. 바깥 유리·Weather·Hero·bubble 등 보존 대상 9개 source는 baseline과 동일하다. 360dp·430dp 물리 기기 QA는 여전히 미확인이다.
- 디스크 전 41GiB, 후 40GiB, 정리 없음, 회수 공간 0. 기존 source·dirty·이전 APK·최신 APK·QA 증적을 모두 보존했다.

## 4. 그림자에 대한 판단

PO는 위젯 아래에 조금 더 그림자를 주면 시안과 가까워질지 질문했다. 현재 후보는 반사광·rim·아래쪽 edge로만 깊이를 만들기 때문에 떠 있는 느낌은 절제돼 있다. 아주 약하고 짧은 내부 위젯 전용 그림자는 분리감을 보완할 여지가 있다.

권장은 바깥 섹션 유리에 그림자를 다시 넣는 것이 아니라 내부 위젯에만 제한적으로 시험하는 것이다. 이전 Android 회색 backing 문제를 고려해 강한 elevation, 넓은 shadow wrapper나 중복 불투명 backing은 사용하지 않는다. 이 제안은 아직 구현하지 않았고 실기기 효과도 미확인이다.

이번 표면은 반투명 채움과 gradient 반사광이며 실제 배경 blur·굴절 효과가 아니다. 바깥 50%와 내부 60%가 중첩되어 여전히 밝고 약간 유백색으로 보인다. 시안과 같은 깊이의 최종 판정은 PO에게 남긴다.

## 5. 보존 대조

작업 전후 아래 9개 파일은 byte 동일하다.

- `HomeSectionGlass.tsx`, `WeatherGuideHomeCard.tsx`
- `SeasonalHomeAutumn.tsx`, `HomeAmbientBubbleCanvas.tsx`, `theme/home/ambientMesh.ts`
- `SectionHeaderAction.styles.ts`, `CommunitySection.tsx`
- `FrequentRecordsSection.tsx`, `FrequentRecordsSection.styles.ts`

Hero의 공통 UI label 49개 bounds를 변경 전 evidence와 대조해 동일함을 확인했다. 기존 섹션 간격, 투명 root, 한 canvas owner, bubble touch 차단 없음, Bottom Navigation과 선택 글꼴 경계는 보존한다. 실제 추천 guide ID와 기존 navigation callback을 유지한다.

## 6. 첫 설치 후보 검증 이력

- Node: 24.20.0. Yarn: 3.6.4.
- TypeScript: PASS. 대상 ESLint: 오류 0개, 기존 no-shadow 경고 20개, 새 경고 0개. 변경 전후 경고 진단은 위치 번호를 제외하고 동일하다.
- 관련 테스트: 12개 스위트, 105개 테스트 PASS. 전체 테스트는 실행하지 않았다.
- git diff --check: PASS.
- 대상: 내부 유리, 공통 제목·CTA, 4개 기록 진입, 실제 guide 내용·태그·callback, font 경계, 바깥 glass, bubble canvas, 추천 카탈로그·종별 정책, weather transition, Home top button.
- 실기기 약 384dp 폭에서 확인했다. 다른 360dp·430dp 물리 기기 확인은 미확인이다. flexible width와 자동 높이, 긴 제목 계약은 대상 테스트로 확인했다.
- 서명 검증된 Android QA Release 1회, `adb install -r` 1회 Success. 앱 데이터 유지, Metro OFF, embedded JS bundle, debuggable false, cleartext false, verifier ACCEPTED.
- 첫 후보 APK는 아래 보존 경로에 남겼다. canonical build output은 3번의 최신 설치본으로 갱신됐다.
- APK SHA-256: `8a2ded488a6c394d9121f152501c9ad24ad1e1a2dc7043b060fd355adbe61e4e`.
- 보존 APK: `/tmp/nuri-home-layered-glass-20260930/nuri-d2c93da-layered-glass-8a2ded48.apk`.
- build timestamp: 2026-09-30 15:43:59 KST. 이 APK는 위 3번 후속 문구 수정 전 후보다.
- 기기: Galaxy S24, SM_S937N, R5CY613NMSY. 15:45:27~16:09:15 KST, PID 5860 확인 구간 FATAL 0, ANR 0, RN Fatal 0, Red Screen 없음. 전체 Home scroll, Hero·Weather·10개 section, Diary 끝과 Bottom Navigation을 확인했다.
- 전체 기록 한 줄 요약에서 Timeline 이동·Home 복귀, 추천 카드에서 해당 guide 상세 이동·복귀, 추천 `전체 보기`에서 guide 목록 이동·복귀를 확인했다. 저장 및 원격 데이터 변경은 하지 않았다.
- 첫 launch의 잘못된 Activity 지정은 ADB 실행 오류이며 앱 crash가 아니다. 실제 `com.nuri.app/com.nuri.MainActivity`로 실행했다. 추가 설치는 하지 않았다.
- 디스크 여유 41GiB. 정리 없이 기존 source, baseline APK와 evidence를 보존했다.

## 7. 대표 증적

다음은 첫 설치 후보의 증적이며 후속 문구 수정의 증적이 아니다. 최신 문구 수정 화면은 3번의 `approved-copy-recommendation.png`다.

- Hero: `/tmp/nuri-home-layered-glass-20260930/01-hero.png`
- Weather와 기록: `/tmp/nuri-home-layered-glass-20260930/02-weather-frequent.png`
- Summary와 한 줄 요약: `/tmp/nuri-home-layered-glass-20260930/04-summary-insight.png`
- Community와 추천 시작: `/tmp/nuri-home-layered-glass-20260930/06-community-recommendation.png`
- 추천 카드 전체: `/tmp/nuri-home-layered-glass-20260930/08-recommendation-full.png`
- Health와 Tip: `/tmp/nuri-home-layered-glass-20260930/11-health-tip-diary.png`
- Tip와 Diary 끝: `/tmp/nuri-home-layered-glass-20260930/12-tip-diary.png`
- 로그와 전후 source: `/tmp/nuri-home-layered-glass-20260930/`.

## 8. PO 확인 항목

1. 내부 위젯과 한 줄 요약 CTA가 불투명 흰 카드보다 유리 위에 놓인 얇은 유리처럼 느껴지는가.
2. 4개 기록 위젯과 4개 Summary 위젯의 재질·깊이 계층이 일관적인가.
3. 추천 팁의 두 단계 제목과 내부 두 유리 카드가 시안의 계층감을 전달하는가.
4. 배경과 버블이 은은하게 투과되면서 실제 내용의 가독성을 유지하는가.
5. Hero, Weather, 기존 섹션 간격과 전체 보기 이동 방식이 유지됐는가.
6. 내부 위젯에만 추가적인 약한 그림자 시험이 필요한가. 현재는 미적용이다.

## 9. Git과 최종 상태

- 설치본 빌드의 기준 HEAD: `d2c93dab520fb19a85de1bd992c7e705b2e72c9f`. 당시 승인 대상 미커밋 변경을 포함한 APK이며 종료 커밋 뒤 새로 빌드한 APK가 아니다.
- Branch: `codex/task6-community-content-policy`.
- Git 종료 범위: 승인된 Home 변경·의존 파일·관련 테스트·기록의 선별 staging과 로컬 commit. Push: NO. 관련 없는 preexisting dirty: PRESERVED.
- 설치 후보: PO_DIRECT_VERIFIED_APPROVED.
- 후속 두 문구 수정: INSTALLED_VALIDATED_PO_APPROVED.
- 추가 그림자: NOT_IMPLEMENTED.
- 다른 계절과 다음 기능: NOT_STARTED. 자동 다음 작업: NO.
- 다음 액션 하나: 로컬 커밋 후 새 PO 지시를 기다린다.

PO 직접 검증과 승인을 완료했으며, 커밋 후 다음 지시를 기다립니다.
