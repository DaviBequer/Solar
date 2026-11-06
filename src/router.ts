import { useEffect, useState } from 'react';

export type RouteName = 'orcamento' | 'clientes' | 'cliente' | 'agenda' | 'painel' | 'ajustes' | 'kits' | 'proposta';
export interface Route {
  name: RouteName;
  id?: string;
}

const TABS: RouteName[] = ['orcamento', 'clientes', 'agenda', 'painel', 'ajustes', 'kits'];

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b] = parts;
  if (a === 'clientes' && b) return { name: 'cliente', id: decodeURIComponent(b) };
  if (a === 'proposta' && b) return { name: 'proposta', id: decodeURIComponent(b) };
  if (a && (TABS as string[]).includes(a)) return { name: a as RouteName };
  return { name: 'orcamento' };
}

/* Camadas (folhas e visualizadores) entram no histórico para o botão voltar do celular fechá-las. */
let pendingBacks = 0;
const queued: Array<() => void> = [];

function depth(): number {
  return (history.state && typeof history.state.depth === 'number') ? history.state.depth : 0;
}

function emit() {
  window.dispatchEvent(new Event('routechange'));
}

window.addEventListener('popstate', () => {
  if (pendingBacks > 0) pendingBacks--;
  if (pendingBacks === 0) {
    while (queued.length) queued.shift()!();
  }
  emit();
});

function whenSettled(fn: () => void) {
  if (pendingBacks > 0) queued.push(fn);
  else fn();
}

export function navigate(path: string, replace = false) {
  whenSettled(() => {
    const url = '#' + path;
    if (replace) history.replaceState({ depth: depth() }, '', url);
    else history.pushState({ depth: depth() + 1 }, '', url);
    window.scrollTo(0, 0);
    emit();
  });
}

export function goBack(fallback: string) {
  whenSettled(() => {
    if (depth() > 0 && !history.state?.layer) history.back();
    else navigate(fallback, true);
  });
}

let layerSeq = 0;

export function activeLayers(): number[] {
  return Array.isArray(history.state?.layers) ? history.state.layers : [];
}

export function pushLayer(): number {
  const token = ++layerSeq;
  history.pushState({ depth: depth(), layer: true, layers: [...activeLayers(), token] }, '');
  return token;
}

export function popLayer(): void {
  pendingBacks++;
  history.back();
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener('routechange', on);
    window.addEventListener('hashchange', on);
    return () => {
      window.removeEventListener('routechange', on);
      window.removeEventListener('hashchange', on);
    };
  }, []);
  return route;
}
