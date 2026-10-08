# NURI Keyboard Corrective Evidence 2026-10-08

MASTER / NURI-00 단독 corrective의 작은 최종 metadata다. [최종 보고서](../nuri-global-keyboard-open-defect-final-corrective-2026-10-08.md)의 실제 native FAIL과 이전 증적 재사용 경계를 유지한다.

Canonical root: `/private/tmp/nuri-keyboard-open-corrective-20261008-163925/`.
Previous root: `/private/tmp/nuri-global-keyboard-final-20261007-212757/`.

## Durable Metadata

| 파일 | 소유 정보 |
| --- | --- |
| [k-id-ledger-final.json](k-id-ledger-final.json) | 38개 최종 판정·이전 APK 및 evidence provenance |
| [installed-apk.json](installed-apk.json) | 실제 설치본과 candidate hash 일치·UID·설정 |
| [validation-final.json](validation-final.json) | local PASS와 native FAIL·추가 승인 full-suite 2회·build/install 1회 |
| [runtime-summary.json](runtime-summary.json) | scoped retained-buffer fatal/ANR 판정 및 미측정 성능 경계 |
| [device-release.json](device-release.json) | Home·keyboard closed·PO 기기 반환·설정 보존 |
| [candidate-source-after-qa.json](candidate-source-after-qa.json) | 설치 전 source fingerprint와 QA 종료 source 동일 |
| [preservation.json](preservation.json) | baseline 보호·문서 기존 본문·source scope·required artifact 보존 |
| [manifest.json](manifest.json) | 위 metadata hash·후보 artifact hash·canonical root |

APK/AAB, screenshot, video, raw runtime log, cache는 repository로 복제하지 않는다. 이미지·영상은 canonical root의 기존 파일을 참조하며 해당 root나 이전 evidence를 삭제하지 않았다. Runtime raw log는 민감정보 보호를 위해 저장하지 않았다.

## Result Boundary

K29 PASS. K14/K15 native modal return FAIL. K23 closed system-navigation underlap 개선, open-IME 48dp 여백 회귀 FAIL. 공유 화면의 K22도 layout regression OPEN이다. 38개 accounted는 전체 38개 PASS 또는 이번 APK의 전 경로 재실행을 의미하지 않는다.

직접 DB/SQL 변경·콘텐츠 저장/전송/삭제 없음. 정상 앱 조회수·analytics 부수 효과는 데이터 불변과 구분한다. Source·설치 candidate·로그인·펫·QA 콘텐츠·기기 기본 설정 보존, staging/commit/push/cleanup 없음. 후속 corrective를 자동 시작하지 않는다.
