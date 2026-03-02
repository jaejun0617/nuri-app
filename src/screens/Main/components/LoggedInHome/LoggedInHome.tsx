// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 헤더: 닉네임 인사 + 멀티펫 썸네일 스위처(최대 4 + +버튼)
//
// ✅ 이번 변경(핵심):
// - "큰 프로필 카드(펫 정보) ~ 오늘의 메시지" 를 하나의 heroCard로 묶음
// - 이름 아래: (견종/메타) 나이 · 몸무게 · 생년월일
// - 태그 row
// - 태그 아래: 오늘의 메시지
// - 아래로: 오늘날의 사진 / 최근기록(주간 7개)
//
// ✅ 안정화 포인트:
// - Hook 호출은 항상 동일 순서
// - recordStore getPetState fallback shape 고정
// - pets=0이면 PetCreate로 reset 유도
//
// ✅ UX:
// - 펫칩 전환 reanimated(fade/slide)

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
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore } from '../../../../store/petStore';
import { useRecordStore } from '../../../../store/recordStore';

import type { MemoryRecord } from '../../../../services/supabase/memories';
import { daysAgoFromKstToday } from '../../../../utils/date';
import {
  pickTodayPhoto,
  generateTimeMessage,
} from '../../../../services/home/homeRecall';

import { styles } from './LoggedInHome.styles';

type Nav = NativeStackNavigationProp<any>;

/* ---------------------------------------------------------
 * 1) helpers
 * -------------------------------------------------------- */
function getRecordYmd(item: MemoryRecord): string {
  return (item.occurredAt ?? item.createdAt.slice(0, 10)) as string;
}

function toSnippet(text: string | null | undefined, max = 46) {
  const v = (text ?? '').trim();
  if (!v) return '내용이 없습니다.';
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
}

function formatBirthYmd(birth: any): string | null {
  const s = typeof birth === 'string' ? birth : null;
  if (!s || s.length < 10) return null; // YYYY-MM-DD
  const y = s.slice(0, 4);
  const m = s.slice(5, 7);
  const d = s.slice(8, 10);
  return `${y}.${m}.${d}`;
}

function calcAgeFromBirth(birthYmd: string | null): number | null {
  if (!birthYmd) return null;
  const [y, m, d] = birthYmd.split('-').map(n => Number(n));
  if (!y || !m || !d) return null;

  // KST 기준(대략) — 화면표시용
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  let age = kstNow.getUTCFullYear() - y;
  const curM = kstNow.getUTCMonth() + 1;
  const curD = kstNow.getUTCDate();

  if (curM < m || (curM === m && curD < d)) age -= 1;
  if (age < 0) return 0;
  return age;
}

/**
 * pickWeekly7
 * - 최근 기록을 "1주 간격"으로 최대 7개 선택
 * - today 기준 daysAgo로 bucket = floor(daysAgo/7)
 * - bucket 0..6(총 7개)에서 각 bucket의 첫 기록을 선택
 */
function pickWeekly7(items: MemoryRecord[]) {
  const picked = new Array<MemoryRecord | null>(7).fill(null);

  for (const it of items) {
    const ymd = getRecordYmd(it);
    const daysAgo = daysAgoFromKstToday(ymd);

    if (daysAgo === null) continue;
    if (daysAgo < 0) continue;
    if (daysAgo > 48) continue;

    const bucket = Math.floor(daysAgo / 7); // 0..6
    if (bucket < 0 || bucket > 6) continue;

    if (!picked[bucket]) picked[bucket] = it;
    if (picked.every(Boolean)) break;
  }

  return picked.filter(Boolean) as MemoryRecord[];
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
  // 1) auth
  // ---------------------------------------------------------
  const nicknameRaw = useAuthStore(s => s.profile.nickname);

  // ---------------------------------------------------------
  // 2) pets
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);
  const petBooted = usePetStore(s => s.booted);

  // ---------------------------------------------------------
  // 3) derived
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

  // ---------------------------------------------------------
  // ✅ pets boot 완료 후 pets=0이면 PetCreate로 reset 유도
  // ---------------------------------------------------------
  useEffect(() => {
    if (!petBooted) return;
    if (pets.length > 0) return;

    navigation.reset({
      index: 0,
      routes: [{ name: 'PetCreate', params: { from: 'auto' } }],
    });
  }, [petBooted, pets.length, navigation]);

  // ---------------------------------------------------------
  // 3.5) transition animation (Reanimated)
  // ---------------------------------------------------------
  const [switching, setSwitching] = useState(false);

  const OUT_OPACITY = 0.9;
  const OUT_LIFT_PX = 6;

  const svOpacity = useSharedValue(1);
  const svTranslateY = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: svOpacity.value,
      transform: [{ translateY: svTranslateY.value }],
    };
  }, []);

  // ---------------------------------------------------------
  // 4) records
  // ---------------------------------------------------------
  const bootstrapRecords = useRecordStore(s => s.bootstrap);
  const getPetState = useRecordStore(s => s.getPetState);

  const petRecordsState = useMemo(() => {
    return getPetState(activePetId ?? '');
  }, [getPetState, activePetId]);

  useEffect(() => {
    if (!activePetId) return;
    bootstrapRecords(activePetId);
  }, [bootstrapRecords, activePetId]);

  // ---------------------------------------------------------
  // 4.5) today message / today photo
  // ---------------------------------------------------------
  const todayMessage = useMemo(() => {
    return generateTimeMessage(selectedPet?.name ?? null);
  }, [selectedPet?.name]);

  const [todayPhoto, setTodayPhoto] = useState<{
    record: MemoryRecord | null;
    mode: 'anniversary' | 'random' | 'none';
  }>({ record: null, mode: 'none' });

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!activePetId) {
        if (mounted) setTodayPhoto({ record: null, mode: 'none' });
        return;
      }
      const picked = await pickTodayPhoto(activePetId, petRecordsState.items);
      if (mounted) setTodayPhoto(picked);
    }

    run();
    return () => {
      mounted = false;
    };
  }, [activePetId, petRecordsState.items]);

  // ---------------------------------------------------------
  // 4.6) recent weekly 7
  // ---------------------------------------------------------
  const weekly7 = useMemo(
    () => pickWeekly7(petRecordsState.items),
    [petRecordsState.items],
  );
  const showMore = useMemo(() => weekly7.length >= 7, [weekly7.length]);

  // ---------------------------------------------------------
  // 5) hero card derived (펫 정보 라인)
  // - 다양한 필드 네이밍을 안전하게 흡수(any)
  // ---------------------------------------------------------
  const petAny = selectedPet as any;

  const petName = useMemo(
    () => selectedPet?.name ?? '우리 아이',
    [selectedPet?.name],
  );
  const breed = useMemo(() => {
    const v = (petAny?.breed ?? petAny?.breedName ?? null) as string | null;
    return v?.trim() ? v.trim() : null;
  }, [petAny?.breed, petAny?.breedName]);

  const birthYmd = useMemo(() => {
    const v = (petAny?.birthDate ??
      petAny?.birth_date ??
      petAny?.birthday ??
      null) as string | null;
    return v?.trim() ? v.trim() : null;
  }, [petAny?.birthDate, petAny?.birth_date, petAny?.birthday]);

  const birthText = useMemo(() => formatBirthYmd(birthYmd), [birthYmd]);

  const ageText = useMemo(() => {
    const age = calcAgeFromBirth(birthYmd);
    if (age === null) return null;
    return `${age}살`;
  }, [birthYmd]);

  const weightText = useMemo(() => {
    const v = petAny?.weightKg ?? petAny?.weight_kg ?? null;
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    // 4.5kg 처럼
    return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}kg`;
  }, [petAny?.weightKg, petAny?.weight_kg]);

  const metaLine = useMemo(() => {
    // "견종"은 별도 줄로 두고, 메타는 아래 줄로 고정
    const parts: string[] = [];
    if (ageText) parts.push(ageText);
    if (weightText) parts.push(weightText);
    if (birthText) parts.push(`생년월일 ${birthText}`);
    return parts.join(' · ');
  }, [ageText, weightText, birthText]);

  const tags = useMemo(() => {
    const arr = (petAny?.tags ??
      petAny?.personalityTags ??
      petAny?.personality_tags ??
      []) as string[];
    if (Array.isArray(arr) && arr.length > 0) return arr;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [petAny?.tags, petAny?.personalityTags, petAny?.personality_tags]);

  const selectedAvatarUri = useMemo(
    () => selectedPet?.avatarUrl ?? null,
    [selectedPet?.avatarUrl],
  );

  const todayPhotoOverlayTitle = useMemo(() => {
    if (todayPhoto.mode === 'anniversary') return '작년 오늘의 기억';
    if (todayPhoto.mode === 'random') return '오늘 꺼내보는 한 장';
    return '오늘의 사진';
  }, [todayPhoto.mode]);

  // ---------------------------------------------------------
  // 6) derived header
  // ---------------------------------------------------------
  const greetingTitle = useMemo(() => {
    if (nickname) return `${nickname}님, 반가워요!`;
    return '반가워요!';
  }, [nickname]);

  const greetingSubTitle = useMemo(() => {
    if (pets.length === 0) return '소중한 아이를 등록하고 추억을 기록해 보세요';
    return '오늘의 메시지로 하루를 시작해요';
  }, [pets.length]);

  // ---------------------------------------------------------
  // 7) actions
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

  const onPressPetChip = useCallback(
    (petId: string) => {
      if (switching) return;
      if (petId === activePetId) return;

      setSwitching(true);

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

          runOnJS(selectPet)(petId);

          svOpacity.value = withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          });

          svTranslateY.value = withTiming(
            0,
            { duration: 180, easing: Easing.out(Easing.cubic) },
            () => runOnJS(setSwitching)(false),
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
  // 8) render
  // ---------------------------------------------------------
  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
          {/* ✅ HERO CARD: 큰 프로필카드 ~ 오늘의 메시지 묶음 */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {petName}
                </Text>

                {breed ? (
                  <Text style={styles.heroBreed} numberOfLines={1}>
                    {breed}
                  </Text>
                ) : null}

                {metaLine ? (
                  <Text style={styles.heroMeta} numberOfLines={2}>
                    {metaLine}
                  </Text>
                ) : (
                  <Text style={styles.heroMetaMuted} numberOfLines={1}>
                    아이 정보를 채우면 더 예쁘게 보여요
                  </Text>
                )}
              </View>

              <View style={styles.heroAvatarWrap}>
                {selectedAvatarUri ? (
                  <Image
                    source={{ uri: selectedAvatarUri }}
                    style={styles.heroAvatarImg}
                  />
                ) : (
                  <View style={styles.heroAvatarPlaceholder} />
                )}
              </View>
            </View>

            <View style={styles.heroTagsRow}>
              {tags.map(t => (
                <View key={t} style={styles.heroTagChip}>
                  <Text style={styles.heroTagText}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={styles.heroDivider} />

            <Text style={styles.heroMessageTitle}>오늘의 메시지</Text>
            <Text style={styles.heroMessageText}>{todayMessage}</Text>
          </View>

          {/* 2) 오늘날의 사진 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘날의 사진</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.photoCard}
              onPress={() =>
                todayPhoto.record
                  ? onPressRecordItem(todayPhoto.record.id)
                  : onPressRecord()
              }
            >
              {todayPhoto.record?.imageUrl ? (
                <Image
                  source={{ uri: todayPhoto.record.imageUrl }}
                  style={styles.photoImage}
                />
              ) : (
                <View style={styles.photoPlaceholder} />
              )}

              <View style={styles.photoOverlay}>
                <Text style={styles.photoOverlayTitle}>
                  {todayPhotoOverlayTitle}
                </Text>
                <Text style={styles.photoOverlaySub} numberOfLines={1}>
                  {todayPhoto.record?.title?.trim()
                    ? todayPhoto.record.title
                    : '추억을 눌러 확인해요'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 3) 최근 기록 (주간 7개) */}
          <View style={styles.section}>
            <View style={styles.recentHeaderRow}>
              <Text style={styles.sectionTitle}>최근 기록</Text>

              {showMore ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onPressTimeline}
                >
                  <Text style={styles.moreBtnText}>더보기</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
            </View>

            {weekly7.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
                <Text style={styles.emptyDesc}>첫 번째 추억을 남겨보세요.</Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.recordBtn}
                  onPress={onPressRecord}
                >
                  <Text style={styles.recordBtnText}>기록하기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.recentList}>
                  {weekly7.map(item => {
                    const ymd = getRecordYmd(item);
                    const title = item.title?.trim() ? item.title : '제목 없음';
                    const content = toSnippet(item.content, 46);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.9}
                        style={styles.recentItem}
                        onPress={() => onPressRecordItem(item.id)}
                      >
                        <View style={styles.recentThumb}>
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={styles.recentThumbImg}
                            />
                          ) : (
                            <View style={styles.recentThumbPlaceholder} />
                          )}
                        </View>

                        <View style={styles.recentInfo}>
                          <Text style={styles.recentTitle} numberOfLines={1}>
                            {title}
                          </Text>
                          <Text style={styles.recentContent} numberOfLines={2}>
                            {content}
                          </Text>

                          <View style={styles.recentMetaRow}>
                            <View style={{ flex: 1 }} />
                            <Text style={styles.recentDate}>{ymd}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.recordBtn}
                  onPress={onPressRecord}
                >
                  <Text style={styles.recordBtnText}>기록하기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
