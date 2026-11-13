import React, {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { NuriAlert } from '../../app/ui/NuriAlert';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import { Choices, Copy, Glass, Row } from '../Support/PreviewPrimitives';
import type { PanelHandle } from './IsolatedCommunityNotices';
import {
  newNoticeKey,
  NoticeError,
  type FaqCategory,
  type FaqCommand,
  type FaqContent,
  type FaqEntry,
  type IsolatedNoticeClient,
} from './isolatedNoticeClient';

const categories: { value: FaqCategory; label: string }[] = [
  { value: 'usage', label: '앱 사용' },
  { value: 'account', label: '계정' },
  { value: 'billing', label: '결제·구독' },
];
const blank: FaqContent = { question: '', answer: '', category: 'usage' };

export default function IsolatedFaq({
  client,
  management,
  status,
  onBack,
  onError,
  onContact,
  ref,
}: {
  client: IsolatedNoticeClient;
  management: boolean;
  status: React.ReactNode;
  onBack: () => void;
  onError: (error: unknown) => void;
  onContact?: () => void;
  ref?: React.Ref<PanelHandle>;
}) {
  const theme = useTheme();
  const live = useRef(false);
  const lock = useRef(false);
  const pending = useRef<FaqCommand | null>(null);
  const [items, setItems] = useState<FaqEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<{
    entry: FaqEntry | null;
    value: FaqContent;
    dirty: boolean;
  } | null>(null);
  const [filter, setFilter] = useState<'all' | FaqCategory>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const result = await client.faqs(management);
    if (!live.current) return;
    setItems(result);
    setReady(true);
  }
  async function run(work: () => Promise<void>) {
    if (!live.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (reason) {
      if (!live.current) return;
      const code = reason instanceof NoticeError ? reason.code : null;
      if (
        code === 'SUPPORT_FORBIDDEN' ||
        code === 'AUTH_REQUIRED' ||
        code === 'SUPPORT_AUTH_REQUIRED'
      ) {
        setReady(false);
        setItems([]);
        setEdit(null);
        pending.current = null;
        if (code !== 'SUPPORT_FORBIDDEN') onError(reason);
        else setError('FAQ를 관리할 권한이 없어요.');
      } else if (code === 'SUPPORT_REVISION_CONFLICT') {
        setError(
          '다른 변경이 먼저 저장됐어요. 입력은 남겨뒀으니 현재 작업본을 확인해주세요.',
        );
      } else {
        setError(
          pending.current
            ? '처리 결과를 확인하지 못했어요. 같은 요청의 결과를 다시 확인해주세요.'
            : 'FAQ를 불러오거나 저장하지 못했어요. 연결을 확인해주세요.',
        );
      }
    } finally {
      lock.current = false;
      if (live.current) setBusy(false);
    }
  }
  const refreshCurrent = useEffectEvent(() => {
    if (!pending.current) run(load);
  });
  useEffect(() => {
    live.current = true;
    refreshCurrent();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshCurrent();
    });
    return () => {
      live.current = false;
      subscription.remove();
    };
  }, []);

  function back() {
    if (lock.current) return;
    if (pending.current) {
      NuriAlert.alert(
        '처리 결과를 확인해주세요',
        '같은 요청으로 결과를 확인한 뒤 나갈 수 있어요.',
      );
      return;
    }
    if (!edit) onBack();
    else if (!edit.dirty) setEdit(null);
    else
      NuriAlert.alert(
        '작성 중인 FAQ가 있어요',
        '저장하지 않은 변경은 사라져요.',
        [
          { text: '계속 작성', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => setEdit(null),
          },
        ],
      );
  }
  useImperativeHandle(ref, () => ({ back }));

  function submit(action: FaqCommand['p_action']) {
    if (!edit) return;
    run(async () => {
      const working = edit.entry?.working;
      const request = pending.current ?? {
        p_key: newNoticeKey(),
        p_action: action,
        ...(edit.entry && working
          ? { p_id: edit.entry.id, p_revision: working.revision }
          : {}),
        ...(action === 'save' ? { p_content: edit.value } : {}),
      };
      pending.current = request;
      let result: FaqEntry;
      try {
        result = await client.faqCommand(request);
      } catch (reason) {
        if (
          !(reason instanceof NoticeError) ||
          (reason.code !== 'NETWORK_UNCERTAIN' &&
            reason.code !== 'INVALID_RESPONSE')
        )
          pending.current = null;
        throw reason;
      }
      if (!live.current || !result.working) return;
      pending.current = null;
      setItems(old =>
        old.some(item => item.id === result.id)
          ? old.map(item => (item.id === result.id ? result : item))
          : [...old, result],
      );
      setEdit(
        request.p_action === 'save'
          ? { entry: result, value: result.working.draft, dirty: false }
          : null,
      );
    });
  }
  function confirm(action: 'publish' | 'stop') {
    const label = action === 'publish' ? '게시' : '게시 중단';
    NuriAlert.alert(
      label + '할까요?',
      action === 'publish'
        ? '저장한 질문과 답변을 사용자 FAQ에 공개해요.'
        : '사용자 FAQ에서 숨기고 작업본은 보존해요.',
      [
        { text: '취소', style: 'cancel' },
        { text: label, onPress: () => submit(action) },
      ],
    );
  }

  const input = [
    styles.input,
    {
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  ];
  const query = search.trim().toLocaleLowerCase();
  const hasBilling = items.some(item => item.published?.category === 'billing');
  const visible = items.filter(
    ({ published }) =>
      published &&
      (filter === 'all' || published.category === filter) &&
      (!query ||
        [published.question, published.answer].some(value =>
          value.toLocaleLowerCase().includes(query),
        )),
  );
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        !edit ? (
          <RefreshControl
            refreshing={refreshing}
            colors={[PRODUCT_CTA.primary]}
            tintColor={PRODUCT_CTA.primary}
            onRefresh={() => {
              if (lock.current) return;
              setRefreshing(true);
              run(load).finally(() => {
                if (live.current) setRefreshing(false);
              });
            }}
          />
        ) : undefined
      }
    >
      {status}
      {error ? <Copy>{error}</Copy> : null}
      {busy && !refreshing ? <Copy muted>확인 중이에요.</Copy> : null}
      {ready && management && !edit ? (
        <>
          <CtaButton
            role="primary"
            disabled={busy}
            onPress={() => setEdit({ entry: null, value: blank, dirty: true })}
          >
            <CtaText>FAQ 작성</CtaText>
          </CtaButton>
          {!items.length ? <Copy muted>저장된 FAQ가 없어요.</Copy> : null}
          {items.map(item =>
            item.working ? (
              <Glass key={item.id}>
                <Row
                  title={item.working.draft.question}
                  subtitle={item.published ? '공개 중' : '비공개 작업본'}
                  onPress={() => {
                    if (!lock.current && item.working)
                      setEdit({
                        entry: item,
                        value: item.working.draft,
                        dirty: false,
                      });
                  }}
                />
              </Glass>
            ) : null,
          )}
        </>
      ) : null}
      {edit ? (
        <Glass>
          <Copy title>{edit.entry ? 'FAQ 수정' : 'FAQ 작성'}</Copy>
          <AppTextInput
            style={input}
            accessibilityLabel="질문"
            placeholder="질문"
            maxLength={150}
            editable={!busy && !pending.current}
            value={edit.value.question}
            onChangeText={question =>
              setEdit({
                ...edit,
                value: { ...edit.value, question },
                dirty: true,
              })
            }
          />
          <AppTextInput
            style={[input, styles.answer]}
            accessibilityLabel="답변"
            placeholder="답변"
            maxLength={4000}
            editable={!busy && !pending.current}
            multiline
            value={edit.value.answer}
            onChangeText={answer =>
              setEdit({
                ...edit,
                value: { ...edit.value, answer },
                dirty: true,
              })
            }
          />
          <Choices
            label="FAQ 분류"
            options={categories}
            value={edit.value.category}
            onChange={category => {
              if (!lock.current && !pending.current)
                setEdit({
                  ...edit,
                  value: { ...edit.value, category },
                  dirty: true,
                });
            }}
          />
          {edit.dirty || pending.current ? (
            <CtaButton
              role="primary"
              disabled={
                busy ||
                (!pending.current &&
                  (!edit.value.question.trim() || !edit.value.answer.trim()))
              }
              onPress={() => submit('save')}
            >
              <CtaText>
                {pending.current ? '처리 결과 다시 확인' : '작업본 저장'}
              </CtaText>
            </CtaButton>
          ) : (
            <CtaButton
              role="primary"
              disabled={busy}
              onPress={() => confirm('publish')}
            >
              <CtaText>
                {edit.entry?.published ? '수정 내용 게시' : '게시'}
              </CtaText>
            </CtaButton>
          )}
          {edit.entry?.published && !edit.dirty && !pending.current ? (
            <CtaButton
              role="neutral"
              disabled={busy}
              onPress={() => confirm('stop')}
            >
              <CtaText>게시 중단</CtaText>
            </CtaButton>
          ) : null}
        </Glass>
      ) : null}
      {!management ? (
        <>
          <AppTextInput
            style={input}
            accessibilityLabel="FAQ 검색"
            placeholder="질문을 검색해보세요"
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <Choices
            label="FAQ 분류"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '전체' },
              ...categories.filter(
                item => item.value !== 'billing' || hasBilling,
              ),
            ]}
          />
          {ready && !visible.length ? (
            <Copy muted>
              {query || filter !== 'all'
                ? '검색 결과가 없어요.'
                : '공개된 질문이 없어요.'}
            </Copy>
          ) : null}
          {visible.map(({ id, published }) =>
            published ? (
              <Glass key={id}>
                <Row
                  title={published.question}
                  expanded={open === id}
                  onPress={() => setOpen(old => (old === id ? null : id))}
                />
                {open === id ? <Copy>{published.answer}</Copy> : null}
              </Glass>
            ) : null,
          )}
          {onContact ? (
            <CtaButton role="neutral" onPress={onContact}>
              <CtaText>문의하기</CtaText>
            </CtaButton>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48 },
  answer: { minHeight: 120, textAlignVertical: 'top' },
});
