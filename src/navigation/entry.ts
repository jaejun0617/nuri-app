export type ScreenEntrySource =
  | 'home'
  | 'home-total-summary'
  | 'timeline'
  | 'record-gallery'
  | 'stack'
  | 'more'
  | 'health_report';

export type EntrySourceParam = {
  entrySource?: ScreenEntrySource;
};
