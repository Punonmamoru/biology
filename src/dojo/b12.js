// B12 ホルモンと負のフィードバック の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { segmented, explainBox, panel, modelNote } from './common.js';
import { CASES, simulate, T_EVENT, T_END } from '../models/thyroid.js';

const pct = (v) => `${fmt(v * 100, 0)}%`;

export const dojo = {
  tasks: [
    { id: 'thy', text: '甲状腺を除去すると、チロキシンが減り、TRH と TSH が増えることを確かめよう。', short: '甲状腺の除去' },
    { id: 'inj', text: 'チロキシンを注射し続けると、TRH と TSH が減ることを確かめよう。', short: 'チロキシンの注射' },
    { id: 'pit', text: '脳下垂体を除去すると、TSH がなくなり、チロキシンも減ることを確かめよう。', short: '脳下垂体の除去' },
    { id: 'iod', text: 'ヨウ素が不足すると、TSH が正常より多くなることを確かめよう。', short: 'ヨウ素の不足' },
  ],
  mount(root, ctx) {
    const st = { c: 'normal' };

    const top = panel(null);
    root.append(top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: 'ホルモンの量の変化のグラフ', aspect: 0.66 });
    const leg = h('div');
    const table = h('div');
    top.append(leg, table, h('p', { class: 'small muted' }, `各ホルモンの量は、正常な状態を100%とした相対値。${T_EVENT}日目に処置を行う模式。`));

    const segC = segmented({ label: '処置', options: Object.entries(CASES).map(([value, c]) => ({ value, label: c.name })), value: st.c, onChange: (v) => { st.c = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segC.el, h('p', { class: 'small' }, '視床下部 →（TRH）→ 脳下垂体前葉 →（TSH）→ 甲状腺 →（チロキシン）。チロキシンは視床下部と脳下垂体前葉にはたらいて、TRH と TSH の分泌をおさえる。')), panel('いま何が起きているか', exp.el));

    function update() {
      const run = simulate(st.c);
      const end = run[run.length - 1];
      title.replaceChildren(`処置「${CASES[st.c].name}」のときのホルモンの量 `, modelNote());
      const yMax = Math.max(2.2, ...run.map((q) => Math.max(q.H, q.S, q.T))) * 100 * 1.08;
      chart.draw({
        alt: `処置後：TRH ${pct(end.H)}、TSH ${pct(end.S)}、チロキシン ${pct(end.T)}`,
        x: { min: 0, max: T_END, label: '日数', step: 5 },
        y: { min: 0, max: yMax, label: '量（正常＝100%）', step: yMax > 300 ? 100 : 50 },
        series: [
          { points: run.map((q) => [q.t, q.H * 100]), color: 'c4', dash: 'dot', width: 3, label: 'TRH', labelAt: 30 },
          { points: run.map((q) => [q.t, q.S * 100]), color: 'c2', dash: 'dash', width: 3, label: 'TSH', labelAt: 34 },
          { points: run.map((q) => [q.t, q.T * 100]), color: 'c1', width: 3, label: 'チロキシン', labelAt: 22 },
        ],
        hlines: [{ y: 100, color: 'muted', dash: 'dot', width: 1 }],
        vlines: st.c === 'normal' ? [] : [{ x: T_EVENT, color: 'fg', dash: 'dot', label: '処置' }],
      });
      leg.replaceChildren(legend([{ label: 'TRH（視床下部）', color: 'c4', dash: 'dot' }, { label: 'TSH（脳下垂体前葉）', color: 'c2', dash: 'dash' }, { label: 'チロキシン（甲状腺）', color: 'c1' }]));
      table.replaceChildren(h('p', { class: 'small' }, `${T_END}日目：TRH ${pct(end.H)}、TSH ${pct(end.S)}、チロキシン ${pct(end.T)}`));
      const L = {
        normal: ['チロキシンが多くなると TRH と TSH の分泌がおさえられ、少なくなると分泌が促される。結果が原因にもどってはたらきをおさえるこのしくみを負のフィードバックといい、チロキシンの量はほぼ一定に保たれる。'],
        thyroidectomy: ['甲状腺がないのでチロキシンがつくられず、減っていく。チロキシンによる抑制がなくなるので、視床下部からの TRH と脳下垂体前葉からの TSH の分泌が増える（負のフィードバックがはたらかない）。'],
        injection: ['注射でチロキシンが多くなるので、負のフィードバックによって TRH と TSH の分泌がおさえられる。TSH が減るので、甲状腺自身がつくるチロキシンは少なくなる。'],
        pituitary: ['脳下垂体前葉がないので TSH が分泌されず、甲状腺はチロキシンをほとんどつくらなくなる。チロキシンが減るので、視床下部からの TRH の分泌は増える。'],
        iodine: ['チロキシンの材料のヨウ素が不足すると、甲状腺がチロキシンを十分につくれない。チロキシンが少ないので TRH と TSH の分泌が増え、甲状腺は TSH によって強く刺激され続ける。'],
      }[st.c];
      exp.set([...L, 'チロキシンは代謝（化学反応）を促進するホルモンで、体温の維持や成長にもかかわる。']);
      ctx.update({ ...st, end });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.c === 'thyroidectomy';
dojo.tasks[1].check = (s) => s.c === 'injection';
dojo.tasks[2].check = (s) => s.c === 'pituitary';
dojo.tasks[3].check = (s) => s.c === 'iodine' && s.end.S > 1;
