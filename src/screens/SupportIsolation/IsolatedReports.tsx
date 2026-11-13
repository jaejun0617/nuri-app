import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { Choices, Copy, Glass, Row } from '../Support/PreviewPrimitives';
import type { PanelHandle } from './IsolatedCommunityNotices';
import {
  newNoticeKey,
  NoticeError,
  type IsolatedNoticeClient,
  type Report,
  type ReportCommand,
} from './isolatedNoticeClient';

const statuses = [
  { value: 'reviewing', label: '검토 중' },
  { value: 'held', label: '보류' },
  { value: 'resolved', label: '처리 완료' },
] as const;
const date = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function IsolatedReports({
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
  const [items, setItems] = useState<Report[]>([]);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [status, setStatus] =
    useState<(typeof statuses)[number]['value']>('reviewing');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<ReportCommand | null>(null);
  const active = useRef(true);
  const lock = useRef(false);
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
  async function load(append = false) {
    const rows = await client.reports(append ? items.at(-1) : undefined);
    if (!active.current) return;
    setItems(old =>
      append
        ? [...old, ...rows.filter(row => !old.some(item => item.id === row.id))]
        : rows,
    );
    setMore(rows.length === 20);
  }
  const initialize = useRef(() => run(() => load()));
  useEffect(() => {
    active.current = true;
    initialize.current();
    return () => {
      active.current = false;
    };
  }, []);
  function back() {
    if (lock.current || uncertain) return;
    if (selected && note !== (selected.note ?? '')) {
      Alert.alert('처리 메모를 저장하지 않았어요', '목록으로 돌아갈까요?', [
        { text: '계속 작성', style: 'cancel' },
        { text: '돌아가기', onPress: () => setSelected(null) },
      ]);
    } else if (selected) setSelected(null);
    else onBack();
  }
  useImperativeHandle(ref, () => ({
    back,
    refreshList: async () => {
      if (!selected && !uncertain) await run(() => load());
    },
  }));
  function submit() {
    if (!selected) return;
    const report = selected;
    run(async () => {
      const command = pending.current ?? {
        p_key: newNoticeKey(),
        p_id: report.id,
        p_previous: report.auditId,
        p_status: status,
        p_note: note,
      };
      pending.current = command;
      try {
        await client.reportReview(command);
      } catch (error) {
        const unknown =
          error instanceof NoticeError &&
          ['NETWORK_UNCERTAIN', 'INVALID_RESPONSE'].includes(error.code);
        if (!unknown) pending.current = null;
        if (active.current) setUncertain(unknown);
        throw error;
      }
      pending.current = null;
      if (!active.current) return;
      setUncertain(false);
      setSelected(null);
      setNote('');
      await load();
    });
  }
  return (
    <>
      <Copy title>{selected ? '신고 상세' : '신고내역'}</Copy>
      {busy ? <Copy muted>처리 중이에요.</Copy> : null}
      {selected ? (
        <Glass>
          <Copy title>{selected.summary ?? '신고 대상'}</Copy>
          <Copy muted>{date.format(new Date(selected.createdAt))}</Copy>
          <Copy>{selected.reason}</Copy>
          <Choices
            label="신고 처리 상태"
            value={status}
            options={statuses}
            onChange={value => {
              if (!busy && !uncertain) setStatus(value);
            }}
          />
          <AppTextInput
            accessibilityLabel="처리 메모"
            placeholder="처리 메모"
            multiline
            maxLength={500}
            value={note}
            onChangeText={setNote}
            editable={!busy && !uncertain}
          />
          <CtaButton
            role="primary"
            testID="report-save"
            disabled={busy || !note.trim()}
            onPress={() => {
              if (uncertain) submit();
              else
                Alert.alert(
                  '신고 상태를 저장할까요?',
                  '검토 상태와 메모를 기록해요. 신고 대상은 숨기거나 삭제하지 않아요.',
                  [
                    { text: '취소', style: 'cancel' },
                    { text: '저장', onPress: submit },
                  ],
                );
            }}
          >
            <CtaText>{uncertain ? '처리 결과 다시 확인' : '처리 저장'}</CtaText>
          </CtaButton>
        </Glass>
      ) : (
        <>
          {!items.length && !busy ? <Copy>접수된 신고가 없어요.</Copy> : null}
          {items.map(item => (
            <Glass key={item.id}>
              <Row
                testID={`isolated-report-${item.id}`}
                title={
                  item.summary ??
                  (item.target === 'post' ? '게시글 신고' : '댓글 신고')
                }
                subtitle={`${date.format(new Date(item.createdAt))} · ${
                  statuses.find(entry => entry.value === item.status)?.label ??
                  '접수'
                }`}
                onPress={() => {
                  if (lock.current) return;
                  setSelected(item);
                  setNote(item.note ?? '');
                  setStatus(
                    statuses.find(entry => entry.value === item.status)
                      ?.value ?? 'reviewing',
                  );
                }}
              />
            </Glass>
          ))}
          {more ? (
            <CtaButton
              role="neutral"
              disabled={busy}
              onPress={() => run(() => load(true))}
            >
              <CtaText>더 보기</CtaText>
            </CtaButton>
          ) : null}
        </>
      )}
    </>
  );
}
