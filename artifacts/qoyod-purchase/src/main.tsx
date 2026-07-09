import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// API calls are hardcoded to "/api/..." at build time. Route them through
// api/index.php directly (PATH_INFO-style) rather than relying on a pretty
// "/api/..." URL rewritten by .htaccess -- that requires mod_rewrite and
// AllowOverride to be enabled for the api/ folder, which shared hosts don't
// always allow.
//
// By default this points at the same origin the app itself is served from
// (e.g. BASE_PATH=/Apps/Vendor/ -> /Apps/Vendor/api/index.php). Set
// VITE_API_BASE_URL at build time (an absolute origin, e.g.
// https://craftinnovationsgroup.com/Apps/Vendor) to point a static frontend
// deployed elsewhere (like GitHub Pages) at a backend hosted on a different
// domain -- see custom-fetch.ts's `credentials: "include"` for the other
// half of making cross-origin cookies work.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const apiBase = import.meta.env.VITE_API_BASE_URL || basePath;
setBaseUrl(`${apiBase}/api/index.php`);

createRoot(document.getElementById('root')!).render(<App />);
