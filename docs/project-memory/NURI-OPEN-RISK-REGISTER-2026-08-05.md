# NURI Open Risk Register

기준일: 2026-08-05

| ID | 심각도 | 현상·근거 | 담당 방 | 상태 | 완료 기준 |
| --- | --- | --- | --- | --- | --- |
| DATE-001 | P1 | 날짜 직접 입력·하이픈 표시 보정이 dirty runtime 변경으로 남아 있다. | NURI-02-반려동물·프로필·날짜 | OPEN | focused tests, clean commit, 등록·수정·캘린더·재진입 확인 |
| HOME-001 | P1 | Home 프로필/최근 기록/전체 요약 관련 변경이 dirty 상태다. | NURI-03-메인홈·날씨·요약 | OPEN | 현재 diff 소유권 분리, clean APK, Home scroll·card·summary gate |
| TIMELINE-001 | P1 | Timeline generation/gate 수정은 HEAD에 있으나 이번 audit에서 고속 20x/30x를 재수행하지 않았다. | NURI-04-기록·Timeline | OPEN | clean APK에서 네 카드 fast re-entry와 category/empty/count frame evidence |
| AUTH-001 | P1 | Naver 완전 제거가 확정됐지만 app-side code, navigation, OAuth helper, config, environment reference, active dependency, Supabase Provider 또는 current 문서 잔존 가능성이 있다. | NURI-01-인증·온보딩 | OPEN / ACTIVATE_PRIORITY_2 | 사용자 노출·route·flow·helper·config·env·dependency·current 문서 0, remote Provider read-only 검증, Google/Kakao 회귀 |
| SUPABASE-001 | P1 | migration dry-run은 통과했지만 Docker 부재로 full remote policy/RPC/grant catalog dump는 미확인이다. | NURI-09-Supabase·RLS·RPC·운영DB | OPEN | 직접 read-only catalog evidence 또는 제한 사유를 release checklist에 고정 |
| ANDROID-001 | P1 | 현재 APK는 dirty runtime 기준 baseline이며 clean RC provenance가 아니다. | NURI-12-Android·Release-QA | OPEN | clean HEAD APK, checksum, install, smoke, app-scoped logcat |
| RELEASE-001 | P2 | Play Store asset/submission gate가 기능 구현과 분리되어 아직 닫히지 않았다. | NURI-12-Android·Release-QA | DEFERRED | clean RC 이후 store asset checklist와 submission decision |
| ADMIN-001 | P2 | 관리자 웹 build는 통과했지만 실제 production operator QA는 이번 audit에서 재수행하지 않았다. | NURI-10-관리자웹·운영도구 | OPEN | admin QA account 기준 route·권한·audit log evidence |
| PLACE-001 | P2 | 병원·펫동반 장소·좌표변환에 Kakao/provider 경로가 남아 있어 global provider-zero로 판정할 수 없다. | NURI-08-동물병원·산책POI·펫여행 | DEFERRED | domain별 provider scope와 trust/public boundary 문서화 |
| DOC-001 | P2 | 160개 QA 문서와 여러 domain 문서가 historical/current 혼합 상태다. | NURI-00-마스터-현황·결정·과거이력 | OPEN | canonical index 링크와 archive policy에 따른 점진 정리 |

AUTH-001의 정책은 이미 최종 확정됐다. 잔존 여부를 확인하는 주 소유는 NURI-01이며 NURI-09가 remote Provider read-only 증거를 지원하고 NURI-12가 release 회귀를 검증한다. 기존 dirty 문서의 historical Naver 표현은 이번 작업에서 수정하지 않았으며 current source of truth로 사용하지 않는다.

unknown 상태의 파일은 삭제하지 않았다. 위험 register에 근거가 없는 항목을 추측으로 추가하지 않는다.
