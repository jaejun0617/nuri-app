// 파일: src/screens/Guestbook/GuestbookScreen.tsx
// 파일 목적:
// - 방명록 탭의 현재 운영 상태를 프리미엄 empty/gate UI로 안내한다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 `GuestbookTab` 화면으로 사용된다.
// 핵심 역할:
// - 게스트에게는 로그인 유도 화면을 보여주고, 로그인 사용자에게는 준비 중인 도메인 상태를 정돈된 안내 카드로 보여준다.
// 수정 시 주의:
// - 방명록 기능이 아직 구현되지 않았으므로, 카테고리/작성 CTA처럼 실제 동작하지 않는 affordance를 다시 열면 안 된다.

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import GuestLockedState from '../../components/common/GuestLockedState';
import Screen from '../../components/layout/Screen';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GuestbookScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const goSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  const goHome = useCallback(() => {
    navigation.navigate('AppTabs', { screen: 'HomeTab' });
  }, [navigation]);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(132, insets.bottom + 108) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText
            preset="caption"
            style={[styles.eyebrow, { color: theme.colors.brand }]}
          >
            GUESTBOOK
          </AppText>
          <AppText
            preset="headline"
            style={[styles.title, { color: theme.colors.textPrimary }]}
          >
            방명록
          </AppText>
          <AppText
            preset="body"
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {isLoggedIn
              ? '방명록은 더 정교한 흐름으로 준비하고 있어요. 지금은 홈과 타임라인에서 우리 아이의 시간을 먼저 차곡차곡 남겨보세요.'
              : '로그인하면 기록과 타임라인, 방명록 여정이 한 흐름으로 이어집니다.'}
          </AppText>
        </View>

        <View style={styles.stateWrap}>
          <GuestLockedState
            eyebrow={isLoggedIn ? 'COMING NEXT' : 'GUEST EXPERIENCE'}
            titleLines={
              isLoggedIn
                ? ['방명록은 더 정교하게', '준비하고 있어요.']
                : ['NURI의 모든 기능을', '경험해 보세요.']
            }
            bodyLines={
              isLoggedIn
                ? [
                    '지금은 홈과 타임라인에서 우리 아이의 시간을',
                    '차분하게 기록하며 다음 여정을 기다려 주세요.',
                  ]
                : [
                    '로그인 후 우리 아이와 함께한 시간을',
                    '더 깊고 자연스럽게 이어서 남길 수 있어요.',
                  ]
            }
            buttonLabel={isLoggedIn ? '홈으로 돌아가기' : '로그인하고 기록하기'}
            onPress={isLoggedIn ? goHome : goSignIn}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 18,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    lineHeight: 22,
    fontWeight: '600',
  },
  stateWrap: {
    flex: 1,
  },
});
