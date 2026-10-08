import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

describe('glass form and expense integration contracts', () => {
  it('reuses reading background without spheres and retains compact shared glass material', () => {
    const shared = source('src/components/common/SeasonalFormSurface.tsx');
    expect(shared).toContain('decorationMode="reading"');
    expect(shared).toContain('showDecorations={false}');
    expect(shared).toContain('borderRadius={8}');
    expect(shared).toContain("width: 'auto'");
    expect(shared).toContain("alignSelf: 'stretch'");
    for (const screen of [
      'Schedules/ScheduleCreateScreen',
      'Schedules/ScheduleEditScreen',
      'Records/RecordEditScreen',
      'Pets/PetProfileEditDoneScreen',
    ]) {
      expect(source(`src/screens/${screen}.tsx`)).toContain(
        '<SeasonalFormBackground />',
      );
      expect(source(`src/screens/${screen}.tsx`)).toContain(
        '<SeasonalFormPanel',
      );
    }
    expect(source('src/screens/Schedules/ScheduleListScreen.tsx')).toContain(
      'showDecorations={false}',
    );
  });
  it('retains safe money in both create and edit payloads', () => {
    for (const screen of ['RecordCreateScreen', 'RecordEditScreen']) {
      const text = source(`src/screens/Records/${screen}.tsx`);
      expect(text).toContain(
        'isExpenseCategory ? parseRecordPrice(priceText) : null',
      );
      expect(text).toContain('병원·건강 비용 (선택)');
    }
  });
  it('invalidates all month caches for create, price/date update and deletion', () => {
    const memories = source('src/services/supabase/memories.ts');
    expect(memories.match(/invalidateMonthlyExpenses\(\);/g)).toHaveLength(3);
    expect(source('src/services/records/expenses.ts')).toContain(
      'queryKey: MONTHLY_EXPENSE_QUERY_KEY',
    );
  });
  it('keeps expense detail navigation inside the same stack without a home-origin branch', () => {
    expect(source('src/navigation/TimelineStackNavigator.tsx')).toContain(
      'name="MonthlyExpenses"',
    );
    const screen = source('src/screens/Records/MonthlyExpensesScreen.tsx');
    expect(screen).toMatch(/navigation\.navigate\('RecordDetail',\s*\{\s*petId: item\.petId,\s*memoryId: item\.id,?\s*\}\)/);
    expect(screen).not.toContain("entrySource: 'home'");
  });
  it('uses a glass reminder notice without adding a server write for a past alarm', () => {
    expect(source('src/hooks/useScheduleCreateForm.ts')).toContain(
      'setReminderNoticeVisible(true);',
    );
    expect(source('src/screens/Schedules/ScheduleEditScreen.tsx')).toContain(
      'setReminderNoticeVisible(true);',
    );
    expect(
      source('src/components/common/ScheduleReminderNotice.tsx'),
    ).toContain('<SeasonalFormPanel');
    expect(source('src/components/home/ScheduleCalendarSheet.tsx')).toContain('<ScheduleReminderNotice embedded');
  });
});
