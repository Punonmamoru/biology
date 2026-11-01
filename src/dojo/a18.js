// A18 視覚 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { coneLog, rodLog, thresholdLog, breakTime, cones, rods, BLIND, retinaSize, EYE_DEPTH } from '../models/vision.js';
import { sample } from '../lib/series.js';

export const dojo = {
  tasks: [
    { id: 'break', text: '①で、暗順応の曲線が折れ曲がる時刻（錐体から桿体に切りかわるところ）を見つけよう。', short: '屈曲点' },
    { id: 'dark30', text: '①で、暗所に30分いると、はじめより何けたも弱い光を感じられるようになることを確かめよう。', short: '30分の暗順応' },
    { id: 'fovea', text: '②で、黄斑（中心窩、0°）には錐体が多く、桿体がほとんどないことを確かめよう。', short: '黄斑' },
    { id: 'blind', text: '②で、盲斑の位置に合わせて、視細胞がない（光を受容できない）ことを確かめよう。', short: '盲斑' },
  ],
  mount(root, ctx) {
    const st = { tab: 'dark', t: 0, angle: 0, dist: 30, width: 3, touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'dark', label: '①暗順応' }, { value: 'retina', label: '②視細胞の分布と盲斑' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: 'グラフ', aspect: 0.66 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const sT = slider({ label: '暗い所に入ってからの時間', min: 0, max: 40, step: 0.5, value: st.t, format: (v) => `${fmt(v, 1)} 分`, onInput: (v) => { st.t = v; st.touched++; update(); } });
    const ctlDark = h('div', null, sT.el);
    const sA = slider({ label: '黄斑からの角度（＋が鼻側）', min: -60, max: 60, step: 0.5, value: st.angle, format: (v) => `${v > 0 ? '鼻側 ' : v < 0 ? '耳側 ' : ''}${Math.abs(v)}°`, onInput: (v) => { st.angle = v; st.touched++; update(); } });
    const sD = slider({ label: '盲斑の計算：眼から紙までの距離', min: 20, max: 50, step: 1, value: st.dist, format: (v) => `${v} cm`, onInput: (v) => { st.dist = v; update(); } });
    const sW = slider({ label: '盲斑の計算：紙の上で見えなくなった範囲の幅', min: 1, max: 4, step: 0.1, value: st.width, format: (v) => `${fmt(v, 1)} cm`, onInput: (v) => { st.width = v; update(); } });
    const calc = h('div', { class: 'explain', 'aria-live': 'polite' });
    const ctlRetina = h('div', null, sA.el, h('h3', { style: { marginTop: '12px' } }, '盲斑の大きさを求める'), sD.el, sW.el, calc);
    const exp = explainBox();
    root.append(panel('操作', ctlDark, ctlRetina), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlDark.hidden = st.tab !== 'dark';
      ctlRetina.hidden = st.tab !== 'retina';
      update();
    }

    function drawDark() {
      const t = st.t;
      const bt = breakTime();
      const v = thresholdLog(t);
      title.replaceChildren('暗順応の曲線 ', modelNote());
      chart.draw({
        alt: `${fmt(t, 1)} 分：閾値 10^${fmt(v, 1)}`,
        x: { min: 0, max: 40, label: '暗い所に入ってからの時間（分）', step: 5 },
        y: { min: -2, max: 5, label: '感じとれる最小の光の強さ（対数・相対値）', ticks: [-2, -1, 0, 1, 2, 3, 4, 5].map((k) => ({ v: k, text: `10${k < 0 ? '⁻' : ''}${'⁰¹²³⁴⁵'[Math.abs(k)]}` })) },
        series: [
          { points: sample((x) => Math.min(coneLog(x), 5.2), 0, 40, 300), color: 'c2', dash: 'dot', width: 1.5, label: '錐体', labelAt: 30 },
          { points: sample((x) => Math.min(rodLog(x), 5.2), 0, 40, 300), color: 'c1', dash: 'dot', width: 1.5, label: '桿体', labelAt: 34 },
          { points: sample(thresholdLog, 0, 40, 400), color: 'fg', width: 3.5 },
        ],
        vlines: [{ x: t, color: 'c4', dash: 'dot' }],
        markers: [{ x: bt, y: thresholdLog(bt), color: 'c4', shape: 'diamond', label: '屈曲点' }, { x: t, y: v, color: 'c4' }],
      });
      leg.replaceChildren(legend([{ label: '感じとれる最小の光の強さ（閾値）', color: 'fg' }, { label: '錐体だけの場合', color: 'c2', dash: 'dot' }, { label: '桿体だけの場合', color: 'c1', dash: 'dot' }]));
      note.textContent = '縦軸は下ほど弱い光でも感じとれる（感度が高い）。値は模式。';
      const lines = [];
      lines.push(`暗い所に入ってから ${fmt(t, 1)} 分：感じとれる最小の光の強さは、はじめの 約 10^${fmt(thresholdLog(0) - v, 1)} 分の1（10 の ${fmt(thresholdLog(0) - v, 1)} 乗分の1）。`);
      lines.push(t < bt
        ? `はじめの数分は、錐体の感度が上がることで暗さに慣れていく。約${fmt(bt, 0)}分で錐体の感度は頭打ちになる。`
        : `約${fmt(bt, 0)}分を過ぎると、桿体の感度が錐体を上回り、曲線が折れ曲がる（屈曲点）。桿体では光を受容する物質ロドプシンが暗所で再合成されて蓄積するので、感度がさらに大きく上がる。`);
      lines.push('明るい所では桿体のロドプシンが分解されて少なくなっているので、暗所に入ってすぐは桿体の感度が低い。このように、暗い所でしだいに感度が上がることを暗順応という。');
      exp.set(lines);
      return { dark: thresholdLog(0) - v, afterBreak: t >= bt && t <= bt + 3 };
    }

    function drawRetina() {
      const a = st.angle;
      const c = cones(a);
      const r = rods(a);
      title.replaceChildren('網膜の視細胞の分布 ', modelNote('ヒトの右眼の模式'));
      chart.draw({
        alt: `${a}°：錐体 ${fmt(c, 0)}、桿体 ${fmt(r, 0)}`,
        x: { min: -60, max: 60, label: '網膜上の、黄斑の中心（中心窩）からの角度（°）　耳側 ← → 鼻側', step: 20 },
        y: { min: 0, max: 180, label: '視細胞の密度（千個/mm²）', step: 40 },
        regions: [{ x0: BLIND[0], x1: BLIND[1], fill: 'region-2', label: '盲斑' }],
        series: [
          { points: sample(cones, -60, 60, 960), color: 'c2', width: 3, label: '錐体', labelAt: 4 },
          { points: sample(rods, -60, 60, 960), color: 'c1', dash: 'dash', width: 3, label: '桿体', labelAt: -30 },
        ],
        vlines: [{ x: a, color: 'fg', dash: 'dot' }],
        markers: [{ x: a, y: c, color: 'c2', shape: 'square' }, { x: a, y: r, color: 'c1' }],
      });
      leg.replaceChildren(legend([{ label: '錐体（色を識別し、明るい所ではたらく）', color: 'c2' }, { label: '桿体（弱い光を感じとるが、色は区別しない）', color: 'c1', dash: 'dash' }]));
      note.textContent = '密度の値は目安。盲斑は視神経が束になって眼球から出ていく部分で、視細胞がない。';
      const inBlind = a >= BLIND[0] && a <= BLIND[1];
      const rs = retinaSize(st.width, st.dist);
      calc.replaceChildren(
        h('p', null, `網膜上の盲斑の直径 ＝ 紙の上で見えなくなった幅 × 眼の節点から網膜までの距離 ÷ 眼から紙までの距離 ＝ ${fmt(st.width, 1)} × ${EYE_DEPTH} ÷ ${st.dist} ≒ ${fmt(rs * 10, 2)} mm`),
        h('p', { class: 'small muted' }, `眼の中で光の道すじが交わる点（節点）から網膜までを約 ${EYE_DEPTH} cm とした。紙の上の像と網膜上の像は、節点をはさんで相似の三角形になる。`),
      );
      exp.set([
        inBlind
          ? `${a}° は盲斑の位置で、錐体も桿体もない。ここに結んだ像は見えない。視神経の繊維が束になって眼球から出ていき、血管が出入りする部分だからである。`
          : `${a > 0 ? '鼻側' : a < 0 ? '耳側' : ''}${Math.abs(a)}°：錐体 約${fmt(c, 0)}、桿体 約${fmt(r, 0)}（千個/mm²）。`,
        '黄斑（中央のくぼみが中心窩）には錐体が集中していて桿体はほとんどないので、視野の中心では色や形をくわしく見分けられる。周辺部には桿体が多いので、暗い所では少し視線をずらしたほうが弱い光を感じやすい。',
      ]);
      return { inBlind, fovea: Math.abs(a) < 0.6 };
    }

    function update() {
      const res = st.tab === 'dark' ? drawDark() : drawRetina();
      ctx.update({ ...st, ...res });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'dark' && s.afterBreak;
dojo.tasks[1].check = (s) => s.tab === 'dark' && s.t >= 30 && s.dark > 4;
dojo.tasks[2].check = (s) => s.tab === 'retina' && s.touched > 0 && s.fovea;
dojo.tasks[3].check = (s) => s.tab === 'retina' && s.inBlind;
