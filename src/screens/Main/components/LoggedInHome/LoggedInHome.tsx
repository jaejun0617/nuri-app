// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 헤더: 닉네임 인사 + 멀티펫 썸네일 스위처(최대 4 + +버튼)
// - HERO CARD(✅ 1차: 프로필 카드 UI를 스샷 레이아웃으로 교체) + 오늘날의 사진 + 최근기록
//
// ✅ 이번 단계 범위(중요)
// - HERO(프로필 카드)만 "중앙 정렬 + 보라 pill + 생년월일 + 모두펼치기 + 아코디언"으로 완성
// - 오늘날의 사진/최근기록은 기존 그대로 유지
//
// ✅ 훅/스토어 안정성(중요)
// - recordStore 구독: byPetId[petId] 직접 구독(가장 단순/안전)
// - fallback은 동일 참조(FALLBACK_RECORDS_STATE)로 유지
// - activePetId 변경 시 recentExpanded/아코디언 상태 초기화
// - new architecture에서 snapshot 흔들림 방지: "없는 상태"는 매번 new로 만들지 않는다.

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
function getRecordYmd(item: MemoryRecord): string {
  return (item.occurredAt ?? item.createdAt.slice(0, 10)) as string;
}

function toSnippet(text: string | null | undefined, max = 46) {
  const v = (text ?? '').trim();
  if (!v) return '내용이 없습니다.';
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
}

function formatYmdToDots(ymd: string | null | undefined): string | null {
  const s = (ymd ?? '').trim();
  if (!s) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s.slice(0, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}`;
  }
  // YYYY.MM.DD 형태도 허용
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return s;
  return null;
}

function calcAgeFromBirth(birthYmd: string | null | undefined): number | null {
  const s = (birthYmd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!y || !m || !d) return null;

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

function clampList(list: string[] | null | undefined, max = 4) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map(s => (s ?? '').trim())
    .filter(Boolean)
    .slice(0, max);
}

/* ---------------------------------------------------------
 * 2) component
 * -------------------------------------------------------- */
// ✅ recordStore Chapter 5 상태머신 정합
type PetRecordsStateShape = {
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';
  items: MemoryRecord[];
  errorMessage: string | null;
  cursor: string | null;
  hasMore: boolean;
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

// HERO 아코디언 섹션 키
type AccordionKey = 'hobby' | 'like' | 'dislike' | 'tag';
const ACC_KEYS: AccordionKey[] = ['hobby', 'like', 'dislike', 'tag'];

// ✅ 동일 참조 초기값(불필요한 new 방지)
const INITIAL_ACCORDION: Record<AccordionKey, boolean> = Object.freeze({
  hobby: false,
  like: false,
  dislike: false,
  tag: false,
});

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
  // 3.5) transition animation (pet switch)
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
  // 4.1) 최근 기록 "더보기" 상태
  // - pet 변경 시 확장 상태 초기화
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
  // 5) HERO derived (✅ 스샷 레이아웃용)
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

  const metaLine = useMemo(() => {
    // 스샷 형태: "말티즈 | 15살 | 남아 | 4.3kg"
    const parts: string[] = [];
    if (breed) parts.push(breed);
    if (ageText) parts.push(ageText);
    if (genderText) parts.push(genderText);
    if (weightText) parts.push(weightText);
    if (parts.length === 0) return null;
    return parts.join('  |  ');
  }, [breed, ageText, genderText, weightText]);

  const togetherDays = useMemo(
    () => calcDaysSinceAdoption(selectedPet?.adoptionDate ?? null),
    [selectedPet?.adoptionDate],
  );

  const hobbies = useMemo(
    () => clampList(selectedPet?.hobbies, 6),
    [selectedPet?.hobbies],
  );
  const likes = useMemo(
    () => clampList(selectedPet?.likes, 6),
    [selectedPet?.likes],
  );
  const dislikes = useMemo(
    () => clampList(selectedPet?.dislikes, 6),
    [selectedPet?.dislikes],
  );

  const tags = useMemo(() => {
    const arr = Array.isArray(selectedPet?.tags)
      ? (selectedPet?.tags as string[])
      : [];
    const normalized = arr
      .map(t => (t ?? '').trim())
      .filter(Boolean)
      .slice(0, 12);
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
  // 6.5) HERO Accordion state (✅ 스샷: "모두 펼치기" + 개별 펼치기)
  // ---------------------------------------------------------
  const [accordion, setAccordion] =
    useState<Record<AccordionKey, boolean>>(INITIAL_ACCORDION);

  // pet 바뀌면 아코디언 상태 초기화 (UX + 상태 안정)
  useEffect(() => {
    setAccordion(INITIAL_ACCORDION);
  }, [activePetId]);

  const isAllOpen = useMemo(
    () => ACC_KEYS.every(k => accordion[k]),
    [accordion],
  );
  const anyOpen = useMemo(() => ACC_KEYS.some(k => accordion[k]), [accordion]);

  const onToggleAll = useCallback(() => {
    setAccordion(prev => {
      const nextOpen = !ACC_KEYS.every(k => prev[k]); // 모두 열려있으면 닫기, 아니면 열기
      // ✅ new object 생성은 1회로 제한
      return {
        hobby: nextOpen,
        like: nextOpen,
        dislike: nextOpen,
        tag: nextOpen,
      };
    });
  }, []);

  const onToggleOne = useCallback((key: AccordionKey) => {
    setAccordion(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  const onPressHeroSetting = useCallback(() => {
    // TODO: 다음 챕터에서 PetProfileEdit/Settings로 연결
    Alert.alert('준비중', '프로필 설정은 다음 단계에서 연결할게요.');
  }, []);

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
        {/* 1) 헤더 */}
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

        {/* 2) 전환 컨텐츠 */}
        <Animated.View style={animatedContentStyle}>
          {/* ---------------------------------------------------------
           * HERO (✅ 스샷 레이아웃)
           * -------------------------------------------------------- */}
          <View style={styles.heroCard}>
            {/* 설정 아이콘(우상단) */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.heroSettingBtn}
              onPress={onPressHeroSetting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.heroSettingIcon}>⚙︎</Text>
            </TouchableOpacity>

            {/* 큰 원형 아바타 */}
            <View style={styles.heroAvatarOuter}>
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

            {/* 이름 */}
            <Text style={styles.heroNameCentered} numberOfLines={1}>
              {petName}
            </Text>

            {/* 견종 | 나이 | 성별 | 몸무게 */}
            {metaLine ? (
              <Text style={styles.heroMetaLine} numberOfLines={1}>
                {metaLine}
              </Text>
            ) : (
              <Text style={styles.heroMetaMuted} numberOfLines={1}>
                아이 정보를 채우면 더 예쁘게 보여요
              </Text>
            )}

            {/* 생년월일 */}
            {birthText ? (
              <Text style={styles.heroBirthCentered} numberOfLines={1}>
                생년월일 {birthText}
              </Text>
            ) : null}

            {/* 함께한 시간 (보라 pill) */}
            {togetherDays !== null ? (
              <View style={styles.heroTogetherPillPurple}>
                <Text style={styles.heroTogetherPillText}>
                  ♥ 함께한 시간{' '}
                  <Text style={styles.heroTogetherPillStrong}>
                    {togetherDays}
                  </Text>{' '}
                  일 ♥
                </Text>
              </View>
            ) : null}

            {/* 모두 펼치기 (아코디언 전체 토글) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroExpandAllRow}
              onPress={onToggleAll}
            >
              <Text style={styles.heroExpandAllText}>
                {isAllOpen ? '모두 접기' : '모두 펼치기'}
              </Text>
              <Text
                style={[
                  styles.heroChevron,
                  isAllOpen || anyOpen ? styles.heroChevronOpen : null,
                ]}
              >
                ⌄
              </Text>
            </TouchableOpacity>

            {/* 아코디언 리스트 */}
            <View style={styles.heroAccordion}>
              {/* 취미 */}
              <View style={styles.heroAccItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.heroAccHeader}
                  onPress={() => onToggleOne('hobby')}
                >
                  <View
                    style={[
                      styles.heroAccIconCircle,
                      styles.heroAccIconCircleBlue,
                    ]}
                  >
                    <Text style={styles.heroAccIconText}>🐾</Text>
                  </View>
                  <Text style={[styles.heroAccTitle, styles.heroAccTitleBlue]}>
                    취미
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text
                    style={[
                      styles.heroAccChevron,
                      accordion.hobby ? styles.heroAccChevronOpen : null,
                    ]}
                  >
                    ⌄
                  </Text>
                </TouchableOpacity>

                {accordion.hobby ? (
                  <View style={styles.heroAccBody}>
                    {hobbies.length > 0 ? (
                      <View style={styles.heroAccChips}>
                        {hobbies.map(v => (
                          <View key={`h-${v}`} style={styles.heroAccChip}>
                            <Text style={styles.heroAccChipText}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.heroAccEmptyText}>아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              {/* 좋아하는 것 */}
              <View style={styles.heroAccItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.heroAccHeader}
                  onPress={() => onToggleOne('like')}
                >
                  <View
                    style={[
                      styles.heroAccIconCircle,
                      styles.heroAccIconCircleOrange,
                    ]}
                  >
                    <Text style={styles.heroAccIconText}>🧡</Text>
                  </View>
                  <Text
                    style={[styles.heroAccTitle, styles.heroAccTitleOrange]}
                  >
                    좋아하는 것
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text
                    style={[
                      styles.heroAccChevron,
                      accordion.like ? styles.heroAccChevronOpen : null,
                    ]}
                  >
                    ⌄
                  </Text>
                </TouchableOpacity>

                {accordion.like ? (
                  <View style={styles.heroAccBody}>
                    {likes.length > 0 ? (
                      <View style={styles.heroAccChips}>
                        {likes.map(v => (
                          <View key={`l-${v}`} style={styles.heroAccChip}>
                            <Text style={styles.heroAccChipText}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.heroAccEmptyText}>아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              {/* 싫어하는 것 */}
              <View style={styles.heroAccItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.heroAccHeader}
                  onPress={() => onToggleOne('dislike')}
                >
                  <View
                    style={[
                      styles.heroAccIconCircle,
                      styles.heroAccIconCirclePink,
                    ]}
                  >
                    <Text style={styles.heroAccIconText}>💗</Text>
                  </View>
                  <Text style={[styles.heroAccTitle, styles.heroAccTitlePink]}>
                    싫어하는 것
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text
                    style={[
                      styles.heroAccChevron,
                      accordion.dislike ? styles.heroAccChevronOpen : null,
                    ]}
                  >
                    ⌄
                  </Text>
                </TouchableOpacity>

                {accordion.dislike ? (
                  <View style={styles.heroAccBody}>
                    {dislikes.length > 0 ? (
                      <View style={styles.heroAccChips}>
                        {dislikes.map(v => (
                          <View key={`d-${v}`} style={styles.heroAccChip}>
                            <Text style={styles.heroAccChipText}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.heroAccEmptyText}>아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              {/* 태그 */}
              <View style={styles.heroAccItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.heroAccHeader}
                  onPress={() => onToggleOne('tag')}
                >
                  <View
                    style={[
                      styles.heroAccIconCircle,
                      styles.heroAccIconCirclePurple,
                    ]}
                  >
                    <Text style={styles.heroAccIconText}>#</Text>
                  </View>
                  <Text
                    style={[styles.heroAccTitle, styles.heroAccTitlePurple]}
                  >
                    #태그
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text
                    style={[
                      styles.heroAccChevron,
                      accordion.tag ? styles.heroAccChevronOpen : null,
                    ]}
                  >
                    ⌄
                  </Text>
                </TouchableOpacity>

                {accordion.tag ? (
                  <View style={styles.heroAccBody}>
                    <View style={styles.heroAccChips}>
                      {tags.map(t => (
                        <View key={`t-${t}`} style={styles.heroAccChip}>
                          <Text style={styles.heroAccChipText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {/* 하단 메시지 박스 */}
            <View style={styles.heroMessageBox}>
              <Text style={styles.heroMessageText}>{todayMessage}</Text>
            </View>
          </View>

          {/* ---------------------------------------------------------
           * 오늘날의 사진 (기존 유지)
           * -------------------------------------------------------- */}
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

          {/* ---------------------------------------------------------
           * 최근 기록 (기존 유지)
           * -------------------------------------------------------- */}
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
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
