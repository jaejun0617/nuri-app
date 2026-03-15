import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { useManagedPetCareGuideDetail } from '../../hooks/useManagedPetCareGuideDetail';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  buildGuideAdminUpsertInput,
  buildGuideSlug,
  createEmptyGuideAdminFormValues,
  GUIDE_CATEGORY_OPTIONS,
  GUIDE_LIFE_STAGE_OPTIONS,
  GUIDE_STATUS_OPTIONS,
  GUIDE_TARGET_SPECIES_OPTIONS,
  mapGuideToAdminFormValues,
  validateGuideAdminFormValues,
  type GuideAdminFormValues,
} from '../../services/guides/admin';
import {
  formatGuideStatusLabel,
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import { saveManagedPetCareGuide } from '../../services/guides/service';
import type {
  GuideContentStatus,
  GuideLifeStage,
  PetGuideSpecies,
} from '../../services/guides/types';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuideAdminEditor'>;
type Route = RootScreenRoute<'GuideAdminEditor'>;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.fieldBlock}>
      <AppText preset="caption" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A1B2"
        style={[styles.input, multiline ? styles.multilineInput : null]}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <AppText preset="headline" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

export default function GuideAdminEditorScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const role = useAuthStore(s => s.profile.role ?? 'user');
  const detailState = useManagedPetCareGuideDetail(
    route.params.mode === 'edit' ? route.params.guideId : null,
  );
  const isGuideAdmin = role === 'admin' || role === 'super_admin';
  const headerTopInset = Math.max(insets.top, 12);

  const [formValues, setFormValues] = useState<GuideAdminFormValues>(
    createEmptyGuideAdminFormValues(),
  );
  const [saving, setSaving] = useState(false);
  const slugManuallyEditedRef = useRef(false);
  const initializedGuideIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (route.params.mode !== 'edit') return;
    if (!detailState.guide) return;
    if (initializedGuideIdRef.current === detailState.guide.id) return;

    initializedGuideIdRef.current = detailState.guide.id;
    setFormValues(mapGuideToAdminFormValues(detailState.guide));
    slugManuallyEditedRef.current = true;
  }, [detailState.guide, route.params.mode]);

  const updateField = useCallback(
    <Key extends keyof GuideAdminFormValues>(
      key: Key,
      value: GuideAdminFormValues[Key],
    ) => {
      setFormValues(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleTargetSpecies = useCallback((species: PetGuideSpecies) => {
    setFormValues(prev => {
      const exists = prev.targetSpecies.includes(species);
      const next = exists
        ? prev.targetSpecies.filter(item => item !== species)
        : [...prev.targetSpecies, species];

      return {
        ...prev,
        targetSpecies: next.length > 0 ? next : ['common'],
      };
    });
  }, []);

  const saveGuide = useCallback(
    async (nextStatus?: GuideContentStatus) => {
      if (!isGuideAdmin || saving) return;

      const candidate: GuideAdminFormValues = {
        ...formValues,
        status: nextStatus ?? formValues.status,
      };
      const validationMessage = validateGuideAdminFormValues(candidate);
      if (validationMessage) {
        Alert.alert('입력 확인', validationMessage);
        return;
      }

      try {
        setSaving(true);
        const savedGuide = await saveManagedPetCareGuide(
          buildGuideAdminUpsertInput(candidate),
        );
        setFormValues(mapGuideToAdminFormValues(savedGuide));
        slugManuallyEditedRef.current = true;
        await queryClient.invalidateQueries({ queryKey: ['pet-care-guides'] });
        showToast({
          tone: 'success',
          title: '가이드를 저장했어요',
          message: `${savedGuide.title} 상태가 반영되었습니다.`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '가이드를 저장하지 못했어요.';
        Alert.alert('저장 실패', message);
      } finally {
        setSaving(false);
      }
    },
    [formValues, isGuideAdmin, queryClient, saving],
  );

  const statusSummary = useMemo(() => {
    return `${formatGuideStatusLabel(formValues.status)} · ${
      formValues.isActive ? '활성' : '비활성'
    }`;
  }, [formValues.isActive, formValues.status]);

  if (!isGuideAdmin) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <View style={styles.emptyCard}>
          <Feather name="shield-off" size={28} color="#6D6AF8" />
          <AppText preset="headline" style={styles.emptyTitle}>
            운영 권한이 필요해요
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (route.params.mode === 'edit' && detailState.loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <View style={styles.emptyCard}>
          <Feather name="loader" size={28} color="#6D6AF8" />
          <AppText preset="headline" style={styles.emptyTitle}>
            가이드 편집 정보를 불러오는 중이에요
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (route.params.mode === 'edit' && !detailState.guide) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <View style={styles.emptyCard}>
          <Feather name="alert-circle" size={28} color="#6D6AF8" />
          <AppText preset="headline" style={styles.emptyTitle}>
            편집할 가이드를 찾지 못했어요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            {detailState.error ?? '삭제되었거나 접근 권한이 없을 수 있어요.'}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={24}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopInset + 4, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerSideButton}
            onPress={() => navigation.goBack()}
          >
            <AppText preset="body" style={styles.headerSideText}>
              뒤로가기
            </AppText>
          </TouchableOpacity>

          <AppText preset="headline" style={styles.headerTitle}>
            {route.params.mode === 'create' ? '가이드 등록' : '가이드 편집'}
          </AppText>

          <View style={styles.headerSideButton} />
        </View>

        <View style={styles.heroCard}>
          <AppText preset="title2" style={styles.heroTitle}>
            {formValues.title.trim() || '새 가이드 초안'}
          </AppText>
          <AppText preset="body" style={styles.heroSub}>
            {statusSummary}
          </AppText>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.actionButton}
              onPress={() => saveGuide('draft')}
              disabled={saving}
            >
              <AppText preset="caption" style={styles.actionButtonText}>
                초안 저장
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => saveGuide('published')}
              disabled={saving}
            >
              <AppText preset="caption" style={styles.actionButtonPrimaryText}>
                발행
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.actionButton}
              onPress={() => saveGuide('archived')}
              disabled={saving}
            >
              <AppText preset="caption" style={styles.actionButtonText}>
                보관
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <Section title="기본 정보">
          <Field
            label="제목"
            value={formValues.title}
            onChangeText={value => {
              updateField('title', value);
              if (!slugManuallyEditedRef.current) {
                updateField('slug', buildGuideSlug(value));
              }
            }}
            placeholder="예: 노령견 산책 루틴 운영법"
          />
          <Field
            label="슬러그"
            value={formValues.slug}
            onChangeText={value => {
              slugManuallyEditedRef.current = true;
              updateField('slug', buildGuideSlug(value));
            }}
            placeholder="guide-slug"
          />
          <Field
            label="요약"
            value={formValues.summary}
            onChangeText={value => updateField('summary', value)}
            placeholder="목록과 상세 상단에 노출되는 짧은 설명"
            multiline
          />
          <Field
            label="본문 미리보기"
            value={formValues.bodyPreview}
            onChangeText={value => updateField('bodyPreview', value)}
            placeholder="검색/목록 최적화용 짧은 본문"
            multiline
          />
          <Field
            label="본문"
            value={formValues.body}
            onChangeText={value => updateField('body', value)}
            placeholder="사용자 상세에서 보여줄 전문 본문"
            multiline
          />
        </Section>

        <Section title="분류와 검색">
          <View style={styles.choiceWrap}>
            {GUIDE_CATEGORY_OPTIONS.map(category => {
              const active = formValues.category === category;
              return (
                <Pressable
                  key={category}
                  style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                  onPress={() => updateField('category', category)}
                >
                  <AppText
                    preset="caption"
                    style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}
                  >
                    {getGuideCategoryLabel(category)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="태그"
            value={formValues.tagsText}
            onChangeText={value => updateField('tagsText', value)}
            placeholder="쉼표(,)로 구분"
          />
          <Field
            label="검색 키워드"
            value={formValues.searchKeywordsText}
            onChangeText={value => updateField('searchKeywordsText', value)}
            placeholder="운영 검색 확장용 키워드"
          />
          <Field
            label="species 키워드"
            value={formValues.speciesKeywordsText}
            onChangeText={value => updateField('speciesKeywordsText', value)}
            placeholder="dog, 강아지, hamster 같은 검색 키워드"
          />
        </Section>

        <Section title="대상 정책">
          <View style={styles.choiceWrap}>
            {GUIDE_TARGET_SPECIES_OPTIONS.map(species => {
              const active = formValues.targetSpecies.includes(species);
              return (
                <Pressable
                  key={species}
                  style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                  onPress={() => toggleTargetSpecies(species)}
                >
                  <AppText
                    preset="caption"
                    style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}
                  >
                    {species}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.choiceWrap}>
            {(['all', 'lifeStage', 'ageRange'] as const).map(type => {
              const active = formValues.agePolicyType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                  onPress={() => updateField('agePolicyType', type)}
                >
                  <AppText
                    preset="caption"
                    style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}
                  >
                    {type === 'all'
                      ? '전 연령'
                      : type === 'lifeStage'
                        ? '생애주기'
                        : '연령 범위'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {formValues.agePolicyType === 'lifeStage' ? (
            <View style={styles.choiceWrap}>
              {GUIDE_LIFE_STAGE_OPTIONS.map(stage => {
                const active = formValues.agePolicyLifeStage === stage;
                return (
                  <Pressable
                    key={stage}
                    style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                    onPress={() =>
                      updateField('agePolicyLifeStage', stage as GuideLifeStage)
                    }
                  >
                    <AppText
                      preset="caption"
                      style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}
                    >
                      {stage}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {formValues.agePolicyType === 'ageRange' ? (
            <View style={styles.inlineFields}>
              <View style={styles.inlineFieldItem}>
                <Field
                  label="최소 개월"
                  value={formValues.agePolicyMinMonths}
                  onChangeText={value => updateField('agePolicyMinMonths', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inlineFieldItem}>
                <Field
                  label="최대 개월"
                  value={formValues.agePolicyMaxMonths}
                  onChangeText={value => updateField('agePolicyMaxMonths', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ) : null}
        </Section>

        <Section title="운영 설정">
          <View style={styles.inlineFields}>
            <View style={styles.inlineFieldItem}>
              <Field
                label="priority"
                value={formValues.priority}
                onChangeText={value => updateField('priority', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inlineFieldItem}>
              <Field
                label="sort order"
                value={formValues.sortOrder}
                onChangeText={value => updateField('sortOrder', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inlineFieldItem}>
              <Field
                label="rotation"
                value={formValues.rotationWeight}
                onChangeText={value => updateField('rotationWeight', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.choiceWrap}>
            {GUIDE_STATUS_OPTIONS.map(status => {
              const active = formValues.status === status;
              return (
                <Pressable
                  key={status}
                  style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                  onPress={() => updateField('status', status)}
                >
                  <AppText
                    preset="caption"
                    style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}
                  >
                    {formatGuideStatusLabel(status)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <AppText preset="body" style={styles.switchTitle}>
                활성 상태
              </AppText>
              <AppText preset="caption" style={styles.switchDesc}>
                발행 상태와 별개로 운영 비활성화할 수 있어요.
              </AppText>
            </View>
            <Switch
              value={formValues.isActive}
              onValueChange={value => updateField('isActive', value)}
              trackColor={{ false: '#D7DBE3', true: '#B8B6FF' }}
              thumbColor={formValues.isActive ? '#6D6AF8' : '#FFFFFF'}
            />
          </View>
        </Section>

        <Section title="이미지 메타">
          <Field
            label="썸네일 URL"
            value={formValues.thumbnailImageUrl}
            onChangeText={value => updateField('thumbnailImageUrl', value)}
            placeholder="목록용 썸네일 URL"
          />
          <Field
            label="대표 이미지 URL"
            value={formValues.coverImageUrl}
            onChangeText={value => updateField('coverImageUrl', value)}
            placeholder="상세 상단 이미지 URL"
          />
          <Field
            label="이미지 대체 텍스트"
            value={formValues.imageAlt}
            onChangeText={value => updateField('imageAlt', value)}
            placeholder="접근성/운영 메타용 설명"
          />
        </Section>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  header: {
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSideButton: {
    minWidth: 68,
    height: 34,
    justifyContent: 'center',
  },
  headerSideText: {
    color: '#556070',
    fontWeight: '700',
  },
  headerTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  heroCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 10,
  },
  heroTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  heroSub: {
    color: '#556070',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F5FA',
  },
  actionButtonPrimary: {
    backgroundColor: '#6D6AF8',
  },
  actionButtonText: {
    color: '#556070',
    fontWeight: '900',
  },
  actionButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  sectionCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  sectionTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: '#556070',
    fontWeight: '800',
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F7F8FD',
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 110,
    paddingVertical: 14,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F5FA',
  },
  choiceChipActive: {
    backgroundColor: 'rgba(109,106,248,0.12)',
  },
  choiceChipText: {
    color: '#556070',
    fontWeight: '800',
  },
  choiceChipTextActive: {
    color: '#6D6AF8',
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineFieldItem: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#F7F8FD',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  switchTextWrap: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    color: '#0B1220',
    fontWeight: '800',
  },
  switchDesc: {
    color: '#556070',
    lineHeight: 18,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  emptyDesc: {
    color: '#556070',
    textAlign: 'center',
    lineHeight: 20,
  },
});
