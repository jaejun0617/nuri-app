# NURI Canonical Source of Truth

기준일: 2026-08-05

## 우선순위

1. 실제 runtime 코드와 현재 Git HEAD
2. linked Supabase remote 상태와 migration list
3. `AGENTS.md` 및 engineering 규칙
4. 이 디렉터리의 canonical 문서
5. domain 문서와 handoff
6. Android·관리자·운영 증적
7. 과거 대화와 archive 문서

## 현재 기준선

- 앱 repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`
- 앱 HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
- 앱 branch: `codex/task6-community-content-policy`
- 관리자 repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web`
- 관리자 HEAD: `5027caee2212ceca54dfe02270cc3ccdf76e32a3`
- 관리자 branch: `main`
- Android: `SM-S937N`, serial `R5CY613NMSY`, Android 16
- QA account: `adminQA`; credentials and personal data are never documented

## 판단 규칙

- 구현 완료, 검증 완료, 출시 준비 완료를 서로 같은 상태로 쓰지 않는다.
- 문서가 코드와 다르면 코드와 remote를 재확인하고 문서를 historical 또는 risk로 분리한다.
- dirty worktree의 변경은 소유권이 명확해도 별도 작업의 사용자 변경으로 보존한다.
- Supabase migration 일치와 remote policy/RPC row-level 증적은 별도 항목이다.
- 보관된 Codex 대화는 자동 source of truth가 아니다. 필요한 사실은 repo 문서와 Git에 기록한다.

## Canonical 문서 색인

- 현재 상태: `NURI-CANONICAL-CURRENT-STATE-2026-08-05.md`
- 전체 판정: `NURI-MASTER-PROGRESS-REPORT-2026-08-05.md`
- 도메인 지도: `NURI-DOMAIN-OWNERSHIP-MAP-2026-08-05.md`
- 위험 register: `NURI-OPEN-RISK-REGISTER-2026-08-05.md`
- 다음 작업: `NURI-NEXT-WORK-QUEUE-2026-08-05.md`
- thread 지도: `NURI-THREAD-MAP-AND-HANDOFF-INDEX.md`
- repository 정리: `NURI-REPOSITORY-CLEANUP-REPORT-2026-08-05.md`
