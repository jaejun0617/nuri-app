// 파일: src/services/locationDiscovery/kakaoProviderAdapters.ts
// 파일 목적:
// - shared Kakao Local provider를 도메인별 adapter 뒤로 숨겨 산책 POI 전환과
//   펫동반 장소 검색의 런타임 의존성을 분리한다.
// 어디서 쓰이는지:
// - `service.ts`의 산책 Keep Fallback 경로와 펫동반 장소 검색 경로에서 사용된다.
// 수정 시 주의:
// - Kakao Login/OAuth와 무관한 위치 검색 provider adapter다.
// - adapter는 shared provider 호출을 위임만 하며, Ready 산책 권역의 호출 차단은
//   `service.ts`의 POI gate 정책과 focused test에서 보장한다.
import { kakaoLocalSearchProvider } from './kakaoLocal';
import type { LocationSearchProvider } from './provider';

export const walkKakaoFallbackProvider: LocationSearchProvider = {
  searchKeyword(input) {
    return kakaoLocalSearchProvider.searchKeyword(input);
  },
  searchAddress(query) {
    return kakaoLocalSearchProvider.searchAddress(query);
  },
};

export const petFriendlyKakaoSearchProvider: LocationSearchProvider = {
  searchKeyword(input) {
    return kakaoLocalSearchProvider.searchKeyword(input);
  },
  searchAddress(query) {
    return kakaoLocalSearchProvider.searchAddress(query);
  },
};
