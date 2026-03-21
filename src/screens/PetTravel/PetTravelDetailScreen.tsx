import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import WebView from 'react-native-webview';

import AppText from '../../app/ui/AppText';
import Screen from '../../components/layout/Screen';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getPetTravelPetAllowedLabel,
  getPetTravelPlaceTypeLabel,
} from '../../services/petTravel/catalog';
import { fetchPetTravelDetail } from '../../services/petTravel/api';
import type { PetTravelDetail, PetTravelItem } from '../../services/petTravel/types';
import { styles } from './PetTravel.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const MAP_TILE_SIZE = 256;
const MAP_VIEWPORT_WIDTH = 360;
const MAP_VIEWPORT_HEIGHT = 210;
const MAP_PREVIEW_ZOOM = 15;

function getConfidenceBadgeStyle(label: string) {
  return label === '동반 확인됨' || label === '방문자 확인'
    ? styles.petStatusBadgeConfirmed
    : label === '동반 가능성 높음'
      ? styles.petStatusBadgeConfirmed
      : label === '동반 가능성 있음'
        ? styles.petStatusBadgePossible
        : styles.petStatusBadgeCautious;
}

function getConfidenceBadgeTextStyle(label: string) {
  return label === '동반 확인됨' || label === '방문자 확인'
    ? styles.petStatusBadgeTextConfirmed
    : label === '동반 가능성 높음'
      ? styles.petStatusBadgeTextConfirmed
      : label === '동반 가능성 있음'
        ? styles.petStatusBadgeTextPossible
        : styles.petStatusBadgeTextCautious;
}

function longitudeToTileX(longitude: number, zoom: number): number {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latitudeToTileY(latitude: number, zoom: number): number {
  const radian = (latitude * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(radian) + 1 / Math.cos(radian)) / Math.PI) / 2) *
    2 ** zoom
  );
}

function buildMapPreviewHtml(latitude: number, longitude: number): string {
  const tileX = longitudeToTileX(longitude, MAP_PREVIEW_ZOOM);
  const tileY = latitudeToTileY(latitude, MAP_PREVIEW_ZOOM);
  const startTileX = Math.floor(tileX) - 1;
  const startTileY = Math.floor(tileY) - 1;
  const gridWidth = MAP_TILE_SIZE * 3;
  const gridHeight = MAP_TILE_SIZE * 3;
  const offsetX =
    (tileX - startTileX) * MAP_TILE_SIZE - MAP_VIEWPORT_WIDTH / 2;
  const offsetY =
    (tileY - startTileY) * MAP_TILE_SIZE - MAP_VIEWPORT_HEIGHT / 2;

  const tiles = Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const x = startTileX + column;
    const y = startTileY + row;

    return `<img
      src="https://tile.openstreetmap.org/${MAP_PREVIEW_ZOOM}/${x}/${y}.png"
      style="position:absolute;left:${column * MAP_TILE_SIZE}px;top:${row * MAP_TILE_SIZE}px;width:${MAP_TILE_SIZE}px;height:${MAP_TILE_SIZE}px;"
    />`;
  }).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #d7e3ef;
      }
      .viewport {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: linear-gradient(180deg, #dfe8f1 0%, #cfdbe8 100%);
      }
      .tiles {
        position: absolute;
        width: ${gridWidth}px;
        height: ${gridHeight}px;
        left: -${offsetX}px;
        top: -${offsetY}px;
      }
      .marker {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 22px;
        height: 22px;
        transform: translate(-50%, -100%);
        border-radius: 999px 999px 999px 0;
        background: #e2552f;
        rotate: -45deg;
        box-shadow: 0 8px 18px rgba(16, 32, 51, 0.22);
      }
      .marker::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 8px;
        height: 8px;
        transform: translate(-50%, -50%);
        border-radius: 999px;
        background: #ffffff;
      }
      .fade {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(255,255,255,0.06) 0%,
          rgba(255,255,255,0) 36%,
          rgba(16,32,51,0.04) 100%
        );
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="viewport">
      <div class="tiles">${tiles}</div>
      <div class="marker"></div>
      <div class="fade"></div>
    </div>
  </body>
</html>`;
}

export default function PetTravelDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = route.params as { item?: PetTravelItem } | undefined;
  const item = params?.item;
  const [detail, setDetail] = useState<PetTravelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMapPreviewFailed, setIsMapPreviewFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const goBack = useCallback(() => {
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

  const mapPreviewHtml = useMemo(() => {
    if (!targetItem) {
      return null;
    }

    return buildMapPreviewHtml(targetItem.latitude, targetItem.longitude);
  }, [targetItem]);

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

  useEffect(() => {
    setIsMapPreviewFailed(false);
  }, [targetItem?.id]);

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

  const confidenceStyle = getConfidenceBadgeStyle(
    targetItem.petConfidenceLabel,
  );
  const confidenceTextStyle = getConfidenceBadgeTextStyle(
    targetItem.petConfidenceLabel,
  );

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.backButton}
              onPress={goBack}
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
            <AppText preset="body" style={styles.detailSummary}>
              {targetItem.summary}
            </AppText>
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
                  {targetItem.petConfidenceLabel}
                </AppText>
              </View>
            </View>

            <View style={styles.detailMetaGrid}>
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

          <View style={styles.detailSectionCard}>
            <AppText preset="headline" style={styles.detailSectionTitle}>
              반려동물 동반 안내
            </AppText>
            <AppText preset="body" style={styles.detailSectionBody}>
              {targetItem.petAllowed === 'confirmed'
                ? targetItem.petNotice
                : `${getPetTravelPetAllowedLabel(targetItem.petAllowed)} · ${targetItem.petNotice}`}
            </AppText>
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
                <AppText preset="body" style={styles.detailSectionBody}>
                  {detail.overview}
                </AppText>
              ) : null}
              {detail?.usageInfo ? (
                <AppText preset="body" style={styles.detailSectionBody}>
                  이용 안내: {detail.usageInfo}
                </AppText>
              ) : null}
              {detail?.parkingInfo ? (
                <AppText preset="body" style={styles.detailSectionBody}>
                  주차 안내: {detail.parkingInfo}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {mapPreviewHtml ? (
            <View style={styles.detailSectionCard}>
              <AppText preset="headline" style={styles.detailSectionTitle}>
                위치 미리보기
              </AppText>
              <View style={styles.mapCard}>
                {isMapPreviewFailed ? (
                  <View style={styles.mapFallbackCard}>
                    <Feather name="map-pin" size={20} color="#2F8F48" />
                    <AppText preset="body" style={styles.mapFallbackTitle}>
                      지도 미리보기를 불러오지 못했어요
                    </AppText>
                    <AppText preset="caption" style={styles.mapFallbackBody}>
                      아래 지도를 탭하면 카카오맵에서 정확한 위치를 확인할 수 있어요.
                    </AppText>
                  </View>
                ) : (
                  <WebView
                    source={{ html: mapPreviewHtml }}
                    originWhitelist={['*']}
                    style={styles.mapWebView}
                    scrollEnabled={false}
                    nestedScrollEnabled={false}
                    javaScriptEnabled={false}
                    domStorageEnabled={false}
                    setSupportMultipleWindows={false}
                    onError={() => {
                      setIsMapPreviewFailed(true);
                    }}
                    onHttpError={() => {
                      setIsMapPreviewFailed(true);
                    }}
                  />
                )}
                <View style={styles.mapOverlay}>
                  <AppText preset="caption" style={styles.mapOverlayText}>
                    지도를 탭하면 카카오맵으로 열려요
                  </AppText>
                </View>
                <TouchableOpacity
                  activeOpacity={0.0}
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => {
                    const target = detail ?? item;
                    if (!target) return;
                    const deepLink = target.kakaoMapUrl;
                    const webUrl = target.kakaoMapWebUrl;
                    if (!deepLink || !webUrl) return;
                    Linking.canOpenURL(deepLink)
                      .then(supported => {
                        return Linking.openURL(supported ? deepLink : webUrl);
                      })
                      .catch(() => {
                        if (webUrl) Linking.openURL(webUrl).catch(() => {});
                      });
                  }}
                />
              </View>
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
