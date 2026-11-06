import { useEffect, useRef, useState } from 'react';

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

/*
 * Camadas (folhas e visualizadores) entram no histórico para o botão voltar do celular fechá-las.
 * Voltar no histórico só acontece depois, então tudo o que mexe nele passa por uma fila:
 * no máximo uma volta por vez, e o resto espera ela terminar.
 */
let traversing = false;
let pops = 0;
const queued: Array<() => void> = [];
/** Camadas que navigate já tirou do histórico: o fechamento delas não volta de novo */
const released = new Set<number>();
/** Camadas abertas que ainda esperam a fila para entrar no histórico */
const unpushed = new Set<number>();

function depth(): number {
  return (history.state && typeof history.state.depth === 'number') ? history.state.depth : 0;
}

function emit() {
  window.dispatchEvent(new Event('routechange'));
}

function traverse(n: number) {
  traversing = true;
  history.go(-n);
}

function flushPops() {
  const n = pops;
  pops = 0;
  traverse(n);
}

window.addEventListener('popstate', () => {
  traversing = false;
  if (pops > 0) flushPops();
  while (queued.length && !traversing && pops === 0) queued.shift()!();
  emit();
});

function whenSettled(fn: () => void) {
  if (traversing || pops > 0) queued.push(fn);
  else fn();
}

export function navigate(path: string, replace = false) {
  whenSettled(() => {
    const go = () => {
      const url = '#' + path;
      if (replace) history.replaceState({ depth: depth() }, '', url);
      else history.pushState({ depth: depth() + 1 }, '', url);
      window.scrollTo(0, 0);
      emit();
    };
    // Navegar com folha aberta: tira as folhas do histórico antes, senão elas voltariam por cima do destino.
    const layers = activeLayers();
    if (layers.length === 0) return go();
    for (const t of layers) released.add(t);
    queued.unshift(go);
    traverse(layers.length);
  });
}

export function goBack(fallback: string) {
  whenSettled(() => {
    if (depth() > 0 && !history.state?.layer) traverse(1);
    else navigate(fallback, true);
  });
}

let layerSeq = 0;

export function activeLayers(): number[] {
  return Array.isArray(history.state?.layers) ? history.state.layers : [];
}

export function pushLayer(): number {
  const token = ++layerSeq;
  unpushed.add(token);
  whenSettled(() => {
    if (unpushed.delete(token)) history.pushState({ depth: depth(), layer: true, layers: [...activeLayers(), token] }, '');
  });
  return token;
}

export function popLayer(token: number): void {
  if (unpushed.delete(token) || released.delete(token)) return;
  pops++;
  // Camadas que fecham juntas viram uma volta só: duas voltas seguidas o navegador pode juntar.
  if (pops === 1) queueMicrotask(() => { if (!traversing && pops > 0) flushPops(); });
}

/** Fecha a camada com o botão voltar do celular */
export function useLayer(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const token = pushLayer();
    let popped = false;
    const onPop = () => {
      if (!unpushed.has(token) && !activeLayers().includes(token)) {
        popped = true;
        released.delete(token);
        closeRef.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!popped) popLayer(token);
    };
  }, [open]);
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
