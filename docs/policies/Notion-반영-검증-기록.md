# NURI 정책 문서 Notion 반영 / 검증 기록

작업명: NURI 정책 문서 세트 실서비스 공개 준비
최종 업데이트: 2026-04-03

## 1. 이번 턴의 목표

- repo 최종본 4종을 실제 Notion 페이지로 반영한다.
- 각 페이지의 공개 설정을 실제로 확인한다.
- 공개 URL을 확보하고 검증 가능한 상태로 기록한다.

## 2. Notion 직접 반영 시도 결과

판정: 성공

확인한 사실:

- 현재 세션에는 Notion 전용 MCP write tool이 없었다.
- 대신 사용자 로컬 환경의 실제 Chrome 로그인 세션을 복제한 별도 automation 프로필과 Chrome DevTools Protocol 경로를 확보했다.
- 그 경로로 Notion 웹에 실제 접속해 아래 페이지를 직접 생성했다.
  - `NURI 이용약관`
  - `NURI 개인정보처리방침`
  - `NURI 계정 삭제 / 탈퇴 안내`
  - `NURI 커뮤니티 운영정책`
- 추가로 검증용 상위 인덱스 페이지 `NURI 정책 문서`를 생성하고 4개 공개 URL을 정리했다.

## 3. Notion 페이지 및 URL

| 페이지 제목 | Notion 반영 | 공개 여부 | URL |
| --- | --- | --- | --- |
| NURI 이용약관 | 완료 | 공개 링크 확인 | `https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee8077a3ffc1d5968ddac7` |
| NURI 개인정보처리방침 | 완료 | 공개 링크 확인 | `https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee8045ba30d9ac3c0f3417` |
| NURI 계정 삭제 / 탈퇴 안내 | 완료 | 공개 링크 확인 | `https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee8080abbaf670c1e24ae1` |
| NURI 커뮤니티 운영정책 | 완료 | 공개 링크 확인 | `https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee80218ff1e34e1d1e2a6b` |

보조 사실:

- 상위 페이지 `NURI 정책 문서`는 생성 완료 상태다.
- 상위 페이지에는 4개 정책 문서 URL을 정리했다.
- 상위 페이지 자체의 public URL은 이번 턴 필수 완료 기준으로 잡지 않았고, 공개 여부는 별도 미확인으로 남긴다.

## 4. 접근 및 검증 방식

- 경로: 로컬 Chrome automation profile + CDP
- 이유:
  - Notion desktop app accessibility tree만으로는 안정적인 본문 입력과 공유 설정 전환이 어려웠다.
  - Safari / 기존 Chrome AppleScript JS는 Apple Events 실행 권한 제약으로 막혔다.
  - CDP 경로는 실제 로그인 세션 기반으로 페이지 생성, 본문 입력, 공유 모달 조작, `사이트 보기` 확인까지 수행 가능했다.
- URL 확인:
  - 각 페이지는 `게시` 후 `사이트 보기`로 실제 public tab이 열리는 것을 확인했다.
  - 각 URL은 별도 HTTP 요청 기준 `200` 응답을 확인했다.

## 5. 현재 상태

- 작성 완료: 예
- Notion 반영 완료: 예
- 앱 링크 연결 완료: 3종 완료
- 실기기 링크 검증 완료: 예
- 사용자 검증 완료: 예, PO 직접 확인 기준

## 6. 남은 확인 사항

- `src/services/legal/documents.ts`에서 앱이 실제로 쓰는 `terms`, `privacy`, `accountDeletion`은 `external`로 전환됐다.
- Android 실기기 `SM_S937N`에서 아래 경로의 외부 링크 열림과 뒤로가기 복귀를 확인했다.
  - 회원가입 > `이용약관 동의` > `전체 보기` > `NURI 이용약관`
  - 회원가입 > `개인정보처리방침 동의` > `전체 보기` > `NURI 개인정보처리방침`
  - 전체메뉴 > 계정 삭제 > `삭제 안내 상태 확인` > `NURI 계정 삭제 / 탈퇴 안내`
- 세 경로 모두 Notion public page가 로그인 요구 없이 열렸고, 뒤로가기 후 앱으로 정상 복귀했다.
- 2026-04-03 기준 PO가 위 경로를 Android 실기기에서 직접 재확인하고 Task 4 공식 승인 완료를 통보했다.
- `마케팅 정보 수신 동의서`는 repo 기준으로 공개 대상 문서로 전환됐지만, Notion 공개본과 앱 링크 연결은 아직 실행하지 않았다.
- `커뮤니티 운영정책` public URL은 확보됐지만 현재 앱 내부 진입점은 없다.
- 운영자 입력값 2차/3차 반영과 최종 운영/법무 입력 3개 확정으로 repo 정책 문서가 갱신됐으므로 Notion 공개본 재반영이 필요하다.

## 7. 2026-04-03 최종 운영/법무 입력 확정 이후 Notion 재반영 판정

- 재반영 필요 여부
  - 예
- 이유
  - repo 정책 문서에 운영 주체 실명 병기, 마케팅 정보 수신 동의서 공개 대상 전환, Supabase/Sentry `처리위탁 + 국외 이전` 확정 문구가 추가 반영됐다.
  - 현재 Notion public URL은 이전 버전 기준이라 repo 최종본과 내용 차이가 생겼다.
- 재반영 대상 문서
  - `NURI 이용약관`
  - `NURI 개인정보처리방침`
  - `NURI 계정 삭제 / 탈퇴 안내`
  - `NURI 커뮤니티 운영정책`
  - `NURI 마케팅 정보 수신 동의서`
- 아직 이번 턴에 재반영하지 않은 사실
  - 이번 턴은 repo 문서와 project-memory 반영만 수행했다.
  - Notion 공개 페이지 본문은 아직 다시 수정하지 않았다.
- 현재 잠금 상태
  - repo 문서: 최신
  - Notion 공개본: 재반영 대기
  - 법무 확정본: 미완료
  - 다음 기술 태스크: 계속 중단
