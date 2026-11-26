// B14 酵素のはたらき（カタラーゼ）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { CATALYSTS, simulate, totalO2, initialRate, T_ADD, T_END, O2_PER_ML } from '../models/catalase.js';

const ADD = { none: '何もしない', h2o2: '過酸化水素水を追加', cat: '同じものをもう一度加える' };

export const dojo = {
  tasks: [
    { id: 'boiled', text: '「煮沸した肝臓片」を入れて、酸素がほとんど発生しないことを確かめよう。', short: '煮沸すると反応しない' },
    { id: 'addSub', text: '「肝臓片」で泡が出なくなったあと（8分後）に過酸化水素水を追加すると、再び酸素が発生することを確かめよう。', short: '酵素は何度もはたらく' },
    { id: 'addCat', text: '「肝臓片」で泡が出なくなったあとに肝臓片を追加しても、酸素が発生しないことを確かめよう。', short: '基質がなくなると止まる' },
    { id: 'double', text: '過酸化水素水の量を2倍にして、発生する酸素の総量が2倍になることを確かめよう。', short: '基質の量と酸素の量' },
  ],
  mount(root, ctx) {
    const st = { cat: 'liver', h2o2: 2, amount: 1, add: 'none' };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '発生した酸素の量の変化 ', modelNote()));
    const chart = createChart(top, { label: '発生した酸素の量のグラフ', aspect: 0.66 });
    const leg = h('div');
    top.append(leg, h('p', { class: 'small muted' }, `3%過酸化水素水 1 mL がすべて分解すると、酸素が約${O2_PER_ML} mL 発生するとした（25℃の目安）。${T_ADD}分後に追加の操作をする。比較のため、追加の操作をしない場合を灰色で示す。`));

    const segCat = segmented({ label: '試験管に入れるもの', options: Object.entries(CATALYSTS).map(([value, c]) => ({ value, label: c.name })), value: st.cat, onChange: (v) => { st.cat = v; update(); } });
    const sH = slider({ label: '3%過酸化水素水の量', min: 1, max: 4, step: 0.5, value: st.h2o2, format: (v) => fmt(v, 1) + ' mL', onInput: (v) => { st.h2o2 = v; update(); } });
    const sA = slider({ label: '入れるものの量（肝臓片などの量）', min: 0.5, max: 2, step: 0.5, value: st.amount, format: (v) => fmt(v, 1) + ' 倍', onInput: (v) => { st.amount = v; update(); } });
    const segAdd = segmented({ label: `${T_ADD}分後の操作`, options: Object.entries(ADD).map(([value, label]) => ({ value, label })), value: st.add, onChange: (v) => { st.add = v; update(); } });
    const readout = h('div', { class: 'small', 'aria-live': 'polite' });
    const exp = explainBox();
    root.append(panel('操作', segCat.el, sH.el, sA.el, segAdd.el, readout), panel('いま何が起きているか', exp.el));

    function update() {
      const run = simulate(st);
      const base = st.add === 'none' ? null : simulate({ ...st, add: 'none' });
      const end = run[run.length - 1];
      const atAdd = run.find((r) => r.t >= T_ADD - 1e-9);
      const r1 = initialRate(run);
      const yMax = Math.max(20, Math.ceil((end.o2 * 1.15) / 10) * 10);
      const c = CATALYSTS[st.cat];
      const series = [
        base ? { points: base.map((r) => [r.t, r.o2]), color: 'muted', dash: 'long', width: 2, legendLabel: '追加の操作をしない場合' } : null,
        { points: run.map((r) => [r.t, r.o2]), color: 'c1', width: 3, legendLabel: `${c.name}（${ADD[st.add]}）` },
      ].filter(Boolean);
      chart.draw({
        alt: `${c.name}：発生した酸素 ${fmt(end.o2, 1)} mL`,
        x: { min: 0, max: T_END, label: '時間（分）', step: 2 },
        y: { min: 0, max: yMax, label: '発生した酸素の量（mL）', step: yMax > 40 ? 10 : 5 },
        series,
        vlines: st.add === 'none' ? [] : [{ x: T_ADD, color: 'fg', dash: 'dot', label: ADD[st.add] }],
        hlines: [{ y: totalO2(st.h2o2), color: 'c2', dash: 'dot', width: 1, label: `はじめの過酸化水素がすべて分解したときの量 ${fmt(totalO2(st.h2o2), 0)} mL`, align: 'right' }],
      });
      leg.replaceChildren(legend(series.map((s) => ({ label: s.legendLabel, color: s.color, dash: s.dash }))));
      readout.replaceChildren(
        h('div', null, `はじめの1分間：${fmt(r1, 1)} mL（反応の速さ）`),
        h('div', null, `${T_ADD}分までの合計：${fmt(atAdd.o2, 1)} mL／${T_END}分までの合計：${fmt(end.o2, 1)} mL`),
      );

      const lines = [`${c.note}。`];
      if (c.k >= 0.5) {
        lines.push('過酸化水素（H₂O₂）は、触媒のはたらきで水と酸素に分解される（2H₂O₂ → 2H₂O ＋ O₂）。はじめは過酸化水素が多いので速く分解が進み、過酸化水素が減るにつれて遅くなって、やがて止まる。');
        if (st.add === 'h2o2') lines.push('泡が止まったあとに過酸化水素水を加えると、再び酸素が発生する。触媒（酵素）は反応の前後で変化せず、くり返しはたらくからである。泡が止まったのは、基質（過酸化水素）がなくなったためだとわかる。');
        else if (st.add === 'cat') {
          const left = atAdd.s;
          if (left < 0.01 * st.h2o2) lines.push(`泡が止まったあとに${c.name}を加えても、酸素は発生しない。基質（過酸化水素）がすべて分解されてなくなっているからである。`);
          else lines.push(`${T_ADD}分の時点では過酸化水素がまだわずかに残っていた（はじめの約${fmt((left / st.h2o2) * 100, 0)}%）ので、${c.name}を加えるとその分だけ少し酸素が出る。残りがなくなれば、${c.name}をいくら加えても酸素は発生しない。`);
        }
        else lines.push(`発生する酸素の総量は過酸化水素水の量で決まる（いま ${fmt(totalO2(st.h2o2), 0)} mL）。${c.name}の量を増やすと反応は速くなるが、総量は変わらない。`);
      } else if (st.cat === 'boiled') {
        lines.push('酵素は温度が高すぎるとはたらきを失い、温度を下げても元にもどらない。酸化マンガン(IV)のような無機触媒は、加熱してもはたらきを失わない。');
      } else if (st.cat === 'none') {
        lines.push('触媒がないと、過酸化水素はごくゆっくりとしか分解しない。触媒は、反応を起こりやすくして速く進ませる物質である。');
      }
      if (c.k > 0 && st.add === 'none') lines.push('同じ3%の過酸化水素水を増やしても、濃度は同じなので、はじめの反応の速さ（グラフの立ち上がりの傾き）はほとんど変わらない。発生する酸素の総量は液の量に比例して増える。');
      lines.push('酵素は、細胞内でつくられるタンパク質を主成分とする触媒（生体触媒）で、特定の物質（基質）にだけはたらく（基質特異性）。カタラーゼは、代謝の過程でできる有害な過酸化水素を分解する。');
      exp.set(lines);
      ctx.update({ ...st, end: end.o2, atAdd: atAdd.o2, total: totalO2(st.h2o2) });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.cat === 'boiled' && s.end < 0.1;
dojo.tasks[1].check = (s) => s.cat === 'liver' && s.add === 'h2o2' && s.end > s.atAdd * 1.5;
dojo.tasks[2].check = (s) => s.cat === 'liver' && s.add === 'cat' && s.end - s.atAdd < 0.2;
dojo.tasks[3].check = (s) => (s.cat === 'liver' || s.cat === 'mno2') && s.add === 'none' && s.h2o2 >= 4 && s.end > 39;
