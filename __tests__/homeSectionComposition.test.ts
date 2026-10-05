import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);
const parsed = ts.createSourceFile(
  'LoggedInHome.tsx',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function findNodes<T extends ts.Node>(
  predicate: (node: ts.Node) => node is T,
): T[] {
  const nodes: T[] = [];
  function visit(node: ts.Node): void {
    if (predicate(node)) nodes.push(node);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return nodes;
}

describe('Home section composition after Today Photo retirement', () => {
  it('passes the full pet schedule cache to the calendar and preserves date-prefilled navigation', () => {
    const calendars = findNodes(ts.isJsxSelfClosingElement).filter(
      node => node.tagName.getText(parsed) === 'HomeScheduleCalendar',
    );
    expect(calendars).toHaveLength(1);
    const attributes = calendars[0].attributes.properties.map(attribute => attribute.getText(parsed));
    expect(attributes).toContain('items={scheduleItems}');
    expect(attributes).toContain('season={season}');
    expect(attributes).toContain('petId={petId}');
    expect(attributes).toContain('onPressDetail={onPressScheduleDetail}');
    expect(source).not.toContain('scheduleItems.slice(0, 7)');
    expect(source).toContain('key={activePetId}');
    expect(attributes).not.toContain('onPressCreate={onPressScheduleCreate}');
    expect(source).toMatch(/navigate\('ScheduleDetail', \{[\s\S]*?scheduleId,/);
  });

  it('does not import or mount Today Photo in any Home state', () => {
    const imports = findNodes(ts.isImportDeclaration).map(node =>
      ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '',
    );
    const tags = [
      ...findNodes(ts.isJsxOpeningElement),
      ...findNodes(ts.isJsxSelfClosingElement),
    ].map(node => node.tagName.getText(parsed));
    expect(imports).not.toContain('./TodayPhotoSection');
    expect(tags).not.toContain('TodayPhotoSection');
  });

  it('keeps the other sections in order without an empty photo layout wrapper', () => {
    const lists = findNodes(ts.isJsxElement).filter(node =>
      node.openingElement.attributes.properties.some(
        attribute =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText(parsed) === 'testID' &&
          attribute.initializer &&
          ts.isStringLiteral(attribute.initializer) &&
          attribute.initializer.text === 'home-section-list',
      ),
    );
    expect(lists).toHaveLength(1);
    const wrappers = lists[0].children.filter(ts.isJsxElement);
    const zones = wrappers.map(wrapper => {
      expect(wrapper.openingElement.tagName.getText(parsed)).toBe('View');
      const attribute = wrapper.openingElement.attributes.properties.find(
        prop => ts.isJsxAttribute(prop) && prop.name.getText(parsed) === 'onLayout',
      );
      if (
        !attribute ||
        !ts.isJsxAttribute(attribute) ||
        !attribute.initializer ||
        !ts.isJsxExpression(attribute.initializer) ||
        !attribute.initializer.expression
      ) {
        throw new Error('Home section requires its own measured layout');
      }
      const expression = attribute.initializer.expression;
      if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
      if (
        ts.isElementAccessExpression(expression) &&
        ts.isStringLiteral(expression.argumentExpression)
      ) {
        return expression.argumentExpression.text;
      }
      throw new Error('Unexpected Home section layout anchor');
    });
    expect(zones).toEqual([
      'frequent',
      'summary',
      'recent',
      'community',
      'recommendation',
      'schedule',
      'health',
      'today-tip',
      'diary',
    ]);
  });
});
