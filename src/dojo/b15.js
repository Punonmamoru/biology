// B15 心臓の拍動と自律神経 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { simulate, cardiacOutput, REST, BLOOD_L, AUTONOMIC, loewi } from '../models/heart.js';

const T0 = 2;
const T1 = 8;
const TEND = 16;

export const dojo = {
  tasks: [
    { id: 'co', text: '「運動」で、時刻スライダーを運動を始める前（0〜2分）に合わせ、安静時の心拍出量（1回拍出量×心拍数）を確かめよう。', short: '安静時の心拍出量' },
    { id: 'hard', text: '運動の強さを最大にして、心拍出量が安静時の3倍以上になる時刻を探そう。', short: '激しい運動' },
    { id: 'table', text: '「自律神経のはたらき」で、交感神経と副交感神経の両方を表示し、はたらきが反対になる器官を確かめよう。', short: '拮抗的にはたらく' },
    { id: 'loewi', text: '「レーウィの実験」で、心臓Bの拍動が心臓Aより遅れて遅くなることを確かめよう。', short: '神経伝達物質の発見' },
  ],
  mount(root, ctx) {
    const st = { tab: 'ex', x: 0.5, cursor: 5, side: 's', seenBoth: false };

    const top = panel(null);
    root.append(top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '心拍数と心拍出量のグラフ', aspect: 0.66 });
    const leg = h('div');
    const tableBox = h('div', { class: 'table-scroll' });
    top.append(leg, tableBox);

    const segTab = segmented({ label: '表示', options: [{ value: 'ex', label: '運動' }, { value: 'table', label: '自律神経のはたらき' }, { value: 'loewi', label: 'レーウィの実験' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const sX = slider({ label: '運動の強さ', min: 0, max: 1, step: 0.05, value: st.x, format: (v) => (v === 0 ? '運動しない' : `${fmt(v * 100, 0)}%（最大を100%）`), onInput: (v) => { st.x = v; update(); } });
    const sC = slider({ label: '時刻（値を読む）', min: 0, max: TEND, step: 0.1, value: st.cursor, format: (v) => `${fmt(v, 1)} 分`, onInput: (v) => { st.cursor = v; update(); } });
    const segSide = segmented({ label: '表に示す神経', options: [{ value: 's', label: '交感神経' }, { value: 'p', label: '副交感神経' }, { value: 'both', label: '両方' }], value: st.side, onChange: (v) => { st.side = v; if (v === 'both') st.seenBoth = true; update(); } });
    const readout = h('div', { class: 'small', 'aria-live': 'polite' });
    const ctlEx = h('div', null, sX.el, sC.el, readout);
    const ctlT = h('div', null, segSide.el);
    const exp = explainBox();
    root.append(panel('操作', segTab.el, ctlEx, ctlT), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlEx.hidden = st.tab !== 'ex';
      ctlT.hidden = st.tab !== 'table';
      chart.canvas.parentElement.hidden = st.tab === 'table';
      leg.hidden = st.tab === 'table';
      tableBox.hidden = st.tab !== 'table';
      update();
    }

    function update() {
      const lines = [];
      let state = {};
      if (st.tab === 'ex') {
        const run = simulate({ x: st.x, t0: T0, t1: T1, tEnd: TEND });
        const cur = run.reduce((b, r) => (Math.abs(r.t - st.cursor) < Math.abs(b.t - st.cursor) ? r : b), run[0]);
        title.replaceChildren('運動による心拍数・心拍出量の変化 ', modelNote());
        chart.draw({
          alt: `${fmt(cur.t, 1)}分：心拍数 ${fmt(cur.hr, 0)} 回/分、心拍出量 ${fmt(cur.co, 1)} L/分`,
          x: { min: 0, max: TEND, label: '時間（分）', step: 2 },
          y: { min: 0, max: 200, label: '心拍数（回/分）', step: 40 },
          y2: { min: 0, max: 20, label: '心拍出量（L/分）', step: 4 },
          regions: st.x > 0 ? [{ x0: T0, x1: T1, label: '運動中', fill: 'region' }] : [],
          series: [
            { points: run.map((r) => [r.t, r.hr]), color: 'c2', width: 3, label: '心拍数', labelAt: 12 },
            { points: run.map((r) => [r.t, r.co]), color: 'c1', dash: 'dash', width: 3, axis: 'y2', label: '心拍出量', labelAt: 5 },
          ],
          vlines: [{ x: st.cursor, color: 'fg', dash: 'dot', width: 1.2 }],
          markers: [{ x: cur.t, y: cur.hr, color: 'c2' }],
        });
        leg.replaceChildren(legend([{ label: '心拍数（左の目盛り）', color: 'c2' }, { label: '心拍出量＝1回拍出量×心拍数（右の目盛り）', color: 'c1', dash: 'dash' }]));
        readout.replaceChildren(h('b', null, `${fmt(cur.t, 1)} 分：`), `心拍数 ${fmt(cur.hr, 0)} 回/分 × 1回拍出量 ${fmt(cur.sv, 0)} mL ＝ 心拍出量 ${fmt(cur.co, 1)} L/分`);
        if (cur.ex && st.x > 0) lines.push('運動を始めると、交感神経のはたらきが強まり、副交感神経のはたらきが弱まって、心臓の拍動が速く強くなる。運動が続いて筋肉で多くの酸素が使われ、血液中の二酸化炭素濃度が上がると、延髄がこれを感知して、心臓の拍動をさらに促進する。心拍出量が増え、筋肉に多くの酸素が運ばれる。');
        else if (cur.t >= T1 && st.x > 0) lines.push('運動をやめると、副交感神経のはたらきが強まって心臓の拍動はしだいに遅くなり、安静時の心拍数にもどる。');
        else lines.push(`安静時の心拍数は約${REST.hr}回/分、1回拍出量は約${REST.sv} mL で、心拍出量は約${fmt(cardiacOutput(REST.hr, REST.sv), 1)} L/分。成人の血液の量は約${BLOOD_L} L なので、血液は約1分で全身をめぐる計算になる。`);
        lines.push('心臓は、右心房にある洞房結節（ペースメーカー）が周期的に興奮することで、自動的に拍動する（自動性）。自律神経はその速さを調節する。');
        state = { co: cur.co, coRest: cardiacOutput(REST.hr, REST.sv), t: cur.t, x: st.x };
      } else if (st.tab === 'table') {
        title.replaceChildren('交感神経と副交感神経のはたらき');
        const cols = st.side === 'both' ? ['s', 'p'] : [st.side];
        const name = { s: '交感神経', p: '副交感神経' };
        tableBox.replaceChildren(h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '器官'), ...cols.map((c) => h('th', null, name[c])))),
          h('tbody', null, ...AUTONOMIC.map((r) => h('tr', null, h('td', null, r.organ), ...cols.map((c) => h('td', null, r[c]))))),
        ));
        lines.push('交感神経は、興奮したときや運動をしているときなど、体を活動的な状態にするときにはたらく。副交感神経は、休息しているときや食後など、体を落ち着いた状態にするときにはたらく。');
        lines.push('多くの器官には両方の神経が分布し、互いに反対のはたらき（拮抗的なはたらき）をする。体表の血管・立毛筋・汗腺のように、交感神経だけが分布する器官もある。');
        lines.push('自律神経系の最高中枢は間脳の視床下部にある（心臓の拍動の中枢は延髄）。交感神経の末端からは主にノルアドレナリンが、副交感神経の末端からはアセチルコリンが放出される。');
        state = { seenBoth: st.seenBoth };
      } else {
        const run = loewi();
        title.replaceChildren('レーウィの実験（模式） ', modelNote());
        chart.draw({
          alt: 'レーウィの実験：心臓Aの迷走神経を刺激すると、Aに続いてBの拍動も遅くなる',
          x: { min: 0, max: 40, label: '時間（秒）', step: 5 },
          y: { min: 0, max: 1.2, label: '拍動の速さ（相対値）', step: 0.2, digits: 1 },
          regions: [{ x0: 10, x1: 20, label: '心臓Aの迷走神経を刺激', fill: 'region' }],
          series: [
            { points: run.map((r) => [r.t, r.a]), color: 'c2', width: 3, label: '心臓A', labelAt: 16 },
            { points: run.map((r) => [r.t, r.b]), color: 'c1', dash: 'dash', width: 3, label: '心臓B', labelAt: 30 },
          ],
        });
        leg.replaceChildren(legend([{ label: '心臓A（迷走神経をつけたまま）', color: 'c2' }, { label: '心臓B（Aを通った液を受ける）', color: 'c1', dash: 'dash' }]));
        lines.push('カエルの心臓Aの迷走神経（副交感神経）を刺激すると、Aの拍動が遅くなった。Aの中を流れた液を、神経をつないでいない心臓Bに流すと、少し遅れてBの拍動も遅くなった。');
        lines.push('このことから、神経の末端から化学物質が放出され、それが心臓のはたらきを変えていることがわかった（レーウィ、1921年）。この物質はのちにアセチルコリンであることがわかった。');
        state = { loewiSeen: true };
      }
      exp.set(lines);
      ctx.update({ tab: st.tab, ...state });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'ex' && s.t < 2 && Math.abs(s.co - 4.9) < 0.3;
dojo.tasks[1].check = (s) => s.tab === 'ex' && s.x >= 1 && s.co >= s.coRest * 3;
dojo.tasks[2].check = (s) => s.tab === 'table' && s.seenBoth;
dojo.tasks[3].check = (s) => s.tab === 'loewi' && s.loewiSeen;
