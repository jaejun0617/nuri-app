# NURI Today Tip Seasonal Glass Artwork

2026-10-17. 오늘의 팁 기존 삽화만 계절 색유리 소품으로 교체한 Metro 후보다.

- 가을: 기존 단풍 PNG를 전체 contain으로 표시한다.
- 봄: 기존 봄 세트의 벚꽃 한 송이 영역만 표시한다.
- 겨울: 기존 겨울 세트의 눈결정 한 개 영역만 표시한다.
- 여름: 기존 여름 세트를 재질/소재 참조로 built-in image_gen을 사용해 파도와 물방울 두 개를 하나로 재구성했다. 조개는 없다.

![여름 파도와 물방울 색유리](summer-wave-droplets-glass-v1.png)

[manifest.json](manifest.json)에 전체 실제 prompt·참조/생성 원본·runtime 경로·SHA-256·투명도·검증을 보존한다. 생성 PNG와 두 copy는 exact bytes이며 임의 raster 가공이 없다.

원래30%/최대108dp/1:1 이미지 슬롯·팁 문구/글씨·글라스 카드·다른 Home 장식·52dp 간격은 유지한다. 후속 PO 지적에 따라 봄 꽃잎을 공통으로 쓰던 오류를 수정했다.17/21dp 작은 소품2개는 가을 단풍/은행잎·봄 꽃잎·여름 물방울·겨울 눈결정으로 분기한다.16dp 계절 구체1개·18/22/28dp 공통 별빛3개는 그대로다. 모두 기존 이미지 슬롯 안으로 clip해 옆의 글씨에 침범하지 않는다. 원본 PNG는 가공하지 않았다.

이전 삽화 원본은 삭제하지 않았다. 총8건 fail-first 후 관련8 suites/243 tests·타입·대상 lint0/0·Metro bundle/4계절 asset200 및 exact bytes PASS다. 기기 시각 확인은 PO가 Metro로 진행하며 build/install/commit/push0·STORE HOLD다.

후속 통합 검증은 관련9 suites/272 tests·타입·lint 오류0/기존15경고/신규0·Metro200 PASS였다. 이후 PO 지시로 추천 팁 헤더의 그림 연결과128dp 슬롯을 제거해 기존 간격을 복원했다. 오늘의 팁 계절 그림과 운영 데이터 배지 제거는 유지한다. 후보 component/PNG는 보존하지만 추천 팁에서 렌더링하지 않는다. 최신 PO는 누적 디자인 설치·선택 커밋·전용 브랜치 push를 승인했으며 실제 전달 결과는 QA 보고서가 소유한다.
