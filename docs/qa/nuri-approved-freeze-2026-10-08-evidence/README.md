# Approved Freeze Evidence

기준일: 2026-10-08 KST. [동결 보고서](../nuri-keyboard-glass-expenses-final-freeze-2026-10-08.md)의 작은 영구 evidence만 보존한다.

- `candidate.json`: 커밋 출처, APK/AAB SHA, 실제 빌드/설치 횟수, 설치 hash·UID·최초 설치 시각·설정 보존, source push 확인.
- `preservation.json`: 기준선 1,719개 파일 보존, 허용 문서 외 변경 0, credentials/signing input 및 이전 APK/AAB hash 확인.
- Canonical runtime root: `/private/tmp/nuri-approved-freeze-20261008T204700/`. 최종 APK/AAB·원본 build/install/verification log·baseline·최종 Git proof는 해당 root에 유지한다.

추가 native QA·앱 실행·DB 작업은 하지 않았다. 이전 QA 결과를 새 APK 전체 재실행으로 승격하지 않는다. APK의 source commit은 `5009406c0a2e2cf6fd9f7416464c284676e0683b`; 후속 문서 commit은 앱 runtime을 변경하지 않는다. STORE HOLD, CLEANUP NO.
