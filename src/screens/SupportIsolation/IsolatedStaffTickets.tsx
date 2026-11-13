import React, {
  useCallback,
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
  TouchableOpacity,
  View,
} from 'react-native';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import { useTheme } from 'styled-components/native';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import Feather from '../../components/icons/NuriFeatherIcon';
import { readFileAsBase64 } from '../../services/files/readFileAsBase64';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import { Choices, Copy, Glass } from '../Support/PreviewPrimitives';
import InquiryRegistrationForm from '../Support/InquiryRegistrationForm';
import NotificationFeed from '../Notifications/NotificationFeed';
import type { SupportReplyNotification } from '../../services/notifications/supportReplyNotifications';
import {
  InquiryHeading,
  InquiryListItem,
  InquiryMessage,
  InquiryStatus,
  inquiryDate,
} from '../Support/InquiryPresentation';
import type { PanelHandle } from './IsolatedCommunityNotices';
import { inquiryTypes, type InquiryCategory } from '../Support/previewModel';
import TicketPhotoViewer from './TicketPhotoViewer';
import {
  newNoticeKey,
  NoticeError,
  type IsolatedNoticeClient,
  type StaffTicket,
  type TicketCommand,
  type TicketPhotoCommand,
  type TicketRegistration,
} from './isolatedNoticeClient';

type Thread = Awaited<ReturnType<IsolatedNoticeClient['ticketThread']>>;
type DraftPhoto = {
  id: string;
  uri: string;
  state: 'uploading' | 'ready' | 'failed';
};
type PendingTicket =
  | { command: TicketCommand }
  | { photoCommand: TicketPhotoCommand }
  | { registration: TicketRegistration };
const maxPhotoBase64 = 6990508;
const kinds = [
  { value: 'answer', label: '일반 답변' },
  { value: 'information', label: '추가 정보 요청' },
] as const;
function ticketTitle(category: string) {
  return inquiryTypes.find(entry => entry.value === category)?.label ?? '문의';
}
function ticketStatus(item: {
  unread?: boolean;
  state: string;
  nextActor: string;
}) {
  return item.unread
    ? '새 답변'
    : item.state === 'closed'
    ? '종료'
    : item.nextActor === 'staff'
    ? '답변 대기'
    : item.nextActor === 'user'
    ? '추가 정보 대기'
    : '답변 완료';
}

export default function IsolatedStaffTickets({
  client,
  mode,
  initialCategory,
  status,
  onError,
  onRecovered,
  onBack,
  onThreadViewChange,
  onNewInquiry,
  ref,
}: {
  client: IsolatedNoticeClient;
  mode: 'staff' | 'mine' | 'alerts';
  initialCategory?: InquiryCategory;
  status: React.ReactNode;
  onError: (error: unknown) => void;
  onRecovered: () => void;
  onBack: () => void;
  onThreadViewChange?: (open: boolean) => void;
  onNewInquiry?: () => void;
  ref?: React.Ref<PanelHandle>;
}) {
  const staff = mode === 'staff';
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<StaffTicket[]>([]);
  const [alerts, setAlerts] = useState<SupportReplyNotification[]>([]);
  const [alertUnread, setAlertUnread] = useState(0);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [alertsError, setAlertsError] = useState(false);
  const [alertsMoreError, setAlertsMoreError] = useState(false);
  const [loadingMoreAlerts, setLoadingMoreAlerts] = useState(false);
  const [more, setMore] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [readPending, setReadPending] = useState<number | null>(null);
  const [rendered, setRendered] = useState<string | null>(null);
  const [composing, setComposing] = useState(initialCategory !== undefined);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [transferTo, setTransferTo] = useState('');
  const [category, setCategory] = useState<InquiryCategory>(
    initialCategory ?? 'usage',
  );
  const [kind, setKind] = useState<'answer' | 'information'>('answer');
  const [uncertain, setUncertain] = useState(false);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const draftId = useRef<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const threadViewOpen = composing || thread !== null;
  useEffect(() => {
    onThreadViewChange?.(threadViewOpen);
    return () => onThreadViewChange?.(false);
  }, [onThreadViewChange, threadViewOpen]);
  const active = useRef(true),
    lock = useRef(false);
  const [recoveringRead, setRecoveringRead] = useState(false);
  const pending = useRef<PendingTicket | null>(null);
  const run = useCallback(
    async (work: () => Promise<void>) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        await work();
      } catch (error) {
        if (active.current) onError(error);
      } finally {
        lock.current = false;
        if (active.current) setBusy(false);
      }
    },
    [onError],
  );
  async function list(append = false) {
    if (mode === 'alerts') {
      setLoadingMoreAlerts(append);
      try {
        const page = await client.notificationPage(
          append ? alerts.at(-1) : undefined,
        );
        if (!active.current) return;
        setAlerts(old =>
          append
            ? [
                ...old,
                ...page.items.filter(
                  row => !old.some(item => item.id === row.id),
                ),
              ]
            : page.items,
        );
        setMore(page.hasMore);
        setAlertUnread(page.unreadCount);
        setAlertsLoaded(true);
        setAlertsError(false);
        setAlertsMoreError(false);
      } catch (error) {
        if (active.current) {
          if (append) setAlertsMoreError(true);
          else setAlertsError(true);
        }
        throw error;
      } finally {
        if (active.current) setLoadingMoreAlerts(false);
      }
    } else {
      const before = append ? items.at(-1) : undefined;
      const rows = staff
        ? await client.staffTickets(before)
        : await client.myTickets(before);
      if (!active.current) return;
      setItems(old =>
        append
          ? [
              ...old,
              ...rows.filter(row => !old.some(item => item.id === row.id)),
            ]
          : rows,
      );
      setMore(rows.length === 20);
    }
  }
  const initialize = useRef(() => {
    if (!initialCategory) run(() => list());
  });
  useEffect(() => {
    active.current = true;
    initialize.current();
    return () => {
      active.current = false;
    };
  }, []);
  async function open(id: string, append = false, focusMessage?: number) {
    const value = await client.ticketThread(
      id,
      append
        ? thread?.messages.at(-1)?.seq
        : Math.max(0, (focusMessage ?? 0) - 20),
    );
    if (!active.current) return;
    if (
      value.id !== id ||
      (focusMessage !== undefined &&
        !value.messages.some(message => message.seq === focusMessage))
    ) {
      throw new NoticeError('SUPPORT_NOT_FOUND');
    }
    if (staff && !append) {
      const members = await client.staffMembers();
      if (!active.current) return;
      setStaffMembers(members.filter(idValue => idValue !== client.userId));
      setTransferTo('');
    }
    setThread(
      append && thread
        ? { ...value, messages: [...thread.messages, ...value.messages] }
        : value,
    );
    setReadPending(!staff ? value.messages.at(-1)?.seq ?? null : null);
    setComposing(false);
  }
  const lastRenderedKey = thread
    ? `${thread.id}:${thread.messages.at(-1)?.seq ?? 0}`
    : null;
  // A read cursor advances only after the fetched message page is displayed.
  useEffect(() => {
    if (
      staff ||
      busy ||
      !thread ||
      readPending === null ||
      rendered !== lastRenderedKey
    )
      return;
    const id = thread.id;
    setReadPending(null);
    run(async () => {
      await client.ticketThread(id, readPending, readPending);
    });
  }, [
    staff,
    busy,
    thread,
    readPending,
    rendered,
    lastRenderedKey,
    run,
    client,
  ]);
  function back() {
    if (lock.current || uncertain) return;
    const leave = () => {
      if (initialCategory) {
        onBack();
        return;
      }
      setThread(null);
      setRendered(null);
      setComposing(false);
      setDraft('');
      setTitle('');
      setCloseReason('');
      setPhotos([]);
      draftId.current = null;
      setPhotoError('');
      setReadPending(null);
      run(() => list());
    };
    if (title.trim() || draft.trim() || photos.length) {
      Alert.alert('작성 중인 내용이 있어요', '저장하지 않은 내용은 사라져요.', [
        { text: '계속 작성', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: leave },
      ]);
    } else if (thread || composing) leave();
    else onBack();
  }
  useImperativeHandle(ref, () => ({ back }));

  async function upload(photo: DraftPhoto) {
    const draftKey = draftId.current ?? (draftId.current = newNoticeKey());
    setPhotos(current =>
      current.map(value =>
        value.id === photo.id ? { ...value, state: 'uploading' } : value,
      ),
    );
    setPhotoError('');
    try {
      const base64 = await readFileAsBase64(photo.uri);
      if (base64.length > maxPhotoBase64)
        throw new NoticeError('SUPPORT_PHOTO_INVALID');
      if (!active.current) return;
      await client.uploadTicketPhoto({
        id: photo.id,
        draft: draftKey,
        ticket: thread?.id ?? null,
        base64,
      });
      if (active.current)
        setPhotos(current =>
          current.map(value =>
            value.id === photo.id ? { ...value, state: 'ready' } : value,
          ),
        );
    } catch (error) {
      if (!active.current) return;
      setPhotos(current =>
        current.map(value =>
          value.id === photo.id ? { ...value, state: 'failed' } : value,
        ),
      );
      const code = error instanceof NoticeError ? error.code : '';
      if (
        [
          'SUPPORT_NOT_FOUND',
          'SUPPORT_FORBIDDEN',
          'AUTH_REQUIRED',
          'SUPPORT_AUTH_REQUIRED',
        ].includes(code)
      ) {
        onError(error);
        return;
      }
      setPhotoError(
        code === 'SUPPORT_PHOTO_INVALID'
          ? '5MB 이하의 JPEG, PNG, WebP 사진을 선택해주세요.'
          : '사진을 준비하지 못했어요. 다시 시도하거나 해당 사진을 빼주세요.',
      );
    }
  }
  function addPhoto() {
    run(async () => {
      if (staff || photos.length >= 3) return;
      const selected = await pickPhotoAssets({ selectionLimit: 1 });
      if (!active.current || selected.status !== 'success') return;
      const asset = selected.assets[0];
      if (!asset || selected.assets.length !== 1) return;
      const photo: DraftPhoto = {
        id: newNoticeKey(),
        uri: asset.uri,
        state: 'uploading',
      };
      setPhotos(current => [...current, photo]);
      await upload(photo);
    });
  }
  function refresh(pull = true) {
    if (lock.current || uncertain || composing) return;
    if (pull) setRefreshing(true);
    run(async () => {
      try {
        if (thread) await open(thread.id, true);
        else await list();
        if (active.current) {
          setRecoveringRead(false);
          onRecovered();
        }
      } catch (error) {
        if (active.current)
          setRecoveringRead(
            pull &&
              error instanceof NoticeError &&
              error.code === 'NETWORK_UNCERTAIN',
          );
        throw error;
      } finally {
        if (pull && active.current) setRefreshing(false);
      }
    });
  }
  const catchUpOnActive = useEffectEvent(() => refresh(false));
  useEffect(() => {
    // Active-screen fallback only. Reconnection never repeats a write command.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') catchUpOnActive();
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      !recoveringRead ||
      busy ||
      uncertain ||
      composing ||
      AppState.currentState === 'background'
    )
      return;
    // Retry only the read once; commands keep their explicit same-key recovery.
    const timer = setTimeout(() => {
      setRecoveringRead(false);
      catchUpOnActive();
    }, 2000);
    return () => clearTimeout(timer);
  }, [busy, composing, recoveringRead, uncertain]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') catchUpOnActive();
    });
    return () => subscription.remove();
  }, []);
  function submit(operation: TicketCommand['p_operation']) {
    run(async () => {
      const photoCommand =
        operation === 'message' && photos.length && draftId.current
          ? {
              p_key: newNoticeKey(),
              p_ticket: thread?.id ?? null,
              p_category: thread ? null : category,
              p_body: draft,
              p_draft: draftId.current,
              p_photos: photos.map(photo => photo.id),
            }
          : null;
      if (
        !pending.current &&
        operation === 'message' &&
        photos.some(photo => photo.state !== 'ready')
      )
        return;
      const request: PendingTicket =
        pending.current ??
        (!thread && operation === 'message'
          ? {
              registration: {
                p_key: newNoticeKey(),
                p_title: title,
                p_category: category,
                p_body: draft,
                p_draft: draftId.current,
                p_photos: photos.map(photo => photo.id),
              },
            }
          : photoCommand
          ? { photoCommand }
          : {
              command: {
                p_key: newNoticeKey(),
                p_operation: operation,
                ...(thread
                  ? { p_ticket: thread.id }
                  : { p_category: category }),
                ...(operation === 'message'
                  ? { p_body: draft }
                  : { p_revision: thread?.revision }),
                ...(operation === 'reply'
                  ? {
                      p_seen_user_seq: thread?.lastUserSeq,
                      p_body: draft,
                      p_kind: kind,
                    }
                  : {}),
                ...(operation === 'close'
                  ? { p_body: staff ? closeReason : '사용자가 해결을 확인함' }
                  : {}),
                ...(operation === 'transfer'
                  ? {
                      p_assignee: transferTo,
                      p_seen_user_seq: thread?.lastUserSeq,
                    }
                  : {}),
              },
            });
      pending.current = request;
      let value;
      try {
        value =
          'registration' in request
            ? await client.registerTicket(request.registration)
            : 'photoCommand' in request
            ? await client.ticketPhotoMessage(request.photoCommand)
            : await client.ticketCommand(request.command);
      } catch (error) {
        const unknown =
          error instanceof NoticeError &&
          ['NETWORK_UNCERTAIN', 'INVALID_RESPONSE'].includes(error.code);
        if (!unknown) pending.current = null;
        if (active.current) setUncertain(unknown);
        if (
          active.current &&
          error instanceof NoticeError &&
          error.code === 'SUPPORT_PHOTO_NOT_READY'
        ) {
          setPhotos(current =>
            current.map(photo => ({ ...photo, state: 'failed' })),
          );
          setPhotoError(
            '보낼 수 없는 사진이 있어요. 다시 준비하거나 사진을 빼주세요.',
          );
        }
        throw error;
      }
      pending.current = null;
      if (!active.current) return;
      setUncertain(false);
      const executedOperation =
        'command' in request ? request.command.p_operation : 'message';
      if (executedOperation === 'message' || executedOperation === 'reply') {
        setDraft('');
        setTitle('');
        setPhotos([]);
        draftId.current = null;
        setPhotoError('');
      }
      setCloseReason('');
      if (!thread) setComposing(false);
      await open(value.id);
    });
  }
  const latestPage =
    thread && (thread.messages.at(-1)?.seq ?? 0) === thread.messageSeq;
  const canReply =
    staff &&
    thread?.state === 'open' &&
    thread.assignee === client.userId &&
    latestPage;
  const composer =
    (composing || (thread && (canReply || (!staff && latestPage)))) &&
    !uncertain;
  const attachDisabled = busy || photos.length >= 3;
  const sendDisabled =
    busy ||
    (composing && !title.trim()) ||
    (!draft.trim() && !photos.length) ||
    photos.some(photo => photo.state !== 'ready');
  if (mode === 'alerts' && !thread && !composing) {
    return (
      <View style={styles.scroll}>
        {status}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Copy>읽지 않은 알림 {alertUnread}개</Copy>
        </View>
        <NotificationFeed
          items={alerts}
          now={new Date()}
          timeZone="Asia/Seoul"
          pending={!alertsLoaded && !alertsError}
          error={alertsError}
          refreshing={refreshing}
          loadingMore={loadingMoreAlerts}
          moreError={alertsMoreError}
          disabled={busy}
          onRefresh={() => refresh()}
          onMore={() => {
            if (more && !lock.current) run(() => list(true));
          }}
          onOpen={item =>
            run(async () => {
              const target = await client.notificationTarget(item.id);
              if (!active.current) return;
              await open(target.ticketId, false, target.messageSeq);
            })
          }
        />
      </View>
    );
  }
  return (
    <>
      <ScrollView
        key={thread?.id ?? (composing ? 'compose' : 'list')}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          !composing ? (
            <RefreshControl
              testID="ticket-pull-refresh"
              refreshing={refreshing}
              onRefresh={() => refresh()}
              enabled={!busy || refreshing}
              tintColor={PRODUCT_CTA.primary}
              colors={[PRODUCT_CTA.primary]}
            />
          ) : undefined
        }
      >
        {status}
        {thread ? (
          <View style={styles.threadHeading}>
            <View style={{ flex: 1 }}>
              <Copy title>{thread.title || ticketTitle(thread.category)}</Copy>
              {thread.title ? (
                <Copy muted>{ticketTitle(thread.category)}</Copy>
              ) : null}
            </View>
            <InquiryStatus label={ticketStatus(thread)} />
          </View>
        ) : mode === 'mine' && !composing ? (
          <InquiryHeading title="남긴 문의" />
        ) : (
          <Copy title>
            {composing
              ? '1:1 문의 등록'
              : mode === 'alerts'
              ? '알림함'
              : '문의내역'}
          </Copy>
        )}
        {busy ? <Copy muted>처리 중이에요.</Copy> : null}
        {thread ? (
          <>
            <View
              key={lastRenderedKey}
              onLayout={() => setRendered(lastRenderedKey)}
              style={styles.messages}
            >
              {thread.messages.map((item, index) => {
                const outgoing = staff
                  ? item.author === 'staff'
                  : item.author === 'user';
                const day = inquiryDate(item.createdAt);
                const previous = thread.messages[index - 1];
                const newDay =
                  day && (!previous || inquiryDate(previous.createdAt) !== day);
                return (
                  <React.Fragment key={item.id}>
                    {newDay ? (
                      <View style={styles.day}>
                        <Copy muted>{day}</Copy>
                      </View>
                    ) : null}
                    <InquiryMessage
                      outgoing={outgoing}
                      testID={`ticket-message-${item.seq}`}
                      name={
                        item.author === 'staff'
                          ? '누리팀 답변'
                          : item.seq === 1
                          ? '문의 내용'
                          : '추가 문의'
                      }
                      showAvatar={!staff && item.author === 'staff'}
                      date={inquiryDate(item.createdAt, true)}
                    >
                      {item.body ? <Copy>{item.body}</Copy> : null}
                      {item.photos.map(photo => (
                        <TicketPhotoViewer
                          key={photo.id}
                          photo={photo}
                          client={client}
                          onDenied={onError}
                        />
                      ))}
                    </InquiryMessage>
                  </React.Fragment>
                );
              })}
            </View>
            {!latestPage ? (
              <CtaButton
                role="neutral"
                disabled={busy || uncertain}
                onPress={() => run(() => open(thread.id, true))}
              >
                <CtaText>이후 메시지</CtaText>
              </CtaButton>
            ) : null}
            {staff &&
            thread.state === 'open' &&
            thread.assignee === null &&
            !uncertain ? (
              <CtaButton
                role="neutral"
                testID="ticket-claim"
                disabled={busy}
                onPress={() => submit('claim')}
              >
                <CtaText>담당하기</CtaText>
              </CtaButton>
            ) : null}
            {!uncertain &&
            thread.state === 'open' &&
            (!staff || thread.assignee === client.userId) ? (
              <View style={{ gap: 12 }}>
                {staff ? (
                  <>
                    <AppTextInput
                      testID="ticket-close-reason"
                      accessibilityLabel="종료 사유"
                      placeholder="종료 사유"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={closeReason}
                      onChangeText={setCloseReason}
                      editable={!busy}
                      maxLength={500}
                      style={[
                        styles.input,
                        {
                          flex: 0,
                          color: theme.colors.textPrimary,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    />
                    <Choices
                      label="인계할 담당자"
                      value={transferTo}
                      options={staffMembers.map(id => ({
                        value: id,
                        label: `운영자 ${id.slice(0, 8)}`,
                      }))}
                      onChange={value => {
                        if (!busy) setTransferTo(value);
                      }}
                    />
                    <CtaButton
                      role="neutral"
                      testID="ticket-transfer"
                      disabled={busy || !transferTo}
                      onPress={() =>
                        Alert.alert(
                          '담당자를 변경할까요?',
                          '선택한 운영자에게 문의를 인계해요.',
                          [
                            { text: '취소', style: 'cancel' },
                            { text: '인계', onPress: () => submit('transfer') },
                          ],
                        )
                      }
                    >
                      <CtaText>담당 인계</CtaText>
                    </CtaButton>
                  </>
                ) : null}
                <CtaButton
                  role="neutral"
                  testID="ticket-close"
                  disabled={busy || (staff && !closeReason.trim())}
                  onPress={() =>
                    Alert.alert(
                      '문의를 종료할까요?',
                      '추가 질문을 남기면 다시 이어갈 수 있어요.',
                      [
                        { text: '취소', style: 'cancel' },
                        { text: '종료', onPress: () => submit('close') },
                      ],
                    )
                  }
                >
                  <CtaText>{staff ? '문의 종료' : '해결됐어요'}</CtaText>
                </CtaButton>
              </View>
            ) : null}
            {!uncertain && thread.state === 'closed' ? (
              <CtaButton
                role="neutral"
                testID="ticket-reopen"
                disabled={busy}
                onPress={() => submit('reopen')}
              >
                <CtaText>문의 다시 열기</CtaText>
              </CtaButton>
            ) : null}
          </>
        ) : composing ? (
          <InquiryRegistrationForm
            title={title}
            body={draft}
            category={category}
            photos={photos}
            disabled={busy || uncertain}
            onTitle={setTitle}
            onBody={setDraft}
            onCategory={setCategory}
            onAddPhoto={addPhoto}
            onRemovePhoto={id => {
              setPhotos(current => current.filter(photo => photo.id !== id));
              setPhotoError('');
            }}
            onRetryPhoto={id => {
              const photo = photos.find(item => item.id === id);
              if (photo) run(() => upload(photo));
            }}
            photoError={photoError}
          />
        ) : (
          <>
            {items.map(item => (
              <InquiryListItem
                key={item.id}
                title={item.title || ticketTitle(item.category)}
                summary={item.title ? ticketTitle(item.category) : undefined}
                status={ticketStatus(item)}
                date={inquiryDate(item.createdAt, true)}
                unread={item.unread}
                disabled={busy}
                testID={`isolated-ticket-${item.id}`}
                onPress={() => run(() => open(item.id))}
              />
            ))}
            {!busy && mode !== 'alerts' && !items.length ? (
              <Copy>접수된 문의가 없어요.</Copy>
            ) : null}
            {more ? (
              <CtaButton
                role="neutral"
                disabled={busy}
                onPress={() => run(() => list(true))}
              >
                <CtaText>더 보기</CtaText>
              </CtaButton>
            ) : null}
          </>
        )}
      </ScrollView>
      {!threadViewOpen && mode === 'mine' ? (
        <View style={[styles.footer, { borderColor: theme.colors.border }]}>
          <CtaButton
            role="primary"
            testID="ticket-new"
            disabled={busy}
            onPress={onNewInquiry ?? (() => setComposing(true))}
          >
            <CtaText>문의하기</CtaText>
          </CtaButton>
        </View>
      ) : null}
      {composing && !uncertain ? (
        <View style={[styles.footer, { borderColor: theme.colors.border }]}>
          <CtaButton
            testID="ticket-send"
            role="primary"
            loading={busy}
            disabled={sendDisabled}
            onPress={() => {
              Keyboard.dismiss();
              submit('message');
            }}
          >
            <CtaText>문의 등록</CtaText>
          </CtaButton>
        </View>
      ) : null}
      {composer && !composing ? (
        <View style={[styles.footer, { borderColor: theme.colors.border }]}>
          <Glass style={styles.composerGlass}>
            {staff ? (
              <Choices
                label="답변 유형"
                options={kinds}
                value={kind}
                onChange={value => {
                  if (!busy) setKind(value);
                }}
              />
            ) : null}
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoRow}>
                <Copy muted>
                  {`사진 ${index + 1} · ${
                    photo.state === 'ready'
                      ? '첨부됨'
                      : photo.state === 'failed'
                      ? '준비 실패'
                      : '준비 중'
                  }`}
                </Copy>
                {photo.state === 'failed' ? (
                  <CtaButton
                    role="neutral"
                    disabled={busy}
                    onPress={() => run(() => upload(photo))}
                    style={styles.photoAction}
                  >
                    <CtaText>재시도</CtaText>
                  </CtaButton>
                ) : null}
                <CtaButton
                  role="neutral"
                  disabled={busy}
                  accessibilityLabel={`사진 ${index + 1} 제거`}
                  onPress={() => {
                    setPhotos(current =>
                      current.filter(value => value.id !== photo.id),
                    );
                    setPhotoError('');
                  }}
                  style={styles.send}
                >
                  {palette => (
                    <Feather
                      name="x"
                      size={20}
                      color={palette.text}
                      accessible={false}
                    />
                  )}
                </CtaButton>
              </View>
            ))}
            {photoError ? <Copy>{photoError}</Copy> : null}
            <View style={styles.composer}>
              {!staff ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  testID="ticket-attach-photo"
                  accessibilityLabel="사진 첨부"
                  accessibilityState={{ disabled: attachDisabled }}
                  disabled={attachDisabled}
                  activeOpacity={0.55}
                  onPress={addPhoto}
                  style={styles.iconAction}
                >
                  <Feather
                    name="paperclip"
                    size={20}
                    color={
                      attachDisabled
                        ? theme.colors.textMuted
                        : theme.colors.textSecondary
                    }
                    accessible={false}
                  />
                </TouchableOpacity>
              ) : null}
              <AppTextInput
                accessibilityLabel={staff ? '답변 내용' : '문의 메시지'}
                testID="ticket-draft"
                value={draft}
                onChangeText={setDraft}
                placeholder={
                  staff ? '답변을 입력해주세요' : '메시지를 입력해주세요'
                }
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.input,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                editable={!busy}
                multiline
                maxLength={staff ? 5000 : 2000}
              />
              <TouchableOpacity
                accessibilityRole="button"
                testID="ticket-send"
                accessibilityLabel={staff ? '답변 보내기' : '메시지 보내기'}
                accessibilityState={{ disabled: sendDisabled }}
                style={styles.iconAction}
                disabled={sendDisabled}
                activeOpacity={0.55}
                onPress={() => {
                  Keyboard.dismiss();
                  submit(staff ? 'reply' : 'message');
                }}
              >
                <Feather
                  name="arrow-up"
                  size={22}
                  color={
                    sendDisabled ? theme.colors.textMuted : PRODUCT_CTA.primary
                  }
                  accessible={false}
                />
              </TouchableOpacity>
            </View>
          </Glass>
        </View>
      ) : null}
      {uncertain && pending.current ? (
        <View style={[styles.footer, { borderColor: theme.colors.border }]}>
          <CtaButton
            testID="ticket-check-result"
            role="primary"
            disabled={busy}
            onPress={() => {
              const request = pending.current;
              if (request)
                submit(
                  'command' in request
                    ? request.command.p_operation
                    : 'message',
                );
            }}
          >
            <CtaText>전송 결과 다시 확인</CtaText>
          </CtaButton>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24, gap: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerGlass: { padding: 8, gap: 6 },
  iconAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  messages: { gap: 16 },
  day: { alignSelf: 'center' },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoAction: { minHeight: 48, paddingHorizontal: 10 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    maxHeight: 128,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  send: { width: 48, minHeight: 48, paddingHorizontal: 0 },
});
