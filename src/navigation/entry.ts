export type ScreenEntrySource =
  | 'home'
  | 'home-total-summary'
  | 'more'
  | 'health_report';

export type EntrySourceParam = {
  entrySource?: ScreenEntrySource;
};
