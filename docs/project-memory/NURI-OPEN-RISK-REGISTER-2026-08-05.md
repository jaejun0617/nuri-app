# NURI Open Risk Register

기준일: 2026-08-05

| ID | 심각도 | 현상·근거 | 담당 방 | 상태 | 완료 기준 |
| --- | --- | --- | --- | --- | --- |
| DATE-001 | P1 | 날짜 직접 입력·하이픈 표시 보정이 dirty runtime 변경으로 남아 있다. | NURI-02-반려동물·프로필·날짜 | OPEN | focused tests, clean commit, 등록·수정·캘린더·재진입 확인 |
| HOME-001 | P1 | Home 프로필/최근 기록/전체 요약 관련 변경이 dirty 상태다. | NURI-03-메인홈·날씨·요약 | OPEN | 현재 diff 소유권 분리, clean APK, Home scroll·card·summary gate |
| TIMELINE-001 | P1 | Timeline generation/gate 수정은 HEAD에 있으나 이번 audit에서 고속 20x/30x를 재수행하지 않았다. | NURI-04-기록·Timeline | OPEN | clean APK에서 네 카드 fast re-entry와 category/empty/count frame evidence |
| AUTH-001 | P1 | Naver 완전 제거 대상이었던 app-side 실행 표면·route·helper·config·dependency·current 문서가 closeout에서 제거됐다. | NURI-01-인증·온보딩 | CLOSED_APP_SURFACE | remote Provider read-only 확인은 별도 non-blocking follow-up이며 signed RC Auth regression은 NURI-12 책임 |
| SUPABASE-001 | P1 | migration dry-run은 통과했지만 Docker 부재로 full remote policy/RPC/grant catalog dump는 미확인이다. | NURI-09-Supabase·RLS·RPC·운영DB | OPEN | 직접 read-only catalog evidence 또는 제한 사유를 release checklist에 고정 |
| ANDROID-001 | P1 | 현재 APK는 dirty runtime 기준 baseline이며 clean RC provenance가 아니다. | NURI-12-Android·Release-QA | OPEN | clean HEAD APK, checksum, install, smoke, app-scoped logcat |
| RELEASE-001 | P2 | Play Store asset/submission gate가 기능 구현과 분리되어 아직 닫히지 않았다. | NURI-12-Android·Release-QA | DEFERRED | clean RC 이후 store asset checklist와 submission decision |
| ADMIN-001 | P2 | 관리자 웹 build는 통과했지만 실제 production operator QA는 이번 audit에서 재수행하지 않았다. | NURI-10-관리자웹·운영도구 | OPEN | admin QA account 기준 route·권한·audit log evidence |
| PLACE-001 | P2 | 병원·펫동반 장소·좌표변환에 Kakao/provider 경로가 남아 있어 global provider-zero로 판정할 수 없다. | NURI-08-동물병원·산책POI·펫여행 | DEFERRED | domain별 provider scope와 trust/public boundary 문서화 |
| DOC-001 | P2 | 160개 QA 문서와 여러 domain 문서가 historical/current 혼합 상태다. | NURI-00-마스터-현황·결정·과거이력 | OPEN | canonical index 링크와 archive policy에 따른 점진 정리 |
| HOME-COMMUNITY-001 | P2 | `CommunitySection.tsx`가 서버 `p_limit=3` 이후에도 `items.slice(0, 3)`을 적용한다. 승인된 Home 계약의 서버 bounded response와 중복되며 client-side slicing 금지 원칙과 불필요하게 겹친다. | NURI-03-메인홈·날씨·요약 | OPEN_NARROW / feature frozen | 별도 승인된 최소 수정에서 slice 제거 및 focused test로 서버 bounded contract 확인 |
| COMMUNITY-POLICY-001 | P1 | block backend와 앱 action은 구현됐지만 QA-A/QA-B fixture 소유권이 확인되지 않아 실제 authenticated block/unblock 및 cross-account visibility evidence가 없다. | NURI-09-Supabase·RLS·RPC·운영DB / NURI-06-커뮤니티·모더레이션 | RELEASE_BLOCKING / APP_COMPLETE_CONTROLLED_QA_PENDING | 승인된 QA-A/QA-B fixture로 A/B mutual exclusion, unblock 재노출, unrelated user, anonymous behavior를 controlled QA로 확인 |
| RELEASE-SIGNING-001 | P1 | clean signed release APK를 만들기 위한 protected keystore password, alias, key password 공급이 현재 protected process에 없다. | NURI-12-Android·Release-QA | BLOCKED_EXTERNAL_INPUT | 승인된 signing credential supply path 확보 후 정확히 한 번 clean signed build, signer 확인, install/smoke 수행 |
| AUTH-REMOTE-001 | P2 | Google/Kakao/Naver/Apple remote Auth Provider catalog 상태는 이번 Auth closeout에서 mutation 없이 확인하지 않았다. | NURI-09-Supabase·RLS·RPC·운영DB | UNVERIFIED_NON_BLOCKING | remote provider read-only catalog evidence. Auth app-surface closeout을 재개하지 않는다 |
| HOME-TIMELINE-001 | P1 | Home totalRecords는 건강·병원·일기·명시적 미분류를 제외하지만 Timeline all count는 일기·미분류를 포함할 수 있어 동일 데이터의 count 의미가 달라질 수 있다. | NURI-03-메인홈·날씨·요약 / NURI-00-마스터-현황·결정·과거이력 | RELEASE_CONTRACT_REVIEW | v1.0 노출 count 정책을 명시하고, 필요 시 Home 또는 Timeline 중 한쪽의 최소 수정과 focused evidence로 닫는다 |
| COMMUNITY-BLOCK-ACTION-001 | P1 | `community_user_blocks` backend와 앱 block/unblock action은 구현됐지만 실제 authenticated action 및 QA evidence가 아직 없다. | NURI-06-커뮤니티·모더레이션 | RELEASE_BLOCKING / IMPLEMENTED_CONTROLLED_QA_PENDING | 승인된 QA-A/QA-B 계정과 소유가 일치하는 controlled fixture로 block/unblock 흐름을 검증 |
| COMMUNITY-DETAIL-001 | P1 | `fetchCommunityPostById()`는 block visibility predicate를 재사용하지 않으며 detail block 정책이 별도로 정의되지 않았다. | NURI-06-커뮤니티·모더레이션 / NURI-09-Supabase·RLS·RPC·운영DB | POLICY_REVIEW | detail에서 block 관계를 적용할지 v1.0 정책을 명시하고 별도 계약으로 닫거나 명시적 deferred 판정 |

AUTH-001의 정책은 이미 최종 확정됐다. 잔존 여부를 확인하는 주 소유는 NURI-01이며 NURI-09가 remote Provider read-only 증거를 지원하고 NURI-12가 release 회귀를 검증한다. 기존 dirty 문서의 historical Naver 표현은 이번 작업에서 수정하지 않았으며 current source of truth로 사용하지 않는다.

unknown 상태의 파일은 삭제하지 않았다. 위험 register에 근거가 없는 항목을 추측으로 추가하지 않는다.
