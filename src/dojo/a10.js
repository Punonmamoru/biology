// A10 筋収縮 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, tokenColor, keepRedrawn } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { tension, stimulusTimes, contractionType, TYPE_NAME, SINGLE_PEAK, sarcomereTension, bands, MYOSIN, ACTIN, BARE, L_PLATEAU_LO, L_PLATEAU_HI, L_ZERO } from '../models/muscle.js';
import { sample } from '../lib/series.js';

const DUR = 0.6;
const FREQS = [1, 2, 5, 8, 10, 15, 20, 30, 40, 50, 60, 80, 100];

// サルコメアの模式図
function drawSarcomere(canvas, L) {
  const W = Math.max(300, canvas.parentElement ? canvas.parentElement.clientWidth : 340);
  const H = 150;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fg = tokenColor('fg');
  const bg = tokenColor('surface');
  const c1 = tokenColor('c1');
  const c2 = tokenColor('c2');
  const muted = tokenColor('muted');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const font = getComputedStyle(document.body).fontFamily;
  const fs = W < 380 ? 11 : 12.5;
  const scale = (W - 24) / 4.0; // 4.0 μm を画面幅に
  const cx = W / 2;
  const X = (u) => cx + u * scale; // サルコメアの中央を 0 とした位置 u［μm］
  const text = (t, x, y, color = fg, align = 'center') => {
    g.font = `${fs}px ${font}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(t, x, y);
  };
  const yTop = 34;
  const yBot = 104;
  // Z膜
  g.strokeStyle = fg;
  g.lineWidth = 3;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(X((s * L) / 2), yTop - 8);
    g.lineTo(X((s * L) / 2), yBot + 8);
    g.stroke();
  }
  text('Z膜', X(-L / 2), yTop - 18);
  text('Z膜', X(L / 2), yTop - 18);
  // 細いフィラメント（アクチン）：Z膜から内側へ ACTIN
  g.strokeStyle = c1;
  g.lineWidth = 2;
  for (const y of [yTop + 6, yTop + 22, yTop + 38, yTop + 54, yTop + 70].slice(0, 5)) {
    if (y > yBot) continue;
    g.beginPath();
    g.moveTo(X(-L / 2), y);
    g.lineTo(X(-L / 2 + ACTIN), y);
    g.moveTo(X(L / 2), y);
    g.lineTo(X(L / 2 - ACTIN), y);
    g.stroke();
  }
  // 太いフィラメント（ミオシン）：中央に MYOSIN（Z膜にあたるときは Z膜まで）
  const half = Math.min(MYOSIN / 2, L / 2);
  g.strokeStyle = c2;
  g.lineWidth = 6;
  for (const y of [yTop + 14, yTop + 30, yTop + 46, yTop + 62]) {
    g.beginPath();
    g.moveTo(X(-half), y);
    g.lineTo(X(half), y);
    g.stroke();
    // 頭部のない中央部分を細く表示
    g.strokeStyle = bg;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(X(-BARE / 2), y);
    g.lineTo(X(BARE / 2), y);
    g.stroke();
    g.strokeStyle = c2;
    g.lineWidth = 6;
  }
  // 帯の表示
  const b = bands(L);
  const yb = yBot + 26;
  g.lineWidth = 1.5;
  g.strokeStyle = muted;
  const span = (u0, u1, y, label) => {
    if (u1 - u0 < 1e-6) return;
    g.beginPath();
    g.moveTo(X(u0), y);
    g.lineTo(X(u1), y);
    g.moveTo(X(u0), y - 4);
    g.lineTo(X(u0), y + 4);
    g.moveTo(X(u1), y - 4);
    g.lineTo(X(u1), y + 4);
    g.stroke();
    text(label, (X(u0) + X(u1)) / 2, y + 12, fg);
  };
  span(-b.A / 2, b.A / 2, yb, `暗帯 ${fmt(b.A, 2)}`);
  if (b.I > 0) {
    span(-L / 2, -b.A / 2, yb - 12, '明帯');
    span(b.A / 2, L / 2, yb - 12, '明帯');
  }
  if (b.H > 0) text(`H帯 ${fmt(b.H, 2)}`, cx, yTop - 18, c2);
}

export const dojo = {
  tasks: [
    { id: 'single', text: '①で刺激の頻度を5回/秒以下にして、1回ごとに収縮がもとにもどる（単収縮）ことを確かめよう。', short: '単収縮' },
    { id: 'incomplete', text: '①で、収縮がもどりきらないうちに次の収縮が重なる（不完全強縮）頻度を見つけよう。', short: '不完全強縮' },
    { id: 'complete', text: '①で、張力がなめらかに大きく保たれる（完全強縮）頻度にしよう。', short: '完全強縮' },
    { id: 'plateau', text: '②で、張力が最大になるサルコメアの長さの範囲を見つけよう。', short: '張力が最大の長さ' },
    { id: 'zero', text: '②で、サルコメアを長くして張力が0になる長さを確かめよう（太いフィラメントと細いフィラメントが重ならない）。', short: '重なりがないと張力0' },
  ],
  mount(root, ctx) {
    const st = { tab: 'freq', fi: 2, L: 2.6, touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'freq', label: '①刺激の頻度と収縮' }, { value: 'sarc', label: '②サルコメアの長さと張力' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '張力のグラフ', aspect: 0.62 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);
    const canvas = h('canvas', { role: 'img', 'aria-label': 'サルコメアの模式図' });
    const wrap = h('div', { class: 'chart-wrap' }, canvas);
    top.append(wrap);

    const sF = slider({ label: '刺激の頻度', min: 0, max: FREQS.length - 1, step: 1, value: st.fi, format: (v) => `${FREQS[v]} 回/秒`, onInput: (v) => { st.fi = v; st.touched++; update(); } });
    const sL = slider({ label: 'サルコメアの長さ', min: 1.2, max: 3.8, step: 0.05, value: st.L, format: (v) => `${fmt(v, 2)} μm`, onInput: (v) => { st.L = v; st.touched++; update(); } });
    const ctlF = h('div', null, sF.el);
    const ctlS = h('div', null, sL.el);
    const exp = explainBox();
    root.append(panel('操作', ctlF, ctlS), panel('いま何が起きているか', exp.el));

    const redraw = () => { if (st.tab === 'sarc') drawSarcomere(canvas, st.L); };
    keepRedrawn(canvas, redraw);
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      new ResizeObserver(() => { if (wrap.clientWidth && wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; redraw(); } }).observe(wrap);
    }

    function layout() {
      ctlF.hidden = st.tab !== 'freq';
      ctlS.hidden = st.tab !== 'sarc';
      wrap.hidden = st.tab !== 'sarc';
      update();
    }

    function drawFreq() {
      const f = FREQS[st.fi];
      const stim = stimulusTimes(f, DUR);
      const ct = contractionType(f);
      title.replaceChildren(`刺激の頻度 ${f} 回/秒での筋肉の張力 `, modelNote());
      chart.draw({
        alt: `${f} 回/秒：${TYPE_NAME[ct.type]}`,
        x: { min: 0, max: DUR, label: '時間（秒）', step: 0.1, digits: 1 },
        y: { min: 0, max: 1.05, label: '張力（相対値）', step: 0.2, digits: 1 },
        series: [{ points: sample((t) => tension(t, stim), 0, DUR, 900), color: 'c1', width: 3 }],
        hlines: [{ y: SINGLE_PEAK, color: 'c3', dash: 'dot', label: '単収縮の大きさ', align: 'right' }],
        markers: stim.length <= 12 ? stim.map((t) => ({ x: t, y: 0.02, color: 'c2', shape: 'diamond' })) : [],
      });
      leg.replaceChildren(legend([{ label: '張力', color: 'c1' }, { label: '単収縮のときの最大の張力', color: 'c3', dash: 'dot' }]));
      note.textContent = `◆は刺激を与えた時刻（${stim.length > 12 ? '頻度が高いので省略' : '刺激ごとに表示'}）。カエルの腓腹筋を想定した模式（単収縮は約0.1秒で、潜伏期は約0.01秒）。`;
      const lines = [`いまの収縮のようす：${TYPE_NAME[ct.type]}（刺激の間隔 ${fmt(1000 / f, 0)} ミリ秒）。`];
      if (ct.type === 'single') lines.push('刺激の間隔が単収縮の時間（約0.1秒）より長いので、1回の収縮がもとにもどってから次の刺激が来る。1回の刺激による収縮を単収縮という。');
      else if (ct.type === 'incomplete') lines.push('収縮がもとにもどりきらないうちに次の刺激が来るので、収縮が重なり合って張力が大きくなる。張力のグラフにぎざぎざが残る状態を不完全強縮という。');
      else lines.push('刺激の間隔がとても短いので、収縮が完全に重なり合い、張力がなめらかに大きく保たれる。これを完全強縮といい、単収縮よりずっと大きな張力が出る。ふだんの運動での筋収縮は強縮である。');
      exp.set(lines);
      return { type: ct.type };
    }

    function drawSarc() {
      const L = st.L;
      const T = sarcomereTension(L);
      const b = bands(L);
      title.replaceChildren('サルコメアの長さと張力 ', modelNote('カエルの骨格筋の測定にもとづく模式'));
      chart.draw({
        alt: `サルコメアの長さ ${fmt(L, 2)} μm で張力 ${fmt(T * 100, 0)}%`,
        x: { min: 1.2, max: 3.8, label: 'サルコメアの長さ（μm）', step: 0.2, digits: 1 },
        y: { min: 0, max: 115, label: '張力（最大＝100）', step: 20 },
        regions: [{ x0: L_PLATEAU_LO, x1: L_PLATEAU_HI, fill: 'region-3' }],
        series: [{ points: sample((x) => sarcomereTension(x) * 100, 1.2, 3.8, 520), color: 'c1', width: 3 }],
        vlines: [{ x: L, color: 'c2', dash: 'dot' }],
        markers: [{ x: L, y: T * 100, color: 'c2', label: `${fmt(T * 100, 0)}%` }],
      });
      leg.replaceChildren(legend([{ label: '最大の張力に対する割合', color: 'c1' }, { label: 'いまのサルコメアの長さ', color: 'c2', dash: 'dot' }]));
      note.textContent = `太いフィラメント（ミオシン）${MYOSIN} μm、細いフィラメント（アクチン）は Z膜から ${ACTIN} μm、太いフィラメントの中央の頭部のない部分 ${BARE} μm とした模式。下の図：青が細いフィラメント、朱の太い線が太いフィラメント。`;
      drawSarcomere(canvas, L);
      canvas.setAttribute('aria-label', `サルコメア ${fmt(L, 2)} μm。暗帯 ${fmt(b.A, 2)}、明帯 ${fmt(b.I, 2)}、H帯 ${fmt(b.H, 2)} μm`);
      const lines = [];
      lines.push(`暗帯（太いフィラメントの部分）${fmt(b.A, 2)} μm、明帯（1つのサルコメアの中の合計）${fmt(b.I, 2)} μm、H帯 ${fmt(b.H, 2)} μm。収縮するとき、細いフィラメントが太いフィラメントの間に滑り込むので、明帯とH帯は短くなるが、暗帯の長さは変わらない（滑り説）。`);
      if (L >= L_ZERO) lines.push(`サルコメアが ${L_ZERO} μm 以上では、太いフィラメントと細いフィラメントが重ならないので、ミオシン頭部がアクチンと結合できず、張力は0になる。`);
      else if (L > L_PLATEAU_HI) lines.push('サルコメアが長いほど、太いフィラメントと細いフィラメントの重なりが少なくなり、アクチンと結合できるミオシン頭部の数が減るので、張力は小さくなる。');
      else if (L >= L_PLATEAU_LO) lines.push(`${L_PLATEAU_LO}〜${L_PLATEAU_HI} μm では、すべてのミオシン頭部が細いフィラメントと重なっているので、張力は最大になる。`);
      else lines.push('サルコメアが短すぎると、細いフィラメントどうしが重なり合ったり、太いフィラメントが Z膜にぶつかったりして、張力は小さくなる。');
      exp.set(lines);
      return { T };
    }

    function update() {
      const r = st.tab === 'freq' ? drawFreq() : drawSarc();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'freq' && s.touched > 0 && s.type === 'single';
dojo.tasks[1].check = (s) => s.tab === 'freq' && s.type === 'incomplete';
dojo.tasks[2].check = (s) => s.tab === 'freq' && s.type === 'complete';
dojo.tasks[3].check = (s) => s.tab === 'sarc' && s.T >= 0.999;
dojo.tasks[4].check = (s) => s.tab === 'sarc' && s.L >= L_ZERO - 1e-9;
