const state = {
  sourceLoaded: false,
  navButtons: [],
  panels: [],
};

const loadSourceSettings = async () => {
  if (state.sourceLoaded) {
    return;
  }

  const response = await fetch('../../index.html');
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const navSource = doc.querySelector('#settingsModal .settings-sidebar');
  const panelSource = doc.querySelector('#settingsModal .settings-content-area');

  if (!navSource || !panelSource) {
    throw new Error('Could not load settings modal source from index.html');
  }

  state.navButtons = [...navSource.querySelectorAll('.settings-nav-item')].map((el) => ({
    label: el.textContent.trim(),
    section: el.dataset.section,
  }));

  state.panels = [...panelSource.querySelectorAll('.settings-section-panel')].map((panel) => ({
    id: panel.id,
    section: panel.id.replace('settingsPanel_', ''),
    html: panel.innerHTML,
  }));

  state.sourceLoaded = true;
};

const renderDesignA = () => {
  const root = document.getElementById('designABody');
  root.innerHTML = '';

  const nav = document.createElement('nav');
  nav.className = 'settings-nav-grid';

  const content = document.createElement('section');
  content.className = 'settings-content-cards';

  state.navButtons.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = `settings-nav-item${index === 0 ? ' active' : ''}`;
    btn.textContent = item.label;
    btn.type = 'button';
    btn.dataset.section = item.section;
    nav.appendChild(btn);
  });

  state.panels.forEach((panel, index) => {
    const section = document.createElement('section');
    section.className = 'settings-section-panel';
    section.dataset.section = panel.section;
    section.style.display = index === 0 ? 'block' : 'none';
    section.innerHTML = panel.html;
    content.appendChild(section);
  });

  nav.addEventListener('click', (event) => {
    const btn = event.target.closest('.settings-nav-item');
    if (!btn) {
      return;
    }
    const target = btn.dataset.section;
    [...nav.querySelectorAll('.settings-nav-item')].forEach((el) => {
      el.classList.toggle('active', el.dataset.section === target);
    });
    [...content.querySelectorAll('.settings-section-panel')].forEach((el) => {
      el.style.display = el.dataset.section === target ? 'block' : 'none';
    });
  });

  root.append(nav, content);
};

const renderDesignB = () => {
  const root = document.getElementById('designBBody');
  root.innerHTML = '';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'journey-search';
  searchWrap.innerHTML = '<input id="journeySearchInput" type="search" placeholder="Search settings sections..." />';

  const accordion = document.createElement('div');
  accordion.className = 'journey-accordion';

  state.panels.forEach((panel, index) => {
    const details = document.createElement('details');
    details.className = 'section';
    details.open = index < 2;
    details.dataset.section = panel.section;

    const summary = document.createElement('summary');
    const label = state.navButtons.find((item) => item.section === panel.section)?.label || panel.section;
    summary.textContent = label;

    const panelWrap = document.createElement('div');
    panelWrap.className = 'section-panel-wrap';
    panelWrap.innerHTML = panel.html;

    details.append(summary, panelWrap);
    accordion.appendChild(details);
  });

  root.append(searchWrap, accordion);

  const input = root.querySelector('#journeySearchInput');
  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    [...accordion.querySelectorAll('details.section')].forEach((section) => {
      const visible = section.textContent.toLowerCase().includes(term);
      section.style.display = visible ? 'block' : 'none';
      if (term && visible) {
        section.open = true;
      }
    });
  });
};

const setTheme = (theme) => {
  const html = document.documentElement;
  const body = document.body;
  body.classList.remove('dark-mode');
  html.removeAttribute('data-theme');

  if (theme === 'dark') {
    body.classList.add('dark-mode');
  } else if (theme === 'sepia') {
    html.setAttribute('data-theme', 'sepia');
  }

  [...document.querySelectorAll('[data-theme-choice]')].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeChoice === theme);
  });
};

const openOverlay = (id) => {
  document.getElementById(id).classList.add('open');
};

const closeOverlay = (id) => {
  document.getElementById(id).classList.remove('open');
};

const init = async () => {
  await loadSourceSettings();
  renderDesignA();
  renderDesignB();
  setTheme('light');

  document.getElementById('openDesignA').addEventListener('click', () => openOverlay('overlayA'));
  document.getElementById('openDesignB').addEventListener('click', () => openOverlay('overlayB'));

  document.body.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('[data-close]');
    if (closeBtn) {
      closeOverlay(closeBtn.dataset.close);
      return;
    }

    const overlay = event.target.closest('.overlay.open');
    if (overlay && event.target === overlay) {
      closeOverlay(overlay.id);
    }

    const themeBtn = event.target.closest('[data-theme-choice]');
    if (themeBtn) {
      setTheme(themeBtn.dataset.themeChoice);
    }
  });
};

init().catch((error) => {
  console.error(error);
  alert('Failed to load mockup source data. Open this file from a local web server for best compatibility.');
});
