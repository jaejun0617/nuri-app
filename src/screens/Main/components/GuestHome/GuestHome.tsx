// 파일: src/screens/Main/components/GuestHome/GuestHome.tsx
// 목적:
// - 로그인하지 않은 사용자 홈
// - 전역 하단 탭(AppTabsNavigator) 구조에 맞게 단순화
// - SafeArea 상단 간격 적용
// - 스타일 충돌 제거

import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import { useAuthStore } from '../../../../store/authStore';
import { styles } from '../../MainScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GuestHome() {
  // ---------------------------------------------------------
  // 1) navigation
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // ---------------------------------------------------------
  // 2) auth
  // ---------------------------------------------------------
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  // ---------------------------------------------------------
  // 3) texts
  // ---------------------------------------------------------
  const greetingTitle = useMemo(() => {
    if (nickname) return `${nickname}님, 반가워요!`;
    return '반가워요!';
  }, [nickname]);

  const greetingSubTitle = '로그인하고 소중한 추억을 기록해 보세요';

  const goAuthLanding = () => navigation.navigate('AuthLanding');

  // ---------------------------------------------------------
  // 4) render
  // ---------------------------------------------------------
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerTextArea}>
            <Text style={styles.title}>{greetingTitle}</Text>
            <Text style={styles.subTitle}>{greetingSubTitle}</Text>
          </View>
        </View>

        {/* 메인 히어로 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.heroPlusCircle}>
            <Text style={styles.heroPlus}>＋</Text>
          </View>

          <Text style={styles.heroHint}>아직 등록된 반려동물이 없어요</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.heroCta}
            onPress={goAuthLanding}
          >
            <Text style={styles.heroCtaText}>로그인하고 시작하기</Text>
          </TouchableOpacity>
        </View>

        {/* 안내 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>우리가 함께한 시간</Text>

          <View style={styles.tagsRow}>
            {['#산책러버', '#간식최애', '#주인바라기'].map(tag => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
