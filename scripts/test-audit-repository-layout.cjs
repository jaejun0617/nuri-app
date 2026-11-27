'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inventory } = require('./audit-repository-layout.cjs');

test('keeps platform, product, report and design images distinct', () => {
  const { counts } = inventory(['android/app/icon.png', 'ios/App/icon.png',
    'src/assets/home/겨울 배경.WEBP', 'docs/reports/assets/status.png', 'output/imagegen/concept.png']);
  assert.deepEqual(counts, { 'image/native': 2, 'image/product': 1, 'image/documentation': 1, 'image/design': 1 });
});

test('flags loose material but not root entry points or executable migration paths', () => {
  const { rootReview, counts } = inventory(['AGENTS.md', 'README.md', '기획.md', 'temp.sql',
    'supabase/migrations/001.sql', 'supabase/tests/contract.sql', 'docs/sql/계약.sql',
    'docs/README.md', 'docs/archive/2026-02/원문.md', 'package.json']);
  assert.deepEqual(rootReview, ['temp.sql', '기획.md']);
  for (const group of ['sql/migrations', 'sql/tests', 'sql/documented', 'md/index', 'md/archive'])
    assert.equal(counts[group], 1);
});
