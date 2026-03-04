import React, { useMemo } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../../../app/ui/AppText';
import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import { styles } from './GuestHome.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HERO_IMAGE = require('../../../../assets/home/home.png');

const PLACEHOLDER_IMAGES = [
  'https://placedog.net/480/480?id=12',
  'https://placedog.net/480/480?id=25',
  'https://placedog.net/480/480?id=31',
  'https://placedog.net/480/480?id=44',
  'https://placedog.net/480/480?id=58',
  'https://placedog.net/480/480?id=67',
];

const PET_SWITCHER_IMAGES = [
  PLACEHOLDER_IMAGES[0],
  PLACEHOLDER_IMAGES[1],
  PLACEHOLDER_IMAGES[2],
];

const SHORTCUTS = [
  { key: 'walk', label: '산책일지', icon: 'walk' },
  { key: 'health', label: '건강기록', icon: 'medical-bag' },
  { key: 'meal', label: '식사기록', icon: 'silverware-fork-knife' },
  { key: 'grooming', label: '미용기록', icon: 'content-cut' },
] as const;

const RECENT_ACTIVITIES = [
  {
    key: 'walk',
    title: '산책 기록',
    subtitle: '한강공원에서 바람 냄새 맡기',
    timeLabel: '2시간 전',
    icon: 'walk',
  },
  {
    key: 'meal',
    title: '식사 기록',
    subtitle: '연어 토핑과 함께 저녁 식사',
    timeLabel: '어제',
    icon: 'silverware-fork-knife',
  },
  {
    key: 'grooming',
    title: '미용 기록',
    subtitle: '발톱 정리와 귀 청소 완료',
    timeLabel: '3일 전',
    icon: 'content-cut',
  },
] as const;

const MONTHLY_DIARIES = [
  PLACEHOLDER_IMAGES[0],
  PLACEHOLDER_IMAGES[1],
  PLACEHOLDER_IMAGES[2],
];

const RECOMMENDED_TIPS = [
  {
    key: 'tip-1',
    eyebrow: '산책 루틴',
    title: '비 오는 날에도 가볍게 에너지 풀어주기',
    description: '실내 노즈워크와 짧은 복도 산책만으로도 하루 리듬을 지킬 수 있어요.',
    imageUri: PLACEHOLDER_IMAGES[3],
  },
  {
    key: 'tip-2',
    eyebrow: '식사 밸런스',
    title: '식사 시간과 급수량을 함께 기록해보세요',
    description: '작은 변화를 미리 볼 수 있어서 컨디션 흐름을 읽기 쉬워져요.',
    imageUri: PLACEHOLDER_IMAGES[4],
  },
] as const;

export default function GuestHome() {
  const navigation = useNavigation<Nav>();

  const goSignIn = useMemo(
    () => () => navigation.navigate('SignIn'),
    [navigation],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextArea}>
            <AppText preset="headline" style={styles.title}>
              반가워요!
            </AppText>
            <AppText preset="caption" style={styles.subTitle}>
              로그인하면 기록, 일정, 추억 카드가 홈 안에서 더 자연스럽게 이어집니다
            </AppText>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity activeOpacity={0.9} style={styles.headerIconBtn}>
              <Feather name="search" size={16} color="rgba(11,18,32,0.72)" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={styles.headerIconBtn}>
              <Feather name="bell" size={16} color="rgba(11,18,32,0.72)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.petSwitcherRow}>
          {PET_SWITCHER_IMAGES.map((uri, index) => (
            <TouchableOpacity
              key={uri}
              activeOpacity={0.9}
              style={[
                styles.petChip,
                index === 0 ? styles.petChipActive : null,
              ]}
              onPress={goSignIn}
            >
              <Image source={{ uri }} style={styles.petChipImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.petAddChip}
            onPress={goSignIn}
          >
            <AppText preset="headline" style={styles.petAddPlus}>
              +
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCenter}>
            <View style={styles.heroAvatarOuter}>
              <View style={styles.heroAvatarGlow} />
              <View style={styles.heroAvatarRing}>
                <View style={styles.heroAvatarRingInner}>
                  <View style={styles.heroAvatarWrap}>
                    <Image
                      source={HERO_IMAGE}
                      style={styles.heroAvatarImg}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </View>
            </View>

            <AppText preset="title2" style={styles.heroName}>
              우리 아이의 첫 홈
            </AppText>
            <AppText preset="body" style={styles.heroMetaLine}>
              로그인하면 반려동물 프로필과 기록 카드가 이 자리를 채우게 돼요
            </AppText>
            <AppText preset="caption" style={styles.heroMetaMuted}>
              기록 · 일정 · 일기 · 추천 팁을 한 번에 천천히 둘러볼 수 있어요
            </AppText>

            <View style={styles.heroTogetherPill}>
              <AppText preset="caption" style={styles.heroTogetherText}>
                함께한 시간을 차곡차곡 남겨보세요
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.primaryButton}
              onPress={goSignIn}
            >
              <AppText preset="body" style={styles.primaryButtonText}>
                로그인하고 시작하기
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppText preset="headline" style={styles.sectionTitle}>
              자주 쓰는 기록
            </AppText>
          </View>
          <AppText preset="caption" style={styles.sectionSubTitle}>
            산책, 식사, 건강, 미용처럼 자주 남기는 기록이 이 줄에 모이게 됩니다
          </AppText>

          <View style={styles.shortcutRow}>
            {SHORTCUTS.map(item => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={styles.shortcutItem}
                onPress={goSignIn}
              >
                <View style={styles.shortcutIconWrap}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color="#6D6AF8"
                  />
                </View>
                <AppText preset="caption" style={styles.shortcutLabel}>
                  {item.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppText preset="headline" style={styles.sectionTitle}>
              오늘의 추억 둘러보기
            </AppText>
          </View>
          <AppText preset="caption" style={styles.sectionSubTitle}>
            사진과 기억 카드가 홈에서 이런 톤으로 차분하게 쌓이게 됩니다
          </AppText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewRow}
          >
            {PLACEHOLDER_IMAGES.slice(0, 3).map(uri => (
              <TouchableOpacity
                key={uri}
                activeOpacity={0.92}
                style={styles.previewCard}
                onPress={goSignIn}
              >
                <Image
                  source={{ uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewOverlay} />
                <View style={styles.previewTextWrap}>
                  <AppText preset="caption" style={styles.previewEyebrow}>
                    오늘 꺼내보는 한 장
                  </AppText>
                  <AppText preset="body" style={styles.previewTitle}>
                    따뜻한 햇살 아래 남긴 산책 장면
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppText preset="headline" style={styles.sectionTitle}>
              누리를 위한 추천 팁
            </AppText>
          </View>
          <AppText preset="caption" style={styles.sectionSubTitle}>
            기록 패턴과 일상 흐름을 바탕으로 이런 카드가 이어질 예정입니다
          </AppText>

          <View style={styles.tipList}>
            {RECOMMENDED_TIPS.map(item => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.92}
                style={styles.tipCard}
                onPress={goSignIn}
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.tipThumb}
                  resizeMode="cover"
                />
                <View style={styles.tipContent}>
                  <AppText preset="caption" style={styles.tipEyebrow}>
                    {item.eyebrow}
                  </AppText>
                  <AppText preset="body" style={styles.tipTitle}>
                    {item.title}
                  </AppText>
                  <AppText preset="caption" style={styles.tipDescription}>
                    {item.description}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppText preset="headline" style={styles.sectionTitle}>
              최근 활동
            </AppText>
          </View>
          <AppText preset="caption" style={styles.sectionSubTitle}>
            최근에 남긴 기록과 움직임이 시간 흐름에 맞춰 이곳에 정리됩니다
          </AppText>

          <View style={styles.activityList}>
            {RECENT_ACTIVITIES.map(item => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={styles.activityCard}
                onPress={goSignIn}
              >
                <View style={styles.activityIconWrap}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color="#6D6AF8"
                  />
                </View>
                <View style={styles.activityTextCol}>
                  <AppText preset="body" style={styles.activityTitle}>
                    {item.title}
                  </AppText>
                  <AppText preset="caption" style={styles.activitySub}>
                    {item.subtitle}
                  </AppText>
                </View>
                <AppText preset="caption" style={styles.activityTime}>
                  {item.timeLabel}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppText preset="headline" style={styles.sectionTitle}>
              이번 달 누리 일기
            </AppText>
          </View>
          <AppText preset="caption" style={styles.sectionSubTitle}>
            일기장 카테고리 기록은 월별로 이렇게 모아보게 됩니다
          </AppText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.diaryRow}
          >
            {MONTHLY_DIARIES.map(uri => (
              <TouchableOpacity
                key={uri}
                activeOpacity={0.92}
                style={styles.diaryCard}
                onPress={goSignIn}
              >
                <Image
                  source={{ uri }}
                  style={styles.diaryThumb}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
