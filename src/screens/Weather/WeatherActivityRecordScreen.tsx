// 파일: src/screens/Weather/WeatherActivityRecordScreen.tsx
// 역할:
// - 실내 활동 완료 후 빠르게 감정/메모/태그를 남기는 전용 기록 화면
// - 저장 성공 시 완료 팝업을 보여주고 타임라인으로 이어짐

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  createMemory,
  fetchMemoryById,
} from '../../services/supabase/memories';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import {
  getIndoorActivityGuide,
  type IndoorActivityKey,
} from '../../services/weather/guide';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WeatherActivityRecord'>;

const EMOTION_MAP = {
  excited: 'excited',
  happy: 'happy',
  calm: 'calm',
} as const;

export default function WeatherActivityRecordScreen() {
  const navigation = useNavigation<Nav>();
  const route =
    useRoute<{
      key: string;
      name: 'WeatherActivityRecord';
      params: { guideKey: IndoorActivityKey; district?: string };
    }>();

  const userId = useAuthStore(s => s.session?.user?.id ?? null);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const refresh = useRecordStore(s => s.refresh);

  const petId = useMemo(() => {
    if (selectedPetId && pets.some(item => item.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [pets, selectedPetId]);
  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const guide = useMemo(
    () => getIndoorActivityGuide(route.params.guideKey),
    [route.params.guideKey],
  );

  const [imageUri, setImageUri] = useState<string | null>(
    selectedPet?.avatarUrl ?? null,
  );
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [title, setTitle] = useState(guide.recordDraft.title);
  const [note, setNote] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<
    keyof typeof EMOTION_MAP
  >(guide.recordDraft.emotionOptions[0]?.key ?? 'happy');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    guide.recordDraft.suggestedTags,
  );
  const [saving, setSaving] = useState(false);
  const [doneVisible, setDoneVisible] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag],
    );
  }, []);

  const onPickImage = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });

    if (result.didCancel) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        new Error('image pick failed'),
        'image-pick',
      );
      Alert.alert(alertTitle, message);
      return;
    }

    setImageUri(asset.uri);
    setImageMimeType(asset.type ?? null);
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

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: note.trim() || null,
        emotion: EMOTION_MAP[selectedEmotion],
        tags: selectedTags,
        occurredAt: new Date().toISOString().slice(0, 10),
      });

      if (imageUri && imageUri !== selectedPet?.avatarUrl) {
        await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: imageUri,
          mimeType: imageMimeType ?? 'image/jpeg',
        }).catch(() => null);
      }

      const created = await fetchMemoryById(memoryId);
      upsertOneLocal(petId, created);
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
    selectedPet?.avatarUrl,
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.headerSide}
          onPress={() => navigation.goBack()}
        >
          <Feather name="chevron-left" size={22} color="#1B2434" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>기록하기</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>{guide.title} 완료!</Text>
            <Text style={styles.summaryLink}>오늘의 활동 요약</Text>
          </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons
              name={guide.heroIcon as never}
              size={24}
              color="#7A45F4"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>사진 업로드</Text>
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.imageCard}
            onPress={onPickImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons
                  name={guide.heroIcon as never}
                  size={54}
                  color="#B39AF5"
                />
              </View>
            )}

            <View style={styles.imageEditButton}>
              <Feather name="edit-3" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>오늘 아이의 기분은?</Text>
          <View style={styles.emotionRow}>
            {guide.recordDraft.emotionOptions.map(option => {
              const active = selectedEmotion === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.9}
                  style={[styles.emotionChip, active ? styles.emotionChipActive : null]}
                  onPress={() => setSelectedEmotion(option.key)}
                >
                  <Text style={styles.emotionEmoji}>{option.emoji}</Text>
                  <Text style={[styles.emotionLabel, active ? styles.emotionLabelActive : null]}>
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
            style={styles.input}
            placeholder="제목을 입력해 주세요"
            placeholderTextColor="#B8C0CF"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={styles.textarea}
            multiline
            placeholder={guide.recordDraft.notePrompt}
            placeholderTextColor="#B8C0CF"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.tagHeader}>
            <Text style={styles.label}>태그</Text>
            <Text style={styles.tagAdd}>+ 추가</Text>
          </View>
          <View style={styles.tagRow}>
            {guide.recordDraft.suggestedTags.map(tag => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.9}
                  style={[styles.tagChip, active ? styles.tagChipActive : null]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, active ? styles.tagTextActive : null]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
          onPress={onSubmit}
          disabled={saving}
        >
          <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {saving ? '저장 중...' : '기록 저장하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
                color="#2280E3"
              />
            </View>
            <Text style={styles.modalTitle}>{guide.recordDraft.completionTitle}</Text>
            <Text style={styles.modalBody}>{guide.recordDraft.completionBody}</Text>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.modalButton}
              onPress={onPressDone}
            >
              <Text style={styles.modalButtonText}>확인</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FBFAFD',
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#1B2434',
    fontWeight: '700',
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
    gap: 10,
  },
  emotionChip: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
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
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA6B7',
    fontWeight: '600',
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
    fontSize: 18,
    lineHeight: 24,
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
