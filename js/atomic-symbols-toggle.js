/**
 * Functions to toggle between atomic symbols and text display for metals
 */

// Add settings option for atomic symbols
document.addEventListener('DOMContentLoaded', function() {
  const settingsMenu = document.querySelector('#settingsMenu ul');
  if (settingsMenu) {
    const useSymbols = localStorage.getItem('useAtomicSymbols') !== 'false';
    
    const toggleItem = document.createElement('li');
    toggleItem.innerHTML = `
      <label class="toggle-switch">
        <input type="checkbox" id="toggleAtomicSymbols" ${useSymbols ? 'checked' : ''}>
        <span class="toggle-slider"></span>
        Use Atomic Symbols for Metals
      </label>
    `;
    
    settingsMenu.appendChild(toggleItem);
    
    document.getElementById('toggleAtomicSymbols').addEventListener('change', function() {
      localStorage.setItem('useAtomicSymbols', this.checked ? 'true' : 'false');
      
      // Re-render the table to apply the change
      if (typeof renderTable === 'function') {
        renderTable();
      } else {
        // Force a refresh if renderTable isn't available
        window.location.reload();
      }
    });
  }
});
