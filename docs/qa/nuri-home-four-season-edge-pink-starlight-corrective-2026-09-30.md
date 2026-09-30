# NURI Four-Season Edge Color, Spring Pink and Starlight Corrective

## Subsequent PO Review

- PO는 이번 색감이 거의 승인에 가깝다고 판단하고 Hero 아래 cropped 구체·complete 구체·별빛의 비율과 위치만 마지막 보완하도록 지시했다. 최종 승인은 아직 아니다.
- 후속 설치와 요청된 디스크 정리는 `nuri-home-four-season-three-family-balance-2026-09-30.md`를 따른다. 이 보고서의 `1e3291e6` APK는 직전 검토 기준으로 보존했다. 더 오래된 후보 APK 6개는 후속 보고서의 삭제 목록을 따른다.

## 1. PO Decision and Scope

- PO는 직전 후보의 네 계절 하단 좌우 흰 번짐, 봄의 에메랄드색, 하단에서 구체만 두드러지는 구성을 이유로 승인을 거절했다. 기존 색 이동은 유지하되 흰 구간을 줄이고, 봄은 발랄한 분홍색으로, 하단은 구체와 Hero 별빛의 균형으로 보정한다.
- 첨부 4장은 현재 후보의 결함 증거다. 새 UI 배치나 구체 재질의 source of truth로 사용하지 않는다.
- 이번 변경은 배경 소스 2개와 테스트 2개다. `src/theme/home/seasonalAmbient.ts`, `src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas.tsx`, `__tests__/homeSeasonalAmbient.test.tsx`, `__tests__/homeAmbientBubbleCanvas.test.ts`를 수정했다.
- 위험도는 Medium이다. 전체 Home의 합성 색이 달라지므로 미적 판단은 실기기 PO 검토가 필요하다. 데이터, navigation, Supabase와 원격 운영은 변경하지 않는다.

## 2. Cause and Corrective

- 거의 흰 기본 바탕 위에서 diffuse field 사이에 색이 약한 구간이 남았다. 하단 중성색을 소폭 낮추는 것만으로는 좌우의 넓은 흰 영역을 충분히 보완하지 못했다.
- 하단에 중앙 alpha 0인 좌우 계절색 wash를 추가했다. 가을 peach/apricot, 겨울 ice/lilac, 봄 rose/petal pink, 여름 aqua/mint가 가장자리에 남으며 중앙은 밝게 유지한다. 기존 큰 field의 위치·크기와 색 이동은 유지하고 불투명 단색 lower base는 복원하지 않았다.
- Hero 아래 시작점에서 짧은 fade로 edge wash를 연결한다. 기존 section-anchor field가 그 위에서 투명하게 겹친다. 가을의 약한 하단 field alpha는 22%/18%에서 40%/34%로 보완했다.
- 가장 밝던 lower neutral을 겨울 `#DEE6F7`, 봄 `#F7DCE9`, 여름 `#D9F2E8`로 바꿨다. Hero의 원래 neutral은 보존한다.
- 봄의 `#DEF2DE` mint field를 `#F7D4E7` petal pink로 교체했다. Hero와 하단의 봄 ambient field에서 녹색을 제거했다. 기능성 위젯 아이콘의 기존 녹색은 배경색이 아니므로 변경하지 않는다.
- 기존 하단 별빛 15개는 전체 scroll 길이의 비율에 연결되고 주로 양 끝에 몰려 있었다. 이를 Weather와 10개 실제 section layout에 연결한 28개 별빛으로 교체했다. 각 구간 2~3개, 13~20dp nominal size, 불규칙한 좌우 위치와 일부 section 사이 공간을 사용한다.
- 별빛은 Hero와 같은 soft halo 및 두 축의 cross gradient를 재사용한다. 중앙의 본문·CTA 바로 뒤는 피하고 가장자리 및 여백에 배치했다. Hero 별빛 9개, 전체 구체 60개와 그 재질·크기·위치·회전은 보존한다.
- 하나의 full-content canvas, pointerEvents none, accessibility hidden, content 뒤 layering과 실제 layout anchor를 유지한다. 애니메이션, 새 자산, 새 native dependency, 스크롤마다 상태 갱신은 없다.

## 3. UI Preservation

- 이번 수정 전후 `ambientMesh.ts`, `LoggedInHome.tsx`, `SeasonalHomeAutumn.tsx`, `HomeSectionGlass.tsx`, `profileEdit.ts` 및 세 계절 구체 자산 hash가 동일하다.
- UI source geometry, section gap, headline, font, copy, Weather, 기능, Bottom Navigation은 변경하지 않았다. 바깥 glass 50%, 내부 glass 60%, no-shadow와 elevation 0을 유지한다.
- 임시 네 계절 버튼, 승인된 가을 foreground와 자동 계절 판정은 유지한다. 봄의 ambient mint 제거만 Hero 색에 대한 명시적 예외다.
- 투명한 하단 field의 overlap으로 Hero 연결부 합성에는 차이가 있을 수 있다. 모든 Hero 픽셀 동일이나 최신 실기기 geometry 대조 완료를 주장하지 않는다.

## 4. Local Validation

- Node 24.20.0, Yarn 3.6.4, toolchain PASS.
- TypeScript PASS. 대상 ESLint 오류 0, 새 경고 0. 기존 LoggedInHome no-shadow 경고 20개 유지.
- 관련 16개 스위트, 187개 테스트 PASS. Full suite 미실행.
- 360/400/430dp에서 full-content bounds, pointer/accessibility 계약, 구체 60개의 명시적 크기와 재질, edge wash의 중앙 투명도와 시작점, 28개 별빛의 실제 anchor·반응형 크기를 검사했다.
- 봄 field의 pink RGB 관계와 mint 제거, 하단 밝은 neutral 감소, Hero neutral 및 승인 가을 descriptor 보존을 검사했다.
- git diff --check PASS. 이 검증은 실제 합성 화면의 흰 번짐 제거, 유리 가시성 또는 최종 미적 승인을 대신하지 않는다.

## 5. Release and Device Boundary

- PO의 `수정 후 빌드·설치 진행` 승인으로 이번 corrective Android release 1회와 adb install -r 1회를 완료했다. 계절 작업 누적은 각 7회다.
- Build SUCCESSFUL in 2m21s, 2026-09-30 20:28:15 KST. Verifier ACCEPTED, signature PASS, debuggable false, cleartext false, embedded JS bundle. Metro OFF, Fast Refresh OFF.
- 설치 대상은 Galaxy S24 SM_S937N, serial R5CY613NMSY다. install Success, 기존 앱 데이터 유지.
- APK: `/tmp/nuri-home-three-seasons-20260930/nuri-a94279b-edge-pink-starlight-1e3291e6.apk`.
- SHA-256: `1e3291e62436fcdf84d57786db373a338513f08a258b692c9247f387ccdcae2d`.
- 이전 APK 및 로그를 보존했다. 기기 조작 중단 지시에 따라 설치 외 앱 실행·터치·스크롤·계절 전환·캡처를 하지 않았다. 최신 실기기 화면, 합성 가독성, 성능, Fatal·ANR·RN Fatal과 Red Screen은 미확인이다.
- 로그는 `/tmp/nuri-home-three-seasons-20260930/edge-pink-starlight-types.log`, `edge-pink-starlight-eslint.json`, `edge-pink-starlight-tests.log`, `edge-pink-starlight-build.log`, `edge-pink-starlight-install.log`다.

## 6. Evidence and Documentation

- Autumn defect: `/var/folders/vk/6mpj22bj7_xdsn_rqyygrkgm0000gn/T/codex-clipboard-efef0727-17bd-44f6-88fd-9a3a36f26225.png`.
- Winter defect: `/var/folders/vk/6mpj22bj7_xdsn_rqyygrkgm0000gn/T/codex-clipboard-8268c9fa-2bc6-4b6e-8539-9baaac787ff4.png`.
- Spring defect: `/var/folders/vk/6mpj22bj7_xdsn_rqyygrkgm0000gn/T/codex-clipboard-47413dc5-ef5f-407c-a74f-d577e6fd6c9a.png`.
- Summer defect: `/var/folders/vk/6mpj22bj7_xdsn_rqyygrkgm0000gn/T/codex-clipboard-7659edf2-264a-4ecd-aee1-61a54c9464ab.png`.
- 위 증거는 PO가 제공한 이전 설치본 화면이다. 이번 corrective의 새 스크린샷 증거로 사용하지 않는다.
- 현재 상태, 핵심 결정사항, 우선순위, 작업 로그와 release-checklist를 갱신했다. 직전 후보 보고서에는 PO 미승인과 후속 보고서 연결을 추가했다. 이전 이력과 preexisting dirty를 보존한다.

## 7. Final State and Next Action

- HEAD: `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`. BRANCH: `codex/task6-community-content-policy`.
- IMPLEMENTATION: COMPLETE. LOCAL_VALIDATION: PASS. RELEASE_INSTALL: COMPLETE. PO_VISUAL_APPROVAL: PENDING.
- STAGED: NONE. COMMIT: NO. PUSH: NO. PREEXISTING_DIRTY: PRESERVED. AUTO_START_NEXT_WORK: NO.
- 다음 한 가지는 PO 직접 검토다. 네 계절 하단 좌우 흰 번짐 감소, 봄의 분홍색 균형, 구체와 별빛의 리듬, 중앙 가독성과 유리 경계를 확인한다. 승인 전 버튼 제거·Git closeout·추가 자동 튜닝은 하지 않는다.

PO 승인을 기다립니다.
