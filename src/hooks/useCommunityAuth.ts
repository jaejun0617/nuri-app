// 파일: src/hooks/useCommunityAuth.ts
// 파일 목적:
// - 커뮤니티 도메인에서 로그인 여부와 현재 사용자 id를 공통으로 해석한다.
// 어디서 쓰이는지:
// - 커뮤니티 쓰기/좋아요/댓글/신고 단계에서 공통 사용한다.
// 수정 시 주의:
// - 1단계 읽기 MVP에서는 직접 사용 범위가 제한적이지만, 로그인 유도 규칙 source of truth는 이 훅으로 유지한다.

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function useCommunityAuth() {
  const navigation = useNavigation<Nav>();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id ?? null;

  const requireLogin = useCallback(
    (action: () => void) => {
      if (!isLoggedIn) {
        navigation.navigate('SignIn');
        return;
      }
      action();
    },
    [isLoggedIn, navigation],
  );

  return { isLoggedIn, currentUserId, requireLogin };
}
