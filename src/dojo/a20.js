// A20 減数分裂と遺伝的多様性 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { PHASES, TOTAL, phaseAt, dnaAt, chromosomeSetsAt, gameteTypes, zygoteTypes } from '../models/meiosis.js';
import { sample } from '../lib/series.js';

const big = (n) => (n < 1e6 ? n.toLocaleString('ja-JP') : `約 ${fmt(n / Math.pow(10, Math.floor(Math.log10(n))), 1)} × 10${String(Math.floor(Math.log10(n))).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`);

export const dojo = {
  tasks: [
    { id: 'm1', text: '①で、第一分裂の終わりに DNA 量が4から2に、染色体数が 2n から n になることを確かめよう。', short: '第一分裂' },
    { id: 'm2', text: '①で、第二分裂の終わりに DNA 量が2から1になる（染色体数は n のまま）ことを確かめよう。', short: '第二分裂' },
    { id: 'human', text: '②で n ＝ 23（ヒト）にして、1人がつくる配偶子の染色体の組合せが約840万通りになることを確かめよう。', short: 'ヒトの配偶子' },
  ],
  mount(root, ctx) {
    const st = { tab: 'dna', t: 2, n: 3, touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'dna', label: '①DNA量と染色体数' }, { value: 'comb', label: '②配偶子の組合せ' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: 'グラフ', aspect: 0.62 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const sT = slider({ label: '時間（間期のはじめから）', min: 0, max: TOTAL, step: 0.1, value: st.t, format: (v) => phaseAt(v).name, onInput: (v) => { st.t = v; st.touched++; update(); } });
    const ctlDna = h('div', null, sT.el);
    const sN = slider({ label: '相同染色体の組の数 n', min: 1, max: 23, step: 1, value: st.n, format: (v) => `n ＝ ${v}（2n ＝ ${2 * v}）`, onInput: (v) => { st.n = v; st.touched++; update(); } });
    const ctlComb = h('div', null, sN.el);
    const exp = explainBox();
    root.append(panel('操作', ctlDna, ctlComb), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlDna.hidden = st.tab !== 'dna';
      ctlComb.hidden = st.tab !== 'comb';
      update();
    }

    function drawDna() {
      const t = st.t;
      const p = phaseAt(t);
      const dna = dnaAt(Math.min(t, TOTAL));
      const sets = chromosomeSetsAt(Math.min(t, TOTAL));
      title.replaceChildren('減数分裂での細胞1個あたりの DNA 量 ', modelNote());
      const regions = [];
      let acc = 0;
      for (const ph of PHASES) {
        if (ph.id === 'M1' || ph.id === 'M2') regions.push({ x0: acc, x1: acc + ph.len, fill: ph.id === 'M1' ? 'region' : 'region-4', label: ph.id === 'M1' ? '第一分裂' : '第二分裂' });
        acc += ph.len;
      }
      chart.draw({
        alt: `${p.name}：DNA量 ${fmt(dna, 2)}、染色体数 ${sets === 2 ? '2n' : 'n'}`,
        x: { min: 0, max: TOTAL, label: '時間（相対値）', step: 4 },
        y: { min: 0, max: 5, label: 'DNA量（相対値）', step: 1 },
        regions,
        series: [{ points: sample((x) => dnaAt(x), 0, TOTAL - 1e-6, 800), color: 'c1', width: 3 }],
        vlines: [{ x: t, color: 'c2', dash: 'dot' }],
        markers: [{ x: t, y: dna, color: 'c2', label: `${fmt(dna, 1)}` }],
      });
      leg.replaceChildren(legend([{ label: '細胞1個あたりの DNA 量（体細胞の G1期＝2）', color: 'c1' }]));
      note.textContent = '各時期の長さは模式。第一分裂の前の間期に DNA が複製される（第一分裂と第二分裂の間には複製は起こらない）。';
      const lines = [`いま：${p.name}。DNA 量 ${fmt(dna, 1)}、染色体数 ${sets === 2 ? '2n' : 'n'}。`];
      if (p.id === 'S') lines.push('S期で DNA が複製され、DNA 量が2から4に増える。');
      if (p.id === 'M1') lines.push('第一分裂の前期に相同染色体どうしが対合して二価染色体ができ、このとき乗換えが起こることがある。後期に相同染色体が分かれて両極へ移動するので、終わりには染色体数が半分（n）、DNA 量が2になる。');
      if (p.id === 'M2') lines.push('第二分裂では、DNA の複製が起こらないまま、各染色体の染色分体が分かれる。そのため染色体数は n のままで、DNA 量は2から1になる。1個の母細胞から4個の娘細胞ができる。');
      lines.push('体細胞分裂では DNA 量が 2 → 4 → 2 と、もとにもどるが、減数分裂では 2 → 4 → 2 → 1 と半分になる。配偶子の染色体数が n なので、受精すると 2n にもどる。');
      exp.set(lines);
      return { p: p.id, dna, sets };
    }

    function drawComb() {
      const n = st.n;
      const g = gameteTypes(n);
      const z = zygoteTypes(n);
      title.replaceChildren('相同染色体の組の数と配偶子の組合せ ', modelNote('乗換えを考えない場合'));
      const pts = [];
      for (let k = 1; k <= 23; k++) pts.push([k, gameteTypes(k)]);
      chart.draw({
        alt: `n ＝ ${n}：配偶子 ${g} 通り`,
        x: { min: 1, max: 23, label: '相同染色体の組の数 n', step: 2 },
        y: { min: 1, max: 1e7, log: true, label: '配偶子の染色体の組合せ（通り・対数目盛り）', ticks: [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7].map((v) => ({ v, text: v < 1e4 ? String(v) : `10${String(Math.log10(v)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}` })) },
        series: [{ points: pts, color: 'c1', width: 3 }],
        markers: [{ x: n, y: g, color: 'c2', label: big(g) }],
      });
      leg.replaceChildren(legend([{ label: '1個体がつくる配偶子の染色体の組合せ（2ⁿ 通り）', color: 'c1' }]));
      note.textContent = '';
      exp.set([
        `相同染色体の組が ${n} 組あると、第一分裂でそれぞれの組の2本のうちどちらが同じ極に行くかは独立に決まるので、配偶子の染色体の組合せは 2^${n} ＝ ${big(g)} 通りになる。`,
        `受精では、両親の配偶子が無作為に組み合わさるので、子の染色体の組合せは ${big(g)} × ${big(g)} ＝ ${big(z)} 通りになる。`,
        '実際には、第一分裂の前期に相同染色体の間で乗換えが起こり、遺伝子の組合せがさらに多様になる。このような減数分裂と受精のしくみが、有性生殖で生じる子の遺伝的多様性を生み出している。',
      ]);
      return { g };
    }

    function update() {
      const r = st.tab === 'dna' ? drawDna() : drawComb();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'dna' && s.p === 'M1' && s.dna === 2 && s.sets === 1;
dojo.tasks[1].check = (s) => s.tab === 'dna' && s.t >= TOTAL - 0.1 && s.dna === 1;
dojo.tasks[2].check = (s) => s.tab === 'comb' && s.n === 23;
