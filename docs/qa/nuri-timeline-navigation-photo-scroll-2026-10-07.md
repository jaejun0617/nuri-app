# NURI Timeline Navigation, Photo And Scroll Corrective

CLASSIFICATION: QA_CANDIDATE_PENDING_PO_APPROVAL

기준일: 2026-10-07 KST. [이전 상세 후보](nuri-timeline-memory-detail-redesign-2026-10-07.md) 이후 PO의 8개 추가 지시, 별도 승인된 두 차례 추가 빌드·설치, 마지막 CTA 문구·정렬·흰색 X 보완을 구분한다. 마지막 보완은 PO 결정에 따라 코드 수정·로컬 검증만 수행했다. 이 문서는 PO 최종 승인이나 Store 전체 검증 증적이 아니다.

## 현재 판정

RESULT: IMPLEMENTED_PENDING_PO_APPROVAL. 사진·기존 상세 복귀·상세/수정 스크롤은 bounded native PASS다. 두 번째 APK에서 발생한 저장 직후 Android native crash를 보완한 세 번째 APK는 정상 저장→자동 상세→Timeline 복귀를 직접 확인했다. 마지막 문구·정렬·흰색 X 보완은 로컬 PASS이며 미설치다. 네 번째 빌드·설치는 수행하지 않았다.

CURRENT_FUNCTIONAL_BLOCKER: NOT_REPRODUCED_IN_APPROVED_CREATE_SUCCESS_RECHECK. 한 차례 승인된 저장 재검증의 결과이며 장기간·전체 앱 crash 해소 보장은 아니다.

INSTALLED_SOURCE_DELTA: `src/screens/Records/RecordDetailScreen.tsx`, `src/screens/Records/RecordDetailScreen.styles.ts` 두 파일. 최신 설치본에는 마지막 문구·정렬·흰색 X가 없으며 현재 코드와 동일한 후보로 주장하지 않는다.

## 구현과 원인

| PO 범위 | 변경과 보존 경계 |
| --- | --- |
| 잘못된 뒤로가기 전역 조사 | 부모 화면의 과거 Home/More 출처를 자식에게 전달하면 entry-aware back이 실제 stack보다 우선한다. 펫 관리→프로필 수정, 실내 놀이→가이드→활동 기록은 즉시 출처 `stack`으로 분리. Timeline 목록→상세는 기존 보완의 `timeline` 유지. 실제 호출부와 hook을 조사했으며 모든 앱 화면의 native E2E 완료를 뜻하지 않음 |
| 새 기록 자동 상세의 별도 복귀 오류 | Root 작성 화면에서 `navigate(AppTabs)`가 새 탭 트리를 만들어 TimelineMain이 없는 상세를 열었다. 기존 AppTabs로 `popTo`, nested `initial: false`를 사용. 실제 StackRouter 회귀 테스트와 세 번째 APK의 정상 저장→자동 상세→Timeline 복귀로 확인 |
| 전체 날짜의 다른 추억 | 같은 pet의 canonical compound cursor(created_at/id)를 재사용. 첫 5개, 다음 5개씩 추가. 현재 기록·중복·다른 pet 제외. Timeline 개인 추억 범위와 분리된 health 기록은 기존 경계를 유지. 표시 개수는 로드된 개수이지 서버 전체 건수가 아님 |
| 여름 통계 위치 | 여름만 승인 위치에서 4dp 추가 상승. 다른 계절·히어로·통계 값·색상 토큰 보존 |
| Timeline 분류 칩 | 제목 위 칩 아이콘 제거, 배경/글자 대비 보완. 기존 compact padding 유지. 썸네일 fallback와 상세 관련 기록 칩 아이콘은 이번 목록 칩 범위와 별개 |
| 상세 사진 | 원본 참조 signed URL·실제 이미지 종횡비·측정된 영역 너비 사용. `contain`으로 전체 표시, 세로 사진은 화면 높이 70% 상한 안에서 비율 유지. 어두운 overlay 확대 보기·닫기/Android back 추가. pinch zoom은 구현하지 않음 |
| 수정 CTA | 기록 수정 `수정하기/취소하기` 실제 12sp, 이전 11sp. Community 수정 헤더 14sp·본문 17sp, 펫 프로필·일정 수정 12sp. 공통 컴포넌트는 opt-in 크기만 추가. 신규 등록·관리자 초안 저장·Native Alert·시스템 취소 의미는 보존 |
| 상세/수정 하단 스크롤 | 상세의 외부 ScrollView+비스크롤 nested list를 단일 세로 FlatList로 교체. 실제 overlay ToolbarHeightContext를 상세/수정 padding에 반영. 키보드 표시 시 toolbar 높이를 다시 예약하지 않음. 고정 기기 px spacer 없음 |

사진 picker의 기존 `quality: 0.9`와 upload 계약은 변경하지 않았다. 원본급 비율·전체 영역 표시 PASS이지 파일 byte 동일·무손실 업로드 보장은 아니다. RLS·Storage 정책·RPC·migration·moderation 변경 없음.

## 마지막 UI 보완의 경계

- 다른 추억 footer 문구는 `추억을 더 만나볼까요?`. 텍스트 `flex: 1`·중앙 정렬, 좌우 동일 18dp 슬롯으로 균형을 맞추고 오른쪽 끝 슬롯에 18dp Chevron을 배치했다. 기존 46dp 최소 높이·12dp 좌우 padding·5개 추가 로직·계절색은 유지했다.
- 확대 사진 X는 기존 `color="#FFFFFF"` 지정만으로는 브랜드 PNG 치환을 통과할 수 없었다. 해당 아이콘만 공통 semantic helper의 `preserveOriginal`을 사용해 흰색 Feather glyph를 렌더링한다. 앱 전체 브랜드 아이콘 계약은 변경하지 않았다.
- 기록하기 상단 `등록`과 하단 `완료`는 현재 유지했다. 하단 하나로 통일하는 안을 권장했으나 제거 여부 질문의 답변은 아직 없다. 상단 등록을 임의 삭제하거나 하단·키보드 배치를 변경하지 않았다.
- 이 세부 보완의 실기기 결과는 NOT_RUN. PO가 코드 수정·로컬 검증까지만 지시했으므로 추가 빌드·설치·기기 조작은 하지 않았다.

## 두 번째 후보의 Native Crash

2026-10-07 15:19:23 KST, QA-BACK 기록 저장 후 화면 전환 중 앱 종료. 기록은 정상 저장됐다. Android exit-info APP_CRASH 및 logcat에서 다음을 확인했다.

```text
java.lang.IllegalStateException: addViewAt: cannot insert view ...
View already has a parent ... ReactViewGroup
ReactClippingViewManager.addView / SurfaceMountingManager.addViewAt
```

성공 직후 `resetForm()`·`setSaving(false)`와 screen 제거가 같은 전환에서 발생했다. 제거 중인 native tree 변경은 [react-native-screens upstream 유사 보고](https://github.com/software-mansion/react-native-screens/issues/4677)의 재부착 충돌과 유사하다. 이는 사용자의 유사 재현 보고이지 유지보수자의 원인 확정이 아니다. 해당 view의 정확한 소속까지 확인한 것은 아니므로 라이브러리 원인으로 단정하지 않는다.

최소 보완: 성공한 form과 busy/submit 잠금은 unmount까지 유지; 실패 시에만 잠금 해제. 실패한 일정 연결의 recovery ID 유지·재시도는 별도 테스트로 확인했다. dependency·New Architecture·서버 변경 없음. 세 번째 APK에서 QA-TRANSITION 정상 저장·자동 상세 진입·Timeline 복귀 PASS; 저장 전후 PID 24150 유지도 당시 확인했다. 장기 반복 부하 검증은 미실행이다.

## 실기기 증적

기기 호출명 Galaxy S24, 실제 model `SM-S937N`, 1080×2340, density 2.8125. 기본 설정만 사용; width/fontScale 변경 없음. 원래 여름 preview로 복귀했다. 기기명과 실제 model을 혼동하지 않는다.

| 검증 | 결과 | 증적 root 안의 파일 |
| --- | --- | --- |
| 합성 사진 실제 앱 upload | PASS; 가로 1200×800, 세로 800×1200, 정사각 1000×1000 | `qa-images.json`, `qa-upload-complete.png` |
| 전체 사진 비율·모서리 | 첫 APK PASS; 990×660, 990×1485, 990×990. 두 번째 APK 가로 사진 재확인 PASS | `qa-detail-portrait.png`, `qa-detail-square.png`, `transition-photo-latest.png` |
| 확대 overlay·Android back 닫기 | 첫 APK PASS | `qa-lightbox.png`, `native-actions.jsonl` |
| 다른 날짜의 기록 5개씩 추가 | 두 번째 APK PASS, 5→10→14; unique title를 remote ID에 대응해 누락 0. 마지막 더보기 없음 | `history-validation-latest.json`, `transition-history-fourteen-end.png` |
| 마지막 상세 기록·footer 스크롤 | 두 번째 APK PASS, 마지막 행 bottom 1933px < toolbar top 2064px | `transition-history-fourteen-end.png` |
| 수정하기·취소하기 도달 | 두 번째 APK PASS, 취소 bottom 1884px < toolbar top 2064px; 취소로 상세 복귀 | `transition-edit-bottom.png`, `transition-edit-cancel-return.png` |
| 수정 키보드 대응 | 첫 APK bounded PASS, 입력·키보드·뒤로가기 확인; 저장하지 않음 | `qa-edit-keyboard.png` |
| 목록→상세→뒤로가기 | 두 번째 APK header·hardware back PASS, Timeline 복귀 | `extra-detail-hardware-back.png`, `transition-final-timeline.png` |
| 펫 관리→수정→back | 두 번째 APK PASS, 펫 관리로 복귀 | `extra-pet-edit-back.png` |
| 실내 놀이→가이드→활동 작성→back | 두 번째 APK PASS, 가이드→목록→메뉴 복귀; 기록 제출 없음 | `extra-weather-record-back.png`, `extra-guide-back-list.png` |
| 새 기록 저장→자동 상세→back | 두 번째 APK FAIL 이력 보존; 세 번째 APK PASS, TimelineMain 복귀·앱 종료 없음 | `extra-native-crash.log`, `transition-create-after-submit.png`, `transition-create-header-back.png` |
| 마지막 문구·정렬·흰색 X | 로컬 PASS, 실기기 NOT_RUN·미설치 | `final-polish-focused.json` |
| 다른 기기·확대 글꼴·전체 앱 E2E | NOT_RUN | 기본 기기 범위를 확대 주장하지 않음 |

## QA 데이터와 보존

승인된 기존 고정 QA 계정 fingerprint `8a4b4286815f`; 정상 앱 UI로만 생성했다. 신규 사용자·직접 DB write·운영 정책 우회 없음. 아래 ID는 기록 row ID이며 사용자 UUID가 아니다.

| 생성 기록 | Row ID | 이미지 |
| --- | --- | --- |
| QA-PHOTO-20261007-143644 | `950cf391-5b52-4a39-842e-8df6aff9db64` | 합성 PNG 3장 |
| QA-BACK-20261007-143644 | `8db3575b-21db-4af2-ac57-2af324d39cfb` | 없음 |
| QA-TRANSITION-20261007-143644 | `881e84f2-3e48-4f3b-8d6c-82be8eda9ea8` | 없음 |

기존 전체 기록 62→65, 이미지 rows 20→23, memory-images Storage objects 55→58. 기존 62 row 전체 digest 불변, 누락 0; pets/profiles digest 불변. QA 생성에 따른 정상 앱 activity 지급으로 표시 XP 547→567, 현재 월 기록 13→16. 두 번째·세 번째 기록은 추가 XP 표시 변화 없음. XP를 직접 조작하지 않았다. 마지막 CTA 보완에서 추가 QA 생성은 없다. Auth/운영 데이터 전수 감사는 미실행이며 RLS·Auth 정책·Community QA100은 변경하지 않았다.

QA_POST_DELETE: NO. QA_RECORDS: PRESERVED_FOR_PO_REVIEW. 기존 실제 기록 수정·삭제·계정/기기 설정 변경 없음.

## 로컬 검사와 산출물

TypeScript PASS. scoped ESLint 25파일 error 0, 기존 PetManagement `no-shadow` warning 2. 대상 7 suites/80 tests PASS. 전체 187 suites/1,906 tests PASS. 성공 후 사라질 mock 화면에서 다시 submit하던 일정 테스트를 실제 출발/recovery 계약으로 보완했고, 실패 recovery 재시도도 별도 확인했다. git diff --check PASS.

증적 root: `/private/tmp/nuri-timeline-navigation-scroll-20261007143644`. 작은 audit JSON은 [영구 metadata](nuri-timeline-navigation-photo-scroll-2026-10-07-evidence/README.md)에 별도 보존; APK·동영상·screenshots를 repo에 복제하지 않는다. temp root는 삭제하지 않는다.

| 후보 | SHA-256 | 빌드/설치 |
| --- | --- | --- |
| nuri-timeline-corrective-qa-3a92a6cf.apk | `3a92a6cfeab2eb6e061d8fcbb5b5cc5702838ee81b72ff74a665c4b59bde0608` | Release 225.496초 PASS, install-r 1회 PASS |
| nuri-timeline-corrective-extra-qa-59f161da.apk | `59f161dafa9e773b84fe42bf392a502fce19f6f8998616be9084b2243f6703bc` | 추가 Release 243.091초 PASS, 추가 install-r 1회 PASS; 오류 이력 보존 |
| nuri-timeline-corrective-transition-qa-e37ac813.apk | `e37ac8134a13c9798ea82a2dcc60b121df8b9d3df182d0676d94854021c6f305` | 추가 Release 234.898초 PASS, 추가 install-r 1회 PASS; 현재 설치본 |

전체 APK 절대경로는 위 root 아래 각 파일명이다. signer·비debuggable·cleartext 차단·embedded JS verifier PASS. 세 번째 verifier는 최초 Node 25 환경 실패를 보존하고 지정 Node 24.20.0으로 재검증해 PASS; 재빌드는 없었다. 미커밋 QA source fingerprint와 base HEAD를 구분한다. clean Store RC가 아니다. 현재까지 build/install 각각 총 3회, clean/uninstall/clear data 0회. 마지막 CTA 보완의 추가 build/install은 0회.

## Git과 다음 한 작업

HEAD: `f110bcc5b359bd44ba3381527d9ab7c084dace31`. BRANCH: `codex/task6-community-content-policy`. STAGED: NONE. COMMIT: NO. PUSH: NO. CLEANUP: NO. STORE: HOLD.

문서 갱신 전 Source/테스트 외 보호 입력 1,617개, 갱신 후 허용된 project-memory 4곳·release-checklist를 제외한 1,612개가 hash·존재 동일하다. 기존 dirty는 revert하지 않았다. 추가 문서는 이번 보고서·작은 audit metadata와 위 5개 문서의 현재 판정만 소유한다. Markdown structure·내부 링크·git diff --check PASS. 기존 canonical 보고서·APK/AAB·자산·signing·credentials·QA evidence 유지.

NEXT_ACTION: PO TIMELINE MEMORY DETAIL REVIEW. 상단 등록 제거 여부는 별도 결정 대기이며 마지막 로컬 보완의 설치도 새로운 지시 없이 시작하지 않는다. AUTO_START_NEXT_WORK: NO.

PO 승인을 기다립니다.
