# NURI GLOBAL KEYBOARD FINAL REPORT

기준일: 2026-10-08 KST. 최종 설치 검증 후보와 이전 전역 QA 증거를 통합한 키보드 판정 보고서다.

PO 최종 승인: [승인 계약](nuri-global-keyboard-final-approval-2026-10-08.md). KEYBOARD_BASELINE: COMPLETE_FROZEN_WITH_EXACT_GATES. 승인 반영에서 추가 QA·source 변경·build/install을 하지 않았다.

## 1. 최종 결론

**확인된 미해결 키보드 결함은 0개다.** 이전 OPEN이던 K14/K15/K22/K23은 최신 설치 후보의 제한된 재검증에서 PASS로 닫았다. K29 한글 조합은 앞선 corrective에서 PASS였으며 그 판정을 유지한다.

전체 38개는 **PASS 26개, 실행 제한 8개, 개발 전용 1개, 미사용 3개**로 모두 분류했다. PASS 26개는 이전 판정 22개와 이번 재검증 4개의 합계다. **동일 최종 APK에서 38개 모두 재실행하거나 모두 PASS한 결과는 아니다.** 검사 완료, 결함 해소, PO 승인과 Store 승인을 분리한다.

| 상태 | 개수 |
| --- | ---: |
| PASS | 26 |
| OPEN_REPRODUCED | 0 |
| OPEN_NOT_REPRODUCED_FULL_SCENARIO | 0 |
| BLOCKED | 6 |
| NOT_REACHABLE_WITHOUT_MUTATION | 2 |
| DEV_ONLY_CONFIRMED | 1 |
| UNUSED_CONFIRMED | 3 |
| 설명 없는 NOT_RUN | 0 |
| 설명 없는 PARTIAL | 0 |
| WORK_IN_PROGRESS | 0 |
| 합계 | 38 |

GLOBAL_PHYSICAL_KEYBOARD_QA: COMPLETE_WITH_EXACT_GATES_AND_PRIOR_EVIDENCE.

ALL_PATHS_PASS: NO.

PO_FINAL_APPROVAL: FINAL_APPROVED.

## 2. 판정 근거

- [이전 38개 원장](nuri-global-keyboard-open-defect-2026-10-08-evidence/k-id-ledger-final.json): PASS 22, OPEN 4, 기타 12의 기준. 일부 PASS는 기술 증거와 PO 직접 확인을 함께 사용한다.
- [최신 4개 재검증](nuri-glass-expenses-2026-10-08-evidence/keyboard-revalidation-delta.json): K14/K15/K22/K23의 OPEN을 대체한다. 이전 원장·영상·APK는 덮어쓰거나 삭제하지 않았다.
- [통합 최종 원장](nuri-global-keyboard-final-2026-10-08-evidence/consolidated-ledger.json): 각 K-ID의 이전 상태, 현재 유효 판정, source owner, 재현 근거, 증거 APK를 분리했다.
- [최신 구현·실기기 보고서](nuri-glass-forms-monthly-expenses-2026-10-08.md): 최종 APK의 로컬 keyboard 보완과 함께 수행된 글라스·지출 검증을 소유한다.

이번 보고서 작성에서는 앱 source·test code 수정, 새 테스트, 기기 조작, build/install, DB/Supabase 접근을 하지 않았다. 이미 확보된 결과의 최종 정리이며 새로운 전역 QA 실행이 아니다.

## 3. 최종 검증 후보

| 항목 | actual |
| --- | --- |
| APK SHA-256 | `eae763280deb2bee464ad32413193afebb27484b446743f3be1cb3b37a53cc2d` |
| 설치 hash 일치 | PASS, 마지막 install 검증 기준 |
| versionName / versionCode | 1.0 / 1 |
| 기기 | Galaxy S24, SM-S937N, R5CY613NMSY |
| Android | 16 |
| 키보드 | Samsung Keyboard 5.9.30.97, Korean QWERTY |
| 화면 | 1080x2340px, density 450, 384dp |
| fontScale | 1.0 |
| 시스템 내비게이션 | THREE_BUTTON |
| UID | 10402, 유지 |
| 최초 설치 | 2026-06-02 19:16:57, 유지 |
| 마지막 업데이트 | 2026-10-08 19:49:17 KST |
| Metro / Fast Refresh | OFF / OFF, Release 검증 |

근거: [candidate identity](nuri-glass-expenses-2026-10-08-evidence/candidate-identity.json), [설치 결과](nuri-glass-expenses-2026-10-08-evidence/installed-apk.json). 이 보고서 작성 시 기기·설치 상태를 다시 조회하지 않았다.

## 4. K01부터 K38까지 최종 상태

`이전`은 앞선 직접 QA·PO 확인 증거를 재사용한 판정이다. `최종 재검증`은 최신 APK에서 해당 OPEN 시나리오를 다시 확인했다는 뜻이다. 보충 sanity는 전체 시나리오 재실행이 아니다.

| ID | 화면 | 최종 상태 | 검증 근거 |
| --- | --- | --- | --- |
| K01 | 로그인 | PASS | 이전 이메일/secure·입력·복귀 증거 |
| K02 | 회원가입 | PASS | 이전 입력·스크롤·복귀 증거; 제출 없음 |
| K03 | 비밀번호 재설정 요청 | PASS | 이전 이메일 입력·조합·복귀 증거 |
| K04 | 비밀번호 재설정 form | BLOCKED_RECOVERY_GATE | 승인된 recovery fixture 없음 |
| K05 | 온보딩 닉네임 | BLOCKED_ONBOARDING_FIXTURE | 승인된 미완료 onboarding fixture 없음 |
| K06 | 홈 일정 시트 | PASS | 이전 field/modal/부모 복귀 증거 |
| K07 | 펫 등록 | PASS | 이전 기술 증거 + PO 직접 PASS |
| K08 | 펫 프로필 수정 | PASS | 이전 기술 증거 + PO 직접 PASS |
| K09 | 몸무게 기록 시트 | PASS | 이전 소수·메모·selection/붙여넣기 증거 |
| K10 | 펫 삭제 확인 | NOT_REACHABLE_WITHOUT_MUTATION | 이전 접근 제한 판정 보존; 재진입 검사 없음 |
| K11 | 공통 날짜 입력 모달 | PASS | 이전 기술 증거 + PO 직접 PASS |
| K12 | 기록 작성 | PASS | 이전 기술 증거 + PO 직접 PASS; 최종 tag-return sanity 보충 |
| K13 | 기록 수정 | PASS | 이전 입력 증거; 최종 glass 폭·하단 접근 보충 |
| K14 | 공통 기록 태그 모달 | PASS | 최종 Weather caller 재검증; RecordCreate caller sanity |
| K15 | 날씨 활동 기록 | PASS | 최종 메모·태그 복귀·추가 입력·CTA 재검증 |
| K16 | 일정 검색 | PASS | 이전 기술 증거 + PO 직접 PASS |
| K17 | 일정 생성 | PASS | 이전 기술 증거 + PO 직접 PASS; 최종 form sanity 보충 |
| K18 | 일정 수정 | PASS | 이전 기술 증거 + PO 직접 PASS; 최종 form sanity 보충 |
| K19 | 커뮤니티 검색 | PASS | 이전 한글·selection·검색·clear·복귀 증거 |
| K20 | 커뮤니티 작성 | PASS | 이전 다중 줄·draft·복귀 증거; 게시 없음 |
| K21 | 커뮤니티 수정 | NOT_REACHABLE_WITHOUT_MUTATION | 승인된 현재 계정 소유 edit fixture 식별되지 않음 |
| K22 | 커뮤니티 댓글 | PASS | 최종 IME 위 입력·persistent scroll·한글 재검증 |
| K23 | 커뮤니티 인라인 답글 | PASS | 최종 offscreen 복귀·계속 입력·system-nav 경계 재검증 |
| K24 | 커뮤니티 신고 | PASS | 이전 사유 입력·취소·부모 복귀; 신고 제출 없음 |
| K25 | 편지함 | PASS | 이전 다중 줄·caret/selection·draft·CTA 증거 |
| K26 | 비밀번호 변경 모달 | UNUSED_CONFIRMED | 이전 production consumer/import/route 조사 결과 유지 |
| K27 | 닉네임 수정 모달 | PASS | 이전 입력·selection·Back·재진입; 저장 없음 |
| K28 | 계정 탈퇴 확인 | PASS | 이전 확인 입력·스크롤·취소; 탈퇴 실행 없음 |
| K29 | 가이드 검색 | PASS | 앞선 corrective에서 실제 한글 조합·검색·clear·재진입 확인 |
| K30 | 가이드 관리자 검색 | BLOCKED_ADMIN_GATE | 승인된 admin fixture 없음 |
| K31 | 가이드 관리자 편집 | BLOCKED_ADMIN_GATE | 승인된 admin fixture 없음 |
| K32 | 동물병원 검색 | PASS | 이전 한글·caret·붙여넣기·복귀 증거 |
| K33 | 산책 장소 검색 | PASS | 이전 한글·caret·붙여넣기·복귀 증거 |
| K34 | 병원 관리자 | BLOCKED_ADMIN_GATE | 승인된 admin fixture 없음 |
| K35 | 산책 POI 운영 사유 | BLOCKED_ADMIN_GATE | 승인된 운영 권한 fixture 없음 |
| K36 | 개발용 입력 | DEV_ONLY_CONFIRMED | Release route 비활성 판정 유지 |
| K37 | 구형 More 탈퇴 입력 | UNUSED_CONFIRMED | 이전 production consumer/import/route 미발견 |
| K38 | 미사용 추모 입력 컴포넌트 | UNUSED_CONFIRMED | 이전 production consumer 미발견 |

K10은 **이전 감사 당시 최소 펫 수 보호로 진입하지 못한 결과**를 유지한 것이다. 현재도 펫이 한 마리라는 뜻이 아니다. 이후 지출 QA에서는 기존 두 펫을 사용했지만 삭제 입력 경로를 다시 열거나 삭제로 우회하지 않았다. K21도 실제 소유 게시글이 운영 DB에 전혀 없다는 판정이 아니라, 안전하게 사용할 승인 fixture를 식별하지 못했다는 뜻이다.

## 5. Community 댓글과 답글

### 원인과 수정

1. 목록의 명시적 drag dismiss가 사용자 목표인 키보드 열린 상태 탐색과 충돌했다. 댓글 목록을 `keyboardDismissMode="none"`, `keyboardShouldPersistTaps="always"`로 유지하고 drag에서 dismiss를 호출하지 않는다.
2. 지연 focus/reveal과 오래된 target의 보정은 사용자가 옮긴 viewport를 되돌릴 수 있었다. interaction generation·target·layout 준비 신호로 요청을 제한하고 drag에서 pending reveal을 취소한다. 한 interaction의 focus/reveal을 반복하지 않는다.
3. 후속 후보에서 local content의 window Y와 IME 기준이 맞지 않아 여백·가림이 발생했다. 실제 content origin을 KAV offset으로 전달하고, safe-area bottom은 root 한 곳에서 소유한다. core/controller KAV 중첩이나 전역 native 변경은 하지 않았다.
4. 활성 composer의 draft state를 분리해 같은 target의 TextInput identity를 유지한다. FlatList 가상화를 유지하며 매 입력마다 모든 행이 draft를 구독하지 않도록 했다.

source owner는 `CommunityDetailScreen.tsx`, `components/CommunityCommentComposer.tsx`, `utils/commentViewport.ts`다. 지연 **IME reveal** 반복은 제거했지만 지정 댓글로 이동·하이라이트·좋아요 debounce의 별도 timer까지 전부 제거했다고 주장하지 않는다.

### 직접 확인한 결과

| 항목 | 결과 |
| --- | --- |
| 키보드 열린 상태 drag/fling | PASS |
| 인라인 입력창 offscreen 이동·복귀 | PASS |
| 복귀 후 재탭 없이 추가 입력 | PASS |
| draft·reply target 유지 | PASS |
| 한글 `테스트` 조합·caret 이동 | PASS |
| native selection UI | PASS, 모든 전환 조합의 장기 보증은 아님 |
| user scroll 중 강제 snap-back | 검증 구간에서 관찰되지 않음 |
| 반복 timer reveal·focus loop | 검증 구간에서 관찰되지 않음 |
| 닫힌 키보드에서 system navigation 침범 | NONE, 측정된 최하단 reply 기준 |
| 댓글·답글 전송 | NOT_RUN, 미저장 입력 검증만 수행 |

최종 일반 입력 bounds는 open `[98,1241][847,1366]`, IME top 1395px다. 여유 29px는 약 10.3dp이며 이전 48dp 공백 회귀와 다르다. closed reply `[65,1931][882,2091]`는 system navigation top 2205px보다 위다.

증거 root는 `/private/tmp/nuri-glass-expenses-20261008T092854/`다. `final-comment-hangul`, `final-comment-caret`, `final-reply-offscreen`, `final-reply-return`, `final-reply-continued`, `final-reply-selection`, `final-reply-closed-stable`의 PNG/JSON과 `community-final.mp4`를 보존한다. 닫힘이 완료되기 전 `final-reply-closed` 중간 캡처를 최종 closed 측정으로 사용하지 않는다.

## 6. Weather 태그 모달 복귀

별도 Android native Dialog의 종료가 parent IME 복귀를 깨뜨렸고, 독립 Back handler는 기존 entry-aware Back owner와 경쟁하여 parent 화면까지 종료할 수 있었다.

Weather caller만 같은 Activity의 embedded tag modal을 사용한다. 원래 focused field를 저장하고 open 시 blur, close 시 frame signal로 focus를 1회 복구한다. 기존 keyboard-aware scroll을 사용하고 기존 Back owner 한 곳이 태그 닫기와 화면 뒤로가기를 구분한다. 임의 timeout/retry는 추가하지 않았다.

최종 정상 경로는 메모 입력 → 태그 열기 → Android Back → 같은 메모로 복귀 → 추가 입력 → CTA 접근이다. draft·focus·IME가 유지됐으며 추가 입력 전에 수동 scroll이 필요하지 않았다.

메모 bounds `[90,1266][990,1638]`, IME top 1395px다. **메모 textarea 전체가 키보드 위에 들어온다는 판정은 아니다.** 실제 text/caret가 보이고 계속 쓸 수 있다는 판정이다. CTA `[90,1147][990,1304]`는 scroll로 접근했다. 빠른 두 번 Back에서 IME가 닫힌 중간 상태는 성공 근거로 사용하지 않았다.

`final-weather-tag-back-before`, `final-weather-back-parent`, `final-weather-continued`, `final-weather-cta-access`와 `weather-final.mp4`를 보존한다. RecordCreate의 기존 native tag caller도 복귀 후 IME·내용·추가 입력 sanity PASS다. RecordEdit은 inline 태그 입력이므로 같은 modal-return 검사는 N/A다.

## 7. Guide 한글 조합

K29의 입력 값 갱신을 transition 안에서 늦추던 경로는 native IME composition과 충돌했다. controlled TextInput의 `onChangeText={setSearchQuery}`는 동기로 반영하고, 검색 결과 계산만 `useDeferredValue`로 분리했다. uncontrolled 전환·입력 key 변경·자모 수동 조합·임의 timer는 사용하지 않았다.

앞선 corrective APK `7f24f510a4fc2a3f3b3a9aebf2974918b635483fd72051b425a801f18af8783b`에서 Samsung 키보드로 `테스트`, `강아지 건강 관리`, `test`, `123`, clear·검색 결과·닫기/재열기·Back을 직접 확인했다. 이 증거를 유지하며 최신 APK의 해당 화면 전체 재실행으로 표기하지 않는다. 해당 검색 화면에는 별도의 sort/filter UI가 없고 기존 audience/ranking 계약을 보존했다.

## 8. 공통 native와 화면별 정책

MAIN_ACTIVITY_CONFLICT: NOT_CONFIRMED.

GLOBAL_DOUBLE_INSET_CAUSE: UNKNOWN.

GLOBAL_KEYBOARD_REFACTOR: NOT_STARTED.

전역 MainActivity·edge-to-edge·windowSoftInputMode·keyboard provider를 수정하지 않고 확인된 local 원인을 보완했다. 특정 화면에서 정상이라는 사실로 전역 native 정책을 모두 정상이라고 확정하거나, 반대로 모든 문제를 Samsung Keyboard 탓으로 돌리지 않는다.

Community 댓글/답글의 persistent scroll과, 일부 검색 화면의 의도된 drag dismiss는 다른 계약이다. 사용자 지정이 없는 다른 화면을 이번에 일괄 persistent scroll로 변경하지 않았다. 최종 답글의 three-button 경계는 측정했지만 모든 화면의 custom toolbar와 IME 좌표를 최종 APK에서 다시 측정한 것은 아니다.

frame-level 전환 시간·P90/P95·janky frame 수는 최신 후보에서 측정하지 않았다. 캡처·native 입력 검증으로 확인한 품질을 장기 성능 PASS로 확대하지 않는다.

## 9. 검증과 빌드 이력

| 단계 | 실제 결과·횟수 |
| --- | --- |
| 앞선 OPEN corrective | 대상 34 tests, 최종 190 suites/1,939 tests PASS; full run 2회, build/install 각 1회 |
| 최신 glass/expense/local keyboard 배치 | 타입 PASS, lint 43파일 errors 0·기존 warnings 25 |
| 최신 대상 검사 | 9 suites/123 tests PASS; keyboard 외 expense/presentation 포함 |
| 최신 최종 전체 검사 | 192 suites/1,952 tests PASS |
| 최신 전체 검사 횟수 | 5회; 처음 2회 실패·후속 3회 PASS |
| 최신 incremental build/install-r | 각각 총 2회; 첫 후보 이후 추가 1회 PO 승인 |
| 보고서 작성 턴의 검사/build/install | 각각 0회 |

기존 전체 keyboard 배치의 build 2/install 1, 앞선 OPEN corrective의 build 1/install 1, 최신 배치의 build 2/install 2는 서로 다른 작업 단위다. 이 세 구현 배치의 기록 합계는 build 5/install 4이며, 앱 프로젝트의 전체 역사 누계나 이번 보고서 작성 횟수가 아니다. clean·uninstall·clear data는 실행하지 않았다.

검사 증거: [최종 validation](nuri-glass-expenses-2026-10-08-evidence/validation-final.json), [대상 log](nuri-glass-expenses-2026-10-08-evidence/targeted.log), [최종 전체 log](nuri-glass-expenses-2026-10-08-evidence/full-final.log). 가려짐·모달 복귀는 단위 검사만으로 닫지 않고 actual native evidence를 사용했다.

## 10. Runtime과 보존

- 최종 설치 이후 19:49:17~20:17:43 KST의 retained main/system/crash log 확인에서 앱 관련 FATAL 0·ANR 0·RN_FATAL 0. [runtime 범위](nuri-glass-expenses-2026-10-08-evidence/runtime-summary.json). 전체 기기 수명·장기 운영·Crashlytics proof는 아니다.
- 최신 배치 종료 시 baseline 보호 파일 1,690개 누락 0, task 외 hash 변경 0, 최종 build 이후 source/test/native/server delta 0. [기존 preservation](nuri-glass-expenses-2026-10-08-evidence/preservation.json).
- 마지막 QA 종료 상태는 Home·누리·가을·키보드 닫힘, 기본 화면·글자 크기·three-button 설정 복구, 기존 QA 로그인 유지다. 기기 조작을 PO에게 반환한 이후 이 보고서를 위해 현재 화면·계정을 다시 읽거나 변경하지 않았다.
- 댓글/답글·Weather 키보드 재검증에서는 저장·전송·삭제하지 않았다. 같은 최신 배치에서 별도 승인된 지출 QA 2건·1수정·동일 값 프로필 저장 1회가 있었으므로 전체 작업의 DB mutation을 무조건 0이라고 쓰지 않는다. 직접 SQL/schema/RPC/RLS/Storage policy 변경은 없었다.
- 이번 보고서 작성에서는 source/test·device·DB·cleanup 변경 0. 기존 protected dirty·QA100·댓글/답글·사진·APK/AAB·원장·빌드 산출물을 보존한다. staged NONE, commit NO, push NO.
- branch `codex/task6-community-content-policy`, HEAD/origin `26891aaed1fbee37141ecbd89e4d4c18970b4a1d`. 최신 source는 미커밋 QA 후보이며 clean Store RC가 아니다.

## 11. 남은 경계와 PO 결정

남은 12개는 숨겨진 FAIL이 아니라 승인 fixture·안전 접근 조건 또는 비활성 코드의 정확한 분류다. 이번 보고서로 role/account/recovery를 생성하거나 실제 삭제·관리자 작업을 실행하지 않는다. 향후 접근 조건이 바뀌면 별도 승인으로 해당 입력 경로만 검사한다.

확대 글꼴, 다른 화면 폭·기기, iOS, 모든 selection/offscreen 조합의 장기 반복, 최신 APK의 38개 전체 재실행은 미확인이다. 새 결함이 없다는 현재 증거와 모든 환경의 무결함 보증은 다르다.

NEXT_ACTION: PO의 다음 지시를 기다린다. 키보드 최종 판정은 승인됐으며 추가 키보드 QA·전체 38개 재검증·build/install은 하지 않는다. 기존 정확한 gate는 향후 fixture/접근 조건과 별도 승인이 있을 때 해당 K-ID만 검증한다.

KNOWN_OPEN_KEYBOARD_DEFECTS: 0.

K01_TO_K38: ALL_ACCOUNTED_WITH_MIXED_CANDIDATE_EVIDENCE.

GLOBAL_KEYBOARD_FINAL_APPROVAL: FINAL_APPROVED.

KEYBOARD_BASELINE: COMPLETE_FROZEN_WITH_EXACT_GATES.

MAIN_ACTIVITY_GLOBAL_CORRECTIVE: NOT_REQUIRED.

GLOBAL_NATIVE_INSET_CORRECTIVE: NOT_AUTHORIZED.

DEVICE_OWNER: PO.

CODEX_DEVICE_CONTROL: STOPPED.

STORE: HOLD.

AUTO_START_NEXT_WORK: NO.

MASTER_STATE: STOPPED_WAITING_FOR_NEXT_PO_INSTRUCTION.

다음 PO 지시를 기다립니다.
