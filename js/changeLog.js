/**
 * Change log tracking and rendering
 * Tracks all cell changes in the inventory table
 */

/**
 * Records a change to the change log and persists it
 * @param {string} itemName - Name of the inventory item
 * @param {string} field - Field that was changed
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {number} idx - Index of item in inventory array
*/
const logChange = (itemName, field, oldValue, newValue, idx) => {
  changeLog.push({
    timestamp: Date.now(),
    itemName,
    field,
    oldValue,
    newValue,
    idx,
    undone: false,
  });
  localStorage.setItem('changeLog', JSON.stringify(changeLog));
};

/**
 * Compares two item objects and logs any differences
 * @param {Object} oldItem - Original item values
 * @param {Object} newItem - Updated item values
 */
const logItemChanges = (oldItem, newItem) => {
  const fields = [
    'date',
    'type',
    'metal',
    'name',
    'qty',
    'weight',
    'price',
    'marketValue',
    'purchaseLocation',
    'notes',
  ];

  fields.forEach((field) => {
    if (oldItem[field] !== newItem[field]) {
      const idx = inventory.indexOf(newItem);
      logChange(newItem.name, field, oldItem[field], newItem[field], idx);
    }
  });
};

/**
 * Renders the change log table with all entries
 */
const renderChangeLog = () => {
  const rows = [...changeLog]
    .slice()
    .reverse()
    .map((entry, i) => {
      const globalIndex = changeLog.length - 1 - i;
      const actionLabel = entry.undone ? 'Redo' : 'Undo';

      // Friendly display for price history deletions (STAK-109)
      let displayField = sanitizeHtml(entry.field);
      let displayOld = sanitizeHtml(String(entry.oldValue));
      let displayNew = sanitizeHtml(String(entry.newValue));
      let rowClick = `onclick="editFromChangeLog(${entry.idx}, ${globalIndex})"`;
      if (entry.field === 'priceHistoryDelete') {
        displayField = 'Price Entry Deleted';
        try {
          const d = JSON.parse(entry.oldValue);
          const fmtFn = typeof formatCurrency === 'function' ? formatCurrency : (v) => '$' + Number(v).toFixed(2);
          displayOld = `Retail: ${sanitizeHtml(fmtFn(d.entry.retail))}`;
        } catch { displayOld = '(price entry)'; }
        displayNew = entry.undone ? 'Restored' : 'Deleted';
        rowClick = ''; // No item to navigate to
      }

      return `
      <tr ${rowClick}>
        <td title="${formatTimestamp(entry.timestamp)}">${formatTimestamp(entry.timestamp)}</td>
        <td title="${sanitizeHtml(entry.itemName)}">${sanitizeHtml(entry.itemName)}</td>
        <td title="${displayField}">${displayField}</td>
        <td title="${displayOld}">${displayOld}</td>
        <td title="${displayNew}">${displayNew}</td>
        <td class="action-cell"><button class="btn action-btn" style="margin:1px;" onclick="event.stopPropagation(); toggleChange(${globalIndex})">${actionLabel}</button></td>
      </tr>`;
    });

  const html = rows.join('');

  // Populate both the modal table and the settings panel table
  const modalBody = document.querySelector('#changeLogTable tbody');
  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
  if (modalBody) modalBody.innerHTML = html;
  const settingsBody = document.querySelector('#settingsChangeLogTable tbody');
  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
  if (settingsBody) settingsBody.innerHTML = html;
};

/**
 * Toggles a logged change between undone and redone states
 * @param {number} logIdx - Index of change entry in changeLog array
 */
const toggleChange = (logIdx) => {
  const entry = changeLog[logIdx];
  if (!entry) return;

  // Price history delete — undo restores the entry, redo re-deletes it (STAK-109)
  if (entry.field === 'priceHistoryDelete') {
    const deleted = JSON.parse(entry.oldValue);
    if (entry.undone) {
      // Redo: re-delete the entry
      if (itemPriceHistory[deleted.uuid]) {
        itemPriceHistory[deleted.uuid] = itemPriceHistory[deleted.uuid]
          .filter(e => e.ts !== deleted.entry.ts);
        if (itemPriceHistory[deleted.uuid].length === 0) {
          delete itemPriceHistory[deleted.uuid];
        }
      }
      entry.undone = false;
    } else {
      // Undo: restore the deleted entry
      if (!itemPriceHistory[deleted.uuid]) itemPriceHistory[deleted.uuid] = [];
      itemPriceHistory[deleted.uuid].push(deleted.entry);
      itemPriceHistory[deleted.uuid].sort((a, b) => a.ts - b.ts);
      entry.undone = true;
    }
    if (typeof saveItemPriceHistory === 'function') saveItemPriceHistory();
    if (typeof renderItemPriceHistoryTable === 'function') renderItemPriceHistoryTable();
    if (typeof renderItemPriceHistoryModalTable === 'function') renderItemPriceHistoryModalTable();
    renderChangeLog();
    localStorage.setItem('changeLog', JSON.stringify(changeLog));
    return;
  }

  if (entry.field === 'Deleted') {
    if (entry.undone) {
      const removed = inventory.splice(entry.idx, 1)[0];
      if (removed && removed.serial) {
        delete catalogMap[removed.serial];
      }
      entry.undone = false;
    } else {
      const restored = JSON.parse(entry.oldValue || '{}');
      inventory.splice(entry.idx, 0, restored);
      if (restored.serial) {
        catalogMap[restored.serial] = restored.numistaId || "";
      }
      entry.undone = true;
    }
  } else {
    const item = inventory[entry.idx];
    if (!item) return;
    if (entry.undone) {
      item[entry.field] = entry.newValue;
      entry.undone = false;
    } else {
      item[entry.field] = entry.oldValue;
      entry.undone = true;
    }
    if (item.serial) {
      catalogMap[item.serial] = item.numistaId || "";
    }
  }
  saveInventory();
  renderTable();
  renderChangeLog();
  localStorage.setItem('changeLog', JSON.stringify(changeLog));
};

/**
 * Clears all change log entries after confirmation
 */
const clearChangeLog = () => {
  if (!confirm('Clear change log?')) return;
  changeLog = [];
  localStorage.setItem('changeLog', JSON.stringify(changeLog));
  renderChangeLog();
};

window.logChange = logChange;
window.logItemChanges = logItemChanges;
window.renderChangeLog = renderChangeLog;
window.toggleChange = toggleChange;
window.clearChangeLog = clearChangeLog;
window.editFromChangeLog = (idx, logIdx) => {
  const modal = document.getElementById('changeLogModal');
  if (modal) {
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
  editItem(idx, logIdx);
};
