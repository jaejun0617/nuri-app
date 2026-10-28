# 프로필 완료 화면, 통합 마감 추가 승인

## 범위와 현재 판정

- Master 단독. PO가 중단 작업 재개·프로필 시안·실제 사진 합성·이름 무지개 제거·최초 후보 대비 총3sp 축소를 승인했다. 이 디자인 이후에도 통합1~6/NAV를 계속하며 원래7~9와 Store는 시작하지 않는다.
- 5d88493의 bundled Debug632332f7을 같은 서명·UID·데이터 보존/Metro OFF로 실기기에 설치했다. 실제 확정 사진/변경 없는 저장/Android Back→Home을 확인했고 동일 SHA CI40622609366 전체4415/critical127 PASS다. 전체 통합 동결이 아니며 원본181변경·별도31이미지·사용자 데이터와 선택을 보존한다.
- 외부 증적: `/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT`.

## 시안·추출·최종 값

원본은852×1846의 PO 첨부 `codex-clipboard-d63956ba-4878-4bbf-8277-d314513bc122.png`다. `asset-manifest.json`이 원본 SHA/영역/출력 PNG 해시를 소유한다. 앱 자산3개는 `src/assets/profile-completion/frame-pencil-check.png`, `shadow.png`, `saved-check.png`다. 원본 x200/y210/w480/h470의 실제 프레임·연필·민트 체크와 접촉 그림자, x583/y1019/w48/h48의 작은 체크를 추출했다. 사진 창의 예시 강아지를 제거했고 선택 마스크는 외부 증적에만 보존한다. 전체 화면/카드/텍스트를 이미지로 붙이지 않는다.

| 역할 | 최종 값 |
| --- | --- |
| 바탕 | #FCFAFF → #F7F2FF → #FCFAFF, 계절과 분리 |
| 좌우/카드 추가 여백 |18dp/6dp |
| 아트워크 | 화면 폭×480/852, 최대260dp,480:470, 원본 중심축 보정14/852×화면폭 |
| 사진 창 | 아트워크 기준 x74/y90/w256/h274,5도 회전/-4도 skew, cover·고정 rounded clip |
| 카드 | radius20dp,border0.8dp, 좌우15/상13/하6dp |
| 원형 사진 |66dp, 중앙과 같은 저장 결과 URL·공유 실패 처리 |
| 정보 | 한 카드2×2, 행 min68dp, 가로/세로 hairline |
| CTA | min60dp,capsule, 중앙 글자/우측22dp 화살표 |
| 폰트 | 기존 AppText의 사용자 폰트 매핑 유지, 자간0, 글자 확대 유지 |

최종 fontSize/lineHeight: 제목29/39(작은 화면25/35), 설명14/22, 이름21/29, 저장 완료11/18, 라벨11/17, 값17/24, 하단 안내11/18, CTA18/26이다. 최신2sp+추가1sp 지시를 반영했으며 다른 화면/전역 폰트를 바꾸지 않는다.

native 이미지 마스크 후보는 실기기에서 중앙 사진을 표시하지 못했다. software/hardware 후보를 PASS로 올리지 않고 폐기했다. 최종은 고정 rounded clip+cover 사진+실제 추출 앞면이다. 앞면의 정확한 투명 사진 창이 보이는 외곽과 체크의 겹침을 결정한다. 다른 실제 사진2개와 두 색 QA bitmap에서 예시 말티즈 잔여/사진 돌출이 없음을 관찰했다.

## 저장·데이터·복귀 계약

- updatePet의 owner 제한 UPDATE가 실제 id를 반환하는지 확인하며0행 갱신을 성공으로 취급하지 않는다. DB schema/RPC/RLS 변경0이다.
- 업로드/UPDATE 성공 → fetchMyPets 확정 읽기 → 같은 petId 확인 → 원자적 store 교체 → ownerId와 저장된 아이 필드만 route에 전달한다. 완료 화면은 선택 아이를 재조회하지 않고 mount/재렌더 저장도 없다.
- 품종은 기존 canonical/직접 입력 표시 매핑, 몸무게는 pets.weight_kg snapshot과 기존 건강 로그 동기화, 성별은 기존 enum이다. 미등록4셀은 관리 화면과 같은 `미입력`이다.
- age 모듈에 엄격한 KST 달력 연·개월 함수를 추가해 생일·윤일·말일·유효0개월·잘못된 날짜·미래일을 구분한다. 다른 화면의 한국식 나이 표시는 보존한다.
- 저장 latch/owner·pet scope identity로 연속 입력·계정/아이 ABA·unmount 후 늦은 결과를 차단한다. 실패 시 입력을 보존하고 완료 진입하지 않는다. immutable 사진 경로를 재사용하며 render timestamp를 만들지 않는다.
- 기존 완료 Home reset에 HomeTab을 명시했다. CTA latch/Android Back을 공유하고 완료 화면 back gesture OFF, 자동 전환0이다. 선택 아이 정책은 보존한다.
- formatMemorialPetName의 앞뒤 무지개와 관리 목록의 이름 옆 무지개만 제거한다. 추모 badge 텍스트·상태·날짜·기록·칭호·시간 안내는 보존한다.

## 검증 원장

| 항목 | 상태 | 근거·한계 |
| --- | --- | --- |
| 이전 전체 검사 | PASS |322suites4411/4411, 이후 최종 글자/clip 변경은 표적·후속 CI로 연결 예정 |
| 최종 표적 | PASS |3suites28cases, 대상/owner/미입력/나이/실패/중복/Back/폰트/고정 clip |
| 타입·관련 lint | PASS | 타입 오류0,14파일 lint0errors/0warnings, 최종 입력 재확인 예정 |
| 실제 사진 합성 | PASS, 미리보기 | SM-S937N Android17, 실제 사진2개/같은 중앙·원형, 저장 E2E 아님 |
| 가로/세로/정사각형 | PASS, 시각 미리보기 | 두 색 QA bitmap의 route 주입만, 서버/store 쓰기0, 고정 외곽 |
| 다른 아이 | PASS, 미리보기 | 선택을 바꾸지 않은 다른 실제 아이 receipt, preview-other-verified.png |
| 저장→완료→Home | PASS, 범위 한정 | Metro OFF 동일 서명 설치본, 변경 없는 실제 저장/같은 중앙·원형 사진/Android Back. 원격 확정 값 보존은 actual-save-canonical-values-verified.json |
| 작은 화면/큰 글자/키보드 | NOT_RUN | 이번 화면에 필요한 범위만, 원래9 전체 회귀 아님 |
| 프로필 후보 빌드/설치/Git/CI | PASS |5d88493/632332f7 및 CI40622609366. 이후 미커밋 알림 수정 설치와 구분 |

시행착오와 test harness hoisting/중복 host/기본 dimension/event 인자 보정은 외부 결과에 보존한다. 미리보기의 UI dump1회 경합은 도구 실행 오류이며 제품 오류로 분류하지 않았다. 다른 아이 검증은 직렬 재확인 증거만 사용한다.

## 다음 작업 및 우선순위

작은 화면/큰 글자/입력 수락은 잔여로 보존한다. [통합 단일 원장](nuri-integrated-closeout-2026-10-25.md)의 직접 알림 target/정상 목적지 후 읽음/Back을 계속한다. 인증·OS/다중 기기·기록 CRUD/실패의 필수 미검증이 남으면 전체 동결하지 않는다.
