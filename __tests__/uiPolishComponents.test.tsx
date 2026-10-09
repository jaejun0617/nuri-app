import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import MarkerText from '../src/app/ui/MarkerText';
import MedicalRecordFields from '../src/components/records/MedicalRecordFields';
import { emptyHealthCareDetails } from '../src/services/records/metadata';

describe('editorial marker and optional medical fields', () => {
  let tree: TestRenderer.ReactTestRenderer;
  afterEach(() => act(() => tree?.unmount()));
  it('follows native line wrapping without limiting font scaling or creating accessible decoration', () => {
    act(() => {
      tree = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MarkerText>“긴 가이드 제목”</MarkerText>
        </ThemeProvider>,
      );
    });
    const text = tree.root.findByType(Text);
    expect(text.props.allowFontScaling).not.toBe(false);
    const lines = [
      { x: 0, y: 0, width: 210, height: 24 },
      { x: 0, y: 24, width: 85, height: 24 },
    ];
    act(() => text.props.onTextLayout({ nativeEvent: { lines } }));
    act(() => text.props.onTextLayout({ nativeEvent: { lines } }));
    const marks = tree.root
      .findAllByType(View)
      .filter(node => node.props.pointerEvents === 'none');
    expect(marks).toHaveLength(2);
    expect(
      marks.map(node => StyleSheet.flatten(node.props.style).width),
    ).toEqual([210, 85]);
    expect(
      marks.every(
        node => node.props.importantForAccessibility === 'no-hide-descendants',
      ),
    ).toBe(true);
  });
  it('retains other fields when editing or switching kind and preserves keyboard focus callback', () => {
    const onChange = jest.fn();
    const onFocus = jest.fn();
    const value = {
      ...emptyHealthCareDetails('hospital'),
      hospitalName: '누리병원',
      diagnosis: '검진',
    };
    act(() => {
      tree = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MedicalRecordFields
            value={value}
            onChange={onChange}
            onFocus={onFocus}
          />
        </ThemeProvider>,
      );
    });
    const input = tree.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === '약 이름·복약 내용');
    act(() => {
      input?.props.onFocus();
      input?.props.onChangeText('식후 복약');
    });
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({
      ...value,
      medication: '식후 복약',
    });
    act(() =>
      tree.root
        .findAllByProps({ accessibilityLabel: '약·복약' })[0]
        .props.onPress(),
    );
    expect(onChange).toHaveBeenLastCalledWith({ ...value, kind: 'medicine' });
    expect(
      tree.root
        .findAllByType(TextInput)
        .every(node => node.props.maxLength <= 240),
    ).toBe(true);
  });
});
