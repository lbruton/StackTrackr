# Roadmap (Updated: 2025-08-15 13:15:11)

- [ ] The Last Sync time/date is incorrectly recording the last time the user pressed the sync button; this should be the last API pull

- [ ] Unknown items and "Imported by *" items should always sort after items with valid values

- [ ] Correct issue with readme date inconsistencies

- [ ] **Filter Chips Initial Styling Bug** - Chips display wrong styling on page load, correct after filter interaction (BUG-006)

- [ ] **Filter Chip Color Consistency Bug** - Filter chips lose color consistency when filters change, colors shift after add/remove operations despite hash-based color generation fix (BUG-007)

- [ ] **Filter Chips Dropdown Inverse Filtering Bug** - Filter chips dropdown is filtering inversely, expected behavior unclear, may affect core filtering functionality (BUG-008)

- [ ] **CSV Import Price Data Loss Bug** - CSV imports no longer pulling estimated price and purchase prices from Numista import data, causing data loss during import process (BUG-009) ✅ **FIXED**

- [ ] **Edit Button Hover Background Bug** - Edit action buttons still show background highlight on hover despite animation removal request, should have clean hover state (BUG-010) ✅ **FIXED**

## ✅ **Recently Fixed**

- [x] **Fraction Display Bug** - CSV imports converting "1/2" to "12" in name fields, resolved by re-importing data with corrected CSV processing (BUG-011 - FIXED via re-import)

- [x] **Default Filter Pagination** - Changed default items per page from 25 to 10 for better initial user experience (IMPROVEMENT-001 - COMPLETED)

- [x] **Numerical Value Consistency** - Standardized font sizes and added subtle color coding for all numerical columns (qty, weight, prices, premiums) (IMPROVEMENT-002 - COMPLETED)

## 🎨 **Design Language & UI Modernization**

- [ ] **Establish Multi-Tool Design Language** - Create unified design system across StackTrackr, VulnTrackr, and Network Inventory Tool based on excellent table design from Network Inventory Tool (DESIGN-001)

- [ ] **Redesign Totals Cards** - Redesign totals cards popups to match VulnTrackr style with stats grid layout and better visual hierarchy (DESIGN-002)

- [ ] **Clean Up Spot Price Section** - Remove dropdown buttons under spot prices, simplify interface to match VulnTrackr clean design approach (DESIGN-003)

- [ ] **Task Organization and Delegation System** - Review all tasks/todo lists across projects, organize by priority and complexity, assign delegates/ownership to each task (MGMT-001)

- [ ] **Weekly Memory Gap Analysis** - Systematic weekly review of memory coverage, identify and fill weak points in context preservation, ensure agent handoff continuity (MGMT-002)

- [ ] **Monthly Roadmap Review and Update** - Comprehensive monthly review of roadmap items, update priorities, archive completed tasks, add new requirements (MGMT-003)

- [ ] Fuzzy search filter shows American Gold Eagle when typing "Eagle" or "Silver Eagle" - needs refinement

- [ ] Error recovery procedures missing for critical failures

- [ ] Data corruption detection and recovery mechanisms

- [ ] Agent coordination timeout mechanisms

- [ ] Memory leak detection for long-running sessions

- [ ] Cross-browser compatibility edge cases

- [ ] localStorage quota limit handling

- [ ] When importing data, if no value is present, check other Numista price values. If none, set the price to 0.00

- [ ] When opening Numista links, open them in a new, appropriately sized window with close, back, and forward controls

- [ ] "Change Log" should have a square recycle bin icon instead of text

- [ ] In the table, when filtered, dynamically remove empty columns

- [ ] When the width narrows to mobile sizes, double the height of the table rows

- [ ] Re-theme the light mode with the new "Darker Light" palette

- [ ] Add exponential backoff and a user-visible retry banner for API rate limits

- [ ] Move the "Minimum Chip Items" dropdown under the "Items" dropdown

- [ ] Add a checkbox under the "Minimum Chip Items" dropdown to include date and price values for all cells

- [ ] Add a toggle to enable/disable weight in the filters tool

- [ ] Provide a toggle to switch between a condensed, scrolling view and an auto-expanding view

- [ ] Group all control toggles into a card under the "Items" dropdown

- [ ] The "Title/Name" column should allow fractions

- [ ] Center the titles and subtitles on the cards in the files modal

- [ ] Add "You may be entitled to compensation" to the boating accident joke, scaled to fit under the button

- [ ] Add "Purchase" and "Issue" year filters

- [ ] Performance monitoring and baseline measurements

- [ ] Integration testing framework for multi-agent workflows

- [ ] Automated testing for localStorage quota limits

- [ ] Security audit automation and scheduling

- [ ] User-Customizable Theme System

- [ ] Create a Debug API Button that opens a modal showing the API response in text/JSON and a table

- [ ] Comprehensive error recovery strategy with rollback procedures

- [ ] Data migration system with schema versioning

- [ ] Agent coordination recovery mechanisms

- [ ] Automated performance regression testing

- [ ] Real-time collaboration features for agents

- [ ] Predictive failure detection system

- [ ] Advanced dependency resolution for agent tasks

- [ ] User experience metrics collection

- [ ] Automated CI/CD pipeline integration

- [ ] Data schema versioning system implementation

- [ ] localStorage corruption detection utilities

- [ ] Automated migration scripts for breaking changes

- [ ] Performance baseline and monitoring infrastructure

- [ ] Security threat model documentation

- [ ] Dependency vulnerability tracking system

- [ ] Agent task coordination database

- [ ] Distributed task management system

- [ ] Emergency procedures documentation (`/docs/emergency-procedures.md`)

- [ ] Advanced agent handoff validation system

- [ ] Integration test suite for core workflows

- [ ] Cross-theme compatibility verification automation

- [ ] Regression testing pipeline for major changes

- [ ] Agent coordination failure simulation

- [ ] XSS/injection attack simulation testing

- [ ] Browser compatibility automation

- [ ] Performance benchmark automation

- [ ] Data integrity validation during upgrades

- [ ] Performance Optimization Quick Wins (100 min total)

- [ ] Fix bug in user authentication module
- [ ] Add unit tests for payment gateway
- [ ] Update API documentation for v2.0
