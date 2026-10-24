// B5 生態系のバランス（キーストーン種）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, explainBox, panel, modelNote } from './common.js';
import { simulate, SCALE, yMaxFor } from '../models/keystone.js';

const T_HUNT = 20;
const T_END = 150;

export const dojo = {
  tasks: [
    { id: 'half', text: '乱獲でラッコを半分以下に減らし、ウニが増えることを確かめよう。', short: 'ウニの増加を確認' },
    { id: 'collapse', text: 'ラッコをほぼ0（10%以下）にして、ケルプが元の半分以下になるのを見よう。', short: 'ケルプの森の消失' },
    { id: 'restore', text: 'いったん減らしたあと、ラッコを元（100%）に戻して、ケルプの森が保たれることを確かめよう。', short: 'バランスの回復' },
  ],
  mount(root, ctx) {
    const st = { o1: 0.7, changed: true };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'ラッコ・ウニの個体数とケルプの量 ', modelNote()));
    const chart = createChart(top, { label: 'ラッコ・ウニ・ケルプの量の変化のグラフ' });
    top.append(
      legend([
        { label: 'ラッコ', color: 'c4', dash: 'dashdot' },
        { label: 'ウニ', color: 'c2', dash: 'dash' },
        { label: 'ケルプ（海藻の現存量）', color: 'c3' },
      ]),
      h('p', { class: 'small muted' }, `縦軸は3種とも「乱獲前＝100」とした相対値（種ごとに基準が違うので、どの種が多いかは比べられない。変化の割合を比べる）。${T_HUNT}年目から乱獲が起こり、ラッコが下のスライダーの値まで減る。`),
    );
    const sO = slider({ label: '乱獲後のラッコの数（元を100%として）', min: 0, max: 100, step: 5, value: 70, format: (v) => v + '%', onInput: (v) => {
      st.o1 = v / 100;
      if (v < 100) st.changed = true;
      update();
    } });
    const exp = explainBox();
    root.append(panel('操作', sO.el), panel('いま何が起きているか', exp.el));

    function update() {
      const run = simulate({ o0: 1, o1: st.o1, tHunt: T_HUNT, tEnd: T_END });
      const before = run.find((r) => r.t >= T_HUNT - 1);
      const end = run[run.length - 1];
      const series = [
        { points: run.map((r) => [r.t, r.o * SCALE.o]), color: 'c4', dash: 'dashdot', width: 3, label: 'ラッコ' },
        { points: run.map((r) => [r.t, r.u * SCALE.u]), color: 'c2', dash: 'dash', width: 3, label: 'ウニ' },
        { points: run.map((r) => [r.t, r.k * SCALE.k]), color: 'c3', width: 3, label: 'ケルプ' },
      ];
      chart.draw({
        alt: `ラッコ ${fmt(st.o1 * 100, 0)}%。最終的にウニ ${fmt(end.u * SCALE.u, 0)}、ケルプ ${fmt(end.k * SCALE.k, 0)}（乱獲前＝100）`,
        x: { min: 0, max: T_END, label: '時間（年）', step: 25 },
        y: { min: 0, max: yMaxFor(run), label: '乱獲前を100とした相対値', step: yMaxFor(run) > 400 ? 100 : yMaxFor(run) > 200 ? 50 : 20 },
        series,
        vlines: st.o1 < 1 ? [{ x: T_HUNT, color: 'muted', label: '乱獲' }] : [],
      });
      const du = end.u / before.u;
      const dk = end.k / before.k;
      const lines = [];
      if (st.o1 >= 0.999) {
        lines.push('ラッコがウニを食べているので、ウニは少なく保たれ、ケルプ（海藻）の森が豊かに保たれている。');
        lines.push('ラッコは個体数の少ない上位の捕食者だが、ウニの数をおさえることで生態系のバランスを保っている。このような種をキーストーン種という。');
      } else {
        lines.push(`ラッコが ${fmt(st.o1 * 100, 0)}% に減ると、食べられる量が減ったウニが増え（約${fmt(du, 1)}倍）、そのウニに食べられてケルプが減る（約${fmt(dk * 100, 0)}%に）。`);
        lines.push('ラッコはケルプを直接食べないのに、ウニを介してケルプの量に影響している。このような影響を間接効果という。ケルプの森をすみかや産卵場所にする魚などにも影響が広がる。');
        if (st.o1 <= 0.1) lines.push('ラッコがほとんどいなくなると、ケルプの森は大きく失われ、ウニばかりの海（磯焼けのような状態）になる。');
      }
      exp.set(lines);
      ctx.update({ ...st, du, dk });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.o1 <= 0.5 && s.du > 1;
dojo.tasks[1].check = (s) => s.o1 <= 0.1 && s.dk <= 0.5;
dojo.tasks[2].check = (s) => s.changed && s.o1 >= 1;
