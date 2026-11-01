// A9 呼吸と発酵（呼吸商）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legendFromSpec } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { SUBSTRATES, respirometer, yeast, splitGlucose } from '../models/respiration.js';

export const dojo = {
  tasks: [
    { id: 'fat', text: '①で脂肪を選び、呼吸商が約0.7になること、水を入れたフラスコでも気体が減ることを確かめよう。', short: '脂肪の呼吸商' },
    { id: 'protein', text: '①でタンパク質を選び、呼吸商が約0.8になることを確かめよう。', short: 'タンパク質の呼吸商' },
    { id: 'ferm', text: '②で発酵の割合を100%にして、O₂を吸収しないのにCO₂が放出されることを確かめよう。', short: '発酵だけのとき' },
    { id: 'rq2', text: '②で、O₂吸収量とCO₂放出量の比（CO₂÷O₂）がちょうど2になる発酵の割合を見つけよう。', short: 'CO₂÷O₂＝2' },
  ],
  mount(root, ctx) {
    const st = { tab: 'rq', sub: 'carb', ferm: 0, touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'rq', label: '①呼吸基質と呼吸商' }, { value: 'yeast', label: '②酵母の呼吸と発酵' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const eq = h('p', { class: 'small' });
    top.append(eq);
    const chart = createChart(top, { label: 'O₂吸収量とCO₂放出量の棒グラフ', aspect: 0.6 });
    const leg = h('div');
    const table = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, table, note);

    const segS = segmented({ label: '呼吸基質', options: Object.entries(SUBSTRATES).map(([value, s]) => ({ value, label: s.name })), value: st.sub, onChange: (v) => { st.sub = v; st.touched++; update(); } });
    const ctlRq = h('div', null, segS.el);
    const sF = slider({ label: '消費したグルコースのうち、アルコール発酵に使われた割合', min: 0, max: 100, step: 5, value: st.ferm, format: (v) => `${v} %`, onInput: (v) => { st.ferm = v; st.touched++; update(); } });
    const ctlYeast = h('div', null, h('p', { class: 'small' }, '酵母は、O₂があると呼吸を、O₂が少ないとアルコール発酵を行う。ここでは、グルコース 6 mol を消費したとする。'), sF.el);
    const exp = explainBox();
    root.append(panel('操作', ctlRq, ctlYeast), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlRq.hidden = st.tab !== 'rq';
      ctlYeast.hidden = st.tab !== 'yeast';
      update();
    }

    function drawRq() {
      const s = SUBSTRATES[st.sub];
      const o2 = 100;
      const co2 = o2 * s.rq;
      const r = respirometer(o2, co2);
      title.replaceChildren(`${s.name}を呼吸基質にしたとき `, modelNote('O₂吸収量を100とした相対値'));
      eq.textContent = `${s.example}：${s.eq}`;
      const spec = {
        alt: `O₂吸収量 100、CO₂放出量 ${fmt(co2, 0)}`,
        x: { min: 0, max: 1 },
        y: { min: 0, max: 120, label: '気体の量（相対値）', step: 20 },
        bars: { categories: ['O₂ 吸収量', 'CO₂ 放出量'], groups: [{ values: [o2, co2], color: 'c1', label: '気体の体積（O₂吸収量を100とする）' }] },
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));
      table.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '呼吸計'), h('th', null, '気体の減少量'), h('th', null, '意味'))),
          h('tbody', null,
            h('tr', null, h('td', null, 'KOH水溶液を入れたフラスコ'), h('td', null, fmt(r.koh, 0)), h('td', null, '吸収したO₂（CO₂はKOHに吸収される）')),
            h('tr', null, h('td', null, '水を入れたフラスコ'), h('td', null, fmt(r.water, 0)), h('td', null, '吸収したO₂ − 放出したCO₂')),
          ),
        ),
      );
      note.textContent = '同じ温度・圧力では、気体の体積は物質量（分子の数）に比例する。発芽種子を2つのフラスコに入れて気体の減少量をはかる実験の模式。';
      exp.set([
        `呼吸商（RQ）＝ 放出したCO₂の体積 ÷ 吸収したO₂の体積 ＝ ${fmt(co2, 0)} ÷ ${o2} ＝ ${fmt(s.rq, 2)}。`,
        st.sub === 'carb'
          ? '炭水化物（グルコース）では、O₂ 6分子を吸収してCO₂ 6分子を放出するので、呼吸商は1.0になる。'
          : st.sub === 'fat'
            ? '脂肪は炭水化物に比べて分子中の酸素の割合が小さいので、CO₂と水にまで分解するのに多くのO₂が必要になり、呼吸商は約0.7と小さくなる。'
            : 'タンパク質（アミノ酸）は、窒素がアンモニアなどとして取り除かれたあと呼吸に使われ、呼吸商は約0.8になる。',
        `呼吸計の実験では、KOH側の減少量 ${fmt(r.koh, 0)} が吸収したO₂、両方の差 ${fmt(r.koh, 0)} − ${fmt(r.water, 0)} ＝ ${fmt(r.koh - r.water, 0)} が放出したCO₂を表すので、呼吸商 ＝ (KOH側 − 水側) ÷ KOH側 で求められる。`,
      ]);
      return { rq: s.rq };
    }

    function drawYeast() {
      const y = yeast(6, st.ferm / 100);
      title.replaceChildren('酵母の呼吸とアルコール発酵 ', modelNote('グルコース 6 mol を消費したとき'));
      eq.textContent = '呼吸：C₆H₁₂O₆ ＋ 6O₂ ＋ 6H₂O → 6CO₂ ＋ 12H₂O　　アルコール発酵：C₆H₁₂O₆ → 2C₂H₅OH ＋ 2CO₂';
      const spec = {
        alt: `O₂吸収 ${fmt(y.o2, 1)} mol、CO₂放出 ${fmt(y.co2, 1)} mol`,
        x: { min: 0, max: 1 },
        y: { min: 0, max: 40, label: '物質量（mol）', step: 5 },
        bars: {
          categories: ['O₂ 吸収量', 'CO₂ 放出量', 'エタノール'],
          groups: [
            { values: [y.o2, 6 * y.aer, 0], color: 'c1', label: '呼吸による' },
            { values: [0, 2 * y.fer, y.ethanol], color: 'c2', label: 'アルコール発酵による' },
          ],
        },
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));
      const sp = y.o2 > 0 ? splitGlucose(y.o2, y.co2) : null;
      table.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, ''), h('th', null, '呼吸'), h('th', null, '発酵'), h('th', null, '合計'))),
          h('tbody', null,
            h('tr', null, h('td', null, 'グルコース（mol）'), h('td', null, fmt(y.aer, 2)), h('td', null, fmt(y.fer, 2)), h('td', null, '6')),
            h('tr', null, h('td', null, 'O₂ 吸収（mol）'), h('td', null, fmt(y.o2, 2)), h('td', null, '0'), h('td', null, fmt(y.o2, 2))),
            h('tr', null, h('td', null, 'CO₂ 放出（mol）'), h('td', null, fmt(6 * y.aer, 2)), h('td', null, fmt(2 * y.fer, 2)), h('td', null, fmt(y.co2, 2))),
          ),
        ),
      );
      note.textContent = 'O₂吸収量とCO₂放出量の比は、呼吸と発酵が同時に起こっているときは呼吸基質の呼吸商とは一致しない。';
      const lines = [];
      lines.push(y.o2 > 0
        ? `CO₂放出量 ÷ O₂吸収量 ＝ ${fmt(y.co2, 2)} ÷ ${fmt(y.o2, 2)} ＝ ${fmt(y.rq, 2)}。発酵の割合が大きいほど、O₂を使わずに出るCO₂が増えるので、この比は1より大きくなる。`
        : 'すべてアルコール発酵なので、O₂はまったく吸収せず、CO₂だけが放出される（比は求められない）。発酵ではグルコース1分子からCO₂とエタノールが2分子ずつできる。');
      if (sp) lines.push(`逆に、O₂吸収量とCO₂放出量から求めると、呼吸に使ったグルコース ＝ O₂ ÷ 6 ＝ ${fmt(sp.aer, 2)} mol、発酵に使ったグルコース ＝ (CO₂ − O₂) ÷ 2 ＝ ${fmt(sp.fer, 2)} mol。呼吸ではO₂とCO₂が同じ量なので、O₂より多いCO₂はすべて発酵によるものだからである。`);
      lines.push('アルコール発酵ではグルコース1分子あたりATPが2分子しかできないが、呼吸ではずっと多くのATPができる。そのため、O₂が十分にあると酵母は主に呼吸を行う。');
      exp.set(lines);
      return { rq: y.rq, o2: y.o2 };
    }

    function update() {
      const r = st.tab === 'rq' ? drawRq() : drawYeast();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'rq' && s.sub === 'fat';
dojo.tasks[1].check = (s) => s.tab === 'rq' && s.sub === 'protein';
dojo.tasks[2].check = (s) => s.tab === 'yeast' && s.ferm === 100;
dojo.tasks[3].check = (s) => s.tab === 'yeast' && s.o2 > 0 && Math.abs(s.rq - 2) < 1e-9;
