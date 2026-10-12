'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Only public build artifacts/sidecars are copied. Signing inputs are excluded.
function preserve(root, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const apkDir = path.join(root, 'android/app/build/outputs/apk/release');
  const files = fs.existsSync(apkDir) ? fs.readdirSync(apkDir)
    .filter(name => /^nuri-[a-f0-9]{7}-(qa|store)-release\.apk(?:\.provenance\.json|\.verification\.txt)?$/.test(name))
    .map(name => path.join(apkDir, name)) : [];
  const aab = path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab');
  if (fs.existsSync(aab)) files.push(aab);
  const records = files.map(file => {
    const target = path.join(destination, path.basename(file));
    fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
    const sha256 = digest(file);
    if (digest(target) !== sha256) throw new Error('EVIDENCE_COPY_MISMATCH');
    return { name: path.basename(file), sha256 };
  });
  fs.writeFileSync(path.join(destination, 'inventory.json'), JSON.stringify(records, null, 2), { flag: 'wx' });
  return records;
}

function prepare(root, manifestDestination) {
  if (!manifestDestination || !path.isAbsolute(manifestDestination)) throw new Error('ABSOLUTE_EVIDENCE_DESTINATION_REQUIRED');
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const parent = path.dirname(manifestDestination);
  fs.mkdirSync(parent, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const run = fs.mkdtempSync(path.join(parent, `${stamp}-${head.slice(0, 7)}-`));
  preserve(root, path.join(run, 'previous'));
  return run;
}

if (require.main === module) {
  const [command, root, destination] = process.argv.slice(2);
  if (command === 'prepare') process.stdout.write(prepare(root, destination));
  else if (command === 'capture') preserve(root, path.join(destination, 'artifacts'));
  else throw new Error('UNKNOWN_EVIDENCE_OPERATION');
}
module.exports = { prepare, preserve };
