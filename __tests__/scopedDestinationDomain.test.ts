import { parseScopedDestinationDomain } from '../src/services/notifications/scopedDestinationDomain';

const petId = 'a0000000-0000-4000-8000-000000000001';
const recordId = 'a0000000-0000-4000-8000-000000000002';
const ledgerId = 'a0000000-0000-4000-8000-000000000003';
const createdAt = '2026-11-07T01:00:00Z';
const pets = [{ id: petId, name: 'QA pet', themeColor: null }];
const record = { id: recordId, petId, title: 'QA record', category: 'diary',
  subCategory: null, occurredAt: '2026-11-07', createdAt };
const timeline = { kind: 'timeline', pets, records: [record] };
const activity = { ...timeline, kind: 'activity', totalXp: 234, postCount: 0, commentCount: 0,
  ledger: [{ id: ledgerId, pet_id: petId, event_type: 'timeline_post', source_type: 'memory',
    source_id: recordId, xp: 234, activity_date_kst: '2026-11-07', created_at: createdAt }] };

it('never passes returned image paths to the existing timeline renderer', () => {
  const result = parseScopedDestinationDomain({
    ...timeline, records: [{ ...record, imagePaths: ['other-account/private.jpg'], imageUrl: 'https://example.com/private.jpg' }],
  });
  expect(result).toMatchObject({ kind: 'timeline', records: [{ id: recordId, imagePaths: [] }] });
  expect(result.kind === 'timeline' && result.records[0]).not.toHaveProperty('imageUrl');
});

it('rejects records or XP referring to a pet outside the scoped result', () => {
  expect(() => parseScopedDestinationDomain({ ...timeline, pets: [] })).toThrow('NURI_NOTIFICATION_RESPONSE_INVALID');
  expect(() => parseScopedDestinationDomain({ ...activity, records: [], pets: [] })).toThrow('NURI_NOTIFICATION_RESPONSE_INVALID');
});

it('builds the existing activity summary from local records and XP', () => {
  expect(parseScopedDestinationDomain(activity)).toMatchObject({
    kind: 'activity',
    dashboard: { levelSummary: { totalXp: 234 }, petSummaries: [{ petId, xp: 234 }] },
  });
});
