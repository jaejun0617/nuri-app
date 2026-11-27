import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import {
  InquiryListItem,
  InquiryMessage,
  InquiryStatus,
  inquiryDate,
} from '../src/screens/Support/InquiryPresentation';
import { Copy } from '../src/screens/Support/PreviewPrimitives';
import IsolatedCommunityNotices from '../src/screens/SupportIsolation/IsolatedCommunityNotices';
import { IsolatedNoticeClient } from '../src/screens/SupportIsolation/isolatedNoticeClient';

afterEach(() => jest.restoreAllMocks());

function luminance(hex: string) {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  return [0.2126, 0.7152, 0.0722].reduce((value, weight, index) => {
    const channel = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value + weight * (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  }, 0);
}

it.each(['light', 'dark'] as const)('distinguishes reply states with opaque surfaces and legible labels in %s mode', async mode => {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme(mode)}>
        {['답변 완료', '답변 대기', '종료'].map(label => <InquiryStatus key={label} label={label} />)}
      </ThemeProvider>,
    );
  });
  try {
    const surfaces = tree.root.findAllByType(InquiryStatus).map(status => {
      const background: string = StyleSheet.flatten(status.findByType(View).props.style).backgroundColor;
      const text = status.findByType(Text);
      expect(text.props.children).toBe(status.props.label);
      if (status.props.label !== '종료') {
        const a = luminance(background);
        const b = luminance(StyleSheet.flatten(text.props.style).color);
        expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
      } else {
        expect(background).toBe(createTheme(mode).colors.surface);
      }
      return background;
    });
    expect(new Set(surfaces).size).toBe(3);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});

it('uses KST at the date boundary and distinguishes morning and afternoon', () => {
  expect(inquiryDate('2026-11-13T15:05:00Z', true)).toBe(
    '2026.11.14 · 오전 12:05',
  );
  expect(inquiryDate('2026-11-13T03:05:00Z', true)).toBe(
    '2026.11.13 · 오후 12:05',
  );
  expect(inquiryDate('invalid')).toBeNull();
});

it('keeps the list actionable and renders question and reply on opposite sides', async () => {
  const open = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <InquiryListItem
          testID="inquiry"
          title="오류·불편"
          status="새 답변"
          unread
          date="2026.11.13"
          onPress={open}
        />
        <InquiryMessage testID="question" outgoing name="나">
          <Copy>질문</Copy>
        </InquiryMessage>
        <InquiryMessage
          testID="answer"
          outgoing={false}
          name="누리팀"
          showAvatar
        >
          <Copy>답변</Copy>
        </InquiryMessage>
      </ThemeProvider>,
    );
  });
  try {
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: 'inquiry' }).props.onPress(),
    );
    expect(open).toHaveBeenCalledTimes(1);
    const renderedView = (testID: string) =>
      tree.root.find(
        node => node.type === View && node.props.testID === testID,
      );
    const question = renderedView('question');
    const answer = renderedView('answer');
    expect(StyleSheet.flatten(question.props.style).justifyContent).toBe(
      'flex-end',
    );
    expect(StyleSheet.flatten(answer.props.style).justifyContent).not.toBe(
      'flex-end',
    );
    expect(JSON.stringify(tree.toJSON())).toContain('새 답변');
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});

it.each([false, true])(
  'gates community notice creation, editing and removal by the server result (%s)',
  async allowed => {
    const client = new IsolatedNoticeClient();
    const item = {
      id: 'qa-notice',
      title: '격리 공지',
      body: '본문',
      updatedAt: '2026-11-13T00:00:00Z',
    };
    jest.spyOn(client, 'communityAllowed').mockResolvedValue(allowed);
    jest
      .spyOn(client, 'communityNotices')
      .mockResolvedValue({ items: [item], nextCursor: null });
    let tree!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <IsolatedCommunityNotices
            client={client}
            onError={jest.fn()}
            onBack={jest.fn()}
          />
        </ThemeProvider>,
      );
    });
    try {
      expect(
        tree.root.findAllByProps({ testID: 'community-notice-new' }).length > 0,
      ).toBe(allowed);
      const row = tree.root.findByProps({
        testID: 'community-notice-qa-notice',
      });
      await TestRenderer.act(async () => row.props.onPress());
      for (const testID of ['community-notice-edit', 'community-notice-hide']) {
        expect(tree.root.findAllByProps({ testID }).length > 0).toBe(allowed);
      }
    } finally {
      await TestRenderer.act(async () => tree.unmount());
    }
  },
);
