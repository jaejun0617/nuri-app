import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import ExpandableBodyText from '../../components/common/ExpandableBodyText';
import Screen from '../../components/layout/Screen';
import LocationDiscoveryCard from '../../components/locationDiscovery/LocationDiscoveryCard';
import LocationDiscoveryMapPreview from '../../components/locationDiscovery/LocationDiscoveryMapPreview';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import { usePlaceUserLayer } from '../../hooks/usePlaceUserLayer';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  formatDistanceLabel,
  formatDurationLabel,
} from '../../services/locationDiscovery/service';
import { openExternalMap } from '../../services/locationDiscovery/maps';
import { getPetPlaceOwnReportLabel } from '../../services/trust/userLayerLabels';
import type {
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
} from '../../services/locationDiscovery/types';
type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  domain: LocationDiscoveryDomain;
};

export default function LocationDiscoveryDetailScreen({ domain }: Props) {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = (route.params as
    | {
        item: LocationDiscoveryItem;
        resultItems?: LocationDiscoveryItem[];
      }
    | undefined);
  const item = params?.item;
  const resultItems = useMemo(
    () => params?.resultItems ?? [],
    [params?.resultItems],
  );
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(6);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const placeUserLayer = usePlaceUserLayer({
    enabled: domain === 'pet-friendly-place',
  });
  const relatedItems = useMemo(
    () =>
      item
        ? resultItems.filter(candidate => candidate.id !== item.id)
        : [],
    [item, resultItems],
  );
  const visibleRelatedItems = useMemo(
    () => relatedItems.slice(0, visibleRelatedCount),
    [relatedItems, visibleRelatedCount],
  );

  useEffect(() => {
    if (!item) return;
    setVisibleRelatedCount(6);
  }, [item]);

  if (!item) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSideSlot}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Feather name="arrow-left" size={20} color="#102033" />
              </TouchableOpacity>
            </View>
            <AppText preset="headline" style={styles.headerTitle}>
              상세 정보
            </AppText>
            <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
          </View>
          <View style={styles.emptyCard}>
            <AppText preset="headline" style={styles.emptyTitle}>
              장소 정보를 찾을 수 없어요
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

  const durationLabel = formatDurationLabel(item.estimatedMinutes);
  const personalRecord =
    domain === 'pet-friendly-place' && item.userLayer.targetId
      ? placeUserLayer.records.get(item.userLayer.targetId) ?? null
      : null;
  const personalBadges = [
    personalRecord?.isBookmarked ? '저장함' : null,
    personalRecord?.ownReportStatus ? '내가 제보함' : null,
  ].filter((value): value is string => Boolean(value));
  const personalReportLabel = getPetPlaceOwnReportLabel(
    personalRecord?.ownReportStatus,
  );
  const verificationBannerStyle = (() => {
    switch (item.publicTrust.tone) {
      case 'positive':
        return {
          container: styles.verificationBannerPositive,
          title: styles.verificationBannerTitlePositive,
          body: styles.verificationBannerBodyPositive,
        };
      case 'critical':
        return {
          container: styles.verificationBannerCritical,
          title: styles.verificationBannerTitleCritical,
          body: styles.verificationBannerBodyCritical,
        };
      case 'caution':
        return {
          container: styles.verificationBannerCaution,
          title: styles.verificationBannerTitleCaution,
          body: styles.verificationBannerBodyCaution,
        };
      default:
        return {
          container: styles.verificationBannerNeutral,
          title: styles.verificationBannerTitleNeutral,
          body: styles.verificationBannerBodyNeutral,
        };
    }
  })();

  const onPressRelatedItem = (nextItem: LocationDiscoveryItem) => {
    if (domain === 'walk') {
      navigation.push('WalkSpotDetail', {
        item: nextItem,
        resultItems,
      });
      return;
    }

    navigation.push('PetFriendlyPlaceDetail', {
      item: nextItem,
      resultItems,
    });
  };
  const onPressToggleBookmark = async () => {
    if (domain !== 'pet-friendly-place') {
      return;
    }
    if (!placeUserLayer.isLoggedIn) {
      Alert.alert('로그인이 필요해요', '저장 상태는 로그인 후 개인화 정보로만 관리돼요.');
      return;
    }
    if (!item.userLayer.targetId || !item.userLayer.supportsBookmark) {
      Alert.alert(
        '아직 저장할 수 없어요',
        '이 장소는 아직 개인 저장 대상과 연결되지 않았어요. 공개 라벨은 그대로 유지돼요.',
      );
      return;
    }

    try {
      setBookmarkSaving(true);
      await placeUserLayer.toggleBookmark(
        item.userLayer.targetId,
        !personalRecord?.isBookmarked,
      );
    } catch (error) {
      Alert.alert(
        '저장 상태를 바꾸지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setBookmarkSaving(false);
    }
  };
  const onPressReport = () => {
    if (domain !== 'pet-friendly-place') {
      return;
    }
    if (!placeUserLayer.isLoggedIn) {
      Alert.alert('로그인이 필요해요', '내 제보 상태는 로그인 후 개인화 정보로만 기록돼요.');
      return;
    }
    if (!item.userLayer.targetId || !item.userLayer.supportsReport) {
      Alert.alert(
        '아직 제보할 수 없어요',
        '이 장소는 아직 개인 제보 대상과 연결되지 않았어요. 공개 라벨은 후보/확인 필요 기준으로만 유지돼요.',
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
            placeUserLayer
              .submitReport(item.userLayer.targetId!, 'pet-friendly')
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
            placeUserLayer
              .submitReport(item.userLayer.targetId!, 'not-pet-friendly')
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
          text: '정책 변경',
          onPress: () => {
            setReportSaving(true);
            placeUserLayer
              .submitReport(item.userLayer.targetId!, 'policy-changed')
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
          text: '확인 필요',
          onPress: () => {
            setReportSaving(true);
            placeUserLayer
              .submitReport(item.userLayer.targetId!, 'unknown')
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
  const buildRelatedPersonalState = (relatedItem: LocationDiscoveryItem) => {
    if (domain !== 'pet-friendly-place' || !relatedItem.userLayer.targetId) {
      return null;
    }

    const record = placeUserLayer.records.get(relatedItem.userLayer.targetId);
    if (!record) {
      return null;
    }

    const badges = [
      record.isBookmarked ? '저장함' : null,
      record.ownReportStatus ? '내가 제보함' : null,
    ].filter((value): value is string => Boolean(value));
    if (!badges.length) {
      return null;
    }

    return {
      badges,
      note: '개인 상태는 공개 라벨과 별도로만 보여줘요.',
    };
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={20} color="#102033" />
            </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            {domain === 'walk' ? '산책 장소 상세' : '펫동반 장소 상세'}
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailScrollContent}
        >
          <View style={styles.detailHero}>
            <AppText preset="caption" style={styles.detailCategory}>
              {item.categoryLabel}
            </AppText>
            <AppText preset="headline" style={styles.detailTitle}>
              {item.name}
            </AppText>
            <ExpandableBodyText
              text={item.description}
              textStyle={styles.detailDescription}
            />

            <View
              style={[styles.verificationBanner, verificationBannerStyle.container]}
            >
              <AppText
                preset="caption"
                style={[
                  styles.verificationBannerTitle,
                  verificationBannerStyle.title,
                ]}
              >
                {item.publicTrust.label}
              </AppText>
              <ExpandableBodyText
                text={item.publicTrust.description}
                textStyle={[styles.verificationBannerBody, verificationBannerStyle.body]}
                toggleTextStyle={verificationBannerStyle.body}
              />
              <ExpandableBodyText
                text={item.publicTrust.guidance}
                textStyle={[styles.verificationBannerBody, verificationBannerStyle.body]}
                toggleTextStyle={verificationBannerStyle.body}
              />
            </View>

            <View style={styles.detailMetaGrid}>
              <View style={styles.detailMetaRow}>
                <Feather name="layers" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  출처: {item.source.providerLabel}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="shield" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  공개 라벨: {item.publicTrust.label}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="info" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  판단 근거: {item.publicTrust.sourceLabel}
                </AppText>
              </View>
              {item.publicTrust.basisDateLabel ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="calendar" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {item.publicTrust.basisDateLabel}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.detailMetaRow}>
                <Feather name="map-pin" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.address}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="crosshair" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  좌표 {item.coordinateLabel}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="navigation" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {formatDistanceLabel(item.distanceMeters)}
                </AppText>
              </View>
              {durationLabel ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="clock" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {durationLabel}
                  </AppText>
                </View>
              ) : null}
              {item.operatingStatusLabel ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="clock" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {item.operatingStatusLabel}
                  </AppText>
                </View>
              ) : null}
              {item.petPolicy.detail ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="info" size={15} color="#7B8597" />
                  <ExpandableBodyText
                    text={item.petPolicy.detail}
                    containerStyle={{ flex: 1 }}
                    textStyle={styles.detailMetaText}
                  />
                </View>
              ) : null}
            </View>

            {item.publicTrust.hasConflict ? (
              <View style={styles.infoBanner}>
                <AppText preset="caption" style={styles.infoBannerTitle}>
                  출처 충돌 감지
                </AppText>
                <AppText preset="body" style={styles.infoBannerBody}>
                  외부 후보와 검수 정보가 달라 가장 보수적인 공개 라벨을 유지했어요.
                </AppText>
              </View>
            ) : null}

            {item.publicTrust.isStale ? (
              <View style={styles.infoBanner}>
                <AppText preset="caption" style={styles.infoBannerTitle}>
                  기준일 재확인 필요
                </AppText>
                <AppText preset="body" style={styles.infoBannerBody}>
                  검수 기준일이 오래돼 최신 반려동물 동반 정책은 다시 확인하는 편이 안전해요.
                </AppText>
              </View>
            ) : null}

            {domain === 'pet-friendly-place' ? (
              <View style={styles.personalSectionCard}>
                <AppText preset="headline" style={styles.personalSectionTitle}>
                  내 상태
                </AppText>
                <AppText preset="body" style={styles.personalSectionBody}>
                  저장함과 내가 제보함은 개인화 상태예요. 공개 라벨과 검수 반영 여부는 여기서 올라가지 않아요.
                </AppText>
                {item.userLayer.targetId ? (
                  <>
                    <View style={styles.personalStatusWrap}>
                      {personalBadges.length ? (
                        personalBadges.map(badge => (
                          <View
                            key={`${item.id}:personal:${badge}`}
                            style={styles.personalBadge}
                          >
                            <AppText
                              preset="caption"
                              style={styles.personalBadgeText}
                            >
                              {badge}
                            </AppText>
                          </View>
                        ))
                      ) : (
                        <AppText
                          preset="caption"
                          style={styles.personalStatusEmpty}
                        >
                          아직 저장하거나 제보한 개인 상태가 없어요.
                        </AppText>
                      )}
                    </View>
                    {personalReportLabel ? (
                      <AppText preset="caption" style={styles.personalStateNote}>
                        {personalReportLabel}
                      </AppText>
                    ) : null}
                    <View style={styles.personalActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={[
                          styles.personalActionButton,
                          personalRecord?.isBookmarked
                            ? styles.personalActionButtonPrimary
                            : null,
                        ]}
                        onPress={() => {
                          onPressToggleBookmark().catch(() => {});
                        }}
                      >
                        <AppText
                          preset="body"
                          style={styles.personalActionButtonText}
                        >
                          {bookmarkSaving
                            ? '저장 중'
                            : personalRecord?.isBookmarked
                              ? '저장 해제'
                              : '저장하기'}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.personalActionButton}
                        onPress={onPressReport}
                      >
                        <AppText
                          preset="body"
                          style={styles.personalActionButtonText}
                        >
                          {reportSaving
                            ? '제보 저장 중'
                            : personalRecord?.ownReportStatus
                              ? '내 제보 갱신'
                              : '내 제보 남기기'}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <AppText preset="caption" style={styles.personalStatusEmpty}>
                    이 장소는 아직 개인 저장/제보 대상과 연결되지 않았어요. 후보와 공개 라벨만 보수적으로 보여줘요.
                  </AppText>
                )}
              </View>
            ) : null}
            <AppText preset="caption" style={styles.relatedSectionCaption}>
              거리 기준: {item.distanceLabel}
            </AppText>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryActionButton}
                onPress={() => {
                  openExternalMap({
                    label: item.name,
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }).catch(() => {
                    Alert.alert('지도를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
                  });
                }}
              >
                <AppText preset="body" style={styles.primaryActionButtonText}>
                  지도 보기
                </AppText>
              </TouchableOpacity>

              {item.placeUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.secondaryActionButton}
                  onPress={() => {
                    Linking.openURL(item.placeUrl!).catch(() => {
                      Alert.alert('상세 링크를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
                    });
                  }}
                >
                  <AppText preset="body" style={styles.secondaryActionButtonText}>
                    장소 링크
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <LocationDiscoveryMapPreview
            latitude={item.latitude}
            longitude={item.longitude}
            title={`${item.name} 지도 미리보기`}
          />

          {visibleRelatedItems.length > 0 ? (
            <View style={styles.relatedSection}>
              <View style={styles.relatedSectionHeader}>
                <AppText preset="headline" style={styles.relatedSectionTitle}>
                  {domain === 'walk' ? '주변 산책 장소' : '연관 펫동반 장소'}
                </AppText>
                <AppText preset="caption" style={styles.relatedSectionCaption}>
                  검수 반영과 후보 정보를 함께 참고하며 이어서 볼 수 있어요
                </AppText>
              </View>

              <View style={styles.relatedList}>
                {visibleRelatedItems.map(relatedItem => (
                  <LocationDiscoveryCard
                    key={`${domain}-related:${relatedItem.id}`}
                    item={relatedItem}
                    onPress={onPressRelatedItem}
                    personalState={buildRelatedPersonalState(relatedItem)}
                  />
                ))}
              </View>
              {visibleRelatedItems.length < relatedItems.length ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.secondaryActionButton}
                  onPress={() => {
                    setVisibleRelatedCount(current => current + 6);
                  }}
                >
                  <AppText preset="body" style={styles.secondaryActionButtonText}>
                    더보기
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}
