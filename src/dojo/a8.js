// A8 生存曲線と生命表 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legendFromSpec } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { TYPES, survivors, lxFromCurve, lifeTable, L0, LIFESPAN } from '../models/survival.js';
import { sample } from '../lib/series.js';

const CLASSES = 10;
const REF = [['late', 'c1', 'solid'], ['mid', 'c3', 'dash'], ['early', 'c2', 'dot']];

export const dojo = {
  tasks: [
    { id: 'three', text: '晩死型・平均型・早死型の3つをすべて選んで、曲線の形を比べよう。', short: '3つの型を比べる' },
    { id: 'straight', text: '平均型を選び、縦軸が対数目盛りのとき直線になることを確かめよう。', short: '平均型は対数目盛りで直線' },
    { id: 'linear', text: '縦軸を「ふつうの目盛り」に切り替えて、平均型の曲線が直線にならないことを確かめよう。', short: 'ふつうの目盛りでは曲線' },
    { id: 'early', text: '早死型で、生命表の最初の区分の死亡率がとても高いことを確かめよう（区分1を選ぶ）。', short: '早死型の死亡率' },
    { id: 'calc', text: '生命表の区分を3回以上変えて、死亡率 ＝ 死亡数 ÷ はじめの生存数 の計算を確かめよう。', short: '死亡率の計算' },
  ],
  mount(root, ctx) {
    const st = { type: 'late', k: TYPES.late.k, log: true, cls: 1 };
    const seen = { types: new Set(['late']), clsMoves: 0 };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '生存曲線 ', modelNote()));
    const chart = createChart(top, { label: '生存曲線', aspect: 0.72 });
    const leg = h('div');
    top.append(leg, h('p', { class: 'small muted' }, `出生（ふ化）した ${L0} 個体が、年齢とともに何個体生き残っているかを表す。横軸は寿命を ${LIFESPAN} とした相対的な年齢。`));

    const segT = segmented({ label: '型', options: [...Object.entries(TYPES).map(([value, t]) => ({ value, label: t.name })), { value: 'custom', label: '自分で調整' }], value: st.type, onChange: (v) => { st.type = v; if (v !== 'custom') { st.k = TYPES[v].k; sK.set(Math.log10(st.k), true); seen.types.add(v); } update(); } });
    const sK = slider({ label: '曲線の形（左：若いうちに多く死ぬ ↔ 右：老齢で多く死ぬ）', min: Math.log10(0.2), max: Math.log10(8), step: 0.01, value: Math.log10(st.k), format: (v) => `k ＝ ${fmt(Math.pow(10, v), 2)}`, onInput: (v) => { st.k = Math.pow(10, v); st.type = 'custom'; segT.set('custom', true); update(); } });
    const segY = segmented({ label: '縦軸', options: [{ value: true, label: '対数目盛り' }, { value: false, label: 'ふつうの目盛り' }], value: st.log, onChange: (v) => { st.log = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segT.el, sK.el, segY.el), panel('いま何が起きているか', exp.el));

    const tablePanel = panel('生命表');
    const tableBox = h('div');
    const chart2Box = h('div');
    const calc = h('div', { class: 'explain', 'aria-live': 'polite' });
    const sC = slider({ label: '計算する年齢の区分', min: 1, max: CLASSES, step: 1, value: st.cls, format: (v) => `区分${v}（年齢 ${(v - 1) * 10}〜${v * 10}）`, onInput: (v) => { st.cls = v; seen.clsMoves++; update(); } });
    tablePanel.append(h('p', { class: 'small muted' }, 'いまの曲線から読みとった生存数（整数に丸めた値）で作った生命表。生存数が少なくなると、1個体の差で死亡率が大きく変わる。'), tableBox, sC.el, calc, chart2Box);
    root.append(tablePanel);
    const chart2 = createChart(chart2Box, { label: '年齢の区分ごとの死亡率', aspect: 0.5 });
    const leg2 = h('div');
    chart2Box.append(leg2);

    function update() {
      const { k, log } = st;
      const series = REF.map(([id, color, dash]) => ({ points: sample((x) => survivors(x, TYPES[id].k), 0, LIFESPAN, 200), color, dash, width: 1.8, legendLabel: `${TYPES[id].name}（${TYPES[id].examples}）` }));
      series.push({ points: sample((x) => survivors(x, k), 0, LIFESPAN, 300), color: 'c4', width: 4, legendLabel: st.type === 'custom' ? 'いまの曲線' : `いまの曲線（${TYPES[st.type].name}）` });
      const spec = {
        alt: `生存曲線 k ${fmt(k, 2)}`,
        x: { min: 0, max: LIFESPAN, label: '相対年齢', step: 10 },
        y: log ? { min: 1, max: 1000, log: true, label: '生存数（対数目盛り）' } : { min: 0, max: 1000, label: '生存数', step: 200 },
        series,
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));

      const lx = lxFromCurve(k, CLASSES);
      const rows = lifeTable(lx);
      tableBox.replaceChildren(
        h('div', { class: 'table-scroll' },
          h('table', { class: 'data' },
            h('thead', null, h('tr', null, h('th', null, '区分'), h('th', null, '年齢'), h('th', null, 'はじめの生存数'), h('th', null, '死亡数'), h('th', null, '死亡率'))),
            h('tbody', null, ...rows.map((r, i) => h('tr', { class: i + 1 === st.cls ? 'hl' : null }, h('td', null, String(i + 1)), h('td', null, `${i * 10}〜${(i + 1) * 10}`), h('td', null, String(r.start)), h('td', null, String(r.deaths)), h('td', null, r.start > 0 ? fmt(r.mortality, 3) : '—')))),
          ),
        ),
      );
      const r = rows[st.cls - 1];
      calc.replaceChildren(
        h('p', null, `区分${st.cls}：死亡数 ＝ ${r.start} − ${lx[st.cls]} ＝ ${r.deaths}`),
        h('p', null, r.start > 0 ? `死亡率 ＝ 死亡数 ÷ はじめの生存数 ＝ ${r.deaths} ÷ ${r.start} ＝ ${fmt(r.mortality, 3)}（${fmt(r.mortality * 100, 1)}%）` : 'はじめの生存数が0なので、死亡率は求められない。'),
      );
      const spec2 = {
        alt: '区分ごとの死亡率',
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1, label: '死亡率', step: 0.2, digits: 1 },
        bars: { categories: rows.map((_, i) => String(i + 1)), groups: [{ values: rows.map((q) => (q.start > 0 ? q.mortality : 0)), color: 'c4', label: '年齢の区分ごとの死亡率（横軸は区分の番号）' }] },
      };
      chart2.draw(spec2);
      leg2.replaceChildren(legendFromSpec(spec2));

      const lines = [];
      if (k < 0.7) lines.push('早死型：生まれてすぐの時期に大部分が死に、生き残った少数の個体はその後比較的長く生きる。魚類や貝類など、多数の卵を産むが親が卵や子を保護しない動物に見られる。初期の死亡率が高いので、多くの卵を産むことで子孫を残している。');
      else if (k <= 1.5) lines.push('平均型：どの年齢でも死亡率がほぼ一定なので、縦軸を対数目盛りにすると、生存曲線はほぼ直線になる。鳥類などに見られる。');
      else lines.push('晩死型：若いうちの死亡は少なく、ある年齢をこえると多くの個体が死ぬ。ヒトや大形の哺乳類のように、産む子の数は少ないが、親が子を保護し、子が生き残りやすい動物に見られる。');
      lines.push(log
        ? '縦軸が対数目盛りなので、同じ「割合」で減ると同じ傾きで下がる。傾きが急なところほど死亡率が高い。'
        : 'ふつうの目盛りでは、死亡率が一定でも、生存数が多いうちは死亡数が多く、少なくなると死亡数も少なくなるので、平均型でも曲線になる。死亡率の比較には対数目盛りが便利である。');
      lines.push('生存数・死亡数・死亡率を年齢の区分ごとにまとめた表を生命表という。死亡率は「その区分のはじめに生きていた個体のうち、区分の間に死んだ個体の割合」である。');
      exp.set(lines);
      ctx.update({ ...st, types: [...seen.types], clsMoves: seen.clsMoves });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => ['late', 'mid', 'early'].every((t) => s.types.includes(t));
dojo.tasks[1].check = (s) => s.type === 'mid' && s.log;
dojo.tasks[2].check = (s) => s.type === 'mid' && !s.log;
dojo.tasks[3].check = (s) => s.type === 'early' && s.cls === 1;
dojo.tasks[4].check = (s) => s.clsMoves >= 3;
