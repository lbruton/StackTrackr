// Autocomplete module for StackrTrackr
// Maintains a set of known bullion/coin names persisted to localStorage

/**
 * Predefined bullion and coin names
 * Base list pulled from popular bullion series
 */
const BASE_AUTOCOMPLETE_NAMES = [
  "Silver American Eagle",
  "Gold American Eagle",
  "Platinum American Eagle",
  "Palladium American Eagle",
  "Silver Canadian Maple Leaf",
  "Gold Canadian Maple Leaf",
  "Platinum Canadian Maple Leaf",
  "Palladium Canadian Maple Leaf",
  "Silver South African Krugerrand",
  "Gold South African Krugerrand",
  "Platinum South African Krugerrand",
  "Palladium South African Krugerrand",
  "Silver Austrian Philharmonic",
  "Gold Austrian Philharmonic",
  "Platinum Austrian Philharmonic",
  "Palladium Austrian Philharmonic",
  "Silver British Britannia",
  "Gold British Britannia",
  "Platinum British Britannia",
  "Palladium British Britannia",
  "Silver Chinese Panda",
  "Gold Chinese Panda",
  "Platinum Chinese Panda",
  "Palladium Chinese Panda",
  "Silver Mexican Libertad",
  "Gold Mexican Libertad",
  "Platinum Mexican Libertad",
  "Palladium Mexican Libertad",
  "Silver Australian Kangaroo",
  "Gold Australian Kangaroo",
  "Platinum Australian Kangaroo",
  "Palladium Australian Kangaroo",
  "Silver Australian Koala",
  "Gold Australian Koala",
  "Platinum Australian Koala",
  "Palladium Australian Koala",
  "Silver Australian Kookaburra",
  "Gold Australian Kookaburra",
  "Platinum Australian Kookaburra",
  "Palladium Australian Kookaburra",
  "Silver Australian Lunar",
  "Gold Australian Lunar",
  "Platinum Australian Lunar",
  "Palladium Australian Lunar",
  "Silver Somali Elephant",
  "Gold Somali Elephant",
  "Platinum Somali Elephant",
  "Palladium Somali Elephant",
  "Silver Armenian Noah's Ark",
  "Gold Armenian Noah's Ark",
  "Platinum Armenian Noah's Ark",
  "Palladium Armenian Noah's Ark",
  "Silver Russian Ballerina",
  "Gold Russian Ballerina",
  "Platinum Russian Ballerina",
  "Palladium Russian Ballerina",
  "Silver French Rooster",
  "Gold French Rooster",
  "Platinum French Rooster",
  "Palladium French Rooster",
  "Silver Swiss Vreneli",
  "Gold Swiss Vreneli",
  "Platinum Swiss Vreneli",
  "Palladium Swiss Vreneli",
  "Silver Indian Mohur",
  "Gold Indian Mohur",
  "Platinum Indian Mohur",
  "Palladium Indian Mohur",
  "Silver Austrian Ducat",
  "Gold Austrian Ducat",
  "Platinum Austrian Ducat",
  "Palladium Austrian Ducat",
  "Silver British Sovereign",
  "Gold British Sovereign",
  "Platinum British Sovereign",
  "Palladium British Sovereign",
  "Silver Saint-Gaudens",
  "Gold Saint-Gaudens",
  "Platinum Saint-Gaudens",
  "Palladium Saint-Gaudens",
  "Silver Walking Liberty Half Dollar",
  "Gold Walking Liberty Half Dollar",
  "Platinum Walking Liberty Half Dollar",
  "Palladium Walking Liberty Half Dollar",
  "Silver Morgan Dollar",
  "Gold Morgan Dollar",
  "Platinum Morgan Dollar",
  "Palladium Morgan Dollar",
  "Silver Peace Dollar",
  "Gold Peace Dollar",
  "Platinum Peace Dollar",
  "Palladium Peace Dollar",
  "Silver Engelhard Bar",
  "Gold Engelhard Bar",
  "Platinum Engelhard Bar",
  "Palladium Engelhard Bar",
  "Silver Johnson Matthey Bar",
  "Gold Johnson Matthey Bar",
  "Platinum Johnson Matthey Bar",
  "Palladium Johnson Matthey Bar",
];

/** Additional autocomplete seeds derived from sample data */
const NEW_AUTOCOMPLETE_ITEMS = [
  "2024 1/20 oz Perth Mint Lunar Dragon",
  "2022 1oz Tuvalu Black Flag The Rising Sun",
  "2017 American Palladium Eagle 1 oz",
  "2024 American Gold Eagle 1 oz",
  "2024 American Platinum Eagle 1 oz",
  "2024 American Silver Eagle",
  "2023 Australia Kangaroo 1 oz",
  "2023 Australia Kookaburra",
  "2021 Australia Platypus",
  "2022 Fiji Coca-Cola Bottle Cap",
  "2024 2 oz Niue Star Wars Mandalorian",
  "2021 10 oz Royal Canadian Mint Bar",
  "2024 Canada Maple Leaf",
  "2023 Canada Maple Leaf 1 oz",
  "2024 Canadian Maple Leaf 1 oz",
  "2024 Canada Maple Leaf 1/10 oz",
  "2021 Niue Sonic the Hedgehog",
  "2024 Germania Round",
  "1 Gram PAMP Suisse Bar",
  "1 oz PAMP Suisse Bar",
  "2022 PAMP Suisse Bar 1 oz",
  "2023 1/10 oz Valcambi Bar",
  "2023 1/2 oz Baird & Co. Bar",
  "2023 Lunar Dragon Bar",
  "2022 South Africa Krugerrand 1/4 oz",
  "2023 Silver Buffalo Round",
  "2022 UK Britannia",
];

// Merge base list with new items, remove duplicates and sort for readability
const DEFAULT_AUTOCOMPLETE_NAMES = [
  ...new Set([...BASE_AUTOCOMPLETE_NAMES, ...NEW_AUTOCOMPLETE_ITEMS]),
].sort();

const AUTOCOMPLETE_KEY = "autocompleteNames";

const loadNames = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTOCOMPLETE_KEY));
    if (Array.isArray(stored) && stored.length) {
      const merged = new Set([...DEFAULT_AUTOCOMPLETE_NAMES, ...stored]);
      localStorage.setItem(AUTOCOMPLETE_KEY, JSON.stringify([...merged]));
      return merged;
    }
  } catch (err) {
    console.warn("Failed to parse stored autocomplete names", err);
  }
  localStorage.setItem(AUTOCOMPLETE_KEY, JSON.stringify(DEFAULT_AUTOCOMPLETE_NAMES));
  return new Set(DEFAULT_AUTOCOMPLETE_NAMES);
};

const namesSet = loadNames();

const saveNames = () => {
  try {
    localStorage.setItem(AUTOCOMPLETE_KEY, JSON.stringify([...namesSet]));
  } catch (err) {
    console.warn("Failed to save autocomplete names", err);
  }
};

/**
 * Registers a new name into the autocomplete store
 * @param {string} name - Name to register
 */
const registerName = (name) => {
  if (typeof name !== "string") return;
  const cleaned = name.trim();
  if (!cleaned) return;
  if (!namesSet.has(cleaned)) {
    namesSet.add(cleaned);
    saveNames();
  }
};

/**
 * Retrieves autocomplete suggestions for a query
 * @param {string} query - Search text
 * @param {Object} [options]
 * @param {number} [options.max=5] - Maximum suggestions
 * @returns {string[]} Array of suggestion strings
 */
const getSuggestions = (query, { max = 5 } = {}) => {
  if (typeof query !== "string" || !query.trim()) return [];
  const names = [...namesSet];
  if (
    typeof window !== "undefined" &&
    window.fuzzySearch &&
    typeof window.fuzzySearch.fuzzySearch === "function"
  ) {
    return window.fuzzySearch.fuzzySearch(query, names, { maxResults: max }).map(
      (r) => r.text
    );
  }
  const q = query.toLowerCase();
  return names
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, max);
};

const attachAutocomplete = (input) => {
  if (!input) return;
  const parent = input.parentNode;
  if (parent) {
    const computed = window.getComputedStyle(parent);
    if (computed.position === "static") parent.style.position = "relative";
  }
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown";
  dropdown.style.display = "none";
  input.after(dropdown);

  let activeIndex = -1;
  const hide = () => {
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
    activeIndex = -1;
  };

  const show = (items) => {
    dropdown.innerHTML = "";
    items.forEach((text) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = text;
      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        hide();
      });
      dropdown.appendChild(div);
    });
    dropdown.style.display = items.length ? "block" : "none";
  };

  const updateActive = (items) => {
    items.forEach((item, idx) => {
      item.classList.toggle("active", idx === activeIndex);
    });
  };

  input.addEventListener("input", () => {
    const suggestions = getSuggestions(input.value, { max: 8 });
    show(suggestions);
  });

  input.addEventListener("keydown", (e) => {
    const items = Array.from(dropdown.children);
    if (e.key === "ArrowDown" && items.length) {
      activeIndex = (activeIndex + 1) % items.length;
      updateActive(items);
      e.preventDefault();
    } else if (e.key === "ArrowUp" && items.length) {
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActive(items);
      e.preventDefault();
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) {
        input.value = item.textContent;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        hide();
      }
    } else if (e.key === "Escape") {
      hide();
    }
  });

  input.addEventListener("blur", () => setTimeout(hide, 100));
};

const setupAutocomplete = () => {
  attachAutocomplete(document.getElementById("itemName"));
  attachAutocomplete(document.getElementById("searchInput"));
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupAutocomplete);
  } else {
    setupAutocomplete();
  }
}

if (typeof window !== "undefined") {
  window.registerName = registerName;
  window.getSuggestions = getSuggestions;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_AUTOCOMPLETE_NAMES, registerName, getSuggestions };
}
