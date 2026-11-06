import { beforeEach, describe, expect, it, vi } from 'vitest';

// Histórico falso: como no navegador, voltar só acontece depois, e pushState é imediato.
const fake = {
  entries: [] as { state: any; url: string }[],
  i: 0,
};
const win = Object.assign(new EventTarget(), { scrollTo() {} });
const hist = {
  get state() {
    return fake.entries[fake.i].state;
  },
  pushState(state: unknown, _t: string, url?: string) {
    fake.entries = fake.entries.slice(0, fake.i + 1);
    fake.entries.push({ state, url: url ?? fake.entries[fake.i].url });
    fake.i++;
  },
  replaceState(state: unknown, _t: string, url?: string) {
    fake.entries[fake.i] = { state, url: url ?? fake.entries[fake.i].url };
  },
  go(n: number) {
    setTimeout(() => {
      fake.i += n;
      win.dispatchEvent(new Event('popstate'));
    }, 0);
  },
  back() {
    this.go(-1);
  },
};
vi.stubGlobal('window', win);
vi.stubGlobal('history', hist);

const { navigate, goBack, pushLayer, popLayer, activeLayers } = await import('./router');
const settle = () => new Promise((r) => setTimeout(r, 60));
const urls = () => fake.entries.slice(0, fake.i + 1).map((e) => e.url);

beforeEach(() => {
  fake.entries = [{ state: null, url: '#/clientes' }];
  fake.i = 0;
});

describe('navegação com folhas abertas', () => {
  it('fechar a folha e navegar no mesmo clique chega ao destino', async () => {
    const t = pushLayer();
    navigate('/clientes/1');
    popLayer(t); // o React fecha a folha depois que navigate já rodou
    await settle();
    expect(urls()).toEqual(['#/clientes', '#/clientes/1']);
  });

  it('navegar com replace troca a página de baixo da folha', async () => {
    const t = pushLayer();
    navigate('/orcamento', true);
    popLayer(t);
    await settle();
    expect(urls()).toEqual(['#/orcamento']);
  });

  it('fechar uma folha e abrir outra deixa só a nova aberta', async () => {
    const a = pushLayer();
    popLayer(a);
    const b = pushLayer();
    await settle();
    expect(activeLayers()).toEqual([b]);
    expect(fake.entries.slice(0, fake.i + 1)).toHaveLength(2);
  });

  it('duas camadas fechando juntas viram uma volta só e não travam a navegação', async () => {
    const a = pushLayer();
    const b = pushLayer();
    popLayer(b);
    popLayer(a);
    await settle();
    expect(activeLayers()).toEqual([]);
    expect(fake.i).toBe(0);
    navigate('/agenda');
    expect(urls()).toEqual(['#/clientes', '#/agenda']);
  });

  it('folha que abre e fecha antes de entrar no histórico não volta a mais', async () => {
    const a = pushLayer();
    popLayer(a);
    const b = pushLayer();
    popLayer(b);
    await settle();
    expect(fake.i).toBe(0);
    expect(activeLayers()).toEqual([]);
  });

  it('goBack depois de fechar a folha volta a página certa', async () => {
    navigate('/clientes/1');
    const t = pushLayer();
    popLayer(t);
    goBack('/clientes');
    await settle();
    expect(urls()).toEqual(['#/clientes']);
  });
});
