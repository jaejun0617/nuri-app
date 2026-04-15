// 파일: src/screens/Main/components/GuestHome/GuestHome.tsx
// 파일 목적:
// - 게스트 홈에서 로그인 메인 홈과 동일한 시각 언어를 유지한 프리뷰를 렌더링한다.
// 어디서 쓰이는지:
// - MainScreen에서 비로그인 상태일 때 사용된다.
// 핵심 역할:
// - 메인 홈의 실제 typography, spacing, card system을 재사용하면서, 모든 CTA는 SignIn으로 수렴시킨다.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Screen from '../../../../components/layout/Screen';
import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import { buildPetThemePalette } from '../../../../services/pets/themePalette';
import { styles } from '../LoggedInHome/LoggedInHome.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ProfileAccordionKey = 'hobby' | 'like' | 'dislike' | 'tag';

const HERO_IMAGE = require('../../../../assets/home/home.png');

const QUICK_ACTIONS = [
  { key: 'walk', label: '산책', note: '기록하기', icon: 'walk' },
  {
    key: 'meal',
    label: '식사',
    note: '기록하기',
    icon: 'silverware-fork-knife',
  },
  { key: 'grooming', label: '미용', note: '기록하기', icon: 'content-cut' },
] as const;

const HOBBIES = ['공원 산책', '사진 찍기'] as const;
const LIKES = ['포근한 담요', '연어 토핑'] as const;
const DISLIKES = ['큰 소리', '오래 기다리기'] as const;
const TAGS = ['#산책좋아', '#사진기록', '#다정한하루'] as const;

const GUIDE_PREVIEW = [
  {
    key: 'guide-1',
    eyebrow: '오늘의 팁',
    title: '비 오는 날에도 리듬을 잃지 않는 산책 루틴',
    description:
      '짧은 실내 놀이와 메모만으로도 하루의 흐름을 부드럽게 이어갈 수 있어요.',
    icon: 'cloud-drizzle',
  },
  {
    key: 'guide-2',
    eyebrow: '기록 팁',
    title: '식사와 급수량을 함께 남기면 작은 변화를 더 빨리 볼 수 있어요',
    description:
      '생활 기록은 쌓일수록 우리 아이의 컨디션 흐름을 읽기 쉬워집니다.',
    icon: 'droplet',
  },
] as const;

const SCHEDULE_PREVIEW = [
  {
    key: 'schedule-1',
    dateLabel: '이번 주 루틴',
    title: '저녁 산책과 발 케어',
    subtitle: '산책 후 간단한 발 닦기와 컨디션 메모를 함께 남겨요.',
    icon: 'activity',
  },
  {
    key: 'schedule-2',
    dateLabel: '다가오는 일정',
    title: '다음 주 건강 체크',
    subtitle: '병원 방문 전후 상태를 메모로 이어서 남길 수 있어요.',
    icon: 'calendar',
  },
] as const;

const RECENT_ACTIVITY_PREVIEW = [
  {
    key: 'activity-1',
    title: '산책 기록',
    subtitle: '따뜻한 햇살 아래 32분 산책',
    timeLabel: '2시간 전',
    icon: 'activity',
  },
  {
    key: 'activity-2',
    title: '식사 기록',
    subtitle: '연어 토핑과 함께 저녁 식사',
    timeLabel: '어제',
    icon: 'coffee',
  },
  {
    key: 'activity-3',
    title: '미용 기록',
    subtitle: '발톱 정리와 귀 청소 완료',
    timeLabel: '3일 전',
    icon: 'scissors',
  },
] as const;

const MONTHLY_DIARY_PREVIEW = [
  {
    key: 'diary-1',
    title: '봄 햇살 아래 산책',
    meta: '2026.03.05',
  },
  {
    key: 'diary-2',
    title: '창가에서 낮잠',
    meta: '2026.03.12',
  },
  {
    key: 'diary-3',
    title: '비 오는 날의 노즈워크',
    meta: '2026.03.21',
  },
] as const;

export default function GuestHome() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const petTheme = useMemo(() => buildPetThemePalette('#6D7CFF'), []);
  const [acc, setAcc] = useState<Record<ProfileAccordionKey, boolean>>({
    hobby: false,
    like: false,
    dislike: false,
    tag: true,
  });

  const allExpanded = acc.hobby && acc.like && acc.dislike && acc.tag;

  const goSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  const toggleAll = useCallback(() => {
    const next = !allExpanded;
    setAcc({
      hobby: next,
      like: next,
      dislike: next,
      tag: next,
    });
  }, [allExpanded]);

  const toggleOne = useCallback((key: ProfileAccordionKey) => {
    setAcc(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(132, insets.bottom + 108) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextArea}>
              <Text style={[styles.title, { color: petTheme.primary }]}>
                반가워요!
              </Text>
              <Text style={styles.subTitle}>
                로그인하면 메인 홈에서 기록, 일정, 추천 팁이 더 자연스럽게
                이어집니다
              </Text>
            </View>

            <View style={styles.headerIcons}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.headerIconBtn}
                onPress={goSignIn}
              >
                <Feather name="search" size={18} color="rgba(11,18,32,0.75)" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.headerIconBtn}
                onPress={goSignIn}
              >
                <Feather name="bell" size={18} color="rgba(11,18,32,0.75)" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.petSwitcherRow}>
            {['guest-pet-1'].map((key, index) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.85}
                style={[
                  styles.petChip,
                  index === 0
                    ? [
                        styles.petChipActive,
                        {
                          borderColor: petTheme.primary,
                          shadowColor: petTheme.primary,
                        },
                      ]
                    : null,
                ]}
                onPress={goSignIn}
              >
                <Image source={HERO_IMAGE} style={styles.petChipImage} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.petAddChip}
              onPress={goSignIn}
            >
              <Feather name="plus" size={20} color={petTheme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.heroGearBtn}
            onPress={goSignIn}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={22}
              color={petTheme.deep}
            />
          </TouchableOpacity>

          <View style={styles.heroCenter}>
            <View style={styles.heroAvatarOuter}>
              <View
                style={[
                  styles.heroAvatarGlow,
                  {
                    backgroundColor: petTheme.glow,
                    shadowColor: petTheme.primary,
                  },
                ]}
              />
              <LinearGradient
                colors={petTheme.ringGradient}
                locations={[0, 0.55, 1]}
                start={{ x: 0.18, y: 0.12 }}
                end={{ x: 0.82, y: 0.9 }}
                style={[
                  styles.heroAvatarRing,
                  { shadowColor: petTheme.primary },
                ]}
              >
                <View style={styles.heroAvatarRingInner}>
                  <View style={styles.heroAvatarWrap}>
                    <Image source={HERO_IMAGE} style={styles.heroAvatarImg} />
                  </View>
                </View>
              </LinearGradient>
            </View>

            <Text style={[styles.heroName, { color: petTheme.deep }]}>
              우리 아이의 첫 홈
            </Text>
            <Text style={styles.heroMetaLine}>
              함께한 모든 순간이, 오래도록 기억이 되도록
            </Text>

            <View
              style={[
                styles.heroTogetherPill,
                {
                  backgroundColor: petTheme.deep,
                  marginTop: 18,
                },
              ]}
            >
              <View style={styles.heroTogetherRow}>
                <Text style={styles.heroTogetherHeart}>
                  {petTheme.heartEmoji}
                </Text>
                <Text
                  style={[styles.heroTogetherText, { color: petTheme.onDeep }]}
                >
                  함께한 시간을 차곡차곡 남겨보세요
                </Text>
                <Text style={styles.heroTogetherHeart}>
                  {petTheme.heartEmoji}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={goSignIn}
              style={{
                marginTop: 14,
                minHeight: 46,
                paddingHorizontal: 22,
                paddingVertical: 12,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: petTheme.primary,
                shadowColor: petTheme.primary,
                shadowOpacity: 0.16,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  fontWeight: '900',
                  color: petTheme.onPrimary,
                }}
              >
                로그인하고 시작하기
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accordionWrap}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.accordionAllRow}
              onPress={toggleAll}
            >
              <Text
                style={[styles.accordionAllLabel, { color: petTheme.primary }]}
              >
                모두펼치기
              </Text>
              <Feather
                name={allExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={petTheme.primary}
              />
            </TouchableOpacity>

            <View style={styles.accordionItem}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.accordionHeaderRow}
                onPress={() => toggleOne('hobby')}
              >
                <View style={styles.accordionLeft}>
                  <View
                    style={[styles.accordionIconCircle, styles.iconCircleBlue]}
                  >
                    <Text style={styles.accordionIconText}>🐾</Text>
                  </View>
                  <Text style={[styles.accordionTitle, styles.accTitleBlue]}>
                    취미
                  </Text>
                </View>
                <Feather
                  name={acc.hobby ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={petTheme.primary}
                />
              </TouchableOpacity>
              {acc.hobby ? (
                <View style={styles.accordionBody}>
                  {HOBBIES.map(item => (
                    <Text key={item} style={styles.accordionBullet}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.accordionItem}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.accordionHeaderRow}
                onPress={() => toggleOne('like')}
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
                  <Text style={[styles.accordionTitle, styles.accTitleOrange]}>
                    좋아하는 것
                  </Text>
                </View>
                <Feather
                  name={acc.like ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={petTheme.primary}
                />
              </TouchableOpacity>
              {acc.like ? (
                <View style={styles.accordionBody}>
                  {LIKES.map(item => (
                    <Text key={item} style={styles.accordionBullet}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.accordionItem}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.accordionHeaderRow}
                onPress={() => toggleOne('dislike')}
              >
                <View style={styles.accordionLeft}>
                  <View
                    style={[styles.accordionIconCircle, styles.iconCirclePink]}
                  >
                    <Text style={styles.accordionIconText}>💔</Text>
                  </View>
                  <Text style={[styles.accordionTitle, styles.accTitlePink]}>
                    싫어하는 것
                  </Text>
                </View>
                <Feather
                  name={acc.dislike ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={petTheme.primary}
                />
              </TouchableOpacity>
              {acc.dislike ? (
                <View style={styles.accordionBody}>
                  {DISLIKES.map(item => (
                    <Text key={item} style={styles.accordionBullet}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={[styles.accordionItem, { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.accordionHeaderRow}
                onPress={() => toggleOne('tag')}
              >
                <View style={styles.accordionLeft}>
                  <View
                    style={[
                      styles.accordionIconCircle,
                      styles.iconCirclePurple,
                    ]}
                  >
                    <Feather name="hash" size={16} color={petTheme.primary} />
                  </View>
                  <Text style={[styles.accordionTitle, styles.accTitlePurple]}>
                    #태그
                  </Text>
                </View>
                <Feather
                  name={acc.tag ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={petTheme.primary}
                />
              </TouchableOpacity>
              {acc.tag ? (
                <View style={styles.accordionBody}>
                  <View style={styles.tagsRow}>
                    {TAGS.map(tag => (
                      <View
                        key={tag}
                        style={[
                          styles.tagChip,
                          {
                            borderColor: petTheme.border,
                            backgroundColor: petTheme.tint,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.tagText, { color: petTheme.deep }]}
                        >
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.heroMessageBox}>
            <View style={styles.heroMessageIcon}>
              <Text style={styles.heroMessageIconText}>✨</Text>
            </View>
            <Text style={styles.heroMessageText}>
              로그인하면 메인 홈에서 오늘의 기록과 루틴을 같은 톤으로 이어갈 수
              있어요.
            </Text>
            <View style={styles.heroMessageBottomShadow} />
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              gap: 14,
              paddingTop: 14,
              paddingBottom: 6,
            },
          ]}
        >
          <View style={styles.sectionHeaderCol}>
            <Text style={[styles.sectionTitle, { color: petTheme.deep }]}>
              자주 쓰는 기록
            </Text>
            <Text style={styles.sectionSubText}>
              산책 · 식사 · 미용 기록을 바로 열어보세요
            </Text>
          </View>

          <View style={styles.quickGridFrame}>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map(item => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.92}
                  style={styles.quickCard}
                  onPress={goSignIn}
                >
                  <View
                    style={[
                      styles.quickIconWrap,
                      { backgroundColor: petTheme.tint },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={petTheme.primary}
                      style={styles.quickIcon}
                    />
                  </View>
                  <Text style={styles.quickCardTitle}>{item.label}</Text>
                  <Text
                    style={[styles.quickCardNote, { color: petTheme.primary }]}
                  >
                    {item.note}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.sectionLead,
            {
              marginTop: 0,
              paddingTop: 5,
            },
          ]}
        >
          <Text style={[styles.sectionLeadTitle, { color: petTheme.deep }]}>
            오늘의 추억 둘러보기
          </Text>
          <Text style={styles.sectionLeadSub}>
            사진과 기록을 천천히 살펴보세요
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.photoCard}
          onPress={goSignIn}
        >
          <Image source={HERO_IMAGE} style={styles.photoImage} />
          <View style={styles.photoOverlayTint} />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoOverlayTitle}>
              따뜻한 햇살 아래 남긴 산책 장면
            </Text>
            <Text style={styles.photoOverlaySub}>
              메인 홈에서 사진과 한 줄 기록이 이런 톤으로 차분하게 이어집니다
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.tipSectionHeading}>
              <Text style={[styles.tipSectionTitle, { color: petTheme.deep }]}>
                우리 아이를 위한 추천 팁
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={goSignIn}>
              <Text style={[styles.sectionLink, { color: petTheme.primary }]}>
                더보기
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipList}>
            {GUIDE_PREVIEW.map(item => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.92}
                style={styles.tipCard}
                onPress={goSignIn}
              >
                <View style={styles.tipThumb}>
                  <View style={styles.tipThumbInner}>
                    <Feather
                      name={item.icon as never}
                      size={18}
                      color={petTheme.primary}
                    />
                  </View>
                </View>
                <View style={styles.tipContent}>
                  <Text
                    style={[styles.tipEyebrow, { color: petTheme.primary }]}
                  >
                    {item.eyebrow}
                  </Text>
                  <Text style={styles.tipTitle}>{item.title}</Text>
                  <Text style={styles.tipDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCol}>
              <Text style={[styles.sectionTitle, { color: petTheme.deep }]}>
                이번 주 일정
              </Text>
              <Text style={styles.sectionSubText}>
                중요한 루틴과 체크 포인트를 한 흐름으로 정리해요
              </Text>
            </View>
          </View>

          <View style={styles.scheduleList}>
            {SCHEDULE_PREVIEW.map(item => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.92}
                style={styles.scheduleCard}
                onPress={goSignIn}
              >
                <View
                  style={[
                    styles.scheduleDateBadge,
                    { backgroundColor: petTheme.tint },
                  ]}
                >
                  <Text style={styles.scheduleDateText}>{item.dateLabel}</Text>
                </View>
                <View style={styles.scheduleBody}>
                  <View
                    style={[
                      styles.scheduleIconWrap,
                      { backgroundColor: petTheme.tint },
                    ]}
                  >
                    <Feather
                      name={item.icon as never}
                      size={16}
                      color={petTheme.primary}
                    />
                  </View>
                  <View style={styles.scheduleTextCol}>
                    <Text style={styles.scheduleTitle}>{item.title}</Text>
                    <Text style={styles.scheduleSub}>{item.subtitle}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.tipSectionTitle, { color: petTheme.deep }]}>
              최근 활동
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={goSignIn}>
              <Text style={[styles.sectionLink, { color: petTheme.primary }]}>
                전체보기
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {RECENT_ACTIVITY_PREVIEW.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.92}
                style={styles.activityRow}
                onPress={goSignIn}
              >
                <View
                  style={[
                    styles.activityIconWrap,
                    {
                      backgroundColor:
                        index === 0 ? petTheme.tint : petTheme.soft,
                    },
                  ]}
                >
                  <Feather
                    name={item.icon as never}
                    size={16}
                    color={petTheme.primary}
                  />
                </View>
                <View style={styles.activityTextCol}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySub}>{item.subtitle}</Text>
                </View>
                <Text style={styles.activityTime}>{item.timeLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.tipSectionTitle, { color: petTheme.deep }]}>
              이번 달 누리 일기
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={goSignIn}>
              <Text style={[styles.sectionLink, { color: petTheme.primary }]}>
                더보기
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthDiaryList}
          >
            {MONTHLY_DIARY_PREVIEW.map(item => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.92}
                style={styles.monthDiaryCard}
                onPress={goSignIn}
              >
                <View style={styles.monthDiaryCover}>
                  <Image source={HERO_IMAGE} style={styles.monthDiaryImage} />
                </View>
                <Text style={styles.monthDiaryTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.monthDiaryMeta}>{item.meta}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </Screen>
  );
}
