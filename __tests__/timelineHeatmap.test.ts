import { buildTimelineHeatmap } from '../src/services/timeline/heatmap';

describe('buildTimelineHeatmap', () => {
  it('최근 주차를 7일 단위 heatmap 구조로 만든다', () => {
    const heatmap = buildTimelineHeatmap(
      [
        {
          id: '1',
          petId: 'pet-1',
          title: '산책',
          tags: ['walk'],
          occurredAt: '2026-03-02',
          createdAt: '2026-03-02T10:00:00.000Z',
          imagePaths: [],
        },
        {
          id: '2',
          petId: 'pet-1',
          title: '식사',
          tags: ['meal'],
          occurredAt: '2026-03-02',
          createdAt: '2026-03-02T12:00:00.000Z',
          imagePaths: [],
        },
      ],
      4,
      new Date('2026-03-06T12:00:00.000Z'),
    );

    expect(heatmap).toHaveLength(4);
    expect(heatmap[0].cells).toHaveLength(7);

    const target = heatmap.flatMap(week => week.cells).find(cell => cell.ymd === '2026-03-02');
    expect(target?.count).toBe(2);
    expect(target?.intensity).toBe(2);
  });
});
