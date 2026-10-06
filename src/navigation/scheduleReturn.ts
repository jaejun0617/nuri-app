import type { HealthReportTabKey } from '../services/health-report/viewModel';

import type { ScreenEntrySource } from './entry';

export type ScheduleReturnTarget =
  | {
      screen: 'ScheduleList';
      entrySource?: ScreenEntrySource;
    }
  | {
      screen: 'HealthReport';
      initialTab?: HealthReportTabKey;
      entrySource?: ScreenEntrySource;
    };

export type ScheduleDetailReturnContext = {
  petId: string;
  scheduleId: string;
  entrySource?: ScreenEntrySource;
  returnTo?: ScheduleReturnTarget;
};

export function resolveScheduleReturnTarget(
  returnTo: ScheduleReturnTarget | undefined,
  entrySource: ScreenEntrySource | undefined,
): ScheduleReturnTarget {
  return returnTo ?? { screen: 'ScheduleList', entrySource };
}
