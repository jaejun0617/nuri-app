export type ScreenEntrySource =
  | 'home'
  | 'home-total-summary'
  | 'timeline'
  | 'stack'
  | 'more'
  | 'health_report';

export type EntrySourceParam = {
  entrySource?: ScreenEntrySource;
};
