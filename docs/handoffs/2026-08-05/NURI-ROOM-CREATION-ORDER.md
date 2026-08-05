# NURI Room Creation Order

1. `NURI-02-반려동물·프로필·날짜`: 현재 dirty 날짜 입력 변경을 닫는다.
2. `NURI-03-메인홈·날씨·요약`: 현재 dirty Home 변경과 최근 작업을 닫는다.
3. `NURI-04-기록·Timeline`: 전체 요약과 Timeline 표시 parity 및 fast re-entry를 닫는다.
4. `NURI-09-Supabase·RLS·RPC·운영DB`: 공용 remote catalog와 provider policy를 닫는다.
5. `NURI-12-Android·Release-QA`: clean RC와 release gate를 닫는다.
6. open issue가 생기는 시점에 나머지 permanent room을 순차 생성한다.

각 단계는 앞 단계의 commit/push와 master 검수를 전제로 한다. room을 먼저 여러 개 만들어도 코드를 동시에 수정하지 않는다.
