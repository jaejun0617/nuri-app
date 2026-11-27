'use strict';

// Inventory only: never read file contents, follow symlinks, or change the index.
const { execFileSync } = require('node:child_process');
const { extname } = require('node:path');

function classify(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.sql') {
    if (file.startsWith('supabase/migrations/')) return 'sql/migrations';
    if (file.startsWith('supabase/tests/')) return 'sql/tests';
    if (file.startsWith('docs/sql/')) return 'sql/documented';
    return 'sql/other';
  }
  if (/^\.(?:png|jpe?g|svg|webp|gif|avif|heic)$/.test(ext)) {
    if (file.startsWith('src/assets/')) return 'image/product';
    if (/^(?:android|ios)\//.test(file)) return 'image/native';
    if (file.startsWith('output/imagegen/')) return 'image/design';
    if (file.startsWith('docs/')) return 'image/documentation';
    return 'image/other';
  }
  if (ext === '.md') {
    if (file.startsWith('docs/')) return 'md/' + file.split('/')[1].replace(/README\.md$/, 'index');
    return !file.includes('/') ? 'md/root' : 'md/other';
  }
  return null;
}

function inventory(files) {
  const counts = new Map();
  const rootReview = [];
  for (const file of files) {
    const group = classify(file);
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
    if (group && !file.includes('/') && !['README.md', 'AGENTS.md'].includes(file))
      rootReview.push(file);
  }
  return { counts: Object.fromEntries([...counts].sort()), rootReview: rootReview.sort() };
}

if (require.main === module) {
  const git = args => execFileSync('git', args, { encoding: 'utf8' });
  const root = git(['rev-parse', '--show-toplevel']).trimEnd();
  const paths = args => git(['-C', root, 'ls-files', '-z', ...args]).split('\0').filter(Boolean);
  console.log(JSON.stringify({
    tracked: inventory(paths(['--cached'])),
    untrackedNonIgnored: inventory(paths(['--others', '--exclude-standard'])),
  }, null, 2));
}

module.exports = { inventory };
