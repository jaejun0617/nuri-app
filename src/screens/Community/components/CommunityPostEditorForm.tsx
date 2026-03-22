import React, { memo } from 'react';
import {
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import type { Pet } from '../../../store/petStore';
import type { CommunityPostCategory } from '../../../types/community';
import { COMMUNITY_CATEGORY_OPTIONS } from '../communityPostEditor.shared';

type AccentPalette = {
  primary: string;
  onPrimary: string;
  tint: string;
  deep: string;
};

type Props = {
  pets: Pet[];
  linkedPetId: string | null;
  linkedPet: Pet | null;
  linkedPetMetaLabel: string | null;
  showPetAge: boolean;
  category: CommunityPostCategory;
  content: string;
  imageUri: string | null;
  accentPalette: AccentPalette;
  scrollBottomInset?: number;
  bottomSubmitMargin?: number;
  submitLabel: string;
  submitDisabled: boolean;
  onChangeCategory: (category: CommunityPostCategory) => void;
  onChangeLinkedPetId: (petId: string | null) => void;
  onToggleShowPetAge: () => void;
  onChangeContent: (content: string) => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onImageError?: () => void;
  onSubmit: () => void;
  petHintText?: string | null;
};

function CommunityPostEditorFormBase({
  pets,
  linkedPetId,
  linkedPet,
  linkedPetMetaLabel,
  showPetAge,
  category,
  content,
  imageUri,
  accentPalette,
  bottomSubmitMargin = 18,
  submitLabel,
  submitDisabled,
  onChangeCategory,
  onChangeLinkedPetId,
  onToggleShowPetAge,
  onChangeContent,
  onPickImage,
  onRemoveImage,
  onImageError,
  onSubmit,
  petHintText,
}: Props) {
  const theme = useTheme();

  return (
    <>
      <View style={styles.section}>
        <AppText preset="caption" style={[styles.label, { color: theme.colors.textMuted }]}>
          카테고리
        </AppText>
        <View style={styles.chipRow}>
          {COMMUNITY_CATEGORY_OPTIONS.map(option => {
            const active = option.key === category;
            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.88}
                style={[
                  styles.chip,
                  active
                    ? {
                        backgroundColor: accentPalette.primary,
                        borderColor: accentPalette.primary,
                      }
                    : {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                ]}
                onPress={() => onChangeCategory(option.key)}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.chipText,
                    {
                      color: active
                        ? accentPalette.onPrimary
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {pets.length > 0 ? (
        <View style={styles.section}>
          <AppText preset="caption" style={[styles.label, { color: theme.colors.textMuted }]}>
            반려동물 연결
          </AppText>
          <View style={styles.chipRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.chip,
                linkedPetId === null
                  ? {
                      backgroundColor: accentPalette.primary,
                      borderColor: accentPalette.primary,
                    }
                  : {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
              ]}
              onPress={() => onChangeLinkedPetId(null)}
            >
              <AppText
                preset="caption"
                style={[
                  styles.chipText,
                  {
                    color:
                      linkedPetId === null
                        ? accentPalette.onPrimary
                        : theme.colors.textPrimary,
                  },
                ]}
              >
                연결 안 함
              </AppText>
            </TouchableOpacity>
            {pets.map(pet => {
              const active = pet.id === linkedPetId;
              return (
                <TouchableOpacity
                  key={pet.id}
                  activeOpacity={0.88}
                  style={[
                    styles.chip,
                    active
                      ? {
                          backgroundColor: accentPalette.primary,
                          borderColor: accentPalette.primary,
                        }
                      : {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                        },
                  ]}
                  onPress={() => onChangeLinkedPetId(pet.id)}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.chipText,
                      {
                        color: active
                          ? accentPalette.onPrimary
                          : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {pet.name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {linkedPet ? (
            <View
              style={[
                styles.linkedPetPreview,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {linkedPet.avatarUrl ? (
                <Image
                  source={{ uri: linkedPet.avatarUrl }}
                  style={styles.linkedPetAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.linkedPetAvatarFallback,
                    { backgroundColor: accentPalette.tint },
                  ]}
                >
                  <AppText
                    preset="body"
                    style={[
                      styles.linkedPetAvatarFallbackText,
                      { color: accentPalette.deep },
                    ]}
                  >
                    {linkedPet.name.trim().charAt(0) || 'N'}
                  </AppText>
                </View>
              )}

              <View style={styles.linkedPetInfo}>
                <AppText
                  preset="body"
                  style={[styles.linkedPetName, { color: theme.colors.textPrimary }]}
                >
                  {linkedPet.name}
                </AppText>
                {linkedPetMetaLabel ? (
                  <AppText
                    preset="caption"
                    style={[styles.linkedPetMeta, { color: theme.colors.textSecondary }]}
                  >
                    {linkedPetMetaLabel}
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : null}

          {linkedPet ? (
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.ageToggleButton,
                showPetAge
                  ? {
                      backgroundColor: accentPalette.tint,
                      borderColor: accentPalette.primary,
                    }
                  : {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
              ]}
              onPress={onToggleShowPetAge}
            >
              <Feather
                name={showPetAge ? 'check-circle' : 'circle'}
                size={15}
                color={showPetAge ? accentPalette.primary : theme.colors.textMuted}
              />
              <AppText
                preset="caption"
                style={[
                  styles.ageToggleText,
                  {
                    color: showPetAge
                      ? accentPalette.deep
                      : theme.colors.textPrimary,
                  },
                ]}
              >
                나이 함께 표시
              </AppText>
            </TouchableOpacity>
          ) : null}

          {linkedPet && petHintText ? (
            <AppText
              preset="caption"
              style={[styles.petHintText, { color: theme.colors.textMuted }]}
            >
              {petHintText}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.bodyHeader}>
          <AppText preset="caption" style={[styles.label, { color: theme.colors.textMuted }]}>
            본문
          </AppText>
          <AppText preset="caption" style={[styles.counter, { color: theme.colors.textMuted }]}>
            {content.length} / 5000
          </AppText>
        </View>
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TextInput
            multiline
            value={content}
            onChangeText={onChangeContent}
            placeholder="반려동물과 나누고 싶은 이야기를 적어 보세요."
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.textPrimary }]}
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText preset="caption" style={[styles.label, { color: theme.colors.textMuted }]}>
          이미지 첨부
        </AppText>
        {imageUri ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
              onError={onImageError}
            />
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.removeImageButton,
                { backgroundColor: `${theme.colors.textPrimary}D9` },
              ]}
              onPress={onRemoveImage}
            >
              <Feather name="x" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.imagePickerButton,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onPickImage}
          >
            <Feather name="image" size={18} color={accentPalette.primary} />
            <AppText
              preset="body"
              style={[styles.imagePickerText, { color: theme.colors.textPrimary }]}
            >
              사진 1장 추가하기
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.bottomSubmitButton,
          { marginBottom: bottomSubmitMargin },
          submitDisabled
            ? [
                styles.bottomSubmitButtonDisabled,
                { backgroundColor: `${accentPalette.primary}66` },
              ]
            : {
                backgroundColor: accentPalette.primary,
                shadowColor: accentPalette.deep,
              },
        ]}
        disabled={submitDisabled}
        onPress={onSubmit}
      >
        <AppText
          preset="body"
          style={[styles.bottomSubmitText, { color: accentPalette.onPrimary }]}
        >
          {submitLabel}
        </AppText>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  label: {
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '700',
  },
  linkedPetPreview: {
    marginTop: 2,
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkedPetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  linkedPetAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedPetAvatarFallbackText: {
    fontWeight: '800',
  },
  linkedPetInfo: {
    flex: 1,
    gap: 4,
  },
  linkedPetName: {
    fontWeight: '700',
  },
  linkedPetMeta: {
    lineHeight: 18,
  },
  ageToggleButton: {
    minHeight: 40,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageToggleText: {
    fontWeight: '700',
  },
  petHintText: {
    lineHeight: 18,
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    lineHeight: 18,
  },
  inputShell: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    minHeight: 188,
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
  },
  imageWrap: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButton: {
    minHeight: 56,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imagePickerText: {
    fontWeight: '700',
  },
  bottomSubmitButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bottomSubmitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomSubmitText: {
    fontWeight: '800',
  },
});

const CommunityPostEditorForm = memo(CommunityPostEditorFormBase);

export default CommunityPostEditorForm;
