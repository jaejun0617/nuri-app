import React, { memo, useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import { COMMUNITY_CREATE_PHOTO_LIMIT } from '../communityPostEditor.shared';
import type CommunityPostEditorForm from './CommunityPostEditorForm';
import { createFormStyles as styles } from './CommunityCreateForm.styles';

type Props = Pick<
  React.ComponentProps<typeof CommunityPostEditorForm>,
  | 'imageUris'
  | 'submitLoading'
  | 'onPickImage'
  | 'onRemoveImage'
  | 'onImageError'
>;

// Five thumbnails fit at 360dp; narrower layouts wrap without shrinking touches.
export function getCreateThumbnailSize(availableWidth: number): number {
  return Math.max(48, Math.min(52, Math.floor((availableWidth - 4 * 4) / 5)));
}

function CommunityCreateAttachments({
  imageUris = [],
  submitLoading = false,
  onPickImage,
  onRemoveImage,
  onImageError,
}: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const images = imageUris.slice(0, COMMUNITY_CREATE_PHOTO_LIMIT);
  const size = getCreateThumbnailSize(width);

  return (
    <View
      testID="community-create-attachments"
      style={[
        styles.attachmentToolbar,
        {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View
        testID="community-create-thumbnails"
        style={styles.thumbnails}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
      >
        {images.map((uri, index) => (
          <View key={uri} style={{ width: size, height: size }}>
            <Image
              source={{ uri }}
              accessibilityLabel={`첨부 사진 ${index + 1}`}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={onImageError}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`사진 ${index + 1} 삭제`}
              disabled={submitLoading}
              style={styles.removeTouch}
              onPress={() => onRemoveImage(index)}
            >
              <View style={styles.removeFace}>
                <Feather
                  name="x"
                  size={14}
                  color="#FFFFFF"
                  accessible={false}
                  accessibilityElementsHidden
                />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity
        testID="community-create-photo"
        accessibilityRole="button"
        accessibilityLabel={`사진 첨부, ${images.length}장, 최대 ${COMMUNITY_CREATE_PHOTO_LIMIT}장`}
        accessibilityState={{ disabled: submitLoading }}
        disabled={submitLoading}
        style={[styles.photoAction, submitLoading ? styles.disabled : null]}
        onPress={onPickImage}
      >
        <Feather
          name="image"
          size={22}
          color={theme.colors.textSecondary}
          accessible={false}
          accessibilityElementsHidden
        />
        <AppText
          preset="caption"
          style={[styles.photoCount, { color: theme.colors.textMuted }]}
        >
          {images.length}/{COMMUNITY_CREATE_PHOTO_LIMIT}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

export default memo(CommunityCreateAttachments);
