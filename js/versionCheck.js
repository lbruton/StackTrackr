/**
 * Version change detection and changelog display
 */

/**
 * Compares stored version with current and shows changelog modal if needed
 */
const checkVersionChange = () => {
  const hasData = !!localStorage.getItem(LS_KEY);
  if (!hasData) {
    if (typeof showAckModal === "function") {
      showAckModal();
    }
    return;
  }

  const acknowledged = localStorage.getItem(VERSION_ACK_KEY);
  const current = localStorage.getItem(APP_VERSION_KEY) || APP_VERSION;
  if (acknowledged === current) return;

  fetch("./CHANGELOG.md")
    .then((resp) => {
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      return resp.text();
    })
    .then((md) => {
      const changes = getChangelogForVersion(md, current);
      populateVersionModal(current, changes);
    })
    .catch((err) => {
      console.error("Error loading changelog:", err);
      // Fallback to embedded changelog for current version
      const fallbackChanges = getEmbeddedChangelog(current);
      populateVersionModal(current, fallbackChanges);
    });
};

/**
 * Extracts changelog section for a specific version
 * @param {string} text - Full changelog markdown
 * @param {string} version - Version string to extract
 * @returns {string} HTML string of changelog items
 */
const getChangelogForVersion = (text, version) => {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match Keep a Changelog format: ## [X.XX.XX] - YYYY-MM-DD
  // nosemgrep: javascript.dos.rule-non-literal-regexp
  const regex = new RegExp(
    `## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`,
  );
  const match = text.match(regex);
  if (!match) {
    return "<li>No changelog entry found.</li>";
  }
  return match[1]
    .trim()
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => {
      const clean = line.replace(/^\s*-\s*/, "");
      return `<li>${sanitizeHtml(clean).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`;
    })
    .join("");
};

/**
 * Populates and shows the version modal
 * @param {string} version - Current application version
 * @param {string} html - HTML content of changelog
 */
const populateVersionModal = (version, html) => {
  const modal = document.getElementById("versionModal");
  const body = document.getElementById("versionChanges");
  const ver = document.getElementById("versionModalVersion");
  if (ver) ver.textContent = `v${version}`;
  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
  if (body) body.innerHTML = html;
  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setupVersionModalEvents(version);
  if (typeof loadAnnouncements === "function") {
    loadAnnouncements();
  }
};

/**
 * Provides embedded changelog data as fallback when file fetch fails
 * @param {string} version - Version to get changelog for
 * @returns {string} HTML string of changelog items
 */
const getEmbeddedChangelog = (version) => {
  const changelogs = {
    "3.24.04": `
      <li><strong>Fixed</strong>: Bulk Editor now starts with a clean selection every time it opens (STACK-55)</li>
      <li><strong>Removed</strong>: <code>bulkEditSelection</code> localStorage persistence</li>
    `,
    "3.24.03": `
      <li><strong>Fixed</strong>: Goldback melt values inflated 1000x in Details Modal &mdash; apply GB_TO_OZT conversion and denomination retail pricing</li>
    `,
    "3.24.02": `
      <li><strong>Added</strong>: Activity Log sub-tabs in Settings &mdash; Changelog, Metals, Catalogs, Price History (STACK-44)</li>
      <li><strong>Added</strong>: Sortable spot price history, catalog API call log, and per-item price history tables</li>
      <li><strong>Added</strong>: Filter and clear buttons for each log sub-tab with confirmation dialogs</li>
    `,
    "3.24.01": `
      <li><strong>Fixed</strong>: Convert innerHTML to textContent for plain-text currency formatting</li>
      <li><strong>Changed</strong>: Add PMD, ESLint, and Semgrep configuration to resolve 90 Codacy issues</li>
    `,
    "3.24.00": `
      <li><strong>Added</strong>: Multi-currency display with 17 supported currencies and exchange rate conversion (STACK-50)</li>
      <li><strong>Added</strong>: Daily exchange rate fetching from open.er-api.com with localStorage caching and hardcoded fallback rates</li>
      <li><strong>Added</strong>: Dynamic currency symbols in modals, Goldback settings, and CSV export</li>
      <li><strong>Added</strong>: Dynamic Gain/Loss labels &mdash; green &ldquo;Gain:&rdquo; or red &ldquo;Loss:&rdquo; on totals cards</li>
      <li><strong>Fixed</strong>: Sticky header bleed-through when hovering table rows</li>
    `,
    "3.23.02": `
      <li><strong>Added</strong>: Bulk Edit pinned selections &mdash; selected items stay visible at the top of the table when the search term changes (STACK-52)</li>
      <li><strong>Changed</strong>: Extracted shared search filter helper and added master checkbox indeterminate state in Bulk Edit</li>
      <li><strong>Removed</strong>: Dormant rEngine/rSynk/AI prototype files and references</li>
    `,
    "3.23.01": `
      <li><strong>Added</strong>: Goldback real-time price estimation from gold spot (STACK-52)</li>
      <li><strong>Added</strong>: User-configurable estimation premium modifier</li>
      <li><strong>Changed</strong>: Settings sidebar — renamed Theme to Appearance, Tools to System</li>
      <li><strong>Changed</strong>: Default estimation formula to pure 2x spot (modifier = 1.0)</li>
    `,
    "3.23.00": `
      <li><strong>Added</strong>: Goldback denomination pricing &amp; type support (STACK-45)</li>
      <li><strong>Added</strong>: Persistent UUID v4 for every inventory item (STACK-42)</li>
      <li><strong>Added</strong>: Silent per-item price history recording (STACK-43)</li>
    `,
    "3.22.01": `
      <li><strong>Purity form layout</strong>: Weight/Purity/Qty on single row</li>
      <li><strong>Bulk Edit</strong>: Purity, Grade, Grading Authority as dropdowns</li>
      <li>Purity/fineness filter chips (enabled) and inline chips (disabled)</li>
      <li>Purity inline chip shows numerical value only</li>
    `,
    "3.22.00": `
      <li><strong>Added</strong>: Purity (fineness) field — adjusts melt value formula across all calculation sites (STACK-22)</li>
      <li><strong>Added</strong>: PCGS API daily quota usage bar in Settings (STACK-24)</li>
      <li><strong>Added</strong>: Pie chart metric toggle — switch between Purchase, Melt, Retail, and Gain/Loss views (STACK-27)</li>
      <li><strong>Changed</strong>: Extracted inline test loader to js/test-loader.js (STACK-25)</li>
      <li><strong>Changed</strong>: CSV, PDF, and ZIP exports now include Purity column</li>
      <li><strong>Changed</strong>: Seed data includes realistic purity values for sample items</li>
    `,
    "3.21.03": `
      <li><strong>Fixed</strong>: Search now matches items belonging to custom chip groups when searching by group label (STACK-23)</li>
    `,
    "3.21.02": `
      <li><strong>Seed spot history</strong>: 6 months of baked-in price data (720 entries, 4 metals) — sparklines and price cards work from day one</li>
      <li><strong>Sample inventory</strong>: 8 pre-configured items (3x ASE, 3x Gold Maple, Platinum Round, Palladium Bar) with grades, Numista IDs, and filter chips</li>
      <li><strong>Seed timestamp</strong>: Spot cards show 'Seed · date' with shift+click hint for seeded users</li>
      <li><strong>Metals History</strong>: Seed entries visible in history modal with StakTrakr source label</li>
      <li><strong>README overhaul</strong>: Hero screenshot, feature showcase, Getting Started guide</li>
      <li><strong>Seed generator</strong>: generate-seed-data.py processes CSV exports into seed JSON + embedded JS</li>
    `,
    "3.21.01": `
      <li><strong>Persist verified</strong>: Green checkmark survives reload, sort, and filter</li>
      <li><strong>Lookup fields</strong>: PCGS lookup populates Name and Retail Price</li>
      <li><strong>Cert icon</strong>: Verified checkmark in edit modal with theme support</li>
      <li><strong>History logging</strong>: PCGS verify/lookup calls logged to Catalog History</li>
      <li><strong>Numista icon fix</strong>: Search icon no longer stripped after search</li>
      <li><strong>Export fix</strong>: pcgsNumber and pcgsVerified in JSON and ZIP exports</li>
    `,
    "3.21.00": `
      <li><strong>PCGS# inline chip</strong>: New PCGS catalog number field on add/edit form. PCGS# chip renders in Name cell — click to open PCGS CoinFacts page. Included in CSV/JSON/PDF export, CSV/JSON import, search, and bulk edit</li>
      <li><strong>PCGS cert verification</strong>: New Settings &gt; API &gt; PCGS tab for bearer token configuration. One-click verify icon on PCGS-graded items shows grade, population, and price guide from PCGS API. Daily rate limit tracking (1,000/day)</li>
    `,
    "3.20.00": `
      <li><strong>Bulk Edit tool</strong>: Full-screen modal in Settings &gt; Tools to select multiple items and edit fields, copy, or delete in bulk. 16 editable fields with enable/disable toggles, searchable item table, Numista Lookup integration</li>
      <li><strong>Change Log Settings tab</strong>: Change Log relocated to Settings &gt; Log tab. Main page Log button opens Settings at the Log tab directly</li>
      <li><strong>Full Numista ID on chips</strong>: Chips now display N#12345 (full ID) instead of just N#</li>
      <li><strong>Year chip click-to-filter</strong>: Clicking a year chip applies a year column filter</li>
      <li><strong>Chip word boundary fix</strong>: Custom group patterns no longer match inside words</li>
      <li><strong>Shift-click chip hide fix</strong>: Right-click popups now properly clean up listeners</li>
    `,
    "3.19.00": `
      <li><strong>Category toggles</strong>: Enable, disable, and reorder 10 filter chip categories in Settings &gt; Chips. Disabled categories hidden from filter bar</li>
      <li><strong>Chip sort order</strong>: Sort chips within each category by Name (A-Z) or Qty (High&rarr;Low) from inline dropdown or Settings. Bidirectional sync between controls</li>
      <li><strong>Config-driven rendering</strong>: renderActiveFilters() refactored from 10 hard-coded blocks to a single data-driven loop</li>
    `,
    "3.18.00": `
      <li><strong>Numista first-class tab</strong>: Numista API promoted from appended section to pinned first tab in unified API Configuration panel</li>
      <li><strong>Drag-to-reorder provider priority</strong>: Metals tabs are drag-and-drop reorderable — tab position determines sync priority. Order persists across sessions</li>
      <li><strong>Header status row</strong>: Compact per-provider connection indicators with last-used timestamps</li>
      <li><strong>Clickable quota bars</strong>: Click usage bars to edit quota — dedicated Quota buttons removed</li>
      <li><strong>Streamlined provider cards</strong>: Removed batch badges, savings calculations, info links, Default/Backup buttons, and API URL display</li>
      <li><strong>Auto-select default provider</strong>: Provider priority determined by tab order instead of manual Default/Backup clicks</li>
    `,
    "3.17.00": `
      <li><strong>Settings reorganized</strong>: New Theme, Table, and Chips tabs. Visible rows moved to Table. Grouping renamed to Chips</li>
      <li><strong>Inline Name chip settings</strong>: Enable/disable and reorder 6 chip types (Grade, Numista, Year, Serial #, Storage, Notes) in Settings &gt; Table</li>
      <li><strong>3 new inline chips</strong>: Serial # (purple badge), Storage Location (muted badge), and Notes Indicator (document icon) — disabled by default</li>
      <li><strong>Search expansion</strong>: Year, Grade, Grading Authority, Cert #, Numista ID, and Serial Number now searchable</li>
      <li><strong>ZIP backup fix</strong>: Chip settings, feature flags, and display preferences now survive ZIP backup/restore round trips</li>
    `,
    "3.16.02": `
      <li><strong>Edit custom grouping rules</strong>: Inline edit button on each rule row — modify label and patterns without delete/recreate</li>
      <li><strong>Filter chip threshold relocated</strong>: Moved from Settings &gt; Site to Settings &gt; Grouping</li>
    `,
    "3.16.01": `
      <li><strong>Cache timeout persistence</strong>: Per-provider cache timeout settings now persist across page reloads</li>
      <li><strong>Historical data for all providers</strong>: Metals-API and MetalPriceAPI now fetch historical data on first sync instead of current-only prices</li>
      <li><strong>Auto-sync all providers</strong>: Page refresh syncs all configured providers with stale caches, not just the default</li>
      <li><strong>Standalone "Save" button</strong>: Save API key and settings without triggering a connection test or price fetch</li>
      <li><strong>Numista usage progress bar</strong>: Tracks API calls persistently with monthly auto-reset — shows X/2000 calls in Settings</li>
    `,
    "3.16.00": `
      <li><strong>Custom chip grouping</strong>: Define your own chip labels with comma-separated name patterns — group items any way you want</li>
      <li><strong>Smart grouping blacklist</strong>: Right-click any name chip to suppress it. Manage blacklisted chips in Settings &gt; Grouping</li>
      <li><strong>Dynamic name chips</strong>: Text inside parentheses and quotes in item names auto-generates filterable chips</li>
      <li><strong>Grouping settings panel</strong>: New Settings &gt; Grouping tab with Smart Grouping, Dynamic Chips, Blacklist, and Custom Rules controls</li>
    `,
    "3.14.01": `
      <li><strong>Name column truncation fix</strong>: Long item names now properly truncate with ellipsis — chips (Grade, N#, Year) stay visible</li>
      <li><strong>Compact N# chips</strong>: Numista catalog tags shortened to "N#" with full ID shown on hover</li>
      <li><strong>Tighter action icons</strong>: Edit/copy/delete buttons use less space — trash icon no longer clipped on narrow viewports</li>
    `,
    "3.14.00": `
      <li><strong>Encrypted portable backup</strong>: Export all data as a password-protected .stvault file (AES-256-GCM). Import on any device to restore inventory, settings, API keys, and price history</li>
      <li><strong>Password strength indicator</strong>: Live strength bar and match validation in the vault modal</li>
      <li><strong>Crypto fallback</strong>: Uses Web Crypto API natively; falls back to forge.js on Firefox file:// protocol</li>
    `,
    "3.12.02": `
      <li><strong>NGC cert lookup fix</strong>: Cert tag click now opens NGC with actual coin details visible</li>
      <li><strong>Name column overflow</strong>: Long names truncate with ellipsis — tags always stay visible</li>
      <li><strong>Numista Sets</strong>: New "Set" type for mint/proof sets with S-prefix Numista IDs</li>
      <li><strong>"Lunar Series" chip</strong>: "Year of the Dragon/Snake/etc." items group under one chip</li>
      <li><strong>Source column cleanup</strong>: URL sources display domain name only with link icon</li>
    `,
    "3.12.01": `
      <li><strong>Sticky header fix</strong>: Column headers now correctly pin at the top of the scrollable table during vertical scroll</li>
    `,
    "3.12.00": `
      <li><strong>Portal view</strong>: Inventory table now renders all items in a scrollable container with sticky column headers — pagination removed</li>
      <li><strong>Visible rows</strong>: Dropdown (10 / 15 / 25 / 50 / 100) sets the viewport height; scroll to see remaining items</li>
    `,
    "3.11.00": `
      <li><strong>Unified Settings modal</strong>: API, Files, and Appearance consolidated into a single near-full-screen modal with sidebar navigation. Header simplified to About + Settings</li>
      <li><strong>Theme picker</strong>: 3-button theme selector (Light / Dark / Sepia) replaces the cycling toggle button</li>
      <li><strong>Tabbed API providers</strong>: Provider configuration uses tabbed panels instead of a scrollable list</li>
      <li><strong>Items per page persisted</strong>: Items-per-page setting now survives page reloads</li>
    `,
    "3.10.01": `
      <li><strong>Numista iframe fix</strong>: Numista pages now open in a popup window instead of an iframe — fixes "Can't Open This Page" error on hosted deployments (X-Frame-Options)</li>
      <li><strong>Sort fix</strong>: Gain/Loss and Source columns now sort and resize correctly</li>
    `,
    "3.10.00": `
      <li><strong>Serial # field</strong>: New optional Serial Number input for bars and notes with physical serial numbers. Included in all CSV/JSON/ZIP exports and imports</li>
      <li><strong>Numista Aurum fix</strong>: Goldback / Aurum items now return results from Numista search (removed incorrect "banknote" category filter)</li>
      <li><strong>Enhanced Numista no-results</strong>: When Numista search returns nothing, a retry search box and quick-pick list of popular bullion items appear instead of a dead-end</li>
      <li><strong>Source column rename</strong>: "Location" column header renamed to "Source" with storefront icon for clarity</li>
      <li><strong>Year/Grade/N# filter chips</strong>: Year, Grade, and Numista ID values now appear as clickable filter chips in the chip bar</li>
      <li><strong>Year sort tiebreaker</strong>: Items with identical names now sub-sort by Year when sorting the Name column</li>
      <li><strong>eBay search year</strong>: Year is now included in eBay search URLs for more precise results</li>
    `,
    "3.09.05": `
      <li><strong>Grade, Authority & Cert #</strong>: New optional grading fields — Grade dropdown (AG through PF-70), Grading Authority (PCGS/NGC/ANACS/ICG), and Cert # input. Color-coded grade tags on table Name cell</li>
      <li><strong>Cert verification</strong>: Grade tags with cert numbers are clickable — opens the grading service's cert lookup page in a popup window</li>
      <li><strong>eBay search fix</strong>: Item names with quotes or parentheses no longer produce broken eBay search results</li>
    `,
    "3.09.04": `
      <li><strong>Year field</strong>: New optional Year field in add/edit form with inline year badge on inventory table (before N# tag). Numista picker fills Year instead of Metal</li>
      <li><strong>Form restructure</strong>: Name wider with Year beside it; purchase fields grouped: Date | Price, Location | Retail Price</li>
      <li><strong>Year in import/export</strong>: CSV and JSON exports include Year; imports read Year column; existing <code>issuedYear</code> data auto-migrates</li>
    `,
    "3.09.03": `
      <li><strong>Numista field picker fix</strong>: Replaced broken fieldset+flexbox with CSS Grid — checkboxes, labels, and inputs now align correctly across all browsers</li>
      <li><strong>Smart category search</strong>: Numista search maps your Type selection to API categories (Coin→coin, Bar/Round→exonumia, Note/Aurum→banknote) and prepends Metal to the query when not already present</li>
    `,
    "3.09.02": `
      <li><strong>Numista API v3 fix</strong>: Corrected base URL (<code>/v3</code>), endpoint paths (<code>/types</code>), auth header (<code>Numista-API-Key</code>), query parameters (<code>count</code>, <code>issuer</code>, <code>category</code>), response parsing (<code>data.types</code>), and field mapping (<code>min_year</code>/<code>max_year</code>, <code>issuer.name</code>, <code>size</code>, <code>category</code>, <code>obverse_thumbnail</code>, <code>comments</code>, <code>value.numeric_value</code>) — 7 bugs total</li>
      <li><strong>localStorage whitelist fix</strong>: Added <code>staktrakr.catalog.cache</code> and <code>staktrakr.catalog.settings</code> to the allowed storage keys — without these, <code>cleanupStorage()</code> deleted catalog data on every page load</li>
    `,
    "3.09.01": `
      <li><strong>Normalized name chips</strong>: Filter chip bar groups item name variants into single chips (e.g., "Silver Eagle 15/164"). Click to filter, click again to toggle off. Respects minCount threshold and Smart Grouping toggle</li>
      <li><strong>Name normalizer rewrite</strong>: Precise starts-with matching replaces fuzzy word matching — no more phantom chips for items you don't own (e.g., "American Gold Eagle" when you only have Silver Eagles)</li>
      <li><strong>Silver chip contrast fix</strong>: Silver metal chip text no longer invisible on dark/sepia themes at page load</li>
      <li><strong>Duplicate location chip fix</strong>: Clicking a location chip no longer produces two chips</li>
    `,
    "3.09.00": `
      <li><strong>Spot card hint</strong>: Cards with no price data show "Shift+click price to set" for discoverability</li>
      <li><strong>Default chip threshold</strong>: Filter chips now appear at 3+ items (was 100+)</li>
      <li><strong>Unified thresholds</strong>: Purchase and storage location chips now respect the minCount dropdown</li>
      <li><strong>Date chips removed</strong>: Too granular — removed entirely</li>
      <li><strong>"Unknown" suppressed</strong>: Empty and "Unknown" location values no longer produce chips</li>
      <li><strong>Dead code cleanup</strong>: Removed legacy columnFilters, updateTypeSummary, and 9 stale console.log calls</li>
      <li><strong>Chips update on mutations</strong>: Filter chips now refresh after delete, import, wipe, and add/edit</li>
    `,
    "3.08.01": `
      <li><strong>Totals above table</strong>: Per-metal portfolio summary cards now appear above the inventory table — Spot Prices → Totals → Table</li>
      <li><strong>Sparkline color consistency</strong>: Trend lines now use the same metal accent colors as the totals card bars, across all themes</li>
      <li><strong>Default 25 rows</strong>: Table now shows 25 rows by default (10 and 15 removed from dropdown)</li>
    `,
    "3.08.00": `
      <li><strong>Sparkline trend charts</strong>: Background Chart.js line charts on all 4 spot price cards showing price history with gradient fill</li>
      <li><strong>Trend range dropdown</strong>: Per-card 7d/30d/60d/90d selector with persistent preference</li>
      <li><strong>Sync icon</strong>: Compact refresh icon replaces old Sync/Add/History button panel, spins during fetch</li>
      <li><strong>Shift+click manual price</strong>: Hold Shift and click the spot price to edit inline — Enter saves, Escape cancels</li>
      <li><strong>History dedup fix</strong>: Repeated syncs with 30-day backfill no longer create duplicate spotHistory entries</li>
    `,
    "3.07.02": `
      <li><strong>Shift+click inline editing</strong>: Hold Shift and click any editable cell (Name, Qty, Weight, Purchase Price, Retail Price, Location) to edit in place. Enter saves, Escape cancels, click away cancels</li>
      <li><strong>Removed pencil icon</strong>: Name column no longer shows the edit icon — shift+click replaces it for all 6 editable columns</li>
      <li><strong>Removed save/cancel icons</strong>: Inline edit fields use Enter/Escape only — no more buttons competing for space in narrow cells</li>
      <li><strong>Hidden number spinners</strong>: Qty, Weight, and price fields no longer show browser-native up/down arrows</li>
    `,
    "3.07.01": `
      <li><strong>Light theme: clean backgrounds</strong>: Cool gray page background with white cards — visible elevation and row striping</li>
      <li><strong>Table cleanup</strong>: Removed sticky columns, filter-based hover, and cell-level transitions</li>
      <li><strong>Metal/type text contrast</strong>: Darkened color tokens so they pass WCAG AA in light and sepia themes</li>
      <li><strong>Sepia theme fixes</strong>: Removed global sepia filter, fixed text contrast to pass WCAG AA, warm info color, visible borders</li>
    `,
    "3.07.00": `
      <li><strong>Confidence styling</strong>: Retail and Gain/Loss columns show italic/muted for estimated vs bold for confirmed values</li>
      <li><strong>All Metals summary card</strong>: Combined totals with Avg Cost/oz and clickable breakdown modal</li>
      <li><strong>Metal detail modal overhaul</strong>: Full portfolio breakdown per type and location in a 2x2 grid</li>
    `
  };
  
  return changelogs[version] || "<li>Changelog information not available for this version.</li>";
};

/**
 * Sets up modal event handlers for version acknowledgment
 * @param {string} version - Current application version
 */
const setupVersionModalEvents = (version) => {
  const modal = document.getElementById("versionModal");
  const acceptBtn = document.getElementById("versionAcceptBtn");
  const closeBtn = document.getElementById("versionCloseBtn");

  const accept = () => {
    localStorage.setItem(VERSION_ACK_KEY, version);
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  };

  if (acceptBtn) {
    acceptBtn.addEventListener("click", accept);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", accept);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        accept();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display === "block") {
      accept();
    }
  });
};

document.addEventListener("DOMContentLoaded", checkVersionChange);

