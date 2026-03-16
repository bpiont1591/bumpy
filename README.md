# NebulaNest

Nowoczesna platforma typu "bump listing" dla serwerów Discord (budowana od zera), inspirowana działaniem katalogów jak Discordzik, ale z własnym brandingiem i unikalnym wyglądem.

## Co dostajesz
- Strona główna z listą serwerów bumpowanych komendą `/bump`.
- Tylko serwery dodane przez Twojego bota (bez obcych integracji listingowych).
- Osobny bot Discord (`/bot`) do hostowania na innym serwerze.
- Panel serwera z bezpieczną sesją HTTP-only, gdzie admin ustawia opis/reklamę/link/banner.
- Przycisk **Zaproś bota na serwer** zaciągany z sekretu `BOT_INVITE_URL` (pełny link OAuth2, bez hardcodu w JS).

---

## Flow działania bota
1. Użytkownik klika **Zaproś bota na serwer**.
2. Admin używa `/invite kanał:#nazwa-kanału`.
3. `/bump` działa tylko na tym kanale.

---

## Architektura
- `index.html`, `panel.html`, `styles.css`, `app.js`, `panel.js` — frontend w głównym katalogu.
- `functions/api/[[path]].js` — API Cloudflare Pages Functions.
- `migrations/001_init.sql` — schema D1.
- `bot/index.js` — komendy `/invite` i `/bump`.

---

## Cloudflare Pages (bumpyv2.pages.dev)
### 1) Utwórz bazę D1
```bash
wrangler d1 create bumpyv2-db
```

### 2) Uzupełnij `wrangler.toml`
Bindingi są zarządzane przez plik, więc podmień:
- `database_id = "PODMIEN_NA_REAL_DATABASE_ID"`
na realne ID z poprzedniego kroku.

### 3) Uruchom migrację
```bash
npm run cf:d1:migrate
```

### 4) Ustaw sekrety w Cloudflare Pages
Pages -> Settings -> Environment Variables (Production/Preview):
- `BUMP_API_KEY` (secret)
- `PUBLIC_BASE_URL=https://bumpyv2.pages.dev`
- `BOT_INVITE_URL=<pelny_link_oauth2_do_zaproszenia_bota>`
- (opcjonalnie fallback) `BOT_CLIENT_ID=<application_id_bota_discord>`

Przykład `BOT_INVITE_URL`:
```
https://discord.com/oauth2/authorize?client_id=1482326303662145738&permissions=8&integration_type=0&scope=bot
```

### 5) Deploy
```bash
npm run cf:deploy
```

---

## Bot (osobny hosting)
W folderze `bot`:
```bash
npm install
cp .env.example .env
npm start
```

Przykładowy `.env`:
```env
BOT_TOKEN=twoj_token_bota
CLIENT_ID=application_id
API_BASE_URL=https://bumpyv2.pages.dev
BUMP_API_KEY=ten_sam_klucz_co_w_cloudflare_secret
```

---

## Rozwiązanie błędu: "Brak bindowania DB (D1)"
Jeśli bot zwraca ten błąd:
1. Sprawdź `wrangler.toml` czy ma poprawny `database_id`.
2. Upewnij się, że binding ma nazwę `DB`.
3. Zrób redeploy Pages.

---

## Security
- API do bumpa chronione `x-bump-api-key`.
- Sesje panelu: `HttpOnly`, `Secure`, `SameSite=Lax`.
- Walidacja invite URL i banner URL.
- Endpointy API mają `cache-control: no-store`.
