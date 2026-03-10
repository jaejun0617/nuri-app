# 썸네일 worker 상세 구현 명세

## 문서 목적

이 문서는 `memory_images.original_path -> timeline_thumb_path` 생성 파이프라인을 실제 구현 가능한 수준으로 구체화한 worker 명세다.

현재 전제:

- `memory_images` 테이블이 이미 준비되어 있다.
- `status = pending / ready / failed` 구조가 준비되어 있다.
- 앱 조회 전환보다 생성 파이프라인이 먼저라는 방향이 확정되어 있다.
- 이번 문서는 앱 코드 구현이 아니라, 서버 worker 구현 명세만 정의한다.

이 문서의 목표는 다음 구현 단계에서 바로 Edge Function 또는 별도 worker 코드에 착수할 수 있게 하는 것이다.

---

## 1. 최종 추천 구현 방식

### 결론

장기 운영 기준 최종 추천은 다음이다.

- 실행 주체: `별도 worker` 권장
- 초기 구현: `Supabase Edge Function + scheduler` 가능
- 처리 모델: `batch polling`
- 동시성 제어: `for update skip locked`
- 상태 관리: `pending -> ready / failed`

### 왜 별도 worker를 최종 추천하는가

Edge Function 으로도 시작은 가능하지만, 장기 운영 기준으로는 별도 worker가 더 낫다.

이유:

- 이미지 다운로드/리사이즈는 CPU/메모리 사용량이 큼
- 백필 시 대량 batch 처리 필요
- timeout/메모리 제한에 덜 민감한 실행 환경이 유리
- 재시도/로그/운영 제어가 더 쉬움

즉:

- 단기: `scheduler -> Edge Function`
- 장기: `scheduler -> worker`

권장 마이그레이션 경로:

1. 명세는 worker 기준으로 작성
2. 초기에는 Edge Function 구현 가능
3. 처리량이 커지면 같은 명세로 별도 worker 런타임으로 이관

---

## 2. worker 실행 단위 정의

worker 1회 실행은 다음 단위를 처리한다.

- batch size: 기본 `20`
- 최대 실행 시간 목표: `30초 이내`
- 한 row 당 이미지 1개 처리
- 한 batch 에서 여러 `memory_images` row 를 순차 또는 제한된 병렬로 처리

권장 기본값:

- `batch_size = 20`
- `parallelism = 2 ~ 4`

운영 원칙:

- 한 번에 너무 많은 row 를 잡지 않는다
- 처리 시간이 길면 다음 scheduler 주기에서 이어서 처리한다
- 백필 시 batch size 를 늘리기보다 worker concurrency 를 늘리는 쪽이 안전하다

---

## 3. 처리 단계별 step-by-step

### A. scheduler 단계

1. cron 또는 외부 scheduler 가 worker 실행
2. worker 는 service role 로 DB/Storage 접근
3. worker 는 작업 대상 batch 를 조회

### B. 대상 row 확보 단계

1. `pending`, 재시도 가능한 `failed` row 조회
2. `for update skip locked` 로 row lock
3. lock 획득한 row 만 현재 worker 가 처리

### C. 개별 row 처리 단계

1. `original_path` 유효성 확인
2. 원본 파일 다운로드
3. 이미지 디코드
4. 지정 규격으로 리사이즈/압축
5. deterministic 썸네일 path 계산
6. Storage 에 썸네일 업로드
7. DB update
   - `timeline_thumb_path`
   - `status = 'ready'`
   - `retry_count` 유지 또는 초기화
   - `last_error_*` null 처리

### D. 실패 처리 단계

1. 오류 유형 분류
2. 재시도 가능 여부 판단
3. DB update
   - `status = 'failed'`
   - `retry_count = retry_count + 1`
   - `last_error_code`
   - `last_error_message`
   - `last_processed_at`

### E. 완료 단계

1. batch 결과 집계
2. 성공/실패 수 로그
3. 다음 scheduler 주기에 남은 row 계속 처리

---

## 4. 추가 권장 컬럼

현재 구조에 없더라도, 운영 안정성을 위해 아래 컬럼을 후속 migration 으로 추가하는 것을 권장한다.

- `retry_count integer not null default 0`
- `last_error_code text`
- `last_error_message text`
- `last_processed_at timestamptz`
- `processing_started_at timestamptz`

의미:

- `retry_count`: backoff 계산 기준
- `last_error_code`: 실패 유형 분류
- `last_error_message`: 운영 디버깅
- `last_processed_at`: 최근 시도 시점
- `processing_started_at`: stuck job 감지

이 문서의 SQL 예시는 위 필드가 있다고 가정한 권장안이다.

---

## 5. pending/failed row 조회 SQL 명세

### 목표

- 처리 가능한 row 만 가져온다
- 중복 처리 방지
- 재시도 backoff 반영

### 권장 조회 SQL 예시

```sql
with candidate as (
  select mi.id
  from public.memory_images mi
  where (
    mi.status = 'pending'
    or (
      mi.status = 'failed'
      and coalesce(mi.retry_count, 0) < 8
      and (
        mi.last_processed_at is null
        or mi.last_processed_at <= now() - (
          case
            when coalesce(mi.retry_count, 0) = 0 then interval '0 minute'
            when mi.retry_count = 1 then interval '5 minute'
            when mi.retry_count = 2 then interval '30 minute'
            when mi.retry_count = 3 then interval '2 hour'
            when mi.retry_count = 4 then interval '6 hour'
            else interval '24 hour'
          end
        )
      )
    )
  )
  order by mi.created_at asc
  for update skip locked
  limit 20
)
select mi.*
from public.memory_images mi
join candidate c on c.id = mi.id;
```

### 설명

- `pending` 는 즉시 처리 대상
- `failed` 는 `retry_count` 와 `last_processed_at` 기준으로 재시도
- `for update skip locked` 로 다른 worker 와 충돌 방지

---

## 6. row lock / skip locked 처리 방식 명세

### 원칙

- DB row 를 lock 하지 않으면 같은 row 를 여러 worker 가 중복 처리할 수 있다
- 조회와 처리를 같은 transaction 경계에서 묶어야 한다

### 권장 방식

1. worker 가 transaction 시작
2. 대상 row 조회 시 `for update skip locked`
3. batch 목록 확보
4. 필요 시 `processing_started_at = now()` 갱신
5. transaction commit
6. 개별 row 처리 시작

### 왜 `skip locked` 가 필요한가

- 여러 worker 동시 실행 허용
- stuck row 외 다른 row 계속 처리 가능
- scheduler 중복 호출에도 안전

---

## 7. original_path 다운로드 방식 명세

### 접근 권한

- service role 사용
- 사용자 세션 사용 금지

### 처리 방식

1. DB row 에서 `original_path` 확인
2. Storage bucket `memory-images` 에서 다운로드
3. 파일이 없으면 영구 실패 처리

### 다운로드 pseudo code

```ts
const original = await storage.from('memory-images').download(originalPath)

if (!original.data) {
  throw new PermanentError('original_not_found')
}

const bytes = await original.data.arrayBuffer()
```

### 실패 분류

- `original_not_found`: 영구 실패
- `storage_download_failed`: 일시 실패 가능
- `unsupported_image_format`: 영구 실패

---

## 8. 썸네일 생성 규격 명세

타임라인용 썸네일 규격은 명확히 고정해야 한다.

### 권장 기본 규격

- width: `144`
- height: `144`
- format: `jpeg` 또는 `webp`
- quality: `72`
- resize mode: `cover`

### 추천안

초기 운영:

- `jpeg`
- quality `72`

이유:

- 가장 호환성이 높음
- 구현 리스크가 낮음

향후 최적화:

- Android/iOS 수신 환경과 CDN 지원이 충분하면 `webp` 검토 가능

### 리사이즈 규칙

- 정사각형 `144x144`
- `cover`
- 중심 crop

즉, 타임라인은 “대표 썸네일” 역할에 집중하고, 상세 원본 품질과 분리한다.

---

## 9. thumbnail path naming 규칙 명세

### 목표

- deterministic 해야 함
- 같은 image row 는 항상 같은 썸네일 path
- 재실행 시 같은 위치에 overwrite 가능해야 함

### 권장 규칙

```text
memory-images/timeline-thumb/{user_id}/{pet_id}/{memory_id}/{memory_image_id}.jpg
```

### 예시

```text
memory-images/timeline-thumb/USER_UUID/PET_UUID/MEMORY_UUID/MEMORY_IMAGE_UUID.jpg
```

### 이유

- row 단위로 1:1 매핑
- 중복 실행 시 동일 경로 재사용 가능
- 삭제/백필/재생성 모두 단순

---

## 10. 업로드 성공 시 DB update 명세

### 성공 update SQL 예시

```sql
update public.memory_images
set
  timeline_thumb_path = $1,
  status = 'ready',
  retry_count = 0,
  last_error_code = null,
  last_error_message = null,
  last_processed_at = now(),
  updated_at = now()
where id = $2;
```

### 성공 처리 원칙

- `status='ready'`
- `timeline_thumb_path` 필수
- 실패 메타 초기화
- 처리 시각 저장

---

## 11. 실패 시 failed / retry_count / last_error 처리 명세

### 실패 update SQL 예시

```sql
update public.memory_images
set
  status = 'failed',
  retry_count = coalesce(retry_count, 0) + 1,
  last_error_code = $1,
  last_error_message = $2,
  last_processed_at = now(),
  updated_at = now()
where id = $3;
```

### 오류 코드 분류 예시

- `original_not_found`
- `storage_download_failed`
- `image_decode_failed`
- `image_resize_failed`
- `storage_upload_failed`
- `db_update_failed`
- `unknown`

### 원칙

- 운영자는 `last_error_code` 로 실패 유형을 빠르게 분류 가능해야 한다
- `last_error_message` 는 너무 길지 않게 저장

---

## 12. 재시도 backoff 규칙 명세

### 권장 규칙

- 0회: 즉시 처리
- 1회 실패: 5분 후
- 2회 실패: 30분 후
- 3회 실패: 2시간 후
- 4회 실패: 6시간 후
- 5회 이상: 24시간 간격
- 8회 이상: 자동 재시도 중단, 운영 확인 대상

### 이유

- 일시 오류는 자동 복구
- 영구 오류는 무한 재시도 방지

### 운영 정책

- `retry_count >= 8` 이면 alert 대상
- 운영자가 수동 재실행 가능

---

## 13. idempotency 보장 방식 명세

### 필수 원칙

1. path 는 deterministic
2. 이미 `ready + timeline_thumb_path 존재` 시 skip 가능
3. 같은 row 를 두 worker 가 동시에 처리하지 않음
4. 동일 path 재업로드가 결과적으로 안전해야 함

### pseudo code

```ts
if (row.status === 'ready' && row.timeline_thumb_path) {
  return { skipped: true }
}

const thumbPath = buildThumbPath(row)

uploadThumbnail(thumbPath, bytes, { upsert: true })

updateRowReady(row.id, thumbPath)
```

### 이유

- worker 재시작
- timeout 후 재호출
- 수동 재실행
- 백필 중복 실행

이 상황에서도 결과가 꼬이지 않아야 한다.

---

## 14. pseudo code 수준 처리 흐름

```ts
async function runThumbnailWorkerBatch() {
  const rows = await lockCandidateRows({ limit: 20 })

  const results = []

  for (const row of rows) {
    try {
      if (row.status === 'ready' && row.timeline_thumb_path) {
        results.push({ id: row.id, status: 'skipped' })
        continue
      }

      const originalBytes = await downloadOriginal(row.original_path)
      const thumbnailBytes = await resizeToTimelineThumb(originalBytes, {
        width: 144,
        height: 144,
        format: 'jpeg',
        quality: 72,
        resizeMode: 'cover',
      })

      const thumbPath = buildTimelineThumbPath(row)

      await uploadThumbnail({
        path: thumbPath,
        bytes: thumbnailBytes,
        contentType: 'image/jpeg',
        upsert: true,
      })

      await markReady({
        id: row.id,
        timelineThumbPath: thumbPath,
      })

      results.push({ id: row.id, status: 'ready' })
    } catch (error) {
      const classified = classifyThumbnailError(error)

      await markFailed({
        id: row.id,
        errorCode: classified.code,
        errorMessage: classified.message,
      })

      results.push({ id: row.id, status: 'failed', error: classified.code })
    }
  }

  logBatchSummary(results)
}
```

---

## 15. 오류 케이스별 처리

### 1) 원본 파일 없음

- 상태: `failed`
- 코드: `original_not_found`
- 자동 재시도: 제한적 또는 중단

### 2) 이미지 디코드 실패

- 상태: `failed`
- 코드: `image_decode_failed`
- 자동 재시도: 보통 의미 없음

### 3) 썸네일 업로드 실패

- 상태: `failed`
- 코드: `storage_upload_failed`
- 자동 재시도: 가능

### 4) DB update 실패

- 업로드는 됐지만 DB 반영 실패 가능
- deterministic path 라면 재실행 시 복구 가능
- 코드: `db_update_failed`

### 5) timeout / 네트워크 일시 실패

- 상태: `failed`
- 코드: `transient_error`
- 자동 재시도: 가능

---

## 16. 운영 중 수동 재실행 시나리오

운영자는 특정 row 또는 특정 범위를 다시 처리할 수 있어야 한다.

### 시나리오 A: 특정 memory_image 1건 재실행

```sql
update public.memory_images
set
  status = 'pending',
  last_error_code = null,
  last_error_message = null,
  updated_at = now()
where id = :memory_image_id;
```

### 시나리오 B: failed 전체 재처리

```sql
update public.memory_images
set
  status = 'pending',
  updated_at = now()
where status = 'failed'
  and coalesce(retry_count, 0) < 8;
```

### 시나리오 C: 특정 기간 데이터 백필 재실행

```sql
update public.memory_images
set
  status = 'pending',
  updated_at = now()
where created_at >= :from
  and created_at < :to
  and timeline_thumb_path is null;
```

---

## 17. 백필 batch 시나리오

### 원칙

- 신규와 백필은 같은 worker 사용
- 차이는 row 유입 방식만 다름

### 백필 흐름

1. 기존 `memories.image_url / image_urls` 를 `memory_images.original_path` 로 이관
2. 이관 시 `status='pending'`
3. worker 가 신규와 동일하게 처리
4. 완료 시 `status='ready'`

### 백필 운영 팁

- 백필 전용 scheduler 를 분리할 수 있음
- 백필은 야간 배치로 돌리는 것이 안전
- 신규 처리 batch 와 백필 batch 우선순위를 분리 가능

권장:

- 신규 처리 queue 우선
- 백필은 낮은 우선순위 batch

---

## 18. 로그 / 모니터링 / 경보 포인트 명세

### 로그 필수 항목

- worker 실행 시작/종료 시각
- batch size
- success / failed / skipped 개수
- 평균 처리 시간
- 가장 많은 실패 코드
- pending 적체량
- failed 적체량

### 경보 조건

- `pending` 적체량 급증
- `failed` 비율 급증
- 특정 오류 코드 반복
- `retry_count >= 8` row 증가
- 최근 10분 이상 `ready` 전환 없음

### 운영 대시보드 추천 지표

- pending count
- failed count
- ready 전환율
- 평균 처리 latency
- 최근 1시간 실패 코드 분포

---

## 19. 왜 이 명세가 현재 설계와 자연스럽게 이어지는가

이미 확정된 구조는 다음과 같다.

- `memory_images` 분리
- `original_path / timeline_thumb_path` 분리
- `status = pending / ready / failed`
- 앱 조회 전환보다 생성 파이프라인 먼저

이 명세는 그 구조를 그대로 실운영 가능한 처리 단위로 풀어낸 것이다.

즉:

- DB 구조를 바꾸지 않는다
- 앱 조회 계약도 아직 건드리지 않는다
- 생성 파이프라인을 먼저 안정화한다

따라서 현재 설계와 가장 자연스럽게 이어지는 다음 단계 문서다.

---

## 20. 다음 구현 단계에서 바로 착수할 항목

1. `retry_count / last_error_* / last_processed_at` 컬럼 추가 migration
2. worker 런타임 결정
   - 초기 Edge Function
   - 장기 별도 worker
3. 이미지 리사이즈 라이브러리 선정
4. service role 기반 Storage download/upload 구현
5. batch lock SQL 구현
6. success / failed update SQL 구현
7. scheduler 연동
8. 운영 로그/경보 연동
