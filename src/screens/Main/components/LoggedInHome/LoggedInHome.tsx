// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 헤더: 닉네임 인사 + 멀티펫 썸네일 스위처(최대 4 + +버튼)
// - HERO CARD + 오늘날의 사진 + 최근기록
//
// ✅ 최근기록 UX(최종)
// - 기본: 최신 7개만 노출
// - 조건: records가 8개 초과(= 9개 이상)면 우측에 더보기 버튼 노출
// - 동작:
//   1차 클릭: 7개 더 보여줌(총 14개)
//   2차 클릭(아직 더 남아있으면): 타임라인으로 이동
// - 기록이 있을 때: ✅ 하단 “기록하기” 버튼 제거(탭과 중복 제거)
// - 기록이 없을 때: ✅ Empty 카드 + CTA 1개 유지(첫 전환용)
//
// ✅ 훅/스토어 안정성(중요)
// - recordStore 구독: byPetId[petId] 직접 구독(가장 단순/안전)
// - fallback은 동일 참조(FALLBACK_RECORDS_STATE)로 유지
// - activePetId 변경 시 recentExpanded 초기화
// - new architecture에서 snapshot 흔들림 방지: "없는 상태"는 매번 new로 만들지 않는다.

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return `${s.slice(0, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}`;
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

function clampList(list: string[] | null | undefined, max = 2) {
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
  // 3.5) transition animation
  // ---------------------------------------------------------
  const [switching, setSwitching] = useState(false);

  const OUT_OPACITY = 0.9;
  const OUT_LIFT_PX = 6; // ✅ UX: 0.1px는 체감 없음 → 정상 수치로 복구

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
  // 조건: records가 8개 초과(= 9개 이상)일 때만 버튼 노출
  const showMoreBtn = useMemo(
    () => safeRecordsState.items.length > RECENT_BASE + 1,
    [safeRecordsState.items.length],
  );

  // 1차 클릭: 14개 노출, 그 외: 7개 노출
  const visibleRecentCount = useMemo(
    () => (recentExpanded ? RECENT_EXPANDED : RECENT_BASE),
    [recentExpanded],
  );

  const recentItems = useMemo(
    () => safeRecordsState.items.slice(0, visibleRecentCount),
    [safeRecordsState.items, visibleRecentCount],
  );

  // 2차 클릭 시 타임라인 이동 조건: 14개 이후에도 남아있을 때
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
      .slice(0, 8);
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
    // 1차: 확장(14개)
    if (!recentExpanded) {
      setRecentExpanded(true);
      return;
    }

    // 2차: 아직 더 남아있으면 타임라인 이동
    if (hasMoreAfterExpanded) {
      onPressTimeline();
      return;
    }

    // 남은 게 없으면 아무 동작 없음
  }, [recentExpanded, hasMoreAfterExpanded, onPressTimeline]);

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
          {/* HERO */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {petName}
                </Text>

                {topMetaLine ? (
                  <Text style={styles.heroTopMeta} numberOfLines={1}>
                    {topMetaLine}
                  </Text>
                ) : (
                  <Text style={styles.heroTopMetaMuted} numberOfLines={1}>
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

            <View style={styles.heroLine} />

            <View style={styles.heroThreeCol}>
              <View style={styles.heroCol}>
                <View style={styles.heroColHeader}>
                  <Text style={styles.heroColTitle}>🐾 취미</Text>
                </View>
                {hobbies.length > 0 ? (
                  hobbies.map(v => (
                    <Text key={v} style={styles.heroBullet} numberOfLines={1}>
                      • {v}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.heroBulletMuted}>• 아직 없어요</Text>
                )}
              </View>

              <View style={styles.heroColDivider} />

              <View style={styles.heroCol}>
                <View style={styles.heroColHeader}>
                  <Text style={styles.heroColTitle}>💛 좋아하는 것</Text>
                </View>
                {likes.length > 0 ? (
                  likes.map(v => (
                    <Text key={v} style={styles.heroBullet} numberOfLines={1}>
                      • {v}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.heroBulletMuted}>• 아직 없어요</Text>
                )}
              </View>

              <View style={styles.heroColDivider} />

              <View style={styles.heroCol}>
                <View style={styles.heroColHeader}>
                  <Text style={styles.heroColTitle}>💔 싫어하는 것</Text>
                </View>
                {dislikes.length > 0 ? (
                  dislikes.map(v => (
                    <Text key={v} style={styles.heroBullet} numberOfLines={1}>
                      • {v}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.heroBulletMuted}>• 아직 없어요</Text>
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

            <View style={styles.heroMessageBox}>
              <Text style={styles.heroMessageLabel}>오늘의 메시지</Text>
              <Text style={styles.heroMessageText}>{todayMessage}</Text>
            </View>
          </View>

          {/* 오늘날의 사진 */}
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

                {/* ✅ Empty에서만 CTA 1개 유지 */}
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
