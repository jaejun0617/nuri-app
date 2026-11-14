import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import Feather from '../../components/icons/NuriFeatherIcon';
import { ResponsiveTypographyPreview } from '../../app/providers/ResponsiveTypographyProvider';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { SeasonalFormBackground, SeasonalFormPanel } from '../../components/common/SeasonalFormSurface';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { openMoreDrawer } from '../../store/uiStore';
import { TotalSummarySection } from '../Main/components/LoggedInHome/TotalSummarySection';
import TimelineSeasonalHeader from '../Records/TimelineSeasonalHeader';
import TimelineMonthPicker from '../Records/TimelineMonthPicker';
import { RecordGalleryThumbnail } from '../Records/RecordGalleryThumbnail';
import { NotificationGroup } from '../Notifications/NotificationDesign';
import { InquiryMessage } from '../Support/InquiryPresentation';
import { tutorialCatalog } from '../../services/tutorial/catalog';
import { getTutorialCapture } from '../../services/tutorial/captures';
import { TutorialScreenExample } from '../Tutorial/TutorialReader';
import type { MemoryRecord } from '../../services/supabase/memories';

const profiles = [
  { width: 320, label: '320dp 소형' },
  { width: 360, label: '360dp 표준' },
  { width: 384, label: '384dp S25 Edge' },
  { width: 412, label: '412dp 대형' },
] as const;
const screens = ['홈 요약', '타임라인', '알림함', '1:1 문의', '누리 사용법'] as const;
const iso = '2026-11-14T00:00:00Z';
const records: MemoryRecord[] = ['산책', '식사', '일기장', '생활'].map((title, index) => ({
  id: String(index), petId: 'preview-pet', title, category: ['walk', 'meal', 'diary', 'other'][index],
  tags: [], imagePaths: [], createdAt: iso, occurredAt: '2026-11-14',
}));
const noAction = () => {};

function TutorialLayoutSample() {
  const step = tutorialCatalog.timeline.steps[0];
  const capture = getTutorialCapture('timeline', 0);
  return <>
    <AppText preset="unifiedTitle">{step.title}</AppText>
    <AppText preset="body">{step.body}</AppText>
    {capture ? <TutorialScreenExample capture={capture} /> : null}
  </>;
}

export default function DeviceLayoutPreviewScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const season = useEffectiveSeason();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState<number>(384);
  const [screen, setScreen] = useState<(typeof screens)[number]>('홈 요약');
  const [month, setMonth] = useState('2026-11');
  const back = useEntryAwareBackAction({
    entrySource: 'more', onHome: navigation.goBack, onFallback: navigation.goBack,
    onMore: () => { navigation.goBack(); requestAnimationFrame(openMoreDrawer); },
  });
  const selector = <T extends string | number>(label: string, value: T, active: T, choose: (value: T) => void) =>
    <Pressable key={value} testID={`layout-preview-${value}`} accessibilityRole="button"
      accessibilityState={{ selected: value === active }} onPress={() => choose(value)}
      style={[styles.button, { borderColor: value === active ? theme.colors.brand : theme.colors.border }]}>
      <AppText preset="unifiedLabel" color={value === active ? theme.colors.brand : theme.colors.textPrimary}>{label}</AppText>
    </Pressable>;
  if (!__DEV__) return null;
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
    <SeasonalFormBackground />
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={back} style={styles.back}>
        <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
      </Pressable>
      <AppText accessibilityRole="header" preset="unifiedTitle" style={styles.title}>기기별 화면 미리보기</AppText>
    </View>
    <ScrollView testID="layout-preview-scroll" contentContainerStyle={styles.content}>
      <View style={styles.options} accessibilityLabel="기기 폭">
        {profiles.map(p => selector(p.label, p.width, width, setWidth))}
      </View>
      <View style={styles.options} accessibilityLabel="화면 선택">
        {screens.map(value => selector(value, value, screen, setScreen))}
      </View>
      <AppText preset="unifiedMicro" color={theme.colors.textSecondary}>합성 데이터 · {width}dp · 시스템 글자 {fontScale.toFixed(2)}배</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
        <ResponsiveTypographyPreview width={width} fontScale={fontScale}>
          <View testID="layout-preview-frame" style={[styles.frame, { width }]}>
            <SeasonalFormPanel style={styles.panel}>
              {screen === '홈 요약' ? <TotalSummarySection records={records} season={season} accentDeepColor={theme.colors.brand}
                isLoading={false} isReady onPressWalk={noAction} onPressMeal={noAction} onPressLife={noAction} onPressAllRecords={noAction} /> : null}
              {screen === '타임라인' ? <>
                <TimelineSeasonalHeader season={season} width={width} fontScale={fontScale} level={null} titles={[]}
                  summary={null} onPressBack={noAction}>
                  <TimelineMonthPicker monthKey={month} currentYear={2026} availableMonths={['2026-11']} onMonthChange={setMonth} />
                </TimelineSeasonalHeader>
                <View style={styles.grid}>{records.map(record => <View style={styles.tile} key={record.id}><RecordGalleryThumbnail record={record} /></View>)}</View>
              </> : null}
              {screen === '알림함' ? <NotificationGroup label="오늘" now={new Date(iso)} timeZone="Asia/Seoul"
                items={[{ id: 'preview', source: 'user', category: 'activity', title: '새로운 레벨에 도착했어요', body: '기록으로 모은 활동을 확인해요.', createdAt: iso, availableAt: iso, readAt: null }]}
                onPress={noAction} disabled /> : null}
              {screen === '1:1 문의' ? <>
                <AppText preset="unifiedTitle">1:1 문의</AppText>
                <InquiryMessage outgoing name="내 문의"><AppText preset="body">저장한 사진은 어디에서 수정할 수 있나요?</AppText></InquiryMessage>
                <InquiryMessage outgoing={false} name="누리팀 답변" showAvatar><AppText preset="body">타임라인의 기록 상세 화면에서 수정할 수 있어요.</AppText></InquiryMessage>
              </> : null}
              {screen === '누리 사용법' ? <TutorialLayoutSample /> : null}
            </SeasonalFormPanel>
          </View>
        </ResponsiveTypographyPreview>
      </ScrollView>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1 },
  content: { gap: 12, paddingBottom: 24 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 },
  button: { borderWidth: 1, borderRadius: 8, minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  frame: { padding: 6 }, panel: { padding: 8, gap: 10 }, grid: { flexDirection: 'row', gap: 4 },
  tile: { flex: 1, aspectRatio: 1 },
});
