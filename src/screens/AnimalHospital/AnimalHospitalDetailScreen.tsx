import React, { useCallback } from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import ExpandableBodyText from '../../components/common/ExpandableBodyText';
import Screen from '../../components/layout/Screen';
import NativeLiteMapPreview from '../../components/maps/NativeLiteMapPreview';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { StyleSheet } from 'react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RootScreenRoute<'AnimalHospitalDetail'>;

export default function AnimalHospitalDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const item = route.params?.item;

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!item) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.container}>
          <View style={styles.emptyCard}>
            <AppText preset="headline" style={styles.emptyTitle}>
              병원 정보를 찾을 수 없어요
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

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
            동물병원 상세
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailScrollContent}
        >
          <View style={styles.detailHero}>
            <AppText preset="caption" style={styles.detailCategory}>
              동물병원
            </AppText>
            <AppText preset="headline" style={styles.detailTitle}>
              {item.name}
            </AppText>

            <View style={styles.detailMetaGrid}>
              <View style={styles.detailMetaRow}>
                <Feather name="shield" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  공개 라벨: {item.publicTrust.label}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="map-pin" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.address}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="navigation" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.distanceLabel}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="phone" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.officialPhone ?? '공식 전화 확인 중'}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="flag" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.statusSummary}
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
            </View>

            <ExpandableBodyText
              text={`${item.publicTrust.description}\n\n운영시간, 24시간, 야간, 주말, 특수동물, 응급, 주차, 장비, 홈페이지/SNS는 이번 MVP public 화면에서 숨겨 두고 있어요.`}
              textStyle={styles.detailDescription}
            />

            <View style={styles.detailActionRow}>
              {item.links.callUri ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.primaryActionButton}
                  onPress={() => {
                    Linking.openURL(item.links.callUri!).catch(() => {});
                  }}
                >
                  <AppText preset="body" style={styles.primaryActionButtonText}>
                    전화하기
                  </AppText>
                </TouchableOpacity>
              ) : null}
              {item.links.externalMapUrl ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={item.links.callUri ? styles.secondaryActionButton : styles.primaryActionButton}
                  onPress={() => {
                    Linking.openURL(item.links.externalMapUrl!).catch(() => {});
                  }}
                >
                  <AppText
                    preset="body"
                    style={item.links.callUri ? styles.secondaryActionButtonText : styles.primaryActionButtonText}
                  >
                    길찾기
                  </AppText>
                </TouchableOpacity>
              ) : null}
              {item.links.providerPlaceUrl ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.secondaryActionButton}
                  onPress={() => {
                    Linking.openURL(item.links.providerPlaceUrl!).catch(() => {});
                  }}
                >
                  <AppText preset="body" style={styles.secondaryActionButtonText}>
                    장소 링크
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {item.latitude !== null && item.longitude !== null ? (
            <NativeLiteMapPreview
              latitude={item.latitude}
              longitude={item.longitude}
              title={`${item.name} 위치 미리보기`}
              overlayText="기본 좌표와 길찾기 CTA만 먼저 공개해요."
            />
          ) : null}

          <View style={localStyles.detailSectionCard}>
            <AppText preset="headline" style={localStyles.detailSectionTitle}>
              공개 신뢰도 안내
            </AppText>
            <ExpandableBodyText
              text={`${item.publicTrust.shortReason}\n\n${item.publicTrust.guidance}`}
              textStyle={styles.detailDescription}
            />
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  detailSectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7EDF5',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 10,
  },
  detailSectionTitle: {
    color: '#102033',
    fontWeight: '900',
  },
});
