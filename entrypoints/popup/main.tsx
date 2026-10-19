import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist/latin-600.css';
import '../../src/ui/theme.css';
import { ExtensionScreen } from '../../src/ui/ExtensionScreen';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ExtensionScreen variant="popup" />
    </React.StrictMode>,
  );
}
