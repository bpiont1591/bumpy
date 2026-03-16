# NebulaNest

Nowoczesna platforma typu "bump listing" dla serwerów Discord (budowana od zera), inspirowana działaniem katalogów jak Discordzik, ale z własnym brandingiem i unikalnym wyglądem.

## Co dostajesz
- Strona główna z listą serwerów bumpowanych komendą `/bump`.
- Tylko serwery dodane przez Twojego bota (bez obcych integracji listingowych).
- Osobny bot Discord (`/bot`) do hostowania na innym serwerze.
- Panel serwera z bezpieczną sesją HTTP-only, gdzie admin ustawia:
  - opis,
  - reklamę (tytuł + treść),
  - link invite,
  - banner.

---

## Architektura
- `src/server.js` – API + serwowanie frontendu + security middleware.
- `src/db.js` – SQLite (serwery, bump logi, sesje panelu).
- `public/*` – frontend (`index.html`, `panel.html`, style, JS).
- `bot/index.js` – bot Discord z komendą `/bump`.

---

## 1) Uruchomienie strony (backend + frontend)
```bash
npm install
cp .env.example .env
npm start
```

API działa na `http://localhost:3000`.

### Kluczowe endpointy
- `POST /api/bump` – tylko dla bota (`x-bump-api-key`).
- `GET /api/servers` – lista serwerów do wyświetlenia.
- `POST /api/panel/session` – start sesji panelu.
- `GET /api/panel/:guildId` – pobranie danych panelu (wymaga sesji).
- `PUT /api/panel/:guildId` – zapis ustawień panelu (wymaga sesji).

---

## 2) Uruchomienie bota (osobny hosting)
W folderze `bot`:
```bash
npm install
cp .env.example .env
npm start
```

Przykładowy `.env` dla bota:
```env
BOT_TOKEN=twoj_token_bota
CLIENT_ID=application_id
API_BASE_URL=https://twoja-domena-z-aplikacja.pl
BUMP_API_KEY=ten_sam_klucz_co_w_backendzie
```

Po wpisaniu `/bump invite:<link>` bot wysyła bump do API i zwraca adminowi link do panelu.

---

## Cloudflare + security checklist
1. Ustaw SSL/TLS na **Full (strict)**.
2. Trzymaj `BUMP_API_KEY` i `SESSION_COOKIE_SECRET` w sekretach hostingu.
3. Wyłącz cache dla `/api/*`, a dla statyk włącz cache.
4. Ustaw `PUBLIC_BASE_URL` na domenę HTTPS.
5. Aplikacja zawiera:
   - `helmet` + CSP,
   - HSTS w produkcji,
   - cookie sesji panelu: `httpOnly`, `signed`, `sameSite=lax`, `secure` (prod),
   - walidację invite/banner URL.

---

## Dalszy rozwój (opcjonalnie)
- Discord OAuth2 (weryfikacja owner/admin zamiast token flow).
- Rate limiting dla `/api/bump` i `/api/panel/session`.
- Moderacja reklam (pending/approved).
- Cooldown bumpów (np. co 2h na serwer).
