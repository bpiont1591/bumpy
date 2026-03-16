require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {
  createServerFromBump,
  listServers,
  getServerByToken,
  updateServerSettings
} = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BUMP_API_KEY = process.env.BUMP_API_KEY;

if (!BUMP_API_KEY) {
  throw new Error('Brak BUMP_API_KEY w .env');
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

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

  const { guildId, guildName, inviteUrl } = req.body;

  if (!guildId || !guildName || !inviteUrl) {
    return res.status(400).json({ error: 'Wymagane: guildId, guildName, inviteUrl.' });
  }

  const server = createServerFromBump({ guildId, guildName, inviteUrl });

  return res.json({
    success: true,
    panelUrl: `${process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`}/panel.html?guild=${guildId}&token=${server.panel_token}`,
    server
  });
});

app.get('/api/panel/:guildId', (req, res) => {
  const { guildId } = req.params;
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: 'Brak tokenu panelu.' });
  }

  const server = getServerByToken(guildId, token);

  if (!server) {
    return res.status(404).json({ error: 'Nie znaleziono serwera lub token jest niepoprawny.' });
  }

  return res.json({ server });
});

app.put('/api/panel/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { token, description = '', adTitle = '', adBody = '', inviteUrl = '', bannerUrl = '' } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Brak tokenu panelu.' });
  }

  const updated = updateServerSettings({
    guildId,
    panelToken: token,
    description,
    adTitle,
    adBody,
    inviteUrl,
    bannerUrl
  });

  if (!updated) {
    return res.status(404).json({ error: 'Nie udało się zapisać. Sprawdź token i guildId.' });
  }

  return res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Serwer uruchomiony: http://localhost:${PORT}`);
});
