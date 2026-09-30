# NURI Autumn Glossy Bubble Candidate

## Scope And Source Of Truth

- PO 지시: 최신 Hero 시안을 최대한 가깝게 구현하고, Hero 아래는 작은 버블과 빛으로 이어간다.
- 배경 기준: `Desktop/시안/히어로최종/히어로시안.png`. 참고 범위는 배경, 구체 광택, 색감, 빛 및 edge crop뿐이다.
- UI 기준: 현재 production source와 변경 전 Galaxy S24 UI hierarchy. UI 배치, 문구, 글꼴, 기능은 복사하거나 변경하지 않는다.
- 승인된 프로필 수정 기준 Home glass와 Weather material은 이번 작업에서 다시 조정하지 않는다.
- HEAD: `d2c93dab520fb19a85de1bd992c7e705b2e72c9f`.
- Branch: `codex/task6-community-content-policy`.
- 기존 미커밋 변경 보존. staging, commit, push 없음. 다른 계절 및 다음 작업 자동 시작 없음.

## Implementation

- 하나의 `HomeAmbientBubbleCanvas`가 전체 실제 ScrollView content 뒤를 덮는다. absolute top/bottom, pointerEvents none, 접근성 숨김을 유지한다.
- 기존 Hero 높이를 읽어 버블 위치에만 사용한다. Home 연결부 변경은 `heroHeight={seasonalHeroViewportHeight}` 한 줄이며 content 높이나 scroll 복귀 로직은 변경하지 않는다.
- Hero: 좌측 중단과 우측 하단의 잘린 큰 구체 2개, 작은 구체 5개, 중간 구체 1개, 낮은 강도의 빛 9개.
- Weather부터 하단: 작은 구체 49개와 빛 15개를 남은 실제 content 높이에 비례해 비대칭 분포한다. 이 구간에는 큰 구체나 중간 구체를 사용하지 않는다.
- 색 공기: 12개의 매우 부드러운 warm peach, apricot, blush, pale sky, lilac field와 밝은 중앙 wash. 작은 radial alpha 소재를 tint하여 재사용하므로 field 외곽의 잘린 원이나 native 대형 mask bitmap을 만들지 않는다.
- 구체 소재는 투명 PNG 한 장을 크기, 회전, 투명도를 달리해 재사용한다. 전체 화면 시안이나 wallpaper를 bitmap으로 사용하지 않는다.
- 원본 1254px 소재를 각각 768px 구체, 192px radial glow로 축소했다. 총 압축 크기 708,963 bytes. 두 shared decoded texture의 합계는 약 2.4 MiB이며 별도 native dependency, animation, BlurView는 없다.
- Home glass, Weather, Hero stage, Home styles 파일은 작업 전 복사본과 SHA-256이 각각 동일하다.

## Objective Validation

- Node 24.20.0, Yarn 3.6.4.
- TypeScript 통과.
- 배경 및 테스트 대상 ESLint 오류 0, 경고 0.
- Home 연결 파일은 기존 오류 0, 경고 20과 정확히 동일. 새 오류 및 새 경고 0. 범위 밖 기존 경고를 수정하지 않는다.
- 관련 Jest 6개 스위트, 66개 테스트 통과. full suite는 실행하지 않는다.
- 360dp, 400dp, 430dp 큰 구체 edge crop, 중앙 corridor, 작은 버블 크기, 동적 height 연결, 단일 owner, 접근성 및 non-interactive 계약 확인.
- PNG alpha 확인: 두 asset 모두 모서리 alpha 0. 구체 중앙 alpha 5로 배경 투과, glow 중심 alpha 253에서 외곽 alpha 0으로 점진 감소.
- git diff check 통과.
- Android Release 1회 통과. 빌드 2분 13초, 서명 검증 ACCEPTED, embedded JS bundle, debuggable false, Metro 의존 없음.
- Galaxy S24 `SM_S937N / R5CY613NMSY`에 `adb install -r` 1회 성공. 기존 앱 데이터 보존.
- 설치 APK: `android/app/build/outputs/apk/release/nuri-d2c93da-qa-release.apk`, versionName 1.0, versionCode 1.
- APK SHA-256: `c9509cf54c1ddc3bb2342f6e83f71666488f0c385c28a4b2f81a21f2dc0bef74`.
- 실기기 Home 진입, Hero, Weather, 10개 하단 섹션 scroll 렌더, 날씨 상세 이동 및 복귀, Timeline 하단 메뉴 이동 및 Home 복귀, 맨 위로 돌아가기 확인.
- 변경 전후 Hero 화면의 공통 UI label 46개 bounds 동일. 패널 재질 및 UI source 보존과 함께 확인했으며 모든 off-screen pixel의 자동 대조로 확대 해석하지 않는다.
- 관찰한 화면에서 배경 경계, blank white hole, content 앞의 bubble, 수평 overflow, 패널 clipping, gray outer box 및 새로운 elevation artifact 없음.
- 2026-09-30 12:05:35 KST 이후 확인 구간 NURI PID 11958의 Fatal, ANR, RN Fatal 0건. Red Screen 없음.
- QA 도구 별도 사건: 겹친 UI hierarchy dump에서 UiAutomator PID 12788의 등록 충돌 1건 발생. NURI 프로세스의 crash가 아니며 dump를 순차 재실행해 완료했다. APK 재빌드 및 재설치는 하지 않았다.
- cold-start 뒤 Hero의 관찰 PSS는 307,385 KiB, 하단 scroll 이후 313,010 KiB였다. 이전 후보의 단일 관찰치는 333,398 KiB였으나 캐시와 데이터 상태가 다른 측정이므로 성능 개선률 또는 정식 benchmark로 주장하지 않는다.
- PO 시각 승인: 대기. 픽셀 동일 또는 최종 미적 PASS를 선언하지 않는다.

## Evidence

대표 캡처 6장. 긴 섹션은 한 viewport 안에서 전체가 보이지 않을 수 있으므로 실기기 연속 scroll과 함께 검토한다.

- Hero: `/tmp/nuri-glossy-bubble-20260930/01-hero.png`.
- Weather 및 Frequent 시작: `/tmp/nuri-glossy-bubble-20260930/02-weather-frequent.png`.
- Summary 및 Recent: `/tmp/nuri-glossy-bubble-20260930/03-summary.png`.
- Photo 및 Community: `/tmp/nuri-glossy-bubble-20260930/04-photo-community.png`.
- Community 및 Recommendation: `/tmp/nuri-glossy-bubble-20260930/05-community-recommendation.png`.
- Health, Today Tip, Diary: `/tmp/nuri-glossy-bubble-20260930/06-health-tip-diary.png`.
- 객관 로그와 변경 전후 UI hierarchy: `/tmp/nuri-glossy-bubble-20260930`.
- long-scroll 이미지는 만들지 않았다. 시안 이미지 자체를 증적으로 사용하지 않았다.

## PO Direct Review

1. Hero 좌측 중단과 우측 하단의 잘린 큰 버블이 최신 시안의 크기 관계와 구체 광택에 충분히 가까운가.
2. 밝은 중앙과 warm ivory, peach, blush의 부드러운 공기감이 시안처럼 보이는가.
3. 작은 구체의 광택, 반사, 위치가 과하지 않고 Hero UI를 방해하지 않는가.
4. Hero 아래는 큰 구체의 반복 없이 작은 버블과 낮은 강도의 빛으로 자연스럽게 이어지는가.
5. Weather부터 마지막 일기까지 같은 배경 분위기가 유지되며 중간이 단색 페이지로 느껴지지 않는가.
6. 승인된 유리패널은 그대로인 상태에서 배경색과 버블이 은은하게 비치는가.
7. 글꼴, 위치, 간격, 버튼 및 navigation이 기존 production과 동일한가.
8. 이 후보를 유지할지, 배경 항목만 추가로 교정할지 PO가 직접 결정한다.

## Final State

- 구현 및 객관 검증 완료. Galaxy S24 PO review ready.
- Autumn 배경 시각 승인 대기. 기존 glass 승인은 유지.
- 원격 backend 및 운영 정책 변경 없음. 원격 catalog 확인은 배경-only 작업 범위에 필요하지 않아 실행하지 않았다.
- staging, commit, push 없음. 기존 dirty 보존. Winter, Spring, Summer 추가 구현 없음.
- 자동 다음 작업 없음. PO 시각 검토를 위해 STOP.

## Rollback Boundary

- 작업 시작 시의 배경 source, 연결 source, 테스트 및 승인 glass APK는 `/tmp/nuri-glossy-bubble-20260930/baseline`에 별도 보존했다.
- 되돌릴 때 이번 배경 descriptor, renderer, asset reference 및 연결 한 줄만 대상으로 한다. 작업 이전 dirty UI 및 승인 glass 변경을 git 단위로 되돌리지 않는다.

## Asset Generation

Built-in image generation을 사용했다. CLI/API fallback은 사용하지 않았다. 기존 시안 전체를 추출하거나 변형한 wallpaper가 아니라 재사용할 한 개의 투명 구체를 제작했다. 파일 축소만 `sips`로 수행했으며 alpha를 보존했다.

### Pearl Bubble Prompt

Use case: background-extraction. Asset type: ONE isolated reusable transparent bubble sprite for a production React Native app, not a mockup. Input image role: BACKGROUND BUBBLE MATERIAL REFERENCE ONLY; ignore all phone UI, text, photo, buttons and layout. Reconstruct a single COMPLETE ROUND glass/soap bubble matching the reference's large cropped left bubble and bottom-right bubble material. Center one full circle in a square with narrow transparent margin, approximately 90% diameter. Genuine transparent RGBA background outside and semi-transparent interior so app's ivory background shows through. Thin luminous ivory rim, broad curved soft white reflections at upper left and upper right; warm peach/golden ivory lower, translucent blush pink and faint lilac upper. Internal soft refracted filaments and a few tiny diamond reflections, airy low saturation high key. Mostly clear interior NOT opaque ball. No dark outline, cast shadow, neon, extra bubbles, surrounding sparks, wallpaper, UI, letters, animals or background rectangle. Warm pearl soap bubble finish. Only one isolated bubble.

Saved project asset: `src/assets/seasonal/home/autumn/bubbles/pearl-bubble-v1.png`.

### Radial Glow Prompt

Use case: background-extraction. Asset type: tiny reusable alpha falloff sprite for a static React Native ambient color field, NOT a finished background or illustration. Generate ONE perfectly smooth white radial glow only. Square framing. Bright white softly opaque center fading continuously to fully transparent toward every outer edge. The outer 25 percent must be fully transparent. Gaussian-like soft elliptical light diffusion with no visible circle, ring, border, texture, particles, stars, reflections, objects, text or other details. The center is pure white, no color; actual alpha transparency encodes gradual opacity. No background rectangle, checkerboard, black backdrop or gray background. This is only a small reusable neutral light falloff that the app tints peach, ivory, or pale lilac. Very soft continuous feathering, anti-banding. White alpha glow centered, clean RGBA transparency.

Saved project asset: `src/assets/seasonal/home/autumn/bubbles/soft-radial-glow-v1.png`.
