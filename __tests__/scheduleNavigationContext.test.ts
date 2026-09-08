import { resolveScheduleReturnTarget } from '../src/navigation/scheduleReturn';

describe('schedule parent navigation context', () => {
  it('keeps a generic More schedule flow in ScheduleList', () => {
    expect(resolveScheduleReturnTarget(undefined, 'more')).toEqual({
      screen: 'ScheduleList',
      entrySource: 'more',
    });
  });

  it('keeps a Home health child flow in HealthReport', () => {
    expect(
      resolveScheduleReturnTarget(
        {
          screen: 'HealthReport',
          initialTab: 'records',
          entrySource: 'home',
        },
        'health_report',
      ),
    ).toEqual({
      screen: 'HealthReport',
      initialTab: 'records',
      entrySource: 'home',
    });
  });

  it('does not infer HealthReport from a More entry source', () => {
    expect(resolveScheduleReturnTarget(undefined, 'more').screen).toBe(
      'ScheduleList',
    );
  });
});
