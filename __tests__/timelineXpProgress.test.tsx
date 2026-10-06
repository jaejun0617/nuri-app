import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import fs from 'node:fs';
import path from 'node:path';
import { createTheme } from '../src/app/theme/theme';
import TimelineSeasonalHeader from '../src/screens/Records/TimelineSeasonalHeader';
import {
  awardUserActivityXp,
  getUserLevelSummary,
} from '../src/services/activity/xpProgress';
import { recordTimelineCreateActivity } from '../src/services/activity/timelineActivity';
import { supabase } from '../src/services/supabase/client';

jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: jest.fn() },
}));
jest.mock('../src/services/activity/dailyStreak', () => ({
  recordPetDailyActivity: jest.fn().mockResolvedValue(null),
}));

const rpc = jest.mocked(supabase.rpc);

function rpcSummary(totalXp: number) {
  rpc.mockResolvedValueOnce({
    data: [{ total_xp: totalXp, updated_at: '2026-10-07T00:00:00Z' }],
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  });
  return getUserLevelSummary();
}

describe('actual XP data to Timeline progress', () => {
  beforeEach(() => rpc.mockReset());

  it.each([
    [468, 507, 7, 23],
    [507, 670, 23, 88],
    [0, 39, 0, 39],
    [680, 719, 92, 6],
    // Actual rollback-QA summary RPC results from the linked project, without IDs.
    [525, 564, 30, 46],
    [525, 642, 30, 77],
    [675, 714, 90, 5],
  ])(
    'maps RPC XP %i to %i into the real progress width and level-local percentage',
    async (beforeXp, afterXp, beforePercent, afterPercent) => {
      const before = await rpcSummary(beforeXp);
      const after = await rpcSummary(afterXp);
      expect(rpc).toHaveBeenNthCalledWith(1, 'get_user_level_summary_v1');
      expect(rpc).toHaveBeenNthCalledWith(2, 'get_user_level_summary_v1');
      let tree!: TestRenderer.ReactTestRenderer;
      const render = (level: typeof before) => (
        <ThemeProvider theme={createTheme('light')}>
          <TimelineSeasonalHeader
            season="autumn"
            width={384}
            fontScale={1}
            level={level}
            titles={[]}
            summary={null}
            dailyStatus={null}
            petName={null}
            showWalkStatus={false}
            onPressBack={jest.fn()}
          />
        </ThemeProvider>
      );
      TestRenderer.act(() => {
        tree = TestRenderer.create(render(before));
      });
      const check = (percent: number) => {
        const fill = tree.root
          .findAll(node => node.props.testID === 'timeline-progress-gradient')
          .at(-1)!;
        const track = tree.root
          .findAll(node => node.props.testID === 'timeline-progress-track')
          .at(-1)!;
        expect(StyleSheet.flatten(fill.props.style).width).toBe(`${percent}%`);
        expect(track.props.accessibilityValue.now).toBe(percent);
      };
      check(beforePercent);
      TestRenderer.act(() => tree.update(render(after)));
      check(afterPercent);
      expect(after.totalXp).toBe(afterXp);
      TestRenderer.act(() => tree.unmount());
    },
  );

  it('sends the actual pet and saved memory id to the walking reward RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          awarded: true,
          xp_awarded: 39,
          total_xp: 507,
          level: 4,
          leveled_up: false,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    const result = await recordTimelineCreateActivity({
      petId: 'pet-qa',
      memoryId: 'saved-memory-qa',
      category: 'walk',
    });
    expect(rpc).toHaveBeenCalledWith('award_user_activity_xp_v1', {
      p_pet_id: 'pet-qa',
      p_event_type: 'walk_timeline_post',
      p_source_type: 'timeline_memory',
      p_source_id: 'saved-memory-qa',
    });
    expect(result.xp).toMatchObject({
      awarded: true,
      xpAwarded: 39,
      totalXp: 507,
    });
  });

  it('preserves the server decision when the pet allowance or account budget is exhausted', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          awarded: false,
          xp_awarded: 0,
          total_xp: 585,
          level: 4,
          leveled_up: false,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    expect(
      await awardUserActivityXp({
        petId: 'pet-qa',
        eventType: 'walk_timeline_post',
        sourceType: 'timeline_memory',
        sourceId: 'fourth',
      }),
    ).toMatchObject({ awarded: false, xpAwarded: 0, totalXp: 585 });
  });

  it('propagates a summary error instead of replacing it with a mock XP total', async () => {
    const error = { code: '42501', message: 'NURI_AUTH_REQUIRED' };
    rpc.mockRejectedValueOnce(error);
    await expect(getUserLevelSummary()).rejects.toBe(error);
  });

  it('guards the applied walk migration and refresh after tab focus', () => {
    const sql = fs.readFileSync(
      path.join(
        __dirname,
        '../supabase/migrations/20261006220017_timeline_walk_xp_per_pet_daily_three.sql',
      ),
      'utf8',
    );
    expect(sql).toContain("when 'walk_record' then 3");
    expect(sql).toContain("when 'walk_timeline_post' then 3");
    expect(sql).toContain('and l.pet_id = p_pet_id');
    expect(sql).toContain(
      "and l.event_type in ('walk_record', 'walk_timeline_post')",
    );
    expect(sql.indexOf('pg_advisory_xact_lock')).toBeLessThan(
      sql.indexOf('select coalesce(s.total_xp, 0)'),
    );
    expect(sql).toContain('150 - coalesce(v_base_daily_sum, 0)');
    expect(sql).toContain(
      'on conflict (user_id, event_type, source_type, source_id) do nothing',
    );
    expect(sql).toContain(
      "raise exception 'NURI_XP_EVENT_INVALID' using errcode = '22023'",
    );
    expect(sql).not.toMatch(
      /\b(?:delete from|alter table|drop|grant|revoke|create policy)\b/i,
    );
    const screen = fs.readFileSync(
      path.join(__dirname, '../src/screens/Records/TimelineScreen.tsx'),
      'utf8',
    );
    expect(screen).toContain('if (!isFocused) return;');
    expect(screen).toContain(
      '[isLoggedIn, petId, timelineEntityVersion, isFocused]',
    );
    const create = fs.readFileSync(
      path.join(__dirname, '../src/screens/Records/RecordCreateScreen.tsx'),
      'utf8',
    );
    expect(create.indexOf('await recordTimelineCreateActivity')).toBeLessThan(
      create.indexOf('upsertOneLocal(petId, optimisticRecord)'),
    );
  });
});
