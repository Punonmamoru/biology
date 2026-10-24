// B3 免疫の一次応答・二次応答 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { antibodyModel, peakDelay, PRIMARY, SECONDARY, MEMORY_DAYS } from '../models/immune.js';
import { sample } from '../lib/series.js';

const DAYS = 100;
const MIN_GAP = 10;

export const dojo = {
  tasks: [
    { id: 'log', text: '縦軸を「対数目盛り」に切り替えて、普通の目盛りでは見えにくい一次応答の山を確かめよう。', short: '対数目盛りで一次応答を確認' },
    { id: 'diff', text: '2回目を「別の抗原B」にして、抗原Bに対しては一次応答になることを確かめよう。', short: '抗原Bは一次応答' },
    { id: 'long', text: '2回目の侵入を1回目の50日以上あとにしても、同じ抗原Aなら二次応答が起こることを確かめよう。', short: '記憶は長く残る' },
  ],
  mount(root, ctx) {
    const st = { d1: 5, d2: 40, antigen2: 'A', log: false };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '血液中の抗体量の変化 ', modelNote()));
    const chart = createChart(top, { label: '抗体量の変化のグラフ' });
    top.append(legend([
      { label: '抗原Aに対する抗体', color: 'c1' },
      { label: '抗原Bに対する抗体', color: 'c2', dash: 'dash' },
      { label: '抗原の侵入', color: 'muted', dash: 'dash' },
    ]));

    const segAx = segmented({ label: '縦軸', options: [{ value: false, label: '普通の目盛り' }, { value: true, label: '対数目盛り' }], value: st.log, onChange: (v) => { st.log = v; update(); } });
    const s1 = slider({ label: '1回目の侵入日（抗原A）', min: 0, max: 30, step: 1, value: st.d1, format: (v) => v + ' 日目', onInput: (v) => {
      st.d1 = v;
      if (st.d2 < v + MIN_GAP) { st.d2 = v + MIN_GAP; s2.set(st.d2, true); }
      update();
    } });
    const s2 = slider({ label: '2回目の侵入日', min: MIN_GAP, max: 80, step: 1, value: st.d2, format: (v) => v + ' 日目', onInput: (v) => {
      st.d2 = Math.max(v, st.d1 + MIN_GAP);
      if (st.d2 !== v) s2.set(st.d2, true);
      update();
    } });
    const segAg = segmented({ label: '2回目の抗原', options: [{ value: 'A', label: '同じ抗原A' }, { value: 'B', label: '別の抗原B' }], value: st.antigen2, onChange: (v) => { st.antigen2 = v; update(); } });
    const exp = explainBox();
    root.append(
      panel('操作', segAx.el, s1.el, s2.el, segAg.el, h('p', { class: 'small muted' }, `2回目は1回目の${MIN_GAP}日以上あとに設定できる（記憶細胞ができるまでの時間を考えて）。`)),
      panel('いま何が起きているか', exp.el),
    );

    function update() {
      const m = antibodyModel([{ day: st.d1, antigen: 'A' }, { day: st.d2, antigen: st.antigen2 }]);
      const fA = (t) => m.level('A', t);
      const fB = (t) => m.level('B', t);
      const pA1 = fA(st.d1 + peakDelay(PRIMARY));
      const second = m.events[1];
      const k2 = second.k;
      const p2 = second.antigen === 'A' ? fA(st.d2 + peakDelay(k2)) : fB(st.d2 + peakDelay(k2));
      const y = st.log
        ? { min: 0.01, max: 1000, log: true, label: '抗体量（相対値・対数）' }
        : { min: 0, max: 120, step: 20, label: '抗体量（相対値）' };
      const series = [{ points: sample(fA, 0, DAYS, 400), color: 'c1', width: 3, label: '抗原Aに対する抗体' }];
      if (st.antigen2 === 'B') series.push({ points: sample(fB, 0, DAYS, 400), color: 'c2', dash: 'dash', width: 3, label: '抗原Bに対する抗体', labelAt: Math.min(DAYS - 8, st.d2 + 14) });
      chart.draw({
        alt: `1回目の山 ${fmt(pA1, 1)}、2回目の山 ${fmt(p2, 1)}（相対値）`,
        x: { min: 0, max: DAYS, label: '日数', step: 10 },
        y,
        series,
        vlines: [
          { x: st.d1, color: 'muted', label: '1回目 A' },
          { x: st.d2, color: 'muted', label: `2回目 ${st.antigen2}`, dy: 18 },
        ],
      });

      const lines = [];
      lines.push(`1回目（抗原A）：侵入から抗体が増えはじめるまで約${PRIMARY.lag}日かかり、約${peakDelay(PRIMARY)}日後に最大（${fmt(pA1, 1)}）になる。これが一次応答。`);
      if (second.kind === 'secondary') {
        lines.push(`2回目（同じ抗原A）：1回目にできた記憶細胞がすぐに増殖して形質細胞（抗体産生細胞）になるので、約${peakDelay(SECONDARY)}日で最大になり、量は約${fmt(p2 / pA1, 0)}倍（${fmt(p2, 0)}）。これが二次応答で、一次応答より速く、多量の抗体がつくられる。`);
      } else {
        lines.push(`2回目（別の抗原B）：抗原Bの記憶細胞はないので、抗原Bに対しては一次応答になる（約${peakDelay(PRIMARY)}日後に最大 ${fmt(p2, 1)}）。記憶細胞は抗原ごとに特異的だから、抗原Aの記憶は抗原Bには役立たない。`);
      }
      lines.push(st.log
        ? '対数目盛りでは、目盛り1つで10倍になる。一次応答と二次応答の差が100倍ほどあることが読み取れる。'
        : '普通の目盛りでは、二次応答に比べて一次応答の山はとても小さく見える。対数目盛りに切り替えると両方の形がわかる。');
      lines.push('ワクチンは、無毒化・弱毒化した病原体や抗原を前もって接種して記憶細胞をつくらせ、本物の病原体が侵入したときに二次応答をすばやく起こさせるしくみである。');
      exp.set(lines);
      ctx.update({ ...st, kind2: second.kind });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.log;
dojo.tasks[1].check = (s) => s.antigen2 === 'B';
dojo.tasks[2].check = (s) => s.antigen2 === 'A' && s.d2 - s.d1 >= 50 && s.kind2 === 'secondary';
// MEMORY_DAYS（7日）より MIN_GAP（10日）を大きくしてあるので、同じ抗原なら必ず二次応答になる
if (MIN_GAP < MEMORY_DAYS) throw new Error('MIN_GAP must be >= MEMORY_DAYS');
