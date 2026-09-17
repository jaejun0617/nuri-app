import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunityPostEditorForm, {
  COMMUNITY_EDIT_BODY_VIEWPORT_MIN_HEIGHT,
} from '../src/screens/Community/components/CommunityPostEditorForm';

describe('Community Edit body focus contract', () => {
  it('reserves an edit-only long-form viewport without changing Create defaults', async () => {
    const commonProps = {
      category: 'daily' as const,
      title: '기존 제목',
      content: '기존 본문',
      imageUri: null,
      accentPalette: {
        primary: '#3366FF',
        onPrimary: '#FFFFFF',
        deep: '#183B8F',
      },
      submitLabel: '수정 완료',
      submitDisabled: false,
      onChangeCategory: jest.fn(),
      onChangeTitle: jest.fn(),
      onChangeContent: jest.fn(),
      onPressPolicy: jest.fn(),
      onPickImage: jest.fn(),
      onRemoveImage: jest.fn(),
      onSubmit: jest.fn(),
    };
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <CommunityPostEditorForm
            {...commonProps}
            bodyViewportMinHeight={COMMUNITY_EDIT_BODY_VIEWPORT_MIN_HEIGHT}
          />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('CommunityPostEditorForm did not mount');

    const bodySection = renderer.root.findByProps({
      testID: 'community-composer-body-section',
    });
    const bodyInput = bodySection
      .findAllByType(TextInput)
      .find(input => Boolean(input.props.multiline));
    expect(bodyInput).toBeDefined();
    expect(StyleSheet.flatten(bodyInput?.props.style)).toEqual(
      expect.objectContaining({
        minHeight: COMMUNITY_EDIT_BODY_VIEWPORT_MIN_HEIGHT - 32,
      }),
    );

    TestRenderer.act(() => renderer?.unmount());
  });
});
