import React from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import CommunityCreateForm from '../src/screens/Community/components/CommunityCreateForm';
import CommunityCreateAttachments, {
  getCreateThumbnailSize,
} from '../src/screens/Community/components/CommunityCreateAttachments';
import { createFormStyles } from '../src/screens/Community/components/CommunityCreateForm.styles';

type Props = React.ComponentProps<typeof CommunityCreateForm> &
  React.ComponentProps<typeof CommunityCreateAttachments>;

describe('Community create presentation', () => {
  let tree: TestRenderer.ReactTestRenderer;
  let props: Props;
  const render = () => (
    <ThemeProvider theme={createTheme('light')}>
      <CommunityCreateForm {...props} />
      <CommunityCreateAttachments {...props} />
    </ThemeProvider>
  );
  const button = (label: string) =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label)!;
  const toggle = () => button('작성 전 꼭 확인해 주세요');

  beforeEach(() => {
    props = {
      category: 'question',
      title: 'QA 제목',
      content: '작성하던 본문',
      imageUris: [],
      accentPalette: {
        primary: '#B95000',
        onPrimary: '#FFFFFF',
        deep: '#9B4700',
      },
      onChangeCategory: jest.fn(),
      onChangeTitle: jest.fn(),
      onChangeContent: jest.fn(),
      onPressPolicy: jest.fn(),
      onPickImage: jest.fn(),
      onRemoveImage: jest.fn(),
      onImageError: jest.fn(),
    };
    TestRenderer.act(() => {
      tree = TestRenderer.create(render());
    });
  });
  afterEach(() => TestRenderer.act(() => tree.unmount()));

  it('has four compact radio chips without a category heading or bottom submit', () => {
    const chips = tree.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityRole === 'radio');
    expect(chips.map(node => node.props.accessibilityLabel)).toEqual([
      '질문',
      '정보',
      '일상',
      '자유',
    ]);
    expect(chips.map(node => node.props.accessibilityState.checked)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    TestRenderer.act(() => chips[1].props.onPress());
    expect(props.onChangeCategory).toHaveBeenCalledWith('info');
    for (const label of ['카테고리', '글 등록']) {
      expect(tree.root.findAllByProps({ children: label })).toHaveLength(0);
    }
    expect(createFormStyles.categoryFace.paddingVertical).toBe(4);
    expect(createFormStyles.categoryFace.paddingHorizontal).toBe(10);
    expect(createFormStyles.categoryTouch.minHeight).toBe(48);
  });

  it('collapses policy by default and retains title/body identity through toggles', () => {
    const inputs = tree.root.findAllByType(TextInput);
    expect(toggle().props.accessibilityState.expanded).toBe(false);
    expect(
      tree.root.findAllByProps({ testID: 'community-create-policy-body' }),
    ).toHaveLength(0);
    TestRenderer.act(() => toggle().props.onPress());
    expect(toggle().props.accessibilityState.expanded).toBe(true);
    TestRenderer.act(() => button('운영정책 보기').props.onPress());
    expect(props.onPressPolicy).toHaveBeenCalledTimes(1);
    TestRenderer.act(() => toggle().props.onPress());
    const after = tree.root.findAllByType(TextInput);
    expect(after[0]).toBe(inputs[0]);
    expect(after[1]).toBe(inputs[1]);
    expect(after.map(node => node.props.value)).toEqual([
      'QA 제목',
      '작성하던 본문',
    ]);
  });

  it('keeps controlled fields, limits, font scaling and a borderless writing area', () => {
    const [title, body] = tree.root.findAllByType(TextInput);
    TestRenderer.act(() => {
      title.props.onChangeText('새 제목');
      body.props.onChangeText('한글\n이어쓰기');
    });
    expect(props.onChangeTitle).toHaveBeenCalledWith('새 제목');
    expect(props.onChangeContent).toHaveBeenCalledWith('한글\n이어쓰기');
    expect(title.props.maxLength).toBe(80);
    expect(body.props.maxLength).toBe(5000);
    expect(body.props.multiline).toBe(true);
    for (const input of [title, body]) {
      expect(input.props.allowFontScaling).not.toBe(false);
      expect(StyleSheet.flatten(input.props.style)).toMatchObject({
        fontSize: 16,
      });
      expect(StyleSheet.flatten(input.props.style).borderWidth).toBeUndefined();
    }
  });

  it('shows all five ordered thumbnails without horizontal clipping at supported widths', () => {
    props.imageUris = Array.from(
      { length: 5 },
      (_, index) => `file:///qa-${index}.jpg`,
    );
    TestRenderer.act(() => tree.update(render()));
    expect(
      tree.root.findAllByType(Image).map(node => node.props.source.uri),
    ).toEqual(props.imageUris);
    for (const screenWidth of [360, 384, 430]) {
      const availableWidth = screenWidth - 32 - 48 - 8;
      const size = getCreateThumbnailSize(availableWidth);
      expect(size).toBeGreaterThanOrEqual(48);
      expect(size * 5 + 4 * 4).toBeLessThanOrEqual(availableWidth);
    }
    expect(createFormStyles.thumbnails.flexWrap).toBe('wrap');
    expect(createFormStyles.attachmentToolbar.flexDirection).toBe('row');
    expect(createFormStyles.removeTouch.width).toBe(48);
    TestRenderer.act(() => button('사진 3 삭제').props.onPress());
    expect(props.onRemoveImage).toHaveBeenCalledWith(2);
    const photo = button('사진 첨부, 5장, 최대 5장');
    expect(photo.props.disabled).toBe(false);
    TestRenderer.act(() => photo.props.onPress());
    expect(props.onPickImage).toHaveBeenCalledTimes(1);
  });

  it('locks photo changes during submission without changing the draft or remounting inputs', () => {
    props.imageUris = ['file:///qa.jpg'];
    TestRenderer.act(() => tree.update(render()));
    const inputs = tree.root.findAllByType(TextInput);
    props.submitLoading = true;
    TestRenderer.act(() => tree.update(render()));
    expect(button('사진 첨부, 1장, 최대 5장').props.disabled).toBe(true);
    expect(button('사진 1 삭제').props.disabled).toBe(true);
    expect(tree.root.findAllByType(TextInput)[1]).toBe(inputs[1]);
    expect(tree.root.findAllByType(TextInput)[1].props.value).toBe(
      '작성하던 본문',
    );
    expect(tree.root.findAllByType(TextInput)[1].props.editable).toBe(false);
  });
});
