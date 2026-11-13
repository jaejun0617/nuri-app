import React, {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTheme } from 'styled-components/native';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { Choices, Copy, Glass, Row } from '../Support/PreviewPrimitives';
import NoticeArticle from '../Support/NoticeArticle';
import { inquiryDate } from '../Support/InquiryPresentation';
import IsolatedStaffTickets from './IsolatedStaffTickets';
import IsolatedCommunityNotices, {
  type PanelHandle,
} from './IsolatedCommunityNotices';
import IsolatedReports from './IsolatedReports';
import IsolatedFaq from './IsolatedFaq';
import { reloadNoticeWindow } from './noticeWindow';
import {
  IsolatedNoticeClient,
  newNoticeKey,
  NoticeError,
  type Notice,
  type NoticeCommand,
  type NoticeDetail,
  type NoticeDraft,
} from './isolatedNoticeClient';

import type { InquiryCategory } from '../Support/previewModel';

export type IsolatedNoticeHandle = { back: () => void };
type Panel =
  | 'community'
  | 'tickets'
  | 'reports'
  | 'myTickets'
  | 'newTicket'
  | 'replyAlerts'
  | 'faq'
  | 'faqAdmin';
type Page = 'login' | 'list' | 'drafts' | 'compose' | 'detail' | Panel;
type Saved = { id: string; revision: number };
function message(error: unknown) {
  const code = error instanceof NoticeError ? error.code : 'REQUEST_REJECTED';
  if (code === 'NETWORK_UNCERTAIN')
    return '연결을 확인하지 못했어요. 저장 중이었다면 같은 내용으로 다시 확인해주세요.';
  if (
    code === 'SUPPORT_FORBIDDEN' ||
    code === 'SUPPORT_AUTH_REQUIRED' ||
    code === 'AUTH_REQUIRED'
  )
    return '접근 권한이나 로그인 상태를 다시 확인해주세요.';
  if (code === 'SUPPORT_NOT_FOUND')
    return '이 항목을 열 수 없어요. 목록을 다시 확인해주세요.';
  if (
    code === 'SUPPORT_REVISION_CONFLICT' ||
    code === 'SUPPORT_REQUEST_CONFLICT' ||
    code === 'SUPPORT_CLAIM_CONFLICT' ||
    code === 'SUPPORT_MESSAGE_CONFLICT' ||
    code === 'SUPPORT_NOT_ASSIGNED'
  )
    return '내용이 변경됐어요. 작성한 내용을 보존했으니 다시 확인해주세요.';
  return '요청을 완료하지 못했어요. 입력과 연결 상태를 확인해주세요.';
}

/** Same notice UI primitives, real local Auth/API, session lifetime limited to this development view. */
export default function IsolatedNoticeScreen({
  onExit,
  ref,
  createClient = () => new IsolatedNoticeClient(),
  initialPanel,
  initialInquiryCategory,
  onThreadViewChange,
  onFaqContact,
  onNewInquiry,
}: {
  onExit: () => void;
  ref?: React.Ref<IsolatedNoticeHandle>;
  createClient?: () => IsolatedNoticeClient;
  initialPanel?: Panel;
  initialInquiryCategory?: InquiryCategory;
  onThreadViewChange?: (open: boolean) => void;
  onFaqContact?: () => void;
  onNewInquiry?: () => void;
}) {
  const theme = useTheme();
  const [client] = useState(createClient);
  const active = useRef(true),
    busyRef = useRef(false),
    generation = useRef(0);
  const [page, setPage] = useState<Page>('login');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [user, setUser] = useState<string | null>(null),
    [manager, setManager] = useState(false);
  const [items, setItems] = useState<Notice[]>([]),
    [count, setCount] = useState(0),
    [cursor, setCursor] = useState<unknown>(null);
  const [category, setCategory] = useState<'all' | 'guide' | 'update'>('all');
  const [detail, setDetail] = useState<NoticeDetail | null>(null),
    [readStatus, setReadStatus] = useState<'pending' | 'done' | 'error'>(
      'pending',
    );
  const [renderedId, setRenderedId] = useState<string | null>(null);
  const acknowledged = useRef<string | null>(null);
  const [title, setTitle] = useState(''),
    [body, setBody] = useState('');
  const [draftCategory, setDraftCategory] = useState<'guide' | 'update'>(
    'guide',
  );
  const [saved, setSaved] = useState<Saved | null>(null);
  const [draftMeta, setDraftMeta] = useState<NoticeDraft | null>(null);
  const [expiresInput, setExpiresInput] = useState('');
  const [drafts, setDrafts] = useState<NoticeDraft[]>([]);
  const [draftCursor, setDraftCursor] = useState<unknown>(null);
  const [returnTo, setReturnTo] = useState<'list' | 'drafts'>('list');
  const [changed, setChanged] = useState(true);
  const [ticketManager, setTicketManager] = useState(false);
  const [reportManager, setReportManager] = useState(false);
  const panelRef = useRef<PanelHandle>(null);
  const pending = useRef<NoticeCommand | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const listScroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [listVersion, setListVersion] = useState(0);
  const listY = useRef(0);
  const rowY = useRef(new Map<string, number>());
  const listAnchor = useRef<{ id: string; offset: number } | null>(null);
  const restoreList = useRef(false);
  useEffect(
    () => () => {
      active.current = false;
      generation.current++;
      client.dispose();
    },
    [client],
  );
  const input = [
    styles.input,
    {
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  ];
  function clearSensitive() {
    generation.current++;
    setItems([]);
    setCount(0);
    setCursor(null);
    setDetail(null);
    setRenderedId(null);
    acknowledged.current = null;
    setTitle('');
    setBody('');
    setSaved(null);
    setDraftMeta(null);
    setExpiresInput('');
    setDrafts([]);
    setDraftCursor(null);
    setChanged(true);
    setTicketManager(false);
    setReportManager(false);
    pending.current = null;
    setUncertain(false);
    listY.current = 0;
    listAnchor.current = null;
    rowY.current.clear();
  }
  function handleError(reason: unknown) {
    if (!active.current) return;
    setError(message(reason));
    if (!(reason instanceof NoticeError)) return;
    if (['AUTH_REQUIRED', 'SUPPORT_AUTH_REQUIRED'].includes(reason.code)) {
      clearSensitive();
      setManager(false);
      setUser(null);
      setPage('login');
      client.logout().catch(() => {});
    } else if (
      [
        'SUPPORT_FORBIDDEN',
        'SUPPORT_NOT_FOUND',
        'community_notice_operator_required',
      ].includes(reason.code)
    ) {
      clearSensitive();
      setManager(false);
      setPage(
        initialPanel === 'newTicket' || initialPanel === 'myTickets'
          ? 'myTickets'
          : initialPanel === 'replyAlerts'
          ? 'replyAlerts'
          : initialPanel === 'faq' || initialPanel === 'faqAdmin'
          ? 'login'
          : 'list',
      );
    }
  }
  async function execute(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (reason) {
      handleError(reason);
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function load(next: unknown = null, selected = category) {
    const epoch = ++generation.current;
    const sameCategory = selected === category;
    const filter = selected === 'all' ? null : selected;
    let append = next !== null;
    let result;
    try {
      result =
        next !== null
          ? await client.list(next, filter)
          : await reloadNoticeWindow(
              client,
              filter,
              sameCategory ? items.length : 0,
              sameCategory ? listAnchor.current?.id : undefined,
            );
    } catch (reason) {
      if (
        !(reason instanceof NoticeError) ||
        reason.code !== 'SUPPORT_CURSOR_STALE' ||
        next === null
      )
        throw reason;
      append = false;
      result = await reloadNoticeWindow(
        client,
        filter,
        items.length,
        listAnchor.current?.id,
      );
    }
    if (!active.current || generation.current !== epoch) return;
    if (!append) {
      rowY.current.clear();
      setListVersion(value => value + 1);
      if (!sameCategory) {
        listAnchor.current = null;
        listY.current = 0;
      }
      restoreList.current = true;
    }
    setItems(previous =>
      append
        ? [
            ...previous,
            ...result.items.filter(
              item => !previous.some(old => old.id === item.id),
            ),
          ]
        : result.items,
    );
    setCount(result.count);
    setCursor(result.nextCursor);
    setCategory(selected);
  }
  async function loadDrafts(next: unknown = null) {
    const result = await client.noticeDrafts(next);
    if (!active.current) return;
    setDrafts(old =>
      next
        ? [
            ...old,
            ...result.items.filter(
              item => !old.some(entry => entry.id === item.id),
            ),
          ]
        : result.items,
    );
    setDraftCursor(result.nextCursor);
  }
  function editDraft(value: NoticeDraft, from: 'list' | 'drafts') {
    setDraftMeta(value);
    setSaved({ id: value.id, revision: value.revision });
    setTitle(value.title);
    setBody(value.body);
    setDraftCategory(value.category);
    setExpiresInput(expiryField(value.expiresAt));
    setChanged(false);
    setReturnTo(from);
    setPage('compose');
  }
  function hideDetail() {
    generation.current++;
    setDetail(null);
    setRenderedId(null);
    setPage('list');
  }
  const revalidateOnActive = useEffectEvent(() => {
    if (page === 'list' && user) execute(() => load());
    if (page !== 'detail' || !detail) return;
    if (detail.expiresAt && Date.parse(detail.expiresAt) <= Date.now()) {
      hideDetail();
      execute(() => load());
      return;
    }
    const id = detail.id;
    const epoch = generation.current;
    execute(async () => {
      try {
        const value = await client.detail(id);
        if (active.current && generation.current === epoch) setDetail(value);
      } catch (reason) {
        if (
          reason instanceof NoticeError &&
          reason.code === 'SUPPORT_NOT_FOUND'
        ) {
          if (active.current && generation.current === epoch) {
            hideDetail();
            await load();
          }
          return;
        }
        throw reason;
      }
    });
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') revalidateOnActive();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (page !== 'detail' || !detail?.expiresAt) return;
    const expires = Date.parse(detail.expiresAt);
    if (!Number.isFinite(expires)) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = expires - Date.now();
      if (delay <= 0) revalidateOnActive();
      else timer = setTimeout(schedule, Math.min(delay, 2_147_483_647));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [page, detail?.id, detail?.expiresAt]);
  function back() {
    if (busyRef.current) return;
    if (panelRef.current) {
      panelRef.current.back();
      return;
    }
    if (page === 'detail') {
      hideDetail();
      execute(() => load());
      return;
    }
    if (
      page === 'compose' &&
      ((changed && (title || body)) || pending.current)
    ) {
      Alert.alert(
        '작성 중인 내용이 있어요',
        uncertain
          ? '저장 결과가 확인되지 않았어요. 같은 요청의 결과를 먼저 확인해주세요.'
          : '나가면 화면의 작성 내용은 사라져요. 저장한 작업본은 서버에 남아요.',
        uncertain
          ? [{ text: '계속 확인' }]
          : [
              { text: '계속 작성', style: 'cancel' },
              {
                text: '나가기',
                style: 'destructive',
                onPress: () => {
                  setTitle('');
                  setBody('');
                  setSaved(null);
                  pending.current = null;
                  setPage(returnTo);
                },
              },
            ],
      );
      return;
    }
    if (page === 'compose') {
      setPage(returnTo);
      return;
    }
    if (page === 'drafts') {
      setPage('list');
      execute(() => load());
      return;
    }
    onExit();
  }
  useImperativeHandle(ref, () => ({ back }));
  async function submit(operation: NoticeCommand['p_operation']) {
    if (busyRef.current) return;
    const expiry = parseExpiryField(expiresInput);
    if (!pending.current && operation === 'save' && expiry === undefined) {
      setError(
        '게시 만료를 YYYY-MM-DD HH:mm 형식의 한국 시간으로 입력해주세요.',
      );
      return;
    }
    Keyboard.dismiss();
    await execute(async () => {
      const request =
        pending.current ??
        (operation === 'save'
          ? {
              p_key: newNoticeKey(),
              p_operation: operation,
              ...(saved
                ? { p_id: saved.id, p_expected_revision: saved.revision }
                : {}),
              p_content: {
                title,
                body,
                category: draftCategory,
                pinned: draftMeta?.pinned ?? false,
                ...(draftMeta ? { startsAt: draftMeta.startsAt } : {}),
                ...(expiresInput || draftMeta?.expiresAt
                  ? {
                      expiresAt:
                        expiresInput === expiryField(draftMeta?.expiresAt)
                          ? draftMeta?.expiresAt
                          : expiry,
                    }
                  : {}),
              },
            }
          : saved
          ? {
              p_key: newNoticeKey(),
              p_operation: operation,
              p_id: saved.id,
              p_expected_revision: saved.revision,
            }
          : null);
      if (!request) return;
      pending.current = request;
      try {
        const result = await client.command(request);
        if (!active.current) return;
        pending.current = null;
        setUncertain(false);
        setSaved(result);
        setChanged(false);
        if (
          request.p_operation === 'publish' ||
          request.p_operation === 'delete' ||
          request.p_operation === 'stop'
        ) {
          setPage(returnTo);
          setTitle('');
          setBody('');
          setSaved(null);
          if (returnTo === 'drafts') await loadDrafts();
          else await load();
        }
      } catch (reason) {
        if (active.current) {
          const unknown =
            reason instanceof NoticeError &&
            (reason.code === 'NETWORK_UNCERTAIN' ||
              reason.code === 'INVALID_RESPONSE');
          setUncertain(unknown);
          if (!unknown) pending.current = null;
        }
        throw reason;
      }
    });
  }
  const ack = async () => {
    if (!detail || acknowledged.current === detail.id || busyRef.current)
      return;
    const id = detail.id,
      epoch = generation.current;
    acknowledged.current = id;
    try {
      await client.detail(id, true);
      if (active.current && epoch === generation.current) setReadStatus('done');
    } catch (reason) {
      acknowledged.current = null;
      if (active.current && epoch === generation.current) {
        setReadStatus('error');
        handleError(reason);
      }
    }
  };
  useEffect(() => {
    if (
      page === 'detail' &&
      detail?.id === renderedId &&
      !busy &&
      readStatus === 'pending'
    )
      ack();
  });
  if (!__DEV__) return null;
  const status = (
    <>
      <Copy muted>격리 개발 서버{user ? ` · ${user.slice(0, 8)}` : ''}</Copy>
      {error ? (
        <View accessibilityLiveRegion="polite">
          <Copy>{error}</Copy>
        </View>
      ) : null}
      {busy ? <Copy muted>처리 중이에요.</Copy> : null}
    </>
  );
  const isTicketPage =
    (page === 'tickets' && ticketManager) ||
    page === 'myTickets' ||
    page === 'newTicket' ||
    page === 'replyAlerts';
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      {isTicketPage ? (
        <IsolatedStaffTickets
          key={page}
          ref={panelRef}
          client={client}
          status={status}
          mode={
            page === 'tickets'
              ? 'staff'
              : page === 'replyAlerts'
              ? 'alerts'
              : 'mine'
          }
          initialCategory={
            page === 'newTicket' ? initialInquiryCategory : undefined
          }
          onError={handleError}
          onRecovered={() => setError('')}
          onThreadViewChange={onThreadViewChange}
          onNewInquiry={onNewInquiry}
          onBack={initialPanel ? onExit : () => setPage('list')}
        />
      ) : page === 'faq' || page === 'faqAdmin' ? (
        <IsolatedFaq
          ref={panelRef}
          client={client}
          management={page === 'faqAdmin'}
          status={status}
          onBack={onExit}
          onError={handleError}
          onContact={onFaqContact}
        />
      ) : (
        <ScrollView
          key={page}
          ref={listScroll}
          testID="notice-scroll"
          scrollEventThrottle={16}
          onScroll={event => {
            if (page !== 'list' || restoreList.current) return;
            listY.current = event.nativeEvent.contentOffset.y;
            const anchor = [...rowY.current]
              .filter(([, y]) => y <= listY.current)
              .sort((a, b) => b[1] - a[1])[0];
            listAnchor.current = anchor
              ? { id: anchor[0], offset: listY.current - anchor[1] }
              : null;
          }}
          onContentSizeChange={() => {
            if (page !== 'list' || !restoreList.current) return;
            const anchor = listAnchor.current;
            const y = anchor ? rowY.current.get(anchor.id) : undefined;
            if (
              anchor &&
              items.some(item => item.id === anchor.id) &&
              y === undefined
            )
              return;
            if (
              anchor &&
              y === undefined &&
              items.some(item => item.id === anchor.id)
            )
              return;
            listScroll.current?.scrollTo({
              y: y === undefined ? listY.current : y + (anchor?.offset ?? 0),
              animated: false,
            });
            restoreList.current = false;
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            page === 'list' ||
            page === 'drafts' ||
            page === 'community' ||
            page === 'reports' ? (
              <RefreshControl
                testID="notice-pull-refresh"
                refreshing={refreshing}
                enabled={!busy || refreshing}
                tintColor={PRODUCT_CTA.primary}
                colors={[PRODUCT_CTA.primary]}
                onRefresh={() => {
                  if (busyRef.current) return;
                  setRefreshing(true);
                  const task =
                    page === 'list'
                      ? execute(() => load())
                      : page === 'drafts'
                      ? execute(() => loadDrafts())
                      : panelRef.current?.refreshList?.();
                  Promise.resolve(task).finally(() => {
                    if (active.current) setRefreshing(false);
                  });
                }}
              />
            ) : undefined
          }
        >
          {status}
          {page === 'login' ? (
            <Glass>
              <Copy title>격리 계정 로그인</Copy>
              <AppTextInput
                testID="isolated-email"
                accessibilityLabel="격리 이메일"
                autoComplete="off"
                importantForAutofill="no"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                style={input}
              />
              <AppTextInput
                testID="isolated-password"
                accessibilityLabel="격리 비밀번호"
                autoComplete="off"
                importantForAutofill="no"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                style={input}
              />
              <CtaButton
                role="primary"
                testID="isolated-login"
                disabled={busy || !email.trim() || !password}
                onPress={() => {
                  Keyboard.dismiss();
                  execute(async () => {
                    const id = await client.login(email.trim(), password);
                    if (!active.current) return;
                    setPassword('');
                    setEmail('');
                    setUser(id);
                    setPage('list');
                    if (
                      initialPanel === 'community' ||
                      initialPanel === 'myTickets' ||
                      initialPanel === 'newTicket' ||
                      initialPanel === 'replyAlerts' ||
                      initialPanel === 'faq' ||
                      initialPanel === 'faqAdmin'
                    ) {
                      setPage(initialPanel);
                      return;
                    }
                    setManager(await client.canManage());
                    await load();
                    const [tickets, reports] = await Promise.all([
                      client.canViewTickets(),
                      client.canViewReports(),
                    ]);
                    if (!active.current) return;
                    setTicketManager(tickets);
                    setReportManager(reports);
                    if (
                      (initialPanel === 'tickets' && tickets) ||
                      (initialPanel === 'reports' && reports)
                    )
                      setPage(initialPanel);
                  });
                }}
              >
                <CtaText>로그인</CtaText>
              </CtaButton>
            </Glass>
          ) : null}
          {page === 'list' ? (
            <>
              <Copy title>누리의 새로운 소식</Copy>
              <Choices
                label="공지 분류"
                value={category}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'update', label: '업데이트' },
                  { value: 'guide', label: '안내' },
                ]}
                onChange={value => {
                  if (!busyRef.current) execute(() => load(null, value));
                }}
              />
              <Copy muted>총 {count}건</Copy>
              {manager ? (
                <CtaButton
                  role="primary"
                  testID="isolated-new"
                  disabled={busy}
                  onPress={() => {
                    setTitle('');
                    setBody('');
                    setSaved(null);
                    setDraftMeta(null);
                    setExpiresInput('');
                    setReturnTo('list');
                    setChanged(true);
                    setDraftCategory('guide');
                    setPage('compose');
                  }}
                >
                  <CtaText>공지 작성</CtaText>
                </CtaButton>
              ) : null}
              {manager ? (
                <CtaButton
                  role="neutral"
                  testID="isolated-manage-notices"
                  disabled={busy}
                  onPress={() =>
                    execute(async () => {
                      await loadDrafts();
                      if (active.current) setPage('drafts');
                    })
                  }
                >
                  <CtaText>공지 관리</CtaText>
                </CtaButton>
              ) : null}
              {ticketManager ? (
                <CtaButton
                  role="neutral"
                  testID="isolated-tickets"
                  disabled={busy}
                  onPress={() => setPage('tickets')}
                >
                  <CtaText>문의내역</CtaText>
                </CtaButton>
              ) : null}
              {reportManager ? (
                <CtaButton
                  role="neutral"
                  testID="isolated-reports"
                  disabled={busy}
                  onPress={() => setPage('reports')}
                >
                  <CtaText>신고내역</CtaText>
                </CtaButton>
              ) : null}
              {!items.length && !busy ? (
                <Copy>등록된 공지가 없어요.</Copy>
              ) : null}
              {items.map(item => (
                <View
                  key={`${listVersion}:${item.id}`}
                  testID={`notice-position-${item.id}`}
                  onLayout={event => {
                    rowY.current.set(item.id, event.nativeEvent.layout.y);
                    if (
                      restoreList.current &&
                      listAnchor.current?.id === item.id
                    ) {
                      listScroll.current?.scrollTo({
                        y:
                          event.nativeEvent.layout.y +
                          listAnchor.current.offset,
                        animated: false,
                      });
                      restoreList.current = false;
                    }
                  }}
                >
                  <Glass>
                    <Row
                      testID={`isolated-notice-${item.id}`}
                      title={item.title}
                      subtitle={`${
                        item.category === 'update' ? '업데이트' : '안내'
                      } · ${[
                        inquiryDate(item.date, true),
                        item.readAt ? '읽음' : '미읽음',
                      ]
                        .filter(Boolean)
                        .join(' · ')}`}
                      onPress={() =>
                        execute(async () => {
                          const epoch = ++generation.current;
                          const value = await client.detail(item.id);
                          if (!active.current || generation.current !== epoch)
                            return;
                          acknowledged.current = null;
                          setRenderedId(null);
                          setReadStatus('pending');
                          setDetail(value);
                          setPage('detail');
                        })
                      }
                    />
                  </Glass>
                </View>
              ))}
              {cursor ? (
                <CtaButton
                  role="neutral"
                  testID="notice-more"
                  disabled={busy}
                  onPress={() => execute(() => load(cursor))}
                >
                  <CtaText>더 보기</CtaText>
                </CtaButton>
              ) : null}
              <CtaButton
                testID="isolated-logout"
                role="neutral"
                disabled={busy}
                onPress={() =>
                  execute(async () => {
                    try {
                      await client.logout();
                    } finally {
                      if (active.current) {
                        clearSensitive();
                        setUser(null);
                        setManager(false);
                        setPage('login');
                      }
                    }
                  })
                }
              >
                <CtaText>격리 계정 로그아웃</CtaText>
              </CtaButton>
            </>
          ) : null}
          {page === 'drafts' ? (
            <>
              <Copy title>공지 관리</Copy>
              {!busy && !drafts.length ? (
                <Copy>저장한 공지가 없어요.</Copy>
              ) : null}
              {drafts.map(item => (
                <Glass key={item.id}>
                  <Row
                    title={item.title}
                    subtitle={
                      item.state === 'stopped'
                        ? '게시 중단'
                        : item.state === 'draft'
                        ? '작업본'
                        : '게시 이력 있음'
                    }
                    onPress={() =>
                      execute(async () => {
                        const value = await client.editor(item.id);
                        if (active.current) editDraft(value, 'drafts');
                      })
                    }
                  />
                </Glass>
              ))}
              {draftCursor ? (
                <CtaButton
                  role="neutral"
                  disabled={busy}
                  onPress={() => execute(() => loadDrafts(draftCursor))}
                >
                  <CtaText>더 보기</CtaText>
                </CtaButton>
              ) : null}
            </>
          ) : null}
          {page === 'compose' ? (
            <Glass>
              <Copy title>{draftMeta ? '공지 수정' : '공지 작성'}</Copy>
              <AppTextInput
                testID="isolated-title"
                accessibilityLabel="공지 제목"
                placeholder="제목"
                value={title}
                onChangeText={value => {
                  setTitle(value);
                  setChanged(true);
                }}
                editable={!busy && !uncertain}
                maxLength={150}
                style={input}
              />
              <AppTextInput
                testID="isolated-body"
                accessibilityLabel="공지 본문"
                placeholder="내용"
                value={body}
                onChangeText={value => {
                  setBody(value);
                  setChanged(true);
                }}
                editable={!busy && !uncertain}
                multiline
                maxLength={10000}
                style={[input, styles.body]}
              />
              <Choices
                label="작성 분류"
                value={draftCategory}
                options={[
                  { value: 'guide', label: '안내' },
                  { value: 'update', label: '업데이트' },
                ]}
                onChange={value => {
                  if (!busy && !uncertain) {
                    setDraftCategory(value);
                    setChanged(true);
                  }
                }}
              />
              <AppTextInput
                testID="isolated-expiry"
                accessibilityLabel="게시 만료 한국 시간"
                placeholder="게시 만료 · YYYY-MM-DD HH:mm (선택)"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={16}
                value={expiresInput}
                editable={!busy && !uncertain}
                style={input}
                onChangeText={value => {
                  setExpiresInput(value);
                  setChanged(true);
                }}
              />
              {saved && !changed ? (
                <Copy muted>
                  저장된 작업본이에요. 게시하면 공개 내용에 반영돼요.
                </Copy>
              ) : null}
              {changed || uncertain ? (
                <CtaButton
                  role="primary"
                  testID="isolated-save"
                  disabled={busy || !title.trim() || !body.trim()}
                  onPress={() => submit('save')}
                >
                  <CtaText>
                    {uncertain ? '저장 결과 다시 확인' : '작업본 저장'}
                  </CtaText>
                </CtaButton>
              ) : null}
              {saved && !changed && !uncertain ? (
                <CtaButton
                  role="primary"
                  testID="isolated-publish"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      '게시할까요?',
                      '이 격리 서버의 사용자에게 공개돼요. 기존 알림이나 푸시는 발송하지 않아요.',
                      [
                        { text: '취소', style: 'cancel' },
                        { text: '게시', onPress: () => submit('publish') },
                      ],
                    )
                  }
                >
                  <CtaText>게시</CtaText>
                </CtaButton>
              ) : null}
              {draftMeta && saved && !uncertain ? (
                draftMeta.state === 'published' && !changed ? (
                  <CtaButton
                    role="neutral"
                    testID="isolated-stop"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(
                        '공지 게시를 중단할까요?',
                        '사용자 목록과 상세에서 숨겨져요. 작업본과 읽음 기록은 남아요.',
                        [
                          { text: '취소', style: 'cancel' },
                          { text: '게시 중단', onPress: () => submit('stop') },
                        ],
                      )
                    }
                  >
                    <CtaText>게시 중단</CtaText>
                  </CtaButton>
                ) : null
              ) : null}
              {draftMeta && saved && !uncertain ? (
                <CtaButton
                  role="neutral"
                  testID="isolated-delete"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      '공지를 삭제할까요?',
                      '목록과 상세에서 제거돼요. 원본과 처리 기록은 보존돼요.',
                      [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
                          style: 'destructive',
                          onPress: () => submit('delete'),
                        },
                      ],
                    )
                  }
                >
                  <CtaText>삭제</CtaText>
                </CtaButton>
              ) : null}
            </Glass>
          ) : null}
          {page === 'detail' && detail ? (
            <>
              <View
                testID="isolated-detail"
                onLayout={() => setRenderedId(detail.id)}
              >
                <NoticeArticle
                  title={detail.title}
                  category={detail.category === 'update' ? '업데이트' : '안내'}
                  publishedAt={detail.date}
                  body={detail.body}
                  pinned={detail.pinned}
                />
              </View>
              <Copy muted>
                {readStatus === 'done'
                  ? '읽음'
                  : readStatus === 'error'
                  ? '읽음 확인을 다시 시도해주세요.'
                  : '읽음 확인 중'}
              </Copy>
              {manager ? (
                <CtaButton
                  role="neutral"
                  testID="isolated-edit"
                  disabled={busy}
                  onPress={() =>
                    execute(async () => {
                      const value = await client.editor(detail.id);
                      if (!active.current) return;
                      editDraft(value, 'list');
                    })
                  }
                >
                  <CtaText>공지 관리</CtaText>
                </CtaButton>
              ) : null}
              {readStatus === 'error' ? (
                <CtaButton role="neutral" onPress={() => ack()}>
                  <CtaText>읽음 다시 확인</CtaText>
                </CtaButton>
              ) : null}
              <CtaButton
                testID="isolated-list-back"
                role="neutral"
                onPress={back}
              >
                <CtaText>목록으로</CtaText>
              </CtaButton>
            </>
          ) : null}
          {page === 'reports' && reportManager ? (
            <IsolatedReports
              ref={panelRef}
              client={client}
              onError={handleError}
              onBack={initialPanel ? onExit : () => setPage('list')}
            />
          ) : null}
          {page === 'community' ? (
            <IsolatedCommunityNotices
              ref={panelRef}
              client={client}
              onError={handleError}
              onBack={onExit}
            />
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
function expiryField(value?: string | null) {
  if (!value) return '';
  const ms = Date.parse(value);
  return Number.isFinite(ms)
    ? new Date(ms + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ')
    : '';
}

export function parseExpiryField(value: string): string | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return undefined;
  const iso = value.replace(' ', 'T') + ':00+09:00';
  return expiryField(iso) === value ? iso : undefined;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48 },
  body: { minHeight: 160, textAlignVertical: 'top' },
});
