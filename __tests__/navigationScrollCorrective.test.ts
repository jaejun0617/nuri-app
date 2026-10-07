import fs from 'node:fs';
import path from 'node:path';
import {
  CommonActions,
  StackActions,
  StackRouter,
} from '@react-navigation/routers';

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'src', file), 'utf8');
describe('nested entry and edit action contracts', () => {
  it.each([
    ['screens/Pets/PetManagementScreen.tsx', 'PetProfileEdit'],
    [
      'screens/Weather/IndoorActivityRecommendationsScreen.tsx',
      'ActivityGuide',
    ],
    ['screens/Weather/ActivityGuideScreen.tsx', 'WeatherActivityRecord'],
  ])(
    '%s gives %s an immediate-stack entry instead of forwarding Home/More',
    (file, target) => {
      const call = source(file)
        .split(`navigation.navigate('${target}', {`)[1]
        .split('});')[0];
      expect(call).toContain("entrySource: 'stack'");
      expect(call).not.toContain('entrySource: route.params');
    },
  );
  it('keeps explicit Schedule parents and HealthReport return contracts', () => {
    expect(source('screens/Schedules/ScheduleListScreen.tsx')).toContain(
      "screen: 'ScheduleList'",
    );
    expect(source('screens/HealthReport/HealthReportScreen.tsx')).toContain(
      "entrySource: 'health_report'",
    );
    expect(source('screens/Records/RecordDetailScreen.tsx')).toContain(
      "navigation.popTo('ScheduleDetail', route.params.scheduleReturn)",
    );
  });
  it('keeps edit cancellation reachable above the overlay bar without an invented fixed spacer', () => {
    const edit = source('screens/Records/RecordEditScreen.tsx');
    expect(edit).toContain('useContext(ToolbarHeightContext)');
    expect(edit).toMatch(/toolbarHeight \?\? insets.bottom\) \+/);
    expect(edit).toContain('수정하기');
    expect(edit).toContain('취소하기');
    expect(edit).not.toMatch(/>\s*(저장|취소)\s*</);
    expect(edit).toContain('styleOverridesPreset');
  });
  it('returns the composer to existing tabs and retains TimelineMain below the created detail', () => {
    const create = source('screens/Records/RecordCreateScreen.tsx');
    const success = create
      .split('const navigateAfterCreateSuccess')[1]
      .split('const closeRewardNotice')[0];
    expect(success).toContain("returnTo?.tab === 'TimelineTab'");
    expect(success).toContain("? 'timeline'");
    expect(success).toContain("navigation.popTo('AppTabs'");
    expect(success).toContain('initial: false');

    const router = StackRouter({ initialRouteName: 'AppTabs' });
    const options = {
      routeNames: ['AppTabs', 'RecordCreate'],
      routeParamList: {},
      routeGetIdList: {},
    };
    const original = router.getInitialState(options);
    const composing = router.getStateForAction(
      original,
      StackActions.push('RecordCreate'),
      options,
    );
    if (!composing) throw new Error('Composer navigation was rejected');
    const composingState = router.getRehydratedState(composing, options);
    const params = {
      screen: 'TimelineTab',
      params: {
        screen: 'RecordDetail',
        initial: false,
        params: { entrySource: 'timeline' },
      },
    };
    const incorrect = router.getStateForAction(
      composingState,
      CommonActions.navigate('AppTabs', params),
      options,
    );
    expect(incorrect?.routes.map(route => route.name)).toEqual([
      'AppTabs',
      'RecordCreate',
      'AppTabs',
    ]);
    const corrected = router.getStateForAction(
      composingState,
      StackActions.popTo('AppTabs', params),
      options,
    );
    expect(corrected?.routes).toHaveLength(1);
    expect(corrected?.routes[0].key).toBe(original.routes[0].key);
    expect(corrected?.routes[0].params).toEqual(params);
  });
  it('keeps the successful composer stable while Android removes its native screen', () => {
    const submit = source('screens/Records/RecordCreateScreen.tsx')
      .split('const onSubmit = useCallback(async () => {')[1]
      .split('  return (')[0];
    expect(submit).not.toContain('resetForm()');
    expect(submit).toContain('completed = true');
    expect(submit).toMatch(
      /finally\s*\{[\s\S]*if \(!completed\)\s*\{\s*setSaving\(false\);\s*submitLockRef.current = false;/,
    );
    expect(submit).toMatch(/catch \(error\)\s*\{\s*completed = false;/);
  });
});
