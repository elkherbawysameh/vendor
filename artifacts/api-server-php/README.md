# API Server (PHP)

Plain PHP + PDO/MySQL port of `artifacts/api-server` (the Node/Express API). No
Node.js runtime is needed to serve this — it works on any classic shared
hosting plan (Apache/LiteSpeed + PHP 7.4+ or 8.x), including Hostinger's
regular cPanel/hPanel hosting.

It implements the exact same routes described in `lib/api-spec/openapi.yaml`,
so the existing React frontend (`artifacts/qoyod-purchase`) works against it
unchanged.

## Deploying on Hostinger shared hosting

1. **Create the MySQL database** in hPanel → Databases → MySQL Databases.
   Note the host (usually `localhost`), database name, username, and password.

2. **Import the schema**: open phpMyAdmin for that database and import
   `schema.sql` from this folder (or run it via the phpMyAdmin SQL tab).

3. **Configure credentials**: copy `src/config.example.php` to
   `src/config.php` and fill in the DB values from step 1. `config.php` is
   git-ignored — never commit real credentials.

4. **Upload this folder's `public/` contents** to `public_html/api/` on your
   hosting (via File Manager or FTP), and the `src/` folder one level above
   it (i.e. `public_html/api/../src` → so the layout on the server is
   `public_html/api/index.php`, `public_html/api/.htaccess`, and
   `public_html/src/...`). Simplest: upload the whole `api-server-php` folder
   as `public_html/api-server-php/`, then point Hostinger's document root (or
   an alias) so that `public_html/api/` maps to `api-server-php/public/`.
   The easiest way to do this on shared hosting without changing the doc
   root: upload the entire `api-server-php` folder contents directly into
   `public_html/api/` (so `public_html/api/index.php` — from the `public/`
   subfolder — and `public_html/api/../src` become `public_html/src`). If
   that's confusing, just place the folders exactly like this on the server:
   - `public_html/api/index.php` (from `public/index.php`)
   - `public_html/api/.htaccess` (from `public/.htaccess`)
   - `public_html/src/...` (the whole `src/` folder, one level above `api/`)

   This matches the `__DIR__ . '/../src/...'` requires in `index.php`.

5. **Build and upload the frontend**: on a machine with Node.js (your dev
   machine, or any CI), run:
   ```
   cd artifacts/qoyod-purchase
   PORT=5173 BASE_PATH=/ pnpm run build
   ```
   Then upload the contents of `artifacts/qoyod-purchase/dist/public/` into
   `public_html/` (the domain root), alongside the `api/` folder from step 4.
   Node.js is only needed for this one-time build step — not at runtime.

6. **Same-origin by default**: with the layout above, the frontend and API
   share one domain (`yoursite.com/` and `yoursite.com/api/`), so no CORS
   setup or cross-site cookie configuration is needed — this is the
   recommended, simplest setup. Only set `allowed_origin` in `config.php` if
   you deploy the frontend on a *different* domain.

## Files

- `public/index.php` — front controller / router (all requests go through
  this, via `.htaccess`)
- `src/config.php` — your real DB credentials (not committed to git)
- `src/db.php` — PDO connection + query helpers
- `src/helpers.php` — JSON helpers, auth/session helpers, route dispatcher
- `src/routes/*.php` — one file per resource, mirroring
  `artifacts/api-server/src/routes/*.ts`
- `schema.sql` — MySQL DDL for all tables

## Auth

Login is still the simple "any @qoyod.com email" scheme from the original
app, stored in a native PHP session (cookie `PHPSESSID`) instead of a signed
Express cookie. Roles (`admin`, `accounts_manager`, `accounts_employee`,
`employee`) are still hardcoded by email in `src/helpers.php`
(`get_role()`) — edit that function if the role assignments change.
