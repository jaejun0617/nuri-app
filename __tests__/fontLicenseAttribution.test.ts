import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Jisu font license attribution', () => {
  it('keeps the verified license evidence and required in-app credit', () => {
    const repositoryRoot = join(__dirname, '..');
    const license = readFileSync(
      join(
        repositoryRoot,
        'src/assets/licenses/InsungitCutelivelyJisu-LICENSE.md',
      ),
      'utf8',
    );
    const settingsModal = readFileSync(
      join(repositoryRoot, 'src/components/settings/AppFontSettingsModal.tsx'),
      'utf8',
    );

    expect(license).toContain('Attribution to 인성아이티 is required');
    expect(settingsModal).toContain(
      'Copyright: 인성아이티 / 글씨 제공자 클로이',
    );
  });
});
