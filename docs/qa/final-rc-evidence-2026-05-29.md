# Final RC Evidence Baseline - 2026-05-29

## 1. 기준

- 기준 날짜: 2026-05-29 KST
- 작업 유형: V1.0 final RC evidence closeout
- 브랜치: `codex/task6-community-content-policy`
- 기준 HEAD: `ef5e431`
- 시작 worktree: `git status --short` 기준 clean
- 완료 worktree: 문서 evidence 반영으로 dirty. 코드 변경 없음.
- 커밋/푸시: 미진행. PO의 이번 턴 명시 지시 없음.

## 2. 수정 파일 목록

- `docs/qa/final-rc-evidence-2026-05-29.md`
- `docs/qa/release-checklist.md`
- `docs/qa/v1.0-remaining-task-risk-ledger.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/project-memory/다음-작업-우선순위.md`
- `docs/project-memory/최근-작업-로그.md`

수정 금지 파일 `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`는 수정하지 않았다.

## 3. 검증 명령 결과

| 명령 | 결과 | 판정 |
|---|---|---|
| `git status --short` | 시작 시 clean, 문서 반영 후 docs 변경만 존재 | 코드 변경 없음 |
| `corepack yarn tsc --noEmit --pretty false` | 출력 없이 종료 | 통과 |
| `corepack yarn lint` | error 0건, 기존 warning 6건 | 통과 |
| `adb devices -l` | `R5CY613NMSY`, model `SM_S937N`, `device` | 연결 확인 |
| `adb shell am start -n com.nuri.app/com.nuri.MainActivity` | 이미 foreground인 top-most instance에 intent 전달 | 실행 확인 |
| `adb logcat -d` fatal pattern scan | `FATAL EXCEPTION`, `ANR`, `unhandled promise`, ReactNativeJS fatal/error pattern 매칭 0건 | 통과 |
| `git diff --check` | 문서 반영 후 실행 | 통과 |

## 4. Android 기기 정보

- device id: `R5CY613NMSY`
- model: `SM_S937N`
- package: `com.nuri.app`
- launch activity: `com.nuri.app/com.nuri.MainActivity`

이번 턴에서는 OAuth 전체 flow, Naver success smoke, 날짜 UX 확장 smoke를 반복하지 않았다. 직전 Android 실기기 evidence를 V1.0 source of truth로 유지하고, 앱 1회 실행과 logcat fatal pattern만 확인했다.

## 5. V1.0 provider 최종 상태

| Provider | V1.0 상태 | Evidence |
|---|---|---|
| Google | 사용 | Android success session smoke 완료. 기존 사용자 홈 진입 기록 유지. |
| Kakao | 사용 | 신규 사용자 `NicknameSetup -> PetCreate -> 펫 등록 -> 홈` Android smoke 완료. |
| Naver | 미사용 | V1.0 public surface soft disable. 로그인 화면 미노출. Supabase `custom:naver` provider와 app-side 코드는 hard delete하지 않음. |
| Apple | 제외 | Android-first V1.0 범위 밖. |

Secret, token, provider 계정 전체 이메일, client secret 전체값은 문서에 기록하지 않는다.

## 6. 소셜 회원가입 최종 상태

- Google: V1.0 OAuth success session smoke 완료. 기존 사용자 홈 진입 기록 유지.
- Kakao: V1.0 신규 소셜 가입 smoke 완료.
- Kakao 신규 가입 flow: `OAuth -> session -> NicknameSetup -> 닉네임 중복확인/저장 -> PetCreate -> 펫 등록 -> 홈`
- provider metadata: `nickname_confirmed`를 대체하지 않는다.
- NURI profile source of truth: 앱 내부 confirmed profile.
- V1.0 blocker: 없음.

## 7. 펫 날짜 UX 최종 상태

- 적용 화면: PetCreate, PetProfileEdit
- 공통 컴포넌트: DatePicker modal
- 직접 입력 형식: `YYYY-MM-DD`
- 과거 날짜 evidence: `2010-05-12` 입력 및 저장, 홈 카드 `생년월일 2010.05.12` 반영
- invalid date evidence: `2010-99-99` 입력 시 validation error 표시 및 저장 차단
- 미래 날짜 처리: `maximumDate={new Date()}` 기준 차단
- keyboard avoiding: Android 실기기 smoke 완료
- V1.0 blocker: 없음.

## 8. V1.1 이동 항목

- Naver OAuth hard delete cleanup
- 산책/location discovery 자체 POI DB 구축
- Supabase PostGIS 기반 bbox/radius/distance query
- Kakao Local 사용자 runtime 제거
- Kakao Local admin seed 보조 도구화
- MapLibre React Native 검토
- PMTiles/OSM 기반 자체 타일 호스팅 검토

V1.0에서는 지도/API 비용 폭탄 방어 gate를 닫았다. Google Places/Photos 경로는 차단되었고, Kakao Local은 클라이언트 직접 호출 없이 서버 경유·캐시·fan-out 제한 상태로 통제한다. 단, Kakao Local은 provider-zero가 아니므로 V1.1에서는 산책/location discovery를 자체 POI DB + Supabase PostGIS 기반 반경 검색으로 전환한다. Kakao Local은 사용자 runtime에서 제거하고, 필요 시 admin seed 보조 도구로만 제한한다.

## 9. 최종 판정

- V1.0 P0 blocker: 0건
- V1.0 OAuth blocker: 0건
- V1.0 지도/API 비용 blocker: 0건
- V1.0 펫 날짜 UX blocker: 0건
- V1.0 필수로 남은 운영/제출 gate: 최종 제출용 clean RC build artifact/provenance, 운영자 QA/실기기 최종 스모크, 앱 스토어 출시 자산 셋업

따라서 V1.0 기능/비용/OAuth/date UX blocker는 0건이며, 다음 실행 단위는 최종 제출용 clean RC build artifact/provenance 고정이다.
