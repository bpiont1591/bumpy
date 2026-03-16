# GuildLift

Profesjonalna platforma typu "bump listing" dla serwerów Discord (od zera), inspirowana katalogami serwerów.

## Co dostajesz
- Strona główna z listą serwerów bumpowanych komendą `/bump`.
- Brak obsługi obcych botów listingowych — tylko serwery dodane przez Twojego bota.
- Osobny bot Discord (`/bot`) do hostowania na innym serwerze.
- Panel serwera (tokenowy), w którym właściciel/administrator może:
  - ustawić opis,
  - dodać reklamę (tytuł + treść),
  - podmienić invite,
  - dodać banner.

---

## Architektura
- `src/server.js` – API + serwowanie frontendu.
- `src/db.js` – SQLite (serwery, bump logi, panel tokeny).
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
- `GET /api/panel/:guildId?token=...` – dane panelu.
- `PUT /api/panel/:guildId` – zapis ustawień panelu.

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

## Bezpieczeństwo i dalszy rozwój (recommended)
- Podmień tokenowy panel na logowanie przez Discord OAuth2.
- Dodaj rate limiting dla `/api/bump`.
- Waliduj linki invite i URL bannera.
- Dodaj moderację reklam (status pending/approved).
- Dodaj cooldown bumpów (np. co 2h na serwer).
