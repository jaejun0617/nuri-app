import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getPolicyPresentationDocument } from '../../services/legal/presentation';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PolicyDetail'>;
type PolicyDetailRoute = RouteProp<RootStackParamList, 'PolicyDetail'>;

export default function PolicyDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PolicyDetailRoute>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const document = getPolicyPresentationDocument(route.params?.documentId);

  const onBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: navigation.goBack,
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => openMoreDrawer());
    },
    onFallback: navigation.goBack,
  });

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          testID="policy-detail-back"
          accessibilityRole="button"
          accessibilityLabel="정책 상세 닫기"
          activeOpacity={0.82}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onBack}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={21} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <AppText
          preset="unifiedTitle"
          numberOfLines={1}
          style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
        >
          {document?.title ?? '정책 안내'}
        </AppText>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        testID="policy-detail-scroll"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 12) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {document ? (
          <>
            <View style={styles.titleBlock}>
              <AppText preset="unifiedTitle" style={[styles.title, { color: theme.colors.textPrimary }]}>{document.title}</AppText>
              <AppText preset="unifiedBody" style={[styles.summary, { color: theme.colors.textSecondary }]}>{document.summary}</AppText>
            </View>

            <View
              testID="policy-content-review-notice"
              style={[
                styles.reviewNotice,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Feather name="info" size={17} color={theme.colors.brand} />
              <AppText preset="unifiedBody" style={[styles.reviewNoticeText, { color: theme.colors.textSecondary }]}>이 안내는 현재 최종 검토 중이며, 확정된 정책 문안과 시행 정보는 추후 갱신됩니다.</AppText>
            </View>

            <View style={styles.sections}>
              {document.sections.map((section, index) => (
                <View
                  key={section.id}
                  testID={`policy-section-${section.id}`}
                  style={[
                    styles.section,
                    index > 0
                      ? { borderTopColor: theme.colors.border, borderTopWidth: 1 }
                      : null,
                  ]}
                >
                  <AppText preset="unifiedTitle" style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{section.title}</AppText>
                  {section.paragraphs.map(paragraph => (
                    <AppText key={paragraph} preset="unifiedBody" style={[styles.paragraph, { color: theme.colors.textSecondary }]}>{paragraph}</AppText>
                  ))}
                  {section.bullets?.map(item => (
                    <View key={item} style={styles.bulletRow}>
                      <View style={[styles.bullet, { backgroundColor: theme.colors.brand }]} />
                      <AppText preset="unifiedBody" style={[styles.bulletText, { color: theme.colors.textSecondary }]}>{item}</AppText>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.unavailable}>
            <Feather name="file-text" size={28} color={theme.colors.textMuted} />
            <AppText preset="unifiedTitle" style={[styles.unavailableTitle, { color: theme.colors.textPrimary }]}>정책을 찾을 수 없어요</AppText>
            <AppText preset="unifiedBody" style={[styles.unavailableBody, { color: theme.colors.textMuted }]}>이전 화면으로 돌아가 다시 선택해 주세요.</AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
  },
  headerSide: { width: 44 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  titleBlock: { gap: 8 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '900' },
  summary: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  reviewNotice: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reviewNoticeText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  sections: { marginTop: 12 },
  section: { paddingVertical: 22, gap: 10 },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontWeight: '900' },
  paragraph: { fontSize: 14, lineHeight: 23, fontWeight: '500' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 23, fontWeight: '500' },
  unavailable: { paddingTop: 64, alignItems: 'center', gap: 10 },
  unavailableTitle: { fontSize: 18, lineHeight: 25, fontWeight: '900' },
  unavailableBody: { fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
});
