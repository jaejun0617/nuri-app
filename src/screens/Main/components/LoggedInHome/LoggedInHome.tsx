// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx

import React, { useEffect, useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import { styles } from '../../MainScreen.styles';
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore } from '../../../../store/petStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function diffDaysFromKst(dateYmd: string) {
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
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export default function LoggedInHome() {
  const navigation = useNavigation<Nav>();

  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);

  const booted = usePetStore(s => s.booted);
  const loading = usePetStore(s => s.loading);

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return pets.find(p => p.id === selectedPetId) ?? pets[0];
    }
    return pets[0];
  }, [pets, selectedPetId]);

  // ---------------------------------------------------------
  // 1) 자동 온보딩: booted 이후 pets=0이면 PetCreate로 유도
  // ---------------------------------------------------------
  useEffect(() => {
    if (!booted) return;
    if (loading) return;
    if (pets.length > 0) return;

    // 이미 PetCreate에 있으면 중복 이동 방지
    navigation.navigate('PetCreate');
  }, [booted, loading, pets.length, navigation]);

  const greetingTitle = useMemo(() => {
    if (nickname) return `${nickname}님, 반가워요!`;
    return '반가워요!';
  }, [nickname]);

  const greetingSubTitle = useMemo(() => {
    if (pets.length === 0) return '소중한 아이를 등록하고 추억을 기록해 보세요';
    return '오늘의 추억을 확인해 보세요';
  }, [pets.length]);

  const tags = useMemo(() => {
    const petTags = selectedPet?.tags ?? [];
    if (petTags.length > 0) return petTags;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [selectedPet?.tags]);

  const togetherDaysText = useMemo(() => {
    const adoptionDate = selectedPet?.adoptionDate ?? null;
    if (!adoptionDate) return '우리가 함께한 시간';
    const days = diffDaysFromKst(adoptionDate);
    return `우리가 함께한 시간 · ${days}일째`;
  }, [selectedPet?.adoptionDate]);

  // ---------------------------------------------------------
  // 2) 액션 (라우팅 연결)
  // ---------------------------------------------------------
  const onPressAddPet = () => navigation.navigate('PetCreate');
  const onPressTimeline = () => {};
  const onPressGuestbook = () => {};
  const onPressRecord = () => {};
  const onPressPetChip = (petId: string) => selectPet(petId);

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

        {/* pets가 0일 때는 카드 CTA를 등록으로 유도 */}
        {pets.length === 0 ? (
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
              onPress={onPressAddPet}
            >
              <Text style={styles.heroCtaText}>+ 반려등록 등록하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 2) 프로필 카드 */}
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

            {/* 4) 오늘의 메시지(placeholder) */}
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
          </>
        )}
      </ScrollView>

      {/* 하단 탭 + 중앙 FAB */}
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
        onPress={pets.length === 0 ? onPressAddPet : onPressRecord}
      >
        <Text style={styles.fabPlus}>＋</Text>
        <Text style={styles.fabText}>
          {pets.length === 0 ? '등록하기' : '기록하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
