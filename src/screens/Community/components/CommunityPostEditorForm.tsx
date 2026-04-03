import React, { memo } from 'react';
import {
  Image,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import type { Pet } from '../../../store/petStore';
import type { CommunityPostCategory } from '../../../types/community';
import { styles } from './CommunityPostEditorForm.styles';
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
  title: string;
  content: string;
  imageUri: string | null;
  imageUris?: string[];
  accentPalette: AccentPalette;
  scrollBottomInset?: number;
  bottomSubmitMargin?: number;
  submitLabel: string;
  submitDisabled: boolean;
  onChangeCategory: (category: CommunityPostCategory) => void;
  onChangeLinkedPetId: (petId: string | null) => void;
  onToggleShowPetAge: () => void;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: string) => void;
  onContentFocus?: () => void;
  onPressPolicy: () => void;
  onPickImage: () => void;
  onRemoveImage: (index?: number) => void;
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
  title,
  content,
  imageUri,
  imageUris,
  accentPalette,
  bottomSubmitMargin = 18,
  submitLabel,
  submitDisabled,
  onChangeCategory,
  onChangeLinkedPetId,
  onToggleShowPetAge,
  onChangeTitle,
  onChangeContent,
  onContentFocus,
  onPressPolicy,
  onPickImage,
  onRemoveImage,
  onImageError,
  onSubmit,
  petHintText,
}: Props) {
  const theme = useTheme();
  const thumbnailUris =
    imageUris && imageUris.length > 0
      ? imageUris.slice(0, 3)
      : imageUri
        ? [imageUri]
        : [];

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

      <View
        style={[
          styles.policyHelperBox,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.policyHelperContent}>
          <AppText
            preset="caption"
            style={[styles.policyHelperTitle, { color: theme.colors.textPrimary }]}
          >
            작성 전 꼭 확인해 주세요
          </AppText>
          <AppText
            preset="caption"
            style={[styles.policyHelperBody, { color: theme.colors.textSecondary }]}
          >
            서로를 존중하는 따뜻한 이야기를 나눠주세요. 욕설, 혐오, 비방 등
            타인에게 불쾌감을 주는 콘텐츠는 운영정책에 의해 숨김 및 제재될 수
            있습니다.
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.policyHelperAction}
          onPress={onPressPolicy}
        >
          <AppText
            preset="caption"
            style={[styles.policyHelperActionText, { color: accentPalette.primary }]}
          >
            운영정책 보기
          </AppText>
        </TouchableOpacity>
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
            <View style={styles.linkedPetMetaRow}>
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
            </View>
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
        <AppText preset="caption" style={[styles.label, { color: theme.colors.textMuted }]}>
          이미지 첨부
        </AppText>
        <View style={styles.thumbnailRow}>
          {[0, 1, 2].map(index => {
            const uri = thumbnailUris[index] ?? null;
            if (uri) {
              return (
                <View key={`image-${index}`} style={styles.thumbnailWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    onError={onImageError}
                  />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.removeImageButton,
                      { backgroundColor: `${theme.colors.textPrimary}D9` },
                    ]}
                    onPress={() => onRemoveImage(index)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={`empty-${index}`}
                activeOpacity={0.9}
                style={[
                  styles.imagePickerSlot,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={onPickImage}
              >
                <Feather name="plus" size={20} color={accentPalette.primary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.bodyHeader}>
          <AppText preset="caption" style={[styles.label, { color: theme.colors.textMuted }]}>
            제목
          </AppText>
          <AppText preset="caption" style={[styles.counter, { color: theme.colors.textMuted }]}>
            {title.length} / 80
          </AppText>
        </View>
        <View
          style={[
            styles.titleInputShell,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TextInput
            value={title}
            onChangeText={onChangeTitle}
            placeholder="제목을 입력해 주세요."
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.titleInput, { color: theme.colors.textPrimary }]}
            maxLength={80}
            returnKeyType="next"
          />
        </View>
      </View>

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
            onFocus={onContentFocus}
            placeholder="우리 아이의 소중한 일상과 고민을 자유롭게 나누어 보세요. (욕설, 비방 등 불쾌감을 주는 내용은 운영정책에 따라 숨김 처리될 수 있습니다.)"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.textPrimary }]}
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>
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


const CommunityPostEditorForm = memo(CommunityPostEditorFormBase);

export default CommunityPostEditorForm;
