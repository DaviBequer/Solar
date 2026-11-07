import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { StoreProvider } from './data/store';
import { UIProvider } from './ui/kit';

// Atualiza sozinho quando uma versão nova é publicada
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    setInterval(check, 5 * 60 * 1000);
  },
});

if (!location.hash) history.replaceState({ depth: 0 }, '', '#/orcamento');

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <UIProvider>
      <App />
    </UIProvider>
  </StoreProvider>,
);
