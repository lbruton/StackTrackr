import re

with open('js/cloud-storage.js', 'r') as f:
    content = f.read()

# 1. Add cloudGetClientId helper
helper_code = """
function cloudGetClientId(provider) {
  var override = localStorage.getItem('cloud_client_id_' + provider);
  if (override && override.trim()) return override.trim();
  return CLOUD_PROVIDERS[provider].clientId;
}

// ---------------------------------------------------------------------------
// Token management
"""

content = content.replace('// ---------------------------------------------------------------------------\n// Token management', helper_code)

# 2. Update cloudGetToken to use helper
content = content.replace(
    'client_id: config.clientId,',
    'client_id: cloudGetClientId(provider),'
)

# 3. Update cloudAuthStart to use helper
# Need to be careful with regex as it might be used multiple times
content = content.replace(
    'client_id: config.clientId,',
    'client_id: cloudGetClientId(provider),'
)

# 4. Update cloudExchangeCode to use helper
# It also uses 'client_id: config.clientId,' so the previous replaces should handle it if unique enough?
# cloudExchangeCode uses:
#   var body = new URLSearchParams({
#     grant_type: 'authorization_code',
#     code: code,
#     client_id: config.clientId,
#     redirect_uri: CLOUD_REDIRECT_URI,
#   });

# cloudGetToken uses:
#     var body = new URLSearchParams({
#       grant_type: 'refresh_token',
#       refresh_token: stored.refresh_token,
#       client_id: config.clientId,
#     });

# cloudAuthStart uses:
#   var params = new URLSearchParams({
#     response_type: 'code',
#     client_id: config.clientId,
#     ...

# All 3 use 'client_id: config.clientId,'. The naive replace above should handle all of them.
# Let's verify if there are any other occurrences or false positives.
# Based on previous read_file, these seem to be the only ones.

# 5. Update Box config
content = content.replace(
    "clientId: 'TODO_REPLACE_BOX_CLIENT_ID',",
    "clientId: '', // Configurable via localStorage (cloud_client_id_box)"
)

with open('js/cloud-storage.js', 'w') as f:
    f.write(content)
