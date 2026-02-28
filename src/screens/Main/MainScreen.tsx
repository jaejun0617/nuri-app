// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - "홈" 메인 화면 (게스트/로그인/펫 등록 여부/멀티펫) UI 기준점
// - 현재 단계: UI 하드코딩 완성 + Zustand(auth/pets/selectedPetId) 연결 완료
// - 다음 단계:
//   1) Supabase 실데이터(pets/records) fetch
//   2) store.setPets()로 주입
//   3) selectedPetId 기반 멀티펫 스와이프/인디케이터 연결
//
// 구현 원칙:
// - 레이아웃 고정 + 상태에 따른 분기 렌더링
// - 닉네임: 로그인 + nickname 존재할 때만 "{nickname}님, 반가워요!"
// - 펫 미등록: placeholder(+) 유지 (작은 프로필도 +)
// - 파생 값(selectedPet/tags/d-day)은 화면에서 useMemo로만 계산

import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { styles } from './MainScreen.styles';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';

/* ---------------------------------------------------------
 * 1) 유틸 (KST 기준 D-Day 계산)
 * -------------------------------------------------------- */
function diffDaysFromKst(dateYmd: string) {
  // - YYYY-MM-DD만 지원
  // - 운영에서 엄밀히 하려면 date-fns-tz 붙이면 됨
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
  // - 파생은 화면(useMemo)에서 계산 (버그 방지)
  // ---------------------------------------------------------
  const status = useAuthStore(s => s.status);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const nicknameRaw = useAuthStore(s => s.profile.nickname);

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  // ---------------------------------------------------------
  // 3) 파생 상태 (안전하고 예측 가능한 방식)
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  const hasPets = pets.length > 0;

  const selectedPet = useMemo(() => {
    if (!hasPets) return null;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return pets.find(p => p.id === selectedPetId) ?? pets[0];
    }
    return pets[0];
  }, [hasPets, pets, selectedPetId]);

  // ---------------------------------------------------------
  // 4) 문구 정책
  // ---------------------------------------------------------
  const greetingTitle = useMemo(() => {
    // “로그인 상태 + 닉네임 존재”일 때만 개인화
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
  // 5) 태그/함께한시간 (오류 방지 버전)
  // ---------------------------------------------------------
  const tags = useMemo(() => {
    const petTags = selectedPet?.tags ?? [];
    if (petTags.length > 0) return petTags;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [selectedPet?.id, selectedPet?.tags]);

  const togetherDaysText = useMemo(() => {
    const adoptionDate = selectedPet?.adoptionDate ?? null;
    if (adoptionDate) {
      const days = diffDaysFromKst(adoptionDate);
      return `우리가 함께한 시간 · ${days}일째`;
    }
    return '우리가 함께한 시간';
  }, [selectedPet?.id, selectedPet?.adoptionDate]);

  // ---------------------------------------------------------
  // 6) 액션 핸들러 (다음 단계: 네비게이션/가드 라우팅 연결)
  // ---------------------------------------------------------
  const onPressSignIn = () => {
    // TODO:
    // - guest면 AuthLanding으로 이동
    // - logged_in이면 no-op
  };

  const onPressCreatePet = () => {
    // TODO:
    // - PetCreateScreen 이동
  };

  const onPressCreateRecord = () => {
    // TODO:
    // - RecordCreateScreen 이동
  };

  const onPressTimeline = () => {
    // TODO:
    // - TimelineScreen 이동
  };

  const onPressGuestbook = () => {
    // TODO:
    // - GuestbookScreen 이동
  };

  // ---------------------------------------------------------
  // 7) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* ------------------------------
          A) 컨텐츠 스크롤 영역
      ------------------------------ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------
            1) 헤더 (인사 + 미니 프로필)
            - 펫 없으면 placeholder(＋)
            - 펫 있으면 selectedPet avatarUrl
        --------------------------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.headerTextArea}>
            <Text style={styles.title}>{greetingTitle}</Text>
            <Text style={styles.subTitle}>{greetingSubTitle}</Text>
          </View>

          {hasPets && selectedPet?.avatarUrl ? (
            <Image
              source={{ uri: selectedPet.avatarUrl }}
              style={styles.smallProfile}
            />
          ) : (
            <View style={styles.smallProfilePlaceholder}>
              <Text style={styles.smallPlus}>＋</Text>
            </View>
          )}
        </View>

        {/* ---------------------------------------------------------
            2) 메인 카드 (등록/프로필 영역)
            - 핵심: 펫이 없으면 등록 CTA가 중심
        --------------------------------------------------------- */}
        <View style={styles.card}>
          <View style={styles.bigCircle}>
            <Text style={styles.bigPlus}>＋</Text>
          </View>

          <Text style={styles.cardHint}>
            {hasPets
              ? '아이 프로필을 확인해 보세요'
              : '아직 등록된 반려동물이 없어요'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryButton}
            onPress={isLoggedIn ? onPressCreatePet : onPressSignIn}
          >
            <Text style={styles.primaryButtonText}>
              {isLoggedIn ? '+ 반려등록 등록하기' : '로그인하고 시작하기'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------------------------------------------------------
            3) 함께한 시간 + 태그
        --------------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{togetherDaysText}</Text>

          <View style={styles.tagsRow}>
            {tags.map(t => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ---------------------------------------------------------
            4) 오늘의 메시지 (하드코딩)
            - 아침/점심/오후
            - 추후: 서버 고정 daily_recall + ai_message로 연결
        --------------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 메시지</Text>

          <View style={styles.messageCard}>
            <Text style={styles.messageTime}>아침</Text>
            <Text style={styles.messageText}>
              오늘도 천천히, 우리 페이스로 시작해요.
            </Text>
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageTime}>점심</Text>
            <Text style={styles.messageText}>
              밥 잘 챙겨 먹어요. 나는 늘 여기 있어요.
            </Text>
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageTime}>오후</Text>
            <Text style={styles.messageText}>
              잠깐 하늘 봐요. 오늘의 너도 충분히 잘했어요.
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------------------
            5) 오늘의 아이 사진 (같은 날 랜덤)
            - 지금은 placeholder
            - 추후: records 중 랜덤 1개(서버 고정) → Signed URL
        --------------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 아이 사진</Text>

          <View style={styles.todayPhotoCard}>
            <View style={styles.todayPhotoPlaceholder} />
            <Text style={styles.todayPhotoCaption}>
              혹시 기억하시나요? 그날의 우리
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------------------
            6) 기록하기 CTA
            - 추후: FAB로 고정 권장
        --------------------------------------------------------- */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.recordButton}
            onPress={onPressCreateRecord}
          >
            <Text style={styles.recordButtonText}>+ 기록하기</Text>
            <View style={styles.recordButtonIcons}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>🖼</Text>
              </View>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ---------------------------------------------------------
            7) 최근 기록 (하드코딩)
            - 추후: records 최신순 3~5개
            - 클릭 시: 모달보다 "상세 화면" 추천
        --------------------------------------------------------- */}
        <View style={styles.section}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>최근 기록</Text>
            <TouchableOpacity onPress={onPressTimeline} activeOpacity={0.8}>
              <Text style={styles.recentMore}>더보기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentRow}>
            <View style={styles.recentThumb} />
            <View style={styles.recentThumb} />
            <View style={styles.recentThumb} />
          </View>

          <View style={styles.recentMetaRow}>
            <Text style={styles.recentMeta}>#행복한 산책</Text>
            <Text style={styles.recentMeta}>#간식</Text>
          </View>
        </View>
      </ScrollView>

      {/* ------------------------------
          B) 하단 탭 (하드코딩)
          - 추후: BottomTabNavigator로 교체
      ------------------------------ */}
      <View style={styles.bottomTab}>
        <TouchableOpacity activeOpacity={0.8} style={styles.tabItem}>
          <Text style={styles.tabIcon}>⌂</Text>
          <Text style={styles.tabTextActive}>홈</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.tabItem}
          onPress={onPressTimeline}
        >
          <Text style={styles.tabIcon}>🐾</Text>
          <Text style={styles.tabText}>추억보기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.tabItem}
          onPress={onPressGuestbook}
        >
          <Text style={styles.tabIcon}>✉️</Text>
          <Text style={styles.tabText}>방명록</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={styles.tabItem}>
          <Text style={styles.tabIcon}>≡</Text>
          <Text style={styles.tabText}>더보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
