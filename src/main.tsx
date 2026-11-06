import { createRoot } from 'react-dom/client';
import '@fontsource-variable/lexend';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { StoreProvider } from './data/store';
import { UIProvider } from './ui/kit';

// Atualiza sozinho quando uma versão nova é publicada
registerSW({ immediate: true });

if (!location.hash) history.replaceState({ depth: 0 }, '', '#/orcamento');

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <UIProvider>
      <App />
    </UIProvider>
  </StoreProvider>,
);
