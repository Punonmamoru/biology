// A12 植物ホルモン（オーキシン）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, tokenColor, keepRedrawn } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { ORGANS, effect, horizontal, X_MIN, X_MAX } from '../models/auxin.js';
import { sample } from '../lib/series.js';

const supText = (x) => `10${String(Math.round(x)).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`;
const BEND = { up: '上へ曲がる', down: '下へ曲がる', none: 'ほとんど曲がらない' };

// 水平に置いた芽ばえの模式図。茎は右、根は左にのびる
function drawSeedling(canvas, stem, root) {
  const W = Math.max(300, canvas.parentElement ? canvas.parentElement.clientWidth : 340);
  const H = 170;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fg = tokenColor('fg');
  const bg = tokenColor('surface');
  const c2 = tokenColor('c2');
  const c3 = tokenColor('c3');
  const muted = tokenColor('muted');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const font = getComputedStyle(document.body).fontFamily;
  const fs = W < 380 ? 11 : 12.5;
  const cx = W / 2;
  const cy = H / 2;
  const len = W * 0.36;
  const angleOf = (r) => (r.bend === 'none' ? 0 : Math.min(1, Math.abs(r.low - r.up) * 1.6) * (Math.PI / 3) * (r.bend === 'up' ? 1 : -1));
  const organ = (dir, r, color, label) => {
    const a = angleOf(r);
    g.strokeStyle = color;
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx, cy);
    // 根元側はまっすぐ、先端側で曲がる（2次ベジェ）
    const mx = cx + dir * len * 0.55;
    const ex = mx + dir * len * 0.45 * Math.cos(a);
    const ey = cy - len * 0.45 * Math.sin(a);
    g.quadraticCurveTo(mx + dir * len * 0.2, cy, ex, ey);
    g.stroke();
    g.font = `bold ${fs}px ${font}`;
    g.fillStyle = color;
    g.textAlign = dir > 0 ? 'right' : 'left';
    g.textBaseline = 'middle';
    g.fillText(label, dir > 0 ? W - 6 : 6, r.bend === 'up' ? H - 14 : 14);
  };
  organ(1, stem, c3, `茎：${BEND[stem.bend]}`);
  organ(-1, root, c2, `根：${BEND[root.bend]}`);
  g.fillStyle = fg;
  g.beginPath();
  g.ellipse(cx, cy, 10, 8, 0, 0, Math.PI * 2);
  g.fill();
  // 重力の向き
  g.strokeStyle = muted;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx, cy + 24);
  g.lineTo(cx, cy + 52);
  g.lineTo(cx - 5, cy + 45);
  g.moveTo(cx, cy + 52);
  g.lineTo(cx + 5, cy + 45);
  g.stroke();
  g.font = `${fs}px ${font}`;
  g.fillStyle = muted;
  g.textAlign = 'left';
  g.fillText('重力', cx + 8, cy + 42);
}

export const dojo = {
  tasks: [
    { id: 'same', text: '①で、同じ濃度でも、茎の成長は促進するのに根の成長は抑制する濃度を見つけよう。', short: '器官によって効果が違う' },
    { id: 'gravi', text: '②で、茎が上へ、根が下へ曲がる（茎は負、根は正の重力屈性）ようすを確かめよう。', short: '重力屈性' },
    { id: 'ratio', text: '②で、下側への濃度のかたよりを大きくすると、曲がり方が大きくなることを確かめよう（かたよりを2回以上変える）。', short: 'かたよりと曲がり方' },
    { id: 'strong', text: '②で上側の濃度を高くし、根の下側の成長が強く抑制される（根の下側の効果が負になる）ことを確かめよう。', short: '根の下側は抑制' },
  ],
  mount(root, ctx) {
    const st = { tab: 'curve', x: -7, xu: -7.5, ratio: 4, ratioMoves: 0, touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'curve', label: '①濃度と成長への効果' }, { value: 'gravi', label: '②水平に置いた芽ばえ' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: 'オーキシン濃度と成長への効果', aspect: 0.66 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);
    const canvas = h('canvas', { role: 'img', 'aria-label': '水平に置いた芽ばえの模式図' });
    const wrap = h('div', { class: 'chart-wrap' }, canvas);
    top.append(wrap);

    const sX = slider({ label: 'オーキシン濃度', min: X_MIN, max: X_MAX, step: 0.25, value: st.x, format: (v) => `約 ${supText(v)} mol/L`, onInput: (v) => { st.x = v; st.touched++; update(); } });
    const ctlCurve = h('div', null, sX.el);
    const sXu = slider({ label: '上側のオーキシン濃度', min: -9, max: -6, step: 0.25, value: st.xu, format: (v) => `約 ${supText(v)} mol/L`, onInput: (v) => { st.xu = v; st.touched++; update(); } });
    const sR = slider({ label: '下側の濃度は上側の何倍か', min: 1, max: 10, step: 1, value: st.ratio, format: (v) => `${v} 倍`, onInput: (v) => { st.ratio = v; st.ratioMoves++; update(); } });
    const ctlGravi = h('div', null, h('p', { class: 'small' }, '芽ばえを水平に置くと、オーキシンは重力の方向（下側）に多く移動する。茎と根で同じ濃度になるとした模式で、濃度は実際の芽ばえで起こる範囲の目安に限っている。'), sXu.el, sR.el);
    const exp = explainBox();
    root.append(panel('操作', ctlCurve, ctlGravi), panel('いま何が起きているか', exp.el));

    let last = null;
    const redraw = () => { if (st.tab === 'gravi' && last) drawSeedling(canvas, last.stem, last.root); };
    keepRedrawn(canvas, redraw);
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      new ResizeObserver(() => { if (wrap.clientWidth && wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; redraw(); } }).observe(wrap);
    }

    const curves = () => Object.entries(ORGANS).map(([id, o]) => ({ points: sample((x) => effect(id, x), X_MIN, X_MAX, 300), color: o.color, dash: o.dash, width: 3, label: o.name, labelAt: o.opt }));
    const baseSpec = () => ({
      x: { min: X_MIN, max: X_MAX, label: 'オーキシン濃度（mol/L・対数目盛り）', ticks: [-12, -10, -8, -6, -4, -2].map((v) => ({ v, text: supText(v) })) },
      y: { min: -1.15, max: 1.3, label: '成長への効果（相対値）', ticks: [{ v: -1, text: '抑制' }, { v: 0, text: '0' }, { v: 1, text: '促進' }] },
      regions: [],
    });
    const legendItems = (ids = Object.keys(ORGANS)) => legend(ids.map((id) => ORGANS[id]).map((o) => ({ label: `${o.name}（最適濃度 約${supText(o.opt)} mol/L）`, color: o.color, dash: o.dash })));

    function layout() {
      ctlCurve.hidden = st.tab !== 'curve';
      ctlGravi.hidden = st.tab !== 'gravi';
      wrap.hidden = st.tab !== 'gravi';
      update();
    }

    function drawCurve() {
      const x = st.x;
      title.replaceChildren('オーキシン濃度と成長への効果 ', modelNote('教科書の図の目安による模式'));
      chart.draw({
        ...baseSpec(),
        alt: `濃度 ${supText(x)} mol/L`,
        series: curves(),
        vlines: [{ x, color: 'fg', dash: 'dot' }],
        markers: Object.entries(ORGANS).map(([id, o]) => ({ x, y: effect(id, x), color: o.color, shape: id === 'root' ? 'circle' : id === 'bud' ? 'diamond' : 'square' })),
      });
      leg.replaceChildren(legendItems());
      note.textContent = '縦軸の0より上は成長を促進、下は抑制することを表す。最適濃度の値は目安で、植物の種類によって異なる。';
      const word = (v) => (v > 0.05 ? '促進' : v < -0.05 ? '抑制' : 'ほとんど影響しない');
      const e = Object.fromEntries(Object.keys(ORGANS).map((id) => [id, effect(id, x)]));
      exp.set([
        `濃度 約${supText(x)} mol/L では、根：${word(e.root)}、芽：${word(e.bud)}、茎：${word(e.stem)}。`,
        '最適濃度は根が最も低く、次に芽、茎が最も高い。根はオーキシンに対する感受性が高いので、茎の成長を促進するような濃度でも、根の成長は抑制される。',
        '同じ器官でも、最適濃度より高い濃度では促進の効果が小さくなり、さらに高い濃度では成長を抑制する。',
      ]);
      return { rootNeg: e.root < -0.05, stemPos: e.stem > 0.05 };
    }

    function drawGravi() {
      const s = horizontal('stem', st.xu, st.ratio);
      const r = horizontal('root', st.xu, st.ratio);
      last = { stem: s, root: r };
      title.replaceChildren('水平に置いた芽ばえの重力屈性 ', modelNote());
      chart.draw({
        ...baseSpec(),
        alt: `茎：${BEND[s.bend]}、根：${BEND[r.bend]}`,
        series: curves().filter((c) => c.label !== '芽'),
        regions: [{ x0: st.xu, x1: s.xLower, fill: 'region-4' }],
        markers: [
          { x: st.xu, y: s.up, color: 'c3', shape: 'square' },
          { x: s.xLower, y: s.low, color: 'c3', shape: 'square' },
          { x: st.xu, y: r.up, color: 'c2' },
          { x: r.xLower, y: r.low, color: 'c2' },
        ],
      });
      leg.replaceChildren(legendItems(['root', 'stem']));
      note.textContent = '塗った範囲が、上側（左端）から下側（右端）までの濃度。□が茎、●が根の、上側と下側での効果。';
      drawSeedling(canvas, s, r);
      canvas.setAttribute('aria-label', `茎は${BEND[s.bend]}、根は${BEND[r.bend]}`);
      const lines = [];
      lines.push(`茎：下側の効果 ${fmt(s.low, 2)}、上側 ${fmt(s.up, 2)}。${s.bend === 'up' ? '下側のほうがよく伸びるので、茎は上へ曲がる（負の重力屈性）。' : s.bend === 'down' ? '（この範囲では起こらない）' : '上側と下側の差がほとんどないので、ほとんど曲がらない。'}`);
      lines.push(`根：下側の効果 ${fmt(r.low, 2)}、上側 ${fmt(r.up, 2)}。${r.bend === 'down' ? '根にとっては下側の濃度が高すぎて成長が抑制されるので、上側のほうがよく伸び、根は下へ曲がる（正の重力屈性）。' : r.bend === 'up' ? '（この範囲では起こらない）' : '上側と下側の差がほとんどないので、ほとんど曲がらない。'}`);
      lines.push('根では、根冠の細胞が重力の方向を感じとり、オーキシンが下側に多く運ばれる。同じオーキシンのかたよりでも、器官によって最適濃度が違うので、茎と根で逆向きに曲がる。');
      exp.set(lines);
      return { stemBend: s.bend, rootBend: r.bend, rootLow: r.low };
    }

    function update() {
      const res = st.tab === 'curve' ? drawCurve() : drawGravi();
      ctx.update({ ...st, ...res });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'curve' && s.touched > 0 && s.rootNeg && s.stemPos;
dojo.tasks[1].check = (s) => s.tab === 'gravi' && s.stemBend === 'up' && s.rootBend === 'down';
dojo.tasks[2].check = (s) => s.tab === 'gravi' && s.ratioMoves >= 2;
dojo.tasks[3].check = (s) => s.tab === 'gravi' && s.rootLow < 0;
