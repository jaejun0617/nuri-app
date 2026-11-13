import React, { useImperativeHandle, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import { useTheme } from 'styled-components/native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { Choices, Copy, Glass, Row } from './PreviewPrimitives';
import { faqExamples, noticeExamples } from './previewModel';

type Content = {
  title: string;
  body: string;
  category: string;
  pinned: boolean;
};
type Document = {
  id: string;
  draft: Content;
  published: Content | null;
  status: 'draft' | 'published' | 'stopped';
};
type Screen =
  | { kind: 'list' }
  | { kind: 'edit'; document: Document; dirty: boolean }
  | { kind: 'preview'; document: Document; dirty: boolean }
  | { kind: 'ticket' };
export type AdminArea = 'adminNotices' | 'adminSupport' | 'adminFaq';
export type AdminDesignHandle = { back: () => void };
const statusLabel = { draft: '초안', published: '게시 중', stopped: '중단' };

// Local visual workflow only; never shares account permissions or server content.
export default function AdminDesignScreen({
  area,
  onExit,
  ref,
}: {
  area: AdminArea;
  onExit: () => void;
  ref?: React.Ref<AdminDesignHandle>;
}) {
  const theme = useTheme();
  const faq = area === 'adminFaq';
  const [documents, setDocuments] = useState<Document[]>(() =>
    faq
      ? faqExamples.map((item, index) => {
          const content = {
            title: item.question,
            body: item.answer,
            category: item.category,
            pinned: false,
          };
          return {
            id: `faq-${index}`,
            draft: content,
            published: content,
            status: 'published',
          };
        })
      : noticeExamples.map(item => {
          const content = {
            title: item.title,
            body: item.summary,
            category: item.category,
            pinned: item.pinned,
          };
          return {
            id: item.id,
            draft: content,
            published: content,
            status: 'published',
          };
        }),
  );
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState('');
  const [reply, setReply] = useState('');
  const [replyKind, setReplyKind] = useState<'answer' | 'information'>(
    'answer',
  );
  const [claimed, setClaimed] = useState(false);
  const [closed, setClosed] = useState(false);
  const [needsStaff, setNeedsStaff] = useState(true);
  const [answers, setAnswers] = useState<string[]>([]);
  const inputStyle = [
    styles.input,
    { color: theme.colors.textPrimary, borderColor: theme.colors.border },
  ];
  const editing =
    screen.kind === 'edit' || screen.kind === 'preview' ? screen : null;
  const valid = Boolean(
    editing?.document.draft.title.trim() && editing.document.draft.body.trim(),
  );
  const leaveEditor = () => {
    if (editing?.dirty) {
      Alert.alert('작성 중인 내용이 있어요', '저장하지 않은 내용을 버릴까요?', [
        { text: '계속 작성', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => setScreen({ kind: 'list' }),
        },
      ]);
    } else setScreen({ kind: 'list' });
  };
  const back = () => {
    if (screen.kind === 'preview') setScreen({ ...screen, kind: 'edit' });
    else if (screen.kind === 'edit') leaveEditor();
    else if (screen.kind === 'ticket') {
      if (reply.trim())
        Alert.alert(
          '작성 중인 답변이 있어요',
          '답변은 이 화면을 닫으면 사라져요.',
          [
            { text: '계속 작성', style: 'cancel' },
            {
              text: '나가기',
              onPress: () => {
                setReply('');
                setScreen({ kind: 'list' });
              },
            },
          ],
        );
      else setScreen({ kind: 'list' });
    } else onExit();
  };
  useImperativeHandle(ref, () => ({ back }));
  const save = (publish: boolean) => {
    if (!editing || !valid) return;
    const draft = {
      ...editing.document.draft,
      title: editing.document.draft.title.trim(),
      body: editing.document.draft.body.trim(),
    };
    const next: Document = {
      ...editing.document,
      draft,
      ...(publish ? { published: draft, status: 'published' as const } : {}),
    };
    setDocuments(previous => {
      const items = previous.some(item => item.id === next.id)
        ? previous.map(item => (item.id === next.id ? next : item))
        : [next, ...previous];
      return publish && draft.pinned
        ? items.map(item =>
            item.id !== next.id && item.published?.pinned
              ? {
                  ...item,
                  published: { ...item.published, pinned: false },
                  draft: { ...item.draft, pinned: false },
                }
              : item,
          )
        : items;
    });
    setFeedback(publish ? '게시했어요.' : '초안을 저장했어요.');
    setScreen({ kind: 'list' });
  };
  const update = (patch: Partial<Content>) => {
    setScreen(previous => {
      if (previous.kind !== 'edit' && previous.kind !== 'preview')
        return previous;
      return {
        kind: 'edit',
        document: {
          ...previous.document,
          draft: { ...previous.document.draft, ...patch },
        },
        dirty: true,
      };
    });
  };
  const ticketVisible =
    filter === 'all' ||
    (filter === 'waiting' && needsStaff && !closed) ||
    (filter === 'unassigned' && !claimed && !closed) ||
    (filter === 'mine' && claimed && !closed) ||
    (filter === 'closed' && closed);
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {feedback ? (
          <View accessibilityLiveRegion="polite">
            <Copy muted>{feedback}</Copy>
          </View>
        ) : null}
        {area === 'adminSupport' ? (
          screen.kind === 'ticket' ? (
            <>
              <Copy title>오류·불편</Copy>
              <Copy muted>
                NURI-20261113-001 ·{' '}
                {closed ? '종료' : needsStaff ? '답변 대기' : '답변 완료'}
              </Copy>
              <Glass>
                <Copy>기록을 저장할 때 화면이 멈춰요.</Copy>
              </Glass>
              {answers.map((text, index) => (
                <Glass key={index}>
                  <Copy muted>누리팀</Copy>
                  <Copy>{text}</Copy>
                </Glass>
              ))}
              <Copy muted>{claimed ? '내 담당' : '미배정'}</Copy>
              {!claimed && !closed ? (
                <CtaButton
                  role="neutral"
                  testID="admin-claim"
                  onPress={() => setClaimed(true)}
                >
                  <CtaText>담당하기</CtaText>
                </CtaButton>
              ) : null}
              {!closed ? (
                <>
                  <Choices
                    label="답변 종류"
                    value={replyKind}
                    onChange={setReplyKind}
                    options={[
                      { value: 'answer', label: '안내 답변' },
                      { value: 'information', label: '추가 정보 요청' },
                    ]}
                  />
                  <AppTextInput
                    testID="admin-reply-input"
                    accessibilityLabel="답변 내용"
                    placeholder="답변을 입력해주세요"
                    multiline
                    maxLength={5000}
                    value={reply}
                    onChangeText={setReply}
                    style={[inputStyle, styles.body]}
                  />
                  <CtaButton
                    role="primary"
                    testID="admin-reply-send"
                    disabled={!claimed || !reply.trim()}
                    onPress={() => {
                      setAnswers(previous => [...previous, reply.trim()]);
                      setReply('');
                      setNeedsStaff(false);
                      setFeedback(
                        replyKind === 'information'
                          ? '추가 정보를 요청했어요. 사용자 응답을 기다리고 있어요.'
                          : '답변을 보냈어요.',
                      );
                    }}
                  >
                    <CtaText>
                      {replyKind === 'information'
                        ? '정보 요청 보내기'
                        : '답변 보내기'}
                    </CtaText>
                  </CtaButton>
                  <CtaButton
                    role="neutral"
                    disabled={!claimed}
                    onPress={() =>
                      Alert.alert(
                        '문의를 종료할까요?',
                        '답변만으로 문의가 자동 종료되지는 않아요.',
                        [
                          { text: '취소', style: 'cancel' },
                          {
                            text: '해결 완료로 종료',
                            onPress: () => {
                              setClosed(true);
                              setFeedback('해결 완료로 종료했어요.');
                            },
                          },
                        ],
                      )
                    }
                  >
                    <CtaText>해결 완료로 종료</CtaText>
                  </CtaButton>
                </>
              ) : (
                <CtaButton
                  role="neutral"
                  onPress={() => {
                    setClosed(false);
                    setNeedsStaff(true);
                  }}
                >
                  <CtaText>문의 다시 열기</CtaText>
                </CtaButton>
              )}
              <CtaButton
                role="neutral"
                testID="admin-ticket-list"
                onPress={back}
              >
                <CtaText>문의 목록으로</CtaText>
              </CtaButton>
            </>
          ) : (
            <>
              <Copy title>문의 큐</Copy>
              <Choices
                label="문의 필터"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'waiting', label: '응답 필요' },
                  { value: 'unassigned', label: '미배정' },
                  { value: 'mine', label: '내 담당' },
                  { value: 'closed', label: '종료' },
                ]}
              />
              {ticketVisible ? (
                <Glass>
                  <Row
                    title="기록을 저장할 때 화면이 멈춰요"
                    subtitle={`오류·불편 · ${
                      closed ? '종료' : claimed ? '내 담당' : '미배정'
                    }`}
                    testID="admin-open-ticket"
                    onPress={() => setScreen({ kind: 'ticket' })}
                  />
                </Glass>
              ) : (
                <Copy muted>해당하는 문의가 없어요.</Copy>
              )}
            </>
          )
        ) : editing ? (
          <>
            <Copy title>
              {screen.kind === 'preview'
                ? '게시 내용 확인'
                : faq
                ? 'FAQ 편집'
                : '공지 작성·편집'}
            </Copy>
            {screen.kind === 'preview' ? (
              <Glass>
                <Copy title>{editing.document.draft.title}</Copy>
                <Copy muted>{editing.document.draft.category}</Copy>
                <Copy>{editing.document.draft.body}</Copy>
              </Glass>
            ) : (
              <>
                <Copy>제목</Copy>
                <AppTextInput
                  testID="admin-title"
                  accessibilityLabel="제목"
                  maxLength={150}
                  value={editing.document.draft.title}
                  onChangeText={title => update({ title })}
                  style={inputStyle}
                />
                <Choices
                  label="분류"
                  value={editing.document.draft.category}
                  onChange={category => update({ category })}
                  options={(faq
                    ? ['앱 사용', '계정', '결제·구독']
                    : ['업데이트', '안내']
                  ).map(value => ({ value, label: value }))}
                />
                <Copy>본문</Copy>
                <AppTextInput
                  testID="admin-body"
                  accessibilityLabel="본문"
                  multiline
                  maxLength={10000}
                  value={editing.document.draft.body}
                  onChangeText={body => update({ body })}
                  style={[inputStyle, styles.body]}
                />
                {!faq ? (
                  <View style={styles.line}>
                    <Copy>주요 공지</Copy>
                    <Switch
                      accessibilityLabel="주요 공지"
                      value={editing.document.draft.pinned}
                      onValueChange={pinned => update({ pinned })}
                    />
                  </View>
                ) : null}
              </>
            )}
            <CtaButton
              role="neutral"
              testID="admin-preview"
              onPress={() =>
                setScreen({
                  ...editing,
                  kind: screen.kind === 'preview' ? 'edit' : 'preview',
                })
              }
            >
              <CtaText>
                {screen.kind === 'preview' ? '편집 계속하기' : '게시 내용 확인'}
              </CtaText>
            </CtaButton>
            <CtaButton
              role="neutral"
              testID="admin-save-draft"
              disabled={!valid}
              onPress={() => save(false)}
            >
              <CtaText>초안 저장</CtaText>
            </CtaButton>
            <CtaButton
              role="primary"
              testID="admin-publish"
              disabled={!valid}
              onPress={() =>
                Alert.alert(
                  '게시할까요?',
                  '저장한 내용을 사용자에게 공개해요.',
                  [
                    { text: '취소', style: 'cancel' },
                    { text: '게시', onPress: () => save(true) },
                  ],
                )
              }
            >
              <CtaText>
                {editing.document.published ? '수정 내용 게시' : '게시하기'}
              </CtaText>
            </CtaButton>
            <CtaButton role="neutral" onPress={leaveEditor}>
              <CtaText>목록으로</CtaText>
            </CtaButton>
          </>
        ) : (
          <>
            <Choices
              label="게시 상태"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: '전체' },
                { value: 'published', label: '게시 중' },
                { value: 'draft', label: '초안' },
                { value: 'stopped', label: '중단' },
              ]}
            />
            <CtaButton
              role="primary"
              testID="admin-new"
              onPress={() =>
                setScreen({
                  kind: 'edit',
                  dirty: false,
                  document: {
                    id: `local-${documents.length}`,
                    status: 'draft',
                    published: null,
                    draft: {
                      title: '',
                      body: '',
                      category: faq ? '앱 사용' : '안내',
                      pinned: false,
                    },
                  },
                })
              }
            >
              <CtaText>{faq ? 'FAQ 작성' : '공지 작성'}</CtaText>
            </CtaButton>
            {documents
              .filter(item => filter === 'all' || item.status === filter)
              .map(item => (
                <Glass key={item.id}>
                  <Row
                    title={item.draft.title}
                    testID={`admin-edit-${item.id}`}
                    subtitle={`${statusLabel[item.status]} · ${
                      item.draft.category
                    }`}
                    onPress={() => {
                      setFeedback('');
                      setScreen({ kind: 'edit', document: item, dirty: false });
                    }}
                  />
                  {item.status === 'published' ? (
                    <CtaButton
                      role="neutral"
                      onPress={() =>
                        Alert.alert(
                          '게시를 중단할까요?',
                          '작성 내용은 보존하고 사용자 목록에서 내려요.',
                          [
                            { text: '취소', style: 'cancel' },
                            {
                              text: '중단',
                              onPress: () =>
                                setDocuments(previous =>
                                  previous.map(row =>
                                    row.id === item.id
                                      ? { ...row, status: 'stopped' }
                                      : row,
                                  ),
                                ),
                            },
                          ],
                        )
                      }
                    >
                      <CtaText>게시 중단</CtaText>
                    </CtaButton>
                  ) : null}
                </Glass>
              ))}
            {!documents.some(
              item => filter === 'all' || item.status === filter,
            ) ? (
              <Copy muted>해당하는 글이 없어요.</Copy>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, minHeight: 48 },
  body: { minHeight: 180, textAlignVertical: 'top' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
