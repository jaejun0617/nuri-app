# NURI Winter / Spring / Summer Reference Corrective

## Following PO Lower-Tone Corrective

PO는 Hero 색감·구체를 긍정 평가하고 가을을 포함한 하단 white pocket 감소를 요청했다. 추가 빌드·설치 1회도 승인했다. 최신 설치와 현재 QA 경계는 `docs/qa/nuri-home-four-season-lower-tone-2026-09-30.md`를 따른다. 아래는 직전 참조 재질 후보의 실제 이력이다.

## 1. Current State

- 사용자 지시: 첨부한 겨울·봄·여름 시안의 색감, 구체, 빛과 배경을 다시 맞추고 현재 UI를 유지한다.
- IMPLEMENTATION: COMPLETE. LOCAL_VALIDATION: PASS. PO_VISUAL_APPROVAL: PENDING.
- 기기에서 PO 직접 검토가 시작됐고 사용자가 기기 조작 중단을 요청했다. 이후 추가 터치·스크롤·계절 전환·캡처를 하지 않는다.
- 이전 단색 tint 후보의 FAIL 이력은 `docs/qa/nuri-home-three-season-preview-2026-09-30.md`에 보존한다. 현재 설치본은 아래 새 APK다.

## 2. Source of Truth and Analysis

- 정확한 참조 파일: `/Users/shinjaejun/Desktop/시안/겨울시안.png`, `/Users/shinjaejun/Desktop/시안/봄시안.png`, `/Users/shinjaejun/Desktop/시안/여름시안.png`.
- 현재 UI 기준: 승인 가을 `b63fb1c771d3cf1bcd56ebd4f21195f288b9a14d`, HEAD `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`.
- 겨울은 sky blue / ice white / lilac pearl이다. 봄은 rose pink / cream / pale mint다. 여름은 aqua / mint / ivory와 작은 lemon rim이다. 가을 peach/gold에 단색을 얹는 방법은 이 재질을 재현하지 못한다.
- 이전 color field는 전체 Home 길이의 비율로만 배치돼 Hero 한 화면 안에 필요한 복수 색 중심이 들어오지 않았다. 기존 계절 UI 토큰도 시안 밖의 로고·날씨 전경색 변화를 일으켰다.
- 참조의 UI 크기, 문구, 줄바꿈과 live Weather 데이터는 복사하지 않았다. 생성 시안과 production geometry가 다르므로 픽셀 동일이나 최종 완전 일치는 선언하지 않는다.

## 3. Implementation

- Owner: `HomeAmbientBubbleCanvas` 하나. absolute full-content bounds, pointerEvents none, accessibility hidden, 기존 content 뒤에 위치한다.
- 가을 구체를 덧칠하는 반사층을 제거했다. 겨울·봄·여름마다 하나의 RGBA pearl texture를 재사용한다. 각 구체의 실제 화면 크기를 명시해 intrinsic image 크기 회귀를 막는다.
- 세 계절 Hero 색 번짐은 Hero 실제 높이에 고정했다. Weather 연결부는 Hero 끝과 lower Home 시작 사이의 실제 간격을 사용한다.
- 하단 field는 기존 10개 section layout anchor를 사용해 높이 변경을 따라간다. 개별 section에 background owner나 backing rectangle을 추가하지 않는다.
- 계절별 밝은 base와 여러 diffuse radial mask를 겹치고 중앙 wash는 12%다. 승인 가을의 base, 12개 field, 38% center wash, 구체 배치와 빛은 유지한다.
- 흰빛 glint와 옅은 계절 halo를 사용한다. animation, particle, 새 native dependency와 전체 화면 bitmap wallpaper는 없다.
- 선택 배경 계절과 Home foreground 계절을 분리했다. `HOME_PREVIEW_UI_SEASON = autumn`으로 승인 로고·greeting·Hero halo·Weather·profile entry·유리 재질을 유지한다. 전역 계절 판정은 변경하지 않는다.
- 바깥 Home glass 50%, 내부 glass 60%, border, radius, section gap, headline, CTA, 글꼴 경계, 데이터와 navigation은 보존한다. 임시 네 계절 버튼은 유지한다.
- `ambientMesh.ts`, Home styles, Widget material, Frequent source, 기존 seasonal home/profileEdit/weather palette source는 HEAD와 동일하다. Home 하위 UI 정의 구간도 동일하다.

## 4. Local Validation

- Node 24.20.0 / Yarn 3.6.4.
- TypeScript PASS.
- 대상 ESLint 오류 0, 새 경고 0. 기존 LoggedInHome no-shadow 경고 20개 유지.
- 관련 16개 스위트, 178개 테스트 PASS. Full suite는 실행하지 않았다.
- 360 / 400 / 430dp canvas, 구체 크기, 실제 section field anchor, background pointer/layering, 바뀌지 않는 glass와 content mount, 임시 버튼 선택을 검사했다.
- RGBA 자산 세 개는 1254×1254, 약 1.1~1.3MB이며 네 모서리 alpha 0이다. 원본 가을 자산은 덮어쓰지 않았다.
- git diff --check PASS. Supabase, backend, 원격 운영 변경 없음.

## 5. Release and Device Boundary

- 이번 명시적 corrective의 Android release 1회, adb install -r 1회 성공. 이전 단계의 3회와 합쳐 누적 각 4회다. 이전 APK와 로그는 보존했다.
- Build SUCCESSFUL, 2m42s, 952 tasks, release verifier ACCEPTED, embedded bundle. Metro OFF, Fast Refresh OFF.
- APK: `/tmp/nuri-home-three-seasons-20260930/nuri-a94279b-reference-corrective-cc28e0f2.apk`.
- SHA-256: `cc28e0f2f03e89029ff8db383bc29d38dfd09523792279b3344708358a53ccb7`.
- Galaxy S24 SM_S937N / R5CY613NMSY 설치 성공, 앱 데이터 유지, cold Home 실행 확인.
- 최신 가을 Hero의 유일한 공통 label 13개 bounds는 승인 baseline과 모두 동일하다. 이 비교를 세 계절 전체 geometry 실측으로 확대하지 않는다.
- 겨울 Weather / Frequent와 여름 Health / Tip / Diary에서 새 색과 구체를 관찰했다. 그러나 PO 직접 조작과 겹쳐 XML dump가 idle 상태를 확보하지 못했고 PNG와 XML의 상태가 달랐다. 해당 XML은 최신 화면과 일치하는 geometry 증거로 사용하지 않는다.
- 세 계절 Hero 전체, 모든 하단 section, 계절 전환 시 scroll 위치, touch/navigation의 최신 통제 실기기 QA는 미완료다. 봄의 실제 합성 화면은 미확인이다.
- 19:03:54~19:06:48 KST, PID 22334 수집 로그에서 FATAL EXCEPTION / 앱 ANR / RN Fatal 0건. 관찰 화면 Red Screen 없음. 이후 PO 직접 검토 구간의 장애 여부는 미확인이다.
- 최종 target match와 가독성, 하단 색감의 미적 판단은 PO에게 남긴다. 자동 미세조정 재빌드 없음.

## 6. Evidence and Logs

- 가을 Hero: `/tmp/nuri-home-three-seasons-20260930/reference-01-autumn-hero.png`.
- 겨울 Weather: `/tmp/nuri-home-three-seasons-20260930/reference-05-winter-weather.png`.
- 여름 Diary: `/tmp/nuri-home-three-seasons-20260930/reference-12-summer-diary.png`.
- 마지막 두 PNG는 관찰용이며 같은 이름 XML과 동기화된 증거가 아니다.
- `reference-corrective-build.log`, `reference-corrective-install.log`, `reference-corrective-runtime.log`, `reference-corrective-tests.log`, `reference-corrective-eslint.json`은 위 디렉터리에 있다.

## 7. Git and Next Action

- HEAD: `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`.
- BRANCH: `codex/task6-community-content-policy`.
- STAGED: NONE. COMMIT: NO. PUSH: NO.
- 기존 문서 body, unrelated research dirty, Supabase temp와 미사용 가을 이미지 hash를 보존했다.
- 다음 한 가지: PO가 현재 설치본을 직접 검토한다. 기기 조작과 추가 작업은 대기한다.
- 최종 승인 후 별도 종료 절차에서 임시 버튼 제거와 재검증, 선별 커밋·푸시를 진행한다. 이번 턴에는 시행하지 않는다.

## 8. Asset Provenance

Built-in image_gen 편집 경로를 사용했다. CLI/API fallback은 사용하지 않았다. 입력 1은 승인 가을 pearl 편집 원본, 입력 2는 해당 계절 사용자 참조이며 UI는 생성하지 않았다. 원본을 유지하고 다음 versioned 자산을 workspace에 복사했다.

- Winter: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/assets/seasonal/home/winter/bubbles/pearl-bubble-reference-v1.png`, SHA-256 `0671efbcc1099c3d6a29bb850aabf00cd15bdf681809484b2ce4cc9f63b90de3`.
- Spring: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/assets/seasonal/home/spring/bubbles/pearl-bubble-reference-v1.png`, SHA-256 `1c728186a3562ac7fc2fe4ea0a243a439586e4c1d18a6deb2b59062fe4fc837c`.
- Summer: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/assets/seasonal/home/summer/bubbles/pearl-bubble-reference-v1.png`, SHA-256 `0bb0703b50b55c651e36b2c30c47941f29d45d6c0d3afce2aaa22f6993c06831`.

### Final Prompts

Winter:
Use case: lighting-weather. Asset type: production reusable transparent winter pearl-bubble texture for a React Native background, NOT a UI mockup. Input image 1 is the exact editable original sphere; preserve its circular silhouette, centered composition, relative diameter, thin luminous rim, pearlescent wisps and white specular highlight detail. Input image 2 is a WINTER COLOR/MATERIAL REFERENCE ONLY: inspect the large edge-cropped bubbles and small bubbles in its two phone panels. Change ONLY the sphere's reflected color material to match that reference as closely as possible: translucent icy white, pale sky blue and pearl lilac, with delicate pink-violet iridescence at the rim and only an extremely tiny pale butter glint. Remove the dominant peach/orange/yellow of image 1. Center should be luminous cool pearl, softly translucent; rim should remain glossy and finely detailed, not a flat tinted disk. One complete sphere centered in a square canvas, approximately 91% of canvas width, same scale and margins as image 1. Actual transparent alpha outside the sphere; no background whatsoever, no opaque white rectangular canvas, no checkerboard pixels, no shadow or ground, no extra objects, no UI, no text, no snowflakes, no floral elements. Preserve the visual texture richness so it works at both 20dp and 250dp.

Spring:
Use case: lighting-weather. Asset type: production reusable transparent spring pearl-bubble texture for a React Native background, NOT a UI mockup. Input image 1 is the exact editable original sphere; preserve its circular silhouette, centered composition, relative diameter, thin luminous rim, pearlescent wisps and white specular highlight detail. Input image 2 is a SPRING COLOR/MATERIAL REFERENCE ONLY: inspect the large edge-cropped bubbles and small bubbles in its two phone panels. Change ONLY the sphere's reflected material to match that reference: luminous blush pink and pale rose pearl, white upper reflections, faint peach-ivory at the bottom rim, very slight lavender iridescence. Reduce dominant orange/gold substantially. The sphere must retain translucent delicate reflective texture, NOT a flat pink disk. One complete sphere centered in a square canvas, approximately 91% of canvas width, same margins and scale as image 1. Actual transparent alpha outside the sphere; no background, no opaque white square, no checkerboard pixels, no shadow or ground, no extra objects, no UI, no text, no flowers or leaves. Preserve fine texture at 20dp and 250dp. Soft pastel rather than saturated magenta.

Summer:
Use case: lighting-weather. Asset type: production reusable transparent summer pearl-bubble texture for a React Native background, NOT a UI mockup. Input image 1 is the editable original Autumn sphere; preserve its circular silhouette, centered composition, relative diameter, luminous thin rim, pearlescent wisps and bright white specular highlights. Input image 2 is SUMMER COLOR/MATERIAL REFERENCE ONLY: inspect the large left cropped sphere and right bottom sphere, and the small bubbles in both phone panels. Change ONLY the sphere's material colors to match: pale turquoise/aqua and sky-cyan pearl at center, soft mint reflections, tiny pale lime/lemon glints at lower rim, white glossy reflections and delicate faint lavender in isolated rim wisps. Remove dominant peach, rose pink, orange and gold. Should look translucent aquamarine glass pearl, NOT a flat cyan disk, not dark or saturated teal. One complete sphere centered in a square canvas approximately 91% of canvas width, original scale and margins. Actual transparent alpha outside sphere. No backdrop, no opaque white square, no checkerboard pixels, no ground, no shadow, no extra objects, no UI/text, no leaves, no flowers. Preserve intricate bright pearlescent rims so it works at 20dp and 250dp.

PO 승인을 기다립니다.
