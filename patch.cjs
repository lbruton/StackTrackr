const fs = require('fs');
let code = fs.readFileSync('js/inventory.js', 'utf8');
code = code.replace(
  '<span class="bulk-img-popover-title">${item.name ? item.name.slice(0, 28) + (item.name.length > 28 ? \'…\' : \'\') : \'Photos\'}</span>',
  '<span class="bulk-img-popover-title">${item.name ? sanitizeHtml(item.name.slice(0, 28) + (item.name.length > 28 ? \'…\' : \'\')) : \'Photos\'}</span>'
);
fs.writeFileSync('js/inventory.js', code);
