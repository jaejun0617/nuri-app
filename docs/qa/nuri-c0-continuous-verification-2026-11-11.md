# NURI v1.0 C0 연속 검증 · 2026-11-11 KST

**판정: 원래 C0 미동결. 이번 승인 범위도 부분 완료.** 기존 통합 4/7, OS 13/13·기록 4/4 내부 QA 동결, 기존 PASS 및 STORE HOLD 유지. P0 stability/final PARTIAL과 SU-544458 실질 회신 대기는 별도 게이트다.

## 기준과 실행 경계

- 앱 소스 `b73de0ffc86ee66dc08925cbef61cf13c2d1bd21`, [제품 CI](https://github.com/jaejun0617/nuri-app/actions/runs/42775666979). Galaxy S25 Edge(SM-S937N), Android 17, 1080×2340, 450dpi, 시스템 fontScale 1.0. 기존 설치 APK SHA-256 `9e1415c764835b7d4e49c375f1a945e50afaa2d1755f52f50630c160afa93616`. 문서 커밋과 제품 입력은 별개다. 새 앱 빌드·설치·migration·배포는 없었다.
- 이번 실제 서버 변경은 신규 격리 QA 자료에 한정했다. 운영 전체 공지·기존 데이터·권한·RLS·Cron·푸시 허용목록은 변경하지 않았다. U1·NAV-01을 순서대로 진행한 뒤 C0를 판정했다. 원래 7~14번과 신규 기획 5종은 시작하지 않았다.

## U2 실행표

원장 `4 · U2`, 기존 17묶음·26 eventType 그대로. 정상 실기기·서버·격리 계약을 서로 대체하지 않는다.

| eventType | 기존 PASS와 이번 결과 | 남은 조건 및 다음 실행 |
| --- | --- | --- |
| `community.comment`, `community.reply`, `community.post_liked`, `community.comment_liked`, `community.report_result` | 기존 대표 원본·상세·읽음 증거 재사용. 신고는 기존 원본의 최신 S25 Edge 읽은 행 복귀를 연결한다. 반복하지 않음. | 이번 신규 실행 대상 아님. |
| `activity.title_earned`, `activity.xp_granted`, `activity.level_changed` | 기존 대표 증거 재사용. | 반복하지 않음. |
| `record.created`, `record.updated`, `record.deleted`, `record.weekly_summary` | 기존 대표 증거 재사용. 수정 접근 불가 미읽음 및 삭제 안내 조건 포함. | 반복하지 않음. |
| `pet.birthday`, `schedule.reminder` | 기존 정상 원본 대표 증거 재사용. | 반복하지 않음. |
| `news.published`, `news.monthly_editorial`, `service.maintenance_started`, `service.maintenance_changed`, `service.maintenance_ended`, `service.action_required`, `account.policy` | **격리 SQL 계약 7/7 PASS.** 저장소의 실제 발행·fanout·상세·읽음·삭제 함수를 격리 PostgreSQL(PGlite)에 적용. 이벤트별 초안·미래 비노출, 지정 2계정 fanout·중복 없음, 상대 읽음 불변, 재발행 버전·개별 삭제, 편집판 고정 월 확인. 인증·스케줄·전송 인프라는 격리 fixture다. | **운영 원본/기기 BLOCKED.** 운영 프로젝트만 연결돼 있고 활성 공지의 실제 audience는 전체다. 정상 운영 원본이 QA에 도착하거나 별도 안전한 테스트 환경이 준비돼야 한다. 이번 운영 발행 0. |
| `news.direct` | **운영 서버 부분 PASS.** 기존 관리자 웹이 호출하는 단일 QA 발행 RPC로 새 `adminQA8` 1명에게 발행. 정상 운영자 캠페인·정확한 상세·서버 읽음, 최초 시각 멱등 및 다른 QA 읽음 차단 확인. 푸시 없음. | **앱 E2E 미실행.** 기존 앱은 이메일 QA의 세션 진입을 노출하지 않는다. 실제 앱 로그인 가능한 승인 QA 수신자와 정상 운영자 발행 경로 필요. |
| `pet.together_anniversary`, `pet.memorial` | **운영 서버 부분 PASS.** 새 QA 전용 아이 2마리에 날짜·추모 동의 사전 상태를 설정하고 해당 소유자만 실제 서버 스케줄러 함수로 실행. 같은 입력 2회에 정상 원본 2개만 생성. 세션의 상세, 각 아이 target, 서버 읽음, 타 계정 상세 차단 확인. outbox 2, 발송 접수 0. | **앱 E2E 미실행.** 위와 같은 기기 로그인 전제. 장기간 자연 사용·Cron 정기 실행·푸시·화면 진입 후 읽음을 증명한 것은 아니다. |
| `record.monthly_summary` | **PO 이번 실행 보류**, PASS 아님. 연계: 정상 11월 요약 원본·11월 고정 월 목적지·서버 읽음·S25 Edge Back. | 12/01 09:00 KST 이후 실제 생성된 Google QA 정상 원본과 PO 스크린샷. 다른 작업의 선행 조건 아님. 기존 자동 예약 일시중지 유지. |
| `pet.together_month` | **PO 이번 실행 보류**, PASS 아님. 연계: 기존 Kakao QA 아이의 실제 입양일 1개월·스케줄러 최초 한 건·정확한 아이의 목적지·읽음·Back. 연 기념일 `pet.together_anniversary`는 별도 실행했다. | PO 재개 후 실제 적격 날짜·원본·수신자와 기기 확인. 새 예약 없음. |

### 격리 전체 삭제와 정리

- 과거 S25 Edge의 격리 전체 삭제 확인·확정 PASS와 기존 취소 근거를 보존한다. 이번에는 새 격리 계정의 서버 API로 인증 없는 삭제 거부 후 원상태, 정당한 세션의 확정으로 QA 알림 3건만 가시 0, 다른 QA 계정 불변을 확인했다. 이번 새 계정으로 앱 확인창과 기기 네트워크 실패 복구를 새로 실행하지 않았다.
- 신규 일반 QA 2개: 수신자 `a6183059-08ec-4aec-9da5-884f4bcf64fc`, 타인 경계 `9930d37b-c1dc-4ab8-81b8-5e17e3e86024`. 공개 랭킹에서 제외하고 푸시 허용목록에는 추가하지 않았다. 정상 Admin Auth API와 관리자 일회용 링크 검증으로 실제 Auth 세션을 얻었다. 이메일 비밀번호 경로 비활성을 변경하거나 외부 제공자 계정을 만들지 않았다.
- 새 QA 세션을 전역 종료하고 정확히 두 QA 계정만 Admin Auth API로 삭제했다. Auth·세션·프로필·아이·알림·outbox·랭킹 제외·대상 캠페인 잔여 0. 기존 운영자 및 운영 감사 로그 삭제를 별도로 시도하지 않았다. 기존 Google QA 알림함은 60건·미읽음 29와 기존 행 상태 해시가 전후 동일했다. 비밀을 포함한 임시 자격증명 파일은 정리했다.

## U1 및 NAV-01

| 항목 | 이번 관찰 | 남은 조건 |
| --- | --- | --- |
| U1 Google 공식 선택 | S25 Edge 공식 선택 화면에서 PO가 승인 Google QA 한 계정을 선택. PKCE 검증·교환 성공·앱 Home 복귀, 삼성 인터넷 시험 후 Chrome 원복 및 동일 QA 재로그인 확인. | 기기 계정 선택지 수는 별도 기록하지 않았다. 단일 자동 선택과 동의·재인증 화면은 관찰 증거가 없으므로 수락하지 않는다. |
| U1 비지원 브라우저 | Auth Tab 지원 서비스는 Chrome만 확인. 기본 브라우저를 삼성 인터넷으로 임시 변경하자 실제 외부 브라우저가 열렸다. 삼성 패스 안내가 인증 진입을 가로막았다. 앱 로그인 화면 복귀, 기본 브라우저 Chrome 원복 및 정상 재시도 확인. | 대체 브라우저의 OAuth 왕복은 **PARTIAL**. 해당 브라우저의 초기 안내·승인 QA 입력이 없는 환경에서 정상 callback·실패·취소를 확인해야 한다. 제공자·인증 설정은 변경하지 않았다. |
| U1 중복·늦은 결과·세션 | 기존 중복·취소·소비된 callback 수락을 재사용. Auth·NAV 표적 Jest 8 suites·96 PASS. | 미소비 A→B→늦은 A와 기존 미충족 제공자 조건은 앱/서버 실제 수락으로 변경하지 않는다. |
| NAV-01 명시적 Home | S25 Edge 전체메뉴 → 건강관리 → 하단 Home, 메뉴 재노출 없이 정상 Home. 25.58초·86 encoded frames 영상과 3fps 추출 표본에서 해당 구간의 의도하지 않은 중간 Home·빈 화면을 관찰하지 못했다. | 전 프레임이나 전 경로 무플리커 보증이 아니다. |
| NAV-01 연속 입력·취소·복귀 | S25 Edge 전체메뉴의 전체일정 연속 입력 → 일정 화면 하나 → Android Back 한 번으로 원래 메뉴. 일정 추가에서 저장 없이 Back → 같은 전체 일정. 스크린샷과 접근성 상태 확인. | 기존 유한 범위의 나머지 실패·외부 복귀와 미실행 공통 경로를 남긴다. 과거 앱 종료 원인 해결을 선언하지 않는다. |

## C0 게이트 및 정확한 재개점

- **원래 통합 필수:** B1/B2, U3, U5의 기존 수락을 유지한다. U2·U1·NAV-01의 필수 미확인 및 P0 장기 안정성 게이트가 남으므로 C0 미동결이다.
- **이번 승인 실행:** U2 비보류 10종 중 운영 서버 3종과 격리 계약 7종을 실행했지만 신규 완전 앱 E2E 수락은 0/10. U1 실제 Google 복귀 1조건과 NAV-01의 3개 한정 경로를 추가했다. 두 보류를 기존 분모에서 빼지 않는다.
- **해결:** U2 정상 서버 원본·격리 검증과 새 QA 정리, Google 선택 후 Home, 명시 Home·일정 연속 입력과 Back·미저장 취소. **진행 중 백그라운드 작업 없음.** **잔여/계획:** 다음은 승인된 앱 로그인 가능 QA 수신자와 정상 운영자 개인 발행 연결, 또는 비전체 발행이 가능한 격리 앱 환경 확인이다. U1은 실제 동의·재인증이 필요한 승인 QA 또는 초기 안내 없는 비지원 브라우저가 필요하다. NAV-01은 증거 없는 경로만 선별한다. 두 모델 권장 Medium, 세션·권한 경계나 실제 플리커 원인 판단만 High.
- 증거 폴더: `/Users/shinjaejun/.codex/nuri-c0-20261111-LmpZOK/`. `isolated-announcements.json`, `remote-inbox-evidence.json`, `remote-scope-and-cleanup.json`, `auth-physical-events.txt`, NAV 화면 02~07 및 `nav-health-home-and-schedule.mp4`의 건강→Home 구간. 비공개 화면과 세션 자료는 Git에 넣지 않았다.
