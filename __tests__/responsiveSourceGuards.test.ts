import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('responsive source guards', () => {
  it('tracks the live More drawer window instead of caching module dimensions', () => {
    const source = readProjectFile('src/components/MoreDrawer/MoreDrawer.tsx');

    expect(source).toContain('useWindowDimensions');
    expect(source).not.toMatch(/Dimensions\.get\(['"]window['"]\)/);
  });

  it('keeps Android runtime resize signals enabled without an orientation lock', () => {
    const manifest = readProjectFile('android/app/src/main/AndroidManifest.xml');

    expect(manifest).toContain('screenSize');
    expect(manifest).toContain('smallestScreenSize');
    expect(manifest).not.toContain('android:screenOrientation=');
    expect(manifest).not.toContain('android:resizeableActivity="false"');
  });

  it('bounds variable-length modal content with live-window scrolling', () => {
    const timeline = readProjectFile('src/screens/Records/TimelineScreen.tsx');
    const reward = readProjectFile(
      'src/components/common/PremiumRewardModal.tsx',
    );

    expect(timeline).toContain('maxHeight: modalMaxHeight');
    expect(timeline).toContain('styles.modalOptionsScroll');
    expect(reward).toContain('maxHeight: maxCardHeight');
    expect(reward).toContain('styles.cardScroll');
  });

  it('keeps the Community comment composer compact without shrinking its touch target', () => {
    const screen = readProjectFile(
      'src/screens/Community/CommunityDetailScreen.tsx',
    );
    const styles = readProjectFile(
      'src/screens/Community/CommunityDetailScreen.styles.ts',
    );

    expect(styles).toContain('paddingVertical: 6');
    expect(styles).toContain('borderRadius: 20');
    expect(styles).toContain('minHeight: 52');
    expect(styles).toContain("textAlignVertical: 'center'");
    expect(styles).toContain('width: 44');
    expect(styles).toContain('height: 44');
    expect(screen).toContain(
      'paddingBottom: isInline ? 8 : keyboardInset > 0 ? 6 : insets.bottom + 6',
    );
    expect(screen).toContain('hitSlop={4}');
  });
});
