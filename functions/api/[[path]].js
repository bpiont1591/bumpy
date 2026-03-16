const SESSION_COOKIE_NAME = 'gl_panel_session';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function randomToken(length = 48) {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function isValidDiscordInvite(urlString) {
  if (typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return ['discord.gg', 'discord.com', 'www.discord.com'].includes(host);
  } catch {
    return false;
  }
}

function isValidBannerUrl(urlString) {
  if (!urlString) return true;
  if (typeof urlString !== 'string' || urlString.length > 500) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getCookie(request, cookieName) {
  const cookieHeader = request.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === cookieName) return decodeURIComponent(rest.join('='));
  }
  return '';
}

async function getServerByGuildId(db, guildId) {
  return db.prepare(`
    SELECT guild_id, guild_name, invite_url, description, ad_title, ad_body, banner_url, bumps_count, bumped_at, panel_token
    FROM servers WHERE guild_id = ?
  `).bind(guildId).first();
}

async function requirePanelSession(request, env, guildId) {
  const sessionId = getCookie(request, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const row = await env.DB.prepare(`
    SELECT session_id, guild_id, expires_at
    FROM panel_sessions
    WHERE session_id = ?
  `).bind(sessionId).first();

  if (!row || row.guild_id !== guildId) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM panel_sessions WHERE session_id = ?').bind(sessionId).run();
    return null;
  }

  return row;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;

  if (!env.DB) {
    return json({ error: 'Brak bindowania DB (D1).' }, 500);
  }

  if (path === '/api/health' && method === 'GET') {
    return json({ ok: true, provider: 'cloudflare-pages-functions' });
  }

  if (path === '/api/servers' && method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT guild_id, guild_name, invite_url, description, ad_title, ad_body, banner_url, bumps_count, bumped_at
      FROM servers
      ORDER BY datetime(bumped_at) DESC
    `).all();

    return json({ servers: results || [] });
  }

  if (path === '/api/bump' && method === 'POST') {
    const apiKey = request.headers.get('x-bump-api-key');
    if (!env.BUMP_API_KEY || apiKey !== env.BUMP_API_KEY) {
      return json({ error: 'Nieprawidłowy klucz API.' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const guildId = sanitizeText(body.guildId, 64);
    const guildName = sanitizeText(body.guildName, 120);
    const inviteUrl = sanitizeText(body.inviteUrl, 500);

    if (!guildId || !guildName || !inviteUrl) {
      return json({ error: 'Wymagane: guildId, guildName, inviteUrl.' }, 400);
    }

    if (!isValidDiscordInvite(inviteUrl)) {
      return json({ error: 'inviteUrl musi być poprawnym linkiem Discord (https).' }, 400);
    }

    const now = new Date().toISOString();
    const existing = await getServerByGuildId(env.DB, guildId);
    const panelToken = existing?.panel_token || randomToken(24);

    await env.DB.prepare(`
      INSERT INTO servers (
        guild_id, guild_name, invite_url, description, ad_title, ad_body, banner_url, panel_token,
        bumps_count, bumped_at, created_at, updated_at
      ) VALUES (?, ?, ?, '', '', '', '', ?, 1, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        guild_name=excluded.guild_name,
        invite_url=excluded.invite_url,
        bumps_count=servers.bumps_count + 1,
        bumped_at=excluded.bumped_at,
        updated_at=excluded.updated_at
    `).bind(guildId, guildName, inviteUrl, panelToken, now, now, now).run();

    await env.DB.prepare('INSERT INTO bump_logs (guild_id, bumped_at) VALUES (?, ?)').bind(guildId, now).run();

    const base = env.PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
    return json({
      success: true,
      panelUrl: `${base}/panel.html#guild=${guildId}&token=${panelToken}`
    });
  }

  if (path === '/api/panel/session' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const guildId = sanitizeText(body.guildId, 64);
    const token = sanitizeText(body.token, 128);

    if (!guildId || !token) return json({ error: 'Wymagane: guildId i token.' }, 400);

    const server = await env.DB.prepare('SELECT guild_id FROM servers WHERE guild_id = ? AND panel_token = ?').bind(guildId, token).first();
    if (!server) return json({ error: 'Token panelu jest niepoprawny.' }, 401);

    const sessionId = randomToken(48);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare('DELETE FROM panel_sessions WHERE datetime(expires_at) <= datetime(?)').bind(now.toISOString()).run();
    await env.DB.prepare('INSERT INTO panel_sessions (session_id, guild_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(sessionId, guildId, expiresAt, now.toISOString())
      .run();

    const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
    return json({ success: true }, 200, { 'set-cookie': cookie });
  }

  const panelMatch = path.match(/^\/api\/panel\/([^/]+)$/);
  if (panelMatch && method === 'GET') {
    const guildId = decodeURIComponent(panelMatch[1]);
    const session = await requirePanelSession(request, env, guildId);
    if (!session) return json({ error: 'Brak aktywnej sesji panelu.' }, 401);

    const row = await env.DB.prepare(`
      SELECT guild_id, guild_name, invite_url, description, ad_title, ad_body, banner_url, bumps_count, bumped_at
      FROM servers WHERE guild_id = ?
    `).bind(guildId).first();

    if (!row) return json({ error: 'Nie znaleziono serwera.' }, 404);
    return json({ server: row });
  }

  if (panelMatch && method === 'PUT') {
    const guildId = decodeURIComponent(panelMatch[1]);
    const session = await requirePanelSession(request, env, guildId);
    if (!session) return json({ error: 'Brak aktywnej sesji panelu.' }, 401);

    const body = await request.json().catch(() => ({}));
    const inviteUrl = sanitizeText(body.inviteUrl, 500);
    const bannerUrl = sanitizeText(body.bannerUrl, 500);
    const description = sanitizeText(body.description, 700);
    const adTitle = sanitizeText(body.adTitle, 120);
    const adBody = sanitizeText(body.adBody, 900);

    if (!inviteUrl || !isValidDiscordInvite(inviteUrl)) {
      return json({ error: 'Podaj poprawny link zaproszenia Discord (https).' }, 400);
    }

    if (!isValidBannerUrl(bannerUrl)) {
      return json({ error: 'bannerUrl musi być poprawnym adresem https.' }, 400);
    }

    const result = await env.DB.prepare(`
      UPDATE servers
      SET description = ?, ad_title = ?, ad_body = ?, invite_url = ?, banner_url = ?, updated_at = ?
      WHERE guild_id = ?
    `).bind(description, adTitle, adBody, inviteUrl, bannerUrl, new Date().toISOString(), guildId).run();

    if (!result.success) return json({ error: 'Nie udało się zapisać ustawień.' }, 500);
    return json({ success: true });
  }

  return json({ error: 'Nie znaleziono endpointu API.' }, 404);
}
