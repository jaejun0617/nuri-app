import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import AppTextInput from '../../app/ui/AppTextInput';
import Feather from '../../components/icons/NuriFeatherIcon';
import { SeasonalFormBackground, SeasonalFormPanel } from '../../components/common/SeasonalFormSurface';
import { useTutorial } from '../../app/providers/TutorialProvider';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { openMoreDrawer } from '../../store/uiStore';
import { tutorialCatalog, tutorialIds } from '../../services/tutorial/catalog';

const filters = ['전체', '시작', '기록', '일정', '설정'] as const;

export default function TutorialLibrary() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { open } = useTutorial();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('전체');
  const back = useEntryAwareBackAction({
    entrySource: 'more', onHome: navigation.goBack, onFallback: navigation.goBack,
    onMore: () => { navigation.goBack(); requestAnimationFrame(openMoreDrawer); },
  });
  const visible = useMemo(() => tutorialIds.filter(id => {
    const topic = tutorialCatalog[id];
    const term = search.trim().normalize().toLowerCase();
    return (filter === '전체' || topic.category === filter) &&
      [topic.title, ...topic.steps.map(step => step.title)].some(text => text.normalize().toLowerCase().includes(term));
  }), [filter, search]);
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
    <SeasonalFormBackground />
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={back} style={styles.back}>
        <Feather name="chevron-left" color={theme.colors.textPrimary} size={26} />
      </Pressable>
      <AppText accessibilityRole="header" preset="unifiedTitle">누리 사용법</AppText>
      <View style={styles.back} />
    </View>
    <View style={styles.filters}>
      <AppTextInput value={search} onChangeText={setSearch} accessibilityLabel="사용법 검색"
        placeholder="사용법 검색" placeholderTextColor={theme.colors.textSecondary} style={styles.search} />
      <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {filters.map(value => <Pressable key={value} accessibilityRole="button"
          accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)}
          style={[styles.chip, { borderColor: filter === value ? theme.colors.brand : theme.colors.border }]}>
          <AppText preset="unifiedLabel" color={filter === value ? theme.colors.brand : theme.colors.textPrimary}>{value}</AppText>
        </Pressable>)}
      </ScrollView>
    </View>
    <FlatList data={visible} keyExtractor={id => id} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ListEmptyComponent={<AppText preset="body" color={theme.colors.textSecondary}>찾는 사용법이 없어요.</AppText>}
      renderItem={({ item }) => <SeasonalFormPanel style={styles.panel}>
        <Pressable testID={`tutorial-topic-${item}`} accessibilityRole="button"
          accessibilityLabel={`${tutorialCatalog[item].title} 다시보기`} onPress={() => open(item, true)} style={styles.row}>
          <View style={styles.description}>
            <AppText preset="unifiedLabel">{tutorialCatalog[item].title}</AppText>
            <AppText preset="unifiedMicro" color={theme.colors.textSecondary}>{tutorialCatalog[item].category} · {tutorialCatalog[item].steps.length}단계</AppText>
          </View>
          <Feather name="chevron-right" color={theme.colors.textSecondary} size={22} />
        </Pressable>
      </SeasonalFormPanel>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  back: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  filters: { paddingHorizontal: 20, gap: 8 }, search: { minHeight: 48, paddingHorizontal: 12 },
  chips: { gap: 8, paddingBottom: 5 }, chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 18, borderWidth: 1 },
  list: { padding: 20, gap: 8 }, panel: { borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, padding: 12, gap: 12 },
  description: { flex: 1, gap: 4 },
});
