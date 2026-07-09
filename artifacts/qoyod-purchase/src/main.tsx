import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// API calls are hardcoded to "/api/..." at build time. Route them through
// api/index.php directly (PATH_INFO-style) rather than relying on a pretty
// "/api/..." URL rewritten by .htaccess -- that requires mod_rewrite and
// AllowOverride to be enabled for the api/ folder, which shared hosts don't
// always allow. This also keeps calls under the same subpath the app itself
// is served from (e.g. BASE_PATH=/Apps/Vendor/ -> /Apps/Vendor/api/index.php).
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
setBaseUrl(`${basePath}/api/index.php`);

createRoot(document.getElementById('root')!).render(<App />);
