import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import {
  MONTHLY_DIARY_EMPTY_ART,
  MonthlyDiaryEmptyState,
  styles,
} from '../src/screens/Main/components/LoggedInHome/MonthlyDiaryEmptyState';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import CtaButton from '../src/app/ui/CtaButton';
import type { PetRecordsState } from '../src/store/recordStore';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  FixedTypographyBoundary: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const SEASONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];

describe('seasonal monthly diary empty state', () => {
  it.each(SEASONS)(
    '%s uses a transparent, noninteractive local illustration',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <MonthlyDiaryEmptyState
              season={season}
              recordStatus="ready"
              accentDeepColor="#0754DA"
              onPressRecord={jest.fn()}
            />
          </ThemeProvider>,
        );
      });
      const image = renderer.root.findByType(Image);
      expect(image.props.source).toEqual(MONTHLY_DIARY_EMPTY_ART[season]);
      expect(image.props.resizeMode).toBe('contain');
      expect(image.props.pointerEvents).toBe('none');
      expect(image.props.accessibilityElementsHidden).toBe(true);
      const frame = renderer.root.findByProps({
        testID: 'monthly-diary-illustration-frame',
      });
      expect(StyleSheet.flatten(frame.props.style)).toMatchObject({
        width: '72%',
        maxWidth: 200,
        maxHeight: 200,
        aspectRatio: 1,
      });
      expect(StyleSheet.flatten(image.props.style)).toMatchObject({
        position: 'absolute',
        width: '100%',
        height: '100%',
      });
      const bytes = fs.readFileSync(
        path.join(
          __dirname,
          `../src/assets/seasonal/home/diary/${season}-empty-v1.png`,
        ),
      );
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(bytes.readUInt32BE(20));
      expect([4, 6]).toContain(bytes[25]); // PNG grayscale/RGB with alpha.
      await act(async () => renderer.unmount());
    },
  );

  it.each<PetRecordsState['status']>([
    'idle',
    'loading',
    'refreshing',
    'loadingMore',
    'error',
  ])(
    'does not claim an empty diary while records are %s',
    async recordStatus => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <MonthlyDiaryEmptyState
              season="spring"
              recordStatus={recordStatus}
              accentDeepColor="#0754DA"
              onPressRecord={jest.fn()}
            />
          </ThemeProvider>,
        );
      });
      expect(renderer.root.findAllByType(Image)).toHaveLength(0);
      expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'monthly-diary-empty' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({
          testID:
            recordStatus === 'error'
              ? 'monthly-diary-error'
              : 'monthly-diary-loading',
        }).length,
      ).toBeGreaterThan(0);
      await act(async () => renderer.unmount());
    },
  );

  it('keeps the record action and allows both copy lines to wrap without truncation', async () => {
    const onPressRecord = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MonthlyDiaryEmptyState
            season="autumn"
            recordStatus="ready"
            accentDeepColor="#0754DA"
            onPressRecord={onPressRecord}
          />
        </ThemeProvider>,
      );
    });
    renderer.root.findByType(CtaButton).props.onPress();
    expect(onPressRecord).toHaveBeenCalledTimes(1);
    const action = renderer.root.findByType(CtaButton);
    expect(action.findAll(node => node.props.name === 'edit-3')).toHaveLength(
      0,
    );
    const actionLabel = action.find(
      node =>
        String(node.type) === 'AppText' && node.props.children === '기록하기',
    );
    expect(StyleSheet.flatten(actionLabel.props.style).textAlign).toBe(
      'center',
    );
    expect(StyleSheet.flatten(actionLabel.props.style).alignSelf).toBe(
      'stretch',
    );
    expect(
      StyleSheet.flatten(renderer.root.findByType(CtaButton).props.style)
        .height,
    ).toBe(46);
    const title = renderer.root.find(
      node => node.props.children === '이번 달 일기가 아직 없어요',
    );
    expect(title.props.numberOfLines).toBeUndefined();
    expect(styles.title.textAlign).toBe('center');
    expect(styles.content).not.toHaveProperty('backgroundColor');
    expect(styles.illustration.height).toBe('100%');
    expect(styles.illustrationFrame).not.toHaveProperty('height');
    await act(async () => renderer.unmount());
  });

  it.each([360, 400, 430])(
    'keeps the illustration within a %s dp panel',
    width => {
      const innerWidth = width - 32 - 28 - 16;
      const artWidth = Math.min(
        innerWidth * 0.72,
        styles.illustrationFrame.maxWidth,
      );
      expect(artWidth).toBeLessThanOrEqual(innerWidth);
      expect(artWidth).toBe(200);
      expect(styles.illustrationFrame.maxHeight).toBe(artWidth);
      expect(styles.illustrationFrame.aspectRatio).toBe(1);
    },
  );

  it('prevents the 1254px bitmap height from participating in section layout', () => {
    for (const season of SEASONS) {
      const bytes = fs.readFileSync(
        path.join(
          __dirname,
          `../src/assets/seasonal/home/diary/${season}-empty-v1.png`,
        ),
      );
      expect(bytes.readUInt32BE(20)).toBe(1254);
    }
    expect(styles.illustration).toMatchObject({
      position: 'absolute',
      width: '100%',
      height: '100%',
    });
    expect(styles.illustrationFrame.maxWidth).toBe(200);
    expect(styles.illustrationFrame.maxHeight).toBe(200);
    expect(styles.content.gap).toBe(12);
    expect(styles.copy.gap).toBe(8);
  });

  it('keeps filtering, populated diary cards and both navigation handlers in the Home', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
      ),
      'utf8',
    );
    expect(source).toContain(
      "normalizeCategoryKey(readRecordCategoryRaw(item)) !== 'diary'",
    );
    expect(source).toContain('.slice(0, 7)');
    expect(source).toContain('currentMonthDiaryEntries.map(item => (');
    expect(source).toContain('<MonthlyDiaryCard');
    expect(source).toContain("onPressTimelineCategory('diary')");
    expect(source).toContain('recordStatus={recordStatus}');
    expect(source).toContain('onPressRecord={onPressRecord}');
  });
});
