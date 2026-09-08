import React, { useCallback } from 'react';
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
import { openMoreDrawer } from '../../store/uiStore';
import {
  POLICY_DOCUMENT_ORDER,
  POLICY_PRESENTATION_DOCUMENTS,
  type PolicyDocumentId,
} from '../../services/legal/presentation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PolicyCenter'>;
type PolicyCenterRoute = RouteProp<RootStackParamList, 'PolicyCenter'>;

export default function PolicyCenterScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PolicyCenterRoute>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const onBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: navigation.goBack,
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => openMoreDrawer());
    },
    onFallback: navigation.goBack,
  });

  const openDocument = useCallback(
    (documentId: PolicyDocumentId) => {
      navigation.navigate('PolicyDetail', { documentId });
    },
    [navigation],
  );

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
          testID="policy-center-back"
          accessibilityRole="button"
          accessibilityLabel="약관 및 정책 화면 닫기"
          activeOpacity={0.82}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onBack}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={21} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <AppText preset="unifiedTitle" style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>약관 및 정책</AppText>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        testID="policy-center-scroll"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 12) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <AppText preset="unifiedTitle" style={[styles.introTitle, { color: theme.colors.textPrimary }]}>NURI 이용 안내</AppText>
          <AppText preset="unifiedBody" style={[styles.introBody, { color: theme.colors.textSecondary }]}>서비스 이용과 정보 처리에 필요한 안내를 확인할 수 있어요. 본문은 현재 최종 검토 중입니다.</AppText>
        </View>

        <View
          style={[
            styles.documentList,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {POLICY_DOCUMENT_ORDER.map((documentId, index) => {
            const document = POLICY_PRESENTATION_DOCUMENTS[documentId];
            return (
              <React.Fragment key={document.id}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                ) : null}
                <TouchableOpacity
                  testID={`policy-entry-${document.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${document.title} 보기`}
                  activeOpacity={0.82}
                  onPress={() => openDocument(document.id)}
                  style={styles.documentRow}
                >
                  <View style={styles.documentCopy}>
                    <AppText preset="unifiedLabel" style={[styles.documentTitle, { color: theme.colors.textPrimary }]}>{document.title}</AppText>
                    <AppText preset="unifiedBody" style={[styles.documentSummary, { color: theme.colors.textMuted }]} numberOfLines={2}>{document.summary}</AppText>
                  </View>
                  <Feather name="chevron-right" size={19} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
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
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  headerSide: { width: 44 },
  body: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  intro: { gap: 8, marginBottom: 24 },
  introTitle: { fontSize: 20, lineHeight: 28, fontWeight: '900' },
  introBody: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  documentList: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  documentRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentCopy: { flex: 1, gap: 4 },
  documentTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  documentSummary: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
