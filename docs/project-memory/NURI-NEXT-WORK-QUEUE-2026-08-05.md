# NURI Next Work Queue

우선순위는 코드 소유권과 release 영향 기준이다.

## Priority 1

1. `NURI-02-반려동물·프로필·날짜`: 현재 dirty 날짜 입력 변경을 focused test와 Android 입력 흐름으로 닫고 별도 commit한다.
2. `NURI-03-메인홈·날씨·요약`: 현재 dirty Home 변경을 기준선과 분리하고 최근 기록·프로필·전체 요약의 clean APK 회귀를 수행한다.
3. `NURI-04-기록·Timeline`: 전체 요약 카드 네 가지의 기록 수와 Timeline 목록의 parity, fast re-entry, false empty를 clean APK에서 확인한다.
4. `NURI-09-Supabase·RLS·RPC·운영DB`: remote policy/RPC/grant 직접 조회 경로를 확보하고 Naver provider 잔존 정책을 결정한다.

## Priority 2

5. `NURI-12-Android·Release-QA`: clean RC artifact, checksum, logcat, store gate를 고정한다.
6. `NURI-10-관리자웹·운영도구`: production operator QA와 audit/rollback/security route를 실제 권한으로 검증한다.

## CREATE_LATER

- `NURI-01-인증·온보딩`: 다음 provider 또는 account policy 변경 때 생성한다.
- `NURI-05-일정·건강·활동`: schedule/health/activity 제품 변경 때 생성한다.
- `NURI-06-커뮤니티·모더레이션`: community write path 또는 moderation 변경 때 생성한다.
- `NURI-07-알림·운영메시지`: push/in-app notification lifecycle 변경 때 생성한다.
- `NURI-08-동물병원·산책POI·펫여행`: POI/provider/trust 변경 때 생성한다.
- `NURI-11-디자인시스템·접근성`: 공통 token·font·a11y 변경을 독립적으로 시작할 때 생성한다.
- `NURI-13-가이드·리워드·프라이빗기억`: guides/ranking/rewards/letters/guestbook 변경 때 생성한다.
- `NURI-14-v1.1-아키텍처·확장`: v1.1 cross-domain architecture decision이 필요할 때 생성한다.

코드 write 작업은 항상 한 방만 동시에 실행한다.
