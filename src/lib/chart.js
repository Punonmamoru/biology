// 共通グラフ描画部品（Canvas・ライブラリ不使用）
// グラフは「仕様オブジェクト（ただのデータ）」で記述し、ここで描画する。
// 色はCSSトークン名（'c1' など）で指定し、描画のたびに現在のテーマから読み取るので
// ダークモードでも線・文字が背景に溶けない。
import { h } from './dom.js';

export const DASHES = {
  solid: [],
  dash: [9, 5],
  dot: [2, 4],
  dashdot: [10, 4, 2, 4],
  long: [16, 6],
};

const live = new Set();

export function tokenColor(name) {
  if (!name) name = 'fg';
  if (name.startsWith('#') || name.startsWith('rgb')) return name;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
  return v || '#888';
}

export function redrawAllCharts() {
  for (const c of live) {
    if (!c.canvas.isConnected) live.delete(c);
    else c.redraw();
  }
}

// 自作の Canvas 図（模式図など）を、テーマ切替のときに描き直す対象に加える
export function keepRedrawn(canvas, redraw) {
  live.add({ canvas, redraw });
}

// きりのよい目盛り間隔
export function niceStep(range, target = 5) {
  const raw = range / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}

function ticksFor(ax) {
  if (ax.ticks) return ax.ticks.map((t) => (typeof t === 'object' ? t : { v: t }));
  if (ax.log) {
    const out = [];
    for (let e = Math.ceil(Math.log10(ax.min) - 1e-9); e <= Math.floor(Math.log10(ax.max) + 1e-9); e++) {
      out.push({ v: Math.pow(10, e) });
    }
    return out;
  }
  const step = ax.step || niceStep(ax.max - ax.min);
  const out = [];
  const start = Math.ceil(ax.min / step - 1e-9) * step;
  for (let v = start; v <= ax.max + step * 1e-6; v += step) out.push({ v: Number(v.toFixed(10)) });
  return out;
}

function tickText(ax, v) {
  if (ax.log) {
    if (v >= 1) return String(Math.round(v));
    return String(Number(v.toPrecision(1)));
  }
  const d = ax.digits != null ? ax.digits : 0;
  const s = Number(v.toFixed(d));
  return String(Object.is(s, -0) ? 0 : s);
}

function makeHatch(ctx, color, kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  g.beginPath();
  if (kind === 'cross') {
    g.moveTo(0, 4); g.lineTo(8, 4); g.moveTo(4, 0); g.lineTo(4, 8);
  } else if (kind === 'vert') {
    g.moveTo(2, 0); g.lineTo(2, 8); g.moveTo(6, 0); g.lineTo(6, 8);
  } else {
    g.moveTo(0, 8); g.lineTo(8, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(6, 10); g.lineTo(10, 6);
  }
  g.stroke();
  return ctx.createPattern(c, 'repeat');
}

// 棒グラフの系列ごとの塗り（1系列目はべた塗り、2系列目以降は模様。色だけに頼らない）
export const HATCHES = [null, 'diag', 'cross', 'vert'];
const hatchOf = (i) => HATCHES[i % HATCHES.length];

function haloText(ctx, text, x, y, color, bg) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = bg;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// spec を幅 W・高さ H（CSS px）で ctx に描く
export function drawSpec(ctx, W, H, spec) {
  const fg = tokenColor('fg');
  const muted = tokenColor('muted');
  const grid = tokenColor('grid');
  const bg = tokenColor('surface');
  const font = getComputedStyle(document.body).fontFamily;
  const small = W < 360;
  const fs = small ? 11 : 12.5;
  ctx.font = `${fs}px ${font}`;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const x = spec.x;
  const y = spec.y;
  const y2 = spec.y2;
  const pad = {
    l: (y.label ? fs + 10 : 4) + Math.max(...ticksFor(y).map((t) => ctx.measureText(t.text || tickText(y, t.v)).width), 10) + 8,
    r: y2 ? (y2.label ? fs + 10 : 4) + Math.max(...ticksFor(y2).map((t) => ctx.measureText(t.text || tickText(y2, t.v)).width), 10) + 8 : 14,
    t: spec.title ? fs + 14 : 12,
    b: (x.label ? fs + 10 : 4) + fs + 10,
  };
  const pw = Math.max(10, W - pad.l - pad.r);
  const ph = Math.max(10, H - pad.t - pad.b);

  const X = (v) => pad.l + ((v - x.min) / (x.max - x.min)) * pw;
  const mkY = (ax) => (v) => {
    if (ax.log) {
      const lv = Math.log10(Math.max(v, ax.min * 1e-3));
      return pad.t + ph - ((lv - Math.log10(ax.min)) / (Math.log10(ax.max) - Math.log10(ax.min))) * ph;
    }
    return pad.t + ph - ((v - ax.min) / (ax.max - ax.min)) * ph;
  };
  const Y = mkY(y);
  const Y2 = y2 ? mkY(y2) : Y;
  const yOf = (axis) => (axis === 'y2' ? Y2 : Y);

  if (spec.title) {
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(spec.title, pad.l, 4);
  }

  // 区間の塗り
  for (const r of spec.regions || []) {
    const x0 = X(Math.max(r.x0, x.min));
    const x1 = X(Math.min(r.x1, x.max));
    if (x1 <= x0) continue;
    ctx.fillStyle = tokenColor(r.fill || 'region');
    ctx.fillRect(x0, pad.t, x1 - x0, ph);
    if (r.label) {
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `bold ${fs}px ${font}`;
      haloText(ctx, r.label, (x0 + x1) / 2, pad.t + 3, fg, bg);
      ctx.font = `${fs}px ${font}`;
    }
  }

  // 目盛り・グリッド
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  // 目盛りの文字が重なるほど間隔がせまいときは、文字だけを間引く（線はすべて引く）
  const yTicks = ticksFor(y).filter((t) => t.v >= y.min - 1e-9 && t.v <= y.max + 1e-9);
  const yGap = yTicks.length > 1 ? Math.min(...yTicks.slice(1).map((t, i) => Math.abs(Y(t.v) - Y(yTicks[i].v)))) : Infinity;
  const yEvery = Math.max(1, Math.ceil((fs + 3) / yGap));
  yTicks.forEach((t, i) => {
    const py = Y(t.v);
    ctx.strokeStyle = grid;
    ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(pad.l + pw, py); ctx.stroke();
    ctx.fillStyle = muted;
    if (i % yEvery === 0) ctx.fillText(t.text || tickText(y, t.v), pad.l - 6, py);
  });
  if (y2) {
    ctx.textAlign = 'left';
    for (const t of ticksFor(y2)) {
      if (t.v < y2.min - 1e-9 || t.v > y2.max + 1e-9) continue;
      ctx.fillStyle = muted;
      ctx.fillText(t.text || tickText(y2, t.v), pad.l + pw + 6, Y2(t.v));
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (!spec.bars) {
    const xTicks = ticksFor(x).filter((t) => t.v >= x.min - 1e-9 && t.v <= x.max + 1e-9);
    const xw = Math.max(...xTicks.map((t) => ctx.measureText(t.text || tickText(x, t.v)).width), 1);
    const xGap = xTicks.length > 1 ? Math.min(...xTicks.slice(1).map((t, i) => Math.abs(X(t.v) - X(xTicks[i].v)))) : Infinity;
    const xEvery = Math.max(1, Math.ceil((xw + 6) / xGap));
    xTicks.forEach((t, i) => {
      const px = X(t.v);
      if (x.grid !== false) {
        ctx.strokeStyle = grid;
        ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, pad.t + ph); ctx.stroke();
      }
      ctx.fillStyle = muted;
      if (i % xEvery === 0) ctx.fillText(t.text || tickText(x, t.v), px, pad.t + ph + 5);
    });
  }

  // 軸
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ph);
  ctx.lineTo(pad.l + pw, pad.t + ph);
  if (y2) ctx.lineTo(pad.l + pw, pad.t);
  ctx.stroke();
  // 0 の線（負の値があるとき）
  if (!y.log && y.min < 0 && y.max > 0) {
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(pad.l + pw, Y(0)); ctx.stroke();
  }

  // 軸ラベル（入りきらないときは文字を小さくする）
  ctx.fillStyle = fg;
  const fitFont = (text, room) => {
    let size = fs;
    ctx.font = `bold ${size}px ${font}`;
    while (size > 8.5 && ctx.measureText(text).width > room) {
      size -= 0.5;
      ctx.font = `bold ${size}px ${font}`;
    }
  };
  if (x.label) {
    fitFont(x.label, W - 8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const half = ctx.measureText(x.label).width / 2;
    ctx.fillText(x.label, Math.min(Math.max(pad.l + pw / 2, half + 4), W - half - 4), H - 2);
  }
  if (y.label) {
    fitFont(y.label, H - 8);
    const half = ctx.measureText(y.label).width / 2;
    ctx.save();
    ctx.translate(fs / 2 + 3, Math.min(Math.max(pad.t + ph / 2, half + 4), H - half - 4));
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(y.label, 0, 0);
    ctx.restore();
  }
  if (y2 && y2.label) {
    fitFont(y2.label, H - 8);
    const half = ctx.measureText(y2.label).width / 2;
    ctx.save();
    ctx.translate(W - fs / 2 - 3, Math.min(Math.max(pad.t + ph / 2, half + 4), H - half - 4));
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(y2.label, 0, 0);
    ctx.restore();
  }
  ctx.font = `${fs}px ${font}`;

  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l - 1, pad.t - 1, pw + 2, ph + 2);
  ctx.clip();

  // 多角形の区画（バイオームの図など）。塗りのあと、名前は最後に書く
  for (const pg of spec.polygons || []) {
    if (!pg.points || pg.points.length < 3) continue;
    ctx.beginPath();
    pg.points.forEach(([px, py], i) => (i ? ctx.lineTo(X(px), yOf(pg.axis)(py)) : ctx.moveTo(X(px), yOf(pg.axis)(py))));
    ctx.closePath();
    ctx.fillStyle = tokenColor(pg.fill || 'region');
    ctx.fill();
    ctx.strokeStyle = tokenColor(pg.bold ? 'fg' : pg.stroke || 'muted');
    ctx.lineWidth = pg.bold ? 2.5 : 1;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // 棒グラフ
  if (spec.bars) {
    const cats = spec.bars.categories;
    const groups = spec.bars.groups;
    const slot = pw / cats.length;
    const bw = Math.min(56, (slot * 0.76) / groups.length);
    groups.forEach((g, gi) => {
      const col = tokenColor(g.color || 'c1');
      const fill = hatchOf(gi) ? makeHatch(ctx, col, hatchOf(gi)) : col;
      g.values.forEach((v, ci) => {
        const cx = pad.l + slot * (ci + 0.5) + (gi - (groups.length - 1) / 2) * bw;
        const top = Y(Math.max(v, y.min));
        ctx.fillStyle = fill;
        ctx.fillRect(cx - bw / 2 + 1, top, bw - 2, Y(y.min) - top);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(cx - bw / 2 + 1, top, bw - 2, Y(y.min) - top);
      });
    });
    // 期待値の目印（横線）
    for (const m of spec.bars.marks || []) {
      const ci = m.index;
      const cx = pad.l + slot * (ci + 0.5);
      ctx.strokeStyle = tokenColor(m.color || 'fg');
      ctx.lineWidth = 2;
      ctx.setLineDash(DASHES.dash);
      ctx.beginPath();
      ctx.moveTo(cx - slot * 0.45, Y(m.y));
      ctx.lineTo(cx + slot * 0.45, Y(m.y));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 水平線・垂直線
  for (const l of spec.hlines || []) {
    const yy = yOf(l.axis)(l.y);
    ctx.strokeStyle = tokenColor(l.color || 'muted');
    ctx.lineWidth = l.width || 1.5;
    ctx.setLineDash(DASHES[l.dash || 'dash']);
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + pw, yy); ctx.stroke();
  }
  for (const l of spec.vlines || []) {
    const xx = X(l.x);
    ctx.strokeStyle = tokenColor(l.color || 'muted');
    ctx.lineWidth = l.width || 1.5;
    ctx.setLineDash(DASHES[l.dash || 'dash']);
    ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, pad.t + ph); ctx.stroke();
  }
  ctx.setLineDash([]);

  // 折れ線
  const endLabels = [];
  for (const s of spec.series || []) {
    const Ys = yOf(s.axis);
    const col = tokenColor(s.color || 'c1');
    ctx.strokeStyle = col;
    ctx.lineWidth = s.width || 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(DASHES[s.dash || 'solid']);
    ctx.beginPath();
    let started = false;
    for (const [px, py] of s.points) {
      if (!Number.isFinite(px) || !Number.isFinite(py)) {
        started = false;
        continue;
      }
      const cx = X(px);
      const cy = Ys(py);
      if (!started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.label && s.points.length) {
      let p;
      if (s.labelAt != null) {
        p = s.points.reduce((best, q) => (Math.abs(q[0] - s.labelAt) < Math.abs(best[0] - s.labelAt) ? q : best), s.points[0]);
      } else {
        for (let i = s.points.length - 1; i >= 0; i--) {
          const q = s.points[i];
          if (q[0] <= x.max && Number.isFinite(q[1])) { p = q; break; }
        }
      }
      if (p) {
        const yv = Math.min(Math.max(Ys(p[1]), pad.t + 8), pad.t + ph - 8);
        endLabels.push({ x: X(p[0]), y: yv, text: s.label, color: col, align: s.labelAt != null ? 'center' : 'right' });
      }
    }
  }
  ctx.restore();

  // 文字どうしの重なりを避けて置く。候補の位置を順に試し、すでに置いた文字と重ならない最初の位置に書く
  const placed = [];
  const lh = fs + 2;
  const boxOf = (text, x, y, align, base) => {
    const w = ctx.measureText(text).width;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const y0 = base === 'top' ? y : base === 'bottom' ? y - lh : y - lh / 2;
    return { x0: x0 - 3, y0: y0 - 1, x1: x0 + w + 3, y1: y0 + lh + 1 };
  };
  const hits = (b) => placed.some((q) => b.x0 < q.x1 && q.x0 < b.x1 && b.y0 < q.y1 && q.y0 < b.y1);
  // 図の枠（目盛りの文字を除いた描画範囲）の中に収まるか
  const inside = (b) => b.x0 >= pad.l - 4 && b.x1 <= pad.l + pw + 4 && b.y0 >= pad.t - 4 && b.y1 <= pad.t + ph + 4;
  function put(text, cands, color) {
    let pick = null;
    for (const c of cands) {
      const b = boxOf(text, c.x, c.y, c.align, c.base);
      if (inside(b) && !hits(b)) { pick = { c, b }; break; }
    }
    if (!pick) {
      const c = cands[0];
      pick = { c, b: boxOf(text, c.x, c.y, c.align, c.base) };
    }
    ctx.textAlign = pick.c.align;
    ctx.textBaseline = pick.c.base;
    haloText(ctx, text, pick.c.x, pick.c.y, color, bg);
    placed.push(pick.b);
  }
  const shifts = [0, -lh, lh, -2 * lh, 2 * lh];

  // 多角形の名前
  for (const pg of spec.polygons || []) {
    if (!pg.label || !pg.at) continue;
    ctx.font = `${pg.bold ? 'bold ' : ''}${fs}px ${font}`;
    const px = X(pg.at[0]);
    const py = yOf(pg.axis)(pg.at[1]);
    put(pg.label, shifts.map((d) => ({ x: px, y: py + d, align: 'center', base: 'middle' })), fg);
  }
  ctx.font = `${fs}px ${font}`;

  // 点
  for (const m of spec.markers || []) {
    const cx = X(m.x);
    const cy = yOf(m.axis)(m.y);
    if (cx < pad.l - 2 || cx > pad.l + pw + 2 || cy < pad.t - 2 || cy > pad.t + ph + 2) continue;
    ctx.fillStyle = tokenColor(m.color || 'fg');
    ctx.strokeStyle = bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (m.shape === 'square') ctx.rect(cx - 5, cy - 5, 10, 10);
    else if (m.shape === 'diamond') { ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy); ctx.closePath(); }
    else ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (m.label) {
      ctx.font = `bold ${fs}px ${font}`;
      const right = cx > pad.l + pw * 0.75;
      const a1 = right ? 'right' : 'left';
      const a2 = right ? 'left' : 'right';
      const sx = (a) => cx + (a === 'right' ? -6 : 6);
      const ly = Math.max(cy - 6, pad.t + fs + 2) + (m.dy || 0);
      put(m.label, [
        { x: sx(a1), y: ly, align: a1, base: 'bottom' },
        { x: sx(a1), y: cy + 8, align: a1, base: 'top' },
        { x: sx(a2), y: ly, align: a2, base: 'bottom' },
        { x: sx(a2), y: cy + 8, align: a2, base: 'top' },
        { x: sx(a1), y: ly - lh, align: a1, base: 'bottom' },
        { x: sx(a1), y: cy + 8 + lh, align: a1, base: 'top' },
        { x: sx(a1), y: ly - 2 * lh, align: a1, base: 'bottom' },
        { x: sx(a2), y: ly - lh, align: a2, base: 'bottom' },
        { x: sx(a1), y: ly - 3 * lh, align: a1, base: 'bottom' },
        { x: sx(a2), y: ly - 2 * lh, align: a2, base: 'bottom' },
      ], tokenColor(m.color || 'fg'));
      ctx.font = `${fs}px ${font}`;
    }
  }

  // 線の直接ラベル（重なりを少しずらす）
  ctx.font = `bold ${fs}px ${font}`;
  ctx.textBaseline = 'middle';
  endLabels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) {
    const prev = endLabels[i - 1];
    const cur = endLabels[i];
    if (Math.abs(cur.x - prev.x) < 120 && cur.y - prev.y < fs + 3) cur.y = prev.y + fs + 3;
  }
  for (const l of endLabels) {
    const w = ctx.measureText(l.text).width;
    // 中央そろえのラベルも、図の左右の端からはみ出さないようにする
    const tx = l.align === 'right' ? Math.min(l.x - 4, pad.l + pw - 2) : Math.min(Math.max(l.x, pad.l + w / 2 + 2), pad.l + pw - w / 2 - 2);
    const ty = l.y - (l.align === 'right' ? 10 : 12);
    put(l.text, shifts.map((d) => ({ x: tx, y: ty + d, align: l.align, base: 'middle' })), l.color);
  }

  // 自由テキスト・垂直線ラベル
  for (const l of spec.vlines || []) {
    if (!l.label) continue;
    const xx = X(l.x);
    const al = xx > pad.l + pw * 0.7 ? 'right' : 'left';
    const vx = xx + (al === 'right' ? -4 : 4);
    const vy = pad.t + 2 + (l.dy || 0);
    put(l.label, [0, lh, 2 * lh, 3 * lh].map((d) => ({ x: vx, y: vy + d, align: al, base: 'top' })), tokenColor(l.color || 'muted'));
  }
  for (const l of spec.hlines || []) {
    if (!l.label) continue;
    const al = l.align || 'left';
    const lx = al === 'right' ? pad.l + pw - 4 : pad.l + 4;
    const hy = yOf(l.axis)(l.y);
    const other = al === 'right' ? pad.l + 4 : pad.l + pw - 4;
    put(l.label, [
      { x: lx, y: hy - 3, align: al, base: 'bottom' },
      { x: lx, y: hy + 3, align: al, base: 'top' },
      { x: other, y: hy - 3, align: al === 'right' ? 'left' : 'right', base: 'bottom' },
      { x: other, y: hy + 3, align: al === 'right' ? 'left' : 'right', base: 'top' },
    ], tokenColor(l.color || 'muted'));
  }
  for (const t of spec.texts || []) {
    ctx.textAlign = t.align || 'center';
    ctx.textBaseline = 'middle';
    haloText(ctx, t.text, X(t.x), yOf(t.axis)(t.y), tokenColor(t.color || 'fg'), bg);
    placed.push(boxOf(t.text, X(t.x), yOf(t.axis)(t.y), t.align || 'center', 'middle'));
  }
  if (spec.bars) {
    ctx.font = `bold ${fs}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = fg;
    const slot = pw / spec.bars.categories.length;
    spec.bars.categories.forEach((c, i) => ctx.fillText(c, pad.l + slot * (i + 0.5), pad.t + ph + 5));
  }
}

// 親要素の幅に合わせて描くグラフ。返り値の draw(spec) で再描画する。
export function createChart(parent, { aspect = 0.68, maxHeight = 420, label = 'グラフ' } = {}) {
  const canvas = h('canvas', { role: 'img', 'aria-label': label });
  const wrap = h('div', { class: 'chart-wrap' }, canvas);
  parent.append(wrap);
  const chart = {
    canvas,
    spec: null,
    draw(spec) {
      chart.spec = spec;
      chart.redraw();
    },
    redraw() {
      if (!chart.spec) return;
      const W = Math.max(200, wrap.clientWidth || 320);
      const H = Math.round(Math.min(maxHeight, W * aspect));
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.height = H + 'px';
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSpec(ctx, W, H, chart.spec);
      if (chart.spec.alt) canvas.setAttribute('aria-label', chart.spec.alt);
    },
  };
  live.add(chart);
  if (typeof ResizeObserver !== 'undefined') {
    let lastW = 0;
    new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (w && w !== lastW) {
        lastW = w;
        chart.redraw();
      }
    }).observe(wrap);
  }
  return chart;
}

// 凡例（線種のサンプル＋文字。色だけに頼らない）
export function legend(items) {
  const ul = h('ul', { class: 'legend' });
  for (const it of items) {
    const c = h('canvas', { width: 68, height: 24, 'aria-hidden': 'true' });
    const li = h('li', null, c, it.label);
    ul.append(li);
    const draw = () => {
      const g = c.getContext('2d');
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.clearRect(0, 0, 34, 12);
      if (it.bar) {
        const col = tokenColor(it.color);
        g.fillStyle = it.hatch ? makeHatch(g, col, it.hatch) : col;
        g.fillRect(8, 1, 18, 10);
        g.strokeStyle = col;
        g.lineWidth = 1;
        g.strokeRect(8, 1, 18, 10);
        return;
      }
      g.strokeStyle = tokenColor(it.color);
      g.lineWidth = 2.5;
      g.setLineDash((DASHES[it.dash || 'solid'] || []).map((d) => d * 0.8));
      g.beginPath();
      g.moveTo(1, 6);
      g.lineTo(33, 6);
      g.stroke();
    };
    draw();
    live.add({ canvas: c, redraw: draw });
  }
  return ul;
}

// 仕様のseriesから凡例項目をつくる
export function legendFromSpec(spec) {
  const items = (spec.series || []).filter((s) => s.legend !== false && (s.legendLabel || s.label)).map((s) => ({
    label: s.legendLabel || s.label,
    color: s.color || 'c1',
    dash: s.dash || 'solid',
  }));
  if (spec.bars) {
    spec.bars.groups.forEach((g, i) => items.push({ label: g.label, color: g.color || 'c1', bar: true, hatch: hatchOf(i) }));
  }
  return legend(items);
}
