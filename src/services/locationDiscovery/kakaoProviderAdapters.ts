// 파일: src/services/locationDiscovery/kakaoProviderAdapters.ts
// 파일 목적:
// - shared Kakao Local provider를 펫동반 장소 검색 adapter 뒤로 숨긴다.
// 어디서 쓰이는지:
// - `service.ts`의 펫동반 장소 검색 경로에서 사용된다.
// 수정 시 주의:
// - Kakao Login/OAuth와 무관한 위치 검색 provider adapter다.
// - 산책/location discovery runtime은 자체 POI RPC와 safe fallback UX만 사용한다.
import { kakaoLocalSearchProvider } from './kakaoLocal';
import type { LocationSearchProvider } from './provider';

export const petFriendlyKakaoSearchProvider: LocationSearchProvider = {
  searchKeyword(input) {
    return kakaoLocalSearchProvider.searchKeyword(input);
  },
  searchAddress(query) {
    return kakaoLocalSearchProvider.searchAddress(query);
  },
};
