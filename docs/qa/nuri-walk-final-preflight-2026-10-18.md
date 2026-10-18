# Walk 최종 디자인 및 야외 QA 사전 점검

## 현재 판단

이번 범위는 남은5화면의 presentation과 최신 QA Release 후보 준비다. 실제 보행 결과나 Phase3 완료 보고가 아니다. 최종 실행 횟수, APK/source/signer/install 식별, 공개 캡처, 정리 목록과 최종 판정은 외부 evidence의 `FINAL-REPORT.md` 및 `FINAL-RECEIPT.json`이 소유한다.

Evidence: `/Users/shinjaejun/.codex/nuri-walk-evidence/phase3-final-20261018-pTNFtB`.

## 구현 계약

- 신호 찾기: 계절에 종속되지 않는 기다리는 강아지/고양이 삽화와 짧은 첫 위치 확인 안내. 첫 fix 전 실제 마커나 fixture 위치를 대신 표시하지 않는다. unknown 거리는 대시이며 native 시간의 의미를 바꾸지 않는다.
- 신호 약함/끊김: 삽화나 중앙 패널 없이 하단의 별도28dp 로딩 영역과13/12sp 문구를 쓴다. 정확한 지점만 기록하고 신호 없는 구간의 거리를 추정하지 않는다는 설명이다. native ActivityIndicator를 사용하고 동작 줄이기/백그라운드에서는 정적인 신호 아이콘을 사용한다. 진행률을 만들지 않는다.
- 복구: 가을 시안의 쉬는 반려동물 삽화를 추출한 투명 자산을 쓴다. 다른 세 계절은 승인된 계절 전용 쉬는 삽화를 재사용하며 가을로 fallback하지 않는다. 중복 중앙 요약은 없애고 하나의 하단 영역에 기록과 명시적 이어가기/마치기를 둔다. 자동 수집 재개0이며 닫기/Back 계약은 기존 host가 소유한다.
- 향후 기록: 현재 결과 화면과 같은 전체 폭1402:1122 삽화,16dp 상하 제목 padding과8dp 제목/부제 간격을 사용한다. 준비 중 안내와 실제 Home 날씨 요약을 한 줄 영역에 두고 비활성 CTA2개를 하단에 고정한다. 닫기는 header/Back을 사용하며 기록 생성, navigation, 서버 저장, XP를 연결하지 않는다. 실제 FINISHED_LOCAL의 저장 안내/닫기/경로 자동 스크롤은 유지한다.
- 생성은 built-in image_gen이며 새2개 파일의 전체 prompt/원본/hash는 `src/assets/images/walk/remaining-presentation-v1.source.json`에 보존한다. 기존6개 계절 종료 자산과 가을 원본은 보존한다.

## 수정 전후 검증 경계

- 새 계약6개 fail-first를 보존했다. 기존 테스트 중 이전 카피/숨김 신호 문구/fixture CTA 구조를 검증하던 assertion만 최신 PO 디자인 계약으로 갱신했다. 엔진 테스트나 native fixture는 수정하지 않는다.
- S24 Metro 공개 검토에서 Image 자체의 intrinsic sizing과 복구 화면 최소 지도 높이가 실제 잘림을 만들었다. 명시적 비율 frame과 복구 지도 최소 높이0으로 보정했다. 최초 잘린 캡처와 보정 후 캡처를 모두 보존하며 Release blind rebuild로 해결하지 않는다.
- 타이머 테스트는 기존 시간 assertion을 그대로 유지하고 별도 검증된 새 로딩 presentation만 mock해 비동기 접근성 조회가 clock 테스트의 act 경계를 오염시키지 않게 했다. 타이머 production source 변경0이다.
- 최종 local/Release 결과는 외부 최종 receipt를 참조한다. Store 승인이나 실제 GPS 정확도 PASS로 확대하지 않는다.

## 야외 QA 입력과 미완료 gate

- `OPEN_A`, 독립 기준1000m는 기존 PO 입력이다. 도심은 이번 독립 기준 질문에 대한 PO 답변 `1000`을1000m로 접수하고 비식별 코드 `URBAN_A`를 부여했다. 장소명/주소/좌표는 받지 않았다.
- 기존 간헐적 타이머2초 건너뜀은 해결됐다고 판정하지 않는다. `TIMER_DEVICE_EXIT_GATE: NOT_PASS`를 유지한다. 로컬 fake-clock PASS는 실제 device cadence PASS가 아니다.
- 따라서 타이머 gate와 exact Release의 필수 실내 runtime gate가 닫히기 전에는 야외 출발을 허용하지 않는다. 실제 보행, 정지10분, 개방/도심2회씩, 재부팅 물리 복구, 거리/route 오차와 battery/performance는 아직 NOT_RUN이다.
- 실제 야외 QA 중 기기 제어/ADB/로그 수집은 중단한다. 귀가 후 PO의 명시적 분석 재개 문구가 있어야 sanitized receipt 분석을 시작한다. 실제 지도/프로필/좌표 캡처와 raw DB/route export는 금지한다.
- 실제 보행 후 최종 판단 전 rawroute/checkpoint 삭제 금지. 지금 정리는 이 작업이 소유한 재생성 가능한 cache에만 한정하며 canonical docs/evidence와 active dependencies/toolchain은 보존한다. 과거 보고서는 검증 이력이므로 삭제 대상이 아니다.

## 보존

원본 repository181 dirty/status/content hash를 보존한다. Native/거리 엔진/Room/FGS/encryption/Wizard protocol/navigation/성능 corrective/server/XP delta0, uninstall0, clear data0, push NO, STORE HOLD다. Phase3는 physical QA pending이며 Phase4를 시작하지 않는다.
