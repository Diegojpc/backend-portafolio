// Compares the flattened key sets of src/locales/en.js and es.js.
// Usage: node .claude/skills/i18n-sync/check_keys.mjs   (any cwd)
// Exit 1 and a diff when a key exists in one language only; exit 0 when they match.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const localesDir = path.join(root, 'frontend', 'src', 'locales');

const flatten = (value, prefix = '') => {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
};

const load = async (file, exportName) => {
  const mod = await import(pathToFileURL(path.join(localesDir, file)).href);
  if (!mod[exportName]) throw new Error(`${file} does not export "${exportName}"`);
  return new Set(flatten(mod[exportName]));
};

try {
  const [en, es] = await Promise.all([load('en.js', 'en'), load('es.js', 'es')]);
  const onlyEn = [...en].filter((k) => !es.has(k)).sort();
  const onlyEs = [...es].filter((k) => !en.has(k)).sort();

  if (!onlyEn.length && !onlyEs.length) {
    console.log(`i18n OK: ${en.size} keys in both languages`);
    process.exit(0);
  }
  if (onlyEn.length) console.error(`Missing in es.js (${onlyEn.length}):\n  ${onlyEn.join('\n  ')}`);
  if (onlyEs.length) console.error(`Missing in en.js (${onlyEs.length}):\n  ${onlyEs.join('\n  ')}`);
  process.exit(1);
} catch (err) {
  console.error(`i18n check could not run: ${err.stack || err}`);
  process.exit(2);
}
