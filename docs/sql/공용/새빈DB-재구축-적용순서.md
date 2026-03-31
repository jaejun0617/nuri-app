# 새 빈 DB 재구축 적용 순서

이 문서는 **새 빈 Supabase DB** 또는 **public/storage 재구축 직후 상태**에만 쓰는 적용 순서다.

중요:

- 기존 운영 프로젝트 위에 `docs/sql/공용/누리-전체초기구성-부트스트랩.sql`을 다시 덮어쓰는 용도가 아니다.
- 기존 프로젝트 위에 그대로 실행하면 `view`, `policy`, `storage bucket` 충돌로 중간 실패할 수 있다.
- 실행 이력은 `supabase/migrations/*`로 따로 보존한다.
- 이 문서는 사람이 읽는 재구축 순서와 실행 스크립트 기준을 잠그는 용도다.

## 적용 파일 순서

1. [누리-전체초기구성-부트스트랩.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/공용/누리-전체초기구성-부트스트랩.sql)
2. [타임라인-메모리이미지-최종.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/타임라인-메모리/타임라인-메모리이미지-최종.sql)
3. [메모리-이미지URL-호환성-추가.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/타임라인-메모리/메모리-이미지URL-호환성-추가.sql)
4. [메모리-카테고리서브카테고리가격-추가.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/타임라인-메모리/메모리-카테고리서브카테고리가격-추가.sql)
5. [계정삭제-동의이력-최종.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/인증-계정/계정삭제-동의이력-최종.sql)
6. [집사꿀팁가이드-운영-최종.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/가이드/집사꿀팁가이드-운영-최종.sql)
7. [가이드-이미지스토리지-정책.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/가이드/가이드-이미지스토리지-정책.sql)
8. [펫동반장소-메타-최종.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/펫동반-장소/펫동반장소-메타-최종.sql)
9. [커뮤니티-운영-최종.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/커뮤니티/커뮤니티-운영-최종.sql)
10. [반려동물과여행-트러스트레이어-최종.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/반려동물과-여행/반려동물과여행-트러스트레이어-최종.sql)

## 의도적으로 제외한 파일

- [프로필-닉네임정책-현재로컬미러.sql](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/docs/sql/인증-계정/프로필-닉네임정책-현재로컬미러.sql)
  - linked remote에 `blocked_nickname_patterns`가 있어 local mirror가 뒤처져 있다.
- `레거시/*`
  - 단계별 SQL이므로 재구축 기준에서 제외한다.
- `*-seed.sql`, `*-점검.sql`, `*-보조.sql`
  - 운영 baseline이 아니라 seed, 점검, 보조 목적이다.

## 실행 스크립트

자동 적용이 필요하면 아래 스크립트를 쓴다.

- [rebuild_public_schema_from_docs_sql.sh](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/scripts/rebuild_public_schema_from_docs_sql.sh)

권장 실행 예시:

```bash
bash scripts/rebuild_public_schema_from_docs_sql.sh --print-only
bash scripts/rebuild_public_schema_from_docs_sql.sh --db-url "postgresql://..."
```

이 스크립트는 아래를 먼저 검사한다.

- 대표 `public` 테이블/뷰/함수가 이미 있는지
- `pet-profiles`, `memory-images`, `guide-images`, `community-images` bucket이 이미 있는지

하나라도 남아 있으면 기존 프로젝트 위에 잘못 덮는 상황으로 보고 **즉시 중단**한다.
