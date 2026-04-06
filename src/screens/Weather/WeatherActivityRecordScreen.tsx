// 파일: src/screens/Weather/WeatherActivityRecordScreen.tsx
// 역할:
// - 실내 활동 완료 후 빠르게 감정/메모/태그를 남기는 전용 기록 화면
// - 저장 성공 시 완료 팝업을 보여주고 타임라인으로 이어짐

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import PhotoAddCard from '../../components/media/PhotoAddCard';
import RecordTagModal from '../Records/components/RecordTagModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import {
  parseRecordTags,
} from '../../services/records/form';
import {
  createMemory,
  fetchMemoryById,
  updateMemoryImagePaths,
} from '../../services/supabase/memories';
import { normalizeMemoryRecord } from '../../services/records/imageSources';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import {
  getIndoorActivityGuide,
  WEATHER_RECORD_EMOTION_OPTIONS,
  type WeatherRecordEmotionKey,
} from '../../services/weather/guide';
import { getKstYmd } from '../../utils/date';
import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WeatherActivityRecord'>;
type Route = RootScreenRoute<'WeatherActivityRecord'>;

const EMOTION_MAP = {
  excited: 'excited',
  happy: 'happy',
  calm: 'calm',
  neutral: 'neutral',
  tired: 'tired',
  sad: 'sad',
  anxious: 'anxious',
  angry: 'angry',
} as const;

export default function WeatherActivityRecordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const userId = useAuthStore(s => s.session?.user?.id ?? null);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const refresh = useRecordStore(s => s.refresh);

  const petId = useMemo(() => {
    return resolveSelectedPetId(pets, selectedPetId);
  }, [pets, selectedPetId]);
  const guideKey = route.params.guideKey;
  const district = route.params?.district?.trim() || '현재 위치';
  const guide = useMemo(() => getIndoorActivityGuide(guideKey), [guideKey]);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === petId) ?? pets[0] ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedEmotion, setSelectedEmotion] =
    useState<WeatherRecordEmotionKey>('happy');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    guide.recordDraft.suggestedTags,
  );
  const [tagDraft, setTagDraft] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doneVisible, setDoneVisible] = useState(false);
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag],
    );
  }, []);

  const onChangeTagDraft = useCallback((value: string) => {
    setTagDraft(value);
  }, []);

  const onSubmitDraftTag = useCallback(() => {
    const parsedTags = parseRecordTags(tagDraft);
    if (parsedTags.length === 0) return;

    setSelectedTags(prev => Array.from(new Set([...prev, ...parsedTags])));
    setTagDraft('');
  }, [tagDraft]);

  const onPickImage = useCallback(async () => {
    try {
      const result = await pickPhotoAssets({
        selectionLimit: 1,
        quality: 0.9,
      });
      if (result.status === 'cancelled') return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMimeType(asset.mimeType);
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'image-pick',
      );
      showToast({ tone: 'error', title: alertTitle, message });
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (saving) return;
    if (!petId) {
      Alert.alert('아이를 먼저 선택해 주세요.');
      return;
    }
    if (!userId) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        new Error('not authenticated'),
        'record-create',
      );
      Alert.alert(alertTitle, message);
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('기록 제목을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      let savedImagePaths: string[] = [];
      const occurredAt = getKstYmd();
      const createdAt = new Date().toISOString();

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: note.trim() || null,
        emotion: EMOTION_MAP[selectedEmotion],
        tags: selectedTags,
        occurredAt,
      });

      if (imageUri) {
        const uploaded = await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: imageUri,
          mimeType: imageMimeType ?? 'image/jpeg',
        });
        const saveResult = await updateMemoryImagePaths({
          memoryId,
          imagePaths: [uploaded.path],
        });
        savedImagePaths = saveResult.savedPaths;
      }

      try {
        const created = await fetchMemoryById(memoryId);
        upsertOneLocal(petId, created);
      } catch {
        upsertOneLocal(
          petId,
          normalizeMemoryRecord({
            id: memoryId,
            petId,
            title: trimmedTitle,
            content: note.trim() || null,
            emotion: EMOTION_MAP[selectedEmotion],
            tags: selectedTags,
            occurredAt,
            createdAt,
            imagePath: savedImagePaths[0] ?? null,
            imagePaths: savedImagePaths,
            imageUrl: null,
          }),
        );
      }
      refresh(petId).catch(() => null);

      setDoneVisible(true);
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'record-create',
      );
      Alert.alert(alertTitle, message);
    } finally {
      setSaving(false);
    }
  }, [
    imageMimeType,
    imageUri,
    note,
    petId,
    refresh,
    saving,
    selectedEmotion,
    selectedTags,
    title,
    upsertOneLocal,
    userId,
  ]);

  const onPressDone = useCallback(() => {
    setDoneVisible(false);
    navigation.navigate('AppTabs', {
      screen: 'TimelineTab',
      params: {
        screen: 'TimelineMain',
        params: { mainCategory: 'all' },
      },
    });
  }, [navigation]);

  const handleFocusField = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.assureFocusedInputVisible();
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.keyboardContent}>
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.headerSide}
              onPress={onPressBack}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="arrow-left" size={20} color="#102033" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>기록하기</Text>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <KeyboardAwareScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 28, 40) },
          ]}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>{guide.title} 완료!</Text>
              <Text style={[styles.summaryLink, { color: petTheme.primary }]}>
                {district} 활동 기록
              </Text>
            </View>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor: petTheme.tint,
                  borderColor: petTheme.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={guide.heroIcon as never}
                size={24}
                color={petTheme.primary}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>사진 업로드</Text>
            <PhotoAddCard
              imageUri={imageUri}
              onPress={onPickImage}
              containerStyle={styles.imageCard}
              imageStyle={styles.image}
              placeholderStyle={styles.imagePlaceholder}
              placeholderIconName="image"
              placeholderIconColor={petTheme.primary}
              placeholderIconSize={54}
            placeholderText="사진을 추가해 주세요"
            placeholderTextStyle={styles.imagePlaceholderText}
            editButtonStyle={[
              styles.imageEditButton,
              { backgroundColor: petTheme.primary },
            ]}
            editIconSize={16}
          />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>오늘 아이의 기분은?</Text>
            <View style={styles.emotionRow}>
              {WEATHER_RECORD_EMOTION_OPTIONS.map(option => {
                const active = selectedEmotion === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.9}
                    style={[
                      styles.emotionChip,
                      active ? styles.emotionChipActive : null,
                      active
                        ? {
                            borderColor: petTheme.border,
                            backgroundColor: petTheme.tint,
                          }
                        : null,
                    ]}
                    onPress={() => setSelectedEmotion(option.key)}
                  >
                    <Text style={styles.emotionEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.emotionLabel,
                        active ? styles.emotionLabelActive : null,
                        active ? { color: petTheme.deep } : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={handleFocusField}
              style={styles.input}
              placeholder={guide.recordDraft.title}
              placeholderTextColor="#B8C0CF"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>메모</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              onFocus={handleFocusField}
              style={styles.textarea}
              multiline
              placeholder={guide.recordDraft.notePrompt}
              placeholderTextColor="#B8C0CF"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.tagHeader}>
              <Text style={styles.label}>태그</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setTagModalVisible(true)}
              >
                <Text style={[styles.tagAdd, { color: petTheme.primary }]}>
                  + 추가
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagRow}>
              {guide.recordDraft.suggestedTags.map(tag => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.9}
                    style={[
                      styles.tagChip,
                      active ? styles.tagChipActive : null,
                      active ? { backgroundColor: petTheme.tint } : null,
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        active ? styles.tagTextActive : null,
                        active ? { color: petTheme.deep } : null,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              { backgroundColor: petTheme.primary },
              saving ? styles.primaryButtonDisabled : null,
            ]}
            onPress={onSubmit}
            disabled={saving}
          >
            <MaterialCommunityIcons
              name="content-save-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              {saving ? '저장 중...' : '기록 저장하기'}
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>

      <Modal
        visible={doneVisible}
        transparent
        animationType="fade"
        onRequestClose={onPressDone}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={48}
                color={petTheme.primary}
              />
            </View>
            <Text style={styles.modalTitle}>{guide.recordDraft.completionTitle}</Text>
            <Text style={styles.modalBody}>{guide.recordDraft.completionBody}</Text>
            <TouchableOpacity
              activeOpacity={0.92}
              style={[styles.modalButton, { backgroundColor: petTheme.primary }]}
              onPress={onPressDone}
            >
              <Text style={styles.modalButtonText}>확인</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <RecordTagModal
        visible={tagModalVisible}
        tagDraft={tagDraft}
        selectedTags={selectedTags}
        onClose={() => {
          setTagDraft('');
          setTagModalVisible(false);
        }}
        onChangeTagDraft={onChangeTagDraft}
        onSubmitDraftTag={onSubmitDraftTag}
        onRemoveTag={toggleTag}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FBFAFD',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#FBFAFD',
  },
  keyboardContent: {
    flex: 1,
    backgroundColor: '#FBFAFD',
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerSide: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    color: '#0B1220',
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 18,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE6FB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTextWrap: {
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1B2434',
    fontWeight: '700',
  },
  summaryLink: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F0E8FF',
    borderWidth: 1,
    borderColor: '#EFE6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2B3342',
    fontWeight: '600',
  },
  imageCard: {
    height: 238,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#EEEAF7',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imagePlaceholderText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#98A3B6',
    fontWeight: '500',
  },
  imageEditButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionChip: {
    width: '22.8%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emotionChipActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FBF7FF',
  },
  emotionEmoji: {
    fontSize: 22,
  },
  emotionLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: '#9CA6B7',
    fontWeight: '500',
    textAlign: 'center',
  },
  emotionLabelActive: {
    color: '#7A45F4',
  },
  input: {
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7EAF2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#1B2434',
    fontSize: 16,
    fontWeight: '500',
  },
  textarea: {
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7EAF2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1B2434',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    fontWeight: '400',
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagAdd: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF1F6',
  },
  tagChipActive: {
    backgroundColor: '#EBDDFF',
  },
  tagText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#93A0B4',
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#7A45F4',
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7A45F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 12,
  },
  modalIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#182133',
    fontWeight: '700',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8B96AA',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 6,
    height: 54,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#2280E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
