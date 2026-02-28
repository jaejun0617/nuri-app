// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - "홈" 메인 화면 (Guest / Logged-in / Pet 등록 여부 / Multi-pet) UI 기준점
// - Guest 상태는 "로그인 화면처럼 보이는 랜딩 홈"으로 동작 (네가 준 이미지의 왼쪽 UI)
// - Logged-in 상태는 실제 홈(오른쪽 UI)로 동작
//
// 구현 원칙:
// 1) 레이아웃은 고정하고 상태에 따라 컨텐츠만 교체
// 2) 파생 값(selectedPet/tags/d-day)은 화면에서 useMemo로만 계산
// 3) Guest 상태에서 탭/CTA는 AuthLanding으로 유도 (다음 스텝에서 실제 화면 연결)
//
// 다음 단계:
// - AuthLanding / SignIn / SignUp / Nickname screens 구현 후 네비게이션 연결
// - Supabase pets 실데이터 fetch → store.setPets() 주입
// - 기록/타임라인/방명록 라우팅 연결

import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { styles } from './MainScreen.styles';
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore } from '../../../../store/petStore';

/* ---------------------------------------------------------
 * 1) 유틸: KST 기준 "함께한 시간" (입양일 기준 n일째)
 * -------------------------------------------------------- */
function diffDaysFromKst(dateYmd: string) {
  // YYYY-MM-DD만 지원
  const [y, m, d] = dateYmd.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstToday = new Date(
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
    ),
  );

  const ms = kstToday.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1; // 1일째부터
}

export default function MainScreen() {
  // ---------------------------------------------------------
  // 2) Zustand 원천 상태만 구독
  // ---------------------------------------------------------
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const nicknameRaw = useAuthStore(s => s.profile.nickname);

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);

  // ---------------------------------------------------------
  // 3) 파생 상태 (안전/예측 가능)
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const hasPets = pets.length > 0;

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return pets.find(p => p.id === selectedPetId) ?? pets[0];
    }
    return pets[0];
  }, [pets, selectedPetId]);

  // ---------------------------------------------------------
  // 4) 문구 정책
  // ---------------------------------------------------------
  const greetingTitle = useMemo(() => {
    if (isLoggedIn && nickname) return `${nickname}님, 반가워요!`;
    return '반가워요!';
  }, [isLoggedIn, nickname]);

  const greetingSubTitle = useMemo(() => {
    if (!isLoggedIn) return '로그인하고 소중한 추억을 기록해 보세요';
    if (isLoggedIn && !hasPets)
      return '소중한 아이를 등록하고 추억을 기록해 보세요';
    return '오늘의 추억을 확인해 보세요';
  }, [isLoggedIn, hasPets]);

  // ---------------------------------------------------------
  // 5) 태그/함께한시간
  // ---------------------------------------------------------
  const tags = useMemo(() => {
    const petTags = selectedPet?.tags ?? [];
    if (petTags.length > 0) return petTags;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [selectedPet?.tags]);

  const togetherDaysText = useMemo(() => {
    const adoptionDate = selectedPet?.adoptionDate ?? null;
    if (adoptionDate) {
      const days = diffDaysFromKst(adoptionDate);
      return `우리가 함께한 시간 · ${days}일째`;
    }
    return '우리가 함께한 시간';
  }, [selectedPet?.adoptionDate]);

  // ---------------------------------------------------------
  // 6) 액션 핸들러
  // - 지금 단계는 "Guest UI 완성"이 목표라, 네비게이션은 TODO로 남김
  // ---------------------------------------------------------
  const goAuthLanding = () => {
    // TODO (Step 2에서 구현)
    // navigation.navigate('AuthLanding')
  };

  const onPressAddPet = () => {
    if (!isLoggedIn) return goAuthLanding();
    // TODO (PetCreateScreen 연결)
  };

  const onPressTimeline = () => {
    if (!isLoggedIn) return goAuthLanding();
    // TODO
  };

  const onPressGuestbook = () => {
    if (!isLoggedIn) return goAuthLanding();
    // TODO
  };

  const onPressRecord = () => {
    if (!isLoggedIn) return goAuthLanding();
    // TODO
  };

  const onPressPetChip = (petId: string) => {
    if (!isLoggedIn) return goAuthLanding();
    selectPet(petId);
  };

  // ---------------------------------------------------------
  // 7) Guest UI (네 이미지의 왼쪽 레이아웃에 맞춰 고정)
  // ---------------------------------------------------------
  const renderGuest = () => {
    return (
      <View style={styles.screen}>
        {/* ------------------------------
            A) 스크롤 컨텐츠
        ------------------------------ */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1) 헤더: 인사 + 우측 미니(placeholder) */}
          <View style={styles.header}>
            <View style={styles.headerTextArea}>
              <Text style={styles.title}>{greetingTitle}</Text>
              <Text style={styles.subTitle}>{greetingSubTitle}</Text>
            </View>

            {/* Guest는 우측 미니 프로필을 "비어있는 원" 느낌으로 */}
            <View style={styles.guestMiniCircle} />
          </View>

          {/* 2) 메인 카드: 큰 + / 안내 / CTA (이미지 왼쪽 핵심) */}
          <View style={styles.heroCard}>
            <View style={styles.heroPlusCircle}>
              <Text style={styles.heroPlus}>＋</Text>
            </View>

            <Text style={styles.heroHint}>
              아직 등록된 반려동물이 없어요...
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.heroCta}
              onPress={goAuthLanding}
            >
              <Text style={styles.heroCtaText}>+ 반려등록 등록하기</Text>
            </TouchableOpacity>
          </View>

          {/* 3) 함께한 시간 + 태그 */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{togetherDaysText}</Text>
              <View style={styles.sectionTitleIcons}>
                <Text style={styles.sectionTitleIcon}>🗓</Text>
                <Text style={styles.sectionTitleIcon}>🩷</Text>
              </View>
            </View>

            <View style={styles.tagsRow}>
              {tags.map(t => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4) 기록하기: 이미지 왼쪽의 "기록하기 가이드 카드" 느낌 */}
          <View style={styles.section}>
            <View style={styles.tipCard}>
              <View style={styles.tipHeaderRow}>
                <Text style={styles.tipTitle}>기록하기</Text>
                <Text style={styles.tipSub}>
                  지금 떠오르는 순간을 남겨요. {'\n'}
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

          {/* 5) 최근 기록: 이미지 왼쪽의 하단 카드 느낌 */}
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

        {/* ------------------------------
            B) 하단 탭 + 중앙 FAB (Guest도 동일 UI, 눌리면 AuthLanding 유도)
        ------------------------------ */}
        <View style={styles.bottomTab}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.tabItem}
            onPress={() => {}}
          >
            <Text style={styles.tabIcon}>⌂</Text>
            <Text style={styles.tabTextActive}>홈</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.tabItem}
            onPress={onPressTimeline}
          >
            <Text style={styles.tabIcon}>🐾</Text>
            <Text style={styles.tabText}>추억보기</Text>
          </TouchableOpacity>

          {/* 가운데 탭은 자리만 비워두고 FAB로 대체 */}
          <View style={styles.tabItem} />

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.tabItem}
            onPress={onPressGuestbook}
          >
            <Text style={styles.tabIcon}>✉️</Text>
            <Text style={styles.tabText}>방명록</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.tabItem}
            onPress={() => {}}
          >
            <Text style={styles.tabIcon}>≡</Text>
            <Text style={styles.tabText}>더보기</Text>
          </TouchableOpacity>
        </View>

        {/* 중앙 FAB */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.fab}
          onPress={onPressRecord}
        >
          <Text style={styles.fabPlus}>＋</Text>
          <Text style={styles.fabText}>기록하기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------------------------------------------------
  // 8) Logged-in UI (현재 보유한 구조 유지 + 헤더 우측 멀티펫 스위처)
  // ---------------------------------------------------------
  const renderLoggedIn = () => {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContentLoggedIn}
          showsVerticalScrollIndicator={false}
        >
          {/* 1) 헤더 + 멀티펫 스위처 */}
          <View style={styles.header}>
            <View style={styles.headerTextArea}>
              <Text style={styles.title}>{greetingTitle}</Text>
              <Text style={styles.subTitle}>{greetingSubTitle}</Text>
            </View>

            <View style={styles.petSwitcherRow}>
              {pets.slice(0, 4).map(p => {
                const isActive = p.id === selectedPet?.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.85}
                    style={[
                      styles.petChip,
                      isActive ? styles.petChipActive : null,
                    ]}
                    onPress={() => onPressPetChip(p.id)}
                  >
                    {p.avatarUrl ? (
                      <Image
                        source={{ uri: p.avatarUrl }}
                        style={styles.petChipImage}
                      />
                    ) : (
                      <View style={styles.petChipPlaceholder} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.petAddChip}
                onPress={onPressAddPet}
              >
                <Text style={styles.petAddPlus}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2) 프로필 카드(간단 버전) */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.profileImageWrap}>
                {selectedPet?.avatarUrl ? (
                  <Image
                    source={{ uri: selectedPet.avatarUrl }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder} />
                )}
              </View>

              <View style={styles.profileTextArea}>
                <Text style={styles.petName}>
                  {selectedPet?.name ?? '우리 아이'}
                </Text>
                <Text style={styles.petMeta}>사랑으로 기록해요</Text>

                <View style={styles.tagsRow}>
                  {tags.map(t => (
                    <View key={t} style={styles.tagChip}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* 3) 함께한 시간 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{togetherDaysText}</Text>
            <Text style={styles.sectionDesc}>
              오늘도 우리만의 속도로, 천천히 기록해요.
            </Text>
          </View>

          {/* 4) 오늘의 메시지 (하드코딩) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘의 메시지</Text>

            <View style={styles.messageRow}>
              <View style={styles.messageThumb} />
              <View style={styles.messageThumb} />
              <View style={styles.messageThumb} />
            </View>

            <View style={styles.messageCaptionRow}>
              <Text style={styles.messageCaption}>오늘 아침엔...</Text>
              <Text style={styles.messageCaption}>점심엔...</Text>
              <Text style={styles.messageCaption}>오늘은...</Text>
            </View>
          </View>

          {/* 5) 최근 기록 */}
          <View style={styles.section}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>최근 기록</Text>
              <TouchableOpacity onPress={onPressTimeline} activeOpacity={0.8}>
                <Text style={styles.recentMore}>더보기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentGrid}>
              <View style={styles.recentGridItem} />
              <View style={styles.recentGridItem} />
            </View>
          </View>
        </ScrollView>

        {/* 하단 탭 + FAB */}
        <View style={styles.bottomTab}>
          <TouchableOpacity activeOpacity={0.85} style={styles.tabItem}>
            <Text style={styles.tabIcon}>⌂</Text>
            <Text style={styles.tabTextActive}>홈</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.tabItem}
            onPress={onPressTimeline}
          >
            <Text style={styles.tabIcon}>🐾</Text>
            <Text style={styles.tabText}>추억보기</Text>
          </TouchableOpacity>

          <View style={styles.tabItem} />

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.tabItem}
            onPress={onPressGuestbook}
          >
            <Text style={styles.tabIcon}>✉️</Text>
            <Text style={styles.tabText}>방명록</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} style={styles.tabItem}>
            <Text style={styles.tabIcon}>≡</Text>
            <Text style={styles.tabText}>더보기</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.fab}
          onPress={onPressRecord}
        >
          <Text style={styles.fabPlus}>＋</Text>
          <Text style={styles.fabText}>기록하기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------------------------------------------------
  // 9) 상태 분기 렌더링
  // ---------------------------------------------------------
  if (!isLoggedIn) return renderGuest();
  return renderLoggedIn();
}
