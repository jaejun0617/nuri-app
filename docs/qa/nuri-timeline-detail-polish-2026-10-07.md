# NURI TIMELINE DETAIL POLISH REPORT

## 1. 작업 착수와 범위

- 작업 유형: 기존 미승인 Timeline 후보의 히어로 교체·통계·필터·문구 디테일 보완. NURI-04 단일 write owner이며 별도 작업방을 생성하지 않았다.
- 최신 승인: `빌드·설치만 진행, 화면 확인은 직접`. 증분 Release와 install-r 각 1회만 수행하며 앱 실행·탭·스크롤·캡처·화면 설정 변경은 하지 않는다. commit/push/freeze 승인 없음.
- 읽은 기준: engineering workflow/checklist/memory, project-memory 네 문서, Master routing/NURI-04 계약, 기존 Timeline 시안 보고서와 실제 source, 새 첨부 네 PNG.
- 실제 source of truth: 현재 Timeline·KST·pet 선택·summary·XP 계약, 전역 effectiveSeason, 새 PNG와 이번 검증 APK. 이전 APK의 native PASS를 새 후보의 native PASS로 재사용하지 않는다.
- 위험도: 중간. 기본 월의 실제 필터 상태가 바뀌므로 명시 선택·비동기 응답·pet 전환·Home 전체 기록 진입을 보호한다. runtime 5파일, 테스트 1파일, 이미지 4장과 보고/기록 6문서만 이번에 변경했다.
- 제외: Community/Bottom Navigation/FAB 디자인·callback/Auth/온보딩/Weather/API/서버/DB/RPC/RLS/Storage/QA100/Store/cleanup. 공용 MemoryCard와 Timeline styles의 기존 dirty도 이번 기준에서 그대로 유지한다.

## 2. 구현 결과

- 문구가 포함된 새 1774×887 PNG 네 장으로 교체했다. 원본 SHA 일치, 재생성·색 보정·crop 없음. 상태 표시줄 아래 실제 너비/2 높이와 contain을 유지하고 앱이 겹쳐 그리던 제목·설명·오른쪽 문구는 제거했다. 뒤로가기와 이미지의 접근성 설명은 남겼다.
- 통계는 `rgba(255,255,255,0.68)` 면과 밝은 border의 반투명 패널이다. 위/아래 padding 14→8dp, 좌우 14→12dp. 칭호와 XP를 동일한 row에 묶어 자연 높이로 표시한다. 좁은 폭·확대 글꼴에서는 기존 통계 stack을 유지하며 글자를 강제로 줄이지 않는다.
- 이미지별 바닥 anchor는 가을0.86/겨울0.90/봄0.89/여름0.90이다. 패널 시작점을 이미지 높이의 해당 비율로 정해 발 아래 전경으로 올린다. 원본 하단 전경 일부가 패널 뒤로 합성되므로 전체 캔버스가 가림 없이 보인다고 주장하지 않는다. 실기기의 최종 발/패널 간격은 PO 확인 대상이다.
- 통계 Paw와 산책 안내 Paw를 기존 `ASSETS.logo`의 NURI 심볼 원본으로 교체했다. 각각 28/20dp contain, tint 없이 고유 gradient를 유지한다. 기존 seasonal statsIcon token은 보존하지만 이 두 위치에서는 더 이상 렌더링하지 않는다.
- 오른쪽 기록 수 13→12sp, 기록한 날 11→10sp. 월/정렬은 좌우 padding12→8dp, 상하8→4dp, 글자13→12sp로 줄였으며 44dp touch minimum을 유지한다.
- 카테고리 면은 좌우12→8dp/상하8→4dp, 글자·숫자12→11sp다. 전체만 16dp grid icon을 남기고 나머지 아이콘은 제거했다. 작은 면 밖의 wrapper가 최소44dp 터치를 소유한다. 카테고리·하위 미용·숫자 의미와 클릭 callback은 유지한다.
- 기본 월은 현재 pet의 complete summary에서 KST 실제 최신 기록 날짜를 찾아 선택한다. `2026년 10월` 같은 표시는 실제 month filter와 일치하며 현재 날짜나 고정 문자열로 꾸미지 않는다. 로딩/기록0건은 전체 기록으로 남기고, 명시적 월/전체 선택은 늦은 응답이 덮지 않는다. pet 전환 시만 재초기화하며 Home 전체 기록 진입과 guest 경로는 제외한다.
- 산책 안내의 이름은 원래도 `selectedPet.name`이었다. 기존 한글 조사 utility를 재사용해 누리/초코는 `와의`, 총콩/밤은 `과의`로 표시한다. 공백 이름은 우리 아이, 비한글은 기존 모음형 fallback 계약이다. 완료 산책 문구·연속 일수는 그대로다.
- `마지막 기록이에요`와 empty CTA의 연필만 제거했다. 마지막 행의 기존 FAB clearance는 문구 없는48dp footer로 유지하며 loading-more 표시는 보존한다. 등록 FAB의 흰 plus·크기·색·기능은 변경하지 않는다.
- 요일 강조는 현재 필터의 가장 최근 기록 날짜만 계절 selectedCategory 색을 사용한다. 10월7일 수요일이 추가되면 10월4일 일요일은 neutral이 된다. 최신순/오래된순 모두 날짜 최댓값으로 결정하며 주말 고정 빨강은 제거했다.

## 3. 검증 결과

- TypeScript PASS. Targeted ESLint 0 errors, 새 오류/경고0, 기존 ControlsBar no-shadow warning1개 유지.
- Targeted 15 suites / 343 tests PASS. Timeline 시안22 tests에 exact token·원본 비율·브랜드 원본·패널·동일 XP row·chip 면/터치·null/0·KST·8개 이름·최신일·초기 월 race/pet/Home 보호·기본 MemoryCard/guest 호환을 포함한다.
- Full suite 181 suites / 1,836 tests, 이번 후보에서1회 PASS. Git diff check PASS.
- 신규 hook 테스트의 최초 실패는 update 시 ThemeProvider wrapper를 빼 hook이 remount된 테스트 구성 문제였다. wrapper를 유지해 재검증했고 production 우회는 없다. 첫 실패 로그도 증적에 유지했다. 포맷터의 잘못된 실행 경로는 설치된 기존 실행 파일로 바로잡았으며 의존성을 설치하지 않았다.
- 로컬360/384/430dp·fontScale1.5는 구조/비율/자연 높이/stack 검사다. 실제 native 글리프·가림·합성 대비를 확인한 결과가 아니다. 이미지 내부 글자는 raster 원본이라 폰트 설정에 독립적으로 확대되지 않는다.
- 지정 gradient/XP/선택 칩은 이전 정확한 Timeline palette 그대로다. 흰 글자 대비는 가을4.411:1/겨울4.351:1/봄4.220:1/여름4.698:1, 겨울 XP 대 흰 면3.851:1이다. 작은 글자 AA 전체 PASS나 새 glass native contrast PASS를 선언하지 않는다.
- Remote catalog/row-level hash 감사는 미실행이다. 서버 배포·명시적 DB/Auth mutation·QA100 생성/수정/삭제·Storage upload 없음. 과거 remote 감사 결과를 이번 전체 데이터 보존 증적으로 재사용하지 않는다.

## 4. Release와 설치

- Incremental Release 1회 PASS: 220.947초,995 tasks 중61 executed/934 up-to-date. clean/Metro/Fast Refresh 없음.
- APK: `/private/tmp/nuri-timeline-detail-polish-20261007-062112/nuri-timeline-seasonal-qa-b7563d37.apk`.
- SHA256: `b7563d37710082cf09e643f8c3906da41d272a00584c1854b56857f8ffcbbee7`. Source/private input fingerprint·Release signer·bundle marker·네 PNG의 APK decoded bitmap pixels MATCH. PNG container는 Android 도구의 무손실 재압축으로 byte hash가 달라도 decoded pixels를 별도로 확인했다.
- Galaxy S24 SM-S937N install-r 1회 PASS:15.959초. 설치 APK hash 일치, UID·최초 설치 시각·1080×2340/450dpi/fontScale1.0 유지. uninstall/clear data/logout/계정 변경 없음.
- NATIVE_VISUAL_QA: NOT_RUN_PO_DIRECT. 앱 실행·화면 조작·캡처·설정 변경0회. 이번 FATAL/ANR/RN_FATAL 런타임 감사는 미실행이다. 이전 native 결과는 구 후보의 이력이다.
- 이번 APK는 기존 dirty를 포함한 PO 디자인 후보다. clean HEAD 빌드·Store RC·PO 시각 승인·Timeline freeze로 분류하지 않는다.

## 5. 문서·보존·Git

- project-memory 네 문서와 리서치에 새 후보의 판단/검증 경계를 먼저 추가하며 기존 body를 보존한다. release-checklist는 Store gate 변화가 없어 이번에 수정하지 않는다.
- Community/Auth/Weather/API 및 다른 화면·이전 dirty·기존 QA 자료의 보호파일1,577개 hash MATCH, 예상 밖 새 파일0개, 기존 문서 body5개 보존 PASS다. 이번 변경 allowlist만 제외하고 공용 MemoryCard/Timeline styles/기존 FAB 테스트도 포함했다. 설치 코드/이미지는 build-source와 일치하고 새 브랜드·XP row·footer bundle marker도 MATCH다.
- START/CURRENT_HEAD: `bf8a7a578ae16d869afbadd3c1810c521592b260`, branch `codex/task6-community-content-policy`. STAGED NONE, COMMIT NO, PUSH NO.
- Android build/.cxx/.gradle·Gradle cache·현재/이전 APK·QA 증적·원본 이미지는 보존한다. CLEANUP NO, STORE HOLD, AUTO_START_NEXT_WORK NO.
- 시작 가용 공간26.16GiB, 빌드 직후24.01GiB, 최종 감사 시24.00GiB. 원시값과 파일별 preservation 결과는 증적의 `closure.json`이 소유한다.
- 증적: `/private/tmp/nuri-timeline-detail-polish-20261007-062112`. baseline/assets/typecheck/lint/targeted/full/candidate/install/token-contrast/closure/FINAL_REPORT를 보존한다.

## 6. 다음 액션

- 다음1개: 설치된 네 계절 Timeline의 PO 직접 시각 검토. 발 아래 패널·칭호/XP row·브랜드 심볼·작은 필터·실제 월·산책 이름·최근일 강조를 확인한다. 데이터 저장/삭제를 QA 필수로 요구하지 않는다.
- TIMELINE_DETAIL_POLISH: IMPLEMENTED_INSTALLED_PENDING_PO_VISUAL_REVIEW. 기존 Community/Auth/Weather/API COMPLETE_FROZEN 유지. 추가 QA/다음 디자인/commit/push는 자동 시작하지 않는다.

PO 승인을 기다립니다.
