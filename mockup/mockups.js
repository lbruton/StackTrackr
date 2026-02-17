const SETTINGS_SECTIONS = [
  {
    key: 'site',
    title: 'Site',
    items: [
      ['Theme mode', 'Light / Dark / Sepia / System'],
      ['Header quick actions', 'Theme, currency, card view'],
      ['Version info', 'App/build metadata and links'],
    ],
  },
  {
    key: 'layout',
    title: 'Layout',
    items: [
      ['Visible sections', 'Toggle/reorder app sections'],
      ['Item detail modal order', 'Reorder and hide detail blocks'],
      ['Card/table defaults', 'Open mode and desktop behavior'],
    ],
  },
  {
    key: 'images',
    title: 'Images',
    items: [
      ['Image quality controls', 'Resize/encode and upload limits'],
      ['Cache manager', 'IndexedDB image cache actions'],
      ['Bulk prefetch', 'Download/store remote image assets'],
    ],
  },
  {
    key: 'system',
    title: 'System',
    items: [
      ['Timezone', 'Display and calculation timezone'],
      ['Storage diagnostics', 'Compression + quota usage'],
      ['Debug info', 'Telemetry and diagnostics toggles'],
    ],
  },
  {
    key: 'table',
    title: 'Table',
    items: [
      ['Items per page', 'Pagination size and defaults'],
      ['Column visibility', 'Show/hide and reorder table columns'],
      ['Sort behavior', 'Computed totals and default sort'],
    ],
  },
  {
    key: 'grouping',
    title: 'Grouping',
    items: [
      ['Chip grouping', 'Name, metal, and custom groups'],
      ['Group threshold', 'Minimum chip count to group'],
      ['Chip order', 'Sort mode and quantity badges'],
    ],
  },
  {
    key: 'search',
    title: 'Search',
    items: [
      ['Fuzzy search', 'Scoring and match strategy'],
      ['Autocomplete', 'Live suggestions controls'],
      ['Numista lookup', 'Rule-engine assisted search'],
    ],
  },
  {
    key: 'api',
    title: 'API',
    items: [
      ['Provider chain', 'Primary/fallback API sequence'],
      ['Keys and quotas', 'Credential and rate limit controls'],
      ['Sync mode', 'Manual vs automatic spot updates'],
    ],
  },
  {
    key: 'files',
    title: 'Files',
    items: [
      ['CSV mapping', 'Import mapping templates'],
      ['Backup/restore', 'ZIP and encrypted vault workflow'],
      ['Export settings', 'PDF/CSV/ZIP options'],
    ],
  },
  {
    key: 'cloud',
    title: 'Cloud',
    items: [
      ['Remote status', 'Connection and provider state'],
      ['Sync triggers', 'Push/pull and conflict handling'],
      ['Encryption mode', 'Client-side safeguards'],
    ],
  },
  {
    key: 'currency',
    title: 'Currency',
    items: [
      ['Display currency', 'USD base + exchange display'],
      ['Rate source', 'Fallback/manual conversion control'],
      ['Formatting', 'Symbol and decimal display options'],
    ],
  },
  {
    key: 'goldback',
    title: 'Goldback',
    items: [
      ['Goldback mode', 'Enable denomination pricing'],
      ['Estimation mode', '2x spot fallback formula'],
      ['Display behavior', 'Goldback-only input and columns'],
    ],
  },
  {
    key: 'changelog',
    title: 'Changelog',
    items: [
      ['History tabs', 'All / item / sync logs'],
      ['Retention', 'Cleanup horizon and cap'],
      ['Export logs', 'Share and archive changes'],
    ],
  },
];

const createCard = (section) => {
  const rows = section.items
    .map(([title, detail]) => `
      <div class="setting-row">
        <div>
          <div class="label-title">${title}</div>
          <div class="label-help">${detail}</div>
        </div>
        <span class="pill">Control</span>
      </div>
    `)
    .join('');
  return `<article class="setting-card" data-section="${section.key}"><h3>${section.title}</h3><div class="setting-list">${rows}</div></article>`;
};

const buildModal = (navId, contentId) => {
  const nav = document.getElementById(navId);
  const content = document.getElementById(contentId);
  nav.innerHTML = SETTINGS_SECTIONS
    .map((section, index) =>
      `<button data-target="${section.key}" class="${index === 0 ? 'active' : ''}">${section.title}</button>`)
    .join('');
  content.innerHTML = SETTINGS_SECTIONS.map((section) => createCard(section)).join('');

  nav.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-target]');
    if (!button) {
      return;
    }
    nav.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const target = content.querySelector(`[data-section="${button.dataset.target}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
};

buildModal('navA', 'contentA');
buildModal('navB', 'contentB');

document.querySelectorAll('[data-open-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    const modal = button.dataset.openModal === 'tabler' ? document.getElementById('modalTabler') : document.getElementById('modalAdaptive');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  });
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    const modal = button.closest('.mockup-modal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  });
});

document.getElementById('themeSelect').addEventListener('change', (event) => {
  document.body.dataset.theme = event.target.value;
});

document.getElementById('searchB').addEventListener('input', (event) => {
  const term = event.target.value.trim().toLowerCase();
  document.querySelectorAll('#contentB .setting-card').forEach((card) => {
    const visible = card.textContent.toLowerCase().includes(term);
    card.style.display = visible ? 'block' : 'none';
  });
});
