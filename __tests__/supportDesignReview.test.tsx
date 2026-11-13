import React from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import { NuriAlert as Alert } from '../src/app/ui/NuriAlert';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createTheme } from '../src/app/theme/theme';
import SupportDesignReview from '../src/screens/Support/SupportDesignReview';
import { CtaText } from '../src/app/ui/CtaButton';
import {
  canPreviewRefund,
  type PreviewPage,
} from '../src/screens/Support/previewModel';
import { IsolatedNoticeClient } from '../src/screens/SupportIsolation/isolatedNoticeClient';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));

const session = {};
async function render(
  initialPage: PreviewPage = 'subscription',
  ownerRole = 'user',
  subscription?: React.ComponentProps<
    typeof SupportDesignReview
  >['subscription'],
) {
  const dismiss = jest.fn();
  const props = {
    ownerSession: session,
    ownerRole,
    initialPage,
    subscription,
    onDismiss: dismiss,
  };
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <SupportDesignReview {...props} />
      </ThemeProvider>,
    );
  });
  return { tree, props, dismiss };
}
async function press(tree: TestRenderer.ReactTestRenderer, testID: string) {
  await TestRenderer.act(async () =>
    tree.root.findByProps({ testID }).props.onPress(),
  );
}
async function dispose(tree: TestRenderer.ReactTestRenderer) {
  await TestRenderer.act(async () => tree.unmount());
}

describe('NURI-15 local design review (not server or device acceptance)', () => {
  it('shows the ad removal setting without a separate subscription button', async () => {
    const { tree } = await render('adRemoval');
    try {
      const description = tree.root.findAllByProps({
        testID: 'ad-removal-description',
      })[0];
      expect(description.props.children).toBe(
        '광고 없이 사진을 올리고, 소중한 추억이 머무는 공간을 가꿔보세요.',
      );
      expect(StyleSheet.flatten(description.props.style).fontSize).toBe(12);
      expect(tree.root.findAllByProps({ children: '구독 혜택' })).toHaveLength(
        0,
      );
      expect(
        tree.root.findAllByProps({ children: '구독 혜택 보기' }),
      ).toHaveLength(0);
      const crown = tree.root.findAllByProps({ testID: 'ad-removal-crown' })[0];
      expect(StyleSheet.flatten(crown.props.style)).toMatchObject({
        width: 32,
        height: 24,
      });
      const toggle = tree.root.findAllByProps({
        testID: 'ad-removal-switch',
      })[0];
      expect(toggle.props).toMatchObject({ disabled: true, value: false });
    } finally {
      await dispose(tree);
    }
  });

  it('lets a subscriber switch ad hiding on in the local preview', async () => {
    const { tree } = await render('adRemoval', 'user', {
      status: 'active',
      plan: 'memory',
      period: 'year',
    });
    try {
      const toggle = () =>
        tree.root.findAllByProps({ testID: 'ad-removal-switch' })[0];
      expect(toggle().props).toMatchObject({ disabled: false, value: false });
      await TestRenderer.act(async () => toggle().props.onValueChange(true));
      expect(toggle().props.value).toBe(true);
    } finally {
      await dispose(tree);
    }
  });

  it.each(['adminNotices', 'adminSupport', 'adminFaq'] as const)(
    'does not expose %s to a normal account',
    async page => {
      const { tree } = await render(page);
      expect(tree.toJSON()).toBeNull();
      await dispose(tree);
    },
  );

  it.each(['adminNotices', 'adminFaq'] as const)(
    'keeps %s draft on preview Back, and requires discard confirmation',
    async page => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { tree, dismiss } = await render(page, 'admin');
      try {
        await press(tree, 'admin-new');
        await TestRenderer.act(async () => {
          tree.root
            .findByProps({ testID: 'admin-title' })
            .props.onChangeText('새 제목');
          tree.root
            .findByProps({ testID: 'admin-body' })
            .props.onChangeText('새 본문');
        });
        await press(tree, 'admin-preview');
        await TestRenderer.act(async () =>
          tree.root.findByType(Modal).props.onRequestClose(),
        );
        expect(
          tree.root.findByProps({ testID: 'admin-title' }).props.value,
        ).toBe('새 제목');
        await press(tree, 'preview-back');
        expect(alert).toHaveBeenLastCalledWith(
          '작성 중인 내용이 있어요',
          expect.any(String),
          expect.any(Array),
        );
        expect(dismiss).not.toHaveBeenCalled();
        expect(
          tree.root.findByProps({ testID: 'admin-body' }).props.value,
        ).toBe('새 본문');
        await press(tree, 'admin-save-draft');
        await press(tree, 'choice-draft');
        expect(JSON.stringify(tree.toJSON())).toContain('새 제목');
        expect(
          alert.mock.calls.some(([title]) => title === '게시할까요?'),
        ).toBe(false);
      } finally {
        await dispose(tree);
        alert.mockRestore();
      }
    },
  );

  it('protects the reply draft for both list and Android Back until discard', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { tree, dismiss } = await render('adminSupport', 'admin');
    try {
      await press(tree, 'admin-open-ticket');
      await TestRenderer.act(async () =>
        tree.root
          .findByProps({ testID: 'admin-reply-input' })
          .props.onChangeText('확인할게요'),
      );
      expect(
        tree.root.findByProps({ testID: 'admin-reply-send' }).props.disabled,
      ).toBe(true);
      await press(tree, 'admin-ticket-list');
      expect(alert).toHaveBeenLastCalledWith(
        '작성 중인 답변이 있어요',
        expect.any(String),
        expect.any(Array),
      );
      await TestRenderer.act(async () =>
        tree.root.findByType(Modal).props.onRequestClose(),
      );
      expect(dismiss).not.toHaveBeenCalled();
      expect(
        tree.root.findByProps({ testID: 'admin-reply-input' }).props.value,
      ).toBe('확인할게요');
      await press(tree, 'admin-claim');
      expect(
        tree.root.findByProps({ testID: 'admin-reply-send' }).props.disabled,
      ).toBe(false);
      await press(tree, 'choice-information');
      await press(tree, 'admin-reply-send');
      expect(JSON.stringify(tree.toJSON())).toContain(
        '사용자 응답을 기다리고 있어요.',
      );
      expect(
        tree.root.findByProps({ testID: 'admin-reply-input' }).props.value,
      ).toBe('');
      await press(tree, 'admin-ticket-list');
      expect(
        tree.root.findAllByProps({ testID: 'admin-open-ticket' }).length,
      ).toBeGreaterThan(0);
    } finally {
      await dispose(tree);
      alert.mockRestore();
    }
  });
  it.each([
    ['year', 'memory', '49,000원'],
    ['month', 'memory', '4,900원'],
    ['year', 'plus', '79,000원'],
    ['month', 'plus', '7,900원'],
  ])(
    'matches the %s %s price in the purchase action',
    async (period, plan, price) => {
      const { tree } = await render();
      await press(tree, `choice-${period}`);
      await press(tree, `plan-${plan}`);
      const action = tree.root.findByProps({ testID: 'preview-subscribe' });
      expect(
        React.Children.toArray(action.findByType(CtaText).props.children).join(
          '',
        ),
      ).toBe(`${period === 'year' ? '연' : '월'} ${price} 구독하기`);
      const screen = JSON.stringify(tree.toJSON());
      expect(screen).not.toContain('미리보기');
      expect(screen).not.toContain('가격 미정');
      await dispose(tree);
    },
  );
  it('keeps cancellation within the scrollable subscription card and shows no profile copy', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { tree } = await render();
    expect(
      tree.root.findAllByProps({ testID: 'preview-open-refund' }),
    ).toHaveLength(0);
    await press(tree, 'choice-month');
    await press(tree, 'plan-plus');
    expect(JSON.stringify(tree.toJSON())).toContain('7,900원');
    await press(tree, 'preview-subscribe');
    expect(
      tree.root.findByProps({ testID: 'preview-subscription-status' }).props
        .children,
    ).toBe('이용 중');
    expect(
      tree.root.findAllByProps({ testID: 'subscriber-preview-badge' }).length,
    ).toBe(0);
    expect(
      tree.root.findAllByProps({ testID: 'subscriber-preview-crown' }).length,
    ).toBe(0);
    const scrolling = tree.root
      .findAllByType(ScrollView)
      .find(
        view =>
          view.findAllByProps({ testID: 'preview-cancel-subscription' })
            .length > 0,
      );
    expect(scrolling).toBeDefined();
    expect(
      tree.root.findAllByProps({ testID: 'preview-subscribe' }),
    ).toHaveLength(0);
    await press(tree, 'preview-cancel-subscription');
    await TestRenderer.act(async () => {
      alert.mock.calls
        .at(-1)?.[2]
        ?.find(button => button.text === '해지하기')
        ?.onPress?.();
    });
    expect(
      tree.root.findByProps({ testID: 'preview-subscription-status' }).props
        .children,
    ).toBe('취소 예정');
    alert.mockRestore();
    await dispose(tree);
  });

  it('discards local subscription on close and new entry', async () => {
    const { tree, dismiss } = await render();
    await press(tree, 'preview-subscribe');
    await press(tree, 'preview-close');
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType(Modal)).toHaveLength(0);
    await dispose(tree);
    const next = await render();
    expect(
      next.tree.root.findByProps({ testID: 'preview-subscription-status' })
        .props.children,
    ).toBe('구독 없음');
    await dispose(next.tree);
  });

  it.each(['session', 'role'] as const)(
    'unmounts sensitive preview state on %s boundary change',
    async boundary => {
      const { tree, props, dismiss } = await render();
      await press(tree, 'preview-subscribe');
      await TestRenderer.act(async () =>
        tree.update(
          <ThemeProvider theme={createTheme('light')}>
            <SupportDesignReview
              {...props}
              ownerSession={boundary === 'session' ? {} : session}
              ownerRole={boundary === 'role' ? null : 'user'}
            />
          </ThemeProvider>,
        ),
      );
      expect(tree.root.findAllByType(Modal)).toHaveLength(0);
      expect(dismiss).toHaveBeenCalled();
      await dispose(tree);
    },
  );

  it('keeps Android Modal Back inside the review before dismissing the menu overlay', async () => {
    const { tree, dismiss } = await render('help');
    await press(tree, 'preview-inquiry');
    await TestRenderer.act(async () =>
      tree.root.findByType(Modal).props.onRequestClose(),
    );
    expect(
      tree.root.findAllByProps({ testID: 'preview-inquiry' }).length,
    ).toBeGreaterThan(0);
    expect(dismiss).not.toHaveBeenCalled();
    await TestRenderer.act(async () =>
      tree.root.findByType(Modal).props.onRequestClose(),
    );
    expect(dismiss).toHaveBeenCalledTimes(1);
    await dispose(tree);
  });

  it('shows concrete notice text with a KST publication time and visible FAQ search hint', async () => {
    const { tree } = await render('notices');
    await press(tree, 'notice-preview-update');
    const screen = JSON.stringify(tree.toJSON());
    expect(screen).toContain('오전 9:00');
    expect(screen).toContain('자주 쓰는 기록');
    await dispose(tree);
    const faq = await render('faq');
    const search = faq.tree.root.findByProps({ testID: 'support-faq-search' });
    expect(search.props.placeholderTextColor).toBe(
      createTheme('light').colors.textSecondary,
    );
    await TestRenderer.act(async () => search.props.onChangeText('회원탈퇴'));
    expect(JSON.stringify(faq.tree.toJSON())).toContain(
      '로그아웃과 회원탈퇴는 어떻게 다른가요?',
    );
    await dispose(faq.tree);
  });

  it('routes the selected category to the real composer, without fetching inquiry history first', async () => {
    const login = jest
      .spyOn(IsolatedNoticeClient.prototype, 'login')
      .mockResolvedValue('qa');
    const list = jest
      .spyOn(IsolatedNoticeClient.prototype, 'myTickets')
      .mockResolvedValue([]);
    const { tree } = await render('help');
    try {
      await press(tree, 'preview-inquiry');
      expect(tree.root.findAllByProps({ testID: 'ticket-draft' })).toHaveLength(
        0,
      );
      await press(tree, 'preview-enter-thread');
      expect(tree.root.findAllByProps({ testID: 'ticket-draft' })).toHaveLength(
        0,
      );
      await TestRenderer.act(async () => {
        tree.root
          .findByProps({ testID: 'isolated-email' })
          .props.onChangeText('qa@nuri15.test');
        tree.root
          .findByProps({ testID: 'isolated-password' })
          .props.onChangeText('local');
      });
      await press(tree, 'isolated-login');
      expect(
        tree.root.findByProps({ testID: 'ticket-send' }).props.disabled,
      ).toBe(true);
      expect(
        tree.root.findByProps({ testID: 'ticket-draft' }).props
          .placeholderTextColor,
      ).toBe(createTheme('light').colors.textSecondary);
      expect(
        tree.root.findAllByProps({ testID: 'ticket-attach-photo' }).length,
      ).toBeGreaterThan(0);
      expect(list).not.toHaveBeenCalled();
      await press(tree, 'preview-back');
      expect(tree.root.findAllByProps({ testID: 'ticket-draft' })).toHaveLength(
        0,
      );
    } finally {
      await dispose(tree);
      login.mockRestore();
      list.mockRestore();
    }
  });

  it('keeps the inquiry history free of the message composer and photo picker', async () => {
    const login = jest
      .spyOn(IsolatedNoticeClient.prototype, 'login')
      .mockResolvedValue('qa');
    const list = jest
      .spyOn(IsolatedNoticeClient.prototype, 'myTickets')
      .mockResolvedValue([]);
    const { tree } = await render('help');
    try {
      await press(tree, 'preview-history');
      await TestRenderer.act(async () => {
        tree.root
          .findByProps({ testID: 'isolated-email' })
          .props.onChangeText('qa@nuri15.test');
        tree.root
          .findByProps({ testID: 'isolated-password' })
          .props.onChangeText('local');
      });
      await press(tree, 'isolated-login');
      expect(list).toHaveBeenCalledTimes(1);
      await TestRenderer.act(async () =>
        tree.root
          .findByProps({ testID: 'ticket-pull-refresh' })
          .props.onRefresh(),
      );
      expect(list).toHaveBeenCalledTimes(2);
      expect(tree.root.findAllByProps({ testID: 'ticket-draft' })).toHaveLength(
        0,
      );
      expect(
        tree.root.findAllByProps({ testID: 'ticket-attach-photo' }),
      ).toHaveLength(0);
    } finally {
      await dispose(tree);
      login.mockRestore();
      list.mockRestore();
    }
  });

  it('requires a local order and reason; attachment error prevents example receipt', async () => {
    const { tree } = await render('help');
    await press(tree, 'preview-open-refund');
    const submit = () =>
      tree.root.findByProps({ testID: 'preview-refund-submit' });
    expect(submit().props.disabled).toBe(true);
    await press(tree, 'choice-example');
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'preview-refund-reason' })
        .props.onChangeText('예시 사유'),
    );
    await press(tree, 'choice-error');
    expect(submit().props.disabled).toBe(true);
    await press(tree, 'choice-ready');
    expect(submit().props.disabled).toBe(false);
    await press(tree, 'preview-refund-submit');
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('NURI-20261113-001');
    expect(text).toContain('환불 문의가 접수됐어요');
    expect(text).not.toContain('실제 접수되지 않음');
    await dispose(tree);
  });

  it('renders no entry or modal with development disabled', async () => {
    const previous = __DEV__;
    try {
      Object.defineProperty(globalThis, '__DEV__', {
        value: false,
        configurable: true,
        writable: true,
      });
      const { tree } = await render();
      expect(tree.toJSON()).toBeNull();
      await dispose(tree);
    } finally {
      Object.defineProperty(globalThis, '__DEV__', {
        value: previous,
        configurable: true,
        writable: true,
      });
    }
  });

  it('has no preview routes or service/storage/network mutations in the preview modules', () => {
    const root = path.join(__dirname, '../src/screens/Support');
    for (const file of fs
      .readdirSync(root)
      .filter(name => /\.tsx?$/.test(name))) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.JSX,
        source,
      );
      const identifiers: string[] = [];
      for (
        let token = scanner.scan();
        token !== ts.SyntaxKind.EndOfFileToken;
        token = scanner.scan()
      ) {
        if (token === ts.SyntaxKind.Identifier)
          identifiers.push(scanner.getTokenText());
      }
      for (const forbidden of [
        'fetch',
        'supabase',
        'AsyncStorage',
        'Linking',
        'analytics',
      ])
        expect(identifiers).not.toContain(forbidden);
      const parsed = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      for (const statement of parsed.statements) {
        if (
          ts.isImportDeclaration(statement) &&
          ts.isStringLiteral(statement.moduleSpecifier)
        )
          expect(statement.moduleSpecifier.text).not.toMatch(/services\//);
      }
    }
    const navigator = fs.readFileSync(
      path.join(__dirname, '../src/navigation/RootNavigator.tsx'),
      'utf8',
    );
    expect(navigator).not.toMatch(
      /SupportDesignReview|SupportPreviewScreen|SubscriptionPreview/,
    );
    // Source guard is not a substitute for release APK reachability testing.
  });
});

describe('local input boundaries', () => {
  it('does not submit invalid refund examples', () => {
    expect(canPreviewRefund(false, '사유', 'ready')).toBe(false);
    expect(canPreviewRefund(true, '  ', 'ready')).toBe(false);
    expect(canPreviewRefund(true, '사유', 'error')).toBe(false);
    expect(canPreviewRefund(true, '사유', 'none')).toBe(true);
  });
});
