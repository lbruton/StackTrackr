// FAQ MODAL
// =============================================================================
// showFaqModal / hideFaqModal / setupFaqModalEvents
// All FAQ content is static HTML in index.html — this module only handles
// open/close/keyboard behavior.

const showFaqModal = () => {
  if (window.openModalById) {
    openModalById('faqModal');
  } else {
    const m = document.getElementById('faqModal');
    if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  }
};

const hideFaqModal = () => {
  if (window.closeModalById) {
    closeModalById('faqModal');
  } else {
    const m = document.getElementById('faqModal');
    if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
  }
};

const setupFaqModalEvents = () => {
  const faqCloseBtn = document.getElementById('faqCloseBtn');
  const faqModal = document.getElementById('faqModal');
  if (faqCloseBtn) faqCloseBtn.addEventListener('click', hideFaqModal);
  if (faqModal) {
    faqModal.addEventListener('click', (e) => { if (e.target === faqModal) hideFaqModal(); });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && faqModal && faqModal.style.display === 'flex') hideFaqModal();
  });
};

if (typeof window !== 'undefined') {
  window.showFaqModal = showFaqModal;
  window.hideFaqModal = hideFaqModal;
  window.setupFaqModalEvents = setupFaqModalEvents;
}
