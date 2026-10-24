// A7 遺伝子発現の調節（ラクトースオペロン）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legendFromSpec, tokenColor, keepRedrawn } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { operonState, MUTANTS, LEVEL_NAME, diauxie, glucoseOutTime, DIAUXIE } from '../models/operon.js';

// オペロンの模式図（Canvas）。色はテーマのトークンから読むので、ダークモードでも見える
function drawOperon(canvas, s, mutant) {
  const W = Math.max(300, canvas.parentElement ? canvas.parentElement.clientWidth : 340);
  const H = 250;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fg = tokenColor('fg');
  const muted = tokenColor('muted');
  const bg = tokenColor('surface');
  const bg2 = tokenColor('surface-2');
  const c1 = tokenColor('c1');
  const c2 = tokenColor('c2');
  const c3 = tokenColor('c3');
  const c4 = tokenColor('c4');
  const c5 = tokenColor('c5');
  const ng = tokenColor('ng');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const font = getComputedStyle(document.body).fontFamily;
  const fs = W < 380 ? 11 : 12.5;
  const text = (t, x, y, color = fg, align = 'center', bold = false) => {
    g.font = `${bold ? 'bold ' : ''}${fs}px ${font}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 4;
    g.strokeStyle = bg;
    g.strokeText(t, x, y);
    g.fillStyle = color;
    g.fillText(t, x, y);
  };
  const X = (f) => 6 + f * (W - 12);
  const bandY = 138;
  const bandH = 20;
  const seg = (f0, f1, fill, label, color = fg) => {
    g.fillStyle = fill;
    g.fillRect(X(f0), bandY, X(f1) - X(f0), bandH);
    g.strokeStyle = fg;
    g.lineWidth = 1.2;
    g.strokeRect(X(f0), bandY, X(f1) - X(f0), bandH);
    if (label) text(label, (X(f0) + X(f1)) / 2, bandY + bandH / 2, color, 'center', true);
  };
  // DNA
  g.strokeStyle = muted;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(X(0), bandY + bandH / 2);
  g.lineTo(X(1), bandY + bandH / 2);
  g.stroke();
  const P = { reg: [0.02, 0.17], pro: [0.27, 0.38], op: [0.38, 0.47], z: [0.47, 0.72], y: [0.72, 0.86], a: [0.86, 0.98] };
  seg(...P.reg, bg2, mutant === 'noRepressor' ? '× 変異' : '');
  seg(...P.pro, bg2, '');
  seg(...P.op, mutant === 'operator' ? tokenColor('ng-soft') : bg2, mutant === 'operator' ? '×' : '');
  seg(...P.z, bg2, 'Z');
  seg(...P.y, bg2, 'Y');
  seg(...P.a, bg2, 'A');
  const mid = (k) => (X(P[k][0]) + X(P[k][1])) / 2;
  text('調節遺伝子', mid('reg'), bandY + bandH + 14, fg);
  text('プロモーター', mid('pro'), bandY + bandH + 14, fg);
  text('オペレーター', mid('op') + 6, bandY + bandH + 32, fg);
  text('構造遺伝子', (X(P.z[0]) + X(P.a[1])) / 2 + 10, bandY + bandH + 50, fg);
  g.strokeStyle = muted;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(mid('op'), bandY + bandH);
  g.lineTo(mid('op') + 6, bandY + bandH + 24);
  g.stroke();

  // 調節遺伝子 → リプレッサー
  const repFree = { x: mid('reg') + 30, y: 52 };
  const repOn = { x: mid('op'), y: bandY - 16 };
  if (s.repressorMade) {
    g.strokeStyle = muted;
    g.lineWidth = 1.5;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(mid('reg'), bandY - 2);
    g.lineTo(mid('reg'), repFree.y + 16);
    g.stroke();
    g.setLineDash([]);
    text('転写・翻訳', mid('reg') + 4, 100, muted, 'left');
  }
  const repressor = (x, y) => {
    g.fillStyle = c2;
    g.strokeStyle = fg;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - 24, y - 12);
    g.lineTo(x + 24, y - 12);
    g.lineTo(x + 24, y + 4);
    g.lineTo(x + 10, y + 4);
    g.lineTo(x + 10, y + 13);
    g.lineTo(x - 10, y + 13);
    g.lineTo(x - 10, y + 4);
    g.lineTo(x - 24, y + 4);
    g.closePath();
    g.fill();
    g.stroke();
  };
  if (s.repressorMade) {
    if (s.repressorBound) {
      repressor(repOn.x, repOn.y);
      text('リプレッサーが結合', repOn.x + 28, repOn.y - 14, c2, 'left', true);
    } else {
      repressor(repFree.x, repFree.y);
      text('リプレッサー', repFree.x, repFree.y - 22, c2, 'center', true);
      if (s.inducerBound) {
        g.fillStyle = c5;
        g.strokeStyle = fg;
        g.beginPath();
        g.arc(repFree.x + 30, repFree.y + 2, 8, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        text('← ラクトースからできる物質が結合', repFree.x + 42, repFree.y, fg, 'left');
      } else if (mutant === 'operator') {
        text('オペレーターに結合できない', repFree.x + 30, repFree.y, fg, 'left');
      }
    }
  } else {
    text('リプレッサーがつくられない', mid('reg') + 4, 96, ng, 'left', true);
  }

  // 転写を促進するタンパク質（グルコースがないとき。発展）
  if (s.activatorBound) {
    g.fillStyle = c4;
    g.strokeStyle = fg;
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(X(P.pro[0]) - 10, bandY - 9, 13, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  // RNAポリメラーゼ
  const polX = mid('pro');
  g.fillStyle = c1;
  g.strokeStyle = fg;
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(polX, bandY - 2, 20, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // 転写（mRNA）
  if (s.level !== 'off') {
    const y = 92;
    const x0 = X(P.z[0]);
    const x1 = X(P.a[1]);
    g.strokeStyle = c3;
    g.lineWidth = s.level === 'high' ? 3 : 1.5;
    g.setLineDash(s.level === 'high' ? [] : [5, 4]);
    g.beginPath();
    for (let x = x0; x <= x1; x += 2) {
      const yy = y + Math.sin((x - x0) / 6) * 4;
      if (x === x0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
    g.setLineDash([]);
    text(s.level === 'high' ? 'mRNA（さかんに転写）' : 'mRNA（わずか）', (x0 + x1) / 2, y - 18, c3, 'center', true);
    text(s.level === 'high' ? '→ 酵素が多量につくられる' : '→ 酵素はわずか', (x0 + x1) / 2, y + 22, c3, 'center');
  } else {
    text('転写されない', (X(P.z[0]) + X(P.a[1])) / 2, 92, muted, 'center', true);
  }
}

const T = DIAUXIE.T;

export const dojo = {
  tasks: [
    { id: 'off', text: 'ラクトースを「なし」にして、リプレッサーがオペレーターに結合し、構造遺伝子が転写されないことを確かめよう。', short: 'ラクトースなし → オフ' },
    { id: 'on', text: 'ラクトースあり・グルコースなしにして、転写がオンになることを確かめよう。', short: 'ラクトースあり → オン' },
    { id: 'glc', text: '（発展）ラクトースとグルコースが両方あるとき、転写がわずかしか起こらないことを確かめよう。', short: 'グルコースがあるとき' },
    { id: 'mut', text: '「変異」を切り替えて、ラクトースがなくても転写される変異を見つけよう。', short: 'つねに転写される変異' },
    { id: 'diauxie', text: '②で時刻を動かし、グルコースがなくなったあとで転写がオンになり、酵素が増えることを確かめよう。', short: '二段階の増殖' },
  ],
  mount(root, ctx) {
    const st = { tab: 'switch', lactose: false, glucose: false, mutant: 'none', t: 2, touched: 0 };
    const run = diauxie();
    const tG = glucoseOutTime(run);

    const tabs = segmented({ label: '表示', options: [{ value: 'switch', label: '①スイッチの切替' }, { value: 'culture', label: '②培養の時間変化' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    top.append(h('h2', null, 'ラクトースオペロン（大腸菌） ', modelNote()));
    const canvas = h('canvas', { role: 'img', 'aria-label': 'ラクトースオペロンの模式図' });
    const wrap = h('div', { class: 'chart-wrap' }, canvas);
    const status = h('p', { class: 'small', 'aria-live': 'polite' });
    const key = (color, shape, label) => h('li', null, h('span', { class: 'swatch ' + shape, style: { background: `var(--${color})` }, 'aria-hidden': 'true' }), label);
    top.append(wrap, h('ul', { class: 'legend' }, key('c2', 'rep', 'リプレッサー（凸形）'), key('c1', 'oval', 'RNAポリメラーゼ（楕円）'), key('c5', 'dot', 'ラクトースからできる物質（円）'), key('c4', 'oval', '転写を促進するタンパク質（小さな楕円・発展）'), key('c3', 'wave', 'mRNA（波線）')), status, h('p', { class: 'small muted' }, 'Z・Y・A は、ラクトースの分解と取り込みにはたらく酵素などの構造遺伝子（Z：β-ガラクトシダーゼ）。転写を促進するタンパク質（CRP）のはたらきは発展的な内容。'));
    const sub = h('div');
    top.append(sub);
    const chart = createChart(sub, { label: '菌の数と酵素の量の時間変化', aspect: 0.66 });
    const leg = h('div');
    sub.append(leg);

    const segL = segmented({ label: 'ラクトース', options: [{ value: false, label: 'ラクトースなし' }, { value: true, label: 'ラクトースあり' }], value: st.lactose, onChange: (v) => { st.lactose = v; st.touched++; update(); } });
    const segG = segmented({ label: 'グルコース', options: [{ value: false, label: 'グルコースなし' }, { value: true, label: 'グルコースあり' }], value: st.glucose, onChange: (v) => { st.glucose = v; st.touched++; update(); } });
    const segM = segmented({ label: '変異', options: Object.entries(MUTANTS).map(([value, m]) => ({ value, label: m.short })), value: st.mutant, onChange: (v) => { st.mutant = v; st.touched++; update(); } });
    const ctlSwitch = h('div', null, segL.el, segG.el, segM.el);
    const sT = slider({ label: '培養をはじめてからの時間', min: 0, max: T, step: 0.1, value: st.t, format: (v) => `${fmt(v, 1)} 時間`, onInput: (v) => { st.t = v; update(); } });
    const ctlCulture = h('div', null, h('p', { class: 'small' }, 'グルコースとラクトースを両方含む培地で、野生型の大腸菌を培養する。'), sT.el);
    const exp = explainBox();
    root.append(panel('操作', ctlSwitch, ctlCulture), panel('いま何が起きているか', exp.el));

    let last = null;
    const redraw = () => last && drawOperon(canvas, last.s, last.mutant);
    keepRedrawn(canvas, redraw);
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      new ResizeObserver(() => {
        if (wrap.clientWidth && wrap.clientWidth !== lastW) {
          lastW = wrap.clientWidth;
          redraw();
        }
      }).observe(wrap);
    }

    function layout() {
      ctlSwitch.hidden = st.tab !== 'switch';
      ctlCulture.hidden = st.tab !== 'culture';
      sub.hidden = st.tab !== 'culture';
      update();
    }

    function cultureState() {
      const i = Math.min(run.length - 1, Math.round(st.t / (run[1].t - run[0].t)));
      return run[i];
    }

    function update() {
      let cond;
      let q = null;
      if (st.tab === 'switch') cond = { lactose: st.lactose, glucose: st.glucose, mutant: st.mutant };
      else {
        q = cultureState();
        cond = { lactose: q.L > 0.5, glucose: q.G > 0.5, mutant: 'none' };
      }
      const s = operonState(cond);
      last = { s, mutant: cond.mutant };
      redraw();
      canvas.setAttribute('aria-label', `ラクトース${cond.lactose ? 'あり' : 'なし'}、グルコース${cond.glucose ? 'あり' : 'なし'}：${LEVEL_NAME[s.level]}`);
      status.textContent = `ラクトース ${cond.lactose ? 'あり' : 'なし'}・グルコース ${cond.glucose ? 'あり' : 'なし'}${cond.mutant !== 'none' ? '・' + MUTANTS[cond.mutant].name : ''} → ${LEVEL_NAME[s.level]}`;

      const lines = [];
      if (!s.repressorMade) {
        lines.push('調節遺伝子に変異があってリプレッサーがつくられないので、オペレーターに結合するものがない。RNAポリメラーゼはいつでも転写を進められるので、ラクトースがなくても構造遺伝子が転写される。');
      } else if (s.repressorBound) {
        lines.push(cond.mutant === 'noInducer' && cond.lactose
          ? 'リプレッサーが、ラクトースからできる物質と結合できない変異をもつので、ラクトースがあってもリプレッサーはオペレーターに結合したまま。構造遺伝子は転写されない。'
          : '調節遺伝子からつくられたリプレッサー（調節タンパク質）がオペレーターに結合している。そのため、RNAポリメラーゼがプロモーターに結合しても転写を進められず、構造遺伝子は転写されない。');
        lines.push('ラクトースがないときに、ラクトースを分解する酵素をつくらないことで、むだなエネルギーや材料を使わずにすむ。');
      } else if (cond.mutant === 'operator') {
        lines.push('オペレーターの塩基配列が変わってリプレッサーが結合できないので、ラクトースの有無に関係なく転写を止められない。');
      } else {
        lines.push('ラクトースがあると、ラクトースからできる物質がリプレッサーに結合する。するとリプレッサーの形が変わってオペレーターに結合できなくなり、RNAポリメラーゼが構造遺伝子を転写する。');
      }
      if (s.level !== 'off') {
        lines.push(s.level === 'high'
          ? '構造遺伝子 Z・Y・A は1本のmRNAとしてまとめて転写され、β-ガラクトシダーゼ（ラクトースを分解する酵素）などがつくられる。このように、まとめて転写調節を受ける遺伝子群をオペロンという。'
          : '（発展）グルコースがあると、転写を促進するタンパク質（CRP）がはたらかないので、リプレッサーが外れていても転写はわずかしか起こらない。大腸菌は利用しやすいグルコースを先に使う。');
      }
      if (q) {
        lines.push(q.G > 0.5
          ? `培養 ${fmt(st.t, 1)} 時間：グルコースが残っているので、大腸菌はグルコースを使って増えている。ラクトースオペロンはほとんど転写されず、β-ガラクトシダーゼはほとんどない。`
          : q.L > 0.5
            ? `培養 ${fmt(st.t, 1)} 時間：グルコースは約 ${fmt(tG, 1)} 時間でなくなった。そのあと転写がオンになり、β-ガラクトシダーゼがつくられるまで増殖がいったん止まる。酵素がそろうと、ラクトースを使って再び増える（二段階の増殖）。`
            : `培養 ${fmt(st.t, 1)} 時間：ラクトースも使い切ったので、増殖は止まった。ラクトースがなくなるとリプレッサーが再びオペレーターに結合し、転写はオフにもどる。`);
        drawCulture();
      }
      exp.set(lines);
      ctx.update({ ...st, level: s.level, repressorBound: s.repressorBound, q, tG });
    }

    function drawCulture() {
      const spec = {
        alt: '菌の数とβ-ガラクトシダーゼの量の時間変化',
        x: { min: 0, max: T, label: '時間（時間）', step: 2 },
        y: { min: 1, max: 1000, log: true, label: '菌の数（相対値・対数目盛り）' },
        y2: { min: 0, max: 1.2, label: '量（相対値）', step: 0.2, digits: 1 },
        regions: [{ x0: 0, x1: tG, fill: 'region', label: 'グルコースを利用' }, { x0: tG, x1: T, fill: 'region-4', label: 'ラクトースを利用' }],
        series: [
          { points: run.map((r) => [r.t, r.N]), color: 'c1', width: 3, legendLabel: '菌の数（左の目盛り）' },
          { points: run.map((r) => [r.t, r.E]), color: 'c2', dash: 'dash', width: 3, axis: 'y2', legendLabel: 'β-ガラクトシダーゼの量（右の目盛り）' },
          { points: run.map((r) => [r.t, r.G / DIAUXIE.G0]), color: 'c3', dash: 'dot', width: 2, axis: 'y2', legendLabel: 'グルコースの残り（はじめ＝1、右の目盛り）' },
          { points: run.map((r) => [r.t, r.L / DIAUXIE.L0]), color: 'c4', dash: 'dashdot', width: 2, axis: 'y2', legendLabel: 'ラクトースの残り（はじめ＝1、右の目盛り）' },
        ],
        vlines: [{ x: st.t, color: 'fg', dash: 'dot', label: `${fmt(st.t, 1)} 時間`, dy: 22 }],
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));
    }

    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'switch' && s.touched > 0 && !s.lactose && s.mutant === 'none' && s.repressorBound;
dojo.tasks[1].check = (s) => s.tab === 'switch' && s.lactose && !s.glucose && s.mutant === 'none' && s.level === 'high';
dojo.tasks[2].check = (s) => s.tab === 'switch' && s.lactose && s.glucose && s.mutant === 'none' && s.level === 'low';
dojo.tasks[3].check = (s) => s.tab === 'switch' && !s.lactose && s.level !== 'off';
dojo.tasks[4].check = (s) => s.tab === 'culture' && s.q && s.t > s.tG + 1 && s.q.L > 0.5 && s.level === 'high';
