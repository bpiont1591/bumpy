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

## Cloudflare Pages (bumpyv2.pages.dev) — gotowe
Projekt jest przygotowany pod:
- statyczny frontend w `public/`,
- API w Cloudflare Pages Functions: `functions/api/[[path]].js`,
- bazę danych Cloudflare D1 (binding `DB`).

### 1) Utwórz bazę D1
```bash
wrangler d1 create bumpyv2-db
```
Skopiuj `database_id` do `wrangler.toml`.

### 2) Uruchom migrację
```bash
npm run cf:d1:migrate
```
Lub ręcznie:
```bash
wrangler d1 execute bumpyv2-db --file=./migrations/001_init.sql
```

### 3) Ustaw sekrety w Cloudflare (Pages Project -> Settings -> Environment Variables)
- `BUMP_API_KEY` (secret)
- `PUBLIC_BASE_URL=https://bumpyv2.pages.dev`

### 4) Deploy na Pages
```bash
npm run cf:deploy
```

Po deployu API będzie działać pod:
- `https://bumpyv2.pages.dev/api/health`
- `https://bumpyv2.pages.dev/api/servers`

---

## Bot (osobny hosting)
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
API_BASE_URL=https://bumpyv2.pages.dev
BUMP_API_KEY=ten_sam_klucz_co_w_cloudflare_secret
```

Po wpisaniu `/bump invite:<link>` bot wysyła bump do API i zwraca adminowi link do panelu.

---

## Lokalne uruchomienie (opcjonalne)
- legacy Node backend: `npm start`
- Cloudflare local dev: `npm run cf:dev`

---

## Security
- API do bumpa chronione `x-bump-api-key`.
- Sesje panelu trzymane w D1 + cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Walidacja invite URL i banner URL.
- Endpointy API mają `cache-control: no-store`.

---

## Dalszy rozwój (opcjonalnie)
- Discord OAuth2 (weryfikacja owner/admin zamiast token flow).
- Rate limiting dla `/api/bump` i `/api/panel/session`.
- Moderacja reklam (pending/approved).
- Cooldown bumpów (np. co 2h na serwer).
