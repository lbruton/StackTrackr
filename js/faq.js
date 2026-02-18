// FAQ MODAL
// =============================================================================
// showFaqModal — redirects to Settings > FAQ tab.
// All FAQ content lives in #settingsPanel_faq; the standalone #faqModal has
// been removed. Preserving the window.showFaqModal export keeps all existing
// call sites in index.html and init.js working without modification.

const showFaqModal = () => {
  if (typeof showSettingsModal === 'function') {
    showSettingsModal('faq');
  }
};

if (typeof window !== 'undefined') {
  window.showFaqModal = showFaqModal;
}
