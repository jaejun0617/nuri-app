// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 상단: 닉네임 인사 + 우측 아이콘(검색/알림 UI) + 멀티펫 스위처(최대 4 + +버튼)
// - 프로필 카드: 보라 glow avatar + 메타 + 생년월일 + 함께한 시간 pill
// - 아코디언: 모두펼치기/개별 펼치기 + 리스트/태그 chip
// - 섹션 시작: "{pet}와의 소중한 기록" + "오늘날의 사진(전체보기)" + 보라 overlay
// - 최근 기록(기존 로직 유지)
//
// ✅ 훅/스토어 안정성(필수)
// - recordStore 구독: byPetId[activePetId] 직접 접근
// - fallback 동일 참조(FALLBACK_RECORDS_STATE / Object.freeze)
// - activePetId 변경 시 UI 상태 초기화(최근기록 확장/아코디언/오늘사진)

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
import {
  pickTodayPhoto,
  generateTimeMessage,
} from '../../../../services/home/homeRecall';

import { styles } from './LoggedInHome.styles';

type Nav = NativeStackNavigationProp<any>;

/* ---------------------------------------------------------
 * 1) helpers
 * -------------------------------------------------------- */
function toSnippet(text: string | null | undefined, max = 46) {
  const v = (text ?? '').trim();
  if (!v) return '내용이 없습니다.';
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
}

function formatYmdToDots(ymd: string | null | undefined): string | null {
  const s = (ymd ?? '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return `${s.slice(0, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}`;
}

function getRecordYmdDots(item: MemoryRecord): string {
  const raw = (item.occurredAt ?? item.createdAt.slice(0, 10)) as string;
  return formatYmdToDots(raw) ?? raw;
}

function calcAgeFromBirth(birthYmd: string | null | undefined): number | null {
  const s = (birthYmd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!y || !m || !d) return null;

  // KST 기준
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  let age = kstNow.getUTCFullYear() - y;
  const curM = kstNow.getUTCMonth() + 1;
  const curD = kstNow.getUTCDate();

  if (curM < m || (curM === m && curD < d)) age -= 1;
  if (age < 0) return 0;
  return age;
}

function calcDaysSinceAdoption(
  adoptionYmd: string | null | undefined,
): number | null {
  const s = (adoptionYmd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!y || !m || !d) return null;

  // KST 기준
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const startUtc = Date.UTC(y, m - 1, d);
  const endUtc = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
  );

  const diffDays = Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(diffDays)) return null;

  return Math.max(0, diffDays + 1);
}

function formatGender(
  g: 'male' | 'female' | 'unknown' | null | undefined,
): string | null {
  if (!g || g === 'unknown') return null;
  return g === 'male' ? '남아' : '여아';
}

function formatWeightKg(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}kg`;
}

function clampList(list: string[] | null | undefined, max = 2) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map(s => (s ?? '').trim())
    .filter(Boolean)
    .slice(0, max);
}

/* ---------------------------------------------------------
 * 2) types (recordStore safe)
 * -------------------------------------------------------- */
type PetRecordsStateShape = {
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error';
  items: MemoryRecord[];
  errorMessage: string | null;
  cursor: string | null;
  hasMore: boolean;
  requestSeq?: number;
};

// ✅ 동일 참조 fallback(새 아키텍처/SyncExternalStore 안전)
const FALLBACK_RECORDS_STATE: PetRecordsStateShape = Object.freeze({
  status: 'idle',
  items: [],
  errorMessage: null,
  cursor: null,
  hasMore: false,
});

// 최근기록 표시 개수 규칙
const RECENT_BASE = 7;
const RECENT_EXPANDED = 14;

type AccordionKey = 'hobby' | 'like' | 'dislike' | 'tag';

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

  const activePetId = useMemo(() => selectedPet?.id ?? null, [selectedPet?.id]);

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
  // 3.5) pet switch transition (fade + lift)
  // ---------------------------------------------------------
  const [switching, setSwitching] = useState(false);

  const OUT_OPACITY = 0.92;
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
  // 4) records (✅ 안전한 구독: byPetId[petId] 직접)
  // ---------------------------------------------------------
  const bootstrapRecords = useRecordStore(s => s.bootstrap);

  const petRecordsState = useRecordStore(s =>
    activePetId ? (s.byPetId[activePetId] as any) : null,
  ) as PetRecordsStateShape | null;

  const safeRecordsState = petRecordsState ?? FALLBACK_RECORDS_STATE;

  useEffect(() => {
    if (!activePetId) return;
    bootstrapRecords(activePetId);
  }, [bootstrapRecords, activePetId]);

  // ---------------------------------------------------------
  // 4.1) 최근기록 "더보기" 상태 (pet 변경 시 초기화)
  // ---------------------------------------------------------
  const [recentExpanded, setRecentExpanded] = useState(false);
  useEffect(() => {
    setRecentExpanded(false);
  }, [activePetId]);

  // ---------------------------------------------------------
  // 4.2) 최근 기록 계산
  // ---------------------------------------------------------
  const showMoreBtn = useMemo(
    () => safeRecordsState.items.length > RECENT_BASE + 1,
    [safeRecordsState.items.length],
  );

  const visibleRecentCount = useMemo(
    () => (recentExpanded ? RECENT_EXPANDED : RECENT_BASE),
    [recentExpanded],
  );

  const recentItems = useMemo(
    () => safeRecordsState.items.slice(0, visibleRecentCount),
    [safeRecordsState.items, visibleRecentCount],
  );

  const hasMoreAfterExpanded = useMemo(() => {
    if (!recentExpanded) return false;
    return safeRecordsState.items.length > RECENT_EXPANDED;
  }, [recentExpanded, safeRecordsState.items.length]);

  const moreBtnLabel = useMemo(() => {
    if (!recentExpanded) return '더보기';
    return hasMoreAfterExpanded ? '타임라인' : '더보기';
  }, [recentExpanded, hasMoreAfterExpanded]);

  // ---------------------------------------------------------
  // 4.3) today message / today photo
  // ---------------------------------------------------------
  const todayMessage = useMemo(() => {
    return generateTimeMessage(selectedPet?.name ?? null);
  }, [selectedPet?.name]);

  const [todayPhoto, setTodayPhoto] = useState<{
    record: MemoryRecord | null;
    mode: 'anniversary' | 'random' | 'none';
  }>({ record: null, mode: 'none' });

  // ✅ pet 변경 시 오늘 사진 상태 리셋(스냅샷 흔들림/이전값 잔상 방지)
  useEffect(() => {
    setTodayPhoto({ record: null, mode: 'none' });
  }, [activePetId]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!activePetId) {
        if (mounted) setTodayPhoto({ record: null, mode: 'none' });
        return;
      }
      const picked = await pickTodayPhoto(activePetId, safeRecordsState.items);
      if (mounted) setTodayPhoto(picked);
    }

    run();
    return () => {
      mounted = false;
    };
  }, [activePetId, safeRecordsState.items]);

  const todayPhotoOverlayTitle = useMemo(() => {
    if (todayPhoto.mode === 'anniversary') return '작년 오늘의 기억';
    if (todayPhoto.mode === 'random') return '오늘 꺼내보는 한 장';
    return '오늘의 사진';
  }, [todayPhoto.mode]);

  // ---------------------------------------------------------
  // 5) HERO derived
  // ---------------------------------------------------------
  const petName = useMemo(
    () => selectedPet?.name ?? '우리 아이',
    [selectedPet?.name],
  );

  const breed = useMemo(
    () => (selectedPet?.breed ?? '').trim() || null,
    [selectedPet?.breed],
  );

  const birthYmd = useMemo(
    () => (selectedPet?.birthDate ?? '').trim() || null,
    [selectedPet?.birthDate],
  );
  const birthText = useMemo(() => formatYmdToDots(birthYmd), [birthYmd]);

  const ageText = useMemo(() => {
    const age = calcAgeFromBirth(birthYmd);
    return age === null ? null : `${age}살`;
  }, [birthYmd]);

  const genderText = useMemo(
    () => formatGender(selectedPet?.gender ?? null),
    [selectedPet?.gender],
  );

  const weightText = useMemo(
    () => formatWeightKg(selectedPet?.weightKg ?? null),
    [selectedPet?.weightKg],
  );

  const topMetaLine = useMemo(() => {
    const parts: string[] = [];
    if (breed) parts.push(breed);
    if (ageText) parts.push(ageText);
    if (genderText) parts.push(genderText);
    if (weightText) parts.push(weightText);
    if (parts.length === 0) return null;
    return parts.join(' | ');
  }, [breed, ageText, genderText, weightText]);

  const togetherDays = useMemo(
    () => calcDaysSinceAdoption(selectedPet?.adoptionDate ?? null),
    [selectedPet?.adoptionDate],
  );

  const hobbies = useMemo(
    () => clampList(selectedPet?.hobbies, 2),
    [selectedPet?.hobbies],
  );
  const likes = useMemo(
    () => clampList(selectedPet?.likes, 2),
    [selectedPet?.likes],
  );
  const dislikes = useMemo(
    () => clampList(selectedPet?.dislikes, 2),
    [selectedPet?.dislikes],
  );

  const tags = useMemo(() => {
    const arr = Array.isArray(selectedPet?.tags)
      ? (selectedPet?.tags as string[])
      : [];
    const normalized = arr
      .map(t => (t ?? '').trim())
      .filter(Boolean)
      .slice(0, 10);
    if (normalized.length > 0) return normalized;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [selectedPet?.tags]);

  const selectedAvatarUri = useMemo(
    () => selectedPet?.avatarUrl ?? null,
    [selectedPet?.avatarUrl],
  );

  // ---------------------------------------------------------
  // 6) header text
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

  const onPressRecentMore = useCallback(() => {
    if (!recentExpanded) {
      setRecentExpanded(true);
      return;
    }
    if (hasMoreAfterExpanded) {
      onPressTimeline();
      return;
    }
  }, [recentExpanded, hasMoreAfterExpanded, onPressTimeline]);

  // ---------------------------------------------------------
  // 8) Accordion state (✅ pet 변경 시 초기화)
  // ---------------------------------------------------------
  const [acc, setAcc] = useState<Record<AccordionKey, boolean>>({
    hobby: false,
    like: false,
    dislike: false,
    tag: false,
  });

  useEffect(() => {
    setAcc({ hobby: false, like: false, dislike: false, tag: false });
  }, [activePetId]);

  const allExpanded = useMemo(() => {
    return acc.hobby && acc.like && acc.dislike && acc.tag;
  }, [acc.hobby, acc.like, acc.dislike, acc.tag]);

  const onToggleAll = useCallback(() => {
    setAcc(prev => {
      const next = !(prev.hobby && prev.like && prev.dislike && prev.tag);
      return { hobby: next, like: next, dislike: next, tag: next };
    });
  }, []);

  const onToggleOne = useCallback((key: AccordionKey) => {
    setAcc(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ---------------------------------------------------------
  // 9) render
  // ---------------------------------------------------------
  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------
         * 1) 상단 헤더 (텍스트 + 우측 아이콘 자리)
         * -------------------------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextArea}>
              <Text style={styles.title}>{greetingTitle}</Text>
              <Text style={styles.subTitle}>{greetingSubTitle}</Text>
            </View>

            <View style={styles.headerIcons}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.headerIconBtn}
                onPress={() => {
                  // TODO: 검색 연결
                }}
              >
                <Text style={styles.headerIconText}>⌕</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.headerIconBtn}
                onPress={() => {
                  // TODO: 알림 연결
                }}
              >
                <Text style={styles.headerIconText}>🔔</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 멀티펫 스위처 */}
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

        {/* ---------------------------------------------------------
         * 2) 전환 컨텐츠 (fade + lift)
         * -------------------------------------------------------- */}
        <Animated.View style={animatedContentStyle}>
          {/* HERO (프로필 카드) */}
          <View style={styles.heroCard}>
            {/* 우상단 설정 버튼(일단 UI만) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroGearBtn}
              onPress={() => {
                // TODO: PetEdit/Settings 라우트 연결 (다음 챕터)
              }}
            >
              <Text style={styles.heroGearText}>⚙︎</Text>
            </TouchableOpacity>

            <View style={styles.heroCenter}>
              <View style={styles.heroAvatarOuter}>
                <View style={styles.heroAvatarGlow} />
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

              <Text style={styles.heroName} numberOfLines={1}>
                {petName}
              </Text>

              {topMetaLine ? (
                <Text style={styles.heroMetaLine} numberOfLines={1}>
                  {topMetaLine}
                </Text>
              ) : (
                <Text style={styles.heroMetaMuted} numberOfLines={1}>
                  아이 정보를 채우면 더 예쁘게 보여요
                </Text>
              )}

              {birthText ? (
                <Text style={styles.heroBirthText} numberOfLines={1}>
                  생년월일 {birthText}
                </Text>
              ) : null}

              {togetherDays !== null ? (
                <View style={styles.heroTogetherPill}>
                  <Text style={styles.heroTogetherText}>
                    ♥ 함께한 시간{' '}
                    <Text style={styles.heroTogetherStrong}>
                      {togetherDays}
                    </Text>{' '}
                    일 ♥
                  </Text>
                </View>
              ) : null}
            </View>

            {/* 아코디언 */}
            <View style={styles.accordionWrap}>
              {/* 모두 펼치기 */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.accordionAllRow}
                onPress={onToggleAll}
              >
                <Text style={styles.accordionAllLabel}>모두펼치기</Text>
                <Text style={styles.accordionAllIcon}>
                  {allExpanded ? '＾' : '˅'}
                </Text>
              </TouchableOpacity>

              {/* 취미 */}
              <View style={styles.accordionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('hobby')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCircleBlue,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>🐾</Text>
                    </View>
                    <Text style={styles.accordionTitle}>취미</Text>
                  </View>
                  <Text style={styles.accordionChevron}>
                    {acc.hobby ? '＾' : '˅'}
                  </Text>
                </TouchableOpacity>

                {acc.hobby ? (
                  <View style={styles.accordionBody}>
                    {hobbies.length > 0 ? (
                      hobbies.map(v => (
                        <Text key={v} style={styles.accordionBullet}>
                          • {v}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.accordionEmpty}>• 아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              {/* 좋아하는 것 */}
              <View style={styles.accordionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('like')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCircleOrange,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>💛</Text>
                    </View>
                    <Text style={styles.accordionTitle}>좋아하는 것</Text>
                  </View>
                  <Text style={styles.accordionChevron}>
                    {acc.like ? '＾' : '˅'}
                  </Text>
                </TouchableOpacity>

                {acc.like ? (
                  <View style={styles.accordionBody}>
                    {likes.length > 0 ? (
                      likes.map(v => (
                        <Text key={v} style={styles.accordionBullet}>
                          • {v}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.accordionEmpty}>• 아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              {/* 싫어하는 것 */}
              <View style={styles.accordionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('dislike')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCirclePink,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>💔</Text>
                    </View>
                    <Text style={styles.accordionTitle}>싫어하는 것</Text>
                  </View>
                  <Text style={styles.accordionChevron}>
                    {acc.dislike ? '＾' : '˅'}
                  </Text>
                </TouchableOpacity>

                {acc.dislike ? (
                  <View style={styles.accordionBody}>
                    {dislikes.length > 0 ? (
                      dislikes.map(v => (
                        <Text key={v} style={styles.accordionBullet}>
                          • {v}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.accordionEmpty}>• 아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              {/* 태그 */}
              <View style={[styles.accordionItem, { borderBottomWidth: 0 }]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('tag')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCirclePurple,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>#</Text>
                    </View>
                    <Text style={styles.accordionTitle}>#태그</Text>
                  </View>
                  <Text style={styles.accordionChevron}>
                    {acc.tag ? '＾' : '˅'}
                  </Text>
                </TouchableOpacity>

                {acc.tag ? (
                  <View style={styles.accordionBody}>
                    <View style={styles.tagsRow}>
                      {tags.map(t => (
                        <View key={t} style={styles.tagChip}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {/* 오늘의 메시지 (스크린샷 톤: soft border + subtle shadow) */}
            <View style={styles.heroMessageBox}>
              <View style={styles.heroMessageIcon}>
                <Text style={styles.heroMessageIconText}>🌙</Text>
              </View>
              <Text style={styles.heroMessageText}>{todayMessage}</Text>
            </View>
          </View>

          {/* 섹션 시작 */}
          <View style={styles.sectionLead}>
            <Text style={styles.sectionLeadTitle}>
              {petName}와의 소중한 기록
            </Text>
            <Text style={styles.sectionLeadSub}>
              오늘도 행복한 추억이 쌓이고 있어요
            </Text>
          </View>

          {/* 오늘날의 사진 (전체보기) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>오늘날의 사진</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={onPressTimeline}>
                <Text style={styles.sectionLink}>전체보기</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
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

              {/* ✅ 보라 tint 오버레이 */}
              <View style={styles.photoOverlayTint} />

              {/* 하단 텍스트 */}
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

          {/* 최근 기록 */}
          <View style={styles.section}>
            <View style={styles.recentHeaderRow}>
              <Text style={styles.sectionTitle}>최근 기록</Text>

              {showMoreBtn ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onPressRecentMore}
                >
                  <Text style={styles.moreBtnText}>{moreBtnLabel}</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
            </View>

            {recentItems.length === 0 ? (
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
              <View style={styles.recentList}>
                {recentItems.map(item => {
                  const ymd = getRecordYmdDots(item);
                  const title = item.title?.trim() ? item.title : '제목 없음';
                  const content = toSnippet(item.content, 46);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.92}
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
                        <View style={styles.recentThumbTint} />
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
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
