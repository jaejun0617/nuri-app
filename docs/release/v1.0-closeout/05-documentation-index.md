# NURI Documentation Canonical Index

기준일: 2026-09-14 KST

기준 product head: `944c99961e3259307974e4982fc4776caf5fac1f`

## 먼저 읽을 문서

1. 현재 제품 상태: [01-current-product-state.md](01-current-product-state.md)
2. 완료/동결 작업: [02-completed-work-ledger.md](02-completed-work-ledger.md)
3. Release / Galaxy / QA 증적: [03-release-and-device-qa-evidence.md](03-release-and-device-qa-evidence.md)
4. 남은 gate: [04-open-gates-and-remaining-work.md](04-open-gates-and-remaining-work.md)
5. 전체 최종 증적: [NURI-v1.0-final-evidence-closeout.md](NURI-v1.0-final-evidence-closeout.md)

위 closeout 문서 6종이 현재 상태의 canonical set다. 기존 문서가 이 set과 충돌하면 기존 문서는 아래 분류에 따라 supporting, historical 또는 superseded 자료로 해석한다.

## 감사 범위

| 항목 | 수량 |
| --- | ---: |
| Existing project-authored Markdown/text documents scanned | 224 |
| `CANONICAL_CURRENT` | 12 |
| `CURRENT_SUPPORTING` | 76 |
| `HISTORICAL_EVIDENCE` | 77 |
| `SUPERSEDED` | 25 |
| `RESEARCH_ONLY` | 5 |
| `V1_1_FUTURE` | 29 |
| `UNKNOWN_NEEDS_CLASSIFICATION` | 0 |
| Deleted documents | 0 |

분류 합계는 224개다. 이번 closeout에서 새로 생성한 6개 문서는 pre-closeout 224개 감사 분모에 포함하지 않는다. `vendor/`의 third-party 문서와 `android/app/.cxx/` generated CMake text는 project-authored documentation 분모에서 제외했다.

## 분류 의미

- `CANONICAL_CURRENT`: 지금도 적용되는 엔지니어링, 운영, routing 또는 결정 규칙이다.
- `CURRENT_SUPPORTING`: 현재 구현과 운영을 설명하지만 최종 상태 snapshot 자체는 아닌 지원 문서다.
- `HISTORICAL_EVIDENCE`: 당시 구현, QA, handoff 또는 운영 사실을 보존하는 이력이다.
- `SUPERSEDED`: 더 최신 상태 문서가 현재 판단을 대체했다. 삭제하지 않고 역사로 보존한다.
- `RESEARCH_ONLY`: 의사결정 참고 자료이며 제품/release truth가 아니다.
- `V1_1_FUTURE`: v1.0 accepted release와 분리된 미래 계획 또는 rollback/설계 자료다.
- `UNKNOWN_NEEDS_CLASSIFICATION`: 이번 감사에서는 0개다.

## Existing document classification ledger

### CANONICAL_CURRENT (12)

- `AGENTS.md`
- `docs/engineering/advanced-codex-checklist.md`
- `docs/engineering/advanced-codex-memory.md`
- `docs/engineering/advanced-codex-workflow.md`
- `docs/engineering/disk-hygiene-policy.md`
- `docs/engineering/node-yarn-toolchain.md`
- `docs/engineering/release-artifact-procedure.md`
- `docs/engineering/키보드-대응/긴-폼-화면-KeyboardController-단일-스크롤-표준안.md`
- `docs/handoffs/2026-08-05/NURI-MASTER-TASK-ROUTING-POLICY.md`
- `docs/operations/공용-릴리즈-묶음-운영-기준/공용-릴리즈-묶음-운영-기준-통합-완성본.md`
- `docs/operations/마이그레이션-운영-기준/마이그레이션-운영-기준-통합-완성본.md`
- `docs/project-memory/핵심-결정사항.md`

### CURRENT_SUPPORTING (76)

- `.maestro/README.md`
- `README.md`
- `admin-console/README.md`
- `docs/README.md`
- `docs/archive/README.md`
- `docs/auth/social-provider-console-setup-guide.md`
- `docs/domains/auth/social-login-v1.md`
- `docs/domains/weather-api-cost-defense.md`
- `docs/domains/산책-위치기반-기능/산책-위치기반-기능-구현-상세.md`
- `docs/domains/산책-조회-신뢰성-개선/산책-조회-신뢰성-개선-통합-완성본.md`
- `docs/domains/아이들-프로필-관리/아이들-프로필-관리-실서비스급-구현-지시문.md`
- `docs/domains/집사-꿀팁-가이드-웹-CMS/웹-CMS-챕터1-구현-상세.md`
- `docs/domains/집사-꿀팁-가이드-웹-CMS/웹-CMS-챕터2-구현-상세.md`
- `docs/domains/집사-꿀팁-가이드-웹-CMS/웹-CMS-챕터3-구현-상세.md`
- `docs/domains/집사-꿀팁-가이드/집사-꿀팁-가이드-운영-전환-체크리스트.md`
- `docs/domains/집사-꿀팁-가이드/집사-꿀팁-가이드-최종-QA-체크리스트.md`
- `docs/domains/집사-꿀팁-가이드/집사-꿀팁-가이드-통합-완성본.md`
- `docs/domains/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-통합-완성본.md`
- `docs/domains/펫동반-장소-탐색/펫동반-장소-탐색-구현-상세.md`
- `docs/domains/펫동반-장소-탐색/펫동반-장소-탐색-신뢰도-보강-API-전략.md`
- `docs/handoffs/2026-08-05/NURI-01-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-02-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-03-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-04-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-05-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-06-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-07-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-08-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-09-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-10-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-11-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-12-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-13-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-14-STARTER.md`
- `docs/handoffs/2026-08-05/NURI-MASTER-DISPATCH-RESPONSE-TEMPLATE.md`
- `docs/handoffs/2026-08-05/NURI-NEW-THREAD-STANDARD-PROMPT.md`
- `docs/handoffs/2026-08-05/NURI-ROOM-ACTIVATION-PROMPT.md`
- `docs/handoffs/2026-08-05/NURI-ROOM-COMPLETION-RETURN-TEMPLATE.md`
- `docs/handoffs/2026-08-05/NURI-ROOM-CREATION-ORDER.md`
- `docs/handoffs/2026-08-05/NURI-ROOM-NAMING-AND-OWNERSHIP-POLICY.md`
- `docs/handoffs/2026-08-05/NURI-ROOM-REGISTRY.md`
- `docs/handoffs/2026-08-05/NURI-THREAD-STARTER-INDEX.md`
- `docs/handoffs/2026-08-05/rooms/NURI-01-인증·온보딩-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-02-반려동물·프로필·날짜-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-03-메인홈·날씨·요약-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-04-기록·Timeline-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-05-일정·건강·활동-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-06-커뮤니티·모더레이션-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-07-알림·운영메시지-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-08-동물병원·산책POI·펫여행-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-09-Supabase·RLS·RPC·운영DB-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-10-관리자웹·운영도구-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-11-디자인시스템·접근성-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-12-Android·Release-QA-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-13-가이드·리워드·프라이빗기억-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/rooms/NURI-14-v1.1-아키텍처·확장-ROOM-OWNERSHIP.md`
- `docs/planning/pre-store-design-polish-candidates.md`
- `docs/policies/Notion-업로드용-정책-문서-세트.md`
- `docs/policies/개인정보처리방침.md`
- `docs/policies/계정-삭제-탈퇴-안내.md`
- `docs/policies/마케팅-수신-안내-초안.md`
- `docs/policies/마케팅-정보-수신-동의서.md`
- `docs/policies/이용약관.md`
- `docs/policies/정책-문서-운영자-입력값-체크리스트.md`
- `docs/policies/정책-문서-정합성-점검.md`
- `docs/policies/커뮤니티-운영정책.md`
- `docs/project-memory/NURI-DOMAIN-OWNERSHIP-MAP-2026-08-05.md`
- `docs/project-memory/NURI-THREAD-MAP-AND-HANDOFF-INDEX.md`
- `docs/qa/admin-qa-backlog.md`
- `docs/qa/nuri-app-typography-inventory-2026-07-23.md`
- `docs/sql/공용/새빈DB-재구축-적용순서.md`
- `docs/sql/정리-가이드.md`
- `docs/sql/커뮤니티/community-comment-notification-rollback-note.md`
- `docs/커뮤니티-기획/커뮤니티-목록-화면-UI-명세.md`
- `docs/커뮤니티-기획/커뮤니티-실서비스급-아키텍처-기획서.md`
- `docs/커뮤니티-기획/커뮤니티-펫-메타-스냅샷-전략.md`

`CURRENT_SUPPORTING`의 policy body는 현재 참고/작업 문서이며 final legal text가 아니다. Dated routing 자료는 제품 상태가 아니라 ownership와 작업 절차를 지원한다.

### HISTORICAL_EVIDENCE (77)

- `backups/supabase/20260329_backup_before_rebuild/README.txt`
- `backups/supabase/20260329_backup_before_rebuild/migration-list.txt`
- `docs/archive/2026-08/project-memory/NURI-앱-전체-진행률-최종보고.md`
- `docs/archive/2026-08/project-memory/NURI-앱-전체점검-및-고도화-최종보고.md`
- `docs/archive/2026-08/project-memory/NURI-앱-조건부-QA-4건-최종-closeout.md`
- `docs/handoffs/2026-08-05/NURI-00-MASTER-HANDOFF.md`
- `docs/planning/NURI-앱-관리자-핸드오프-후속작업-정리.md`
- `docs/planning/admin-homepage-implementation-track.md`
- `docs/policies/Notion-반영-검증-기록.md`
- `docs/project-memory/NURI-REPOSITORY-CLEANUP-REPORT-2026-08-05.md`
- `docs/project-memory/최근-작업-로그.md`
- `docs/qa/NURI-앱-전체-실기기-회귀-QA-보고.md`
- `docs/qa/NURI-앱-최종-release-gate-QA-보고.md`
- `docs/qa/NURI-앱-최종-통합-release-QA-보고.md`
- `docs/qa/admin-final-content-moderation-integration.md`
- `docs/qa/admin-final-hospital-review-integration.md`
- `docs/qa/admin-homepage-responsive-qa-report.md`
- `docs/qa/android-navigation-keyboard-back-qa-report.md`
- `docs/qa/animal-hospital-android-smoke-2026-04-22.md`
- `docs/qa/animal-hospital-android-smoke-2026-04-23.md`
- `docs/qa/animal-hospital-canonical-load-2026-04-18.md`
- `docs/qa/animal-hospital-delta-dry-run-2026-04-22.md`
- `docs/qa/animal-hospital-delta-dry-run-2026-04-23.md`
- `docs/qa/animal-hospital-device-qa-2026-04-18.md`
- `docs/qa/animal-hospital-official-phone-promotion-2026-04-23.md`
- `docs/qa/animal-hospital-official-phone-promotion-dry-run-2026-04-23.md`
- `docs/qa/animal-hospital-official-phone-seed-2026-04-23.md`
- `docs/qa/animal-hospital-official-phone-seed-apply-2026-04-23.md`
- `docs/qa/animal-hospital-ops-report-2026-04-23.md`
- `docs/qa/animal-hospital-ops-summary-2026-04-22.md`
- `docs/qa/animal-hospital-p0-p2-closeout-2026-04-22.md`
- `docs/qa/animal-hospital-provider-enrichment-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-batch2-summary-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-google-apply-2026-04-23-batch1.md`
- `docs/qa/animal-hospital-provider-enrichment-google-apply-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-google-apply-batch2-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-google-dry-run-2026-04-23-batch1-threshold85.md`
- `docs/qa/animal-hospital-provider-enrichment-google-dry-run-2026-04-23-batch1.md`
- `docs/qa/animal-hospital-provider-enrichment-google-dry-run-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-google-dry-run-batch2-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-google-smoke-2026-04-23.md`
- `docs/qa/animal-hospital-provider-enrichment-kakao-smoke-2026-04-23.md`
- `docs/qa/animal-hospital-provider-location-admin-closeout-2026-04-23.md`
- `docs/qa/animal-hospital-public-query-priority-2026-04-18.md`
- `docs/qa/animal-hospital-regression-2026-04-18.md`
- `docs/qa/animal-hospital-remote-schema-2026-04-18.md`
- `docs/qa/animal-hospital-runtime-matching-2026-04-18.md`
- `docs/qa/animal-hospital-sensitive-verifications-apply-2026-04-23.md`
- `docs/qa/animal-hospital-sensitive-verifications-dry-run-2026-04-23.md`
- `docs/qa/animal-hospital-thumbnail-import-2026-04-22.md`
- `docs/qa/animal-hospital-thumbnail-import-2026-04-23.md`
- `docs/qa/animal-hospital-thumbnail-import-apply-2026-04-23.md`
- `docs/qa/animal-hospital-thumbnail-import-dry-run-2026-04-23.md`
- `docs/qa/animal-hospital-thumbnail-policy-2026-04-18.md`
- `docs/qa/animal-hospital-ui-ux-pass-2026-04-18.md`
- `docs/qa/animal-hospital-v1-evidence-pack-2026-04-28.md`
- `docs/qa/animal-hospital-verification-followup-2026-04-18.md`
- `docs/qa/cache-security-audit-report.md`
- `docs/qa/community-list-detail-redesign-qa-report.md`
- `docs/qa/final-rc-evidence-2026-05-29.md`
- `docs/qa/frequent-records-e2e-qa-report.md`
- `docs/qa/full-e2e-navigation-hospital-coverage-2026-06-30.md`
- `docs/qa/nuri-project-report-2026-05-29.md`
- `docs/qa/performance-loading-optimization-report.md`
- `docs/qa/production-readiness-optimization-report.md`
- `docs/qa/release-evidence-pack-2026-04-30.md`
- `docs/qa/weather-home-card-redesign-2026-07-23.md`
- `docs/출시-준비도-회복/00-운영-가이드.md`
- `docs/출시-준비도-회복/02-상태-규칙.md`
- `docs/출시-준비도-회복/03-작업-완료-기록.md`
- `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`
- `docs/출시-준비도-회복/12-정책-문서-외부-공개-앱-링크.md`
- `docs/출시-준비도-회복/13-정책-문서-작업-완료-기록.md`
- `docs/출시-준비도-회복/14-runtime-환경-분리-하드코딩.md`
- `docs/출시-준비도-회복/15-guide-source-of-truth.md`
- `docs/타임라인-원문-전체/타임라인-관련-코드-및-SQL-전체.md`
- `docs/프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md`

### SUPERSEDED (25)

- `docs/operations/프로젝트-전체-진행현황/프로젝트-전체-진행현황-통합-완성본.md`
- `docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md`
- `docs/project-memory/NURI-CANONICAL-SOURCE-OF-TRUTH.md`
- `docs/project-memory/NURI-MASTER-PROGRESS-REPORT-2026-08-05.md`
- `docs/project-memory/NURI-NEXT-WORK-QUEUE-2026-08-05.md`
- `docs/project-memory/NURI-OPEN-RISK-REGISTER-2026-08-05.md`
- `docs/project-memory/다음-작업-우선순위.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/qa/release-checklist.md`
- `docs/qa/v1.0-remaining-task-risk-ledger.md`
- `docs/reports/NURI-앱-전체-작업현황-및-잔여리스크-2026-07-22.md`
- `docs/reports/nuri-app-full-project-final-status-report-2026-06-22.md`
- `docs/reports/nuri-project-full-status-report-2026-06-v1.0-closeout-v1.1-progress.md`
- `docs/reports/nuri-project-master-status-and-roadmap-2026-07.md`
- `docs/sql/펫동반-장소/레거시/펫동반장소-메타-초안.md`
- `docs/출시-준비도-회복/01-전체-우선순위-로드맵.md`
- `docs/프로젝트-현황-최종기획/1차-최종-기획-진행서.md`
- `docs/프로젝트-현황-최종기획/2차-최종-기획-진행서.md`
- `docs/프로젝트-현황-최종기획/3차-최종-기획-진행서.md`
- `docs/프로젝트-현황-최종기획/4차-우려사항-및-장기운영-리스크.md`
- `docs/프로젝트-현황-최종기획/4차-최종-기획-진행서.md`
- `docs/프로젝트-현황-최종기획/5차-최종-기획서.md`
- `docs/프로젝트-현황-최종기획/6차-v1.0-기준선-기획서.md`
- `docs/프로젝트-현황-최종기획/6차-최종-기획서.md`
- `기획.md`

`SUPERSEDED`는 삭제 대상이라는 뜻이 아니다. 현재 상태 판단만 이 closeout set으로 대체한다.

### RESEARCH_ONLY (5)

- `docs/reports/nuri-father-business-report-and-budget-2026-06.md`
- `docs/reports/nuri-father-development-progress-budget-2026-07-04.md`
- `docs/리서치/task-관리-현황.md`
- `docs/리서치/리서치.md`
- `docs/리서치/우리동네-동물병원-아키텍처-설계서.md`

### V1_1_FUTURE (29)

- `docs/domains/멀티펫-구독/멀티펫-구독-DB-설계.md`
- `docs/domains/멀티펫-구독/멀티펫-구독-UX-플로우.md`
- `docs/domains/멀티펫-구독/멀티펫-구독-결제상태-흐름.md`
- `docs/domains/멀티펫-구독/멀티펫-구독-구현기획서.md`
- `docs/domains/멀티펫-구독/멀티펫-구독-상세내용.md`
- `docs/domains/멀티펫-구독/멀티펫-구독-운영정책.md`
- `docs/domains/반려동물과-여행/데이터베이스/반려동물과-여행-Trust-Layer-스키마-초안.md`
- `docs/domains/반려동물과-여행/반려동물과-여행-초기-설계.md`
- `docs/domains/반려동물과-여행/반려동물과-여행-펫정책-아키텍처.md`
- `docs/domains/산책-위치기반-기능/v1.1-walk-poi-admin-import-review.md`
- `docs/domains/산책-위치기반-기능/v1.1-walk-poi-national-expansion.md`
- `docs/domains/산책-위치기반-기능/v1.1-walk-poi-postgis-foundation.md`
- `docs/domains/산책-위치기반-기능/v1.1-walk-poi-seed-strategy.md`
- `docs/planning/7차-v1.1-개발-작업서.md`
- `docs/planning/NURI-수익화·구독·광고-검토-2026-07-22.md`
- `docs/planning/v1.1-additional-update-plan-and-checklist.md`
- `docs/planning/v1.1-second-mvp-policy-spec.md`
- `docs/planning/v1.1.1-admin-notification-push-policy.md`
- `docs/planning/v1.1.1-home-widget-rainbow-bridge-parking-spec.md`
- `docs/planning/v1.1.1-priority-and-activity-title-spec.md`
- `docs/planning/v1.1.1-push-token-opt-in-next-track.md`
- `docs/planning/v1.1.1-ranking-system-spec.md`
- `docs/project-memory/v1.1-roadmap-briefing-2026-06-04.md`
- `docs/qa/pet-travel-remote-drop-readiness-2026-04-22.md`
- `docs/sql/산책-위치기반-기능/README.md`
- `docs/sql/타임라인-메모리/v1.1-notification-dismiss-rollback-note.md`
- `docs/sql/타임라인-메모리/v1.1-second-mvp-activity-notification-xp-rollback-note.md`
- `docs/출시-준비도-회복/13-pettravel-trust-search-filter-계약.md`
- `docs/프로젝트-현황-최종기획/6차-v1.1-업데이트-기획서.md`

### UNKNOWN_NEEDS_CLASSIFICATION (0)

없음.

## Protected pre-existing dirty

다음 파일은 감사에는 포함했지만 이번 closeout에서 수정하거나 stage하지 않는다.

- `docs/project-memory/다음-작업-우선순위.md`
- `docs/project-memory/최근-작업-로그.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/리서치/리서치.md`
- `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`
- `supabase/.temp/cli-latest`

`docs/project-memory/다음-작업-우선순위.md`와 `docs/project-memory/현재-프로젝트-상태.md`는 보존된 과거/누적 상태이며, 현재 product/release status는 이 closeout set에서 읽는다. `docs/project-memory/최근-작업-로그.md`는 historical ledger로 유지한다.

## 유지 규칙

```text
DELETE_OLD_HISTORY: NO
MAKE_CURRENT_TRUTH_OBVIOUS: YES
BROKEN_CANONICAL_LINKS: 0_REQUIRED
AUTO_START_NEXT_WORK: NO
NEXT_OWNER: MASTER
```
