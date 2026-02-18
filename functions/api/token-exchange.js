// Cloudflare Pages Function — proxies OAuth token exchange for providers
// that require a client_secret (pCloud, Box). Dropbox uses PKCE and
// exchanges directly from the browser, so it doesn't hit this endpoint.

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await request.json();
  const { provider, code, redirect_uri, code_verifier } = body;

  const configs = {
    pcloud: {
      tokenUrl: 'https://api.pcloud.com/oauth2_token',
      clientId: env.PCLOUD_CLIENT_ID,
      clientSecret: env.PCLOUD_CLIENT_SECRET,
    },
    box: {
      tokenUrl: 'https://api.box.com/oauth2/token',
      clientId: env.BOX_CLIENT_ID,
      clientSecret: env.BOX_CLIENT_SECRET,
    },
  };

  const config = configs[provider];
  if (!config) {
    return new Response(JSON.stringify({ error: 'Unknown provider' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri,
  });

  if (code_verifier) params.set('code_verifier', code_verifier);

  const resp = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await resp.json();

  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://staktrakr.com',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://staktrakr.com',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
