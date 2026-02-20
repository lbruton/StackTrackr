import sys

def modify_events():
    with open('js/events.js', 'r') as f:
        content = f.read()

    # Replacements for Numista search
    numista_search_start = """        const btn = elements.searchNumistaBtn;
        const originalHTML = btn.innerHTML;
        btn.textContent = 'Searching...';
        btn.disabled = true;"""

    numista_search_start_new = """        const btn = elements.searchNumistaBtn;
        if (typeof setButtonLoading === 'function') {
          setButtonLoading(btn, true, 'Searching...');
        } else {
          // Fallback if util not loaded
          btn.dataset.originalHtml = btn.innerHTML;
          btn.textContent = 'Searching...';
          btn.disabled = true;
        }"""

    if numista_search_start in content:
        content = content.replace(numista_search_start, numista_search_start_new)
    else:
        print("Warning: Could not find Numista search start block")

    # The finally block for Numista search is a bit generic, so we need to match carefully.
    # It looks like:
    #         } finally {
    #           btn.innerHTML = originalHTML;
    #           btn.disabled = false;
    #         }
    # But since 'originalHTML' variable is local, we should be careful.

    # Actually, I can replace the logic inside the block.
    # Let's target the exact string including the finally block context.

    # For Numista search:
    numista_finally = """        } finally {
          // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }"""

    numista_finally_new = """        } finally {
          if (typeof setButtonLoading === 'function') {
            setButtonLoading(btn, false);
          } else {
            btn.innerHTML = btn.dataset.originalHtml || originalHTML;
            btn.disabled = false;
          }
        }"""

    if numista_finally in content:
        content = content.replace(numista_finally, numista_finally_new)
    else:
        print("Warning: Could not find Numista search finally block")


    # Replacements for PCGS lookup
    pcgs_lookup_start = """        const btn = elements.lookupPcgsBtn;
        const originalHTML = btn.innerHTML;
        btn.textContent = 'Looking up...';
        btn.disabled = true;"""

    pcgs_lookup_start_new = """        const btn = elements.lookupPcgsBtn;
        if (typeof setButtonLoading === 'function') {
          setButtonLoading(btn, true, 'Looking up...');
        } else {
          btn.dataset.originalHtml = btn.innerHTML;
          btn.textContent = 'Looking up...';
          btn.disabled = true;
        }"""

    if pcgs_lookup_start in content:
        content = content.replace(pcgs_lookup_start, pcgs_lookup_start_new)
    else:
        print("Warning: Could not find PCGS lookup start block")

    pcgs_finally = """        } finally {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }"""

    pcgs_finally_new = """        } finally {
          if (typeof setButtonLoading === 'function') {
            setButtonLoading(btn, false);
          } else {
            btn.innerHTML = btn.dataset.originalHtml || originalHTML;
            btn.disabled = false;
          }
        }"""

    if pcgs_finally in content:
        content = content.replace(pcgs_finally, pcgs_finally_new)
    else:
        print("Warning: Could not find PCGS lookup finally block")

    with open('js/events.js', 'w') as f:
        f.write(content)
    print("Successfully modified js/events.js")

if __name__ == "__main__":
    modify_events()
