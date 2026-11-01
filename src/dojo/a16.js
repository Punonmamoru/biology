// A16 動物の行動（ミツバチのダンス）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { tokenColor, keepRedrawn } from '../lib/chart.js';
import { slider, explainBox, panel, modelNote } from './common.js';
import { danceAngle, danceType, dancesPer15s, azName, SUN_SPEED } from '../models/behavior.js';

const rad = (d) => (d * Math.PI) / 180;
const angleText = (a) => (Math.abs(a) < 1e-9 ? '真上（0°）' : Math.abs(Math.abs(a) - 180) < 1e-9 ? '真下（180°）' : `真上から${a > 0 ? '右（時計回り）' : '左（反時計回り）'}に ${Math.abs(a)}°`);

function draw(canvas, st) {
  const W = Math.max(300, canvas.parentElement ? canvas.parentElement.clientWidth : 340);
  const H = Math.round(Math.min(260, W * 0.62));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fg = tokenColor('fg');
  const bg = tokenColor('surface');
  const muted = tokenColor('muted');
  const c1 = tokenColor('c1');
  const c2 = tokenColor('c2');
  const c5 = tokenColor('c5');
  const c3 = tokenColor('c3');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const font = getComputedStyle(document.body).fontFamily;
  const fs = W < 380 ? 11 : 12.5;
  const text = (t, x, y, color = fg, align = 'center', bold = false) => {
    g.font = `${bold ? 'bold ' : ''}${fs}px ${font}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(t, x, y);
  };
  const arrow = (x0, y0, x1, y1, color, width = 2.5) => {
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x1 - 9 * Math.cos(a - 0.4), y1 - 9 * Math.sin(a - 0.4));
    g.lineTo(x1 - 9 * Math.cos(a + 0.4), y1 - 9 * Math.sin(a + 0.4));
    g.closePath();
    g.fill();
  };
  // 左：上から見た地図（上が北）
  const mx = W * 0.25;
  const my = H * 0.55;
  const R = Math.min(W * 0.2, H * 0.36);
  text('上から見た地図', mx, 14, fg, 'center', true);
  g.strokeStyle = muted;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(mx, my, R, 0, Math.PI * 2);
  g.stroke();
  text('北', mx, my - R - 9, muted);
  text('南', mx, my + R + 9, muted);
  text('東', mx + R + 10, my, muted);
  text('西', mx - R - 10, my, muted);
  const dir = (az, r) => [mx + r * Math.sin(rad(az)), my - r * Math.cos(rad(az))];
  const [sx, sy] = dir(st.sun, R);
  g.fillStyle = c5;
  g.beginPath();
  g.arc(sx, sy, 8, 0, Math.PI * 2);
  g.fill();
  arrow(mx, my, ...dir(st.sun, R - 12), c5, 1.5);
  const [fx, fy] = dir(st.food, R * 0.8);
  arrow(mx, my, fx, fy, c3, 3);
  g.fillStyle = c3;
  g.fillRect(fx - 5, fy - 5, 10, 10);
  g.fillStyle = fg;
  g.fillRect(mx - 6, my - 6, 12, 12);
  text('巣', mx, my + 16, fg);
  // 右：巣板（垂直）上のダンス（上が重力と反対の方向）
  const cx = W * 0.75;
  const cy = H * 0.55;
  const r = Math.min(W * 0.18, H * 0.34);
  text('垂直な巣板の上のダンス', cx, 14, fg, 'center', true);
  g.strokeStyle = muted;
  g.strokeRect(cx - r - 10, cy - r - 10, 2 * r + 20, 2 * r + 20);
  arrow(cx - r - 2, cy + r * 0.6, cx - r - 2, cy - r * 0.6, muted, 1.2);
  text('上', cx - r - 2, cy - r * 0.6 - 8, muted);
  if (st.type === 'round') {
    g.strokeStyle = c2;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx - r * 0.25, cy, r * 0.25, 0, Math.PI * 2);
    g.arc(cx + r * 0.25, cy, r * 0.25, Math.PI, Math.PI * 3);
    g.stroke();
    text('円形ダンス', cx, cy + r + 2, c2, 'center', true);
    return;
  }
  const a = rad(st.dance);
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  // 8の字：直進部分（尻振り）＋左右のループ
  g.save();
  g.translate(cx, cy);
  g.rotate(a);
  g.strokeStyle = c2;
  g.lineWidth = 2.5;
  g.beginPath();
  g.ellipse(-r * 0.32, 0, r * 0.32, r * 0.6, 0, Math.PI / 2, (Math.PI * 3) / 2);
  g.moveTo(0, -r * 0.6);
  g.ellipse(r * 0.32, 0, r * 0.32, r * 0.6, 0, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i <= 20; i++) {
    const y = r * 0.6 - (i / 20) * r * 1.2;
    const x = (i % 2 ? 1 : -1) * 4;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
  arrow(cx, cy, cx + ux * r * 0.95, cy + uy * r * 0.95, c1, 2.5);
  g.strokeStyle = muted;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx, cy - r * 0.95);
  g.stroke();
  g.setLineDash([]);
  text(`${st.dance > 0 ? '右' : st.dance < 0 ? '左' : ''}${Math.abs(st.dance)}°`, cx + (st.dance >= 0 ? 10 : -10), cy - r * 0.35, c1, st.dance >= 0 ? 'left' : 'right', true);
}

export const dojo = {
  tasks: [
    { id: 'up', text: 'えさ場を太陽と同じ方位に置き、8の字ダンスの直進方向が真上になることを確かめよう。', short: '太陽の方向＝真上' },
    { id: 'down', text: 'えさ場を太陽と反対の方位に置き、直進方向が真下になることを確かめよう。', short: '太陽の反対＝真下' },
    { id: 'round', text: 'えさ場を近く（100 m 未満）にして、円形ダンスに変わることを確かめよう。', short: '円形ダンス' },
    { id: 'time', text: 'えさ場の位置はそのままで太陽の方位を変え（時刻を進め）、ダンスの角度が変わることを確かめよう。', short: '太陽が動くと' },
  ],
  mount(root, ctx) {
    const st = { sun: 180, food: 225, logD: Math.log10(800), sunMoves: 0, touched: 0 };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'ミツバチの8の字ダンス ', modelNote()));
    const canvas = h('canvas', { role: 'img', 'aria-label': '地図とダンスの模式図' });
    const wrap = h('div', { class: 'chart-wrap' }, canvas);
    const status = h('p', { class: 'small', 'aria-live': 'polite' });
    top.append(wrap, status, h('p', { class: 'small muted' }, '左：上から見た地図（●太陽、■えさ場、□巣）。右：巣の中の垂直な巣板。青い矢印が尻を振りながら直進する向き、点線が真上（重力と反対の方向）。'));

    const sSun = slider({ label: '太陽の方位', min: 90, max: 270, step: 15, value: st.sun, format: (v) => `${azName(v)}（${v}°・およそ${fmt(6 + (v - 90) / SUN_SPEED, 0)}時）`, onInput: (v) => { st.sun = v; st.sunMoves++; st.touched++; update(); } });
    const sFood = slider({ label: 'えさ場の方位', min: 0, max: 345, step: 15, value: st.food, format: (v) => `${azName(v)}（${v}°）`, onInput: (v) => { st.food = v; st.touched++; update(); } });
    const sD = slider({ label: '巣からえさ場までの距離', min: 1, max: Math.log10(5000), step: 0.01, value: st.logD, format: (v) => `${Math.round(Math.pow(10, v)).toLocaleString('ja-JP')} m`, onInput: (v) => { st.logD = v; st.touched++; update(); } });
    const exp = explainBox();
    root.append(panel('操作', sSun.el, sFood.el, sD.el), panel('いま何が起きているか', exp.el));

    let last = null;
    const redraw = () => last && draw(canvas, last);
    keepRedrawn(canvas, redraw);
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      new ResizeObserver(() => { if (wrap.clientWidth && wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; redraw(); } }).observe(wrap);
    }

    function update() {
      const d = Math.round(Math.pow(10, st.logD));
      const dance = danceAngle(st.sun, st.food);
      const type = danceType(d);
      last = { ...st, dance, type };
      redraw();
      const desc = type === 'round' ? '円形ダンス' : `8の字ダンス（直進方向：${angleText(dance)}）`;
      canvas.setAttribute('aria-label', `太陽 ${azName(st.sun)}、えさ場 ${azName(st.food)}、${d} m：${desc}`);
      status.textContent = `太陽 ${azName(st.sun)}・えさ場 ${azName(st.food)}・${d.toLocaleString('ja-JP')} m → ${desc}`;
      const lines = [];
      if (type === 'round') {
        lines.push(`えさ場が近い（${d} m）ので、円形ダンスを踊る。円形ダンスは、えさ場が巣の近くにあることを伝えるが、方向は表さない。`);
      } else {
        lines.push(`えさ場の方向は、太陽の方向から時計回りに ${((st.food - st.sun) % 360 + 360) % 360}°。巣板の上では、真上を太陽の方向とみなして、真上から同じ角度だけ回した向き（${angleText(dance)}）に尻を振りながら直進する。`);
        lines.push(`えさ場が遠いほどダンスはゆっくりになり、15秒あたりの8の字ダンスの回数は少なくなる（いまは約${fmt(dancesPer15s(d), 1)}回、模式）。仲間のミツバチは、ダンスについて回ることで、えさ場の方向と距離を知る。`);
      }
      lines.push(`太陽の方位は時刻とともに1時間に約${SUN_SPEED}°ずつ移動する。同じえさ場でも、時刻が変わるとダンスの角度は変わる。このようなしくみで、太陽の方向を基準にして方向を知ることを太陽コンパスという。`);
      exp.set(lines);
      ctx.update({ ...st, dance, type, d });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.touched > 0 && s.type === 'waggle' && s.dance === 0;
dojo.tasks[1].check = (s) => s.type === 'waggle' && Math.abs(Math.abs(s.dance) - 180) < 1e-9;
dojo.tasks[2].check = (s) => s.type === 'round';
dojo.tasks[3].check = (s) => s.type === 'waggle' && s.sunMoves >= 2;
