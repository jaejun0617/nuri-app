import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { styles as discussionStyles } from '../src/screens/Community/CommunityDetailScreen.styles';

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('responsive source guards', () => {
  it('keeps retired tutorial and device preview code out of the app', () => {
    for (const sourcePath of [
      'src/screens/Tutorial',
      'src/services/tutorial',
      'src/assets/tutorial',
      'src/app/providers/TutorialProvider.tsx',
      'src/screens/DevTest/DeviceLayoutPreviewScreen.tsx',
    ]) {
      expect(existsSync(join(process.cwd(), sourcePath))).toBe(false);
    }

    for (const entryPath of [
      'App.tsx',
      'src/navigation/RootNavigator.tsx',
      'src/navigation/navigationTransitionPolicy.ts',
      'src/screens/More/MoreDrawerContent.tsx',
      'src/app/providers/ResponsiveTypographyProvider.tsx',
      'src/screens/Main/MainScreen.tsx',
      'src/screens/Records/RecordCreateScreen.tsx',
      'src/screens/Records/TimelineScreen.tsx',
      'src/screens/Schedules/ScheduleListScreen.tsx',
      'src/screens/Schedules/ScheduleCreateScreen.tsx',
    ]) {
      expect(readProjectFile(entryPath)).not.toMatch(
        /TutorialLibrary|TutorialProvider|useAutoTutorial|tutorial_progress_v1|DeviceLayoutPreview|device-layout-preview|ResponsiveTypographyPreview/,
      );
    }
    expect(readProjectFile('App.tsx')).toContain('<ResponsiveTypographyProvider>');
  });

  it('tracks the live More drawer window instead of caching module dimensions', () => {
    const source = readProjectFile('src/components/MoreDrawer/MoreDrawer.tsx');

    expect(source).toContain('useWindowDimensions');
    expect(source).not.toMatch(/Dimensions\.get\(['"]window['"]\)/);
  });

  it('keeps Android runtime resize signals enabled without an orientation lock', () => {
    const manifest = readProjectFile(
      'android/app/src/main/AndroidManifest.xml',
    );

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
      'src/screens/Community/CommunityDiscussionContent.tsx',
    );
    const composer = readProjectFile(
      'src/screens/Community/components/CommunityCommentComposer.tsx',
    );

    expect(discussionStyles.commentComposerWrap.paddingVertical).toBe(3);
    expect(discussionStyles.commentComposer).toMatchObject({
      borderRadius: 20,
      minHeight: 48,
    });
    expect(discussionStyles.commentInput).toMatchObject({
      minHeight: 44,
      maxHeight: 96,
      textAlignVertical: 'center',
    });
    expect(discussionStyles.commentSubmitButton).toMatchObject({
      width: 48,
      height: 48,
    });
    expect(discussionStyles.replyCancelTouchTarget).toMatchObject({
      minWidth: 44,
      minHeight: 44,
    });
    expect(screen).toContain(
      'paddingBottom: resolveCommunityDiscussionBottomInset(insets.bottom, keyboardHeight.value, isFocused)',
    );
    expect(screen).toContain('automaticallyAdjustKeyboardInsets={false}');
    expect(composer).toContain('solidFaceInset={4}');
  });
});
