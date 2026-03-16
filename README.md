# GuildLift

Profesjonalna platforma typu "bump listing" dla serwerów Discord (od zera), inspirowana katalogami serwerów.

## Co dostajesz
- Strona główna z listą serwerów bumpowanych komendą `/bump`.
- Brak obsługi obcych botów listingowych — tylko serwery dodane przez Twojego bota.
- Osobny bot Discord (`/bot`) do hostowania na innym serwerze.
- Panel serwera z bezpieczną sesją HTTP-only (bez stałego tokenu w query), w którym właściciel/administrator może:
  - ustawić opis,
  - dodać reklamę (tytuł + treść),
  - podmienić invite,
  - dodać banner.

---

## Architektura
- `src/server.js` – API + serwowanie frontendu + walidacja bezpieczeństwa.
- `src/db.js` – SQLite (serwery, bump logi, sesje panelu).
- `public/*` – frontend (`index.html` + `panel.html`).
- `bot/index.js` – bot Discord z komendą slash `/bump`.

---

## 1) Uruchomienie strony (backend + frontend)
```bash
npm install
cp .env.example .env
npm start
```

API działa na `http://localhost:3000`.

### Kluczowe endpointy
- `POST /api/bump` – tylko dla bota (nagłówek `x-bump-api-key`).
- `GET /api/servers` – lista serwerów do wyświetlenia.
- `POST /api/panel/session` – uruchamia sesję panelu na podstawie jednorazowego tokenu.
- `GET /api/panel/:guildId` – dane panelu (wymaga sesji).
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

Po wpisaniu `/bump invite:<link>` bot wyśle bump do API i odda użytkownikowi link do panelu serwera.

---

## Cloudflare + security checklist
1. Ustaw w Cloudflare SSL/TLS na **Full (strict)**.
2. Trzymaj `BUMP_API_KEY` i `SESSION_COOKIE_SECRET` wyłącznie w sekretach hostingu.
3. Dla `/api/*` ustaw brak cache, dla statyk (`/styles.css`, `/app.js`) możesz włączyć cache.
4. Ustaw `PUBLIC_BASE_URL` na domenę produkcyjną po HTTPS.
5. Aplikacja ma:
   - `helmet` + CSP,
   - HSTS w produkcji,
   - cookie sesji panelu `httpOnly`, `signed`, `sameSite=lax`, `secure` (w prod),
   - walidację linków invite/banner.

---

## Bezpieczeństwo i dalszy rozwój (recommended)
- Podmień tokenowy panel na logowanie przez Discord OAuth2 i weryfikację ról admin/owner.
- Dodaj rate limiting dla `/api/bump` i `/api/panel/session`.
- Dodaj moderację reklam (status pending/approved).
- Dodaj cooldown bumpów (np. co 2h na serwer).
