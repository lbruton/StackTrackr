// APPLICATION STATE
// =============================================================================

/** @type {Object} Sorting state tracking */
let sortColumn = null; // Currently sorted column index (null = unsorted)
let sortDirection = "asc"; // 'asc' or 'desc' - current sort direction

/** @type {number|null} Index of item being edited (null = no edit in progress) */
let editingIndex = null;
/** @type {number|null} Index of item whose notes are being edited */
let notesIndex = null;
/** @type {number|null} Change log entry currently being edited */
let editingChangeLogIndex = null;

/** @type {Object} Pagination state */
let currentPage = 1; // Current page number (1-based)
let itemsPerPage = 10; // Number of items to display per page

/** @type {string} Current search query */
let searchQuery = "";

/** @type {Object<string, string>} Active column filters */
let columnFilters = {};

/** @type {Object} Chart instances for proper cleanup */
let chartInstances = {
  typeChart: null,
  locationChart: null,
  apiHistoryChartSilver: null,
  apiHistoryChartGold: null,
  apiHistoryChartPlatinum: null,
  apiHistoryChartPalladium: null,
};

/** @type {Set<string>} Available composition options */
let compositionOptions = new Set(["Gold", "Silver", "Platinum", "Palladium", "Alloy"]);

/** @type {Object} Cached DOM elements for performance */
const elements = {
  // Spot price elements
  spotPriceDisplay: {},
  userSpotPriceInput: {},
  saveSpotBtn: {},
  resetSpotBtn: {},

  // Form elements
  inventoryForm: null,
  inventoryTable: null,
  itemMetal: null,
  itemName: null,
  itemQty: null,
  itemType: null,
  itemWeight: null,
  itemPrice: null,
  purchaseLocation: null,
  storageLocation: null,
  itemNotes: null,
  itemDate: null,
  itemSpotPrice: null,
  itemCollectable: null,

  // Spot price buttons
  saveSpotBtnSilver: null,
  saveSpotBtnGold: null,
  resetSpotBtnSilver: null,
  resetSpotBtnGold: null,

  // Import elements
  importCsvFile: null,
  importCsvOverride: null,
  importCsvMerge: null,
  importJsonFile: null,
  importExcelFile: null,
  importProgress: null,
  importProgressText: null,
  numistaImportBtn: null,
  numistaImportFile: null,
  numistaOverride: null,
  numistaMerge: null,
  numistaImportOptions: null,

  // Export elements
  exportCsvBtn: null,
  exportJsonBtn: null,
  exportExcelBtn: null,
  exportPdfBtn: null,
  cloudSyncBtn: null,
  syncAllBtn: null,

  // Custom mapping buttons
  addMappingBtn: null,
  applyMappingsBtn: null,
  clearMappingsBtn: null,

  // Emergency reset button
  removeInventoryDataBtn: null,
  clearNumistaCacheBtn: null,
  boatingAccidentBtn: null,

  // Edit modal elements
  editModal: null,
  editForm: null,
  cancelEditBtn: null,
  editMetal: null,
  editName: null,
  editQty: null,
  editType: null,
  editWeight: null,
  editPrice: null,
  editPurchaseLocation: null,
  editStorageLocation: null,
  editNotes: null,
  editDate: null,
  editSpotPrice: null,
  editCatalog: null,
  undoChangeBtn: null,
  editSerial: null,
  editCloseBtn: null,

  // Notes modal elements
  notesModal: null,
  notesTextarea: null,
  saveNotesBtn: null,
  cancelNotesBtn: null,
  notesCloseBtn: null,

  // Details modal elements
  detailsModal: null,
  detailsModalTitle: null,
  typeBreakdown: null,
  locationBreakdown: null,
  detailsCloseBtn: null,
  totalTitles: null,

  // Chart canvas elements
  typeChart: null,
  locationChart: null,

  // Pagination elements
  itemsPerPage: null,
  prevPage: null,
  nextPage: null,
  firstPage: null,
  lastPage: null,
  pageNumbers: null,

  // Change log elements
  changeLogBtn: null,
  changeLogModal: null,
  changeLogCloseBtn: null,
  changeLogTable: null,
  storageUsage: null,
  storageReportLink: null,

  // Search elements
  searchInput: null,
  metalFilter: null,
  clearSearchBtn: null,
  newItemBtn: null,
  searchResultsInfo: null,

  // Add item modal elements
  addModal: null,
  addCloseBtn: null,
  cancelAddBtn: null,

  // About & acknowledgment modal elements
  aboutBtn: null,
  aboutModal: null,
  ackModal: null,
  ackAcceptBtn: null,

  // Appearance, API & Files elements
  appearanceBtn: null,
  apiBtn: null,
  filesBtn: null,
  apiModal: null,
  filesModal: null,
  apiInfoModal: null,
  apiHistoryModal: null,
  apiProvidersModal: null,
  cloudSyncModal: null,
  apiQuotaModal: null,

  // Spot price action buttons
  spotSyncBtn: null,
  spotAddBtn: null,
  spotResetBtn: null,

  // Totals display elements (organized by metal type)
  totals: {
    silver: {
      items: null, // Total item count
      weight: null, // Total weight in ounces
      value: null, // Current market value
      purchased: null, // Total purchase price
      avgPrice: null, // Average price per ounce
      avgPremium: null, // Average premium per ounce
      avgCollectablePrice: null, // Average collectable price per ounce
      avgNonCollectablePrice: null, // Average non-collectable price per ounce
      premium: null, // Total premium paid
      lossProfit: null, // Total loss/profit
    },
    gold: {
      // Same structure as silver
      items: null,
      weight: null,
      value: null,
      purchased: null,
      avgPrice: null,
      avgPremium: null,
      avgCollectablePrice: null,
      avgNonCollectablePrice: null,
      premium: null, // Total premium paid
      lossProfit: null, // Total loss/profit
    },
    platinum: {
      items: null,
      weight: null,
      value: null,
      purchased: null,
      avgPrice: null,
      avgPremium: null,
      avgCollectablePrice: null,
      avgNonCollectablePrice: null,
      premium: null, // Total premium paid
      lossProfit: null, // Total loss/profit
    },
    palladium: {
      items: null,
      weight: null,
      value: null,
      purchased: null,
      avgPrice: null,
      avgPremium: null,
      avgCollectablePrice: null,
      avgNonCollectablePrice: null,
      premium: null, // Total premium paid
      lossProfit: null, // Total loss/profit
    },
    all: {
      // Combined totals for all metals
      items: null,
      weight: null,
      value: null,
      purchased: null,
      avgPrice: null,
      avgPremium: null,
      avgCollectablePrice: null,
      avgNonCollectablePrice: null,
      premium: null, // Total premium paid
      lossProfit: null, // Total loss/profit
    },
  },
};

/** @type {Array} Change log entries */
let changeLog = JSON.parse(localStorage.getItem('changeLog') || '[]');

/** @type {Array} Main inventory data structure */
let inventory = [];

/** @type {Object} Current spot prices for all metals */
let spotPrices = {
  silver: 0,
  gold: 0,
  platinum: 0,
  palladium: 0,
};

/** @type {Array} Historical spot price records */
let spotHistory = [];

/** @type {Object|null} Current API configuration */
let apiConfig = null;

/** @type {Object|null} Cached API data with timestamp */
let apiCache = null;

// =============================================================================
