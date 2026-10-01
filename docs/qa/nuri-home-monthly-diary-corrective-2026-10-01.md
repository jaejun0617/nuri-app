# NURI Monthly Diary Corrective Review Report

> 이 문서는 승인 전 후보 이력이다. PO가 2026-10-01 직접 검토 후 최종 승인했으며, 버튼 제거·최종 설치·산출물 정리 결과는 `nuri-home-monthly-diary-final-approval-2026-10-01.md`를 따른다. 아래 PENDING과 Git 미진행은 당시 상태다.

## 1. Current Decision

- IMPLEMENTATION: COMPLETE
- LOCAL_VALIDATION: PASS
- ANDROID_RELEASE: PASS
- ADB_INSTALL_R: SUCCESS
- PO_VISUAL_APPROVAL: PENDING
- DEVICE_UI_AUTOMATION: STOPPED_AT_PO_REQUEST

PO의 최신 지시는 빈 섹션의 헤더에 대체 문구도 넣지 않는 것이다. “일기를 기다려요” 방식은 채택하지 않는다. 정상 조회 결과가 0개이면 목록 버튼을 숨기고, 실제 항목이 생기면 원래 전체 보기 버튼을 다시 표시한다.

## 2. What Changed and Why

1. 일기 빈 상태의 과도한 높이를 수정했다. React Native 정적 Image가 원본 1254px 높이를 기본 style에 넣었고, 최초 후보의 maxWidth·aspectRatio만으로는 native 높이를 제어하지 못했다. 부모 frame이 72% 폭·최대 200dp 정사각형 geometry를 소유하고, 이미지 자체는 absolute 100% 크기로만 렌더한다. maxWidth와 maxHeight를 함께 제한해 Yoga 계산의 비정방형도 막았다.
2. 일기 “기록하기” 아이콘을 제거하고 텍스트를 중앙 정렬했다. 기존 46dp 높이·12dp radius·색과 일반 RecordCreate 목적지는 유지한다.
3. 기존 단일 full Home canvas에 일기 여백용 작은 구체 2개와 별빛 2개만 추가했다. 구체는 360~430dp에서 약 19~28dp이며 좌우 여백에 놓인다. 별빛 alpha 상한은 기존 0.86을 지킨다. 일기 섹션 배경 owner·backing card·새 애니메이션을 만들지 않았다.
4. 탑 버튼의 bottom offset을 safe inset +70dp, 최소 84dp로 조정했다. 현재 기기에서는 기존보다 20dp 아래에 놓여 마지막 기록 버튼과 겹치지 않는다. 버튼 모양·크기·동작과 Bottom Navigation은 유지한다.
5. 자주 쓰는 기록·전체 요약·최근 기록·일정·건강관리·이번 달 일기에 confirmed-empty 판정을 연결했다. 정상 조회 완료와 0개를 동시에 확인해야 헤더 목록 버튼을 숨긴다. loading·error·unknown은 0개로 단정하지 않는다. 본문 기록하기·일정 추가하기·네 가지 기록 위젯의 실제 실행 버튼은 보존한다.
6. 커뮤니티·추천 팁은 미리보기 0개만으로 전체 목록이 비었다고 판정할 수 없어 기존 진입 버튼을 유지한다. 오늘 한장·오늘의 팁에는 해당 헤더 목록 버튼이 없다.

## 3. Preserved Scope

- 네 계절 Hero descriptor·palette·mesh field와 기존 구체 자산: 보존.
- HomeSectionGlass·HomeWidgetMaterial·Home styles·section gap·Weather UI: HEAD 대비 동일.
- 일기 월·카테고리 필터, 기존 기록 카드·상세, 실제 캐시·조회·서버 계약: 보존.
- 임시 상단 가을·겨울·봄·여름 controls: 유지. Home 로컬 메모리에만 선택을 두며 배경과 일기 이미지에 연결한다. 자동 기본값은 기존 KST 계절 판정, 공통 foreground는 승인 Autumn UI다.
- 원격 Supabase·DB·RLS·Storage·navigation 계약·native dependency 변경: 없음.
- 기존 dirty·미사용 자산·시안·증적 보존. 이 작업에서는 disk cleanup을 하지 않았다.

## 4. Local Validation

| Gate | Actual Result |
|---|---|
| Node / Yarn | 24.20.0 / 3.6.4 |
| TypeScript | PASS |
| Targeted ESLint | 오류 0, 새 경고 0, 기존 LoggedInHome no-shadow 20개 유지 |
| Focused tests | 13개 스위트, 169개 테스트 PASS |
| git diff --check | PASS |
| Source fingerprint | 최종 build 전후 일치 |
| Full test | 미실행 |

빈 상태 0개·실제 1개 전환, loading/error/unknown 방어, 기록 위젯 4개 action, 텍스트 중앙 정렬·아이콘 제거·이미지 frame·네 계절 자산, 기존 배경·glass·날씨·cache·탑 버튼 계약을 검사했다. 360/400/430dp는 local 산술·component 계약 검증이며 물리 기기별 QA 완료를 뜻하지 않는다.

## 5. Release and Installation

- 최신 APK: `/tmp/nuri-monthly-diary-height-corrective-20261001/nuri-monthly-diary-final-hidden-971128d2.apk`
- SHA-256: `971128d2dbf0eee96d6d6c5919fab2ff0fed0c3826e2ccac0fddc5b5218acfc3`
- 크기: 174,783,533 bytes. build 2m09s, 2026-10-01 13:22:43 KST.
- Static verifier: ACCEPTED. release·non-debuggable·embedded JS·approved signer 확인.
- 최종 헤더 문구 제거본: 추가 Release 1회·install -r 1회 Success. Metro·Fast Refresh OFF.
- 이 일기 작업 전체: Release 5회·install 4회. 최초 후보 1회, native wrapper probe 1회, maxHeight clamp-only build 1회(미설치), 추가 지시 consolidated build 1회, 최종 대체 문구 제거 build 1회다. 한 번의 build·install로 축약해 보고하지 않는다.
- 네 PNG는 1254×1254 RGBA이며 기존 생성 hash와 동일하다. 실제 APK에 네 이미지 모두 alpha 채널로 포함된 것을 consolidated candidate에서 확인했다. 최종본은 동일 source assets를 패키징한다.

## 6. Physical Device Evidence and Boundary

기기: Galaxy S24로 전달받은 `SM_S937N / R5CY613NMSY`, 1080×2340, density 450(384dp), font scale 1.0.

### 6348e244 Consolidated Candidate — Direct Measurement

네 계절의 PNG와 XML을 대조해 아래 geometry를 확인했다.

| Element | Native Bounds / Result |
|---|---|
| Diary panel | [45,646][1035,1901], 높이 1255px 약 446.2dp |
| Illustration frame | 폭 562px, 높이 562~563px, 200dp 범위 및 1px rounding |
| Record CTA | [107,1715][973,1844], 높이 129px 약 46dp |
| Top button | [889,1873][1024,2008] |
| CTA → Top button | 29px 약 10.3dp 간격, 겹침 없음 |
| Top button → Navigation | 28px 약 10dp 간격 |
| Season transition | panel·CTA·top bounds 동일, 그림에만 최대 1px rounding |

가을·겨울·봄·여름 이미지·투명 배경·작은 구체·별빛·중앙 문구를 관찰했다. 기록 작성 화면 진입·뒤로 복귀와 맨 위 이동을 확인했고 기록을 등록하지 않았다. 이 후보에는 당시의 “일기를 기다려요” 헤더 문구가 있었으며 최신 최종본의 문구 증적이 아니다.

### 971128d2 Latest Candidate — Partial Direct Review

- 최신 설치 후 Home·Weather·자주 쓰는 기록·전체 요약·최근 기록을 캡처했다. 실제 산책 기록 1개가 있는 상태에서 세 섹션의 전체 보기 버튼이 유지됐다.
- 일정·건강관리의 빈 헤더에서 목록 버튼과 대체 문구가 없고, 일정 추가하기 본문 action이 유지된 최신 PNG를 관찰했다.
- 마지막 lower PNG와 XML 사이 화면 위치가 달라진 것을 감지했다. PO가 직접 기기 검토 중이라고 확인하고 조작 중단을 요청했다. 이후 기기 UI 조작·캡처를 중단했다.
- 위치가 불일치한 `34-hidden-lower.png / .xml` 쌍은 geometry 증거로 사용하지 않는다. PNG는 관찰 화면으로만 보존한다.
- 최신 네 계절 일기 전체의 통제된 재캡처·installed base APK hash·Fatal/ANR/RN Fatal log scan은 미확인이다. 이전 후보 측정을 최신 전체 QA 완료로 합치지 않는다.
- 최신 관찰 화면에 Red Screen은 없었지만 전체 smoke 완료는 선언하지 않는다. 확대 글꼴·다른 물리 폭·populated diary 실기기 QA도 미확인이다.

## 7. Evidence Paths

Root: `/tmp/nuri-monthly-diary-height-corrective-20261001`

| Evidence | Files |
|---|---|
| 최초 높이 결함 | `/tmp/nuri-monthly-diary-empty-20261001/before-height-corrective.png` 및 XML |
| 4계절 geometry | `12-final-autumn-diary`, `13-final-winter-diary`, `14-final-spring-diary`, `15-final-summer-diary` PNG/XML |
| 작성 화면·복귀·Top | `16-final-record-create`, `17-final-record-return.xml`, `18-final-top-return.xml` |
| 최신 Hero·Weather | `30-hidden-hero`, `31-hidden-weather` PNG/XML |
| 최신 실제 기록 header | `32-hidden-frequent-summary`, `33-hidden-summary-recent` PNG/XML |
| 최신 빈 일정·건강 관찰 | `34-hidden-lower.png` (XML pairing 제외) |
| 최종 검증 | `types-final-hidden.log`, `eslint-final-hidden.json`, `tests-final-hidden.log` |
| 최종 build·install | `build-final-hidden.log`, `install-final-hidden.log` |
| 최종 source hash | `source-fingerprint-final-hidden.json` |

## 8. Git and Next Action

- HEAD: `7e5a3cfeb1cf9fda229b775ffa128e47b75b0c68`.
- Branch: `codex/task6-community-content-policy`.
- STAGED: NONE. COMMIT: NO. PUSH: NO.
- 기존 project-memory 내용, 연구 문서·Supabase temp·output·기존 untracked asset은 보존한다. 메모리와 release-checklist에는 이번 후보·검증 범위·대기 상태만 추가한다.
- 다음 액션은 PO의 현재 설치본 직접 검토 결과 하나다. 승인 전 임시 controls 제거·추가 시각 수정·Git closeout·다음 섹션·정리를 자동 시작하지 않는다.

## 9. PO Direct Review

1. 일기 섹션 높이와 그림 크기가 기존 지나치게 긴 후보보다 적절한가.
2. 네 계절의 일기장 이미지가 서로 다르면서 하나의 디자인 계열로 보이는가.
3. 일기 안의 작은 구체·별빛이 문구와 CTA보다 강하지 않은가.
4. 기록하기 텍스트가 중앙 정렬되고 탑 버튼과 겹치지 않는가.
5. 빈 섹션의 헤더에 버튼과 대체 문구가 모두 없으며 실제 데이터가 있는 곳에는 전체 보기가 있는가.
6. 기존 glass·Hero·날씨·위젯·기능은 의도대로 유지됐는가.

PO 승인을 기다립니다.
