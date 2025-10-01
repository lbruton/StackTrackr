/**
 * NUMISTA MODAL FUNCTIONALITY
 * 
 * Handles the embedded iframe modal for viewing Numista coin database pages.
 * Features navigation controls (back/forward) and responsive modal display.
 */

let numistaHistory = [];
let numistaCurrentIndex = -1;

/**
 * Opens the Numista modal with the specified coin ID and coin name.
 * Handles file:// protocol by opening a popup, otherwise uses iframe modal.
 * Updates navigation history and traps focus for accessibility.
 *
 * @param {string} numistaId - The Numista catalog ID
 * @param {string} coinName - The name of the coin for the title
 */
function openNumistaModal(numistaId, coinName) {
  const url = `https://en.numista.com/catalogue/pieces${numistaId}.html`;
  
  // Check if we're running on file:// protocol
  if (window.location.protocol === 'file:') {
    // For file:// protocol, open in a popup window without controls
    console.log('File:// protocol detected, opening in popup window');
    const popup = window.open(
      url,
      `numista_${numistaId}`,
      'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no'
    );
    
    if (!popup) {
      // Popup blocked - show an alert
      alert(`Popup blocked! Please allow popups or manually visit:\n${url}`);
    } else {
      popup.focus();
    }
    return;
  }
  
  // For HTTP/HTTPS protocols, use the iframe modal
  const modal = document.getElementById('numistaModal');
  const iframe = document.getElementById('numistaIframe');
  const title = document.getElementById('numistaModalTitle');
  
  if (!modal || !iframe || !title) {
    console.error('Numista modal elements not found');
    return;
  }
  
  console.log('HTTP protocol detected, loading in iframe modal:', url);
  
  // Add to history if it's a new URL
  if (numistaHistory[numistaCurrentIndex] !== url) {
    // Remove any forward history if we're navigating to a new page
    numistaHistory = numistaHistory.slice(0, numistaCurrentIndex + 1);
    numistaHistory.push(url);
    numistaCurrentIndex = numistaHistory.length - 1;
  }
  
  // Set iframe source and title
  iframe.src = url;
  title.textContent = `${coinName} (N#${numistaId})`;
  
  // Show modal first, then load iframe
  modal.style.display = 'flex';
  
  // Add load event listener to debug iframe loading
  iframe.onload = function() {
    console.log('Iframe loaded successfully');
  };
  
  iframe.onerror = function() {
    console.error('Iframe failed to load');
    // Fallback: open in new tab if iframe fails
    iframe.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-primary);">
        <h3>Unable to load in iframe</h3>
        <p>Some sites prevent embedding. Click below to view in a new tab:</p>
        <a href="${url}" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: underline;">
          Open ${coinName} (N#${numistaId}) in Numista
        </a>
      </div>
    `;
  };
  
  // Update navigation buttons
  updateNavButtons();
  
  // Trap focus in modal
  trapFocus(modal);
}

/**
 * Closes the Numista modal and resets the iframe source/content.
 */
function closeNumistaModal() {
  const modal = document.getElementById('numistaModal');
  const iframe = document.getElementById('numistaIframe');
  
  if (modal) {
    modal.style.display = 'none';
  }
  
  if (iframe) {
    // Clear iframe src and any fallback content
    iframe.src = 'about:blank';
    iframe.innerHTML = '';
    iframe.onload = null;
    iframe.onerror = null;
  }
}

/**
 * Navigates back in Numista modal history (iframe mode only).
 */
function numistaGoBack() {
  // Only works for iframe mode (HTTP/HTTPS)
  if (window.location.protocol === 'file:') {
    console.log('Navigation not supported in file:// mode');
    return;
  }
  
  if (numistaCurrentIndex > 0) {
    numistaCurrentIndex--;
    const iframe = document.getElementById('numistaIframe');
    if (iframe) {
      iframe.src = numistaHistory[numistaCurrentIndex];
    }
    updateNavButtons();
  }
}

/**
 * Navigates forward in Numista modal history (iframe mode only).
 */
function numistaGoForward() {
  // Only works for iframe mode (HTTP/HTTPS)
  if (window.location.protocol === 'file:') {
    console.log('Navigation not supported in file:// mode');
    return;
  }
  
  if (numistaCurrentIndex < numistaHistory.length - 1) {
    numistaCurrentIndex++;
    const iframe = document.getElementById('numistaIframe');
    if (iframe) {
      iframe.src = numistaHistory[numistaCurrentIndex];
    }
    updateNavButtons();
  }
}

/**
 * Updates the state and visibility of navigation buttons in the Numista modal.
 */
function updateNavButtons() {
  const backBtn = document.getElementById('numistaBackBtn');
  const forwardBtn = document.getElementById('numistaForwardBtn');
  
  // Hide navigation buttons in file:// mode since popup windows don't support history
  if (window.location.protocol === 'file:') {
    if (backBtn) backBtn.style.display = 'none';
    if (forwardBtn) forwardBtn.style.display = 'none';
    return;
  }
  
  // Show and update buttons for HTTP/HTTPS mode
  if (backBtn) {
    backBtn.style.display = 'flex';
    backBtn.disabled = numistaCurrentIndex <= 0;
  }
  
  if (forwardBtn) {
    forwardBtn.style.display = 'flex';
    forwardBtn.disabled = numistaCurrentIndex >= numistaHistory.length - 1;
  }
}

/**
 * Traps focus within the given modal element for accessibility.
 *
 * @param {HTMLElement} element - The modal element to trap focus in
 */
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  firstElement.focus();
  
  element.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
    
    if (e.key === 'Escape') {
      closeNumistaModal();
    }
  });
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize navigation buttons based on protocol
  updateNavButtons();
  
  // Close button
  const closeBtn = document.getElementById('numistaCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeNumistaModal);
  }
  
  // Navigation buttons (only active for HTTP/HTTPS)
  const backBtn = document.getElementById('numistaBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', numistaGoBack);
  }
  
  const forwardBtn = document.getElementById('numistaForwardBtn');
  if (forwardBtn) {
    forwardBtn.addEventListener('click', numistaGoForward);
  }
  
  // Click outside to close (only relevant for iframe mode)
  const modal = document.getElementById('numistaModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal && window.location.protocol !== 'file:') {
        closeNumistaModal();
      }
    });
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('numistaModal');
    if (modal && modal.style.display === 'flex') {
      if (e.key === 'Escape') {
        closeNumistaModal();
      } else if (window.location.protocol !== 'file:') {
        // Only enable keyboard nav for HTTP/HTTPS
        if (e.key === 'ArrowLeft' && e.altKey) {
          e.preventDefault();
          numistaGoBack();
        } else if (e.key === 'ArrowRight' && e.altKey) {
          e.preventDefault();
          numistaGoForward();
        }
      }
    }
  });
});
