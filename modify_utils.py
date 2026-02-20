import sys

def modify_utils():
    with open('js/utils.js', 'r') as f:
        content = f.read()

    new_function = """
/**
 * Sets a button's loading state, preserving its width and original content.
 * @param {HTMLButtonElement} btn - The button element
 * @param {boolean} isLoading - Whether to set loading state
 * @param {string} [loadingText] - Optional text to show next to spinner
 */
const setButtonLoading = (btn, isLoading, loadingText = '') => {
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.originalHtml) {
      btn.dataset.originalHtml = btn.innerHTML;
      // Lock width to prevent layout jump
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0) btn.style.width = rect.width + 'px';
    }
    btn.disabled = true;
    // Spinner SVG (reusing existing spin animation)
    const spinner = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite; margin-right:0.4em; vertical-align: middle;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
    btn.innerHTML = spinner + (loadingText || 'Loading...');
  } else {
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
    btn.style.width = '';
    btn.disabled = false;
  }
};

"""

    # Insert function definition
    insert_marker = "if (typeof window !== 'undefined') {"
    if insert_marker in content:
        content = content.replace(insert_marker, new_function + insert_marker)
    else:
        print("Error: Could not find insert marker")
        return

    # Export to window
    window_marker = 'window.fetchExchangeRates = fetchExchangeRates;'
    if window_marker in content:
        content = content.replace(window_marker, window_marker + '\n  window.setButtonLoading = setButtonLoading;')
    else:
        print("Error: Could not find window export marker")

    # Export to module
    module_marker = '    generateUUID,'
    if module_marker in content:
        content = content.replace(module_marker, module_marker + '\n    setButtonLoading,')
    else:
        print("Error: Could not find module export marker")

    with open('js/utils.js', 'w') as f:
        f.write(content)
    print("Successfully modified js/utils.js")

if __name__ == "__main__":
    modify_utils()
