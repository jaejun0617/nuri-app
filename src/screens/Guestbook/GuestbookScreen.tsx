// 파일: src/screens/Guestbook/GuestbookScreen.tsx
// 파일 목적:
// - 기존 공개형 방명록 placeholder를 선택 펫 기준 private letters 화면으로 전환한다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 `GuestbookTab` 화면으로 사용된다.
// 핵심 역할:
// - 로그인 사용자는 자기 펫에게 남긴 사적 편지를 작성/조회하고, 게스트는 로그인 유도 화면을 본다.
// 수정 시 주의:
// - 공개 방명록, 사용자 신고, AI 답장, 공유 기능을 이 화면에서 먼저 열지 않는다.

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import GuestLockedState from '../../components/common/GuestLockedState';
import Screen from '../../components/layout/Screen';
import {
  buildPrivateLetterPreview,
  formatPrivateLetterDate,
  getPrivateLetterValidationMessage,
  normalizePrivateLetterContent,
  PRIVATE_LETTER_CONTENT_MAX_LENGTH,
} from '../../domains/privateLetters';
import { usePrivateLetters } from '../../hooks/usePrivateLetters';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GuestbookScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const resolvedPetId = useMemo(
    () => resolveSelectedPetId(pets, selectedPetId),
    [pets, selectedPetId],
  );
  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === resolvedPetId) ?? null,
    [pets, resolvedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const lettersState = usePrivateLetters({
    petId: selectedPet?.id ?? null,
    enabled: isLoggedIn,
  });

  const goSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  const goPetCreate = useCallback(() => {
    navigation.navigate('PetCreate', { from: 'cta' });
  }, [navigation]);

  const handleChangeDraft = useCallback((next: string) => {
    setDraft(next);
    if (localError) setLocalError(null);
  }, [localError]);

  const handleSubmit = useCallback(async () => {
    const validationMessage = getPrivateLetterValidationMessage(draft);
    if (validationMessage) {
      setLocalError(validationMessage);
      return;
    }

    try {
      await lettersState.createLetter(draft);
      setDraft('');
      setLocalError(null);
      showToast({
        tone: 'success',
        title: '편지를 남겼어요',
        message: `${selectedPet?.name ?? '우리 아이'}에게 조용히 보관했어요.`,
        durationMs: 2400,
      });
    } catch (error: unknown) {
      setLocalError(
        error instanceof Error ? error.message : '편지를 저장하지 못했어요.',
      );
    }
  }, [draft, lettersState, selectedPet?.name]);

  const normalizedDraft = normalizePrivateLetterContent(draft);
  const canSubmit =
    normalizedDraft.length > 0 &&
    normalizedDraft.length <= PRIVATE_LETTER_CONTENT_MAX_LENGTH &&
    !lettersState.creating;

  if (!isLoggedIn) {
    return (
      <Screen style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(132, insets.bottom + 108) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <PrivateLettersHeader
            eyebrow="PRIVATE LETTERS"
            title="편지함"
            subtitle="로그인하면 우리 아이에게 남긴 사적인 편지를 이어서 보관할 수 있어요."
          />
          <View style={styles.stateWrap}>
            <GuestLockedState
              eyebrow="GUEST EXPERIENCE"
              titleLines={['NURI의 모든 기능을', '경험해 보세요.']}
              bodyLines={[
                '로그인 후 우리 아이와 함께한 시간을',
                '더 깊고 자연스럽게 이어서 남길 수 있어요.',
              ]}
              buttonLabel="로그인하고 기록하기"
              onPress={goSignIn}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (!selectedPet) {
    return (
      <Screen style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(132, insets.bottom + 108) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <PrivateLettersHeader
            eyebrow="PRIVATE LETTERS"
            title="편지함"
            subtitle="편지를 남길 아이를 먼저 등록해 주세요."
          />
          <View style={styles.emptyCard}>
            <AppText
              preset="unifiedTitle"
              style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
            >
              아직 선택된 아이가 없어요
            </AppText>
            <AppText
              preset="unifiedBody"
              style={[styles.emptyBody, { color: theme.colors.textSecondary }]}
            >
              아이를 등록하면 편지함이 펫별로 분리되어 보관됩니다.
            </AppText>
            <PrimaryButton
              label="아이 등록하기"
              color={theme.colors.brand}
              disabled={false}
              loading={false}
              onPress={goPetCreate}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(148, insets.bottom + 124) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={lettersState.refreshing}
            onRefresh={() => {
              lettersState.refetch().catch(() => {});
            }}
            tintColor={petTheme.primary}
          />
        }
      >
        <PrivateLettersHeader
          eyebrow="PRIVATE LETTERS"
          title="편지함"
          subtitle={`${selectedPet.name}에게 남기는 사적인 기록 공간이에요.`}
        />

        <View
          style={[
            styles.composerCard,
            {
              borderColor: petTheme.soft,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.composerHeader}>
            <View style={styles.petMark}>
              <AppText
                preset="unifiedMeta"
                style={[styles.petMarkText, { color: petTheme.primary }]}
              >
                {selectedPet.name.slice(0, 1)}
              </AppText>
            </View>
            <View style={styles.composerTitleWrap}>
              <AppText
                preset="unifiedBody"
                style={[styles.composerTitle, { color: theme.colors.textPrimary }]}
              >
                {selectedPet.name}에게 편지 쓰기
              </AppText>
              <AppText
                preset="unifiedMeta"
                style={[
                  styles.composerMeta,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {normalizedDraft.length.toLocaleString('ko-KR')} /{' '}
                {PRIVATE_LETTER_CONTENT_MAX_LENGTH.toLocaleString('ko-KR')}
              </AppText>
            </View>
          </View>

          <TextInput
            value={draft}
            onChangeText={handleChangeDraft}
            placeholder="오늘 마음에 남은 이야기를 조용히 적어 주세요."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={PRIVATE_LETTER_CONTENT_MAX_LENGTH + 200}
            textAlignVertical="top"
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
          />

          {localError || lettersState.createError ? (
            <AppText
              preset="unifiedMeta"
              style={[styles.errorText, { color: theme.colors.danger }]}
            >
              {localError ?? lettersState.createError}
            </AppText>
          ) : null}

          <PrimaryButton
            label="편지 남기기"
            color={petTheme.primary}
            disabled={!canSubmit}
            loading={lettersState.creating}
            onPress={handleSubmit}
          />
        </View>

        <View style={styles.sectionHeader}>
          <AppText
            preset="unifiedTitle"
            style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
          >
            남긴 편지
          </AppText>
          <AppText
            preset="unifiedMeta"
            style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}
          >
            {lettersState.letters.length.toLocaleString('ko-KR')}개
          </AppText>
        </View>

        {lettersState.loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={petTheme.primary} />
            <AppText
              preset="unifiedBody"
              style={[styles.loadingText, { color: theme.colors.textSecondary }]}
            >
              편지를 불러오는 중이에요
            </AppText>
          </View>
        ) : lettersState.error ? (
          <View style={styles.emptyCard}>
            <AppText
              preset="unifiedTitle"
              style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
            >
              편지를 불러오지 못했어요
            </AppText>
            <AppText
              preset="unifiedBody"
              style={[styles.emptyBody, { color: theme.colors.textSecondary }]}
            >
              {lettersState.error}
            </AppText>
            <PrimaryButton
              label="다시 시도"
              color={petTheme.primary}
              disabled={lettersState.refreshing}
              loading={lettersState.refreshing}
              onPress={() => {
                lettersState.refetch().catch(() => {});
              }}
            />
          </View>
        ) : lettersState.letters.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText
              preset="unifiedTitle"
              style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
            >
              아직 남긴 편지가 없어요
            </AppText>
            <AppText
              preset="unifiedBody"
              style={[styles.emptyBody, { color: theme.colors.textSecondary }]}
            >
              첫 편지를 남기면 이곳에 최신순으로 쌓입니다.
            </AppText>
          </View>
        ) : (
          <View style={styles.letterList}>
            {lettersState.letters.map(letter => (
              <View
                key={letter.id}
                style={[
                  styles.letterCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <AppText
                  preset="unifiedMeta"
                  style={[styles.letterDate, { color: theme.colors.textMuted }]}
                >
                  {formatPrivateLetterDate(letter.createdAt)}
                </AppText>
                <AppText
                  preset="unifiedBody"
                  style={[
                    styles.letterContent,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {buildPrivateLetterPreview(letter.content)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function PrivateLettersHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <AppText
        preset="unifiedMeta"
        style={[styles.eyebrow, { color: theme.colors.brand }]}
      >
        {eyebrow}
      </AppText>
      <AppText
        preset="unifiedTitle"
        style={[styles.title, { color: theme.colors.textPrimary }]}
      >
        {title}
      </AppText>
      <AppText
        preset="unifiedBody"
        style={[styles.subtitle, { color: theme.colors.textSecondary }]}
      >
        {subtitle}
      </AppText>
    </View>
  );
}

function PrimaryButton({
  label,
  color,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  color: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        { backgroundColor: color },
        disabled ? styles.primaryButtonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <AppText preset="unifiedLabel" style={styles.primaryButtonText}>
          {label}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 18,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    lineHeight: 22,
    fontWeight: '600',
  },
  stateWrap: {
    flex: 1,
  },
  composerCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 14,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7EF',
  },
  petMarkText: {
    fontWeight: '900',
  },
  composerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  composerTitle: {
    fontWeight: '900',
  },
  composerMeta: {
    fontWeight: '700',
  },
  input: {
    minHeight: 148,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  errorText: {
    fontWeight: '700',
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '900',
  },
  sectionMeta: {
    fontWeight: '800',
  },
  loadingCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E0DA',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 12,
  },
  emptyTitle: {
    fontWeight: '900',
  },
  emptyBody: {
    lineHeight: 22,
    fontWeight: '600',
  },
  letterList: {
    gap: 12,
  },
  letterCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  letterDate: {
    fontWeight: '800',
  },
  letterContent: {
    lineHeight: 23,
    fontWeight: '700',
  },
});
