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

## Flow działania bota
1. **Zaproś bota** przyciskiem na stronie (podmień `YOUR_CLIENT_ID` w `app.js`).
2. Na serwerze użyj `/invite kanał:#nazwa-kanału` (tylko admin).
3. Od tego momentu `/bump invite:<link>` działa wyłącznie na skonfigurowanym kanale.

---

## Architektura
- `index.html`, `panel.html`, `styles.css`, `app.js`, `panel.js` — frontend trzymany w głównym katalogu projektu.
- `functions/api/[[path]].js` — API pod Cloudflare Pages Functions.
- `migrations/001_init.sql` — schema D1.
- `bot/index.js` — bot Discord z komendami `/invite` i `/bump`.
- `src/*` — lokalny backend Node (opcjonalnie do local dev).

---

## Cloudflare Pages (bumpyv2.pages.dev)
### 1) Utwórz bazę D1
```bash
wrangler d1 create bumpyv2-db
```

### 2) Podepnij D1 do projektu Pages
Cloudflare Dashboard -> **Pages -> bumpyv2 -> Settings -> Functions -> D1 bindings**
- Binding name: `DB`
- Database: `bumpyv2-db`

### 3) Uruchom migrację
```bash
npm run cf:d1:migrate
```

### 4) Ustaw sekrety w Cloudflare
Pages -> Settings -> Environment Variables:
- `BUMP_API_KEY` (secret)
- `PUBLIC_BASE_URL=https://bumpyv2.pages.dev`

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

Przykładowy `.env` dla bota:
```env
BOT_TOKEN=twoj_token_bota
CLIENT_ID=application_id
API_BASE_URL=https://bumpyv2.pages.dev
BUMP_API_KEY=ten_sam_klucz_co_w_cloudflare_secret
```

---

## Rozwiązanie błędu: "Brak bindowania DB (D1)"
Jeśli bot zwraca ten błąd, to znaczy że projekt Pages nie ma podpiętego D1 bindingu `DB`.

Sprawdź:
1. Pages -> bumpyv2 -> Settings -> Functions -> D1 bindings.
2. Czy binding nazywa się dokładnie `DB`.
3. Czy wskazuje bazę `bumpyv2-db`.
4. Po zmianie zrób redeploy.

---

## Security
- API do bumpa chronione `x-bump-api-key`.
- Sesje panelu trzymane w D1 + cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Walidacja invite URL i banner URL.
- Endpointy API mają `cache-control: no-store`.
