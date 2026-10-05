import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('Home reselect wiring and empty timeline boundary', () => {
  it('uses the official tabPress -> useScrollToTop contract and keeps per-pet scroll restoration', () => {
    const home = read('src/screens/Main/components/LoggedInHome/LoggedInHome.tsx');
    const tabs = read('src/navigation/AppTabsNavigator.tsx');
    expect(home).toContain('useScrollToTop(homeScrollRef)');
    expect(home).toContain('HOME_SCROLL_OFFSET_BY_KEY.set(homeScrollStorageKey, offsetY)');
    expect(home).toContain('HOME_SCROLL_OFFSET_BY_KEY.get(homeScrollStorageKey)');
    expect(home).not.toContain('HomeTopButton');
    expect(home).not.toContain('showTopButton');
    const homeScroll = home.slice(home.indexOf('ref={homeScrollRef}'));
    expect(homeScroll.slice(0, 180)).toContain('keyboardShouldPersistTaps="handled"');
    expect(tabs).toContain("route?.name !== 'HomeTab'");
    expect(tabs).toContain("type: 'tabPress', target: route.key, canPreventDefault: true");
  });
  it('does not render the end-of-list footer for an empty category result', () => {
    const timeline = read('src/screens/Records/TimelineScreen.tsx');
    const footer = timeline.slice(timeline.indexOf('const listFooterComponent ='));
    expect(footer).toContain('if (filteredIds.length === 0) return null;');
    expect(footer).not.toContain('if (timelineIds.length === 0) return null;');
  });
});
