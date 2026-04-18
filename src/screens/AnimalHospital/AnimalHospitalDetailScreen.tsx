import React, { useCallback, useMemo } from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import Screen from '../../components/layout/Screen';
import NativeLiteMapPreview from '../../components/maps/NativeLiteMapPreview';
import {
  buildAnimalHospitalDetailViewModel,
} from '../../domains/animalHospital/presentation';
import { createAnimalHospitalDetailStyles } from '../../components/animalHospital/styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RootScreenRoute<'AnimalHospitalDetail'>;

export default function AnimalHospitalDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const theme = useTheme();
  const item = route.params?.item;
  const viewModel = useMemo(
    () => (item ? buildAnimalHospitalDetailViewModel(item) : null),
    [item],
  );
  const styles = useMemo(
    () =>
      createAnimalHospitalDetailStyles(
        theme,
        viewModel?.trustTone ?? 'neutral',
      ),
    [theme, viewModel?.trustTone],
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!item || !viewModel) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.container}>
          <View style={styles.sectionCard}>
            <AppText preset="headline" style={styles.sectionTitle}>
              병원 정보를 찾을 수 없어요
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

  const callUri = item.links.callUri;
  const mapLink = item.links.externalMapUrl ?? item.links.providerPlaceUrl;

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.heroHeader}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={goBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, gap: 18 }}
        >
          <View style={styles.hero}>
            <View style={styles.heroHeader}>
              <AppText preset="caption" style={styles.eyebrow}>
                우리동네 동물병원
              </AppText>
              <AppText preset="titleSm" style={styles.title}>
                {viewModel.title}
              </AppText>
            </View>

            <View style={styles.trustRow}>
              <View style={styles.trustBadge}>
                <AppText preset="caption" style={styles.trustBadgeText}>
                  {viewModel.trustLabel}
                </AppText>
              </View>
              <AppText preset="bodySm" style={styles.statusText}>
                {viewModel.statusSummary}
              </AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={theme.colors.textMuted} />
                <AppText preset="body" style={styles.infoText}>
                  {viewModel.address}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Feather
                  name="navigation"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <AppText preset="body" style={styles.infoText}>
                  {viewModel.distanceLabel}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Feather name="phone" size={16} color={theme.colors.textMuted} />
                <AppText preset="body" style={styles.infoText}>
                  {viewModel.phoneLabel}
                </AppText>
              </View>

              {viewModel.basisDateLabel ? (
                <View style={styles.infoRow}>
                  <Feather
                    name="calendar"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                  <AppText preset="bodySm" style={styles.subtleText}>
                    {viewModel.basisDateLabel}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.ctaRow}>
              {callUri ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.primaryCta}
                  onPress={() => {
                    Linking.openURL(callUri).catch(() => {});
                  }}
                >
                  <AppText preset="body" style={styles.primaryCtaText}>
                    전화하기
                  </AppText>
                </TouchableOpacity>
              ) : null}

              {mapLink ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={callUri ? styles.secondaryCta : styles.primaryCta}
                  onPress={() => {
                    Linking.openURL(mapLink).catch(() => {});
                  }}
                >
                  <AppText
                    preset="body"
                    style={
                      callUri
                        ? styles.secondaryCtaText
                        : styles.primaryCtaText
                    }
                  >
                    {item.links.externalMapUrl ? '길찾기' : '지도에서 보기'}
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
              interactive
            />
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}
