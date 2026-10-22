---
name: i18n-sync
description: Check that frontend/src/locales/en.js and es.js define exactly the same translation keys, and fix gaps. Use after adding or editing any user-facing text, `t('...')` call, or locale file.
---

# i18n-sync

1. Run `node .claude/skills/i18n-sync/check_keys.mjs` (works from any directory). It prints keys present in only one language; exit code 1 means a mismatch, 2 means the script itself failed to load a locale.
2. For each missing key, add the translation to the other file in the same position. Spanish is the default language; keep both in the same tone and keep length similar — long strings break the chat widget layout (run `ui-audit` afterwards if the chat or call UI text changed).
3. Also grep for `t('...')` keys used in `frontend/src` that exist in neither file: `rg -o "t\('([\w.]+)'\)" frontend/src -r '$1' | sort -u` and compare against the flattened keys.
4. Re-run the script until it reports `i18n OK`.

The PostToolUse hook runs this check automatically whenever a locale file is edited.
