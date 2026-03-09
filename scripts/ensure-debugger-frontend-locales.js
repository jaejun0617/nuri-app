const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const i18nModulePath = path.join(
  projectRoot,
  'node_modules',
  '@react-native',
  'debugger-frontend',
  'dist',
  'third-party',
  'front_end',
  'core',
  'i18n',
  'i18n.js',
);
const localesDir = path.join(path.dirname(i18nModulePath), 'locales');
const fallbackLocalePath = path.join(localesDir, 'en-US.json');

if (!fs.existsSync(i18nModulePath) || !fs.existsSync(fallbackLocalePath)) {
  console.log(
    '[postinstall] skipped debugger frontend locale patch (package missing)',
  );
  process.exit(0);
}

const source = fs.readFileSync(i18nModulePath, 'utf8');
const match = source.match(/new t\.I18n\.I18n\(\[(.*?)\],"en-US"\)/);

if (!match) {
  console.log(
    '[postinstall] skipped debugger frontend locale patch (supported locales parse failed)',
  );
  process.exit(0);
}

const locales = Array.from(
  new Set(
    match[1]
      .split(',')
      .map(item => item.trim().replace(/^"|"$/g, ''))
      .filter(Boolean),
  ),
);

const fallbackJson = fs.readFileSync(fallbackLocalePath, 'utf8');
let createdCount = 0;

fs.mkdirSync(localesDir, { recursive: true });

for (const locale of locales) {
  const localePath = path.join(localesDir, `${locale}.json`);
  if (fs.existsSync(localePath)) continue;
  fs.writeFileSync(localePath, fallbackJson);
  createdCount += 1;
}

console.log(
  `[postinstall] ensured debugger frontend locale fallbacks (${createdCount} created)`,
);
