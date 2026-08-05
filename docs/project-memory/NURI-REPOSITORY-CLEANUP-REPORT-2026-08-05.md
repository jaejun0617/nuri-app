# NURI Repository Cleanup Report

기준일: 2026-08-05

## 조사량

- docs 파일: 186개
- `docs/qa`: 160개
- `docs/domains`: 27개
- `docs/sql`: 60개
- project-memory: 현재 canonical 생성 전 8개
- Supabase migration: 53개
- 앱 Jest: 71 test files

## 수행한 정리

- 과거 전체 상태 snapshot 3개를 `docs/archive/2026-08/project-memory/`로 이동했다.
- archive README와 historical banner를 추가했다.
- 새 canonical 8개와 handoff pack을 추가했다.
- runtime source, migration, production data, asset, test를 삭제하지 않았다.
- generated artifact는 repo 안에서 불명확한 파일을 삭제하지 않았다. Android build output은 기존 산출물로 보존했다.
- 관리자 웹에서 실수로 추가된 `packageManager` field는 원복했으며 web worktree는 clean이다.

## 보존 원칙

- 160개 QA 문서는 경로가 서로 참조될 가능성이 있어 대량 이동하지 않았다. canonical index에서 historical/reference 상태로 취급한다.
- 현재 dirty 파일 10개는 변경 소유권을 확인했지만 사용자 변경으로 보존했고, 이 audit commit에 stage하지 않는다.
- unknown 변경은 삭제하지 않았다.

## 문서 링크

이번 audit이 새로 만든 문서의 절대 링크 누락과 `git diff --check`를 확인한다. 과거 문서 내부의 모든 링크는 archive 이동에 따른 전수 자동 치환을 하지 않았으므로, 다음 문서 방에서 domain별로 점진 점검한다.
