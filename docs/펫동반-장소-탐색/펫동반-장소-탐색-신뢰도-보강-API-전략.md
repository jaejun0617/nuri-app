# 펫동반 장소 탐색 신뢰도 보강 API 전략

## 1. 현재 구조 요약

현재 NURI의 펫동반 장소 탐색은 아래 흐름까지 올라와 있다.

- 1차 후보 수집: Kakao Local
- 앱 내부 normalize: `src/services/locationDiscovery/service.ts`
- 메타 병합 경계: `src/services/locationDiscovery/placeMeta.ts`
- UI 노출: 출처 / 검증 상태 / 검증 근거 / 안내 문구 분리

중요한 전제:

- Kakao는 후보 수집 레이어다.
- Supabase는 최종 검증/운영 메타 source of truth다.
- Google Places / 관광공사 / 공공데이터는 보조 검증 신호다.
- 외부 API 결과만으로 `admin-verified`를 만들면 안 된다.

## 2. 왜 Kakao만으로 부족한가

Kakao Local은 국내 장소 후보 수집에는 강하지만, 펫동반 여부를 확정할 구조화된 속성을 주지 않는다.

즉 Kakao만으로는 아래가 부족하다.

- 실제 반려동물 동반 허용 여부
- 테라스/야외 좌석 같은 간접 신호
- 관광/문화/야외 시설의 반려동물 동반 운영 정보
- 운영 검수 히스토리

따라서 실제 서비스에서는 아래처럼 나눠야 한다.

- Kakao = 후보 수집
- Google Places = 구조화된 보조 속성
- 관광공사/공공데이터 = 관광/야외/문화시설 보강
- Supabase = 최종 운영 메타

## 3. Google Places를 실제로 가져오는 방법

### 3.1 어떤 API를 쓸지

Google Places는 전부 붙이지 않는다. 역할별로 나눈다.

- 기본 후보 수집
  - 사용 안 함
  - 현재 단계에서 Kakao가 더 적합하다.
- 보조 후보 매칭
  - `Text Search (New)` 또는 `Nearby Search (New)`
- 상세 속성 확인
  - `Place Details (New)`

실제 권장 흐름:

1. Kakao 후보를 먼저 확보한다.
2. Google Places는 후보 상위 일부에만 `Text Search` 또는 `Nearby Search`로 place id 후보를 찾는다.
3. place id가 매칭된 경우에만 `Place Details`로 최소 속성을 조회한다.

### 3.2 언제 호출해야 하는지

모든 후보에 다 호출하면 안 된다.

권장 호출 조건:

- 리스트 진입 직후
  - 호출하지 않음
- 리스트에서 추천 상위 일부
  - `keyword-inferred` 또는 `unknown` 상태의 상위 3~5개만
- 상세 진입
  - 현재 본 장소 1건만 조회 허용
- 운영 검수 후보 선별
  - 북마크 수가 많거나 제보가 누적된 장소만 배치/서버에서 조회

즉 런타임 실시간 호출은 아래 두 경우만 허용하는 것이 안전하다.

- 상세 진입 시 1건
- 리스트 상위 n개에 대한 매우 제한적인 prefetch

### 3.3 어떤 API를 어떻게 나눠 쓰는지

#### A. Text Search (New)

사용 상황:

- 사용자가 검색어를 직접 입력했고, Kakao 후보와 이름/주소가 비슷한 Google 후보를 찾고 싶을 때
- 좌표보다는 상호명 + 지역명 매칭이 더 중요한 경우

권장 쿼리:

- `"{상호명} {도로명주소 또는 지역명}"`

#### B. Nearby Search (New)

사용 상황:

- 현재 위치 기반 후보를 Kakao에서 이미 얻었고
- 동일 좌표 근처에 Google 후보가 있는지 찾고 싶을 때

권장 반경:

- 80m ~ 150m

#### C. Place Details (New)

사용 상황:

- Google place id가 이미 어느 정도 매칭되었을 때만
- 속성 확인 목적

### 3.4 어떤 필드만 가져와야 하는지

기본 원칙은 FieldMask 최소화다.

상세에서 권장 최소 필드:

- `id`
- `displayName`
- `formattedAddress`
- `location`
- `allowsDogs`
- `outdoorSeating`
- `goodForChildren`

필요 시 추가 가능 필드:

- `primaryType`
- `businessStatus`
- `websiteUri`

초기 단계에서는 이것보다 더 넓히지 않는다.

이유:

- FieldMask가 넓어질수록 비용과 응답 크기가 커진다.
- 지금 필요한 것은 풍부한 장소 정보가 아니라 “보조 검증 신호”다.
- UI에 바로 다 뿌릴 정보가 아니다.

### 3.5 왜 FieldMask를 최소화해야 하는가

- Google Places는 요청한 데이터 필드 범위가 비용과 직결된다.
- Places는 “검색 결과 다 받기”가 아니라 “필요한 최소 필드만 선택”하는 모델에 가깝다.
- 현재 기능의 목적은 상세 카드 고도화가 아니라 신뢰도 보강이다.

즉 Google은 `속성 확인용 최소 응답`만 가져오는 것이 맞다.

### 3.6 비용 / SKU 통제 방식

권장 원칙:

- 리스트 전체 후보에 대해 무조건 Google 호출 금지
- 상세 진입 1건 또는 상위 n개 prefetch까지만 허용
- 서버 프록시에서 호출 횟수 상한을 강제
- 캐시 TTL을 둬 같은 장소에 대한 반복 호출을 막음

권장 운영 가드:

- 동일 `provider_place_id` 기준 7일 캐시
- 상세 진입 시 이미 캐시 있으면 재호출 금지
- 상위 n개 prefetch는 세션당 1회만
- 운영 검수 배치는 하루 1회 또는 주기 배치

### 3.7 Kakao 후보와 Google 결과 매칭 기준

`provider_place_id` 직접 매칭은 안 되므로 자체 매칭 규칙이 필요하다.

권장 우선순위:

1. 이름 유사도
2. 도로명 주소 또는 formattedAddress 유사도
3. 좌표 근접도
4. 카테고리 일치도

권장 1차 규칙:

- 이름 normalized exact 또는 high similarity
- 좌표 거리 120m 이내
- 주소 행정구역 주요 토큰 일치

fallback:

- 이름 유사도 높고 좌표 200m 이내면 후보 유지
- 그 외는 매칭 실패로 처리

즉 애매한 경우는 억지로 붙이지 않는다.

### 3.8 Google 결과를 바로 확정 데이터로 쓰면 안 되는 이유

- Google 속성도 외부 제공 데이터다.
- `allowsDogs=true`가 실제 최신 매장 정책과 항상 같다고 보장할 수 없다.
- 국가/지역/사업자 수정 주기 차이가 있다.

따라서 Google은 아래처럼만 쓴다.

- `keyword-inferred` 강화 신호
- 검수 우선순위 신호
- 상세의 보조 설명 근거

즉 단독으로 `admin-verified` 승격 금지다.

### 3.9 Google 결과를 내부 verification에 어떻게 반영할지

권장 방식은 “상태 직접 확정”이 아니라 “보조 점수 + 검수 우선순위”다.

예:

- `allowsDogs=true`
  - 강한 보조 신호
- `outdoorSeating=true`
  - 약한 보조 신호
- `goodForChildren=true`
  - 단독으로는 펫동반 신호 아님

반영 원칙:

- `unknown` + Google 강한 신호 + Kakao 펫 키워드 존재
  - `keyword-inferred` 유지
- 반복 사용자 제보 + Google 강한 신호 + 운영자 확인
  - `admin-verified` 후보
- Google만 있고 다른 근거 없음
  - 상태 승격 금지

## 4. 관광공사 / 공공데이터를 실제로 가져오는 방법

### 4.1 어떤 데이터가 실제로 의미가 있는가

실제로 의미 있는 것은 아래다.

- 한국관광공사 `반려동물 동반여행 서비스` OpenAPI
- 지자체 반려동물 동반 관광지/문화시설 파일데이터 또는 API

이 데이터는 카페/식당 전국 후보 전반보다 아래 도메인에서 강하다.

- 관광지
- 야외 공간
- 문화시설
- 여행지

### 4.2 호출 방식 구분

- 관광공사 메인 데이터
  - OpenAPI
- 지자체 데이터
  - 파일데이터 또는 파일 기반 API

즉 이 계열은 Kakao/Google처럼 모바일 런타임 검색 API로 보기보다
`서버 수집 / 정규화 / 적재` 레이어에 가깝다.

### 4.3 우리 서비스에서 어디에 붙여야 하는가

권장 위치:

- 런타임 직접 호출: 비권장
- 서버/배치 적재: 권장

이유:

- 응답 형식과 품질이 공급기관마다 다르다.
- 최신성 편차가 크다.
- 실시간 검색 응답 체감보다 사전 정규화가 더 중요하다.

즉 관광공사/공공데이터는 `배치 적재 -> Supabase 메타 보강`이 맞다.

### 4.4 Kakao 후보와 어떤 기준으로 매칭할지

권장 기준:

- 시설명
- 주소
- 지역명
- 좌표

권장 순서:

1. 시설명 exact 또는 normalized 유사도
2. 시/군/구 + 도로명 주소 토큰 일치
3. 좌표 거리 150m ~ 300m 이내

관광 데이터는 명칭 변형이 많으므로 이름 exact만 믿으면 안 된다.

### 4.5 최신성 / 갱신주기 / 지역 편차를 어떻게 볼지

- 전국 일관성이 약하다.
- 업데이트 주기가 연간 또는 비정기인 경우가 많다.
- 지역 편차가 크다.

즉 이 데이터는 “공식 성격의 보조 정보”로는 좋지만
전국 실시간 운영 source of truth로는 맞지 않는다.

### 4.6 왜 source of truth로 쓰면 안 되는가

- 업데이트 주기와 포맷이 균일하지 않다.
- 누락 지역이 있을 수 있다.
- 카페/식당 전체 도메인을 커버하지 못한다.

따라서 역할은 아래가 맞다.

- 야외/관광/문화시설에 대한 강한 보조 신호
- 운영 검수 우선순위 신호
- Supabase 메타 초기 seed 또는 참고 데이터

## 5. Kakao 유지 전략

Kakao는 계속 1차 후보 수집 레이어로 유지하는 것이 맞다.

이유:

- 국내 장소 검색 체감이 좋다.
- 한글 상호명/지역명 기반 검색이 자연스럽다.
- 현재 위치 주변 후보 수집 흐름과 가장 잘 맞는다.

지금 단계에서 Kakao를 버리면 안 되는 이유:

- 이미 현재 앱 구조가 Kakao 후보 수집에 맞춰 안정화돼 있다.
- Google만으로 국내 체감을 바로 대체하려 하면 비용과 매칭 복잡도가 커진다.
- 관광공사/공공데이터는 실시간 후보 수집 레이어가 아니다.

다만 계속 의식해야 할 한계:

- 펫동반 확정 정보 없음
- 운영시간/정책 정확도 한계
- 카테고리 표준화 한계

## 6. 실제 서비스 호출 순서 제안

권장 순서는 아래다.

### 1차. Kakao Local로 후보 수집

- 리스트 진입 / 검색 submit 시 실행
- 현재 위치가 있으면 주변 검색
- 없으면 텍스트 검색

### 2차. Supabase 메타 merge

- `provider='kakao' + provider_place_id` 기준
- 이미 운영 메타가 있으면 바로 merge
- 이 단계에서 `admin-verified`, `user-reported`, `rejected`가 UI에 반영됨

### 3차. Google Places 선택적 조회

호출 대상:

- 현재 결과 중 `unknown` 또는 `keyword-inferred`
- 상위 n개 또는 상세 진입 1건

호출 순서:

1. Kakao 후보를 Google Text Search 또는 Nearby Search로 매칭
2. 매칭 성공 시 Place Details 최소 FieldMask 조회
3. 응답은 Supabase 또는 서버 캐시에 저장

### 4차. 관광공사 / 공공데이터 보강

- 런타임이 아니라 배치 적재
- 관광/야외/문화시설 계열에만 우선 매칭
- 결과는 Supabase 메타에 반영

### 5차. 최종 UI 노출

- verification 상태는 Supabase 메타 기준
- Google/관광공사 결과는 검증 근거 또는 보조 신호로만 반영
- 외부 API 단독 결과로 확정 상태 승격 금지

## 7. 신뢰도 보강 점수 / 룰 설계 방향

반드시 다섯 축을 분리해 본다.

- Kakao 후보
- Google Places 속성
- 관광공사/공공데이터 일치 여부
- 사용자 제보
- 관리자 검수

권장 해석:

- Kakao 후보
  - 후보 존재 신호
- Google `allowsDogs`
  - 강한 보조 신호
- Google `outdoorSeating`
  - 약한 보조 신호
- Google `goodForChildren`
  - 단독으로는 펫 신호 아님
- 관광공사/공공데이터 일치
  - 관광/야외/문화시설에서는 강한 보조 신호
- 사용자 제보
  - 운영 검수 우선순위 상승
- 관리자 검수
  - 유일한 확정 상태 승격 근거

예시 룰:

- Kakao 이름/카테고리에 애견 키워드 존재
  - `+1`
- Google `allowsDogs=true`
  - `+3`
- Google `outdoorSeating=true`
  - `+1`
- 관광공사/공공데이터 일치
  - `+2`
- 사용자 제보 다수
  - `+2`

활용 방식:

- 점수 0~2
  - `unknown`
- 점수 3 이상
  - `keyword-inferred` 유지 가능
- 관리자 검수 완료
  - `admin-verified`

즉 외부 신호는 점수와 검수 우선순위에만 쓰고, 최종 확정은 운영 메타에서만 한다.

## 8. 서비스 구조 반영 포인트

필요한 파일 경계는 아래가 맞다.

- Kakao provider
  - `src/services/locationDiscovery/kakaoLocal.ts`
- Google Places provider
  - 예: `src/services/locationDiscovery/googlePlaces.ts`
- 관광공사/공공데이터 provider
  - 예: `src/services/locationDiscovery/tourApi.ts`
- 외부 신호 normalize
  - 예: `src/services/locationDiscovery/signalNormalizer.ts`
- placeMeta merge
  - `src/services/locationDiscovery/placeMeta.ts`

구조 원칙:

- 런타임 호출
  - Kakao
  - Google 제한적 호출
- 배치 적재
  - 관광공사/공공데이터
  - Google 대량 재검증

## 9. 비용 / 보안 / 캐시 전략

### 9.1 API 키 관리

- Kakao REST 키
  - 현재 앱에 있지만 장기적으로는 서버 프록시 검토가 맞다
- Google Places 키
  - 앱 직접 탑재 비권장
  - 서버 프록시 필수에 가깝다
- 관광공사/공공데이터 키
  - 서버/배치에서 관리 권장

### 9.2 왜 Google Places는 서버 프록시가 필요한가

- 키 노출 리스크가 크다.
- 호출량 통제와 비용 상한을 서버에서 관리해야 한다.
- FieldMask/캐시 정책을 중앙에서 통제해야 한다.

### 9.3 캐시 전략

- Kakao 후보
  - 세션 캐시 + query 캐시
- Google Details
  - place id 기준 7일 캐시 권장
- 관광공사/공공데이터
  - 배치 적재 기준 일/주 단위 갱신

### 9.4 사용자 실시간 탐색 vs 서버/배치

실시간 탐색:

- Kakao 후보 수집
- Supabase 메타 merge
- Google 제한적 상세 조회

서버/배치:

- 관광공사/공공데이터 적재
- 대량 Google 재검증
- 검수 우선순위 산정

## 10. Supabase 메타와 merge하는 방식

외부 API 결과는 바로 UI truth가 되지 않는다.

merge 순서:

1. 외부 후보 수집
2. 외부 보조 신호 normalize
3. `provider + provider_place_id` 또는 내부 매칭 규칙 기준으로 메타 연결
4. Supabase의 `verification_status`, `source_type`, `pet_policy_text`를 최우선으로 반영
5. 외부 신호는 `검증 근거` 또는 `검수 우선순위`로만 사용

## 11. verification 상태와의 관계

- `unknown`
  - 외부 신호가 약하거나 없음
- `keyword-inferred`
  - 외부 신호 조합으로 추정 강화
- `user-reported`
  - 사용자 제보 우선
- `admin-verified`
  - 운영 검수만 가능
- `rejected`
  - 운영 반려 또는 강한 반대 근거

Google Places나 관광공사 데이터는 직접 상태를 확정하지 않는다.

## 12. 지금 당장 구현할 최소 범위

지금 당장 구현할 것:

- Kakao 후보 수집 유지
- Supabase 메타 merge 연결
- Google Places 제한적 조회 전략 문서화
- 상세 진입 1건 기준 Google 보조 신호 실험 준비

나중 범위:

- 리스트 상위 n개 Google prefetch
- 관광공사/공공데이터 배치 적재
- 외부 신호 점수 기반 운영 검수 큐
- 관리자 CMS 연결
