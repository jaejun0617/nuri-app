import React, { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppTextInput from '../../app/ui/AppTextInput';
import Feather from '../../components/icons/NuriFeatherIcon';
import { Copy, Glass } from './PreviewPrimitives';
import { inquiryTypes, type InquiryCategory } from './previewModel';

export type RegistrationPhoto = {
  id: string;
  uri: string;
  state: 'uploading' | 'ready' | 'failed';
};

/** A form owns presentation only; Auth, upload and idempotent reception remain in the caller. */
export default function InquiryRegistrationForm({
  title,
  body,
  category,
  photos,
  disabled,
  onTitle,
  onBody,
  onCategory,
  onAddPhoto,
  onRemovePhoto,
  onRetryPhoto,
  photoError,
}: {
  title: string;
  body: string;
  category: InquiryCategory;
  photos: RegistrationPhoto[];
  disabled: boolean;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onCategory: (value: InquiryCategory) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (id: string) => void;
  onRetryPhoto: (id: string) => void;
  photoError: string;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<React.ElementRef<typeof AppTextInput>>(null);
  const ink = { color: theme.colors.textPrimary };
  const border = { borderColor: theme.colors.border };
  return (
    <View style={styles.form}>
      <Glass style={styles.category}>
        <Pressable
          testID="inquiry-category-toggle"
          accessibilityRole="button"
          accessibilityLabel="문의 카테고리"
          accessibilityState={{ expanded, disabled }}
          disabled={disabled}
          onPress={() => setExpanded(value => !value)}
          style={styles.categoryRow}
        >
          <Copy muted>문의 유형</Copy>
          <View style={styles.grow}>
            <Copy title>
              {inquiryTypes.find(item => item.value === category)?.label}
            </Copy>
          </View>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        {expanded ? (
          <View accessibilityRole="radiogroup">
            {inquiryTypes.map(item => (
              <Pressable
                key={item.value}
                testID={`inquiry-category-${item.value}`}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{
                  checked: item.value === category,
                  disabled,
                }}
                disabled={disabled}
                style={styles.categoryRow}
                onPress={() => {
                  onCategory(item.value);
                  setExpanded(false);
                }}
              >
                <View style={styles.grow}>
                  <Copy>{item.label}</Copy>
                </View>
                <Feather
                  name={item.value === category ? 'check-circle' : 'circle'}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </Glass>
      <Glass style={styles.editor}>
        <View style={[styles.titleRow, border]}>
          <Copy title>제목</Copy>
          <AppTextInput
            testID="ticket-title"
            accessibilityLabel="문의 제목"
            value={title}
            editable={!disabled}
            onChangeText={onTitle}
            maxLength={80}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
            placeholder="문의 제목을 입력해주세요"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.titleInput, ink]}
          />
        </View>
        <View style={styles.bodySection}>
          <AppTextInput
            ref={bodyRef}
            testID="ticket-draft"
            accessibilityLabel="문의 내용"
            value={body}
            editable={!disabled}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            onChangeText={onBody}
            placeholder="궁금한 점이나 문제가 생긴 상황을 자세히 남겨주세요."
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.bodyInput, ink]}
          />
          <View style={styles.counter}>
            <Copy muted>{body.length} / 2000</Copy>
          </View>
        </View>
        <View style={[styles.attachments, border]}>
          <View style={styles.categoryRow}>
            <View style={styles.grow}>
              <Copy title>사진 첨부</Copy>
              <Copy muted>최대 3장 · 사진당 5MB</Copy>
            </View>
            <Pressable
              testID="ticket-attach-photo"
              accessibilityRole="button"
              accessibilityLabel="사진 첨부"
              accessibilityState={{ disabled: disabled || photos.length >= 3 }}
              disabled={disabled || photos.length >= 3}
              onPress={onAddPhoto}
              style={styles.icon}
            >
              <Feather
                name="image"
                size={22}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
          <View style={styles.photos}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photo}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`사진 ${index + 1} 제거`}
                  disabled={disabled}
                  onPress={() => onRemovePhoto(photo.id)}
                  style={[
                    styles.remove,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Feather
                    name="x"
                    size={18}
                    color={theme.colors.textPrimary}
                  />
                </Pressable>
                <Copy muted>
                  {photo.state === 'ready'
                    ? '첨부됨'
                    : photo.state === 'failed'
                    ? '준비 실패'
                    : '준비 중'}
                </Copy>
                {photo.state === 'failed' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => onRetryPhoto(photo.id)}
                    style={styles.retry}
                  >
                    <Copy>다시 준비</Copy>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
          {photoError ? <Copy>{photoError}</Copy> : null}
        </View>
      </Glass>
      <Copy muted>문의 내용과 사진은 나와 누리팀만 확인할 수 있어요.</Copy>
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: 18 },
  grow: { flex: 1, minWidth: 0 },
  category: { padding: 0 },
  editor: { padding: 14, gap: 16 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleInput: { flex: 1, minHeight: 48, fontSize: 14, paddingVertical: 10 },
  bodySection: { gap: 4 },
  bodyInput: { minHeight: 190, fontSize: 14, lineHeight: 22, padding: 0 },
  counter: { alignItems: 'flex-end' },
  attachments: { borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photo: { width: 84, gap: 4 },
  thumbnail: { width: 84, height: 84, borderRadius: 8 },
  remove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  retry: { minHeight: 44, justifyContent: 'center' },
});
