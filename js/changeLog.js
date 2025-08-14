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
    'spotPriceAtPurchase',
    'totalPremium',
    'purchaseLocation',
    'storageLocation',
    'isCollectable',
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
  const tableBody = document.querySelector('#changeLogTable tbody');
  if (!tableBody) return;

  const rows = [...changeLog]
    .slice()
    .reverse()
    .map((entry, i) => {
      const globalIndex = changeLog.length - 1 - i;
      const actionLabel = entry.undone ? 'Redo' : 'Undo';
      return `
      <tr onclick="editFromChangeLog(${entry.idx}, ${globalIndex})">
        <td title="${new Date(entry.timestamp).toLocaleString()}">${new Date(entry.timestamp).toLocaleString()}</td>
        <td title="${sanitizeHtml(entry.itemName)}">${sanitizeHtml(entry.itemName)}</td>
        <td title="${sanitizeHtml(entry.field)}">${sanitizeHtml(entry.field)}</td>
        <td title="${sanitizeHtml(String(entry.oldValue))}">${sanitizeHtml(String(entry.oldValue))}</td>
        <td title="${sanitizeHtml(String(entry.newValue))}">${sanitizeHtml(String(entry.newValue))}</td>
        <td class="action-cell"><button class="btn action-btn" style="margin:1px;" onclick="event.stopPropagation(); toggleChange(${globalIndex})">${actionLabel}</button></td>
      </tr>`;
    });

  tableBody.innerHTML = rows.join('');
};

/**
 * Toggles a logged change between undone and redone states
 * @param {number} logIdx - Index of change entry in changeLog array
 */
const toggleChange = (logIdx) => {
  const entry = changeLog[logIdx];
  if (!entry) return;
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
