# 타임라인 관련 코드 및 SQL 전체

> 문서 지위: HISTORICAL_EVIDENCE. 생성 당시의 34개 코드/SQL 본문은 전체 번들과 해시가 모두 일치해 기준본으로 통합했다. 원래 파일 경로·파일별 제목·인덱스·SQL 구분은 유지한다. 최신 구현은 실제 소스와 [문서 안내](../README.md)를 따른다.

생성일: 2026-03-21

이 문서는 2026-03-21 생성 당시의 타임라인 관련 코드 30개와 SQL 4개를 전체 번들의 동일 원문으로 연결하는 참조형 색인이다. 각 파일의 원문은 아래 링크에서 확인하며, 원래 경로·제목·인덱스와 본문 해시는 이 문서에 보존한다.

## 1. 코드 파일 인덱스

1. `src/navigation/AppTabsNavigator.tsx`
2. `src/navigation/TimelineStackNavigator.tsx`
3. `src/components/navigation/AppNavigationToolbar.tsx`
4. `src/components/media/PhotoAddCard.tsx`
5. `src/components/records/RecordImageGallery.tsx`
6. `src/components/MemoryCard/MemoryCard.tsx`
7. `src/components/images/OptimizedImage.tsx`
8. `src/hooks/useSignedMemoryImage.ts`
9. `src/store/recordStore.ts`
10. `src/services/memories/categoryMeta.ts`
11. `src/services/timeline/heatmap.ts`
12. `src/services/timeline/query.ts`
13. `src/services/local/recordDraft.ts`
14. `src/services/local/uploadQueue.ts`
15. `src/services/supabase/storageMemories.ts`
16. `src/services/supabase/memories.ts`
17. `src/services/records/imageSources.ts`
18. `src/services/records/form.ts`
19. `src/services/records/date.ts`
20. `src/screens/Common/EditDoneScreen.tsx`
21. `src/screens/Weather/WeatherActivityRecordScreen.tsx`
22. `src/screens/Records/TimelineScreen.styles.ts`
23. `src/screens/Records/TimelineScreen.tsx`
24. `src/screens/Records/RecordCreateScreen.styles.ts`
25. `src/screens/Records/RecordCreateScreen.tsx`
26. `src/screens/Records/RecordDetailScreen.styles.ts`
27. `src/screens/Records/RecordDetailScreen.tsx`
28. `src/screens/Records/RecordEditScreen.styles.ts`
29. `src/screens/Records/RecordEditScreen.tsx`
30. `src/screens/Records/components/RecordTagModal.tsx`

## 2. SQL 파일 인덱스

1. `docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql`
2. `docs/sql/공용-릴리즈-묶음/기능-추가/메모리-카테고리-서브카테고리-가격-추가.sql`
3. `docs/sql/마이그레이션/2026-03-05_메모리-이미지-URL-컬럼-추가.sql`
4. `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

## 3. 코드 원문 전체

---

## FILE: `src/navigation/AppTabsNavigator.tsx`

원본 경로: `src/navigation/AppTabsNavigator.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-01)

본문 SHA-256: `ac431fab90884d231627becb2b09494ba0a81e62beec06a016672cf4a3cdb1ba`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/navigation/TimelineStackNavigator.tsx`

원본 경로: `src/navigation/TimelineStackNavigator.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-02)

본문 SHA-256: `75a785a72b6cdb8f5f81ddafc74e25575d068269133fa9b6639503ffe6d0af54`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/components/navigation/AppNavigationToolbar.tsx`

원본 경로: `src/components/navigation/AppNavigationToolbar.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-03)

본문 SHA-256: `4075feac47d816ce150df6798aa4a2f34c3b30c11e1a55cedde42802f8b76f01`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/components/media/PhotoAddCard.tsx`

원본 경로: `src/components/media/PhotoAddCard.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-04)

본문 SHA-256: `29673bef28781dc76b1f9b405a696f2397cde4e4e4987905ebf12eb2bcaeaa51`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/components/records/RecordImageGallery.tsx`

원본 경로: `src/components/records/RecordImageGallery.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-05)

본문 SHA-256: `d4b39f0a8fd33577fa20151cfbdc691d9b05c7c95c8f1335f5a1dc33a1ad7053`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/components/MemoryCard/MemoryCard.tsx`

원본 경로: `src/components/MemoryCard/MemoryCard.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-06)

본문 SHA-256: `823634c04ab32d717ee5c135f7306917fb2cd340c1ef26892ceaa8837b50680c`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/components/images/OptimizedImage.tsx`

원본 경로: `src/components/images/OptimizedImage.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-07)

본문 SHA-256: `e68b3919a97507c48277637a860144c4b54d93b9000fb47eb050001422c8be77`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/hooks/useSignedMemoryImage.ts`

원본 경로: `src/hooks/useSignedMemoryImage.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-08)

본문 SHA-256: `3b0729a6f38e92be86be7bc4ea0123dd490461ca197d3b3309a6a8417370bbce`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/store/recordStore.ts`

원본 경로: `src/store/recordStore.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-09)

본문 SHA-256: `1b671be4fffb0a4a2dcbc5fb4a6e48ba0d0dc3cdd5fe4c634444c3c28a949bd8`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/memories/categoryMeta.ts`

원본 경로: `src/services/memories/categoryMeta.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-10)

본문 SHA-256: `4394d4bccf2f4414014a80e0e3a8a83364027b7ee2b4139d7f8c9c9bbdc1c818`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/timeline/heatmap.ts`

원본 경로: `src/services/timeline/heatmap.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-11)

본문 SHA-256: `9537c5600e69ee4e50ff6f65874557f80bdeaa893bddd01e0cb558b0ac7dc8d6`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/timeline/query.ts`

원본 경로: `src/services/timeline/query.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-12)

본문 SHA-256: `c984f2da4c91c3d893f6c3164a02ed02222853e6f8b68e09b4c4c66d0f427a54`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/local/recordDraft.ts`

원본 경로: `src/services/local/recordDraft.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-13)

본문 SHA-256: `7022fe806f81e530a187ce44291f689fce4e7c4adad25be812344ead694a8623`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/local/uploadQueue.ts`

원본 경로: `src/services/local/uploadQueue.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-14)

본문 SHA-256: `f1db12d82419dccb0e0ac569f99e3737f561775aacdab0acb6f7a80403784038`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/supabase/storageMemories.ts`

원본 경로: `src/services/supabase/storageMemories.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-15)

본문 SHA-256: `72cc08a036707df74800ce3f70d06ddaf8947e198b3fc46c6d26064eee17138f`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/supabase/memories.ts`

원본 경로: `src/services/supabase/memories.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-16)

본문 SHA-256: `7e2d3070f4df9f7e44c2fe2e42f367067e24df4358d8217a5869bf62aa743b0e`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/records/imageSources.ts`

원본 경로: `src/services/records/imageSources.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-17)

본문 SHA-256: `f41fe181a6a7212bde563c0696d8b01f354ef0d87874329bc88cd7d3a694c687`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/records/form.ts`

원본 경로: `src/services/records/form.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-18)

본문 SHA-256: `973474bf0d2a1ecf59f2eded04586a0227bac56af8f0bd3893228e896508307d`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/services/records/date.ts`

원본 경로: `src/services/records/date.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-19)

본문 SHA-256: `9747d329690e6e9f45ff20a9d6fb10b9856cce14f9a4113ae0d36ac6cf0ec229`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Common/EditDoneScreen.tsx`

원본 경로: `src/screens/Common/EditDoneScreen.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-20)

본문 SHA-256: `143b62bcf3ffa7e66a4616c2779702ea19bfd6bcfecd2e38b3ab9391d2aa3c75`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Weather/WeatherActivityRecordScreen.tsx`

원본 경로: `src/screens/Weather/WeatherActivityRecordScreen.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-21)

본문 SHA-256: `757be9c0882b152b3d0db428affafd2a3c2d85f94890146e68c0420efdc95ceb`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/TimelineScreen.styles.ts`

원본 경로: `src/screens/Records/TimelineScreen.styles.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-22)

본문 SHA-256: `f8802f65111ed94071cd9c1bc9f88ab79b3cf4d506f073e298137643e6b54064`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/TimelineScreen.tsx`

원본 경로: `src/screens/Records/TimelineScreen.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-23)

본문 SHA-256: `8fbfeb97d6e6737c56f190cd81643f160097a5a5a0fa430fcc045af0e705d044`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/RecordCreateScreen.styles.ts`

원본 경로: `src/screens/Records/RecordCreateScreen.styles.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-24)

본문 SHA-256: `38fe87c3eef33ee4fc4a8458078921b53d3b174bd35899e76dca40a41292a3ed`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/RecordCreateScreen.tsx`

원본 경로: `src/screens/Records/RecordCreateScreen.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-25)

본문 SHA-256: `ec40f61d868882ba131f9924faa3b1a943b3eb94366ce23be9b71ea24e1e6788`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/RecordDetailScreen.styles.ts`

원본 경로: `src/screens/Records/RecordDetailScreen.styles.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-26)

본문 SHA-256: `2577a7eddaca7ae879639fc7bb1f877ad211acebe2287d68ceeaa886ea6f9ce5`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/RecordDetailScreen.tsx`

원본 경로: `src/screens/Records/RecordDetailScreen.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-27)

본문 SHA-256: `30441d6b9af5b108c8e55ae02ad68248e2814ede4ebf26659f79108c078c83d4`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/RecordEditScreen.styles.ts`

원본 경로: `src/screens/Records/RecordEditScreen.styles.ts`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-28)

본문 SHA-256: `e558c0a3ecf444fb35821230b3435bd4bf967c89e469def84c56cb7e9fe55607`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/RecordEditScreen.tsx`

원본 경로: `src/screens/Records/RecordEditScreen.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-29)

본문 SHA-256: `153d104c0bebbca5e976911ee68e0bb6cb7861d13b693cfd7b9c6938ebf1c678`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## FILE: `src/screens/Records/components/RecordTagModal.tsx`

원본 경로: `src/screens/Records/components/RecordTagModal.tsx`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-30)

본문 SHA-256: `cda74e083470e6f2491472fb1ce81ee3057ee54bf98b469a81f393d108af5df8`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

## 4. SQL 원문 전체

---

## SQL FILE: `docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql`

원본 경로: `docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-31)

본문 SHA-256: `9d9879e63959866a03f9bb33a428a39b7758bc0fcd89e51370e739705cd1a18c`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## SQL FILE: `docs/sql/공용-릴리즈-묶음/기능-추가/메모리-카테고리-서브카테고리-가격-추가.sql`

원본 경로: `docs/sql/공용-릴리즈-묶음/기능-추가/메모리-카테고리-서브카테고리-가격-추가.sql`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-32)

본문 SHA-256: `ede3b49e3989536e3722c59b29dc82c74c8be36e22de77e05b707a52a8009b86`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## SQL FILE: `docs/sql/마이그레이션/2026-03-05_메모리-이미지-URL-컬럼-추가.sql`

원본 경로: `docs/sql/마이그레이션/2026-03-05_메모리-이미지-URL-컬럼-추가.sql`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-33)

본문 SHA-256: `0a73b24fa19ad639f7a9d1def0ea9d0ef09f8e2ed5e390c48369ea996a75e967`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.

---

## SQL FILE: `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

원본 경로: `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

[동일한 2026-03-21 원문 보기](../프로젝트-원문-전체/프로젝트-전체-코드-SQL-원문.md#timeline-snapshot-34)

본문 SHA-256: `d29d104a39c93b775922578a8f17248d21d88fa03929c3b3e24f0f7e7f66ce3c`. 이 파일의 중복 본문만 제거했으며 현재 구현 완료/서버 반영을 뜻하지 않는다.
