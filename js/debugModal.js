const showDebugModal = () => {
  const modal = document.getElementById('debugModal');
  const content = document.getElementById('debugModalContent');
  if (content && typeof window.getDebugHistory === 'function') {
    content.textContent = window.getDebugHistory().join('\n');
  }
  if (window.openModalById) openModalById('debugModal');
  else if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

const hideDebugModal = () => {
  if (window.closeModalById) closeModalById('debugModal');
  else {
    const modal = document.getElementById('debugModal');
    if (modal) modal.style.display = 'none';
    try { document.body.style.overflow = ''; } catch (e) {}
  }
};

window.showDebugModal = showDebugModal;
window.hideDebugModal = hideDebugModal;
