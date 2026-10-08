# Glass Forms + Monthly Expenses Evidence

작은 source/validation/QA metadata만 보존한다. APK/AAB·native 캡처·영상은 `/private/tmp/nuri-glass-expenses-20261008T092854/`에 유지하며 repository로 복제하지 않는다.

- [후보 identity](candidate-identity.json), [installed APK](installed-apk.json), [build result](build-result.json)
- [최종 source fingerprint](source-candidate.json), [preservation](preservation.json)
- [검사 결과](validation-final.json), [runtime 범위](runtime-summary.json)
- [QA 지출 보존](qa-expenses.json), [키보드 4개 재검증 delta](keyboard-revalidation-delta.json)
- [상세 보고서](../nuri-glass-forms-monthly-expenses-2026-10-08.md)

`typescript.log`는 성공한 검사에서 출력이 없어서 0바이트다. validation metadata와 함께 판정한다. 나머지 작은 lint/targeted/final full log는 실제 결과를 보존한다. 이전 실패 log·APK·보고서는 temp와 기존 증거 root에서 삭제하지 않는다.

이번 source 43파일·tests 13파일의 범위, 이전 unrelated dirty와 gate, 첫 후보 native 증적의 재사용 경계를 상세 보고서에서 구분한다. 모든 K-ID를 최종 APK로 다시 실행했다고 해석하지 않는다.
