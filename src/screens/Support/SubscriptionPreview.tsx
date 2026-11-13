import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import Feather from '../../components/icons/NuriFeatherIcon';
import { HomeReflectiveGlass } from '../../components/home/HomeReflectiveGlass';
import { NuriAlert } from '../../app/ui/NuriAlert';
import { Choices, Copy, Glass, ui } from './PreviewPrimitives';
import { subscriptionLabels, type SubscriptionExample } from './previewModel';

export type Plan = 'memory' | 'plus';
export type Period = 'year' | 'month';
export type PreviewSubscription = {
  status: SubscriptionExample;
  plan: Plan;
  period: Period;
};

// Development-only catalog. Replace with verified store products before release.
export const plans: readonly {
  id: Plan;
  name: string;
  detail: string;
  month: number;
  year: number;
}[] = [
  {
    id: 'memory',
    name: '누리 메모리',
    detail: '아이와의 일상을 차곡차곡',
    month: 4900,
    year: 49000,
  },
  {
    id: 'plus',
    name: '누리 메모리 플러스',
    detail: '더 선명하게 간직할 소중한 순간',
    month: 7900,
    year: 79000,
  },
];
const benefits = [
  ['사진·기록 모아보기', '기본', '확장', '확장'],
  ['광고 없는 감상', '—', '예정', '예정'],
  ['추억 영상 만들기', '—', '예정', '예정'],
  ['고화질 추억 보관', '—', '—', '예정'],
] as const;
const priceLabel = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

/** All actions stay in the mounted review. This is not an entitlement provider. */
export default function SubscriptionPreview({
  subscription,
  onChange,
}: {
  subscription: PreviewSubscription;
  onChange: (next: PreviewSubscription) => void;
}) {
  const theme = useTheme();
  const [plan, setPlan] = useState<Plan>(subscription.plan);
  const [period, setPeriod] = useState<Period>(subscription.period);
  const [feedback, setFeedback] = useState('');
  const active =
    subscription.status === 'active' || subscription.status === 'canceling';
  const selectedPlan = plans.find(item => item.id === plan) ?? plans[0];
  const subscribedPlan = plans.find(item => item.id === subscription.plan);
  return (
    <View style={ui.grow}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Copy muted>아이와 보낸 평범한 하루가 오래도록 빛날 수 있도록.</Copy>
        </View>
        {!active ? (
          <Choices
            label="결제 주기"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'year', label: '연간' },
              { value: 'month', label: '월간' },
            ]}
          />
        ) : null}
        {!active
          ? plans.map(option => (
              <TouchableOpacity
                key={option.id}
                testID={`plan-${option.id}`}
                accessibilityRole="radio"
                accessibilityLabel={option.name}
                accessibilityState={{ selected: plan === option.id }}
                onPress={() => setPlan(option.id)}
                activeOpacity={0.75}
                style={styles.planTouch}
              >
                <Glass>
                  {plan === option.id ? (
                    <View pointerEvents="none" style={styles.selectedPlan} />
                  ) : null}
                  <View style={styles.line}>
                    <Feather
                      name={plan === option.id ? 'check-circle' : 'circle'}
                      size={22}
                      color={
                        plan === option.id
                          ? PRODUCT_CTA.primary
                          : theme.colors.textSecondary
                      }
                    />
                    <View style={ui.grow}>
                      <Copy title>{option.name}</Copy>
                      <Copy muted>{option.detail}</Copy>
                    </View>
                  </View>
                  <View style={styles.line}>
                    <Copy>{period === 'year' ? '연간 이용' : '월간 이용'}</Copy>
                    <Copy title>
                      {priceLabel(option[period])} /{' '}
                      {period === 'year' ? '년' : '월'}
                    </Copy>
                  </View>
                </Glass>
              </TouchableOpacity>
            ))
          : null}
        <Copy title>누리 구독 혜택</Copy>
        <HomeReflectiveGlass borderRadius={8} style={styles.table}>
          <View
            style={[styles.tableRow, { backgroundColor: PRODUCT_CTA.subtle }]}
          >
            {['혜택', '무료', '메모리', '플러스'].map((label, index) => (
              <View
                key={label}
                style={index === 0 ? styles.featureCell : styles.valueCell}
              >
                <Copy>{label}</Copy>
              </View>
            ))}
          </View>
          {benefits.map(row => (
            <View
              key={row[0]}
              style={[
                styles.tableRow,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {row.map((label, index) => (
                <View
                  key={index}
                  style={index === 0 ? styles.featureCell : styles.valueCell}
                >
                  <Copy muted={index > 0}>{label}</Copy>
                </View>
              ))}
            </View>
          ))}
        </HomeReflectiveGlass>
        <Glass>
          <View style={styles.line}>
            <Copy title>내 구독</Copy>
            <AppText
              testID="preview-subscription-status"
              preset="unifiedLabel"
              style={{ color: PRODUCT_CTA.primary }}
            >
              {subscriptionLabels[subscription.status]}
            </AppText>
          </View>
          {active ? (
            <Copy>
              {subscribedPlan?.name} ·{' '}
              {subscription.period === 'year' ? '연간' : '월간'}
              {subscribedPlan
                ? ` · ${priceLabel(subscribedPlan[subscription.period])}`
                : ''}
            </Copy>
          ) : null}
          {subscription.status === 'error' ? (
            <Copy>
              구독 상태를 확인하지 못했어요. 잠시 후 다시 확인해주세요.
            </Copy>
          ) : null}
          {active ? (
            <TouchableOpacity
              testID="preview-cancel-subscription"
              accessibilityRole="button"
              style={styles.cancelLink}
              onPress={() => {
                if (subscription.status === 'canceling') {
                  onChange({ ...subscription, status: 'active' });
                  return;
                }
                NuriAlert.alert(
                  '구독을 해지할까요?',
                  '이용 기간이 끝날 때까지 혜택을 사용할 수 있어요.',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '해지하기',
                      style: 'destructive',
                      onPress: () => {
                        onChange({ ...subscription, status: 'canceling' });
                      },
                    },
                  ],
                );
              }}
            >
              <AppText
                preset="caption"
                styleOverridesPreset
                style={[
                  styles.cancelText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {subscription.status === 'canceling'
                  ? '구독 유지하기'
                  : '해지하기'}
              </AppText>
            </TouchableOpacity>
          ) : null}
        </Glass>
        <Copy muted>구독 상태</Copy>
        <Choices
          label="구독 상태"
          value={subscription.status}
          options={(
            Object.keys(subscriptionLabels) as SubscriptionExample[]
          ).map(value => ({ value, label: subscriptionLabels[value] }))}
          onChange={status => {
            onChange({ ...subscription, status });
          }}
        />
        <CtaButton
          role="neutral"
          testID="preview-restore"
          onPress={() =>
            setFeedback(
              active
                ? '이용 중인 구독을 확인했어요.'
                : '복원할 구매 내역이 없어요.',
            )
          }
        >
          <CtaText>구매 복원</CtaText>
        </CtaButton>
        {feedback ? (
          <View accessibilityLiveRegion="polite">
            <Copy muted>{feedback}</Copy>
          </View>
        ) : null}
      </ScrollView>
      {!active ? (
        <HomeReflectiveGlass borderRadius={0} style={styles.footer}>
          <CtaButton
            role="primary"
            testID="preview-subscribe"
            onPress={() => {
              onChange({ status: 'active', plan, period });
              setFeedback('구독이 시작됐어요.');
            }}
          >
            <CtaText>
              {period === 'year' ? '연' : '월'}{' '}
              {priceLabel(selectedPlan[period])} 구독하기
            </CtaText>
          </CtaButton>
          <AppText
            accessibilityLiveRegion="polite"
            preset="unifiedBody"
            style={{ color: theme.colors.textSecondary }}
          >
            언제든 구독을 해지할 수 있어요
          </AppText>
        </HomeReflectiveGlass>
      ) : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  content: { padding: 20, gap: 20, paddingBottom: 28 },
  footer: {
    marginTop: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  cancelLink: {
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    textDecorationLine: 'underline',
  },
  brand: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  planTouch: { borderRadius: 8 },
  selectedPlan: {
    ...StyleSheet.absoluteFill,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: PRODUCT_CTA.primary,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  table: { marginTop: 0, borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  featureCell: { flex: 1.7, minWidth: 0 },
  valueCell: { flex: 1, minWidth: 0, alignItems: 'center' },
});
