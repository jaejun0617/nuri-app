# NURI Global CTA Final Approval and Freeze

2026-10-06 PO는 보고된 CTA 후보를 최종 승인하고 커밋·푸시 후 동결·다음 디자인 지시 대기를 요청했다. 이 기록은 승인된 상태와 알려진 제한을 함께 고정하며 새로운 구현 또는 Store 출시 승인이 아니다.

## 승인 범위

- GLOBAL_CTA_ROLE_SYSTEM: APPROVED_FROZEN_WITH_KNOWN_LIMITATIONS.
- 계절 Primary: 가을 #B95000, 겨울 #3B6398, 봄 #B84066, 여름 #247264. 최종 파괴 실행 #B93645, 삭제 진입·정리·보조·중립·비활성 역할 분리 유지.
- petTheme 개인화는 프로필·swatch·내비게이션·기능 아이콘·선택 표시에 보존한다. Auth·온보딩·첫 PetCreate·Weather·관리자·Native Alert 외형과 계절 배경·Home 재질은 이관 범위 밖이다.
- CTA가 같은 파일에서 소비하는 기존 일정 상세·기록 연결의 직접 의존 구현을 함께 선별 커밋한다. 완료 부분 갱신·사용자 주도 기록 작성·scoped draft·연결 복구·상세 복귀가 포함되며 새 DB 계약을 추가하지 않는다.
- 브랜치 `codex/task6-community-content-policy`, 승인 종료 시작 HEAD `3be4cb3ef580186974659245f7dcd24f6dcafd56`. 실제 최종 커밋·remote 일치·보존 결과는 `/private/tmp/nuri-global-cta-approval-closeout-20261006-194340/FINAL_REPORT.md`가 소유한다.

## 재사용한 검증

- TypeScript PASS, 대상 lint 0 errors·기존 33 warnings·새 warning 0.
- 대상 13 suites/112 tests PASS. 최초 테스트 호환 실패를 보완한 최종 전체 179 suites/1,759 tests PASS. 첫 실패 기록도 유지한다.
- 실제 incremental Release·install-r 각 1회 PASS. 설치 APK SHA `7cd742819507f1d3a73ad22ee84f5fb77a463abeaa7723e50b8d5d53767b8d75`.
- Galaxy S24 대표 4계절 16개 정상 화면, 삭제 확인창 취소, disabled 상태, 360dp/확대 글꼴 배치를 검증했다. 기기 설정과 가을 선택 복구. 이번 QA 로그 범위 FATAL/ANR/RN_FATAL 0.
- 후보 보고서 `/private/tmp/nuri-global-cta-role-system-20261006-183103/FINAL_REPORT.md`와 기존 일정 상세 보고서를 수정·대체하지 않는다.

## 알려진 제한

1. 빈 Timeline의 기록 시작과 floating 추가가 같은 행동의 solid Primary로 중복된다. 미수정이다.
2. 일정 상세 첫 진입 시 간헐적으로 화면 합성색이 옅어져 Primary 대비가 2.66~3.02:1이다. 재진입은 정상이나 구현 해결은 아니며 원인 미확정·미수정이다.

PO 승인은 두 항목을 해결 또는 native 전체 PASS로 바꾸지 않는다. 기존 실제 저장·삭제·연결·알림 수신·iOS·장기 검증 공백도 유지한다. corrective 자동 시작 없음.

## 동결 이후

- 이번 종료에 새 runtime/test 수정, 로컬 테스트 반복, 빌드·설치·기기 조작·remote 운영 변경·cleanup은 없다. Git push의 자동 CI는 별도 확인 결과로 기록한다.
- 미커밋 무관한 변경·공용 문서의 다른 부분·이미지 초안·사용자 QA·증적·APK·incremental output/cache 보존.
- AUTH: COMPLETE_FROZEN. WEATHER_SEASONAL_DESIGN: COMPLETE_FROZEN. API: COMPLETE_FROZEN.
- STORE: HOLD. NEXT_STATE: WAITING_FOR_PO_NEXT_DESIGN_DIRECTION. 별도 PO 지시 전 신규 디자인·보완·Store 작업을 시작하지 않는다.
