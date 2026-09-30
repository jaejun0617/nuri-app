# NURI Four-Season Lower Home Tone Unification

## PO Feedback and Following Corrective

PO는 이 통일 후보가 밋밋하다고 판단했다. 현재 source는 통일 덮개를 제거하고 기존 mesh 흐름과 흰 구간 선택 감소로 교정했다. 최신 source와 설치 여부는 `docs/qa/nuri-home-four-season-white-pocket-corrective-2026-09-30.md`를 따른다. 아래는 이 후보의 실제 설치 이력이며 최종 채택 기록이 아니다.

## 1. Result

- PO는 네 계절 Hero의 배경색과 구체는 좋지만, 하단의 흰 구간 때문에 glass가 약하게 보인다고 지적했다.
- 네 계절 모두 하단 색 통일을 적용했다. Hero 주요 색 번짐·구체 재질·배치·빛·현재 UI와 유리 재질은 변경하지 않았다.
- Hero 마지막 16%에서 하단 바탕색으로 부드럽게 연결한다. 최종 PO 시각 승인은 대기다.

## 2. Cause and Scope

- 이전 하단은 near-white base, 큰 ivory/pearl field와 중앙 white wash가 겹쳤다. 흰 구간 위에 흰 유리를 합성하면 표면과 경계의 대비가 약해진다.
- glass opacity를 낮추거나 border를 강화하는 대신 background의 밝기 편차를 줄였다.
- 이전 승인 가을의 Hero descriptor와 세 계절 Hero color field는 유지한다. 가을 하단도 이번 명시적 지시에 따라 변경했다.
- 구체 자산·개수·좌표·크기·하이라이트는 직전 교정본 그대로다. 새 이미지 생성이나 구체 tint 수정은 없다.
- Weather 데이터, UI geometry, section gap, headline, CTA, font, navigation, 바깥 glass 50%, 내부 glass 60%, radius와 shadow/elevation 계약은 유지한다.
- 기존 임시 네 계절 버튼과 전역 자동 계절 판정도 유지한다.

## 3. Rendering

- Owner: HomeAmbientBubbleCanvas 하나. 실제 전체 scroll content bounds를 따르는 non-interactive absolute decoration이다.
- 하단 바탕은 가을 `#FFF0E5`, 겨울 `#E8F3FE`, 봄 `#FCECF1`, 여름 `#E3F7F4`다.
- 하단 color field는 각 바탕보다 밝지 않은 같은 계열 두 색으로 제한하고 opacity를 32%와 24%로 낮췄다. 서로 다른 밝은 white/ivory field를 교차하지 않는다.
- 중앙 흰빛 wash는 Hero 높이에 한정한다. 하단에 별도 white wash를 합성하지 않는다.
- Hero tail에서 투명→하단 색으로 16% 높이의 transition을 적용한다. 하단 field 시작점도 같은 색으로 fade해 section 경계의 갑작스러운 색 전환을 방지한다.
- Weather 연결과 하단 10개 section의 실제 layout anchor를 유지한다. 개별 glass 뒤 backing rectangle이나 새 background owner를 추가하지 않았다.
- 단색 바탕만 남기는 방식이 아니다. 낮은 대비의 diffuse field와 기존 구체·빛이 계속 이어진다. 애니메이션, 새 native dependency, bitmap wallpaper 없음.

## 4. Local Validation

- Node 24.20.0, Yarn 3.6.4.
- TypeScript PASS.
- 대상 ESLint 오류 0, 새 경고 0, 기존 LoggedInHome no-shadow 경고 20개 유지.
- 관련 16개 스위트, 182개 테스트 PASS. full suite 미실행.
- 360 / 400 / 430dp full-content bounds, 구체 치수, 실제 section anchor, Hero tail transition, Hero-only center wash, background pointer/layering와 unchanged glass 검증.
- 추가 4개 테스트는 각 계절 하단 field의 RGB가 바탕보다 밝아져 white pocket을 만드는 token이 없음을 검사한다. 이 검사를 실기기 시각 승인으로 취급하지 않는다.
- git diff --check PASS. UI styles, widget material, 기존 ambientMesh descriptor와 profileEdit palette 변경 없음.
- Supabase, 서버, 원격 운영 변경 없음.

## 5. Release / Install / QA Boundary

- 사용자가 추가 빌드·설치 1회를 명시적으로 승인했다. 이 색 통일 수정의 release 1회, adb install -r 1회 성공.
- Build SUCCESSFUL, 2m25s, verifier ACCEPTED, release embedded bundle, Metro OFF와 Fast Refresh OFF.
- 최신 APK: `/tmp/nuri-home-three-seasons-20260930/nuri-a94279b-lower-tone-55b6784f.apk`.
- SHA-256: `55b6784f93c95efd8e9cb0e3e3fb129554a8bd1224a3d586bec992fcc3689ab8`.
- Galaxy S24 SM_S937N / R5CY613NMSY: install Success, 앱 데이터 유지.
- 이전 세 계절 작업 3회 + 참조 재질 교정 1회 + 이번 색 통일 1회로 누적 release·install은 각 5회다. 이전 설치본과 로그를 보존했다.
- PO의 기기 조작 중단 지시는 유지한다. 승인한 설치 외에는 자동 터치·스크롤·계절 전환·화면 캡처와 cold launch를 하지 않았다.
- 최신 색 통일 설치본의 화면 비교, 네 계절 전체 render/scroll/navigation와 Fatal/ANR/RN Fatal은 미확인이다. 직전 후보의 0건 로그를 최신 후보의 QA로 옮겨 적지 않는다.
- 이번 수정의 screenshot evidence는 확보하지 않았다. 직접 검토 결과를 기다리며 실기기 QA 완료나 최종 색 일치를 선언하지 않는다.

## 6. Documentation and Git

- 이전 참조 교정의 구현·자산 provenance: `docs/qa/nuri-home-three-season-reference-corrective-2026-09-30.md`.
- 최신 project-memory 3개와 release-checklist에 이번 색 통일·추가 설치·QA 경계를 추가했다. 이전 FAIL과 검증 이력은 유지한다.
- HEAD: `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`.
- BRANCH: `codex/task6-community-content-policy`.
- STAGED: NONE. COMMIT: NO. PUSH: NO. PREEXISTING_DIRTY: PRESERVED.
- 다음 한 가지: PO가 현재 설치본의 Hero tail부터 Diary까지 계절별 바탕색과 glass 경계를 직접 검토한다. 추가 작업은 자동 시작하지 않는다.

PO 승인을 기다립니다.
