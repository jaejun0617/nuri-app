import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type Surface = { tag: string; onPress: string | null };
function modalRisks(source: string) {
  const tree = ts.createSourceFile(
    'surface.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const risks: string[] = [];
  let count = 0;
  function visit(node: ts.Node, inModal: boolean, ancestors: Surface[]) {
    const element = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
      ? node
      : null;
    const tag = element?.tagName.getText(tree);
    const attr = element?.attributes.properties.find(
      (property): property is ts.JsxAttribute =>
        ts.isJsxAttribute(property) &&
        property.name.getText(tree) === 'onPress',
    );
    const onPress = attr?.initializer?.getText(tree) ?? null;
    if (tag === 'Modal') {
      count += 1;
      inModal = true;
    }
    if (
      inModal &&
      tag === 'Pressable' &&
      !onPress &&
      ancestors.some(
        a =>
          a.tag === 'Pressable' &&
          /Close|close|Cancel|cancel|false|null/.test(a.onPress ?? ''),
      )
    ) {
      risks.push('dismiss-backdrop-with-unguarded-pressable-child');
    }
    if (
      inModal &&
      tag?.includes('KeyboardAwareScrollView') &&
      ancestors.some(a => a.tag.includes('AvoidingView'))
    ) {
      risks.push('two-keyboard-space-owners');
    }
    ts.forEachChild(node, child =>
      visit(child, inModal, tag ? [...ancestors, { tag, onPress }] : ancestors),
    );
  }
  visit(tree, false, []);
  return { risks, count };
}
function screenFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? screenFiles(file)
      : entry.isFile() && file.endsWith('.tsx')
      ? [file]
      : [];
  });
}

describe('app-wide modal interaction ownership', () => {
  it('detects a backdrop child that could dismiss the whole sheet', () => {
    expect(
      modalRisks(
        '<Modal><Pressable onPress={onClose}><Pressable><ScrollView /></Pressable></Pressable></Modal>',
      ).risks,
    ).toContain('dismiss-backdrop-with-unguarded-pressable-child');
  });
  it('detects duplicated keyboard-space owners, not a plain scroll body', () => {
    expect(
      modalRisks(
        '<Modal><KeyboardAvoidingView><KeyboardAwareScrollView /></KeyboardAvoidingView></Modal>',
      ).risks,
    ).toContain('two-keyboard-space-owners');
    expect(
      modalRisks(
        '<Modal><KeyboardAvoidingView><ScrollView /></KeyboardAvoidingView></Modal>',
      ).risks,
    ).toEqual([]);
  });
  it('keeps every native modal free of these two responder/keyboard regressions', () => {
    let modalCount = 0;
    for (const file of screenFiles(path.resolve(__dirname, '../src'))) {
      const result = modalRisks(fs.readFileSync(file, 'utf8'));
      modalCount += result.count;
      expect({
        file: path.relative(process.cwd(), file),
        risks: result.risks,
      }).toEqual({ file: path.relative(process.cwd(), file), risks: [] });
    }
    expect(modalCount).toBeGreaterThan(10);
  });
});
