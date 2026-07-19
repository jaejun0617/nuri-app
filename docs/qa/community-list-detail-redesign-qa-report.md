# 커뮤니티 목록·상세·댓글 리디자인 QA 보고

기준일: 2026-07-19

## 1. 범위

- 구현 위치: React Native 앱 `CommunityList`, `CommunityDetail`, comment/reply presentation.
- 디자인 방향: 첨부 게시판 레퍼런스의 빠른 scan 구조를 NURI color/token에 맞게 재해석.
- 범위 제외: 앱 전체 디자인, 폰트, Play Store, actual push, 관리자 신규 기능.
- DB/RPC/RLS migration: 없음.

## 2. 구현 결과

### 목록

- compact editorial row, 유형 icon, 최대 2줄 제목, dense metadata, 우측 댓글 수 rail.
- 가로 스크롤 category tab과 선택 반려동물 accent.
- 좋아요, 카테고리 tab, 주요 navigation의 44px touch target.
- row별 최신 댓글 request/subscription 제거. 100건에서 별도 comment N+1 fetch 없음.
- cursor pagination과 scroll 위치 유지.

### 상세·댓글

- post header/body/action과 comment section hierarchy 유지.
- flat comment row와 thin divider.
- reply guide line, indent, 1-depth 계약.
- 게시글 작성자 댓글·답글에 accent surface/border와 `글쓴이` badge.
- 일반 댓글은 중립 surface로 구분.
- comment composer keyboard avoiding, send CTA, Android back 정상.

## 3. Remote QA dataset

- fixture post: 100건, 모두 `adminQA` 소유 및 active.
- top-level comment: 200건.
- reply: 100건, 모두 게시글 작성자의 1-depth 답글.
- 전체 fixture comment/reply: 300건.
- 게시글별 구조 audit: 일반 댓글 1개, 글쓴이 댓글 1개, 글쓴이 답글 1개를 모두 만족한 게시글 `100/100`.
- secondary nickname snapshot: 1건. 일반 댓글 작성자 표시 fallback을 검증하는 controlled 보조 row이며 cleanup에 포함된다.
- 생성 방식: controlled authenticated session으로 기존 RLS, trigger, content policy를 통과.
- cleanup: exact prefix와 owner 확인 후 soft-hide/restore만 허용.
- 기존 과거 QA post: allowlist 6건을 운영자 요청·승인·실행과 audit를 거쳐 soft-hide. active 0건, hard delete 0건.

## 4. Android visual QA

- 기기: `SM_S937N / R5CY613NMSY`.
- 계정: 고정 QA 계정 `adminQA`.
- APK: `android/app/build/outputs/apk/release/app-release.apk`.
- versionName/versionCode: `1.0` / `1`.
- APK bytes: `114810160`.
- APK SHA-256: `19f2aa1e9a3a9d71f343fec952456304d15a24c2aec9fdb6bf524379781a2fd7`.
- build/install: `assembleRelease` 성공, `adb install -r` 성공.

검증 결과:

- cold start 후 기존 `adminQA` Home session 유지.
- Community 첫 page 20건과 `20개 이상` 상태 정상.
- 100번째 fixture까지 cursor pagination 정상.
- 과거 QA post 6건 public 목록 미노출.
- 일반 댓글, 글쓴이 답글, 글쓴이 댓글의 hierarchy와 강조 정상.
- `글쓴이` badge와 accent surface가 일반 댓글과 명확히 구분됨.
- keyboard가 input/send CTA를 가리지 않음.
- Android back 1회 keyboard dismiss, 다음 back 상세에서 목록 복귀.
- bottom navigation, composer, CTA overlap 없음.

증적:

- `/tmp/nuri-qa/community-redesign-final-cold-start.png`
- `/tmp/nuri-qa/community-redesign-final-list.png`
- `/tmp/nuri-qa/community-redesign-final-detail.png`
- `/tmp/nuri-qa/community-redesign-final-comments.png`
- `/tmp/nuri-qa/community-redesign-final-keyboard.png`
- `/tmp/nuri-qa/community-redesign-final-keyboard-back.png`
- `/tmp/nuri-qa/community-redesign-final-pagination-bottom.png`
- `/tmp/nuri-qa/community-redesign-logcat.txt`

## 5. Automated verification

- typecheck: 통과.
- lint: 통과.
- Jest: `65 suites / 252 tests`, 실패 0.
- 신규 focused test: 글쓴이 판별, comment grouping, preview bound 3건.
- `git diff --check`: 통과.
- release build: 통과.
- Supabase dry-run: remote up to date, destructive diff 없음.
- refined logcat: NURI fatal/ANR/unhandled/RN fatal/Fatal signal 0건.
- Android system `com.android.phone` AppOps SecurityException은 NURI process crash가 아님.

## 6. 보안·운영 판정

- hard delete: 없음.
- 일반 사용자 데이터 일괄 삭제: 없음.
- 과거 QA 정리: approval/audit 기반 soft-hide.
- fixture write guard: 명시적 environment flag 필수.
- fixture owner/prefix guard: 적용.
- password/token/service role key 출력·저장: 없음.
- DB/RPC/RLS/seed migration: 없음.

## 7. 최종 판정

커뮤니티 게시글 목록, 상세 댓글, 글쓴이 댓글·답글 리디자인과 100건 dataset 기반 Android QA를 완료했다. 현재 요청 범위의 blocker는 없다. QA dataset은 후속 visual/performance regression에 유지하며, 운영 노출을 종료할 때 exact-prefix soft-hide를 사용한다.
