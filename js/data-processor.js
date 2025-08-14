// /js/data-processor.js
// This file will contain the DataProcessor class for handling data mapping, sanitization, and validation.

class DataProcessor {
  constructor() {
    this.fieldMappings = {
      metal: ['Metal', 'metal', 'Composition', 'composition', 'Alloy', 'alloy'],
      name: ['Name', 'name', 'Title', 'title', 'Item', 'item'],
      qty: ['Qty', 'qty', 'Quantity', 'quantity', 'Amount', 'amount'],
      type: ['Type', 'type', 'Category', 'category', 'Kind', 'kind'],
      weight: ['Weight(oz)', 'Weight(ozt)', 'Weight(g)', 'Weight', 'weight', 'weight_g', 'weight_ozt', 'Grams', 'grams', 'Ounces', 'ounces'],
      price: ['Purchase Price', 'purchasePrice', 'price', 'Cost', 'cost', 'Amount Paid', 'amountPaid'],
      purchaseLocation: ['Purchase Location', 'purchaseLocation', 'Vendor', 'vendor', 'Source', 'source'],
      storageLocation: ['Storage Location', 'storageLocation', 'Location', 'location'],
      notes: ['Notes', 'notes', 'Comment', 'comment', 'Description', 'description'],
      date: ['Date', 'date', 'Acquired', 'acquired', 'Purchase Date', 'purchaseDate'],
      collectable: ['Collectable', 'collectable', 'isCollectable', 'Collectible', 'collectible'],
      numistaId: ['N#', 'Numista #', 'numistaId'],
      serial: ['Serial', 'serial'],
      spotPriceAtPurchase: ['Spot Price ($/oz)', 'Spot Price (ozt)', 'Spot Price (g)', 'spotPriceAtPurchase'],
    };
  }

  process(row) {
    // Debug logging for character encoding and data analysis
    const name = this.getValue(row, this.fieldMappings.name);
    console.log(`Standard CSV Row Data:`, {
      raw_name: name,
      name_length: name ? name.length : 0,
      name_chars: name ? Array.from(name).slice(0, 10).map(c => ({ 
        char: c, 
        code: c.charCodeAt(0),
        hex: c.charCodeAt(0).toString(16)
      })) : [],
      raw_row: row
    });

    const item = {};
    for (const field in this.fieldMappings) {
      item[field] = this.getValue(row, this.fieldMappings[field]);
    }
    return this.sanitizeAndValidate(item);
  }

  getValue(row, keys) {
    for (const key of keys) {
      if (row[key] !== undefined) {
        return row[key];
      }
    }
    return undefined;
  }

  sanitizeAndValidate(row) {
    const errors = [];
    const item = {};

    // Process and validate each field
    item.composition = getCompositionFirstWords(row.metal || 'Silver');
    item.metal = parseNumistaMetal(item.composition);
    item.name = row.name || '';
    item.qty = parseFloat(row.qty || 1);
    item.type = normalizeType(row.type || '');

    const dateRaw = row.date || '';
    item.date = parseDate(dateRaw);
    if (!item.date || item.date === '—') {
      item.date = dateRaw || '—';
    }
    if (item.date && item.date !== '—' && formatDisplayDate(item.date) === '—') {
      item.date = '—';
    }

    let weightRaw = row.weight;
    let weightUnit = 'ozt';
    // Check if weight is in grams based on field name patterns
    if (typeof weightRaw === 'string' && weightRaw.includes('g')) weightUnit = 'g';
    
    // Handle weight fractions
    if (typeof weightRaw === 'string' && weightRaw.includes('/')) {
      const fractionParts = weightRaw.split('/');
      if (fractionParts.length === 2) {
        const numerator = parseFloat(fractionParts[0]);
        const denominator = parseFloat(fractionParts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          weightRaw = numerator / denominator;
        }
      }
    }
    item.weight = parseFloat(weightRaw) || 0;
    if (weightUnit === 'g') {
      item.weight = item.weight / 31.1034768;
    }

    const priceStr = row.price;
    if (typeof priceStr === 'string') {
      let cleanPrice = priceStr.replace(/[^\d.\-/]+/g, ''); // Allow fractions by keeping /
      if (cleanPrice.includes('/')) {
        const fractionParts = cleanPrice.split('/');
        if (fractionParts.length === 2) {
          const numerator = parseFloat(fractionParts[0]);
          const denominator = parseFloat(fractionParts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            cleanPrice = numerator / denominator;
          }
        }
      }
      item.price = parseFloat(cleanPrice);
    } else {
      item.price = parseFloat(priceStr);
    }
    if (isNaN(item.price) || item.price < 0) item.price = 0;

    item.purchaseLocation = row.purchaseLocation || '';
    item.storageLocation = row.storageLocation || '';
    item.notes = row.notes || '';

    item.isCollectable = (row.collectable || '').toString().toLowerCase() === 'yes' || 
                        (row.collectable || '').toString().toLowerCase() === 'true';

    let spotPriceAtPurchaseRaw = row.spotPriceAtPurchase;
    if (spotPriceAtPurchaseRaw) {
      item.spotPriceAtPurchase = parseFloat(spotPriceAtPurchaseRaw.toString().replace(/[^0-9.-]+/g, ''));
    } else {
      const metalKey = item.metal.toLowerCase();
      item.spotPriceAtPurchase = item.isCollectable ? 0 : spotPrices[metalKey] || 0;
    }

    item.premiumPerOz = 0;
    item.totalPremium = 0;
    if (!item.isCollectable && item.weight > 0 && item.spotPriceAtPurchase > 0) {
      const pricePerOz = item.price / item.weight;
      item.premiumPerOz = pricePerOz - item.spotPriceAtPurchase;
      item.totalPremium = item.premiumPerOz * item.qty * item.weight;
    }

    const numistaRaw = (row.numistaId || '').toString();
    const numistaMatch = numistaRaw.match(/\d+/);
    item.numistaId = numistaMatch ? numistaMatch[0] : '';
    item.serial = row.serial || getNextSerial();

    const sanitizedItem = sanitizeImportedItem(item);
    const validation = validateInventoryItem(sanitizedItem);

    return {
      isValid: validation.isValid,
      item: sanitizedItem,
      errors: validation.errors
    };
  }
}

window.dataProcessor = new DataProcessor();
