# NebulaNest

Nowoczesna platforma typu "bump listing" dla serwerów Discord (budowana od zera), inspirowana działaniem katalogów jak Discordzik, ale z własnym brandingiem i unikalnym wyglądem.

## Co dostajesz
- Strona główna z listą serwerów bumpowanych komendą `/bump`.
- Tylko serwery dodane przez Twojego bota (bez obcych integracji listingowych).
- Osobny bot Discord (`/bot`) do hostowania na innym serwerze.
- Panel WWW, w którym owner serwera ustawia: opis, tagi, reklamę, link invite i banner.
- Przycisk **Zaproś bota na serwer** zaciągany z sekretu `BOT_INVITE_URL`.

---

## Flow działania (docelowy)
1. Użytkownik klika **Zaproś bota na serwer**.
2. Wchodzi na `/panel.html?onboarding=1` i loguje się Discordem.
3. Strona pobiera serwery, których jest ownerem, użytkownik wybiera serwer i wchodzi do panelu.
4. W panelu klika **Edytuj i zapisz** (opis, tagi, reklama itd. zapisują się do DB).
5. Potem w Discordzie admin robi `/invite kanał:#...` i `/bump`.
6. Reklama z panelu ląduje na stronie głównej po bumpie.

---

## Architektura
- `index.html`, `panel.html`, `styles.css`, `app.js`, `panel.js` — frontend.
- `functions/api/[[path]].js` — API Cloudflare Pages Functions.
- `migrations/001_init.sql` — schema D1.
- `bot/index.js` — komendy `/invite`, `/panel`, `/bump`.

---

## Cloudflare Pages (bumpyv2.pages.dev)
### 1) Utwórz bazę D1
```bash
wrangler d1 create bumpyv2-db
```

### 2) Uzupełnij `wrangler.toml`
Podmień `database_id = "PODMIEN_NA_REAL_DATABASE_ID"` na realne ID.

### 3) Uruchom migrację
```bash
npm run cf:d1:migrate
```

### 4) Ustaw sekrety/env w Cloudflare Pages
- `BUMP_API_KEY` (secret)
- `PUBLIC_BASE_URL=https://bumpyv2.pages.dev`
- `BOT_INVITE_URL=<pełny link OAuth2 do zaproszenia bota>`
- `DISCORD_CLIENT_ID=<id aplikacji discord>`
- `DISCORD_CLIENT_SECRET=<secret aplikacji discord>`
- `DISCORD_REDIRECT_URI=https://bumpyv2.pages.dev/api/auth/discord/callback`

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

## Troubleshooting
- `❌ Błąd API` w bocie:
  1. sprawdź `https://bumpyv2.pages.dev/api/health`,
  2. upewnij się, że D1 binding to `DB`,
  3. sprawdź sekrety i logi Functions.
- Brak serwerów na onboardingu panelu:
  - konto Discord musi być ownerem serwera.

---

## Security
- API do bumpa chronione `x-bump-api-key`.
- Sesje panelu: `HttpOnly`, `Secure`, `SameSite=Lax`.
- Walidacja invite URL i banner URL.
- Endpointy API mają `cache-control: no-store`.
