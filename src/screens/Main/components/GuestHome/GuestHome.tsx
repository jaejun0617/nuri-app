// 파일: src/screens/Main/components/GuestHome/GuestHome.tsx

import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import { useAuthStore } from '../../../../store/authStore';
import { styles } from '../../MainScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GuestHome() {
  const navigation = useNavigation<Nav>();

  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  const greetingTitle = useMemo(() => {
    if (nickname) return `${nickname}님, 반가워요!`;
    return '반가워요!';
  }, [nickname]);

  const greetingSubTitle = '로그인하고 소중한 추억을 기록해 보세요';

  const goAuthLanding = () => navigation.navigate('AuthLanding');

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextArea}>
            <Text style={styles.title}>{greetingTitle}</Text>
            <Text style={styles.subTitle}>{greetingSubTitle}</Text>
          </View>

          <View style={styles.guestMiniCircle} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroPlusCircle}>
            <Text style={styles.heroPlus}>＋</Text>
          </View>

          <Text style={styles.heroHint}>아직 등록된 반려동물이 없어요...</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.heroCta}
            onPress={goAuthLanding}
          >
            <Text style={styles.heroCtaText}>+ 반려등록 등록하기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>우리가 함께한 시간</Text>
            <View style={styles.sectionTitleIcons}>
              <Text style={styles.sectionTitleIcon}>🗓</Text>
              <Text style={styles.sectionTitleIcon}>🩷</Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            {['#산책러버', '#간식최애', '#주인바라기'].map(t => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tipCard}>
            <View style={styles.tipHeaderRow}>
              <Text style={styles.tipTitle}>기록하기</Text>
              <Text style={styles.tipSub}>
                지금 떠오르는 순간을 남겨요.{'\n'}
                소중한 기억을 꺼내 볼 수 있게요.
              </Text>
            </View>

            <View style={styles.tipThumbRow}>
              <View style={styles.tipThumb} />
              <View style={styles.tipThumb} />
              <View style={styles.tipThumb} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 기록</Text>

          <View style={styles.recentCard}>
            <View style={styles.recentRow}>
              <View style={styles.recentThumb} />
              <View style={styles.recentThumb} />
              <View style={styles.recentThumb} />
            </View>

            <View style={styles.recentMetaRow}>
              <Text style={styles.recentMeta}>#행복한 산책</Text>
              <Text style={styles.recentMeta}>#치즈</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomTab}>
        <TouchableOpacity activeOpacity={0.85} style={styles.tabItem}>
          <Text style={styles.tabIcon}>⌂</Text>
          <Text style={styles.tabTextActive}>홈</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.tabItem}
          onPress={goAuthLanding}
        >
          <Text style={styles.tabIcon}>🐾</Text>
          <Text style={styles.tabText}>추억보기</Text>
        </TouchableOpacity>

        <View style={styles.tabItem} />

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.tabItem}
          onPress={goAuthLanding}
        >
          <Text style={styles.tabIcon}>✉️</Text>
          <Text style={styles.tabText}>방명록</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.tabItem}
          onPress={goAuthLanding}
        >
          <Text style={styles.tabIcon}>≡</Text>
          <Text style={styles.tabText}>더보기</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.fab}
        onPress={goAuthLanding}
      >
        <Text style={styles.fabPlus}>＋</Text>
        <Text style={styles.fabText}>기록하기</Text>
      </TouchableOpacity>
    </View>
  );
}
