# StackrTrackr - Combined Development Roadmap (2025)

This roadmap merges the proposed and current plans, prioritizing simple, easy-to-implement fixes first. Use checkboxes to track progress. For agent protocols, see `agents.ai`.

---

## 🚨 Critical Bugs (Fix ASAP)
- [ ] Last Sync time/date records button press, not last API pull
- [ ] Unknown/“Imported by *” items sort after valid items
- [ ] README date inconsistencies

## 🐞 Quick Bug Fixes & Quality-of-Life
- [ ] Fuzzy search filter refinement (e.g., “Eagle”/“Silver Eagle”)
- [ ] Error recovery for critical failures
- [ ] Data corruption detection/recovery
- [ ] Cross-browser compatibility edge cases
- [ ] localStorage quota limit handling
- [ ] Memory leak detection for long sessions

## 🔧 Feature Enhancements (Easy Wins)
- [ ] Remove empty columns when table is filtered
- [ ] Double table row height on mobile
- [ ] Center titles/subtitles in modal cards
- [ ] “Change Log” icon update
- [ ] Move “Minimum Chip Items” dropdown under “Items”
- [ ] Checkbox for date/price values in all cells
- [ ] Toggle for weight in filters tool
- [ ] Toggle for condensed/scrolling vs. auto-expanding view
- [ ] Group control toggles under “Items”
- [ ] Title/Name column allows fractions
- [ ] Add “Purchase” and “Issue” year filters
- [ ] Open Numista links in new, controlled window
- [ ] Add exponential backoff and retry banner for API rate limits

## 🎨 UI/UX Modernization (Incremental)
- [ ] Improved mobile layout (card-based inventory view)
- [ ] Re-theme light mode (“Darker Light” palette)
- [ ] Modernize UI components (accessibility, styling)
- [ ] Dashboard view with key metrics/charts

## 🏗️ Core Refactoring & Health
- [ ] Consolidate constants into `constants.js`
- [ ] Encapsulate modules under `StackrTrackr` global object
- [ ] Deprecate old search/filter logic in favor of new modules

## 🧪 Testing & Automation
- [ ] Integration testing framework (e.g., Vitest/Jest)
- [ ] Automated testing for localStorage quota
- [ ] Performance monitoring/baseline measurements

## 🚀 Advanced Features (Plan for Later)
- [ ] Bulk editing for inventory
- [ ] Advanced charting (historical portfolio value)
- [ ] Cost basis tracking (FIFO/LIFO)
- [ ] Multi-currency support
- [ ] Numista API integration
- [ ] Expand catalog providers

## 🔒 Security & Data
- [ ] Security audit automation
- [ ] Dependency audits
- [ ] Encrypted backup export
- [ ] Data migration system with schema versioning

## 🌐 Long-Term Vision
- [ ] Optional cloud sync (end-to-end encrypted)
- [ ] Optional database backend (Turso/libSQL)
- [ ] Real-time collaboration (future consideration)
- [ ] Predictive failure detection

---

**Instructions:**
- Check off tasks as completed.
- Agents should update status and progress in their `.ai` files per `agents.ai` protocols.
- Add, move, or archive items as needed.
