import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'module.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];

const fail = (message) => failures.push(message);
const existsExact = (relative) => {
  const parts = relative.replaceAll('\\', '/').split('/');
  let current = root;
  for (const part of parts) {
    const entries = fs.readdirSync(current);
    if (!entries.includes(part)) return false;
    current = path.join(current, part);
  }
  return fs.existsSync(current);
};

if (manifest.id !== 'aedifs-tactical-grid') fail('The replacement module ID must remain aedifs-tactical-grid.');
if (manifest.version !== packageJson.version) fail('module.json and package.json versions differ.');
if (manifest.manifest !== 'https://github.com/DonHuberto/l5r5e-tactical-grid/releases/latest/download/module.json') {
  fail('Manifest URL is not the stable latest-release asset.');
}
const expectedDownload = `https://github.com/DonHuberto/l5r5e-tactical-grid/releases/download/v${manifest.version}/aedifs-tactical-grid.zip`;
if (manifest.download !== expectedDownload) fail('Download URL/version/archive basename is invalid.');
if (manifest.changelog !== 'https://github.com/DonHuberto/l5r5e-tactical-grid/blob/main/CHANGELOG.md') {
  fail('Public changelog URL is invalid.');
}
if (!manifest.authors?.some((author) => author.name === 'Aedif')) fail('Original author attribution is missing.');
if (!manifest.authors?.some((author) => author.name === 'DonHuberto')) fail('Fork maintainer attribution is missing.');
if (
  !manifest.relationships?.systems?.some(
    (system) => system.id === 'l5r5e' && system.compatibility?.minimum === '1.14.105',
  )
) {
  fail('L5R5e 1.14.105 system relationship is missing.');
}

for (const entry of [
  ...(manifest.esmodules ?? []),
  ...(manifest.scripts ?? []),
  ...(manifest.styles ?? []).map((style) => (typeof style === 'string' ? style : style.src)),
  ...(manifest.languages ?? []).map((language) => language.path),
]) {
  if (!existsExact(entry)) fail(`Missing or case-mismatched manifest path: ${entry}`);
}
for (const asset of ['images/circle_mask.webp', 'images/square_mask.webp', 'scripts/systems/l5r5e.js']) {
  if (!existsExact(asset)) fail(`Missing integration asset: ${asset}`);
}

const textFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'bundle'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:css|hbs|html|js|mjs|json|md)$/.test(entry.name)) textFiles.push(full);
  }
}
walk(root);
for (const file of textFiles) {
  if (file === import.meta.filename) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (/modules\\\\/.test(content)) fail(`Browser URL uses a backslash: ${path.relative(root, file)}`);
}

const bundlePath = path.join(root, 'bundle', 'tactical-grid.js');
if (!fs.existsSync(bundlePath)) fail('Built entrypoint bundle/tactical-grid.js is missing.');
else {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  if (!bundle.includes('l5r5e') || !bundle.includes('rangeBands')) fail('Built bundle does not contain the L5R5e adapter.');
  if (/modules\\\\/.test(bundle)) fail('Built bundle still contains a backslash module URL.');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Release validation passed for ${manifest.id} ${manifest.version}.`);
