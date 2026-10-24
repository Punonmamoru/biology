// B6 酸素解離曲線 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, explainBox, panel, modelNote } from './common.js';
import { saturation, releaseFraction, p50, LUNG, TISSUE } from '../models/oxygen.js';
import { sample } from '../lib/series.js';

export const dojo = {
  tasks: [
    { id: 'half', text: '組織のO₂分圧を動かして、組織での酸素ヘモグロビンの割合がほぼ50%になる値を探そう。', short: '半分が酸素を離す分圧' },
    { id: 'co2', text: '組織のCO₂分圧を40 mmHg（肺と同じ）に下げて、組織で放出される酸素の割合が小さくなることを確かめよう。', short: 'CO₂分圧の効果' },
    { id: 'flat', text: '肺のO₂分圧を70 mmHg以下に下げても、肺での酸素ヘモグロビンの割合が90%以上に保たれることを確かめよう。', short: 'S字の上側は平ら' },
    { id: 'exercise', text: '激しい運動中の筋肉のように、組織のO₂分圧を20 mmHg以下・CO₂分圧を75 mmHg以上にして、放出される割合を80%以上にしよう。', short: '運動中の筋肉' },
  ],
  mount(root, ctx) {
    const st = { lungO2: LUNG.pO2, tisO2: TISSUE.pO2, tisCO2: TISSUE.pCO2 };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '酸素分圧と酸素ヘモグロビンの割合 ', modelNote()));
    const chart = createChart(top, { label: '酸素解離曲線のグラフ', aspect: 0.75 });
    const leg = h('div');
    top.append(leg, h('p', { class: 'small muted' }, `肺胞のCO₂分圧は ${LUNG.pCO2} mmHg とした。分圧の単位 mmHg は、教科書によっては相対値で示される。`));

    const sLung = slider({ label: '肺（肺胞）のO₂分圧', min: 40, max: 100, step: 1, value: st.lungO2, format: (v) => v + ' mmHg', onInput: (v) => { st.lungO2 = v; update(); } });
    const sTis = slider({ label: '組織のO₂分圧', min: 5, max: 60, step: 1, value: st.tisO2, format: (v) => v + ' mmHg', onInput: (v) => { st.tisO2 = v; update(); } });
    const sCO2 = slider({ label: '組織のCO₂分圧', min: 40, max: 80, step: 1, value: st.tisCO2, format: (v) => v + ' mmHg', onInput: (v) => { st.tisCO2 = v; update(); } });
    const readout = h('div', { class: 'small', 'aria-live': 'polite' });
    const exp = explainBox();
    const calcBox = h('div', { 'aria-live': 'polite' });
    root.append(
      panel('操作', sLung.el, sTis.el, sCO2.el, readout),
      panel('計算：組織で酸素を放出した割合', calcBox),
      panel('いま何が起きているか', exp.el),
    );

    function update() {
      const sL = saturation(st.lungO2, LUNG.pCO2);
      const sT = saturation(st.tisO2, st.tisCO2);
      const frac = releaseFraction(sL, sT);
      const series = [
        { points: sample((p) => saturation(p, LUNG.pCO2), 0, 100, 200), color: 'c1', width: 3, label: `CO₂ ${LUNG.pCO2}（肺）`, legendLabel: `CO₂分圧 ${LUNG.pCO2} mmHg（肺胞）` },
      ];
      if (st.tisCO2 !== LUNG.pCO2) {
        series.push({ points: sample((p) => saturation(p, st.tisCO2), 0, 100, 200), color: 'c2', dash: 'dash', width: 3, label: `CO₂ ${st.tisCO2}（組織）`, labelAt: 72, legendLabel: `CO₂分圧 ${st.tisCO2} mmHg（組織）` });
      }
      chart.draw({
        alt: `肺で ${fmt(sL, 0)}%、組織で ${fmt(sT, 0)}%。放出した割合 ${fmt(frac, 0)}%`,
        x: { min: 0, max: 100, label: 'O₂分圧（mmHg）', step: 10 },
        y: { min: 0, max: 100, label: '酸素ヘモグロビンの割合（%）', step: 10 },
        series,
        vlines: [
          { x: st.lungO2, color: 'c1', dash: 'dot', label: '肺' },
          { x: st.tisO2, color: 'c2', dash: 'dot', label: '組織', dy: 18 },
        ],
        hlines: [
          { y: sL, color: 'c1', dash: 'dot', width: 1, label: `肺 ${fmt(sL, 0)}%` },
          { y: sT, color: 'c2', dash: 'dot', width: 1, label: `組織 ${fmt(sT, 0)}%` },
        ],
        markers: [
          { x: st.lungO2, y: sL, color: 'c1' },
          { x: st.tisO2, y: sT, color: 'c2', shape: 'square' },
        ],
      });
      leg.replaceChildren(legend([...series.map((s) => ({ label: s.legendLabel, color: s.color, dash: s.dash })), { label: '肺・組織の分圧（縦の点線）', color: 'muted', dash: 'dot' }]));
      readout.replaceChildren(
        h('div', null, h('b', null, '肺'), `：O₂ ${st.lungO2}・CO₂ ${LUNG.pCO2} mmHg → 酸素ヘモグロビン ${fmt(sL, 1)}%`),
        h('div', null, h('b', null, '組織'), `：O₂ ${st.tisO2}・CO₂ ${st.tisCO2} mmHg → 酸素ヘモグロビン ${fmt(sT, 1)}%`),
      );
      calcBox.replaceChildren(
        h('p', { class: 'small' }, h('b', null, '組織で酸素を放出した割合 ＝ （肺での割合 − 組織での割合）÷ 肺での割合 × 100')),
        h('p', null, `（${fmt(sL, 1)} − ${fmt(sT, 1)}）÷ ${fmt(sL, 1)} × 100 ＝ `, h('b', null, `${fmt(frac, 1)}%`)),
        h('p', { class: 'small muted' }, `「肺で酸素と結合していたヘモグロビンのうち、組織で酸素を離したものの割合」である。全ヘモグロビンに対する割合を問われたときは、差の ${fmt(sL - sT, 1)}% が答えになる。`),
      );

      const lines = [];
      lines.push('酸素分圧が高い肺胞では、ヘモグロビンの大部分が酸素と結合して酸素ヘモグロビンになる。酸素分圧が低い組織では、酸素ヘモグロビンが酸素を離してヘモグロビンにもどり、離れた酸素が組織の細胞に渡される。');
      if (st.tisCO2 > LUNG.pCO2) {
        lines.push(`組織のようにCO₂分圧が高いと、曲線は右にずれる（いまの設定で、半分が酸素ヘモグロビンになるO₂分圧は ${fmt(p50(LUNG.pCO2), 0)} → ${fmt(p50(st.tisCO2), 0)} mmHg）。同じO₂分圧でも酸素ヘモグロビンの割合が小さくなるので、CO₂を多く出している（さかんに呼吸している）組織ほど、多くの酸素を受け取れる。`);
      } else {
        lines.push('組織のCO₂分圧を肺と同じにすると、曲線は1本になる。CO₂分圧が高いときより酸素を離しにくくなるので、組織で放出される酸素の割合は小さくなる。');
      }
      if (st.lungO2 <= 70 && sL >= 90) {
        lines.push(`曲線はS字形で、O₂分圧の高い側は平らに近い。そのため肺のO₂分圧が ${st.lungO2} mmHg に下がっても、酸素ヘモグロビンの割合は ${fmt(sL, 0)}% と大きくは下がらない。`);
      } else {
        lines.push('曲線がS字形なので、O₂分圧が 20〜50 mmHg くらいの範囲では、O₂分圧が少し下がるだけで酸素ヘモグロビンの割合が大きく下がる。組織の酸素分圧はこの範囲にあるので、組織で効率よく酸素を放出できる。');
      }
      exp.set(lines);
      ctx.update({ ...st, sL, sT, frac });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => Math.abs(s.sT - 50) <= 3;
dojo.tasks[1].check = (s) => s.tisCO2 === LUNG.pCO2 && s.tisO2 <= 50;
dojo.tasks[2].check = (s) => s.lungO2 <= 70 && s.sL >= 90;
dojo.tasks[3].check = (s) => s.tisO2 <= 20 && s.tisCO2 >= 75 && s.frac >= 80;
