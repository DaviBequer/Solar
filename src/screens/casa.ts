import { brl } from '../core/format';
import { horizonYears } from '../core/quote';
import photo from '../assets/casa.webp';

/* Desenhos da tela de Orçamento: casa com o dia animado e gráfico de projeção. Só números entram nesses textos. */

/*
 * Fundo é uma foto (casa térrea com muro, garagem e poste). Coordenadas abaixo em unidades do desenho:
 * a foto tem 2000 px de largura e cada pixel vale 0,36 unidade; um zoom de 1,25 aproxima a casa.
 * Os painéis da foto são cobertos por telha e trocados pelos do orçamento.
 */
type Pt = [number, number];
const ROOF: [Pt, Pt, Pt, Pt] = [[224.6, 105.8], [478.8, 107.3], [426.6, 133.9], [232.6, 134.6]];
const COVER_MAIN = '221.8,103 485.3,104.4 485.3,121 432.7,122.4 431.3,136.6 229.7,137.2';
const COVER_CARPORT = '427.6,142.8 484.6,142 535.4,166.6 451.4,176.4';
/** Bateria ao lado do inversor, desenhada em 32 × 36 e reduzida; a animação enche o nível dentro dela */
export const BAT = { x: 312, y: 203, s: 0.62, w: 32, h: 36 };

function panelCells(total: number, existing: number, type: string) {
  const n = Math.min(total, 40), rows = n <= 8 ? 2 : n <= 18 ? 3 : n <= 30 ? 4 : 5, cols = Math.ceil(n / rows), old = type === 'ampliacao' ? Math.min(n, existing) : n;
  const [tl, tr, br, bl] = ROOF;
  const P = (u: number, v: number): Pt => { const top = [tl[0] + (tr[0] - tl[0]) * u, tl[1] + (tr[1] - tl[1]) * u], bot = [bl[0] + (br[0] - bl[0]) * u, bl[1] + (br[1] - bl[1]) * u]; return [+(top[0] + (bot[0] - top[0]) * v).toFixed(1), +(top[1] + (bot[1] - top[1]) * v).toFixed(1)]; };
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, g = .006, u0 = c / cols + g, u1 = (c + 1) / cols - g, v0 = r / rows + .03, v1 = (r + 1) / rows - .03;
    const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], novo = i >= old;
    const m1 = P(u0, (v0 + v1) / 2), m2 = P(u1, (v0 + v1) / 2), k1 = P((u0 + u1) / 2, v0), k2 = P((u0 + u1) / 2, v1);
    out += `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="${novo ? 'url(#pvn)' : 'url(#pv)'}" stroke="#C9D2E2" stroke-width=".5"/><path d="M${m1[0]} ${m1[1]}L${m2[0]} ${m2[1]}M${k1[0]} ${k1[1]}L${k2[0]} ${k2[1]}" stroke="#B9C8E2" stroke-opacity=".3" stroke-width=".35"/>`;
  }
  return out;
}
function battery(ghost: boolean, bats: number) {
  const { x, y, s, w, h } = BAT;
  const body = ghost
    ? `<g fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 4"><rect width="${w}" height="${h}" rx="5"/><path d="M${w / 2 + 2} 8l-6 11h5l-2 9 7-12h-5z"/></g>`
    : `<rect width="${w}" height="${h}" rx="5" fill="url(#bb)" stroke="#39465F" stroke-width="1.6"/><clipPath id="bc"><rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="2.5"/></clipPath><g clip-path="url(#bc)"><rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="#2A354C"/><rect id="b-lvl" x="4" y="4" width="${w - 8}" height="${h - 8}" fill="url(#bg)"/></g><path d="M${w / 2 + 2} 9l-6 11h5l-2 9 7-12h-5z" fill="#fff"/>${bats > 1 ? `<circle cx="${w}" cy="0" r="10" fill="#1B2A49"/><text x="${w}" y="4" text-anchor="middle" font-size="12" font-weight="800" fill="#E8C885">${bats}</text>` : ''}`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
}

export function sceneSvg(total: number, existing: number, t: string, bats: number): string {
  const bat = t === 'bateria' ? battery(false, bats) : t === 'hibrido' ? battery(true, bats) : '';
  return `<svg viewBox="0 0 720 400" role="img" aria-label="Casa térrea com ${total} painéis no telhado, inversor na parede ligado ao poste. Animação de um dia.">
  <defs>
    <linearGradient id="pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3D5E98"/><stop offset=".55" stop-color="#1D3262"/><stop offset="1" stop-color="#132247"/></linearGradient>
    <linearGradient id="pvn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E3C377"/><stop offset="1" stop-color="#A9843A"/></linearGradient>
    <pattern id="tile" width="6" height="4.2" patternUnits="userSpaceOnUse"><rect width="6" height="4.2" fill="#B8602F"/><path d="M0 4.200a3 3 0 0 1 6 0" fill="#CB7440"/><path d="M0 4.200a3 3 0 0 1 6 0" fill="none" stroke="#8E431D" stroke-width=".4"/></pattern>
    <linearGradient id="bg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0B8560"/><stop offset="1" stop-color="#4FCF9F"/></linearGradient>
    <linearGradient id="bb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FAFBFC"/><stop offset="1" stop-color="#D5DAE3"/></linearGradient>
    <radialGradient id="sg"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".95"/><stop offset=".3" stop-color="#FFD978" stop-opacity=".5"/><stop offset="1" stop-color="#FFD978" stop-opacity="0"/></radialGradient>
    <radialGradient id="wg"><stop offset="0" stop-color="#FFD97A" stop-opacity=".9"/><stop offset="1" stop-color="#FFD97A" stop-opacity="0"/></radialGradient>
    <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A6" stop-opacity=".5"/><stop offset="1" stop-color="#FFE7A6" stop-opacity="0"/></linearGradient>
  </defs>
  <g transform="translate(-101.5 14) scale(1.25)">
  <image href="${photo}" x="0" y="0" width="720" height="402" preserveAspectRatio="xMidYMid slice"/>
  </g>
  <g id="stars" fill="#fff" opacity="0"><circle cx="70" cy="30" r="1.5"/><circle cx="160" cy="62" r="1"/><circle cx="250" cy="24" r="1.3"/><circle cx="360" cy="44" r="1"/><circle cx="470" cy="20" r="1.5"/><circle cx="420" cy="70" r="1"/><circle cx="110" cy="80" r="1"/></g>
  <g id="moon" opacity="0"><circle cx="110" cy="44" r="16" fill="#F3F5FB"/><circle cx="117" cy="39" r="14" fill="#1A2747"/></g>
  <g id="sun"><circle r="70" fill="url(#sg)"/><circle r="18" fill="#FFD66B"/></g>
  <g transform="translate(-101.5 14) scale(1.25)">
  <polygon points="${COVER_MAIN}" fill="url(#tile)"/><polygon points="${COVER_CARPORT}" fill="url(#tile)"/>
  ${panelCells(total, existing, t)}
  </g>

  <rect id="night" x="0" y="0" width="720" height="400" fill="#0F1A36" opacity="0"/>
  <g transform="translate(-101.5 14) scale(1.25)">
  <g id="glow" opacity="0"><ellipse cx="223" cy="190" rx="26" ry="18" fill="url(#wg)"/><rect x="216" y="181" width="5" height="18" fill="#FFDD87"/><rect x="224" y="181" width="5" height="18" fill="#FFDD87"/><ellipse cx="400" cy="214" rx="30" ry="24" fill="url(#wg)" opacity=".7"/><path d="M646 42L612 150H682z" fill="url(#lc)"/><circle cx="646" cy="41" r="4" fill="#FFF1C7"/></g>
  <path id="f-pan" class="flow" d="M300 160V205" stroke="#C99A32"/>
  <path id="f-house" class="flow" d="M291 218H272" stroke="#C99A32"/>
  <path id="f-pole" class="flow" d="M309 210C380 196 500 150 578 92" stroke="#C99A32"/>
  ${t === 'bateria' ? '<path id="f-bat" class="flow" d="M309 218H312" stroke="#0B8560"/>' : ''}
  <g><rect x="291" y="205" width="18" height="23" rx="2.5" fill="url(#bb)" stroke="#39465F" stroke-width=".9"/><rect x="293.500" y="208" width="13" height="8" rx="1" fill="#141C2E"/><path id="i-w" d="M295 212q1.200-2.400 2.400 0t2.400 0 2.400 0 2.400 0" fill="none" stroke="#E8C885" stroke-width=".8"/><circle id="led" cx="295.500" cy="222.500" r="1.5" fill="#16B883"/><path d="M299 222.500h7" stroke="#99A4B7" stroke-width="1.3" stroke-linecap="round"/></g>
  ${bat}
  </g>
  </svg>`;
}
/* ---------- animação: 30 segundos = 24 horas ---------- */
const DAY_MS = 30000;
const SKY: [number, string, string][] = [[0, '#0E1A33', '#22325A'], [5, '#16244A', '#4A4A74'], [6.5, '#6D93CF', '#F6C89B'], [9, '#A9D3F7', '#FBEFD2'], [13, '#BFE1FB', '#FFF8E4'], [16.5, '#9CC2EC', '#FBDFAE'], [18.3, '#5570A9', '#EFA67B'], [20, '#1B2A52', '#3F3C66'], [24, '#0E1A33', '#22325A']];
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
function skyAt(h: number) { for (let i = 0; i < SKY.length - 1; i++) { const [ah, a1, a2] = SKY[i], [bh, b1, b2] = SKY[i + 1]; if (h >= ah && h <= bh) { const t = (h - ah) / (bh - ah); return `linear-gradient(180deg, ${mix(a1, b1, t)}, ${mix(a2, b2, t)})`; } } return ''; }
/* Dia: painel → inversor → casa, bateria e poste. Noite: bateria e poste → inversor → casa. */
function energyAt(h: number, type: string) {
  const sun = h >= 6 && h <= 18 ? Math.sin(((h - 6) / 12) * Math.PI) : 0, gen = sun > .1, hasBat = type === 'bateria';
  return { sun, gen, panels: gen, house: true, poleOut: gen, poleIn: !gen, batCharge: hasBat && gen, batUse: hasBat && !gen };
}
function statusAt(e: { gen: boolean }, type: string) {
  if (e.gen) return type === 'bateria' ? 'Gerando: abastece a casa, carrega a bateria e envia o que sobra ao poste.' : 'Gerando: abastece a casa e envia o que sobra ao poste.';
  return type === 'bateria' ? 'Sem sol: a bateria e o poste alimentam o inversor e a casa.' : 'Sem sol: o poste alimenta o inversor e a casa.';
}
const batLevel = (h: number) => (h >= 6 && h <= 18 ? .25 + .75 * ((h - 6) / 12) : h > 18 ? 1 - .75 * ((h - 18) / 12) : 1 - .75 * ((h + 6) / 12));
let hourNow = 8, lastT = 0, lastStatus = '';
/** Estado da animação: a tela troca o tipo do sistema e o tocar e pausar */
export const day = { playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, type: 'ongrid' };
function paint(h: number) {
  const g = (id: string) => document.getElementById(id)!, box = g('sky'); if (!box) return;
  const e = energyAt(h, day.type);
  box.style.background = skyAt(h);
  const f = (h - 6) / 12, sx = 40 + f * 640, sy = 120 - e.sun * 90;
  g('sun').setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
  g('sun').style.opacity = h >= 5.6 && h <= 18.4 ? '1' : '0';
  const dark = h >= 19.5 || h <= 4.8 ? 1 : h > 18 ? (h - 18) / 1.5 : h < 6.3 ? (6.3 - h) / 1.5 : 0;
  g('night').setAttribute('opacity', (dark * .6).toFixed(3));
  g('stars').setAttribute('opacity', dark.toFixed(3));
  g('moon').setAttribute('opacity', dark.toFixed(3));
  g('glow').setAttribute('opacity', Math.max(dark, .0).toFixed(3));
  g('f-pan').style.opacity = e.panels ? '1' : '0';
  const pole = g('f-pole');
  pole.classList.toggle('rev', e.poleIn); pole.setAttribute('stroke', e.poleIn ? '#5F8FE0' : '#C99A32');
  const bf = g('f-bat');
  if (bf) bf.classList.toggle('rev', e.batUse);
  const lvl = g('b-lvl');
  if (lvl) { const H = BAT.h - 8, l = batLevel(h); lvl.setAttribute('y', (4 + H * (1 - l)).toFixed(1)); lvl.setAttribute('height', (H * l).toFixed(1)); }
  g('led').setAttribute('fill', e.gen ? '#16B883' : '#E8C885');
  g('clock').textContent = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60 / 10) * 10).padStart(2, '0')}`;
  const st = statusAt(e, day.type);
  if (st !== lastStatus || !g('st').textContent) { lastStatus = st; g('st').textContent = st; }
}
/** Roda o dia enquanto a tela está aberta. Devolve como parar. */
export function startDay(): () => void {
  let id = 0;
  lastT = 0;
  const frame = (t: number) => {
    if (day.playing && lastT) hourNow = (hourNow + ((t - lastT) / DAY_MS) * 24) % 24;
    lastT = t;
    paint(hourNow);
    id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(id);
}

/* ---------- gráfico de projeção ---------- */
export function projectionSvg(R: { payback: number | null; save: number; paid: number }): string {
  const Y = horizonYears(R.payback), W = 620, H = 196, L = 16, B = 28, total = R.save * 12 * Y, top = Math.max(total, R.paid, 1), mx = Y * 12, y0 = new Date().getFullYear();
  const x = (m: number) => L + (m / mx) * (W - L - 16), y = (v: number) => H - B - (v / top) * (H - B - 16), pb = R.payback && R.payback <= mx ? R.payback : null;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Economia acumulada em ${Y} anos: ${brl(total)}. Total investido: ${brl(R.paid)}." style="width:100%;height:auto;display:block;margin-top:8px"><defs><linearGradient id="pa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8C885" stop-opacity=".65"/><stop offset="1" stop-color="#E8C885" stop-opacity=".05"/></linearGradient></defs>
  ${Array.from({ length: Y + 1 }, (_, a) => `<path d="M${x(a * 12)} 12V${H - B}" stroke="#E7E2D4"/><text x="${x(a * 12)}" y="${H - 9}" text-anchor="${a === 0 ? 'start' : a === Y ? 'end' : 'middle'}" font-size="13" font-weight="600" fill="#626C84">${a ? y0 + a : 'Hoje'}</text>`).join('')}
  <path d="M${x(0)} ${y(0)}L${x(mx)} ${y(total)}V${y(0)}Z" fill="url(#pa)"/><path d="M${x(0)} ${y(0)}L${x(mx)} ${y(total)}" stroke="#A98434" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M${x(0)} ${y(R.paid)}H${x(mx)}" stroke="#1B2A49" stroke-width="2" stroke-dasharray="6 5"/>
  ${pb ? `<circle cx="${x(pb)}" cy="${y(R.paid)}" r="8" fill="#1B2A49" stroke="#fff" stroke-width="3"/>` : ''}</svg>`;
}
export const whenPaid = (m: number | null) => { if (m == null) return ''; const d = new Date(); d.setMonth(d.getMonth() + Math.round(m)); return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };

