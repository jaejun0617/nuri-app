import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { Copy, Glass, Row } from '../Support/PreviewPrimitives';
import {
  newNoticeKey,
  NoticeError,
  type CommunityCommand,
  type CommunityNotice,
  type IsolatedNoticeClient,
} from './isolatedNoticeClient';

export type PanelHandle = {
  back: () => void;
  refreshList?: () => Promise<void>;
};

export default function IsolatedCommunityNotices({
  client,
  onBack,
  onError,
  ref,
}: {
  client: IsolatedNoticeClient;
  onBack: () => void;
  onError: (reason: unknown) => void;
  ref?: React.Ref<PanelHandle>;
}) {
  const [items, setItems] = useState<CommunityNotice[]>([]);
  const [cursor, setCursor] = useState<unknown>(null);
  const [allowed, setAllowed] = useState(false);
  const [selected, setSelected] = useState<CommunityNotice | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const request = useRef<CommunityCommand | null>(null);
  const active = useRef(true);
  const lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function run(work: () => Promise<void>) {
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
  }
  async function load(next: unknown = null) {
    const permission = await client.communityAllowed();
    const data = await client.communityNotices(next);
    if (!active.current) return;
    setAllowed(permission);
    setItems(old =>
      next
        ? [
            ...old,
            ...data.items.filter(item => !old.some(row => row.id === item.id)),
          ]
        : data.items,
    );
    setCursor(data.nextCursor);
  }
  const initialize = useRef(() => run(() => load()));
  useEffect(() => {
    initialize.current();
  }, []);
  function back() {
    if (lock.current || uncertain) return;
    if (editing) {
      const leave = () => setEditing(false);
      if (
        title !== (selected?.title ?? '') ||
        body !== (selected?.body ?? '')
      ) {
        Alert.alert('작성을 취소할까요?', '저장하지 않은 내용은 사라져요.', [
          { text: '계속 작성', style: 'cancel' },
          { text: '나가기', style: 'destructive', onPress: leave },
        ]);
      } else leave();
    } else if (selected) setSelected(null);
    else onBack();
  }
  useImperativeHandle(ref, () => ({
    back,
    refreshList: async () => {
      if (!selected && !editing && !uncertain) await run(() => load());
    },
  }));
  function edit(item: CommunityNotice | null) {
    setTitle(item?.title ?? '');
    setBody(item?.body ?? '');
    setSelected(item);
    setEditing(true);
  }
  function submit(action: CommunityCommand['p_action']) {
    run(async () => {
      const command = request.current ?? {
        p_key: newNoticeKey(),
        p_action: action,
        ...(selected
          ? { p_id: selected.id, p_updated: selected.updatedAt }
          : {}),
        ...(action === 'hide' ? {} : { p_title: title, p_content: body }),
      };
      request.current = command;
      try {
        await client.communityCommand(command);
      } catch (error) {
        const pending =
          error instanceof NoticeError &&
          ['NETWORK_UNCERTAIN', 'INVALID_RESPONSE'].includes(error.code);
        if (!pending) request.current = null;
        if (active.current) setUncertain(pending);
        throw error;
      }
      request.current = null;
      if (!active.current) return;
      setUncertain(false);
      setEditing(false);
      setSelected(null);
      setTitle('');
      setBody('');
      await load();
    });
  }
  return (
    <>
      <Copy title>커뮤니티 공지</Copy>
      {busy ? <Copy muted>처리 중이에요.</Copy> : null}
      {editing ? (
        <Glass>
          <Copy title>{selected ? '공지 수정' : '공지 작성'}</Copy>
          <AppTextInput
            accessibilityLabel="커뮤니티 공지 제목"
            placeholder="제목"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            editable={!busy && !uncertain}
          />
          <AppTextInput
            accessibilityLabel="커뮤니티 공지 본문"
            placeholder="내용"
            value={body}
            onChangeText={setBody}
            maxLength={5000}
            multiline
            editable={!busy && !uncertain}
          />
          {!uncertain ? (
            <CtaButton
              role="primary"
              testID="community-notice-save"
              disabled={busy || !title.trim() || !body.trim()}
              onPress={() => submit(selected ? 'update' : 'create')}
            >
              <CtaText>{selected ? '수정 내용 게시' : '공지 게시'}</CtaText>
            </CtaButton>
          ) : null}
        </Glass>
      ) : selected ? (
        <Glass>
          <Copy title>{selected.title}</Copy>
          <Copy>{selected.body}</Copy>
          {allowed && !uncertain ? (
            <>
              <CtaButton
                role="neutral"
                testID="community-notice-edit"
                disabled={busy}
                onPress={() => edit(selected)}
              >
                <CtaText>수정</CtaText>
              </CtaButton>
              <CtaButton
                role="neutral"
                testID="community-notice-hide"
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    '공지를 삭제할까요?',
                    '커뮤니티에 표시되지 않으며 원본과 처리 기록은 보존돼요.',
                    [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '삭제',
                        style: 'destructive',
                        onPress: () => submit('hide'),
                      },
                    ],
                  )
                }
              >
                <CtaText>삭제</CtaText>
              </CtaButton>
            </>
          ) : null}
        </Glass>
      ) : (
        <>
          {allowed ? (
            <CtaButton
              role="primary"
              testID="community-notice-new"
              disabled={busy}
              onPress={() => edit(null)}
            >
              <CtaText>공지 작성</CtaText>
            </CtaButton>
          ) : null}
          {!items.length && !busy ? <Copy>등록된 공지가 없어요.</Copy> : null}
          {items.map(item => (
            <Glass key={item.id}>
              <Row
                testID={`community-notice-${item.id}`}
                title={item.title}
                onPress={() => setSelected(item)}
              />
            </Glass>
          ))}
          {cursor ? (
            <CtaButton
              role="neutral"
              disabled={busy}
              onPress={() => run(() => load(cursor))}
            >
              <CtaText>더 보기</CtaText>
            </CtaButton>
          ) : null}
        </>
      )}
      {uncertain ? (
        <CtaButton
          role="primary"
          disabled={busy}
          onPress={() => {
            if (request.current) submit(request.current.p_action);
          }}
        >
          <CtaText>처리 결과 다시 확인</CtaText>
        </CtaButton>
      ) : null}
    </>
  );
}
