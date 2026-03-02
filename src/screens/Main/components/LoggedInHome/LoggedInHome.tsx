// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 헤더: 닉네임 인사 + 멀티펫 썸네일 스위처(최대 4 + +버튼)
// - 프로필 카드: 선택된 펫 정보/태그
// - 최근 기록(실데이터) 2개 + 더보기(타임라인)
//
// ✅ 안정화 포인트(중요):
// - Hook 호출을 "항상 동일한 개수/순서"로 고정 (조건문 내부 hook 호출 금지)
// - zustand selector는 "안전한 단순 접근"만 사용
// - activePetId가 null이어도 hook 자체는 호출되되 selector에서 undefined만 리턴
//
// ✅ UX 개선(Reanimated):
// - 펫칩 전환 시: (fade/slide out) → selectedPetId 변경 → (fade/slide in)
// - 애니메이션은 UI thread에서 수행 → 버벅임 감소
// - 전환 중 연타 방지로 중첩 렌더/끊김 방지
//
// ✅ 구조 변경(중요):
// - 공통 하단 탭은 AppTabsNavigator에서 전역 노출
// - 따라서 이 파일의 하단 탭 / FAB UI는 제거

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ✅ Reanimated
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Screen from '../../../../components/layout/Screen';
import { styles } from '../../MainScreen.styles';
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore } from '../../../../store/petStore';
import { useRecordStore } from '../../../../store/recordStore';

type Nav = NativeStackNavigationProp<any>;

/* ---------------------------------------------------------
 * 1) utils
 * -------------------------------------------------------- */
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

/* ---------------------------------------------------------
 * 2) component
 * -------------------------------------------------------- */
export default function LoggedInHome() {
  // ---------------------------------------------------------
  // 0) navigation
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();

  // ---------------------------------------------------------
  // 1) auth (hook 고정)
  // ---------------------------------------------------------
  const nicknameRaw = useAuthStore(s => s.profile.nickname);

  // ---------------------------------------------------------
  // 2) pets (hook 고정)
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);
  const petBooted = usePetStore(s => s.booted);

  // ---------------------------------------------------------
  // 3) derived (hook 고정)
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;

    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return pets.find(p => p.id === selectedPetId) ?? pets[0];
    }

    return pets[0];
  }, [pets, selectedPetId]);

  const activePetId = useMemo(() => selectedPet?.id ?? null, [selectedPet]);

  // pets boot 완료 후 pets가 0이면 PetCreate 자동 유도
  useEffect(() => {
    if (!petBooted) return;
    if (pets.length > 0) return;
    navigation.navigate('PetCreate', { from: 'auto' });
  }, [petBooted, pets.length, navigation]);

  // ---------------------------------------------------------
  // 3.5) transition animation (Reanimated, hook 고정)
  // ---------------------------------------------------------
  const [switching, setSwitching] = useState(false);

  // ✅ 전환 값(원하면 여기만 조절)
  const OUT_OPACITY = 0.9;
  const OUT_LIFT_PX = 6;

  // ✅ shared values
  const svOpacity = useSharedValue(1);
  const svTranslateY = useSharedValue(0);

  // ✅ animated style
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: svOpacity.value,
      transform: [{ translateY: svTranslateY.value }],
    };
  }, []);

  // ---------------------------------------------------------
  // 4) records (hook 고정)
  // ---------------------------------------------------------
  const bootstrapRecords = useRecordStore(s => s.bootstrap);

  const petRecordsState = useRecordStore(s => {
    if (!activePetId) return undefined;
    return s.byPetId[activePetId];
  });

  useEffect(() => {
    if (!activePetId) return;
    bootstrapRecords(activePetId);
  }, [bootstrapRecords, activePetId]);

  const recentRecords = useMemo(() => {
    const items = petRecordsState?.items ?? [];
    return items.slice(0, 2);
  }, [petRecordsState?.items]);

  // ---------------------------------------------------------
  // 5) derived texts (hook 고정)
  // ---------------------------------------------------------
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

  const selectedAvatarUri = useMemo(
    () => selectedPet?.avatarUrl ?? null,
    [selectedPet],
  );

  // ---------------------------------------------------------
  // 6) actions (hook 고정)
  // ---------------------------------------------------------
  const onPressAddPet = useCallback(() => {
    navigation.navigate('PetCreate', { from: 'header_plus' });
  }, [navigation]);

  const onPressTimeline = useCallback(() => {
    navigation.navigate('TimelineTab');
  }, [navigation]);

  const onPressRecord = useCallback(() => {
    navigation.navigate('RecordCreateTab');
  }, [navigation]);

  const onPressRecordItem = useCallback(
    (memoryId: string) => {
      if (!activePetId) return;
      navigation.navigate('RecordDetail', { petId: activePetId, memoryId });
    },
    [navigation, activePetId],
  );

  /**
   * ✅ Reanimated 기반 펫 전환
   * - out 애니메이션(UI thread)
   * - out 완료 시 selectPet(runOnJS)
   * - in 애니메이션(UI thread)
   * - 완료 시 switching=false(runOnJS)
   */
  const onPressPetChip = useCallback(
    (petId: string) => {
      if (switching) return;
      if (petId === activePetId) return;

      setSwitching(true);

      // 1) OUT
      svOpacity.value = withTiming(OUT_OPACITY, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      });
      svTranslateY.value = withTiming(
        OUT_LIFT_PX,
        { duration: 140, easing: Easing.out(Easing.cubic) },
        finished => {
          if (!finished) {
            runOnJS(setSwitching)(false);
            return;
          }

          // 2) pet 변경 (JS)
          runOnJS(selectPet)(petId);

          // 3) IN
          svOpacity.value = withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          });

          svTranslateY.value = withTiming(
            0,
            { duration: 180, easing: Easing.out(Easing.cubic) },
            () => {
              runOnJS(setSwitching)(false);
            },
          );
        },
      );
    },
    [
      switching,
      activePetId,
      selectPet,
      svOpacity,
      svTranslateY,
      OUT_OPACITY,
      OUT_LIFT_PX,
    ],
  );

  // ---------------------------------------------------------
  // 7) render
  // ---------------------------------------------------------
  return (
    <Screen style={styles.screen}>
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
              const isActive = p.id === activePetId;
              const uri = p.avatarUrl ?? null;

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
                  {uri ? (
                    <Image source={{ uri }} style={styles.petChipImage} />
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

        {/* 2) 전환 대상 컨텐츠 */}
        <Animated.View style={animatedContentStyle}>
          {/* 프로필 카드 */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.profileImageWrap}>
                {selectedAvatarUri ? (
                  <Image
                    source={{ uri: selectedAvatarUri }}
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

          {/* 함께한 시간 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{togetherDaysText}</Text>
            <Text style={styles.sectionDesc}>
              오늘도 우리만의 속도로, 천천히 기록해요.
            </Text>
          </View>

          {/* 오늘의 메시지(placeholder) */}
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

          {/* 최근 기록 */}
          <View style={styles.section}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>최근 기록</Text>
              <TouchableOpacity onPress={onPressTimeline} activeOpacity={0.8}>
                <Text style={styles.recentMore}>더보기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentGrid}>
              {recentRecords.length === 0 ? (
                <>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.recentGridItem}
                    onPress={onPressRecord}
                  />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.recentGridItem}
                    onPress={onPressRecord}
                  />
                </>
              ) : (
                <>
                  {Array.from({ length: 2 }).map((_, idx) => {
                    const item = recentRecords[idx] ?? null;

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.9}
                        style={styles.recentGridItem}
                        onPress={() =>
                          item ? onPressRecordItem(item.id) : onPressRecord()
                        }
                      >
                        {item?.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: 18,
                            }}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
