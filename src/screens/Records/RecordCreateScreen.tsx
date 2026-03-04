// 파일: src/screens/Records/RecordCreateScreen.tsx
// 목적:
// - memory(기록) 생성
// - 이미지 중심 폼 UI로 재구성
// - 저장 직후 홈/타임라인에 즉시 반영
// - 탭 구조에서 폼 상태가 남지 않도록 focus/reset 유지

import React, { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';

import AppText from '../../app/ui/AppText';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  fetchMemoryById,
  updateMemoryImagePath,
} from '../../services/supabase/memories';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { styles } from './RecordCreateScreen.styles';

type RecordCreateTabRoute = RouteProp<AppTabParamList, 'RecordCreateTab'>;
type RecordCreateTabNav = BottomTabNavigationProp<
  AppTabParamList,
  'RecordCreateTab'
>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<RecordCreateTabNav, RootNav>;

const MAIN_CATEGORIES = [
  { key: 'walk', label: '산책', icon: 'activity' as const, tag: '#산책' },
  { key: 'meal', label: '식사', icon: 'coffee' as const, tag: '#식사' },
  { key: 'health', label: '건강', icon: 'heart' as const, tag: '#건강' },
  { key: 'diary', label: '일기장', icon: 'edit-3' as const, tag: '#일기장' },
  { key: 'other', label: '기타', icon: 'more-horizontal' as const, tag: '#기타' },
] as const;

const SUGGESTED_TAGS = [
  '#산책',
  '#강아지',
  '#귀요미',
  '#일상',
  '#힐링',
  '#꽃만남',
] as const;

const RECENT_TAGS = ['#예방접종', '#맛있는간식'] as const;
const RECENT_TAGS_STORAGE_KEY = 'nuri.recordCreateRecentTags.v1';

const OTHER_SUBCATEGORIES = [
  { key: 'grooming', label: '미용', tag: '#미용' },
  { key: 'hospital', label: '병원/약', tag: '#병원약' },
  { key: 'etc', label: '기타', tag: '#기타세부' },
] as const;

type MainCategoryKey = (typeof MAIN_CATEGORIES)[number]['key'];
type OtherSubCategoryKey = (typeof OTHER_SUBCATEGORIES)[number]['key'];
type DateShortcutKey = 'today' | 'yesterday';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '다시 시도해 주세요.';
}

function inferMimeFromFileName(
  fileName: string | null | undefined,
): string | null {
  const value = (fileName ?? '').toLowerCase().trim();
  if (!value) return null;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic')) return 'image/heic';
  if (value.endsWith('.heif')) return 'image/heif';
  return null;
}

function inferMimeFromUri(uri: string): string | null {
  const normalized = uri.toLowerCase().split('?')[0];
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  if (normalized.endsWith('.heif')) return 'image/heif';
  return null;
}

function resolvePickerMimeType(asset: {
  type?: string | null;
  fileName?: string | null;
  uri?: string | null;
}) {
  const direct = asset.type ?? null;
  if (direct && direct.includes('/')) return direct;

  const byName = inferMimeFromFileName(asset.fileName);
  if (byName) return byName;

  if (asset.uri) return inferMimeFromUri(asset.uri);
  return null;
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function offsetYmd(base: string, offsetDays: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return base;
  const [y, m, d] = base.split('-').map(Number);
  const next = new Date(y, m - 1, d + offsetDays);
  return toYmd(next);
}

function formatKoreanDate(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;

  const [y, m, d] = ymd.split('-').map(Number);
  const dayIndex = new Date(y, m - 1, d).getDay();
  const dayText = ['일', '월', '화', '수', '목', '금', '토'][dayIndex] ?? '';
  return `${y}년 ${m}월 ${d}일 ${dayText}요일`;
}

function parseTags(raw: string) {
  const cleaned = raw.trim();
  if (!cleaned) return [];

  const byComma = cleaned
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const base =
    byComma.length >= 2
      ? byComma
      : cleaned
          .split(/\s+/)
          .map(s => s.trim())
          .filter(Boolean);

  return base
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map(tag => `#${tag}`);
}

function mergeTags(
  selectedTags: string[],
  mainCategoryKey: MainCategoryKey | null,
  otherSubCategoryKey: OtherSubCategoryKey | null,
) {
  const manual = selectedTags
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
  const mainTag =
    MAIN_CATEGORIES.find(category => category.key === mainCategoryKey)?.tag ??
    null;
  const otherSubTag =
    otherSubCategoryKey && mainCategoryKey === 'other'
      ? OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey)?.tag ??
        null
      : null;

  const merged = [mainTag, otherSubTag, ...manual].filter(Boolean) as string[];
  return Array.from(new Set(merged));
}

function validateOccurredAt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
  }
  return trimmed;
}

export default function RecordCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RecordCreateTabRoute>();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const refresh = useRecordStore(s => s.refresh);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);

  const petIdFromParams = route.params?.petId ?? null;

  const petId = useMemo(() => {
    if (petIdFromParams) return petIdFromParams;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [petIdFromParams, selectedPetId, pets]);

  const todayYmd = useMemo(() => toYmd(new Date()), []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayYmd);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recentTags, setRecentTags] =
    useState<string[]>(Array.from(RECENT_TAGS));
  const [tagDraft, setTagDraft] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [mainCategoryKey, setMainCategoryKey] =
    useState<MainCategoryKey>('walk');
  const [otherSubCategoryKey, setOtherSubCategoryKey] =
    useState<OtherSubCategoryKey | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateDraft, setDateDraft] = useState(todayYmd);
  const [selectedDateShortcut, setSelectedDateShortcut] =
    useState<DateShortcutKey>('today');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const disabled = saving || trimmedTitle.length === 0 || !petId;
  const selectedMainCategory = useMemo(
    () =>
      MAIN_CATEGORIES.find(category => category.key === mainCategoryKey) ?? null,
    [mainCategoryKey],
  );
  const selectedOtherSubCategory = useMemo(
    () =>
      OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey) ?? null,
    [otherSubCategoryKey],
  );
  const formattedDate = useMemo(
    () => formatKoreanDate(occurredAt || todayYmd),
    [occurredAt, todayYmd],
  );
  const mergedPreviewTags = useMemo(
    () => mergeTags(selectedTags, mainCategoryKey, otherSubCategoryKey),
    [selectedTags, mainCategoryKey, otherSubCategoryKey],
  );

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setOccurredAt(todayYmd);
    setSelectedTags([]);
    setTagDraft('');
    setTagModalVisible(false);
    setMainCategoryKey('walk');
    setOtherSubCategoryKey(null);
    setDateModalVisible(false);
    setDateDraft(todayYmd);
    setSelectedDateShortcut('today');
    setImageUri(null);
    setImageType(null);
    setSaving(false);
  }, [todayYmd]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(RECENT_TAGS_STORAGE_KEY)
        .then(raw => {
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw) as string[];
            if (Array.isArray(parsed)) {
              const next = parsed
                .map(tag => (tag ?? '').trim())
                .filter(Boolean)
                .slice(0, 8);
              if (next.length) setRecentTags(next);
            }
          } catch {
            // ignore
          }
        })
        .catch(() => {});

      resetForm();
      return () => {};
    }, [resetForm]),
  );

  const pickImage = useCallback(async () => {
    if (saving) return;

    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });

    if (res.didCancel) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('이미지 선택 실패', '다시 시도해 주세요.');
      return;
    }

    setImageUri(asset.uri);
    setImageType(resolvePickerMimeType(asset));
  }, [saving]);

  const removeImage = useCallback(() => {
    setImageUri(null);
    setImageType(null);
  }, []);

  const onPressCancel = useCallback(() => {
    resetForm();
    navigation.navigate('HomeTab');
  }, [navigation, resetForm]);

  const onSelectMainCategory = useCallback((nextKey: MainCategoryKey) => {
    setMainCategoryKey(nextKey);
    if (nextKey !== 'other') {
      setOtherSubCategoryKey(null);
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: OtherSubCategoryKey) => {
      setMainCategoryKey('other');
      setOtherSubCategoryKey(nextKey);
    },
    [],
  );

  const clearOtherSubCategory = useCallback(() => {
    setOtherSubCategoryKey(null);
  }, []);

  const onOpenDateModal = useCallback(() => {
    setDateDraft(occurredAt || todayYmd);
    setDateModalVisible(true);
  }, [occurredAt, todayYmd]);

  const onCloseDateModal = useCallback(() => {
    setDateModalVisible(false);
    setDateDraft(occurredAt || todayYmd);
  }, [occurredAt, todayYmd]);

  const onPressDateShortcut = useCallback(
    (key: DateShortcutKey) => {
      const next = key === 'today' ? todayYmd : offsetYmd(todayYmd, -1);
      setSelectedDateShortcut(key);
      setDateDraft(next);
    },
    [todayYmd],
  );

  const onApplyDate = useCallback(() => {
    const next = validateOccurredAt(dateDraft) ?? todayYmd;
    setOccurredAt(next);
    setDateModalVisible(false);
  }, [dateDraft, todayYmd]);

  const onOpenTagModal = useCallback(() => {
    setTagModalVisible(true);
  }, []);

  const onCloseTagModal = useCallback(() => {
    setTagModalVisible(false);
    setTagDraft('');
  }, []);

  const appendTag = useCallback((raw: string) => {
    const parsed = parseTags(raw);
    if (!parsed.length) return;

    setSelectedTags(prev => {
      const next = [...prev];
      for (const tag of parsed) {
        if (!next.includes(tag)) next.push(tag);
      }
      return next.slice(0, 10);
    });
  }, []);

  const onSubmitDraftTag = useCallback(() => {
    appendTag(tagDraft);
    setTagDraft('');
  }, [appendTag, tagDraft]);

  const onPressSuggestedTag = useCallback(
    (tag: string) => {
      appendTag(tag);
    },
    [appendTag],
  );

  const onRemoveTag = useCallback((target: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== target));
  }, []);

  const onSubmit = useCallback(async () => {
    if (disabled || !petId) return;

    try {
      setSaving(true);

      const occurred = validateOccurredAt(occurredAt);
      const mergedTags = mergeTags(
        selectedTags,
        mainCategoryKey,
        otherSubCategoryKey,
      );

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion: null,
        tags: mergedTags,
        occurredAt: occurred,
        imagePath: null,
      });

      if (imageUri) {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id ?? null;
        if (!userId) throw new Error('로그인 정보가 없습니다.');

        const { path } = await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: imageUri,
          mimeType: imageType,
        });

        await updateMemoryImagePath({ memoryId, imagePath: path });
      }

      try {
        const created = await fetchMemoryById(memoryId);
        upsertOneLocal(petId, created);
      } catch {
        // optimistic 반영 실패는 refresh에 맡긴다.
      }

      refresh(petId).catch(() => {});

      if (selectedTags.length > 0) {
        const recentUsedTags = Array.from(
          new Set([...selectedTags, ...recentTags]),
        ).slice(0, 8);
        setRecentTags(recentUsedTags);
        AsyncStorage.setItem(
          RECENT_TAGS_STORAGE_KEY,
          JSON.stringify(recentUsedTags),
        ).catch(() => {});
      }

      resetForm();
      navigation.navigate('TimelineTab');
    } catch (error) {
      Alert.alert('기록 저장 실패', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [
    content,
    disabled,
    imageType,
    imageUri,
    navigation,
    mainCategoryKey,
    otherSubCategoryKey,
    occurredAt,
    petId,
    refresh,
    recentTags,
    resetForm,
    selectedTags,
    trimmedTitle,
    upsertOneLocal,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerSideBtn}
          onPress={onPressCancel}
        >
          <AppText preset="body" style={styles.headerCancelText}>
            취소
          </AppText>
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          기록하기
        </AppText>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerSideBtn}
          disabled={disabled}
          onPress={onSubmit}
        >
          <AppText
            preset="body"
            style={[
              styles.headerDoneText,
              disabled ? styles.headerDoneTextDisabled : null,
            ]}
          >
            {saving ? '저장중' : '완료'}
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.dateCard}
          onPress={onOpenDateModal}
        >
          <View style={styles.dateLeft}>
            <View style={styles.dateIconWrap}>
              <Feather name="calendar" size={16} color="#A4ADBD" />
            </View>
            <AppText preset="body" style={styles.dateText}>
              {formattedDate}
            </AppText>
          </View>
          <Feather
            name="chevron-right"
            size={18}
            color="#C4CAD6"
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.photoBox}
          onPress={pickImage}
        >
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.photoImage} />
              <View style={styles.photoOverlayTop}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.photoGhostBtn}
                  onPress={pickImage}
                >
                  <AppText preset="caption" style={styles.photoGhostBtnText}>
                    변경
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.photoGhostBtn}
                  onPress={removeImage}
                >
                  <AppText preset="caption" style={styles.photoGhostBtnText}>
                    제거
                  </AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconBadge}>
                <Feather name="camera" size={22} color="#94A1B5" />
              </View>
              <AppText preset="body" style={styles.photoPlaceholderTitle}>
                사진 선택 (선택)
              </AppText>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.quickTagRow}>
        {MAIN_CATEGORIES.map(category => {
            const active = category.key === mainCategoryKey;
            return (
              <TouchableOpacity
                key={category.key}
                activeOpacity={0.88}
                style={styles.quickTagItem}
                onPress={() => onSelectMainCategory(category.key)}
              >
                <View
                  style={[
                    styles.quickTagIconWrap,
                    active ? styles.quickTagIconWrapActive : null,
                  ]}
                >
                  <Feather
                    name={category.icon}
                    size={18}
                    color={active ? '#FFFFFF' : '#97A2B6'}
                  />
                </View>
                <AppText
                  preset="caption"
                  style={[
                    styles.quickTagLabel,
                    active ? styles.quickTagLabelActive : null,
                  ]}
                >
                  {category.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMainCategory ? (
          <View style={styles.quickTagHint}>
            <AppText preset="caption" style={styles.quickTagHintText}>
              분류: {selectedMainCategory.label}
              {selectedOtherSubCategory
                ? ` · ${selectedOtherSubCategory.label}`
                : ''}
            </AppText>
          </View>
        ) : null}

        {mainCategoryKey === 'other' ? (
          <View style={styles.otherSubRow}>
            {OTHER_SUBCATEGORIES.map(sub => {
              const active = sub.key === otherSubCategoryKey;
              return (
                <TouchableOpacity
                  key={sub.key}
                  activeOpacity={0.88}
                  style={[
                    styles.otherSubChip,
                    active ? styles.otherSubChipActive : null,
                  ]}
                  onPress={() => onSelectOtherSubCategory(sub.key)}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.otherSubChipText,
                      active ? styles.otherSubChipTextActive : null,
                    ]}
                  >
                    {sub.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}

            {otherSubCategoryKey ? (
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.otherSubClearBtn}
                onPress={clearOtherSubCategory}
              >
                <Feather name="x" size={14} color="#9AA4B6" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            제목
          </AppText>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#B5BDCB"
          />
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            내용 (선택)
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="오늘의 추억을 남겨주세요"
            placeholderTextColor="#B5BDCB"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            태그 (선택)
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.tagSelector}
            onPress={onOpenTagModal}
          >
            {mergedPreviewTags.length ? (
              <View style={styles.selectedTagsWrap}>
                {mergedPreviewTags.map(tag => (
                  <View key={tag} style={styles.selectedTagChip}>
                    <AppText preset="caption" style={styles.selectedTagText}>
                      {tag}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText preset="body" style={styles.tagPlaceholder}>
                태그를 추가하세요
              </AppText>
            )}
            <Feather name="chevron-right" size={18} color="#B5BDCB" />
          </TouchableOpacity>
          <AppText preset="caption" style={styles.helperText}>
            빠른 태그와 함께 최대 10개까지 저장됩니다.
          </AppText>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.bottomSubmitBtn, disabled ? styles.bottomSubmitBtnDisabled : null]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <AppText preset="body" style={styles.bottomSubmitText}>
            {saving ? '기록 저장 중...' : '완료'}
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onCloseDateModal}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalDismissZone}
            onPress={onCloseDateModal}
          />

          <View style={styles.tagModalCard}>
            <View style={styles.tagModalHeader}>
              <AppText preset="headline" style={styles.tagModalTitle}>
                날짜 선택
              </AppText>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.tagModalCloseBtn}
                onPress={onCloseDateModal}
              >
                <Feather name="x" size={18} color="#8E98AA" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateShortcutRow}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.dateShortcutChip,
                  selectedDateShortcut === 'today'
                    ? styles.dateShortcutChipActive
                    : null,
                ]}
                onPress={() => onPressDateShortcut('today')}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.dateShortcutText,
                    selectedDateShortcut === 'today'
                      ? styles.dateShortcutTextActive
                      : null,
                  ]}
                >
                  오늘
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.dateShortcutChip,
                  selectedDateShortcut === 'yesterday'
                    ? styles.dateShortcutChipActive
                    : null,
                ]}
                onPress={() => onPressDateShortcut('yesterday')}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.dateShortcutText,
                    selectedDateShortcut === 'yesterday'
                      ? styles.dateShortcutTextActive
                      : null,
                  ]}
                >
                  어제
                </AppText>
              </TouchableOpacity>
            </View>

            <AppText preset="caption" style={styles.tagSectionTitle}>
              직접 입력
            </AppText>
            <TextInput
              style={styles.dateInput}
              value={dateDraft}
              onChangeText={text => {
                setSelectedDateShortcut('today');
                setDateDraft(text);
              }}
              autoCapitalize="none"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B5BDCB"
            />
            <AppText preset="caption" style={styles.helperText}>
              `YYYY-MM-DD` 형식으로 기록 날짜를 저장합니다.
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.addTagBtn}
              onPress={onApplyDate}
            >
              <AppText preset="body" style={styles.addTagBtnText}>
                날짜 적용
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={tagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onCloseTagModal}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalDismissZone}
            onPress={onCloseTagModal}
          />

          <View style={styles.tagModalCard}>
            <View style={styles.tagModalHeader}>
              <AppText preset="headline" style={styles.tagModalTitle}>
                태그 추가
              </AppText>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.tagModalCloseBtn}
                onPress={onCloseTagModal}
              >
                <Feather name="x" size={18} color="#8E98AA" />
              </TouchableOpacity>
            </View>

            <View style={styles.tagInputRow}>
              <Feather name="hash" size={16} color="#7A71F4" />
              <TextInput
                style={styles.tagModalInput}
                value={tagDraft}
                onChangeText={setTagDraft}
                placeholder="가을산책"
                placeholderTextColor="#B5BDCB"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={onSubmitDraftTag}
              />
            </View>

            <AppText preset="caption" style={styles.tagSectionTitle}>
              추천 태그
            </AppText>
            <View style={styles.tagChipGrid}>
              {SUGGESTED_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.88}
                  style={styles.suggestChip}
                  onPress={() => onPressSuggestedTag(tag)}
                >
                  <AppText preset="caption" style={styles.suggestChipText}>
                    {tag}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <AppText preset="caption" style={styles.tagSectionTitle}>
              최근 사용
            </AppText>
            <View style={styles.recentList}>
              {recentTags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.88}
                  style={styles.recentItem}
                  onPress={() => onPressSuggestedTag(tag)}
                >
                  <Feather name="rotate-ccw" size={15} color="#B6BECC" />
                  <AppText preset="body" style={styles.recentItemText}>
                    {tag}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {selectedTags.length ? (
              <>
                <AppText preset="caption" style={styles.tagSectionTitle}>
                  선택된 태그
                </AppText>
                <View style={styles.tagChipGrid}>
                  {selectedTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      activeOpacity={0.88}
                      style={styles.selectedModalChip}
                      onPress={() => onRemoveTag(tag)}
                    >
                      <AppText
                        preset="caption"
                        style={styles.selectedModalChipText}
                      >
                        {tag}
                      </AppText>
                      <Feather name="x" size={12} color="#6D6AF8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.addTagBtn}
              onPress={() => {
                onSubmitDraftTag();
                onCloseTagModal();
              }}
            >
              <AppText preset="body" style={styles.addTagBtnText}>
                추가하기
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
