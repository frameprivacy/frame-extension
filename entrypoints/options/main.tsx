import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist/latin-600.css';
import '@fontsource/instrument-serif/latin-400.css';
import '../../src/ui/theme.css';
import { locale } from '../../src/lib/i18n';
import { ExtensionScreen } from '../../src/ui/ExtensionScreen';

document.documentElement.lang = locale();
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ExtensionScreen variant="options" />
    </React.StrictMode>,
  );
}
