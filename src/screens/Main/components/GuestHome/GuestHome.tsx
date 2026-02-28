// 파일: src/screens/Main/components/GuestHome/GuestHome.tsx
// 목적:
// - 로그인 전(GUEST) 전용 홈 레이아웃
// - “로그인하고 시작하기”가 아니라
//   “게스트 홈” 자체가 앱의 첫 인상을 담당 (왼쪽 UI)
//
// 다음 단계 연결:
// - goAuthLanding(): AuthLanding 화면으로 이동하도록 연결

import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { styles } from './GuestHome.styles';
import { useAuthStore } from '../../../../store/authStore';

export default function GuestHome() {
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  // ---------------------------------------------------------
  // 1) 문구 정책
  // ---------------------------------------------------------
  const greetingTitle = useMemo(() => {
    // 게스트여도 “닉네임이 있으면” 환영문구 가능 (원하면 제거 가능)
    if (nickname) return `${nickname}님, 반가워요!`;
    return '반가워요!';
  }, [nickname]);

  const greetingSubTitle = '로그인하고 소중한 추억을 기록해 보세요';

  // ---------------------------------------------------------
  // 2) 액션 (다음 스텝에서 네비게이션 연결)
  // ---------------------------------------------------------
  const goAuthLanding = () => {
    // TODO: navigation.navigate('AuthLanding')
  };

  // ---------------------------------------------------------
  // 3) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1) 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerTextArea}>
            <Text style={styles.title}>{greetingTitle}</Text>
            <Text style={styles.subTitle}>{greetingSubTitle}</Text>
          </View>

          {/* 오른쪽 작은 프로필(게스트는 placeholder 원) */}
          <View style={styles.miniAvatar} />
        </View>

        {/* 2) 메인 카드 (큰 + / 설명 / CTA) */}
        <View style={styles.heroCard}>
          <View style={styles.heroPlusCircle}>
            <Text style={styles.heroPlus}>＋</Text>
          </View>

          <Text style={styles.heroHint}>아직 등록된 반려동물이 없어요...</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.heroButton}
            onPress={goAuthLanding}
          >
            <Text style={styles.heroButtonText}>+ 반려등록 등록하기</Text>
          </TouchableOpacity>
        </View>

        {/* 3) 함께한 시간 + 태그 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>우리가 함께한 시간</Text>
            <View style={styles.sectionTitleIcons}>
              <Text style={styles.sectionTitleIcon}>🗓</Text>
              <Text style={styles.sectionTitleIcon}>🩷</Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            {['#산책러버', '#간식최애', '#물놀이무서워요'].map(t => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4) 기록하기 안내 카드 */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>기록하기</Text>
            <Text style={styles.tipDesc}>
              구여울 쪽글이 보여요.{'\n'}포옹을 청력해요..
            </Text>

            <View style={styles.tipThumbRow}>
              <View style={styles.tipThumb} />
              <View style={styles.tipThumb} />
              <View style={styles.tipThumb} />
            </View>
          </View>
        </View>

        {/* 5) 기록하기 버튼(하단 큰 바 느낌) */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.recordBar}
            onPress={goAuthLanding}
          >
            <Text style={styles.recordBarText}>+ 기록하기</Text>
            <View style={styles.recordBarRight}>
              <View style={styles.recordMiniIcon} />
              <View style={styles.recordMiniIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 6) 최근 기록 */}
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

      {/* 7) 하단 탭 (게스트 전용 레이아웃) */}
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
    </View>
  );
}
