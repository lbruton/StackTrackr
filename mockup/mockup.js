const sections = [
  'Appearance',
  'Layout',
  'Images',
  'System',
  'Inventory',
  'Chips',
  'Search',
  'API',
  'Files',
];

const sectionList = document.getElementById('sectionList');
sections.forEach((section) => {
  const li = document.createElement('li');
  li.textContent = section;
  sectionList.appendChild(li);
});

const openModal = (id) => {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
};

const closeModal = (id) => {
  const modal = document.getElementById(id);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
};

document.getElementById('openTablerInspired').addEventListener('click', () => openModal('modalTabler'));
document.getElementById('openSegmented').addEventListener('click', () => openModal('modalSegmented'));

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.getElementById('themePicker').addEventListener('change', (event) => {
  document.body.setAttribute('data-theme', event.target.value);
});

const buildTablerNav = () => {
  const nav = document.getElementById('tablerNav');
  const content = document.getElementById('tablerContent');
  const title = document.getElementById('tablerTitle');

  const renderCards = (section) => {
    title.textContent = section;
    content.innerHTML = '';
    ['Primary controls', 'Advanced options', 'Visibility + shortcuts', 'Validation + reset'].forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'setting-card';
      cardEl.innerHTML = `<h3>${card}</h3><p>Mount existing ${section} controls here with current IDs/events.</p>`;
      content.appendChild(cardEl);
    });
  };

  sections.forEach((section, index) => {
    const btn = document.createElement('button');
    btn.className = `nav-btn ${index === 0 ? 'active' : ''}`;
    btn.textContent = section;
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.nav-btn').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      renderCards(section);
    });
    nav.appendChild(btn);
  });

  renderCards(sections[0]);
};

const buildSegmentedTabs = () => {
  const tabs = document.getElementById('segmentedTabs');
  const stepperTitle = document.getElementById('stepperTitle');
  const content = document.getElementById('segmentedContent');

  const renderPanels = (section) => {
    stepperTitle.textContent = section;
    content.innerHTML = '';
    ['Frequently used', 'Data + storage', 'Automation', 'Provider/Integration options'].forEach((group) => {
      const panel = document.createElement('section');
      panel.className = 'panel-row';
      panel.innerHTML = `<h3>${section} • ${group}</h3><p>Accordion or card stack pattern optimized for touch workflows.</p>`;
      content.appendChild(panel);
    });
  };

  sections.forEach((section, index) => {
    const tab = document.createElement('button');
    tab.className = `segmented-tab ${index === 0 ? 'active' : ''}`;
    tab.textContent = section;
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.segmented-tab').forEach((el) => el.classList.remove('active'));
      tab.classList.add('active');
      renderPanels(section);
    });
    tabs.appendChild(tab);
  });

  renderPanels(sections[0]);
};

buildTablerNav();
buildSegmentedTabs();
