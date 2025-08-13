# Function Reference


> **Latest release: v3.04.67**


| File | Function | Description |
|------|----------|-------------|
| about.js | showAboutModal | Shows the About modal and populates it with current data |
| about.js | hideAboutModal | Hides the About modal |
| about.js | showAckModal | Shows the acknowledgment modal on load |
| about.js | hideAckModal | Hides the acknowledgment modal |
| about.js | acceptAck | Accepts the acknowledgment and hides the modal |
| about.js | populateAboutModal | Populates the about modal with current version and changelog information |
| about.js | populateAckModal | Populates the acknowledgment modal with version information |
| about.js | loadAnnouncements | Loads latest release notes and roadmap from docs/announcements.md |
| about.js | showFullChangelog | Shows full changelog in a new window or navigates to documentation |
| about.js | setupAboutModalEvents | Sets up event listeners for about modal elements |
| about.js | setupAckModalEvents | Sets up event listeners for acknowledgment modal elements |
| autocomplete.js | buildSearchIndices | Builds searchable indices with variants for all lookup data |
| autocomplete.js | cacheLookupTable | Caches lookup table to localStorage with Map serialization |
| autocomplete.js | clearLookupCache | Clears cached lookup table from localStorage |
| autocomplete.js | createEmptyLookupTable | Creates an empty lookup table structure with default values |
| autocomplete.js | extractUniqueValues | Extracts unique values from inventory for a specific field |
| autocomplete.js | generateLookupTable | Generates lookup table from current inventory data |
| autocomplete.js | generateVariations | Generates searchable variations for a given term including abbreviations |
| autocomplete.js | getCachedLookupTable | Retrieves cached lookup table if valid and not expired |
| autocomplete.js | getCurrentLookupTable | Returns the current lookup table instance |
| autocomplete.js | getLookupStats | Gets current lookup table statistics and cache status |
| autocomplete.js | getSuggestions | Returns name suggestions using fuzzy or substring matching |
| autocomplete.js | initializeAutocomplete | Initializes autocomplete system with inventory data |
| autocomplete.js | loadLookupTable | Loads lookup table from cache or generates new one |
| autocomplete.js | refreshLookupTable | Refreshes lookup table from current inventory |
| autocomplete.js | registerName | Adds a new name to the autocomplete store |
| api.js | renderApiStatusSummary |  |
| api.js | loadApiConfig | Loads Metals API configuration from localStorage |
| api.js | saveApiConfig | Saves Metals API configuration to localStorage |
| api.js | clearApiConfig | Clears Metals API configuration |
| api.js | clearApiCache | Clears only the API cache, keeping the configuration |
| api.js | getCacheDurationMs | Gets cache duration in milliseconds |
| api.js | setProviderStatus | Sets connection status for a provider in the settings UI |
| api.js | updateProviderHistoryTables | Displays API usage/quota data for each provider |
| api.js | refreshProviderStatuses | Refreshes provider statuses based on stored keys and cache age |
| api.js | updateDefaultProviderButtons | Updates default provider button states |
| api.js | renderApiHistoryTable | Renders API history table with filtering, sorting and pagination |
| api.js | showApiHistoryModal | Shows API history modal with table and chart |
| api.js | hideApiHistoryModal | Hides API history modal |
| api.js | showApiProvidersModal | Shows API providers modal |
| api.js | hideApiProvidersModal | Hides API providers modal |
| api.js | clearApiHistory | Clears stored API price history |
| api.js | setDefaultProvider | Updates default provider selection in config |
| api.js | clearApiKey | Clears stored API key for a provider |
| api.js | refreshFromCache | Refreshes display using cached data without making API calls |
| api.js | loadApiCache | Loads cached API data from localStorage |
| api.js | saveApiCache | Saves API data to cache |
| api.js | autoSyncSpotPrices | Automatically syncs spot prices if API keys exist and cache is stale |
| api.js | fetchSpotPricesFromApi | Makes API request for spot prices |
| api.js | testApiConnection | Tests API connection |
| api.js | handleProviderSync | Handles testing and syncing for a specific provider |
| api.js | syncAllProviders | Syncs all configured providers and records results |
| api.js | updateSyncButtonStates | Updates sync button states based on API availability |
| api.js | showApiModal | Shows settings modal and populates API fields |
| api.js | hideApiModal | Hides API modal |
| api.js | showFilesModal | Opens the Files modal |
| api.js | hideFilesModal |  |
| api.js | showProviderInfo | Shows provider information modal |
| api.js | hideProviderInfo | Hides provider information modal |
| api.js | showManualInput | Shows manual price input for a specific metal |
| api.js | hideManualInput | Hides manual price input for a specific metal |
| api.js | resetSpotPrice | Resets spot price to default or API cached value |
| api.js | createBackupData | Exports backup data including Metals API configuration |
| api.js | downloadCompleteBackup | Downloads complete backup files including inventory and Metals API configuration |
| filters.js | applyQuickFilter | Adds or toggles a filter for a specific field value |
| filters.js | clearAllFilters | Clears all active filters and search query |
| filters.js | filterInventoryAdvanced | Applies multi-value and exclusion filters with comma-separated search terms |
| changeLog.js | logChange | Records a change to the change log and persists it |
| changeLog.js | logItemChanges | Compares two item objects and logs any differences |
| changeLog.js | renderChangeLog | Renders the change log table with all entries |
| changeLog.js | toggleChange | Toggles a logged change between undone and redone states |
| changeLog.js | clearChangeLog | Clears all change log entries after confirmation |
| charts.js | generateColors | Generates a color palette for pie chart segments |
| charts.js | getChartBackgroundColor | Gets appropriate background color for charts based on current theme |
| charts.js | getChartTextColor | Gets appropriate text color for charts based on current theme |
| charts.js | createPieChart | Creates a pie chart with the given data |
| charts.js | destroyCharts | Destroys existing chart instances to prevent memory leaks |
| detailsModal.js | getBreakdownData | Calculates breakdown data for specified metal by type and location |
| detailsModal.js | createBreakdownElements | Creates breakdown DOM elements for display |
| detailsModal.js | showDetailsModal | Shows the details modal for specified metal with pie charts |
| detailsModal.js | closeDetailsModal | Closes the details modal and cleans up charts |
| events.js | safeAttachListener | Safely attaches event listener with fallback methods |
| events.js | setupColumnResizing | Implements dynamic column resizing for the inventory table |
| events.js | updateColumnVisibility | Updates column visibility based on viewport width |
| events.js | setupResponsiveColumns | Sets up column visibility resize listener |
| events.js | setupEventListeners | Sets up all primary event listeners for the application |
| events.js | updateThemeDisplay |  |
| events.js | setupPagination | Sets up pagination event listeners |
| events.js | setupSearch | Sets up search event listeners |
| events.js | setupThemeToggle | Sets up theme toggle event listeners |
| events.js | setupApiEvents | Sets up API-related event listeners |
| file-protocol-fix.js | safeDebug |  |
| fuzzy-search.js | fuzzyMatch | Calculates fuzzy similarity between query and target strings |
| fuzzy-search.js | fuzzySearch | Performs fuzzy search across an array of strings |
| fuzzy-search.js | calculateLevenshteinDistance | Calculates edit distance between two strings |
| fuzzy-search.js | generateNGrams | Generates character n-grams from a string |
| fuzzy-search.js | tokenizeWords | Splits a string into words |
| fuzzy-search.js | normalizeString | Normalizes strings by stripping special characters |
| fuzzy-search.js | benchmarkSearch | Benchmarks fuzzy search performance |
| init.js | createDummyElement | Helper function to create dummy DOM elements to prevent null reference errors |
| init.js | safeGetElement | Safely retrieves a DOM element by ID with fallback to dummy element |
| init.js | setupBasicEventListeners | Basic event listener setup as fallback |
| inventory.js | createBackupZip | Creates a comprehensive backup ZIP file containing all application data |
| inventory.js | restoreBackupZip | Restores application data from a backup ZIP file |
| inventory.js | generateBackupHtml | Generates HTML content for backup export |
| inventory.js | generateReadmeContent | Generates README content for backup archive |
| inventory.js | saveInventory | Saves current inventory to localStorage |
| inventory.js | sanitizeTablesOnLoad | Removes non-alphanumeric characters from inventory records |
| inventory.js | loadInventory | Loads inventory from localStorage with comprehensive data migration |
| inventory.js | getNextSerial | Generates a unique serial number for inventory items |
| inventory.js | getColor |  |
| inventory.js | escapeAttribute | Escapes text for safe use in HTML attributes |
| inventory.js | filterLink | Builds clickable filter span with optional HTML content |
| inventory.js | formatPurchaseLocation | Detects URLs and appends info tooltip link while keeping text filterable |
| inventory.js | hideEmptyColumns | Hides table columns that contain no data after filtering |
| inventory.js | renderTable |  |
| inventory.js | updateTypeSummary | Renders single-row chips for type, metal, purchase location, storage location with filtered/total counts |
| inventory.js | updateSummary | Calculates and updates all financial summary displays across the application |
| inventory.js | calculateTotals | Calculates financial metrics for specified metal type |
| inventory.js | deleteItem | Deletes inventory item at specified index after confirmation |
| inventory.js | showNotes | Opens modal to view and edit an item's notes |
| inventory.js | editItem | Prepares and displays edit modal for specified inventory item |
| inventory.js | toggleCollectable | Toggles collectable status for inventory item |
| inventory.js | startImportProgress |  |
| inventory.js | updateImportProgress |  |
| inventory.js | endImportProgress |  |
| inventory.js | importCsv | Imports inventory data from CSV file with comprehensive validation; supports override or merge modes |
| inventory.js | importNumistaCsv | Imports Numista CSV data with header trimming and merge/override options |
| inventory.js | exportCsv | Exports current inventory to CSV format |
| inventory.js | importJson | Imports inventory data from JSON file with override or merge modes |
| inventory.js | exportJson | Exports current inventory to JSON format |
| inventory.js | exportPdf | Exports current inventory to PDF format |
| pagination.js | calculateTotalPages | Calculates total number of pages based on current data |
| pagination.js | goToPage | Navigates to specified page number |
| search.js | filterInventory | Filters inventory based on search query and filters; supports comma-separated terms |
| search.js | applyColumnFilter | Applies a column-specific filter and re-renders the table |
| sorting.js | sortInventory | Sorts inventory based on current sort column and direction |
| spot.js | saveSpotHistory | Saves spot history to localStorage |
| spot.js | loadSpotHistory | Loads spot history from localStorage |
| spot.js | purgeSpotHistory | Removes spot history entries older than a set number of days |
| spot.js | updateLastTimestamps | Stores last cache refresh and API sync timestamps |
| spot.js | recordSpot | Records a new spot price entry in history with optional timestamp |
| spot.js | fetchSpotPrice | Fetches and displays current spot prices from localStorage or defaults |
| spot.js | updateManualSpot | Updates spot price for specified metal from user input |
| spot.js | resetSpot | Resets spot price for specified metal to default or API cached value |
| spot.js | resetSpotByName | Alternative reset function that works with metal name instead of key |
| theme.js | setTheme | Sets application theme (dark, light, sepia, or system) and updates localStorage |
| theme.js | initTheme | Initializes theme based on user preference and system settings |
| theme.js | toggleTheme | Cycles through dark, light, sepia, and system themes |
| theme.js | setupSystemThemeListener | Sets up system theme change listener |
| constants.js | getVersionString | Returns formatted version string |
| constants.js | injectVersionString | Inserts formatted version string into a target element |
| constants.js | getTemplateVariables | Returns object with all template variables for documentation replacement |
| constants.js | replaceTemplateVariables | Replaces {{VARIABLE}} placeholders in text with actual values |
| customMapping.js | addMapping | Adds a regex-based mapping rule |
| customMapping.js | mapField | Maps an input field name using stored rules |
| customMapping.js | clear | Removes all custom mapping rules |
| customMapping.js | list | Lists current mapping rules |
| utils.js | debugLog | Logs messages to console when DEBUG flag is enabled |
| utils.js | getBrandingName | Gets the active branding name considering domain overrides |
| utils.js | getAppTitle | Returns full application title with version when no branding is configured |
| utils.js | getFooterDomain | Determines active domain for footer copyright |
| utils.js | monitorPerformance | Performance monitoring utility |
| utils.js | debounce | Creates a debounced version of a function |
| utils.js | getLastUpdateTime | Builds two-line HTML showing source and last cache refresh or API sync info for a metal |
| utils.js | updateSpotTimestamp | Updates timestamp element with toggle between cache refresh and API sync times |
| utils.js | pad2 | Pads a number with leading zeros to ensure two-digit format |
| utils.js | todayStr | Returns current date as ISO string (YYYY-MM-DD) |
| utils.js | currentMonthKey | Returns current month key in YYYY-MM format |
| utils.js | parseDate | Parses various date formats into standard YYYY-MM-DD format; returns 'Unknown' if invalid |
| utils.js | formatDisplayDate | Formats a date string into two-digit year ISO format (YY-MM-DD) |
| utils.js | formatCurrency | Formats a number as a currency string using the default currency |
| utils.js | formatLossProfit | Formats a profit/loss value with color coding |
| utils.js | sanitizeHtml | Sanitizes text input for safe HTML display |
| utils.js | gramsToOzt | Converts grams to troy ounces (ozt) |
| utils.js | oztToGrams | Converts troy ounces to grams |
| utils.js | formatWeight | Formats a weight in ozt to grams or ounces |
| utils.js | convertToUsd | Converts amount from specified currency to USD using static rates |
| utils.js | detectCurrency | Detects currency code from a value string |
| utils.js | stripNonAlphanumeric | Removes all characters except letters, numbers, and spaces |
| utils.js | cleanString | Removes HTML tags and control characters while preserving punctuation |
| utils.js | sanitizeObjectFields | Strips non-alphanumeric characters from string fields except purchaseLocation, which uses cleanString |
| utils.js | normalizeType | Ensures item type matches predefined options (Coin, Bar, Round, Note, Aurum, Other) |
| utils.js | mapNumistaType | Maps Numista type strings to internal categories (Coin, Bar, Round, Note, Aurum, Other) |
| utils.js | parseNumistaMetal | Parses composition into Silver, Gold, Platinum, Palladium, Paper, or Alloy |
| utils.js | getCompositionFirstWords | Extracts first two words from a composition string, ignoring parentheses and numbers |
| utils.js | getDisplayComposition | Returns "Alloy" when composition doesn't start with a primary metal |
| utils.js | saveData | Saves data to localStorage with JSON serialization |
| utils.js | loadData | Loads data from localStorage with error handling |
| utils.js | cleanupStorage | Removes unknown localStorage keys to maintain a clean storage state |
| utils.js | sortInventoryByDateNewestFirst | Sorts inventory by date (newest first) |
| utils.js | validateInventoryItem | Validates inventory item data |
| utils.js | sanitizeImportedItem | Coerces invalid imported fields to safe defaults (price defaults to 0) and strips HTML, diacritics, and non-alphanumeric characters |
| utils.js | handleError | Handles errors with user-friendly messaging |
| utils.js | getUserFriendlyMessage | Converts technical error messages to user-friendly ones |
| utils.js | downloadFile | Downloads a file with the specified content and filename |
| utils.js | updateStorageStats | Updates footer with localStorage usage statistics and progress bar |
| utils.js | downloadStorageReport | Downloads a report of all localStorage data |
| utils.js | openStorageReportPopup | Displays storage report HTML in a modal iframe |
| versionCheck.js | checkVersionChange | Compares stored version with current and shows changelog modal |
| versionCheck.js | getChangelogForVersion | Extracts changelog section for a specific version |
| versionCheck.js | populateVersionModal | Inserts changelog text into modal and displays it |
| versionCheck.js | setupVersionModalEvents | Handles modal interactions and version acknowledgment |
