// A23 カルビン回路 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { at, steady, label, T_CHANGE, T_END } from '../models/calvin.js';
import { sample } from '../lib/series.js';

export const dojo = {
  tasks: [
    { id: 'dark', text: '①で「光を消す」にして、RuBP が減り PGA が増えることを確かめよう。', short: '光を消す' },
    { id: 'noco2', text: '①で「CO₂ をなくす」にして、RuBP が増え PGA が減ることを確かめよう。', short: 'CO₂ をなくす' },
    { id: 'pulse', text: '②で時間を 2 秒以下にして、¹⁴C がまず PGA に取り込まれる（PGA の割合が最も大きい）ことを確かめよう。', short: '最初の物質' },
  ],
  mount(root, ctx) {
    const st = { tab: 'change', light: 100, co2: 100, preset: 'free', t: 30 };

    const tabs = segmented({ label: '内容', options: [{ value: 'change', label: '①光・CO₂ を止める' }, { value: 'pulse', label: '②¹⁴CO₂ の追跡' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: 'グラフ', aspect: 0.62 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const segP = segmented({
      label: `時刻 ${T_CHANGE} に行う操作`,
      options: [{ value: 'dark', label: '光を消す' }, { value: 'noco2', label: 'CO₂ をなくす' }, { value: 'free', label: '自由に設定' }],
      value: st.preset,
      onChange: (v) => {
        st.preset = v;
        if (v === 'dark') { sL.set(0, true); sC.set(100, true); }
        if (v === 'noco2') { sL.set(100, true); sC.set(0, true); }
        readSliders();
        update();
      },
    });
    const sL = slider({ label: '操作のあとの光の強さ', min: 0, max: 100, step: 10, value: st.light, format: (v) => `${v}%`, onInput: () => { st.preset = 'free'; segP.set('free', true); readSliders(); update(); } });
    const sC = slider({ label: '操作のあとの CO₂ 濃度', min: 0, max: 100, step: 10, value: st.co2, format: (v) => `${v}%`, onInput: () => { st.preset = 'free'; segP.set('free', true); readSliders(); update(); } });
    const ctlChange = h('div', null, segP.el, sL.el, sC.el);
    const sT = slider({ label: '¹⁴CO₂ を与えてからの時間', min: 1, max: 60, step: 1, value: st.t, format: (v) => `${v} 秒`, onInput: (v) => { st.t = v; update(); } });
    const ctlPulse = h('div', null, sT.el);
    const exp = explainBox();
    root.append(panel('操作', ctlChange, ctlPulse), panel('いま何が起きているか', exp.el));

    function readSliders() {
      st.light = sL.value;
      st.co2 = sC.value;
    }

    function layout() {
      ctlChange.hidden = st.tab !== 'change';
      ctlPulse.hidden = st.tab !== 'pulse';
      update();
    }

    function drawChange() {
      const L = st.light / 100;
      const C = st.co2 / 100;
      const s0 = steady(1, 1);
      const end = at(T_END, L, C);
      title.replaceChildren('RuBP と PGA の量の変化 ', modelNote());
      chart.draw({
        alt: `操作のあと：RuBP ${fmt(end.rubp, 1)}、PGA ${fmt(end.pga, 1)}`,
        x: { min: 0, max: T_END, label: '時間（相対値）', step: 2 },
        y: { min: 0, max: 10, label: '物質の量（相対値）', step: 2 },
        regions: [{ x0: T_CHANGE, x1: T_END, fill: 'region', label: '操作のあと' }],
        series: [
          { points: sample((t) => at(t, L, C).pga, 0, T_END, 300), color: 'c2', dash: 'dash', width: 3, label: 'PGA' },
          { points: sample((t) => at(t, L, C).rubp, 0, T_END, 300), color: 'c1', width: 3, label: 'RuBP' },
        ],
        vlines: [{ x: T_CHANGE, color: 'muted', dash: 'dot' }],
      });
      leg.replaceChildren(legend([{ label: 'PGA（ホスホグリセリン酸・C₃）', color: 'c2', dash: 'dash' }, { label: 'RuBP（リブロースビスリン酸・C₅）', color: 'c1' }]));
      note.textContent = '光も CO₂ も十分な状態から、時刻 4 で条件を変えた。RuBP ＋ CO₂ → PGA（ルビスコ）と、PGA → RuBP（ATP・NADPH を使う）の2つの反応だけを考えた模式図。';
      const lines = [];
      const dR = end.rubp - s0.rubp;
      const dP = end.pga - s0.pga;
      if (L === 0 && C === 0) {
        lines.push('光も CO₂ もないと、2つの反応がどちらも止まるので、RuBP も PGA も量が変わらない（このモデルの場合）。');
      } else if (Math.abs(dR) < 0.05) {
        lines.push('光と CO₂ のバランスが変わらないので、RuBP と PGA の量はほとんど変わらない（このモデルの場合）。');
      } else if (dR < 0) {
        lines.push(`RuBP が減り（${fmt(s0.rubp, 1)} → ${fmt(end.rubp, 1)}）、PGA が増える（${fmt(s0.pga, 1)} → ${fmt(end.pga, 1)}）。`);
        lines.push(L < 1
          ? '光が弱くなると、チラコイドでつくられる ATP と NADPH が減るので、PGA から RuBP をつくる反応が進みにくくなる。一方、CO₂ を固定して RuBP から PGA をつくる反応はしばらく続くので、PGA がたまり RuBP が減る。'
          : 'CO₂ が多いので RuBP から PGA をつくる反応が速くなり、PGA がたまり RuBP が減る。');
      } else {
        lines.push(`RuBP が増え（${fmt(s0.rubp, 1)} → ${fmt(end.rubp, 1)}）、PGA が減る（${fmt(s0.pga, 1)} → ${fmt(end.pga, 1)}）。`);
        lines.push(C < 1
          ? 'CO₂ が少なくなると、RuBP に CO₂ を結合させて PGA をつくる反応が進みにくくなる。一方、光があるので ATP と NADPH を使って PGA から RuBP をつくる反応は続き、RuBP がたまり PGA が減る。'
          : '光が強いので PGA から RuBP をつくる反応が速くなり、RuBP がたまり PGA が減る。');
      }
      lines.push(`ふだん（光も CO₂ も十分なとき）は、RuBP ${fmt(s0.rubp, 1)}・PGA ${fmt(s0.pga, 1)} でつり合っている。カルビン回路は葉緑体のストロマで行われ、CO₂ を取り込んで有機物をつくる。`);
      exp.set(lines);
      return { dR, dP };
    }

    function drawPulse() {
      const t = st.t;
      const v = label(t);
      title.replaceChildren('¹⁴CO₂ を与えたあとの放射能の割合 ', modelNote());
      chart.draw({
        alt: `${t}秒：PGA ${fmt(v.pga, 0)}%、糖など ${fmt(v.sugar, 0)}%`,
        x: { min: 0, max: 60, label: '¹⁴CO₂ を与えてからの時間（秒）', step: 10 },
        y: { min: 0, max: 100, label: '放射能の割合（%）', step: 20 },
        series: [
          { points: sample((x) => label(x).pga, 0.2, 60, 300), color: 'c2', dash: 'dash', width: 3, label: 'PGA' },
          { points: sample((x) => label(x).sugar, 0.2, 60, 300), color: 'c3', width: 3, label: '糖など' },
        ],
        vlines: [{ x: t, color: 'muted', dash: 'dot' }],
        markers: [
          { x: t, y: v.pga, color: 'c2', label: `${fmt(v.pga, 0)}%` },
          { x: t, y: v.sugar, color: 'c3', shape: 'square', label: `${fmt(v.sugar, 0)}%` },
        ],
      });
      leg.replaceChildren(legend([{ label: 'PGA にある放射能の割合', color: 'c2', dash: 'dash' }, { label: 'PGA からつくられた糖などにある割合', color: 'c3' }]));
      note.textContent = 'カルビンらの実験の模式図。緑藻に ¹⁴C を含む CO₂ を短い時間だけ与えてすぐに反応を止め、放射能をもつ物質を調べた。';
      exp.set([
        `${t} 秒後：取り込まれた ¹⁴C のうち、PGA に ${fmt(v.pga, 0)}%、糖などに ${fmt(v.sugar, 0)}% がある。`,
        t <= 5
          ? 'ごく短い時間では、放射能のほとんどが PGA にある。CO₂ はまず RuBP と結合して PGA になるので、最初に ¹⁴C が現れる物質は PGA である。'
          : '時間がたつと、PGA からつくられた糖などにも ¹⁴C が広がり、PGA の割合は下がっていく。こうして、CO₂ が取り込まれる順番（CO₂ → PGA → 糖など）が明らかになった。',
        'このように、放射性同位体で目印をつけて物質の流れを追う方法をトレーサー法という。',
      ]);
      return { pga: v.pga, sugar: v.sugar };
    }

    function update() {
      const r = st.tab === 'change' ? drawChange() : drawPulse();
      ctx.update({ ...st, ...r });
    }
    readSliders();
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'change' && s.light === 0 && s.co2 === 100 && s.dR < 0 && s.dP > 0;
dojo.tasks[1].check = (s) => s.tab === 'change' && s.co2 === 0 && s.light === 100 && s.dR > 0 && s.dP < 0;
dojo.tasks[2].check = (s) => s.tab === 'pulse' && s.t <= 2 && s.pga > s.sugar;
