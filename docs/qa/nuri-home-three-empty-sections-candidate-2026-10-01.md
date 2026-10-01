# NURI Home Three Empty Sections Candidate

## Final PO Approval: Season Controls Retained

- PO가 최신 `a6914fe5` 설치본의 건강관리 최근 활동·일정 보기·오늘 한장과 그림 확대 corrective를 최종 승인했다. PO_VISUAL_APPROVAL: APPROVED.
- 최신 후속 지시는 계절 버튼을 제거하지 않고 커밋·푸시만 진행하는 것이다. 검토용 네 계절 버튼, Home local 선택 state, 현재 설치본을 그대로 보존한다. 버튼 제거·자동 계절 강제 복원·추가 빌드·설치는 하지 않는다.
- 승인 범위는 세 빈 섹션 source·투명 계절 PNG 12개·관련 테스트·이번 문서 block이다. 기존 리서치·Supabase CLI metadata·무관한 디자인 자산·공유 문서의 과거 미커밋 hunk는 제외한다. 캐시·산출물 정리도 이번 종료 범위가 아니다.
- Source/type/lint/test/build 결과는 아래 corrective 증적을 따른다. 현재 설치 APK SHA-256은 `a6914fe5de57b40c9f5a731958010146b548049694519801e739f2e8eef98a50`이며 scope 누적 QA Release·install은 각 2회다. 승인 후 추가 실행은 0회다.
- 종료 전 source 변경 없이 관련 17개 스위트 187개 테스트를 재확인해 모두 PASS했다. Full test·추가 build·install은 하지 않았다. 결과는 `/tmp/nuri-empty-art-scale-20261001/closeout-tests.json`에 기록했다.
- 이번 시각 승인은 PO의 직접 검토에 근거한다. 자동 runtime smoke·Fatal·ANR·RN Fatal은 미확인이고 설치 외 기기 조작 중단 지시는 유지한다.
- 선별 commit·기존 `codex/task6-community-content-policy` 브랜치 push가 승인됐다. Git 종료 결과는 `/tmp/nuri-empty-art-scale-20261001/git-closeout.json`에 기록한다. main 병합·스토어 배포·다음 기능 자동 시작은 하지 않는다.
- 후속 권장 후보는 전체 요약, 오늘의 팁, 커뮤니티 빈 상태, 최근 기록 빈 상태다. 이미 승인된 네 섹션·Hero·날씨·자주 쓰는 기록·추천 팁·배경·공통 유리는 유지하고 PO의 다음 선택을 기다린다.
- 아래 pending·검토 버튼 제거 금지 표시는 승인 전 후보 이력이며 현재 상태는 본 최종 승인 항목이 우선한다.

## Latest: Photo / Schedule Artwork Scale Corrective

- PO는 세 섹션의 전체 방향과 폭·높이를 긍정 평가했지만 오늘 한장·일정 그림이 작다고 지적했다. 최종 시각 승인은 대기이며 이번 수정본의 추가 빌드·설치 각 1회만 승인됐다.
- 원인은 1,254px square PNG의 투명 여백과 보수적인 image slot 크기가 합쳐진 것이다. 기존 주요 그림 높이는 일정 약 92dp, 사진 약 108~111dp였다.
- 그림 표시만 1.35배 확대했다. 기존 일정 136dp·사진 168dp layout slot, section geometry, 제목·본문·CTA 간격은 유지한다. absolute viewport만 좌우로 넓히고 위아래는 기존 slot에 제한해 문구 영역에 그림이 번지지 않게 한다.
- 8개 계절 PNG의 alpha 8/255 이상 silhouette를 측정했다. 확대 후 일정 약 124.60~125.47dp, 사진 약 145.77~149.57dp이며 주요 그림의 상하 잘림은 없다. 거의 투명한 잔여 픽셀과 그림 외 투명 여백만 viewport 밖에 제한된다. 원본 이미지·manifest는 수정하지 않았다.
- Health의 slot·표시 배율, 배경·유리·실제 사진·일정 데이터·기능·계절 버튼은 유지한다. 320/360/400/430dp에서 확대된 paint width가 section 내부 폭 안에 들어오는 계약을 테스트했다. native 화면 크기 측정이나 기기 캡처 증적을 대신하는 것은 아니다.
- Local: Node 24.20.0, TypeScript PASS, 대상 ESLint 오류 0·경고 0, 9개 스위트 121개 테스트 PASS, diff check PASS. Full test 미실행.
- 승인된 추가 QA Release 1회 PASS, 1m42s, verifier ACCEPTED. `adb install -r` 1회 Success, 대상 `R5CY613NMSY` / `SM_S937N`. non-debuggable·embedded JS·approved signer 일치이며 Metro 의존이 없다.
- 최신 APK: `/tmp/nuri-empty-art-scale-20261001/nuri-empty-art-scale-candidate-a6914fe5.apk`, SHA-256 `a6914fe5de57b40c9f5a731958010146b548049694519801e739f2e8eef98a50`, 186,561,321 bytes, 2026-10-01 20:03:56 +0900. 이전 세 섹션 `86cb8f48`와 승인 일기 `c0543274` APK도 기존 hash 그대로 보존했다.
- 설치 외 자동 실행·터치·스크롤·캡처 중단 유지. 최신 native 합성·실제 화면 높이·runtime smoke·Fatal·ANR은 미확인이다. staging·commit·push와 검토 버튼 제거 없음. 다음은 PO의 직접 검토 하나다.
- 시작 프로젝트 파일 1,293개 중 변경은 source·test·본 보고서·현재 프로젝트 상태 4개뿐이다. 누락 0·무관한 변경 0, build 전후 source/asset hash 일치, branch·HEAD·staged·status 동일. 따라서 기존 배경·Health·glass·실제 기록 구성과 preexisting dirty를 보존했다.
- Evidence: `/tmp/nuri-empty-art-scale-20261001`의 `baseline.json`, `source-fingerprint-before-build.json`, `asset-bounds-validation.json`, `types.log`, `eslint.json`, `tests.json`, `tests.log`, `build.log`, `install.log`, `preservation.json`.
- 아래는 최초 세 섹션 후보의 구현·설치 이력이며 이번 corrective 최종 결과로 혼동하지 않는다.

## 1. Scope and Decision

- IMPLEMENTATION: COMPLETE. 건강관리 최근 활동, 일정 보기, 오늘 한장의 정상 조회 완료 빈 상태만 리디자인했다.
- PO_VISUAL_APPROVAL: PENDING. 이번 후보 구현과 추가 QA Release·install 각 1회는 승인됐지만 최종 디자인 승인은 아직 아니다.
- 건강관리는 특정 반려동물 종을 대표하는 강아지·발바닥 대신 건강 기록 pouch와 heart를 사용한다. 그림의 심박 모양은 장식이며 실제 건강 수치나 판정이 아니다.
- 일정은 숫자·날짜·가짜 이벤트가 없는 달력과 glass clock, 오늘 한장은 실제 사진을 가장하지 않는 빈 layered frame과 camera다.
- 승인된 full Home 배경의 구체·별빛과 공통 바깥 glass를 보존했다. 별도의 section 배경, opaque backing, BlurView, native dependency나 애니메이션을 추가하지 않았다.
- 실제 사진·일정·건강 활동이 있는 구성, 상세 이동, 기록 작성, 일정 작성, 건강관리 진입은 기존 목적지를 사용한다. Supabase·DB·RLS·Storage·notification·fixture 변경은 없다.

## 2. Seasonal Artwork

생성 도구: built-in `image_gen`. 투명배경 PNG 12개, 각 1,254×1,254px RGBA, 원본 합계 12,474,233 bytes. 생성 prompt·원본 경로·SHA-256은 `src/assets/seasonal/home/empty-sections/generation-manifest.json`에 기록했다.

| Section | Composition | Autumn | Winter | Spring | Summer |
|---|---|---|---|---|---|
| Health | 건강 기록 pouch, layered cream records, heart | ivory/periwinkle/apricot, amber leaf | ice blue/lilac, snowflake | petal pink/rose, blossom | aqua/sky, water drop |
| Schedule | 빈 miniature calendar, glass clock | warm ivory/apricot | ice blue/lilac | pink/rose | aqua/sky |
| Photo | 빈 layered photo frame, camera, small heart | warm ivory/apricot | ice blue/lilac | pink/rose | aqua/sky |

- 봄은 mint·emerald 장식 대신 분홍색을 사용한다. 모든 건강 자산에 강아지·발바닥이 없다.
- static `require`로 각 계절 자산을 연결했다. 원격 이미지 다운로드나 runtime tint로 계절 이미지를 대체하지 않는다.
- 아트는 `pointerEvents="none"`, accessibility hidden이며 콘텐츠보다 뒤에서 장식 역할을 한다.

## 3. Layout and Data Contract

- 이전 일기 후보의 높이 결함을 방지하기 위해 정사각형 부모 frame과 absolute `Image`를 사용한다. 원본 bitmap intrinsic height는 section layout에 참여하지 않는다.
- Health 그림 최대 128dp, Schedule 최대 136dp, Photo 최대 168dp. width 비율과 maxWidth·maxHeight를 함께 제한한다. 완성 section 전체에 fixed height·maxHeight를 걸지 않는다.
- Health는 기본 폭에서 그림과 문구를 나란히 배치한다. 화면 폭 350dp 미만 또는 fontScale 1.3 이상이면 세로로 전환한다. 문구와 버튼은 줄바꿈을 허용한다.
- CTA는 기존 primary material, 아이콘 없는 중앙 정렬 텍스트, 최소 46dp로 유지한다. 사진 기록하기는 기존 일반 기록 작성 화면 진입이며 카메라를 자동 실행하지 않는다.
- ready·표시 항목 0개에서만 그림과 실행 버튼을 보여준다. loading·error·unknown은 빈 상태로 단정하지 않는다. 일정/건강의 빈 헤더 목록 버튼 숨김 규칙은 보존한다.
- 오늘 한장의 daily selection/cache와 signed image는 그대로 사용한다. 선택 완료 전에 빈 그림을 표시하지 않으며 실패는 오류 상태로 구분한다. pet/list 전환과 unmount 후 stale 응답을 무시한다.
- 실제 사진의 기존 250dp photo card와 날짜 overlay·상세 이동, populated 일정·건강 목록은 보존한다.

## 4. Temporary PO Season Controls

- 가을·겨울·봄·여름 버튼은 Home 상단의 자체 공간에 배치했다. ScrollView를 덮는 overlay가 아니다.
- 선택값은 Home local state이며 full canvas, Hero atmosphere, 승인 일기 이미지와 세 새 빈 상태 이미지를 함께 전환한다.
- 전경은 기존 승인 Autumn UI를 유지한다. global theme/date, 서버 데이터나 저장된 사용자 설정을 바꾸지 않는다. 선택으로 콘텐츠를 remount하지 않는다.
- 최종 승인 전 버튼 제거, staging, commit, push 및 다음 섹션 자동 착수는 하지 않는다.

## 5. Local Validation

| Gate | Actual Result |
|---|---|
| Node / Yarn | 24.20.0 / 3.6.4 |
| TypeScript | PASS |
| Targeted ESLint | 오류 0, 새 경고 0, 기존 LoggedInHome no-shadow 19개; 기존 inline component 추출로 이전 20개 중 1개 제거 |
| Relevant tests | 17개 스위트, 185개 테스트 PASS |
| git diff --check | PASS |
| PNG metadata | 12개 모두 alpha channel, square RGBA, 개별 1.5MB 미만 |
| Full test | 미실행 |

360/400/430dp frame 계약과 fontScale 1.5에서 줄바꿈 가능한 구성, 12개 asset mapping, loading/error, 기존 photo 상세/action, pet 전환 stale 응답, background/glass/diary/health/schedule/cache/Top button 회귀 계약을 확인했다. Jest native mock은 실제 Android text bounds나 시각 합성을 측정하지 않는다.

Jest의 기존 Watchman recrawl 경고는 관찰했고 watcher 삭제·재설정이나 프로세스 강제 종료는 하지 않았다.

## 6. Release and Installation

- 승인된 QA Release 1회와 `adb install -r` 1회 완료. Build 9m26s, verifier ACCEPTED, install Success. 설치 대상 `R5CY613NMSY`, 조회 모델 `SM_S937N`이다.
- 검토 APK: `/tmp/nuri-home-empty-sections-20261001/nuri-three-empty-sections-candidate-86cb8f48.apk`.
- SHA-256: `86cb8f48e44be07fe603335952b2df238f3881e4105b23bec008539a3ce2ca51`. 크기 186,560,777 bytes, timestamp 2026-10-01 15:20:14 +0900.
- APK는 non-debuggable, embedded JS, signature·approved signer 일치이며 Metro 의존이 없다. 실제 APK resource table에 신규 계절 이미지 12개가 모두 존재한다.
- build 입력은 HEAD `0fb558aad56ee5de39bffc9fc9fd92eb39698225` + 미승인 candidate source/asset fingerprint다. 파일명의 HEAD를 후보 source commit 또는 PO 승인으로 해석하지 않는다.
- 이전 일기 승인 APK `971128d2`와 버튼 없는 최종 `c0543274`를 보존했고 기존 보고서 hash와 일치한다. 이번 scope의 build·install은 각 1회이며 반복 미적 튜닝은 하지 않았다.
- 설치 외 자동 실행·터치·스크롤·계절 전환·캡처는 하지 않는다. 기존 기기 조작 중단 지시는 유지한다.
- 최신 native section 높이, CTA·탑 버튼 비겹침, 네 계절 시각 합성, 전체 runtime smoke와 Fatal·ANR·RN Fatal은 미확인이다. 이전 후보 증적을 이번 후보 QA로 합치지 않는다.

## 7. Preservation and Git

- Branch: `codex/task6-community-content-policy`.
- HEAD: `0fb558aad56ee5de39bffc9fc9fd92eb39698225`.
- STAGED: NONE. COMMIT: NO. PUSH: NO.
- 시작 baseline의 기존 프로젝트 파일 1,273개에서 앱 구현 변경은 LoggedInHome과 계절 계약 test 2개에 한정된다. 별도로 project-memory 4개와 release-checklist에 이번 후보 block만 추가했다. 누락된 파일은 0개다.
- build 전후 구현 source·asset 17개 hash 일치, baseline 대비 무관한 파일 변경 0개·누락 0개다. project-memory·release-checklist 5개의 이번 block을 제외한 원문은 작업 전 내용·hash와 일치한다.
- Hero·날씨·전체 요약·추천·오늘의 팁·일기 기존 선언 7개의 본문이 HEAD와 같고, 자주 쓰는 기록·커뮤니티 owner file hash도 baseline과 같다. 공통 glass·배경 descriptor·기존 diary asset과 component, 무관한 preexisting dirty·untracked asset·design output을 보존했다.
- branch·HEAD·staged는 시작과 같다. build 완료 후 Gradle·Metro 개발 프로세스는 실행 중이지 않으며 Release Fast Refresh 의존은 없다. 기존 Watchman을 임의 종료하지 않았다.
- 이번 작업은 disk cleanup이 아니다. 이전 승인 APK·증적·캐시·개인 파일은 삭제하지 않는다.

## 8. Evidence and PO Review

Evidence root: `/tmp/nuri-home-empty-sections-20261001`.

- `baseline.json`: 작업 전 Git·파일 SHA-256.
- `source-fingerprint-before-build.json`: 17개 구현 source/asset build 입력 hash.
- `types.log`, `eslint-final.json`, `eslint-build-source.json`, `tests-final.json`: local gates.
- `build.log`: 한 번의 QA release 및 artifact verifier 결과.
- `install.log`: 승인된 한 번의 교체 설치 결과.
- `local-validation.json`: local gates와 생성 asset metadata·hash.
- `preservation-final.json`: 1,273개 baseline, 17개 build input, 기존 owner·문서 원문·Git·APK resource 보존 검사 PASS.
- 기기 screenshot/XML은 생성하지 않는다.

PO가 직접 확인할 항목:

1. 네 계절 health 그림에 강아지·발바닥 없이 모든 반려동물에 맞는 인상이 유지되는가.
2. 세 섹션의 그림과 제목·문구·버튼이 과하게 길지 않고 서로 구별되는가.
3. 봄 pink, 겨울 ice blue, 여름 aqua, 가을 warm ivory가 승인 배경·glass와 자연스럽게 연결되는가.
4. 기존 구체·별빛이 그림과 겹쳐 가독성을 해치지 않는가.
5. 그림·문구·버튼·탑 버튼이 잘리거나 겹치지 않는가.
6. 실제 기록이 있는 사진·일정·건강 구성과 기존 목적지 이동이 유지되는가.

## 9. Final State

- THREE_EMPTY_SECTION_IMPLEMENTATION: COMPLETE.
- LOCAL_VALIDATION: PASS.
- ANDROID_QA_RELEASE: PASS, 1 CYCLE.
- ADB_INSTALL_R: SUCCESS, 1 CYCLE.
- PO_VISUAL_APPROVAL: PENDING.
- REVIEW_SEASON_CONTROLS: PRESENT.
- DEVICE_UI_AUTOMATION: STOPPED_AT_PO_REQUEST.
- AUTO_START_NEXT_WORK: NO.

다음 작업에 대한 PO 지시를 기다립니다.
