import { brl } from '../core/format';
import { horizonYears } from '../core/quote';

/* Desenhos da tela de Orçamento: casa com o dia animado e gráfico de projeção. Só números entram nesses textos. */

function panelCells(total: number, existing: number, type: string) {
  const n = Math.min(total, 40), rows = n <= 6 ? 2 : n <= 15 ? 3 : n <= 28 ? 4 : 5, cols = Math.ceil(n / rows), old = type === 'ampliacao' ? Math.min(n, existing) : n;
  const P = (u: number, v: number) => { const tl = 246, tr = 462, bl = 170, br = 486, t = 112, b = 186, l = tl + (bl - tl) * v, r = tr + (br - tr) * v; return [+(l + (r - l) * u).toFixed(1), +(t + (b - t) * v).toFixed(1)]; };
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, g = .01, u0 = c / cols + g, u1 = (c + 1) / cols - g, v0 = r / rows + .018, v1 = (r + 1) / rows - .018;
    const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], novo = i >= old;
    let cells = '';
    for (let k = 1; k < 4; k++) { const a = P(u0 + ((u1 - u0) * k) / 4, v0), b = P(u0 + ((u1 - u0) * k) / 4, v1); cells += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; }
    const m1 = P(u0, (v0 + v1) / 2), m2 = P(u1, (v0 + v1) / 2);
    out += `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="${novo ? 'url(#pvn)' : 'url(#pv)'}" stroke="#D5DCE8" stroke-width="1.1"/><path d="${cells}M${m1[0]} ${m1[1]}L${m2[0]} ${m2[1]}" stroke="#B9C8E2" stroke-opacity=".35" stroke-width=".5"/><polygon points="${pts[0].join(',')} ${P(u0 + (u1 - u0) * .55, v0).join(',')} ${P(u0, v0 + (v1 - v0) * .7).join(',')}" fill="#fff" opacity=".1"/>`;
  }
  return out;
}
function battery(x: number, y: number, w: number, h: number, ghost: boolean, bats: number) {
  if (ghost) return `<g fill="none" stroke="#1B2A49" stroke-width="1.8" stroke-dasharray="5 4" opacity=".6"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><rect x="${x + w / 2 - 8}" y="${y - 4}" width="16" height="4" rx="1.5"/><path d="M${x + w / 2 + 3} ${y + 13}l-8 13h7l-3 11 9-14h-7z"/></g>`;
  return `<ellipse cx="${x + w / 2}" cy="${y + h + 1}" rx="${w / 2 + 3}" ry="2.5" fill="#000" opacity=".2"/><rect x="${x + w / 2 - 8}" y="${y - 4}" width="16" height="5" rx="1.5" fill="#39465F"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#bb)" stroke="#39465F" stroke-width="1.6"/><clipPath id="bc"><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="3"/></clipPath><g clip-path="url(#bc)"><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="#2A354C"/><rect id="b-lvl" x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="url(#bg)"/></g><path d="M${x + w / 2 + 3} ${y + 12}l-8 13h7l-3 11 9-14h-7z" fill="#fff"/>${bats > 1 ? `<circle cx="${x + w}" cy="${y}" r="10" fill="#1B2A49"/><text x="${x + w}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#E8C885">${bats}</text>` : ''}`;
}
export function sceneSvg(total: number, existing: number, t: string, bats: number): string {
  const bat = t === 'bateria' ? battery(421, 281, 48, 49, false, bats) : t === 'hibrido' ? battery(421, 281, 48, 49, true, bats) : '';
  return `<svg viewBox="0 0 720 400" role="img" aria-label="Casa com ${total} painéis no telhado, inversor na parede ligado ao poste. Animação de um dia.">
  <defs>
    <linearGradient id="pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34558F"/><stop offset=".55" stop-color="#1A2E5C"/><stop offset="1" stop-color="#101E40"/></linearGradient>
    <linearGradient id="pvn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E3C377"/><stop offset="1" stop-color="#A9843A"/></linearGradient>
    <pattern id="tile" width="18" height="11" patternUnits="userSpaceOnUse"><rect width="18" height="11" fill="#B4654A"/><path d="M0 11a9 9 0 0 1 18 0" fill="#C4745A"/><path d="M0 11a9 9 0 0 1 18 0" fill="none" stroke="#8C4934" stroke-width=".9"/><path d="M-9 5.500a9 9 0 0 1 18 0M9 5.500a9 9 0 0 1 18 0" fill="none" stroke="#8C4934" stroke-width=".6" opacity=".6"/></pattern>
    <linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <pattern id="sid" width="12" height="9" patternUnits="userSpaceOnUse"><rect width="12" height="9" fill="#F6F1E6"/><path d="M0 8.500h12" stroke="#CFC6B2" stroke-width=".8"/></pattern>
    <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2115" stop-opacity=".42"/><stop offset="1" stop-color="#2A2115" stop-opacity="0"/></linearGradient>
    <linearGradient id="sd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C6BBA5"/><stop offset="1" stop-color="#A89C85"/></linearGradient>
    <pattern id="stn" width="26" height="12" patternUnits="userSpaceOnUse"><rect width="26" height="12" fill="#A9A08E"/><path d="M0 0h26M0 6h26M6 0v6M19 6v6" stroke="#857C6B" stroke-width=".8"/></pattern>
    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FB062"/><stop offset="1" stop-color="#5F8540"/></linearGradient>
    <pattern id="gt" width="14" height="9" patternUnits="userSpaceOnUse"><path d="M2 8l1-4M8 7l-1-4M12 9l1-3" stroke="#4E7134" stroke-width=".8" opacity=".55"/></pattern>
    <linearGradient id="bg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0B8560"/><stop offset="1" stop-color="#4FCF9F"/></linearGradient>
    <linearGradient id="bb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7F8FA"/><stop offset="1" stop-color="#C9D0DC"/></linearGradient>
    <radialGradient id="sg"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".95"/><stop offset=".3" stop-color="#FFD978" stop-opacity=".5"/><stop offset="1" stop-color="#FFD978" stop-opacity="0"/></radialGradient>
    <radialGradient id="wg"><stop offset="0" stop-color="#FFD97A" stop-opacity=".85"/><stop offset="1" stop-color="#FFD97A" stop-opacity="0"/></radialGradient>
    <radialGradient id="cl"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="dr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A4F28"/><stop offset=".5" stop-color="#9A6A38"/><stop offset="1" stop-color="#6E4522"/></linearGradient>
    <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9EBF7"/><stop offset=".5" stop-color="#9FBFD8"/><stop offset="1" stop-color="#7E9DB8"/></linearGradient>
    <linearGradient id="ch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A5664C"/><stop offset="1" stop-color="#7C4A36"/></linearGradient>
  </defs>
  <g id="stars" fill="#fff" opacity="0"><circle cx="70" cy="50" r="1.5"/><circle cx="160" cy="92" r="1"/><circle cx="250" cy="34" r="1.3"/><circle cx="360" cy="64" r="1"/><circle cx="470" cy="30" r="1.5"/><circle cx="560" cy="80" r="1"/><circle cx="640" cy="42" r="1.3"/><circle cx="110" cy="130" r="1"/><circle cx="600" cy="130" r="1"/></g>
  <g id="moon" opacity="0"><circle cx="110" cy="70" r="20" fill="#F3F5FB"/><circle cx="119" cy="64" r="18" fill="#1A2747"/></g>
  <g id="sun"><circle r="86" fill="url(#sg)"/><circle r="24" fill="#FFD66B"/></g>
  <g opacity=".85"><ellipse cx="170" cy="62" rx="70" ry="17" fill="url(#cl)"/><ellipse cx="205" cy="52" rx="44" ry="15" fill="url(#cl)"/><ellipse cx="580" cy="46" rx="76" ry="16" fill="url(#cl)"/><ellipse cx="540" cy="56" rx="40" ry="12" fill="url(#cl)"/></g>
  <path d="M0 300C90 268 190 280 300 292S560 262 720 292V400H0z" fill="#9DB787"/><path d="M0 312C140 292 260 306 380 310S620 290 720 306V400H0z" fill="#8AA973"/>
  <path d="M0 338C200 324 500 328 720 336V400H0z" fill="url(#gr)"/><path d="M0 338C200 324 500 328 720 336V400H0z" fill="url(#gt)"/>
  <path d="M214 338h50l46 62H164z" fill="#CFC8BA"/><path d="M226 338l-14 62M250 338l14 62M196 380h100" stroke="#ABA393" stroke-width="1"/>
  <ellipse cx="350" cy="340" rx="225" ry="9" fill="#2A3A20" opacity=".35"/>
  <g><path d="M40 340V252H172V340z" fill="url(#sid)"/><path d="M40 252H172" stroke="#2A2115" stroke-opacity=".28" stroke-width="10"/><path d="M26 254 62 222H172V254z" fill="url(#tile)"/><path d="M26 254 62 222H172V254z" fill="url(#rs)"/><path d="M22 256H172" stroke="#6E3E2C" stroke-width="4" stroke-linecap="round"/><rect x="58" y="268" width="96" height="70" rx="2" fill="#E9E5DC" stroke="#8D8473" stroke-width="1.4"/><path d="M58 280h96M58 292h96M58 304h96M58 316h96M58 328h96" stroke="#BDB6A6" stroke-width="1.2"/><path d="M58 340h96l-12 60H46z" fill="#BFB8AA"/><rect x="36" y="330" width="136" height="10" fill="url(#stn)"/></g>
  <g stroke-linecap="round"><path d="M662 342V128" stroke="#6F6A62" stroke-width="8"/><path d="M660 342V128" stroke="#8E887E" stroke-width="3"/><path d="M634 146h56" stroke="#57524B" stroke-width="5"/></g><g fill="#22304D"><circle cx="638" cy="141" r="3.5"/><circle cx="686" cy="141" r="3.5"/></g><path d="M638 141C670 158 700 158 730 148M686 141C700 150 715 150 730 146" fill="none" stroke="#3C4658" stroke-width="1.4"/>
  <rect x="424" y="62" width="30" height="54" fill="url(#ch)"/><rect x="420" y="56" width="38" height="9" rx="1.5" fill="#6A4030"/><path d="M424 76h30M424 90h30M424 104h30" stroke="#6A4030" stroke-width=".7" opacity=".6"/>
  <path d="M490 196 556 176V320L490 338z" fill="url(#sd)"/><path d="M490 196 556 176V320L490 338z" fill="url(#sid)" opacity=".22"/>
  <rect x="168" y="192" width="322" height="146" fill="url(#sid)"/>
  <rect x="168" y="322" width="322" height="16" fill="url(#stn)"/><path d="M490 322 556 306V320L490 338z" fill="#8F8675"/>
  <path d="M470 100 510 198 582 172z" fill="#A25B43"/><path d="M470 100 510 198 582 172z" fill="url(#tile)" opacity=".55"/>
  <path d="M238 100H470L510 198H134z" fill="url(#tile)"/><path d="M238 100H470L510 198H134z" fill="url(#rs)"/>
  <path d="M130 200H512" stroke="#6E3E2C" stroke-width="5" stroke-linecap="round"/><path d="M512 200 586 174" stroke="#6E3E2C" stroke-width="4" stroke-linecap="round"/><path d="M238 100H470" stroke="#7B4633" stroke-width="5" stroke-linecap="round"/><path d="M470 100 510 198" stroke="#7B4633" stroke-width="2.5"/>
  <rect x="132" y="202" width="380" height="6" rx="1" fill="#D7D2C6"/><path d="M132 208H512" stroke="#9D988B" stroke-width="1"/><path d="M484 208V322" stroke="#BDB8AB" stroke-width="5"/><path d="M482.500 208V322" stroke="#E9E5DB" stroke-width="1.2"/><path d="M484 322q0 8 8 8h6" fill="none" stroke="#BDB8AB" stroke-width="5"/><g><polygon points="508,234 540,225 540,272 508,281" fill="url(#gl)" stroke="#E7E0D1" stroke-width="4"/><path d="M524 229.500V276.500M508 257.500 540 248.500" stroke="#F4F0E6" stroke-width="2"/></g><g><rect x="276" y="244" width="6" height="14" rx="1.5" fill="#39465F"/><circle cx="279" cy="261" r="3.4" fill="#FFE3A0"/></g>
  <rect x="168" y="206" width="322" height="20" fill="url(#sh)"/>
  ${panelCells(total, existing, t)}
  <rect x="207" y="233" width="64" height="105" fill="#E7E0D1"/><rect x="212" y="238" width="54" height="100" fill="url(#dr)"/><g fill="none" stroke="#5A3A1C" stroke-width="1.2"><rect x="218" y="245" width="18" height="36" rx="1"/><rect x="242" y="245" width="18" height="36" rx="1"/><rect x="218" y="288" width="18" height="42" rx="1"/><rect x="242" y="288" width="18" height="42" rx="1"/></g><circle cx="259" cy="288" r="2.6" fill="#E8C885"/><rect x="200" y="336" width="78" height="6" rx="1" fill="#9D9586"/>
  <g><rect x="286" y="228" width="108" height="70" rx="2" fill="#E7E0D1"/><rect x="291" y="233" width="98" height="60" fill="url(#gl)" stroke="#5B5243" stroke-width="1.5"/><path d="M340 233v60M291 263h98" stroke="#F4F0E6" stroke-width="3"/><path d="M297 288l26-50h14l-26 50zM349 288l22-42h8l-22 42z" fill="#fff" opacity=".25"/><path d="M293 235h22c-2 18-9 28-22 32zM387 235h-22c2 18 9 28 22 32z" fill="#F5EFE3" opacity=".82"/><rect x="282" y="298" width="116" height="5" rx="1" fill="#C5BCA9"/><path d="M290 303h100l-5 16h-90z" fill="#7A5A36"/><g fill="#5F8A49"><circle cx="300" cy="299" r="7"/><circle cx="316" cy="296" r="8"/><circle cx="334" cy="298" r="7"/><circle cx="352" cy="296" r="8"/><circle cx="369" cy="298" r="7"/><circle cx="382" cy="300" r="5"/></g><g fill="#E7C65A"><circle cx="310" cy="292" r="2"/><circle cx="342" cy="293" r="2"/><circle cx="362" cy="291" r="2"/></g></g>
  
  <rect id="night" x="0" y="0" width="720" height="400" fill="#0F1A36" opacity="0"/>
  <g id="glow" opacity="0"><ellipse cx="340" cy="266" rx="112" ry="76" fill="url(#wg)"/><rect x="293" y="235" width="94" height="56" fill="#FFDD87"/><path d="M340 235v56M293 263h94" stroke="#7B5C2A" stroke-width="2.4"/><path d="M293 235h22c-2 18-9 28-22 32zM387 235h-22c2 18 9 28 22 32z" fill="#FFF3CF" opacity=".8"/></g>
  <path id="f-pan" class="flow" d="M444 192V222" stroke="#C99A32"/>
  <path id="f-house" class="flow" d="M420 247H394" stroke="#C99A32"/>
  <path id="f-pole" class="flow" d="M468 240C540 224 600 168 638 143" stroke="#C99A32"/>
  ${t === 'bateria' ? '<path id="f-bat" class="flow" d="M445 268V278" stroke="#0B8560"/>' : ''}
  <g><rect x="420" y="222" width="48" height="48" rx="6" fill="url(#bb)" stroke="#39465F" stroke-width="1.6"/><rect x="425" y="228" width="38" height="20" rx="2" fill="#141C2E"/><path id="i-w" d="M429 238q3.500-7 7 0t7 0 7 0 7 0" fill="none" stroke="#E8C885" stroke-width="1.5"/><circle id="led" cx="430" cy="259" r="3.2" fill="#16B883"/><path d="M439 259h22" stroke="#99A4B7" stroke-width="2.6" stroke-linecap="round"/></g>
  ${bat}
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
  const f = (h - 6) / 12, sx = 40 + f * 640, sy = 214 - e.sun * 176;
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
  if (lvl) { const H = 41, l = batLevel(h); lvl.setAttribute('y', (285 + H * (1 - l)).toFixed(1)); lvl.setAttribute('height', (H * l).toFixed(1)); }
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

