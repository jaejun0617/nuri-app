import AsyncStorage from '@react-native-async-storage/async-storage';

const COMMUNITY_GUEST_SESSION_STORAGE_KEY = 'nuri.community.guest-session.v1';

// 커뮤니티 조회수 dedupe는 계정 상태보다 "같은 로컬 앱 재진입"을 막는 쪽이 중요하다.
// 그래서 guest session id는 로그아웃/탈퇴 시점에 지우지 않고 로컬 anonymous source로 유지한다.

function getRequiredCrypto() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('커뮤니티 guest session 난수 생성기를 찾지 못했어요.');
  }
  return cryptoApi;
}

function toHex(byte: number) {
  return byte.toString(16).padStart(2, '0');
}

function createGuestSessionId() {
  const bytes = new Uint8Array(16);
  getRequiredCrypto().getRandomValues(bytes);

  // UUID v4 shape를 맞춰 guest session 값을 안정적으로 식별한다.
  bytes[6] = 64 + (bytes[6] % 16);
  bytes[8] = 128 + (bytes[8] % 64);

  return [
    Array.from(bytes.slice(0, 4), toHex).join(''),
    Array.from(bytes.slice(4, 6), toHex).join(''),
    Array.from(bytes.slice(6, 8), toHex).join(''),
    Array.from(bytes.slice(8, 10), toHex).join(''),
    Array.from(bytes.slice(10, 16), toHex).join(''),
  ].join('-');
}

export async function getCommunityGuestSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(COMMUNITY_GUEST_SESSION_STORAGE_KEY);
  const normalizedExisting = `${existing ?? ''}`.trim();
  if (normalizedExisting.length > 0) {
    return normalizedExisting;
  }

  const nextSessionId = createGuestSessionId();
  await AsyncStorage.setItem(
    COMMUNITY_GUEST_SESSION_STORAGE_KEY,
    nextSessionId,
  );
  return nextSessionId;
}
