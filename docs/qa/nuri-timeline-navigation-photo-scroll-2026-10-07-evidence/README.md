# Timeline Corrective Evidence

CLASSIFICATION: QA_EVIDENCE_METADATA

기준일: 2026-10-07 KST. [보고서](../nuri-timeline-navigation-photo-scroll-2026-10-07.md)의 작은 감사 metadata만 보존한다. 사용자 이메일·토큰·계정 UUID·signed URL은 포함하지 않는다. 아래 row ID는 이번 정상 UI에서 생성한 합성 QA 기록의 ID다.

## 파일

- `validation.json`: local 검사, Git·기존 보호 입력·기존 기록 digest·APK 보존, 설치본과 현재 source 차이.
- `qa-records.json`: QA 기록 3건과 정확한 row ID·생성 시각·사진 수. 삭제하지 않았다.
- `native-validation.json`: 세 번째 APK 신규 저장·자동 상세·Timeline 복귀의 기본 설정 bounded 확인. 마지막 문구·정렬·흰색 X는 미설치로 구분한다.
- `source-fingerprint.json`: 이번 변경 source/test 25파일의 SHA-256. base HEAD와 미커밋 source를 구분한다.
- `artifacts.json`: 세 후보 APK의 경로·hash·빌드 source snapshot 연결.
- `qa-images.json`: 실제 정상 UI로 업로드한 합성 가로·세로·정사각 PNG의 크기와 hash.
- `history-validation.json`: 두 번째 APK 검증 시점의 과거 기록 5→10→14, native 고유 제목과 read-only row ID 대응. 세 번째 QA 생성 전 결과이며 현재 전체 수 14라는 주장이 아니다.

## 보존 경계

원본 evidence root: `/private/tmp/nuri-timeline-navigation-scroll-20261007143644`.

APK·사진·캡처·동영상·원본 로그는 root에 유지하고 repo로 복제하지 않는다. 기존 temp·canonical APK/AAB·rollback·QA100·production asset·signing·credentials는 삭제하지 않는다.

최신 설치본은 `e37ac813` 후보이며 마지막 detail 문구·정렬·흰색 X 코드는 포함하지 않는다. 전체 앱 E2E·확대 글꼴·장기 crash 회귀는 미실행이다. COMMIT: NO. PUSH: NO. CLEANUP: NO. STORE: HOLD.
