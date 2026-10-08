import React, { memo, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import { COMMUNITY_CATEGORY_OPTIONS } from '../communityPostEditor.shared';
import type CommunityPostEditorForm from './CommunityPostEditorForm';
import { createFormStyles as styles } from './CommunityCreateForm.styles';

type Props = Pick<
  React.ComponentProps<typeof CommunityPostEditorForm>,
  | 'category'
  | 'title'
  | 'content'
  | 'accentPalette'
  | 'submitLoading'
  | 'onChangeCategory'
  | 'onChangeTitle'
  | 'onChangeContent'
  | 'onPressPolicy'
>;

// Create owns this presentation; the established edit form and its focus
// geometry remain unchanged. Drafts and all writes still belong to the screen.
function CommunityCreateForm({
  category,
  title,
  content,
  accentPalette,
  submitLoading = false,
  onChangeCategory,
  onChangeTitle,
  onChangeContent,
  onPressPolicy,
}: Props) {
  const theme = useTheme();
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const bodyRef = useRef<React.ElementRef<typeof TextInput>>(null);

  return (
    <>
      <View testID="community-create-categories" style={styles.categories}>
        {COMMUNITY_CATEGORY_OPTIONS.map(option => {
          const selected = category === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              style={styles.categoryTouch}
              activeOpacity={0.8}
              disabled={submitLoading}
              onPress={() => onChangeCategory(option.key)}
            >
              <View
                style={[
                  styles.categoryFace,
                  {
                    backgroundColor: selected
                      ? `${accentPalette.primary}14`
                      : theme.colors.surface,
                  },
                ]}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryText,
                    {
                      color: selected
                        ? accentPalette.primary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {option.label}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.policy, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          testID="community-create-policy-toggle"
          accessibilityRole="button"
          accessibilityLabel="작성 전 꼭 확인해 주세요"
          accessibilityState={{ expanded: policyExpanded }}
          activeOpacity={0.8}
          style={styles.policyToggle}
          onPress={() => setPolicyExpanded(value => !value)}
        >
          <AppText
            preset="body"
            style={[styles.policyTitle, { color: theme.colors.textPrimary }]}
          >
            작성 전 꼭 확인해 주세요
          </AppText>
          <Feather
            name={policyExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textSecondary}
            accessible={false}
            accessibilityElementsHidden
          />
        </TouchableOpacity>
        {policyExpanded ? (
          <View testID="community-create-policy-body" style={styles.policyBody}>
            <AppText
              preset="body"
              style={[styles.policyCopy, { color: theme.colors.textSecondary }]}
            >
              서로를 존중하는 따뜻한 이야기를 나눠주세요. 욕설, 혐오, 비방 등
              타인에게 불쾌감을 주는 콘텐츠는 운영정책에 의해 숨김 및 제재될 수
              있습니다.
            </AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="운영정책 보기"
              style={styles.policyAction}
              onPress={onPressPolicy}
            >
              <AppText
                preset="caption"
                style={[
                  styles.policyActionText,
                  { color: accentPalette.primary },
                ]}
              >
                운영정책 보기
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View
        testID="community-composer-title-section"
        style={[styles.titleRow, { borderBottomColor: theme.colors.border }]}
      >
        <AppText
          preset="body"
          style={[styles.titleLabel, { color: theme.colors.textPrimary }]}
        >
          제목
        </AppText>
        <TextInput
          accessibilityLabel="게시글 제목"
          value={title}
          editable={!submitLoading}
          onChangeText={onChangeTitle}
          placeholder="제목을 입력해 주세요."
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.titleInput, { color: theme.colors.textPrimary }]}
          maxLength={80}
          returnKeyType="next"
          onSubmitEditing={() => bodyRef.current?.focus()}
        />
      </View>

      <View testID="community-composer-body-section" style={styles.bodySection}>
        <TextInput
          ref={bodyRef}
          accessibilityLabel="게시글 본문"
          multiline
          value={content}
          editable={!submitLoading}
          onChangeText={onChangeContent}
          placeholder="우리 아이의 일상과 이야기를 나눠 주세요."
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.bodyInput, { color: theme.colors.textPrimary }]}
          maxLength={5000}
          textAlignVertical="top"
        />
        <AppText
          preset="caption"
          style={[styles.counter, { color: theme.colors.textMuted }]}
        >
          {content.length} / 5000
        </AppText>
      </View>
    </>
  );
}

export default memo(CommunityCreateForm);
