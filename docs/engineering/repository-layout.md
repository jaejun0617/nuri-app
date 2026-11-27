# 파일 배치와 Git 정리 기준

확장자보다 **누가 소비하고 무엇을 입증하는지**를 먼저 본다. 아래는 실제 저장소의 경로다. 새 기능 하나 때문에 루트에 별도 `images`, `sql`, `md` 폴더를 만들지 않는다.

| 새 자료 | 둘 곳 | 지킬 점 |
| --- | --- | --- |
| 앱이 읽는 이미지 | `src/assets/<도메인>/` | 실제 컴포넌트에서 참조. Android 리소스와 iOS asset catalog는 플랫폼 경로 유지. 생성 시안·QA 캡처와 분리. |
| 시안·보고서 이미지 | 실험 출력은 기존 `output/imagegen/`, 공유 가능한 선별본은 `docs/reports/assets/YYYY-MM-DD/` | 보고서에서 상대 링크. 개인 기기 원본·인증·문의 내용은 비공개 로컬 증거로 두고 Git에 넣지 않는다. |
| DB 변경·검증·SQL 설명 | `supabase/migrations/`, `supabase/tests/`, `docs/sql/` | 적용된 마이그레이션은 이동·개명하지 않는다. docs/sql 안에도 실행 입력이 있으므로 [SQL 가이드](../sql/정리-가이드.md)와 호출 스크립트를 확인한다. |
| 기획·현재 상태·개발 이력 | `docs/planning/`, `docs/project-memory/`, `docs/reports/` | 기획은 의도, 메모리는 현재와 재개점, 보고서는 실제 수행 결과. 진행률은 수락 원장을 링크하고 독립적으로 재산정하지 않는다. |
| 수락·인계·과거 원문 | `docs/qa/`, `docs/handoffs/YYYY-MM-DD/`, `docs/archive/YYYY-MM/` | 수락 이력은 덮어쓰지 않는다. 회신은 인계 원문으로, 채택한 결정만 메모리에 반영한다. |
| APK·복구본·개인 자료 | Git 밖의 승인된 보관 위치 | [디스크 기준](disk-hygiene-policy.md) 적용. APK 전체 해시·설치/복구 역할·예외 해제 조건을 남긴다. 해시는 설치 가능한 실물이 아니다. |

**자료를 옮길 때:** 먼저 tracked/untracked와 기존 수정을 확인한다. 기존 경로·파일명으로 코드·문서·스크립트를 찾고, 원본 Git blob과 이동본을 대조한다. Markdown 상대 링크와 첨부를 함께 갱신한다. 실행 경로나 원장 밖 참조가 불명확하면 파일은 두고 색인만 추가한다. 원본을 보존할 약정이 있으면 새 위치와 증거를 기록한다.

**Git 전달 단위:** 제품 수정+해당 테스트, 구조 변경+링크 수정, 수락 원장+보고서를 구분한다. 혼합 worktree에서 `git add .`를 사용하지 않는다. 경로 또는 hunk를 선별하고 `git diff --cached --name-status`와 `git diff --cached --check`로 확인한다. 비공개 설정·QA 로그인·개인 캡처·빌드 출력을 제외한다. 브랜치와 worktree는 이름·나이가 아니라 소유 작업, 고유 커밋, 미추적 파일, 열린 수락/복구 약정으로 존폐를 결정한다. `git worktree prune --dry-run --verbose`는 사라진 경로의 메타데이터 점검이지 사용 중인 작업본 삭제 도구가 아니다.

정리 전후에 저장소 루트에서 `node scripts/audit-repository-layout.cjs`를 실행한다. Git 추적 파일과 무시되지 않은 미추적 파일을 나눠 종류별 개수를 표시하며, 루트 검토 후보는 `rootReview`에 나온다. 목록은 이동·삭제 승인이 아니며 무시된 개인 파일·APK나 문서 본문은 검사하지 않는다. 검사 자체의 테스트는 `node --test scripts/test-audit-repository-layout.cjs`다.

**이번 이동표:** 루트의 `기획.md`는 [2월 초기 원문](../archive/2026-02/반려견-기록-앱-초기-기획.md)으로, 보고서 옆의 `NURI-inquiry-badges-2026-11-27.png`는 [보고서 이미지](../reports/assets/2026-11-27/NURI-inquiry-badges-2026-11-27.png)로 이동했다. 둘 다 내용은 그대로다. 앱 자산과 SQL 실행 경로는 이동하지 않았다.
