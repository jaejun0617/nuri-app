import fs from 'fs';
import path from 'path';
import ts from 'typescript';
const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const elements = (file: string, tag: string) => {
  const source = read(file),
    sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
  const result: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(sf) === tag
    )
      result.push(node.parent.getText(sf));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return result;
};
describe('CTA source safety guards', () => {
  it('record retry is primary and edit back/cancel are neutral', () => {
    const detail = elements(
      'src/screens/Records/RecordDetailScreen.tsx',
      'CtaButton',
    );
    expect(detail.find(n => n.includes('다시 시도'))).toContain(
      'role="primary"',
    );
    const edit = elements(
      'src/screens/Records/RecordEditScreen.tsx',
      'CtaButton',
    );
    for (const label of ['뒤로', '취소'])
      expect(edit.find(n => n.includes(label))).toContain('role="neutral"');
  });
  it('keeps notification cleanup separate from final delete', () => {
    expect(
      elements(
        'src/screens/Notifications/UserNotificationsScreen.tsx',
        'CtaButton',
      ).find(n => n.includes('전체삭제')),
    ).toContain('role="cleanup"');
  });
  it('maps discarded draft in cancel slot and preserved record draft to neutral', () => {
    expect(
      elements(
        'src/screens/Community/CommunityCreateScreen.tsx',
        'ConfirmDialog',
      ).find(n => n.includes('cancelLabel="버리기"')),
    ).toContain('cancelRole="destructiveConfirm"');
    expect(
      elements(
        'src/screens/Records/RecordCreateScreen.tsx',
        'ConfirmDialog',
      ).find(n => n.includes('exitConfirmVisible')),
    ).toContain('confirmRole="neutral"');
  });
  it('logout and app exit do not use final delete', () => {
    expect(
      elements('src/screens/More/MoreDrawerContent.tsx', 'ConfirmDialog').find(
        n => n.includes('logoutConfirmVisible'),
      ),
    ).toContain('confirmRole="primary"');
    expect(
      elements('src/screens/Main/MainScreen.tsx', 'ConfirmDialog').find(n =>
        n.includes('앱 종료'),
      ),
    ).toContain('confirmRole="primary"');
  });
  it('all active final custom delete dialogs declare the destructive role', () => {
    for (const file of [
      'src/screens/Schedules/ScheduleDetailScreen.tsx',
      'src/screens/Records/RecordDetailScreen.tsx',
      'src/screens/Community/CommunityDiscussionContent.tsx',
      'src/screens/More/MoreDrawerContent.tsx',
    ]) {
      const dialogs = elements(file, 'ConfirmDialog').filter(
        n =>
          n.includes('tone="danger"') &&
          !n.includes('deleteAcknowledgementVisible'),
      );
      expect(dialogs.length).toBeGreaterThan(0);
      dialogs.forEach(n =>
        expect(n).toContain('confirmRole="destructiveConfirm"'),
      );
    }
    expect(
      elements(
        'src/components/pets/PetDeleteConfirmDialog.tsx',
        'CtaButton',
      ).find(n => n.includes('pet-delete-confirm')),
    ).toContain('role="destructiveConfirm"');
  });
  it('preserves first-pet shared creation and protected screens', () => {
    const files = (directory: string): string[] =>
      fs
        .readdirSync(path.join(root, directory), { withFileTypes: true })
        .flatMap(entry =>
          entry.isDirectory()
            ? files(directory + '/' + entry.name)
            : /\.tsx$/.test(entry.name)
            ? [directory + '/' + entry.name]
            : [],
        );
    for (const file of [
      ...files('src/screens/Auth'),
      ...files('src/screens/Weather'),
      'src/screens/Pets/PetCreateScreen.tsx',
      'src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx',
    ]) {
      expect(read(file)).not.toMatch(
        /CtaButton|confirmRole=|cancelRole=|roleBasedActions/,
      );
    }
    expect(read('src/app/providers/AppProviders.tsx')).toContain(
      "defaultMode: 'light'",
    );
  });
  it('uses the existing effective season, with no pet theme in the CTA resolver', () => {
    expect(read('src/app/ui/CtaButton.tsx')).toContain('useEffectiveSeason()');
    expect(read('src/app/theme/ctaPalette.ts')).not.toMatch(
      /usePetStore|getMonth\(|new Date\(/,
    );
  });
  it('keeps personalized navigation and swatch paths outside action resolution', () => {
    expect(read('src/navigation/AppTabsNavigator.tsx')).not.toContain(
      'CtaButton',
    );
    expect(read('src/components/pets/PetManagementCard.tsx')).toContain(
      'petTheme',
    );
  });
});
