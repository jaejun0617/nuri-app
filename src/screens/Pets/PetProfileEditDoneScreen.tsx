import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import {
  ProfileCompletionArtwork,
  ProfileCompletionPhoto,
} from './ProfileCompletionArtwork';
import { buildProfileCompletionSummary } from './profileCompletionPresentation';
import {
  PROFILE_COMPLETION_COLORS as colors,
  styles,
} from './PetProfileEditDoneScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetProfileEditDone'>;
type Route = RootScreenRoute<'PetProfileEditDone'>;

export default function PetProfileEditDoneScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ownerId = useAuthStore(s => s.session?.user?.id ?? null);
  const leaving = useRef(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const savedPet = params?.savedProfile?.savedPet;
  const validReceipt = Boolean(
    ownerId &&
      ownerId === params?.savedProfile?.ownerId &&
      savedPet?.id === params?.petId,
  );
  const summary = useMemo(
    () => (savedPet ? buildProfileCompletionSummary(savedPet) : null),
    [savedPet],
  );
  const sourceUri = summary?.photoUri ?? null;
  const photoUri = failedPhoto === sourceUri ? null : sourceUri;
  const onPhotoError = useCallback(
    () => setFailedPhoto(sourceUri),
    [sourceUri],
  );
  const onHome = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    // The existing completion flow discards the finished editor, with Home explicit.
    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
    });
  }, [navigation]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onHome();
        return true;
      });
      return () => sub.remove();
    }, [onHome]),
  );

  if (!validReceipt || !summary)
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 48, paddingHorizontal: 24 },
        ]}
      >
        <AppText preset="unifiedBody">
          저장된 프로필을 확인할 수 없어요.
        </AppText>
        <Pressable
          onPress={onHome}
          accessibilityRole="button"
          accessibilityLabel="홈으로 가기"
          style={styles.button}
        >
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.buttonText}
          >
            홈으로 가기
          </AppText>
        </Pressable>
      </View>
    );

  return (
    <View style={styles.screen} testID="profile-completion-screen">
      <LinearGradient
        colors={['#FCFAFF', '#F7F2FF', '#FCFAFF']}
        locations={[0, 0.54, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (height < 760 ? 24 : 68),
            paddingBottom: Math.max(insets.bottom, 16) + 14,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.artwork,
            { transform: [{ translateX: (width * 14) / 852 }] },
          ]}
        >
          <ProfileCompletionArtwork
            width={Math.min((width * 480) / 852, 260)}
            uri={photoUri}
            name={summary.name}
            onError={onPhotoError}
          />
        </View>
        <AppText
          preset="unifiedTitle"
          styleOverridesPreset
          style={[styles.title, width <= 360 && styles.compactTitle]}
          accessibilityRole="header"
        >
          프로필 수정 완료!
        </AppText>
        <AppText preset="unifiedBody" styleOverridesPreset style={styles.body}>
          {summary.name}의 프로필이{'\n'}새롭게 저장됐어요.
        </AppText>
        <ProfileCompletionSummary
          summary={summary}
          uri={photoUri}
          onPhotoError={onPhotoError}
        />
        <AppText preset="unifiedBody" styleOverridesPreset style={styles.guide}>
          홈에서 새로운 프로필을 확인해보세요.
        </AppText>
        <Pressable
          onPress={onHome}
          accessibilityRole="button"
          accessibilityLabel="홈으로 가기"
          style={styles.button}
        >
          <LinearGradient
            colors={['#F0E7FF', '#D6C4FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonContent}
          >
            <View style={styles.buttonBalance} />
            <AppText
              preset="unifiedBody"
              styleOverridesPreset
              style={styles.buttonText}
            >
              홈으로 가기
            </AppText>
            <NuriSemanticIcon
              family="feather"
              name="chevron-right"
              size={22}
              color={colors.arrow}
              preserveOriginal
            />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ProfileCompletionSummary({
  summary,
  uri,
  onPhotoError,
}: {
  summary: ReturnType<typeof buildProfileCompletionSummary>;
  uri: string | null;
  onPhotoError: () => void;
}) {
  return (
    <View style={styles.card} testID="profile-completion-summary">
      <LinearGradient
        colors={['rgba(255,255,255,0.60)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <ProfileCompletionPhoto
            uri={uri}
            name={summary.name}
            onError={onPhotoError}
          />
        </View>
        <AppText preset="unifiedTitle" styleOverridesPreset style={styles.name}>
          {summary.name}
        </AppText>
        <View style={styles.saved}>
          <Image
            source={require('../../assets/profile-completion/saved-check.png')}
            style={styles.savedCheck}
            accessible={false}
          />
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.savedText}
          >
            저장 완료
          </AppText>
        </View>
      </View>
      <View style={styles.divider} />
      {[summary.fields.slice(0, 2), summary.fields.slice(2)].map(
        (row, index) => (
          <React.Fragment key={index}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              {row.map((field, column) => (
                <View
                  key={field.key}
                  style={[styles.cell, column > 0 && styles.rightCell]}
                >
                  <AppText
                    preset="unifiedMeta"
                    styleOverridesPreset
                    style={styles.label}
                  >
                    {field.label}
                  </AppText>
                  <AppText
                    preset="unifiedBody"
                    styleOverridesPreset
                    style={styles.value}
                  >
                    {field.value}
                  </AppText>
                </View>
              ))}
            </View>
          </React.Fragment>
        ),
      )}
    </View>
  );
}
