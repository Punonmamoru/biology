// A2 遺伝の分離比 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { makeRng, randomSeed } from '../lib/rng.js';
import { createChart, legendFromSpec } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { CROSSES, expected, simulate, gameteRatio, recombinationValue } from '../models/genetics.js';

const RATIO_TEXT = { mono: '3 : 1', testMono: '1 : 1', di: '9 : 3 : 3 : 1' };

// 観察した比を、最も少ない区分を1としたおおよその比で表す
function approxRatio(counts) {
  const nz = counts.filter((c) => c > 0);
  if (!nz.length) return '—';
  const m = Math.min(...nz);
  return counts.map((c) => fmt(c / m, 1)).join(' : ');
}

export const dojo = {
  tasks: [
    { id: 'small', text: '一遺伝子雑種で n を20以下にして「もう一度交配」を何回か押し、結果が理論比からずれやすいことを確かめよう。', short: '少ないとばらつく' },
    { id: 'large', text: '一遺伝子雑種で n を5000以上にして、3 : 1 にほぼ一致する（ずれ2%未満）ことを確かめよう。', short: '多いと理論比に近づく' },
    { id: 'di', text: '二遺伝子雑種で n を1000以上にして、9 : 3 : 3 : 1 に近づくことを確かめよう。', short: '9:3:3:1' },
    { id: 'complete', text: '「連鎖と組換え」で組換え価を0%にして、2種類の表現型しか現れない（完全連鎖）ことを確かめよう。', short: '完全連鎖' },
    { id: 'indep', text: '「連鎖と組換え」で組換え価を50%にして、独立のとき（1 : 1 : 1 : 1）と同じになることを確かめよう。', short: '組換え価50%＝独立' },
  ],
  mount(root, ctx) {
    const st = { tab: 'ratio', cross: 'mono', logN: 2, r: 20, seed: randomSeed(), rerolls: 0 };
    const nOf = () => Math.round(Math.pow(10, st.logN));

    const tabs = segmented({ label: 'シミュレーション', options: [{ value: 'ratio', label: '①分離比' }, { value: 'link', label: '②連鎖と組換え' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    const chart = createChart(top, { label: '交配結果の棒グラフ', aspect: 0.66 });
    top.prepend(title);
    const leg = h('div');
    const table = h('div');
    top.append(leg, table);

    const segC = segmented({ label: '交配', options: [{ value: 'mono', label: 'Aa × Aa' }, { value: 'testMono', label: 'Aa × aa（検定交雑）' }, { value: 'di', label: 'AaBb × AaBb' }], value: st.cross, onChange: (v) => { st.cross = v; update(); } });
    const sN = slider({ label: '子の数 n（調べた子の個体数）', min: 1, max: 4, step: 0.01, value: st.logN, format: (v) => Math.round(Math.pow(10, v)).toLocaleString('ja-JP') + ' 個体', onInput: (v) => { st.logN = v; update(); } });
    const sR = slider({ label: '組換え価 r', min: 0, max: 50, step: 1, value: st.r, format: (v) => v + ' %', onInput: (v) => { st.r = v; update(); } });
    const again = h('button', { type: 'button', class: 'btn primary', onclick: () => { st.seed = randomSeed(); st.rerolls += 1; update(); } }, '🎲 もう一度交配');
    const ctlRatio = h('div', null, segC.el);
    const ctlLink = h('div', null, sR.el, h('p', { class: 'small muted' }, 'AaBb の個体は、A と B、a と b が同じ染色体上にある（AB/ab）。これに aabb を交配する（検定交雑）。'));
    const exp = explainBox();
    root.append(panel('操作', ctlRatio, ctlLink, sN.el, h('div', { class: 'row' }, again)), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlRatio.hidden = st.tab !== 'ratio';
      ctlLink.hidden = st.tab !== 'link';
      update();
    }

    function update() {
      const n = nOf();
      const type = st.tab === 'ratio' ? st.cross : 'testDi';
      const r = st.r / 100;
      const rng = makeRng(st.seed);
      const counts = simulate(type, n, rng, r);
      const exp0 = expected(type, r);
      const cats = CROSSES[type].cats;
      const obs = counts.map((c) => c / n);
      const maxDev = Math.max(...obs.map((p, i) => Math.abs(p - exp0[i])));
      title.replaceChildren(`${CROSSES[type].label} の結果 `, modelNote('乱数によるシミュレーション'));
      const spec = {
        alt: `観察 ${counts.join('、')}`,
        x: { min: 0, max: 1, label: '表現型' },
        y: { min: 0, max: Math.max(0.6, Math.ceil(Math.max(...obs, ...exp0) * 10 + 1) / 10), label: '割合', step: 0.1, digits: 1 },
        bars: {
          categories: cats,
          groups: [
            { values: obs, color: 'c1', label: `シミュレーション（n＝${n.toLocaleString('ja-JP')}）` },
            { values: exp0, color: 'c2', label: '理論値' },
          ],
        },
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));
      table.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '表現型'), h('th', null, '個体数'), h('th', null, '割合'), h('th', null, '理論値'))),
          h('tbody', null, ...cats.map((c, i) => h('tr', null, h('td', null, c), h('td', null, counts[i].toLocaleString('ja-JP')), h('td', null, fmt(obs[i], 3)), h('td', null, fmt(exp0[i], 3))))),
        ),
      );
      const lines = [];
      if (type !== 'testDi') {
        lines.push(`理論比は ${RATIO_TEXT[type]}。今回の結果は、少ない区分を1とすると ${approxRatio(counts)}（理論値とのずれは最大 ${fmt(maxDev * 100, 1)}%）。`);
        lines.push(n < 100
          ? '子の数が少ないと、偶然によるばらつきが大きく、理論比からずれやすい。「もう一度交配」を押すたびに結果が変わる。'
          : n >= 5000
            ? '子の数を多くすると、偶然のばらつきが打ち消し合い、結果は理論比にとても近くなる（大数の法則）。理論比は「確率」を表しているからである。'
            : '子の数を増やすほど、結果は理論比に近づいていく。');
        if (type === 'mono') lines.push('Aa × Aa の子の遺伝子型は AA : Aa : aa ＝ 1 : 2 : 1。A が a に対して顕性なので、AA と Aa はどちらも [A] になり、表現型は [A] : [a] ＝ 3 : 1 になる。');
        if (type === 'testMono') lines.push('潜性ホモ接合体 aa との交配（検定交雑）では、子の表現型の比が、調べたい個体のつくる配偶子の比（A : a ＝ 1 : 1）をそのまま表す。');
        if (type === 'di') lines.push('2組の対立遺伝子が別々の染色体にあると、配偶子 AB : Ab : aB : ab ＝ 1 : 1 : 1 : 1 で独立に分配される（独立の法則）。そのため F2 は (3 : 1) × (3 : 1) ＝ 9 : 3 : 3 : 1 になる。');
      } else {
        const g = gameteRatio(r);
        const rv = recombinationValue(counts);
        lines.push(`組換え価 ${st.r}% のとき、AaBb のつくる配偶子は AB : Ab : aB : ab ＝ ${fmt(g.AB, 3)} : ${fmt(g.Ab, 3)} : ${fmt(g.aB, 3)} : ${fmt(g.ab, 3)}。aabb の配偶子は ab だけなので、子の表現型の比は配偶子の比と同じになる。`);
        lines.push(`今回の結果から組換え価を求めると、(${counts[1]}＋${counts[2]}) ÷ ${n} ＝ ${fmt(rv * 100, 1)}%。組換え価 ＝ 組換えで生じた個体（[Ab]・[aB]）の数 ÷ 全体の数。`);
        lines.push(st.r === 0
          ? '組換え価0%は完全連鎖：乗換えが起こらないので、[AB] と [ab] しか現れない。'
          : st.r === 50
            ? '組換え価50%では、4種類が 1 : 1 : 1 : 1 になり、独立している場合と区別できない。組換え価は必ず50%以下になる。'
            : '減数分裂で相同染色体が対合するとき、乗換えによって遺伝子の組合せが変わる。2つの遺伝子が離れているほど乗換えが起こりやすいので、組換え価は大きくなる。');
      }
      exp.set(lines);
      ctx.update({ ...st, n, type, maxDev, counts });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.type === 'mono' && s.n <= 20 && s.rerolls >= 2;
dojo.tasks[1].check = (s) => s.type === 'mono' && s.n >= 5000 && s.maxDev < 0.02;
dojo.tasks[2].check = (s) => s.type === 'di' && s.n >= 1000;
dojo.tasks[3].check = (s) => s.type === 'testDi' && s.r === 0;
dojo.tasks[4].check = (s) => s.type === 'testDi' && s.r === 50;
