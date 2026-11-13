import React, { useImperativeHandle, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTheme } from 'styled-components/native';
import AppTextInput from '../../app/ui/AppTextInput';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import Feather from '../../components/icons/NuriFeatherIcon';
import { Choices, Copy, Glass, Row, ui } from './PreviewPrimitives';
import SubscriptionPreview, {
  type PreviewSubscription,
} from './SubscriptionPreview';
import ReferenceArtwork from './ReferenceArtwork';
import { InquiryArtwork, inquiryDate } from './InquiryPresentation';
import NoticeArticle from './NoticeArticle';
import SeasonalAmbientBackground from '../../components/common/SeasonalAmbientBackground';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import AdminDesignScreen, { type AdminDesignHandle } from './AdminDesignScreen';
import IsolatedNoticeScreen, {
  type IsolatedNoticeHandle,
} from '../SupportIsolation/IsolatedNoticeScreen';
import {
  canPreviewRefund,
  faqExamples,
  inquiryTypes,
  noticeExamples,
  isAdminDesignPage,
  type InquiryCategory,
  type PreviewPage,
} from './previewModel';

const pageTitles: Record<PreviewPage, string> = {
  notices: '공지사항',
  isolatedNotices: '공지사항',
  isolatedCommunity: '커뮤니티 공지',
  isolatedReports: '신고내역',
  isolatedTickets: '문의내역',
  isolatedMyTickets: '내 문의 내역',
  isolatedNewTicket: '문의 글 등록',
  isolatedReplyAlerts: '문의 알림',
  isolatedFaq: '자주 묻는 질문',
  isolatedFaqAdmin: 'FAQ 관리',
  notice: '공지사항',
  help: '고객센터',
  faq: '자주 묻는 질문',
  types: '문의하기',
  subscription: '구독하기·구독 관리',
  adRemoval: '광고 제거',
  refund: '환불 접수',
  receipt: '환불 접수',
  adminNotices: '공지 관리',
  adminSupport: '고객 문의 관리',
  adminFaq: 'FAQ 관리',
};
const isolatedPanels = {
  isolatedNotices: undefined,
  isolatedCommunity: 'community',
  isolatedReports: 'reports',
  isolatedTickets: 'tickets',
  isolatedMyTickets: 'myTickets',
  isolatedNewTicket: 'newTicket',
  isolatedReplyAlerts: 'replyAlerts',
  isolatedFaq: 'faq',
  isolatedFaqAdmin: 'faqAdmin',
} as const;
function isIsolatedPage(
  page: PreviewPage,
): page is keyof typeof isolatedPanels {
  return Object.prototype.hasOwnProperty.call(isolatedPanels, page);
}
const filters = ['전체', '업데이트', '안내'] as const;
const faqFilters = ['전체', '앱 사용', '계정', '결제·구독'] as const;
type Attachment = 'none' | 'ready' | 'error';
export type PreviewNavigation = { page: PreviewPage; noticeId?: string };
export type SupportScreenHandle = { back: () => void };

export default function SupportPreviewScreen({
  stack,
  onNavigate,
  onBack,
  onClose,
  subscription: menuSubscription,
  onSubscriptionChange,
  ref,
}: {
  stack: readonly PreviewNavigation[];
  onNavigate: (target: PreviewNavigation) => void;
  onBack: () => void;
  onClose: () => void;
  subscription?: PreviewSubscription;
  onSubscriptionChange?: (value: PreviewSubscription) => void;
  ref?: React.Ref<SupportScreenHandle>;
}) {
  const theme = useTheme();
  const season = useEffectiveSeason();
  const entry = stack[stack.length - 1];
  const page = entry?.page ?? 'help';
  const isAdRemoval = page === 'adRemoval';
  const [isolatedThreadOpen, setIsolatedThreadOpen] = useState(false);
  const [adsHidden, setAdsHidden] = useState(false);
  const adminRef = useRef<AdminDesignHandle>(null);
  const isolatedRef = useRef<IsolatedNoticeHandle>(null);
  const back = () => {
    if (isIsolatedPage(page)) isolatedRef.current?.back();
    else if (isAdminDesignPage(page)) adminRef.current?.back();
    else onBack();
  };
  useImperativeHandle(ref, () => ({ back }));
  const [filter, setFilter] = useState<string>('전체');
  const [faqFilter, setFaqFilter] = useState<string>('전체');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(
    faqExamples[0].question,
  );
  const [inquiryType, setInquiryType] = useState<InquiryCategory>('usage');
  const [reason, setReason] = useState('');
  const [order, setOrder] = useState(false);
  const [refundAttachment, setRefundAttachment] = useState<Attachment>('none');
  const [localSubscription, setLocalSubscription] =
    useState<PreviewSubscription>({
      status: 'none',
      plan: 'memory',
      period: 'year',
    });
  const subscription = menuSubscription ?? localSubscription;
  const canHideAds =
    subscription.status === 'active' || subscription.status === 'canceling';
  const setSubscription = onSubscriptionChange ?? setLocalSubscription;
  const [receipt, setReceipt] = useState(false);
  const navigate = (next: PreviewPage) => onNavigate({ page: next });
  const notice = noticeExamples.find(item => item.id === entry?.noticeId);
  const visibleNotices = noticeExamples.filter(
    item => filter === '전체' || item.category === filter,
  );
  const visibleFaqs = faqExamples.filter(
    item =>
      (faqFilter === '전체' || item.category === faqFilter) &&
      `${item.question} ${item.answer}`.includes(query.trim()),
  );
  const inputStyle = [
    styles.input,
    {
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  ];
  function attachmentControl(
    value: Attachment,
    change: (value: Attachment) => void,
  ) {
    return (
      <View style={styles.section}>
        <Choices
          label="사진 첨부"
          value={value}
          onChange={change}
          options={[
            { value: 'none', label: '첨부 없음' },
            { value: 'ready', label: '사진 첨부' },
            { value: 'error', label: '첨부 실패' },
          ]}
        />
        {value === 'ready' ? (
          <View style={styles.attachment}>
            <Image
              source={require('../../assets/logo/logo_v2.png')}
              style={styles.exampleImage}
              resizeMode="contain"
            />
            <Copy muted>첨부 사진 1장</Copy>
          </View>
        ) : null}
        {value === 'error' ? (
          <View accessibilityLiveRegion="polite">
            <Copy>
              사진을 준비하지 못했어요. 사진을 다시 선택하거나 첨부를
              제거해주세요.
            </Copy>
          </View>
        ) : null}
      </View>
    );
  }
  function noticeRow(item: (typeof noticeExamples)[number]) {
    return (
      <Row
        key={item.id}
        testID={`notice-${item.id}`}
        title={item.title}
        subtitle={`${item.category} · ${inquiryDate(item.date, true) ?? ''}`}
        onPress={() => onNavigate({ page: 'notice', noticeId: item.id })}
      />
    );
  }
  const content = (
    <>
      {page === 'notices' ? (
        <>
          {__DEV__ ? (
            <CtaButton
              testID="isolated-entry"
              role="neutral"
              onPress={() => navigate('isolatedNotices')}
            >
              <CtaText>격리 서버 연결</CtaText>
            </CtaButton>
          ) : null}
          <View style={styles.hero}>
            <View style={ui.grow}>
              <Copy title>누리의 새로운 소식을 전해드려요</Copy>
              <Copy muted>서비스 안내와 업데이트를 확인해보세요.</Copy>
            </View>
            <ReferenceArtwork kind="notice" />
          </View>
          <Choices
            label="공지 분류"
            options={filters.map(value => ({ value, label: value }))}
            value={filter}
            onChange={setFilter}
          />
          <Copy muted>총 {visibleNotices.length}건</Copy>
          {visibleNotices.some(item => item.pinned) ? (
            <>
              <Copy title>주요 공지</Copy>
              <Glass>
                {visibleNotices.filter(item => item.pinned).map(noticeRow)}
              </Glass>
            </>
          ) : null}
          <Copy title>최근 공지</Copy>
          <Glass>
            {visibleNotices.filter(item => !item.pinned).map(noticeRow)}
          </Glass>
        </>
      ) : null}
      {page === 'notice' ? (
        <>
          {notice ? (
            <NoticeArticle
              title={notice.title}
              category={notice.category}
              publishedAt={notice.date}
              body={notice.body}
              summary={notice.summary}
              pinned={notice.pinned}
            />
          ) : (
            <Copy>공지를 찾을 수 없어요.</Copy>
          )}
          <CtaButton role="neutral" onPress={onBack}>
            <CtaText>목록으로</CtaText>
          </CtaButton>
        </>
      ) : null}
      {page === 'help' ? (
        <>
          <View style={styles.hero}>
            <View style={ui.grow}>
              <Copy title>어떤 도움이 필요하세요?</Copy>
              <Copy muted>누리 사용에 필요한 도움을 찾아보세요.</Copy>
            </View>
            <ReferenceArtwork kind="help" />
          </View>
          <Glass>
            <Row
              title="자주 묻는 질문"
              subtitle="자주 찾는 답변을 바로 확인해요."
              icon="message-circle"
              onPress={() => navigate('isolatedFaq')}
              testID="preview-faq"
            />
            <Row
              title="문의하기"
              subtitle="누리팀에 궁금한 점을 남겨주세요."
              icon="headphones"
              onPress={() => navigate('types')}
              testID="preview-inquiry"
            />
            <Row
              title="내 문의 내역"
              subtitle="남긴 문의와 답변을 확인해요."
              icon="inbox"
              onPress={() => navigate('isolatedMyTickets')}
              testID="preview-history"
            />
          </Glass>
          <Copy title>결제·구독 도움말</Copy>
          <Glass>
            <Row
              title="구독하기·구독 관리"
              icon="calendar"
              onPress={() => navigate('subscription')}
            />
            <Row
              title="환불 접수"
              icon="credit-card"
              onPress={() => navigate('refund')}
              testID="preview-open-refund"
            />
          </Glass>
        </>
      ) : null}
      {page === 'faq' ? (
        <>
          <Copy title>궁금한 내용을 찾아보세요</Copy>
          <AppTextInput
            accessibilityLabel="질문 검색"
            testID="support-faq-search"
            placeholder="질문을 검색해보세요"
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            style={inputStyle}
          />
          <Choices
            label="FAQ 분류"
            value={faqFilter}
            onChange={setFaqFilter}
            options={faqFilters.map(value => ({ value, label: value }))}
          />
          <Glass>
            {visibleFaqs.map(item => (
              <View key={item.question}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expanded === item.question }}
                  onPress={() =>
                    setExpanded(
                      expanded === item.question ? null : item.question,
                    )
                  }
                  style={styles.hero}
                >
                  <View style={ui.grow}>
                    <Copy title>{item.question}</Copy>
                  </View>
                  <Feather
                    name={
                      expanded === item.question ? 'chevron-up' : 'chevron-down'
                    }
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                {expanded === item.question ? (
                  <Copy muted>{item.answer}</Copy>
                ) : null}
              </View>
            ))}
            {!visibleFaqs.length ? <Copy>검색 결과가 없어요.</Copy> : null}
          </Glass>
          <Copy muted>찾는 답변이 없나요?</Copy>
          <CtaButton role="primary" onPress={() => navigate('types')}>
            <CtaText>문의하기</CtaText>
          </CtaButton>
        </>
      ) : null}
      {page === 'types' ? (
        <>
          <View style={styles.hero}>
            <View style={ui.grow}>
              <Copy title>누리팀에 어떤 도움이 필요하세요?</Copy>
              <AppText
                preset="caption"
                style={{ color: theme.colors.textSecondary }}
              >
                {'문의 유형을 선택하고\n이야기를 남겨주세요.'}
              </AppText>
            </View>
            <InquiryArtwork size={92} testID="inquiry-nuri-art" />
          </View>
          <Glass>
            {inquiryTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: inquiryType === type.value }}
                onPress={() => setInquiryType(type.value)}
                style={styles.hero}
              >
                <View style={ui.grow}>
                  <Copy title>{type.label}</Copy>
                </View>
                <Feather
                  name={inquiryType === type.value ? 'check-circle' : 'circle'}
                  size={22}
                  color={
                    inquiryType === type.value
                      ? PRODUCT_CTA.primary
                      : theme.colors.textSecondary
                  }
                />
              </TouchableOpacity>
            ))}
          </Glass>
          <CtaButton
            role="primary"
            testID="preview-enter-thread"
            onPress={() => navigate('isolatedNewTicket')}
          >
            <CtaText>문의하기</CtaText>
          </CtaButton>
        </>
      ) : null}
      {page === 'refund' ? (
        <>
          <View style={styles.hero}>
            <View style={ui.grow}>
              <Copy title>어떤 결제에 대한 문의인가요?</Copy>
              <Copy muted>결제 내역과 환불을 요청하는 이유를 남겨주세요.</Copy>
            </View>
            <ReferenceArtwork kind="inquiry" size={72} />
          </View>
          <Glass>
            <Copy title>결제 내역</Copy>
            <Choices
              label="결제 내역"
              value={order ? 'example' : 'none'}
              onChange={value => setOrder(value === 'example')}
              options={[
                { value: 'example', label: '누리 메모리 · 연간 49,000원' },
                { value: 'none', label: '주문 없음' },
              ]}
            />
            {!order ? <Copy muted>선택할 결제 내역이 없어요.</Copy> : null}
            <Copy title>환불 사유</Copy>
            <AppTextInput
              testID="preview-refund-reason"
              accessibilityLabel="환불 사유"
              placeholder="환불을 요청하는 이유를 남겨주세요"
              multiline
              maxLength={2000}
              value={reason}
              onChangeText={setReason}
              style={[...inputStyle, styles.multiline]}
            />
            {attachmentControl(refundAttachment, setRefundAttachment)}
          </Glass>
          <CtaButton
            role="primary"
            testID="preview-refund-submit"
            disabled={!canPreviewRefund(order, reason, refundAttachment)}
            onPress={() => {
              if (canPreviewRefund(order, reason, refundAttachment)) {
                setReceipt(true);
                navigate('receipt');
              }
            }}
          >
            <CtaText>환불 문의 접수</CtaText>
          </CtaButton>
        </>
      ) : null}
      {page === 'receipt' ? (
        <>
          <View style={styles.hero}>
            <View style={ui.grow}>
              <Copy title>
                {receipt ? '환불 문의가 접수됐어요' : '아직 접수 내역이 없어요'}
              </Copy>
            </View>
            <ReferenceArtwork kind="receipt" size={96} />
          </View>
          {receipt ? (
            <Glass>
              <Copy>접수번호 NURI-20261113-001</Copy>
              <Copy>접수 일시 2026.11.13 오전 9:00</Copy>
              <Copy>처리 상태 답변 대기</Copy>
            </Glass>
          ) : null}
          <CtaButton role="neutral" onPress={onBack}>
            <CtaText>입력 화면으로</CtaText>
          </CtaButton>
        </>
      ) : null}
    </>
  );
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {!isAdRemoval ? <SeasonalAmbientBackground season={season} /> : null}
      <View style={styles.header}>
        <TouchableOpacity
          testID="preview-back"
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={back}
          style={styles.tool}
        >
          <Feather
            name="arrow-left"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Copy title>
            {isIsolatedPage(page) && isolatedThreadOpen
              ? '1:1 문의'
              : pageTitles[page]}
          </Copy>
        </View>
        {isAdRemoval ? (
          <View style={styles.tool} />
        ) : (
          <TouchableOpacity
            testID="preview-close"
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={
              isAdminDesignPage(page) || isIsolatedPage(page) ? back : onClose
            }
            style={styles.tool}
          >
            <Feather name="x" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
      {isIsolatedPage(page) && __DEV__ ? (
        <IsolatedNoticeScreen
          key={page}
          ref={isolatedRef}
          onExit={onBack}
          initialPanel={isolatedPanels[page]}
          initialInquiryCategory={inquiryType}
          onThreadViewChange={setIsolatedThreadOpen}
          onFaqContact={() => navigate('types')}
          onNewInquiry={() => navigate('types')}
        />
      ) : isAdminDesignPage(page) ? (
        <AdminDesignScreen
          key={page}
          ref={adminRef}
          area={page}
          onExit={onBack}
        />
      ) : page === 'subscription' ? (
        <SubscriptionPreview
          subscription={subscription}
          onChange={setSubscription}
        />
      ) : isAdRemoval ? (
        <ScrollView contentContainerStyle={styles.adContent}>
          <View
            style={[
              styles.adSetting,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <View style={ui.grow}>
              <View style={styles.adTitle}>
                <Copy title>광고 숨기기</Copy>
                <Image
                  testID="ad-removal-crown"
                  source={require('../../assets/support/subscriber-crown-v1.png')}
                  style={styles.adCrown}
                  resizeMode="contain"
                  accessible={false}
                />
              </View>
              <AppText
                testID="ad-removal-description"
                preset="unifiedBody"
                styleOverridesPreset
                color={theme.colors.textSecondary}
                style={[ui.body, styles.adDescription]}
              >
                광고 없이 사진을 올리고, 소중한 추억이 머무는 공간을 가꿔보세요.
              </AppText>
            </View>
            <Switch
              testID="ad-removal-switch"
              accessibilityLabel="광고 숨기기"
              disabled={!canHideAds}
              value={canHideAds && adsHidden}
              onValueChange={setAdsHidden}
              trackColor={{ true: PRODUCT_CTA.primary }}
            />
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={styles.screen}>
          <ScrollView
            key={page}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  adContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  adSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  adTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  adCrown: { width: 32, height: 24 },
  adDescription: { fontSize: 12 },
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  heading: { flex: 1, minWidth: 0, alignItems: 'center' },
  tool: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 20, paddingBottom: 32, gap: 20 },
  section: { gap: 10 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 56,
    paddingVertical: 12,
  },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48 },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  attachment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  exampleImage: { width: 48, height: 48 },
});
