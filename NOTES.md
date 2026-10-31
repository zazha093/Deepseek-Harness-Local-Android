# DSH Thai - Plugin Translation Toggle Task

## Progress
- [x] 0. git status clean, created branch feat/translate-toggle
- [x] 1. Explored existing code (PluginStoreActivity.kt, PluginMarket.kt, TranslationCache.kt, activity_plugin_store.xml)
- [ ] 2. Implement new translation toggle feature
- [ ] 3. Self-verify (check-i18n.py, no forbidden patterns)
- [ ] 4. Update CI workflow, commit and push
- [ ] 5. Final report

## Key Findings from Exploration
- Current: `btnTranslateAll` calls `translateAll()` → `PluginMarket.translateAllPlugins()` (batch translates ALL plugins)
- `translateToThai()` uses Google Translate (gtx) API: https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=th&dt=t&q=
- `TranslationCache` uses key format: `pkg|sha256(originalText)`
- `showDetail()` shows plugin details in AlertDialog with description
- Existing string keys: plugin_translate_all, plugin_translate_thai, plugin_translated_to_thai, plugin_translate_failed, plugin_translate_none, plugin_translate_success, plugin_translate_partial