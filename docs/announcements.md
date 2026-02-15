## What's New

- **Codacy Duplication Reduction (v3.29.01)**: Extracted shared toggle helpers, merged config table renderers, deduplicated item field builders and modal close handlers. Removed unused Numista Query and N# fields from pattern image rules
- **Edit Modal Pattern Rule Toggle (v3.29.00)**: "Apply to all matching items" checkbox in edit modal image upload — creates a pattern rule from keywords instead of per-item images. Extracted shared section config helpers to reduce code clones
- **Price History Chart Overhaul & View Modal Customization (v3.28.00)**: Melt value chart derived from spot price history with range toggle pills (7d/14d/30d/60d/90d/180d/All). Retail value line anchored from purchase date to current market value. Layered chart fills for purchase, melt, and retail. Configurable view modal section order in Settings > Layout
- **Timezone Selection & PWA Fixes (v3.27.06)**: Display timezone selector in Settings > System — all timestamps respect user-chosen zone while stored data stays UTC. Fixed bare UTC timestamp parsing for spot cards and history. PWA second-launch fix with absolute start_url and navigation-aware service worker. What's New splash stale cache fix (STACK-63, STACK-93)

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles
