import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import ExpandableBodyText from '../../components/common/ExpandableBodyText';
import Screen from '../../components/layout/Screen';
import NativeLiteMapPreview from '../../components/maps/NativeLiteMapPreview';
import { usePetTravelUserLayer } from '../../hooks/usePetTravelUserLayer';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getPetTravelPlaceTypeLabel } from '../../services/petTravel/catalog';
import { fetchPetTravelDetail } from '../../services/petTravel/api';
import type { PetTravelDetail, PetTravelItem } from '../../services/petTravel/types';
import type { PublicTrustTone } from '../../services/trust/publicTrust';
import { getPetTravelOwnReportLabel } from '../../services/trust/userLayerLabels';
import { requestMapViewportRestore } from '../../store/mapViewportStore';
import { styles } from './PetTravel.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatLayerLabel(layer: 'candidate' | 'trust' | 'user'): string {
  switch (layer) {
    case 'trust':
      return '검수';
    case 'user':
      return '사용자';
    case 'candidate':
    default:
      return '후보';
  }
}

function getConfidenceBadgeStyle(tone: PublicTrustTone) {
  switch (tone) {
    case 'positive':
      return styles.petStatusBadgeConfirmed;
    case 'critical':
      return styles.petStatusBadgeCritical;
    case 'caution':
      return styles.petStatusBadgeCautious;
    case 'neutral':
    default:
      return styles.petStatusBadgeNeutral;
  }
}

function getConfidenceBadgeTextStyle(tone: PublicTrustTone) {
  switch (tone) {
    case 'positive':
      return styles.petStatusBadgeTextConfirmed;
    case 'critical':
      return styles.petStatusBadgeTextCritical;
    case 'caution':
      return styles.petStatusBadgeTextCautious;
    case 'neutral':
    default:
      return styles.petStatusBadgeTextNeutral;
  }
}

export default function PetTravelDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = route.params as { item?: PetTravelItem } | undefined;
  const item = params?.item;
  const [detail, setDetail] = useState<PetTravelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const travelUserLayer = usePetTravelUserLayer();

  const goBack = useCallback(() => {
    requestMapViewportRestore('pet-travel');
    navigation.goBack();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          goBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [goBack]),
  );

  const targetItem = detail ?? item;

  const loadDetail = useCallback(async () => {
    if (!item) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const nextDetail = await fetchPetTravelDetail({ item });
      setDetail(nextDetail);
    } catch (error) {
      setDetail(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '여행 상세 정보를 불러오지 못했어요.',
      );
    } finally {
      setLoading(false);
    }
  }, [item]);

  useEffect(() => {
    loadDetail().catch(() => {});
  }, [loadDetail]);
  const onPressOpenExternalMap = useCallback(async () => {
    if (!targetItem) {
      return;
    }

    try {
      const deepLink = targetItem.kakaoMapUrl;
      const webUrl = targetItem.kakaoMapWebUrl;
      if (!deepLink || !webUrl) return;

      const supported = await Linking.canOpenURL(deepLink);
      await Linking.openURL(supported ? deepLink : webUrl);
    } catch {
      if (targetItem.kakaoMapWebUrl) {
        Linking.openURL(targetItem.kakaoMapWebUrl).catch(() => {});
      }
    }
  }, [targetItem]);

  if (!targetItem) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSideSlot}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.backButton}
                onPress={goBack}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Feather name="arrow-left" size={20} color="#102033" />
              </TouchableOpacity>
            </View>
            <AppText preset="headline" style={styles.headerTitle}>
              여행 상세
            </AppText>
            <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
          </View>
          <View style={styles.emptyCard}>
            <AppText preset="headline" style={styles.emptyTitle}>
              여행 정보를 찾을 수 없어요
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

  const confidenceStyle = getConfidenceBadgeStyle(targetItem.publicTrust.tone);
  const confidenceTextStyle = getConfidenceBadgeTextStyle(
    targetItem.publicTrust.tone,
  );
  const personalRecord = targetItem.userLayer.targetId
    ? travelUserLayer.records.get(targetItem.userLayer.targetId) ?? null
    : null;
  const personalReportLabel = getPetTravelOwnReportLabel(
    personalRecord?.ownReportType,
  );
  const onPressReport = () => {
    if (!travelUserLayer.isLoggedIn) {
      Alert.alert('로그인이 필요해요', '내 제보 상태는 로그인 후 개인화 정보로만 기록돼요.');
      return;
    }
    if (!targetItem.userLayer.targetId || !targetItem.userLayer.supportsReport) {
      Alert.alert(
        '아직 제보할 수 없어요',
        '이 여행 후보는 아직 개인 제보 대상과 연결되지 않았어요. 공개 라벨은 그대로 보수적으로 유지돼요.',
      );
      return;
    }

    Alert.alert(
      '내 제보 남기기',
      '이 제보는 개인 제보 원본으로 저장되며 공개 라벨을 직접 올리지 않아요.',
      [
        {
          text: '동반 가능',
          onPress: () => {
            setReportSaving(true);
            travelUserLayer
              .submitReport(targetItem.userLayer.targetId!, 'pet_allowed')
              .catch(error => {
                Alert.alert(
                  '제보를 저장하지 못했어요',
                  error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
                );
              })
              .finally(() => {
                setReportSaving(false);
              });
          },
        },
        {
          text: '제한/불가',
          onPress: () => {
            setReportSaving(true);
            travelUserLayer
              .submitReport(targetItem.userLayer.targetId!, 'pet_restricted')
              .catch(error => {
                Alert.alert(
                  '제보를 저장하지 못했어요',
                  error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
                );
              })
              .finally(() => {
                setReportSaving(false);
              });
          },
        },
        {
          text: '정보 변경',
          onPress: () => {
            setReportSaving(true);
            travelUserLayer
              .submitReport(targetItem.userLayer.targetId!, 'info_outdated')
              .catch(error => {
                Alert.alert(
                  '제보를 저장하지 못했어요',
                  error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
                );
              })
              .finally(() => {
                setReportSaving(false);
              });
          },
        },
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.backButton}
              onPress={goBack}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="arrow-left" size={20} color="#102033" />
            </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            여행 상세
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailScrollContent}
        >
          {errorMessage ? (
            <View style={styles.errorCard}>
              <AppText preset="headline" style={styles.errorTitle}>
                상세 정보를 모두 확인하지 못했어요
              </AppText>
              <AppText preset="body" style={styles.errorBody}>
                {errorMessage}
              </AppText>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.retryButton}
                onPress={() => {
                  loadDetail().catch(() => {});
                }}
              >
                <AppText preset="caption" style={styles.retryButtonText}>
                  다시 시도
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingCard}>
              <AppText preset="headline" style={styles.loadingTitle}>
                여행 상세 정보를 불러오는 중이에요
              </AppText>
              <AppText preset="body" style={styles.loadingBody}>
                한국관광공사 반려동물 동반여행 상세 응답을 확인하고 있어요.
              </AppText>
            </View>
          ) : null}

          <View style={styles.detailHero}>
            <AppText preset="caption" style={styles.detailCategory}>
              {targetItem.categoryLabel}
            </AppText>
            <AppText preset="headline" style={styles.detailTitle}>
              {targetItem.name}
            </AppText>
            <ExpandableBodyText
              text={targetItem.summary}
              textStyle={styles.detailSummary}
            />
            <View style={styles.badgeRow}>
              <View style={styles.neutralBadge}>
                <AppText preset="caption" style={styles.neutralBadgeText}>
                  {getPetTravelPlaceTypeLabel(targetItem.placeType)}
                </AppText>
              </View>
              <View
                style={[styles.petStatusBadge, confidenceStyle]}
              >
                <AppText
                  preset="caption"
                  style={[styles.petStatusBadgeText, confidenceTextStyle]}
                >
                  {targetItem.publicTrust.label}
                </AppText>
              </View>
            </View>

            <View style={styles.detailMetaGrid}>
              <View style={styles.detailMetaRow}>
                <Feather name="shield" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  공개 라벨: {targetItem.publicTrust.label}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="flag" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  출처: {targetItem.source.providerLabel}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="tag" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  분류: {targetItem.categoryLabel}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="map-pin" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {targetItem.address}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="phone" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {targetItem.phone ?? '전화 정보 확인 필요'}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="clock" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {targetItem.operatingHours ?? '운영 시간 현장 확인 필요'}
                </AppText>
              </View>
              {targetItem.source.sourceUpdatedAt ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="refresh-cw" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    TourAPI 기준 최근 수정: {targetItem.source.sourceUpdatedAt}
                  </AppText>
                </View>
              ) : null}
              {targetItem.publicTrust.basisDateLabel ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="calendar" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {targetItem.publicTrust.basisDateLabel}
                  </AppText>
                </View>
              ) : null}
              {detail?.restDate ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="calendar" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    휴무 / 예약 안내: {detail.restDate}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          {targetItem ? (
            <View style={styles.detailSectionCard}>
              <AppText preset="headline" style={styles.detailSectionTitle}>
                위치 미리보기
              </AppText>
              <NativeLiteMapPreview
                latitude={targetItem.latitude}
                longitude={targetItem.longitude}
                title={`${targetItem.name} 위치 미리보기`}
                overlayText="안드로이드 liteMode 네이티브 지도로 부드럽게 로드해요. 길찾기는 위 액션 버튼으로 열 수 있어요."
              />
            </View>
          ) : null}

          <View style={styles.detailSectionCard}>
            <AppText preset="headline" style={styles.detailSectionTitle}>
              공개 신뢰도 안내
            </AppText>
            <ExpandableBodyText
              text={targetItem.publicTrust.description}
              textStyle={styles.detailSectionBody}
            />
            <ExpandableBodyText
              text={targetItem.publicTrust.guidance}
              textStyle={styles.detailSectionBody}
            />
            <View style={styles.detailTrustMetaWrap}>
              <View style={styles.detailTrustMetaRow}>
                <AppText preset="caption" style={styles.detailTrustMetaLabel}>
                  판단 근거
                </AppText>
                <AppText preset="caption" style={styles.detailTrustMetaValue}>
                  {targetItem.publicTrust.sourceLabel}
                </AppText>
              </View>
              <View style={styles.detailTrustMetaRow}>
                <AppText preset="caption" style={styles.detailTrustMetaLabel}>
                  데이터 계층
                </AppText>
                <AppText preset="caption" style={styles.detailTrustMetaValue}>
                  {targetItem.publicTrust.layers.map(formatLayerLabel).join(' / ')}
                </AppText>
              </View>
              {targetItem.publicTrust.basisDateLabel ? (
                <View style={styles.detailTrustMetaRow}>
                  <AppText preset="caption" style={styles.detailTrustMetaLabel}>
                    기준일
                  </AppText>
                  <AppText preset="caption" style={styles.detailTrustMetaValue}>
                    {targetItem.publicTrust.basisDateLabel}
                  </AppText>
                </View>
              ) : null}
            </View>
            {targetItem.publicTrust.hasConflict ? (
              <AppText preset="caption" style={styles.detailTrustNotice}>
                외부 원본과 검수 정보가 다를 수 있어 가장 보수적인 라벨을 유지했어요.
              </AppText>
            ) : null}
            {targetItem.publicTrust.isStale ? (
              <AppText preset="caption" style={styles.detailTrustNotice}>
                기준일이 오래돼 최신 정책은 방문 전에 다시 확인하는 편이 안전해요.
              </AppText>
            ) : null}
          </View>

          <View style={styles.personalSectionCard}>
            <AppText preset="headline" style={styles.detailSectionTitle}>
              내 상태
            </AppText>
            <ExpandableBodyText
              text="내가 제보함은 개인 제보 원본이에요. 공개 라벨과 검수 반영 여부는 여기서 직접 올라가지 않아요."
              textStyle={styles.detailSectionBody}
            />
            {targetItem.userLayer.targetId ? (
              <>
                <View style={styles.personalBadgeRow}>
                  {personalRecord ? (
                    <View style={styles.personalBadge}>
                      <AppText preset="caption" style={styles.personalBadgeText}>
                        내가 제보함
                      </AppText>
                    </View>
                  ) : (
                    <AppText preset="caption" style={styles.personalStatusEmpty}>
                      아직 남긴 개인 제보가 없어요.
                    </AppText>
                  )}
                </View>
                {personalReportLabel ? (
                  <AppText preset="caption" style={styles.personalStateNote}>
                    {personalReportLabel}
                  </AppText>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.personalActionButton}
                  onPress={onPressReport}
                >
                  <AppText preset="body" style={styles.personalActionButtonText}>
                    {reportSaving
                      ? '제보 저장 중'
                      : personalRecord
                        ? '내 제보 갱신'
                        : '내 제보 남기기'}
                  </AppText>
                </TouchableOpacity>
              </>
            ) : (
              <AppText preset="caption" style={styles.personalStatusEmpty}>
                이 여행 후보는 아직 개인 제보 대상과 연결되지 않았어요. 공개 라벨만 보수적으로 보여줘요.
              </AppText>
            )}
          </View>

          <View style={styles.detailSectionCard}>
            <AppText preset="headline" style={styles.detailSectionTitle}>
              반려동물 동반 안내
            </AppText>
            <ExpandableBodyText
              text={targetItem.publicTrust.shortReason}
              textStyle={styles.detailSectionBody}
            />
            <ExpandableBodyText
              text={`세부 안내: ${targetItem.petNotice}`}
              textStyle={styles.detailSectionBody}
            />
          </View>

          <View style={styles.detailSectionCard}>
            <AppText preset="headline" style={styles.detailSectionTitle}>
              여행 포인트
            </AppText>
            <View style={styles.detailHighlightWrap}>
              {targetItem.facilityHighlights.map(highlight => (
                <View key={highlight} style={styles.highlightBadge}>
                  <AppText preset="caption" style={styles.highlightBadgeText}>
                    {highlight}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {detail?.usageInfo || detail?.parkingInfo || detail?.overview ? (
            <View style={styles.detailSectionCard}>
              <AppText preset="headline" style={styles.detailSectionTitle}>
                이용 정보
              </AppText>
              {detail?.overview ? (
                <ExpandableBodyText
                  text={detail.overview}
                  textStyle={styles.detailSectionBody}
                />
              ) : null}
              {detail?.usageInfo ? (
                <ExpandableBodyText
                  text={`이용 안내: ${detail.usageInfo}`}
                  textStyle={styles.detailSectionBody}
                />
              ) : null}
              {detail?.parkingInfo ? (
                <ExpandableBodyText
                  text={`주차 안내: ${detail.parkingInfo}`}
                  textStyle={styles.detailSectionBody}
                />
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.primaryButton}
            onPress={() => {
              onPressOpenExternalMap().catch(() => {});
            }}
          >
            <AppText preset="body" style={styles.primaryButtonText}>
              외부 지도 열기
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Screen>
  );
}
