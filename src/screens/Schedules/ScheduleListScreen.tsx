// 파일: src/screens/Schedules/ScheduleListScreen.tsx
// 역할:
// - 선택된 반려동물 기준으로 전체 일정 목록을 조회하고 렌더링
// - 새로고침, 상세 이동, 생성 이동 등 일정 관리의 허브 역할을 담당
// - 빈 상태와 등록 상태를 분기해 홈 회귀나 신규 일정 작성 흐름을 자연스럽게 연결

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type {
  PetSchedule,
} from '../../services/supabase/schedules';
import {
  getScheduleColorPalette,
  mapScheduleIconName,
} from '../../services/schedules/presentation';
import { usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleListScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleList'>;
type Route = {
  key: string;
  name: 'ScheduleList';
  params?: { petId?: string };
};

function formatScheduleDate(schedule: PetSchedule) {
  const date = new Date(schedule.startsAt);
  if (Number.isNaN(date.getTime())) return '';

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const base = `${date.getMonth() + 1}.${date.getDate()} (${weekdays[date.getDay()]})`;

  if (schedule.allDay) return `${base} · 하루 종일`;

  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${base} · ${hour}:${minute}`;
}

export default function ScheduleListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const petId = useMemo(() => {
    const petIdFromParams = route.params?.petId ?? null;
    if (petIdFromParams) return petIdFromParams;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [pets, route.params?.petId, selectedPetId]);

  const bootstrap = useScheduleStore(s => s.bootstrap);
  const refresh = useScheduleStore(s => s.refresh);

  const petState = useScheduleStore(s =>
    petId ? s.byPetId[petId] ?? null : null,
  );
  const schedules = petState?.items ?? [];
  const status = petState?.status ?? 'idle';
  const refreshing = status === 'refreshing';

  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  const onRefresh = useCallback(() => {
    if (!petId) return;
    refresh(petId);
  }, [petId, refresh]);

  const onPressCreate = useCallback(() => {
    navigation.navigate('ScheduleCreate', { petId: petId ?? undefined });
  }, [navigation, petId]);

  const onPressHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
    });
  }, [navigation]);

  const onPressItem = useCallback(
    (scheduleId: string) => {
      navigation.navigate('ScheduleDetail', {
        petId: petId ?? undefined,
        scheduleId,
      });
    },
    [navigation, petId],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.headerSideBtn}
          onPress={onPressHome}
        >
          <AppText preset="body" style={styles.headerSideText}>
            홈으로
          </AppText>
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          일정 보기
        </AppText>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.headerCreateBtn}
          onPress={onPressCreate}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <AppText preset="caption" style={styles.headerCreateText}>
            일정 추가
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <AppText preset="headline" style={styles.heroTitle}>
            전체 일정
          </AppText>
          <AppText preset="caption" style={styles.heroSub}>
            오래 남겨둘 일정도 한 곳에서 차분히 확인해 보세요
          </AppText>
        </View>

        {schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={34}
              color="#6D6AF8"
            />
            <AppText preset="headline" style={styles.emptyTitle}>
              등록된 일정이 아직 없어요
            </AppText>
            <AppText preset="body" style={styles.emptyDesc}>
              병원, 미용, 산책 루틴을 먼저 저장해두면 홈에서 한 번에 볼 수 있어요.
            </AppText>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryBtn}
              onPress={onPressCreate}
            >
              <AppText preset="body" style={styles.primaryBtnText}>
                첫 일정 추가하기
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {schedules.map(schedule => {
              const color = getScheduleColorPalette(schedule.colorKey);
              return (
                <TouchableOpacity
                  key={schedule.id}
                  activeOpacity={0.92}
                  style={styles.card}
                  onPress={() => onPressItem(schedule.id)}
                >
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: color.bg },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={mapScheduleIconName(schedule.iconKey)}
                      size={19}
                      color={color.fg}
                    />
                  </View>

                  <View style={styles.cardTextCol}>
                    <AppText preset="body" style={styles.cardTitle}>
                      {schedule.title}
                    </AppText>
                    <AppText preset="caption" style={styles.cardMeta}>
                      {formatScheduleDate(schedule)}
                    </AppText>
                    {schedule.note?.trim() ? (
                      <AppText preset="caption" style={styles.cardNote}>
                        {schedule.note}
                      </AppText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
