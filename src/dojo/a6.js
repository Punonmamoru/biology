// A6 集団遺伝 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { makeRng, randomSeed } from '../lib/rng.js';
import { createChart, legend, legendFromSpec } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { genotypeFreq, driftLines, fixationSummary } from '../models/popgen.js';
import { sample } from '../lib/series.js';

const GENS = 100;
const LINES = 8;
const LINE_STYLE = [['c1', 'solid'], ['c2', 'dash'], ['c3', 'solid'], ['c4', 'dash'], ['c5', 'solid'], ['c1', 'dot'], ['c2', 'dashdot'], ['c3', 'long']];

export const dojo = {
  tasks: [
    { id: 'half', text: '①で、p を 0.5 にすると、ヘテロ接合体 Aa の頻度が最大（0.5）になることを確かめよう。', short: 'Aa が最大' },
    { id: 'rare', text: '①で、q を 0.1 以下にして、aa はとても少ないのに Aa はその何倍も多いことを確かめよう。', short: '潜性の遺伝子はヘテロ接合体にかくれる' },
    { id: 'small', text: '②で、集団の大きさを20以下にして、遺伝子頻度が0か1になる（消失・固定する）集団が現れることを確かめよう。', short: '小さな集団で固定・消失' },
    { id: 'large', text: '②で、集団の大きさを10000以上にして、遺伝子頻度がほとんど変わらないことを確かめよう。', short: '大きな集団では変わりにくい' },
    { id: 'again', text: '②で「もう一度」を2回以上押し、遺伝的浮動では毎回ちがう結果になることを確かめよう。', short: '偶然による変化' },
  ],
  mount(root, ctx) {
    const st = { tab: 'hw', p: 0.7, logN: Math.log10(50), p0: 0.5, seed: randomSeed(), rerolls: 0 };
    const nOf = () => Math.round(Math.pow(10, st.logN));

    const tabs = segmented({ label: 'シミュレーション', options: [{ value: 'hw', label: '①ハーディー・ワインベルグの法則' }, { value: 'drift', label: '②遺伝的浮動' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '遺伝子頻度のグラフ', aspect: 0.68 });
    const leg = h('div');
    const table = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, table, note);

    const sP = slider({ label: '対立遺伝子 A の遺伝子頻度 p', min: 0, max: 1, step: 0.01, value: st.p, format: (v) => `p ＝ ${fmt(v, 2)}（q ＝ ${fmt(1 - v, 2)}）`, onInput: (v) => { st.p = v; update(); } });
    const ctlHw = h('div', null, sP.el);
    const sN = slider({ label: '集団の大きさ N（個体数）', min: Math.log10(5), max: 5, step: 0.01, value: st.logN, format: (v) => `${Math.round(Math.pow(10, v)).toLocaleString('ja-JP')} 個体（遺伝子 ${(2 * Math.round(Math.pow(10, v))).toLocaleString('ja-JP')} 個）`, onInput: (v) => { st.logN = v; update(); } });
    const sP0 = slider({ label: 'はじめの遺伝子頻度 p', min: 0.1, max: 0.9, step: 0.05, value: st.p0, format: (v) => fmt(v, 2), onInput: (v) => { st.p0 = v; update(); } });
    const again = h('button', { type: 'button', class: 'btn primary', onclick: () => { st.seed = randomSeed(); st.rerolls += 1; update(); } }, '🎲 もう一度');
    const ctlDrift = h('div', null, sN.el, sP0.el, h('div', { class: 'row' }, again));
    const exp = explainBox();
    root.append(panel('操作', ctlHw, ctlDrift), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlHw.hidden = st.tab !== 'hw';
      ctlDrift.hidden = st.tab !== 'drift';
      update();
    }

    function drawHw() {
      const { p } = st;
      const q = 1 - p;
      const g = genotypeFreq(p);
      title.replaceChildren('遺伝子頻度と遺伝子型頻度 ', modelNote('ハーディー・ワインベルグの法則による計算'));
      const spec = {
        alt: `p ${fmt(p, 2)} のとき AA ${fmt(g.AA, 3)}、Aa ${fmt(g.Aa, 3)}、aa ${fmt(g.aa, 3)}`,
        x: { min: 0, max: 1, label: 'A の遺伝子頻度 p', step: 0.1, digits: 1 },
        y: { min: 0, max: 1.05, label: '遺伝子型頻度', step: 0.2, digits: 1 },
        series: [
          { points: sample((x) => x * x, 0, 1, 100), color: 'c1', width: 3, label: 'AA ＝ p²', labelAt: 0.9 },
          { points: sample((x) => 2 * x * (1 - x), 0, 1, 100), color: 'c3', dash: 'dash', width: 3, label: 'Aa ＝ 2pq', labelAt: 0.5 },
          { points: sample((x) => (1 - x) * (1 - x), 0, 1, 100), color: 'c2', dash: 'dot', width: 3, label: 'aa ＝ q²', labelAt: 0.1 },
        ],
        vlines: [{ x: p, color: 'muted', dash: 'dot', label: `p ＝ ${fmt(p, 2)}` }],
        markers: [
          { x: p, y: g.AA, color: 'c1' },
          { x: p, y: g.Aa, color: 'c3', shape: 'square' },
          { x: p, y: g.aa, color: 'c2', shape: 'diamond' },
        ],
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));
      const n = 1000;
      table.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '遺伝子型'), h('th', null, '頻度'), h('th', null, '1000個体あたり'))),
          h('tbody', null,
            h('tr', null, h('td', null, 'AA（p²）'), h('td', null, fmt(g.AA, 4)), h('td', null, fmt(g.AA * n, 1))),
            h('tr', null, h('td', null, 'Aa（2pq）'), h('td', null, fmt(g.Aa, 4)), h('td', null, fmt(g.Aa * n, 1))),
            h('tr', null, h('td', null, 'aa（q²）'), h('td', null, fmt(g.aa, 4)), h('td', null, fmt(g.aa * n, 1))),
          ),
        ),
      );
      note.textContent = 'A が a に対して顕性のとき、表現型 [A] は AA と Aa、[a] は aa だけ。';
      const lines = [
        `精子・卵の遺伝子のうち A が p ＝ ${fmt(p, 2)}、a が q ＝ ${fmt(q, 2)} の割合で含まれ、これらが無作為に受精するので、AA ＝ p² ＝ ${fmt(g.AA, 4)}、Aa ＝ 2pq ＝ ${fmt(g.Aa, 4)}、aa ＝ q² ＝ ${fmt(g.aa, 4)} になる（合計 1）。`,
        `次の世代の A の遺伝子頻度は p² ＋ pq ＝ p(p ＋ q) ＝ ${fmt(p, 2)} で、前の世代と変わらない。集団が十分に大きく、自由に交配し、突然変異・自然選択・移入や移出がなければ、遺伝子頻度は世代をこえて一定に保たれる（ハーディー・ワインベルグの法則）。`,
      ];
      if (q > 0 && q <= 0.1) lines.push(`q が小さいと、aa（${fmt(g.aa * n, 1)}個体／1000）よりも Aa（${fmt(g.Aa * n, 1)}個体／1000）のほうがずっと多い（約${fmt(g.Aa / g.aa, 0)}倍）。潜性の遺伝子の多くは、表現型に現れないヘテロ接合体の中にかくれている。`);
      else lines.push('逆に、潜性形質 [a] の個体の割合 q² がわかれば、q ＝ √(q²) として遺伝子頻度を求められる（ハーディー・ワインベルグの法則が成り立つとき）。');
      exp.set(lines);
      return null;
    }

    function drawDrift() {
      const N = nOf();
      const runs = driftLines(N, st.p0, GENS, LINES, makeRng(st.seed));
      const sum = fixationSummary(runs);
      title.replaceChildren(`集団の大きさ ${N.toLocaleString('ja-JP')} 個体での遺伝子頻度の変化 `, modelNote('乱数によるシミュレーション'));
      const spec = {
        alt: `${LINES}つの集団のうち、固定 ${sum.fixed}、消失 ${sum.lost}`,
        x: { min: 0, max: GENS, label: '世代', step: 10 },
        y: { min: 0, max: 1, label: 'A の遺伝子頻度', step: 0.2, digits: 1 },
        series: runs.map((r, i) => ({ points: r.map((v, gi) => [gi, v]), color: LINE_STYLE[i][0], dash: LINE_STYLE[i][1], width: 2 })),
        hlines: [{ y: st.p0, color: 'muted', dash: 'dot', label: `はじめ p ＝ ${fmt(st.p0, 2)}`, align: 'right' }],
      };
      chart.draw(spec);
      leg.replaceChildren(legend([{ label: `同じ条件の集団 ${LINES}つ（線1本が1つの集団）`, color: 'c1' }]));
      const spread = Math.max(...runs.map((r) => Math.max(...r.map((v) => Math.abs(v - st.p0)))));
      table.replaceChildren(h('p', null, `${GENS}世代後：A が固定（p＝1）した集団 ${sum.fixed}、A が消失（p＝0）した集団 ${sum.lost}、残りの集団 ${LINES - sum.fixed - sum.lost}。はじめの値からのずれは最大 ${fmt(spread, 2)}。`));
      note.textContent = '自然選択・突然変異・移入・移出はなく、毎世代、親の遺伝子から無作為に次の世代の遺伝子が選ばれる模式（ライト・フィッシャー型）。';
      const lines = [];
      lines.push('どの遺伝子が次の世代に伝わるかは偶然に左右されるので、自然選択がはたらかなくても遺伝子頻度は世代ごとに変化する。これを遺伝的浮動という。');
      lines.push(N <= 50
        ? `集団が小さい（${N}個体）と、偶然による変化が大きく、遺伝子頻度が0（消失）や1（固定）になりやすい。一度消失・固定すると、突然変異や移入がない限りもとにはもどらない。`
        : N >= 10000
          ? `集団が大きい（${N.toLocaleString('ja-JP')}個体）と、偶然のかたよりが打ち消し合うので、遺伝子頻度はほとんど変化しない。ハーディー・ワインベルグの法則の「集団が十分に大きい」という条件は、このことを表している。`
          : '集団の大きさを変えて、変化の大きさを比べてみよう。集団が小さいほど遺伝的浮動の影響が大きい。');
      lines.push('個体数が急に減った集団（びん首効果）や、少数の個体が新しい場所に移って生じた集団（創始者効果）では、遺伝的浮動によって遺伝子頻度が大きく変わることがある。');
      exp.set(lines);
      return { N, fixedLost: sum.fixed + sum.lost, spread };
    }

    function update() {
      const d = st.tab === 'hw' ? drawHw() : drawDrift();
      ctx.update({ ...st, drift: d });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'hw' && Math.abs(s.p - 0.5) < 1e-9;
dojo.tasks[1].check = (s) => s.tab === 'hw' && 1 - s.p <= 0.1 + 1e-9 && 1 - s.p > 0;
dojo.tasks[2].check = (s) => s.tab === 'drift' && s.drift && s.drift.N <= 20 && s.drift.fixedLost > 0;
dojo.tasks[3].check = (s) => s.tab === 'drift' && s.drift && s.drift.N >= 10000 && s.drift.spread < 0.15;
dojo.tasks[4].check = (s) => s.tab === 'drift' && s.rerolls >= 2;
