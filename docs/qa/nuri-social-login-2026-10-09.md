# NURI 4계절 소셜 로그인 전환 및 이메일 계정 정리

## 승인 디자인의 Release 전달

승인된 소셜 로그인·스플래시를 [source `f6d284d` Release](nuri-ui-approved-release-2026-10-09.md)에 포함해 빌드·덮어 설치·푸시했다. APK `ccf759ca`는 최신 JS와 활성 계절 이미지를 내장하며 Metro가 필요 없다. 실제 OAuth·다른 기종 native 및 일반 탈퇴의 기존 OPEN은 유지한다. 과거 이메일 계정 정리는 이번 전달에서 재실행하지 않았다. STORE HOLD.

## PO 디자인 최종 승인 및 AUTO 복구

- PO가 스플래시·로그인 홈 디자인을 최종 승인했다. DESIGN_FINAL_APPROVED. 아래 PO 시각 검토 대기는 이전 단계 이력이다. 실제 OAuth/다른 기종/확대 글꼴 native 미확인 경계는 그대로 유지한다.
- 요청에 따라 기기의 계절 override를 `null`(AUTO)로 저장했고 완료 및 effective season `autumn`을 확인했다. 두 화면은 같은 계절 설정을 사용한다. Metro는 기존 ON 유지, 기기 PO 반환, 다음 작업 대기.
- 승인 기록과 AUTO 변경만 수행했다. 앱 소스·이미지 수정, 추가 테스트·build/install·DB·commit/push·cleanup·다음 작업 시작 없음. STORE HOLD.

## 최신 후속: 스플래시·Metro 전달 및 로그인 배경 정렬

아래 최초 구현/미설치 기록은 이전 단계다. PO 승인 후 스플래시 이미지 4개를 하트와 `너와 함께, 모든 계절` 문구로 교체하고, 같은 서명의 개발 APK 빌드·덮어 설치 각 1회 후 Metro를 연결했다. 개발 APK SHA-256은 `d9a921c9e3b25657e9ab3124ed47300abd7567d992b043d90769e994424ed737`이며 기존 UID·최초 설치 시각을 보존했다. 이후 시각 조정은 Metro로 전달했으므로 이 APK 해시가 최신 JS/이미지를 내장한 Release 해시라는 의미는 아니다.

### 최종 로그인 배치

- 이미지 파일 비율은 처음부터 모두 836×1881이었지만 봄·여름의 그림이 더 아래까지 이어졌다. 계절별 `artworkEndY` 및 -19dp 위치 보정이 CTA 차이를 만들었다. 파일 크기만 같다고 화면 구성까지 동일한 것은 아니었다.
- 봄·여름을 가을 구도 기준으로 재생성했다. 누리/하트/`함께한 순간을, 오래도록` 배치와 하단 흰 여백을 맞추고 상태바용 상단 110px에는 장식을 두지 않았다. 그림의 세부 동물 배치/계절 장면은 재구성됐으며 이전 원본은 유지했다.
- 최종 파일: `src/assets/seasonal/login/social/spring-aligned.png`, `summer-aligned.png`. 가을·겨울 asset은 변경하지 않았다. built-in image_gen 사용, [정확한 프롬프트와 미채택 시도](nuri-seasonal-splash-2026-10-09-evidence/login-composition-prompts.json).
- 모든 계절은 폭 기준 원본 비율과 공통 artwork 경계 1350px를 사용한다. 이미지 왜곡/전체 축소에 따른 좌우 여백 없이 하단 흰 영역만 생략한다. 봄·여름 전용 위치 보정은 제거했고 공통 -8dp 배치는 유지했다.
- 상태바 배경은 실제 top inset 높이의 비상호작용 흰색 View다. 스크롤 내용과 분리해 장식이 상태바 뒤로 올라가지 않게 한다. 전역 native/inset 소스는 변경하지 않았다.
- 최근 로그인 표시는 우측 끝에서 수직 중앙 정렬한다. CTA/정책 링크는 그림 다음 흐름으로 이동한다. PO 지시의 간주 동의 문구는 제거했고 이용약관/개인정보처리방침 링크와 기존 OAuth 흐름은 유지했다. 새 동의 저장 절차나 법률 검토를 추가한 것은 아니다.

### 검증 경계

| 항목 | 최신 결과 |
| --- | --- |
| TypeScript / 수정 범위 ESLint | PASS / 오류 0, 경고 0 |
| 전체 suite | 205 suites / 2,156 tests PASS, 정렬 후보 전체 실행 1회 |
| 대상 suite | 최종 별도 실행 3 suites / 52 tests PASS |
| 원본 비율 | 네 asset 836×1881, 360/384/430dp·가로 화면 계산 테스트 PASS |
| Galaxy S24 현재 외관 | 네 계절 첫 화면의 CTA 2개/정책 링크 표시, 상태바 장식 겹침 없음 |
| 네 계절 CTA 위치 | 실제 1080×2340 캡처에서 카카오 노랑 영역 y1748..1893 공통 |
| 다른 기종·확대 글꼴 | 구조/계산 테스트만 수행, native 외관 미확인 |
| 실제 OAuth 시작/성공/취소 | 이 후속 후보에서 미검증, 기존 기능 테스트만 재사용 |
| 이번 배경 정렬 추가 build/install | 0 / 0 |
| 직접 DB·계정·콘텐츠 변경 | 0, 이전 승인 계정 정리를 재실행하지 않음 |
| Commit / Push / Cleanup | 0 / 0 / 0 |

기기: SM-S937N / R5CY613NMSY, 기존 설정 유지. 네 계절 로그인 전환 후 시작 상태인 여름 override로 복구했다. 스플래시/로그인 각각 네 계절 3초 미리보기와 AUTO 복구는 앞선 세션에서 완료했고 이번 정렬 확인은 로그인만 수행했다. 현재 Metro ON, 기기 PO 반환, 추가 자동 조작 없음. 전체 키보드나 OAuth native QA 완료로 확대하지 않는다.

증거: `/private/tmp/nuri-splash-20261009/`의 `candidate-apk.json`, `season-preview-result.json`, `login-aligned-device.json`, `login-aligned-{autumn,winter,spring,summer}.png`, `login-aligned-full-suite.log`, `login-aligned-typescript.log`, `login-aligned-eslint-final.log`. CDP native bounds 수집은 빈 값이어서 bounds 판정에 쓰지 않았으며 CTA 위치는 캡처 픽셀로 비교했다. 다음 단일 단계는 PO의 봄·여름 디자인 확인이다. STORE HOLD.

## 최초 단계 기록

## 결과

로그인 홈을 첨부한 4계절 이미지와 카카오·Google CTA로 구현했다. 이메일 회원가입 화면과 공개 진입 경로는 제거했다. 앱 소스는 로컬 검증 완료 후보이며 아직 빌드·설치하지 않았다.

작업 중 추가된 PO 지시에 따라 이메일 단독 계정 52개는 실제 remote에서 즉시 탈퇴 처리했다. 소셜 연결 계정 4개와 해당 계정의 프로필·펫 6개·기록 27개는 보존했다. 화면 변경과 운영 데이터 처리를 같은 완료 상태로 혼동하지 않는다.

## 앱 구현

- `SignInScreen`: 이메일/비밀번호 입력, 비밀번호 찾기, 회원가입 진입 제거. 카카오·Google readiness gate, 최근 로그인 방식, 약관/개인정보처리방침 열람 유지.
- 공급자 CTA는 공식 로고 원형을 사용한다. 카카오 노랑과 Google 흰색은 계절색으로 덮지 않는다. 계절 및 사용자 글꼴 계약은 기존 provider를 사용한다.
- 이미지 내부의 누리 로고·하트·슬로건은 원본 그대로 사용한다. 추가 로고나 문구를 중복 렌더하지 않는다.
- Safe Area 내부에서 hero 70%, action 최소 30%의 공통 배치를 사용한다. 원본 836×1881 비율을 유지하고 하단 흰 여백만 clipping한다. 작은 화면/큰 글꼴에서는 버튼 높이가 늘고 전체 스크롤이 가능하다. 이는 레이아웃/구조 테스트 결과이며 native 픽셀 QA 결과가 아니다.
- OAuth 연속 탭은 동기 잠금으로 방지하고, 처리 중 양쪽 CTA를 비활성화한다. 실패 후 다시 시도할 수 있으며 기존 OAuth 오류 매핑과 callback/session bootstrap은 보존한다.
- 계정 삭제 대기 복구 모달과 로그아웃/탈퇴 완료 안내를 유지한다. 이메일 필드로 돌아가는 포커스·안내 액션은 제거했다.
- `SignUpScreen.tsx`, 해당 styles, signup 전용 seasonal 설정 및 RootNavigator 등록 제거. 닉네임 온보딩은 소셜 인증 이후 계속 사용한다.
- 기존 복구 deep link와 PasswordReset 화면들은 호환성을 위해 보존했지만 로그인 홈에는 진입점을 노출하지 않는다. DEV 이메일 도구, 서버 Email Provider 설정, 기존 이메일 service helper를 삭제하거나 비활성화한 것은 아니다.
- 기존 소셜 약관 안내 방식과 문서 링크만 유지했다. 신규 동의 기록 저장이나 법률 적합성 검토를 완료한 것으로 선언하지 않는다.

## 로컬 검증

| 항목 | 결과 |
| --- | --- |
| Node | 24.20.0 |
| TypeScript | PASS |
| 수정 범위 ESLint | 오류 0, 경고 0 |
| 대상 테스트 | 10 suites / 114 tests PASS |
| 전체 테스트 | 204 suites / 2,139 tests PASS, 전체 실행 1회 |
| 수정 source/test diff check | PASS |
| 첨부 원본과 bundled 이미지 | 4개 모두 byte-for-byte 일치 |
| 실제 Google/Kakao 인증·취소 | 이번 후보 실기기 미검증 |
| 360/384/430dp 및 가로 화면 | 비율 계산 테스트, native 시각 판정 미확인 |
| 확대 글꼴 | 가변 높이/스크롤 구조 검증, 1.3/1.5 실기기 미확인 |
| Build / Install / Commit / Push | 0 |

전체 작업 트리 diff check는 기존 unrelated dirty 2개(`nuri-glass-expenses` lint 로그, 기존 community migration)의 EOF 공백으로 실패한다. 해당 기존 파일은 이번 작업에서 수정하지 않았다. 검증 로그는 [evidence](nuri-social-login-2026-10-09-evidence/)에 있다.

## 공식 브랜드 자산

- [Kakao 디자인 가이드](https://developers.kakao.com/docs/ko/kakaologin/design-guide)의 [공식 로그인 SVG](https://developers.kakao.com/tool/images/resource/preview/login-complete-ko.svg)에서 말풍선 path를 변경 없이 분리해 PNG로 렌더했다. 원본 SVG와 파생 SVG를 보존한다.
- [Google 브랜딩 가이드](https://developers.google.com/identity/branding-guidelines)의 [공식 G PNG](https://developers.google.com/static/identity/images/g-logo.png)를 그대로 사용했다. 로고 임의 재도색/재작화 없음. 전체 버튼에 대한 공급자 심사 완료를 주장하지 않는다.
- 사용자 제공 배경 파일은 이동/덮어쓰기/AI 재생성 없이 복사했다. [이미지 해시](nuri-social-login-2026-10-09-evidence/assets.json).

## 이메일 계정 즉시 정리

PO가 이메일 가입 계정 삭제와 연결 댓글의 연쇄 삭제를 명시 승인했다. 이메일 주소 유무가 아니라 실제 `auth.identities`의 provider 집합으로 구분했다. `email`만 있는 52개를 고정 대상으로 사용했고 `email + google` 1개를 포함한 소셜 연결 계정 4개는 제외했다.

| 항목 | 처리 결과 |
| --- | --- |
| 이메일 단독 계정 | 52개 삭제, 잔여 0 |
| 대상 펫 / 기록 | 10개 / 44개 삭제, 잔여 0 |
| 대상 게시글 | 872개 삭제, 잔여 0 |
| 댓글 삭제 집합 | 353개: 대상 작성 213개 + 승인된 소셜 작성 연쇄 삭제 140개 |
| 첨부파일 | 27개 Storage API 삭제, 성공 27 / 실패 0 / 실제 object 잔여 0 |
| 대상 서버 세션 | 기존 108개, 잔여 0 |
| 탈퇴 요청 감사 기록 | 52개 completed, cleanup pending 0 |
| 소셜 계정 | 4개 유지, identity 집합 digest 동일 |
| 소셜 프로필 / 펫 / 기록 | 전체 row digest 동일, 펫 6개 / 기록 27개 유지 |
| 전역 7일 유예 정책 | 변경 없음 |
| 함수·트리거·RLS·cron 설정 | 변경 없음 |

운영 원본은 NURI linked remote `grmekesqoydylqmyvfke`. 이번 감사 origin은 `po_email_only_retirement_20261009`. 원래의 `execute_account_deletion_request`와 배포된 account-deletion-worker v10을 사용했다. worker 호출 `50495`는 HTTP 200, cleanup 27/27 성공이다. 비밀번호·토큰·이메일 원문을 산출물에 저장하지 않았다. [정리 및 보존 증거](nuri-social-login-2026-10-09-evidence/email-account-retirement.json).

첫 시도는 댓글 FK의 `SET NULL`과 `enforce_community_comment_reply_target`의 불변 검사 충돌로 실패했다. transaction 전체를 롤백했고 계정 56개/새 요청 0개를 확인했다. 이후 승인된 댓글 cascade 집합 353개를 먼저 하나의 DELETE로 정리하고 기존 계정별 finalizer를 실행했다. 중간 실패 시 전체 롤백 및 소셜 row digest 보존을 강제했다. 트리거 비활성화나 보호 규칙 우회는 하지 않았다.

**잔여 서버 결함:** 일반 개별 hard deletion에서 동일 FK/불변 검사 충돌이 다시 발생할 수 있다. 이번 일회성 정리 순서로 대상 삭제는 완료했지만 일반 탈퇴 함수·트리거를 수정한 것은 아니다. 별도 corrective가 필요하며 자동 구현하지 않는다.

Auth 사용자 및 refresh 가능한 세션은 제거됐지만, 이미 발급한 access JWT가 즉시 암호학적으로 무효가 되는 것은 아니다. 기존 만료/서버 접근 검사에 따른다. 기기를 조작하거나 강제 로그아웃하지 않았다. [Supabase 사용자 삭제 동작](https://supabase.com/docs/guides/auth/managing-user-data).

## 상태와 다음 단계

- UI: IMPLEMENTED_LOCAL_VALIDATED, PO 시각 검토 및 실기기 OAuth 회귀 미확인.
- Remote 계정 정리: COMPLETE, 이번 대상에 한해 유예 없이 처리.
- 기존 QA 데이터 보존 계약은 이번 승인 삭제 대상과 연결 댓글에 한해 대체됐다. 제외 소셜 데이터는 위 범위로 보존 확인했다.
- 기존 승인 스플래시, 다른 기능, unrelated dirty/디자인 산출물, 기존 APK는 보존했다.
- Branch `codex/task6-community-content-policy`, HEAD `1505c0e11ac3d2ee0339e75f43511c1ee232ddff`, 새 staging/commit/push 없음. STORE HOLD.
- 다음 단일 단계: PO가 로그인 홈 후보를 검토하고 실제 앱 전달·검증 진행 여부를 결정한다.
