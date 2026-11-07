import { useEffect, useRef } from 'react';

/** Fundo de papel amassado: malha irregular com alturas sorteadas. Cada faceta recebe luz pela inclinação, e os vincos saem retos. */
function paperUrl(): string {
  const W = 1600, H = 1200;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  let seed = 20;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  type P = [number, number, number];
  const tri = (A: P, B: P, C: P, alpha: number) => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const t = Math.min(1, Math.max(0, (nx * -0.5 + ny * -0.6 + nz * 0.62) / Math.hypot(nx, ny, nz)));
    const c = (d: number) => Math.round(d + (255 - d) * t);
    ctx.fillStyle = ctx.strokeStyle = `rgba(${c(176)},${c(184)},${c(200)},${alpha})`;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(C[0], C[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  const sheet = (cell: number, depth: number, alpha: number) => {
    const cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2, pts: P[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) pts.push([(x - 0.5 + (rnd() - 0.5) * 0.95) * cell, (y - 0.5 + (rnd() - 0.5) * 0.95) * cell, rnd() * depth * cell]);
    for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
      const p = pts[y * cols + x], q = pts[y * cols + x + 1], r = pts[(y + 1) * cols + x], s = pts[(y + 1) * cols + x + 1];
      if (rnd() < 0.5) { tri(p, q, r, alpha); tri(q, s, r, alpha); } else { tri(p, q, s, alpha); tri(p, s, r, alpha); }
    }
  };
  ctx.fillStyle = '#FBFBFD';
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1;
  sheet(210, 0.42, 1);
  sheet(82, 0.4, 0.42);
  sheet(34, 0.3, 0.16);
  return cv.toDataURL('image/jpeg', 0.86);
}

export function Paper() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    el.current!.style.backgroundImage = `url(${paperUrl()})`;
  }, []);
  return <div className="paper no-print" ref={el} aria-hidden="true" />;
}
