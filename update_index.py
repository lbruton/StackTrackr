import re

with open('index.html', 'r') as f:
    content = f.read()

# Define the pattern to match the existing Box card
# It starts with <!-- Box --> and ends with the closing div of the card
# The card has class "cloud-provider-card cloud-provider-card--coming-soon"
# We need to be careful with nested divs.
# The structure is:
# <!-- Box -->
# <div ...>
#   <div class="cloud-provider-card-header">...</div>
# </div>

pattern = r'<!-- Box -->\s*<div class="cloud-provider-card cloud-provider-card--coming-soon"[^>]*>.*?</div>\s*</div>'
# The grep showed:
# 3060:                  <!-- Box -->
# 3061-                  <div class="cloud-provider-card cloud-provider-card--coming-soon" style="margin:0">
# ...
# 3070-                    </div>
# 3071-                  </div>

# Wait, regex dotall is needed.
# And careful with closing div. The grep shows indentation.
# The card content ends at line 3071?
# Let's check the grep output again.
# 3062: <div class="cloud-provider-card-header">
# 3070: </div> (closes header)
# 3071: </div> (closes card)

# So the block is relatively short.

replacement = """<!-- Box -->
                  <div class="cloud-provider-card" id="cloudCard_box" style="margin:0">
                    <div class="cloud-provider-card-header">
                      <span class="cloud-provider-card-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L2 7h20l-6-4z"/></svg>
                        Box
                      </span>
                      <span class="cloud-provider-card-badges">
                        <span class="cloud-connected-badge" style="display:none">Connected</span>
                        <span class="cloud-badge cloud-badge--beta">BETA</span>
                      </span>
                    </div>

                    <div class="cloud-connection-status" id="cloudStatus_box">
                      <div class="cloud-status-row">
                        <span class="cloud-status-label">Status</span>
                        <span class="cloud-status-value cloud-status-indicator" data-state="disconnected">
                          <span class="cloud-status-dot"></span>
                          <span class="cloud-status-text">Not connected</span>
                        </span>
                      </div>
                      <div class="cloud-status-row">
                        <span class="cloud-status-label">Last sync</span>
                        <span class="cloud-status-value cloud-status-sync">Never</span>
                      </div>
                      <div class="cloud-status-row">
                        <span class="cloud-status-label">Items backed up</span>
                        <span class="cloud-status-value cloud-status-items">&mdash;</span>
                      </div>
                    </div>

                    <div class="cloud-provider-card-actions">
                      <div class="cloud-login-area">
                        <div style="margin-bottom:0.5rem">
                          <input type="text" placeholder="Box Client ID" style="font-size:0.8rem;padding:0.3rem;width:100%;margin-bottom:0.3rem;border:1px solid var(--border-color, #ccc);border-radius:4px;background:var(--bg-input, #fff);color:var(--text-primary, #333)" onchange="localStorage.setItem('cloud_client_id_box', this.value.trim())" id="boxClientIdInput">
                          <script>try{document.getElementById('boxClientIdInput').value = localStorage.getItem('cloud_client_id_box') || '';}catch(e){}</script>
                        </div>
                        <button class="btn cloud-connect-btn" data-provider="box">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                          Login to Box
                        </button>
                      </div>
                      <button class="btn danger cloud-disconnect-btn" data-provider="box" style="display:none">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Disconnect
                      </button>
                      <button class="btn success cloud-backup-btn" data-provider="box" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Backup Now
                      </button>
                      <button class="btn cloud-restore-btn" data-provider="box" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Restore
                      </button>
                    </div>
                    <div class="cloud-status-detail"></div>
                    <div class="cloud-backup-list" id="cloudBackupList_box" style="display:none"></div>
                    <div class="cloud-provider-disclaimer" style="margin-top:0.75rem;font-size:0.75rem;opacity:0.8">
                      Requires a custom Box App Client ID. Enable "Read/write all files" scope.
                    </div>
                  </div>"""

# Robust replacement using regex
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(new_content)
