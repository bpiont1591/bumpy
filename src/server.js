require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const {
  createServerFromBump,
  listServers,
  getServerByToken,
  updateServerSettings,
  createPanelSession,
  getValidPanelSession
} = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BUMP_API_KEY = process.env.BUMP_API_KEY;
const SESSION_COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!BUMP_API_KEY) {
  throw new Error('Brak BUMP_API_KEY w .env');
}

if (!SESSION_COOKIE_SECRET) {
  throw new Error('Brak SESSION_COOKIE_SECRET w .env');
}

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' }
}));

app.use((req, res, next) => {
  if (IS_PROD && req.get('x-forwarded-proto') === 'http') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }

  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser(SESSION_COOKIE_SECRET));
app.use(express.static(path.join(process.cwd(), 'public')));

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function isValidDiscordInvite(urlString) {
  if (typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return ['discord.gg', 'discord.com', 'www.discord.com'].includes(host) && url.pathname.includes('/');
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

function requirePanelSession(req, res, next) {
  const sessionId = req.signedCookies.gl_panel_session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Brak aktywnej sesji panelu.' });
  }

  const session = getValidPanelSession(sessionId);
  if (!session || session.guild_id !== req.params.guildId) {
    return res.status(401).json({ error: 'Sesja panelu wygasła lub jest niepoprawna.' });
  }

  req.panelSession = session;
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/servers', (_req, res) => {
  res.json({ servers: listServers() });
});

app.post('/api/bump', (req, res) => {
  const apiKey = req.header('x-bump-api-key');
  if (apiKey !== BUMP_API_KEY) {
    return res.status(401).json({ error: 'Nieprawidłowy klucz API.' });
  }

  const guildId = sanitizeText(req.body.guildId, 64);
  const guildName = sanitizeText(req.body.guildName, 120);
  const inviteUrl = sanitizeText(req.body.inviteUrl, 500);

  if (!guildId || !guildName || !inviteUrl) {
    return res.status(400).json({ error: 'Wymagane: guildId, guildName, inviteUrl.' });
  }

  if (!isValidDiscordInvite(inviteUrl)) {
    return res.status(400).json({ error: 'inviteUrl musi być poprawnym linkiem zaproszenia Discord (https).' });
  }

  const server = createServerFromBump({ guildId, guildName, inviteUrl });
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

  return res.json({
    success: true,
    panelUrl: `${baseUrl}/panel.html#guild=${guildId}&token=${server.panel_token}`,
    server
  });
});

app.post('/api/panel/session', (req, res) => {
  const guildId = sanitizeText(req.body.guildId, 64);
  const token = sanitizeText(req.body.token, 128);

  if (!guildId || !token) {
    return res.status(400).json({ error: 'Wymagane: guildId i token.' });
  }

  const server = getServerByToken(guildId, token);
  if (!server) {
    return res.status(401).json({ error: 'Token panelu jest niepoprawny.' });
  }

  const session = createPanelSession(guildId, 24);

  res.cookie('gl_panel_session', session.sessionId, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });

  return res.json({ success: true });
});

app.get('/api/panel/:guildId', requirePanelSession, (req, res) => {
  const servers = listServers();
  const server = servers.find((item) => item.guild_id === req.params.guildId);

  if (!server) {
    return res.status(404).json({ error: 'Nie znaleziono serwera.' });
  }

  return res.json({ server });
});

app.put('/api/panel/:guildId', requirePanelSession, (req, res) => {
  const inviteUrl = sanitizeText(req.body.inviteUrl, 500);
  const bannerUrl = sanitizeText(req.body.bannerUrl, 500);
  const description = sanitizeText(req.body.description, 700);
  const adTitle = sanitizeText(req.body.adTitle, 120);
  const adBody = sanitizeText(req.body.adBody, 900);

  if (!inviteUrl || !isValidDiscordInvite(inviteUrl)) {
    return res.status(400).json({ error: 'Podaj poprawny link zaproszenia Discord (https).' });
  }

  if (!isValidBannerUrl(bannerUrl)) {
    return res.status(400).json({ error: 'bannerUrl musi być poprawnym adresem https.' });
  }

  const updated = updateServerSettings({
    guildId: req.params.guildId,
    description,
    adTitle,
    adBody,
    inviteUrl,
    bannerUrl
  });

  if (!updated) {
    return res.status(404).json({ error: 'Nie udało się zapisać ustawień serwera.' });
  }

  return res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Serwer uruchomiony: http://localhost:${PORT}`);
});
