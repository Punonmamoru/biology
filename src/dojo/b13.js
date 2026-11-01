// B13 炭素の循環 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, legendFromSpec } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { BASE, atmosphereChange, PPM_PER, co2 } from '../models/carbon.js';
import { sample } from '../lib/series.js';

const NAMES = { photo: '光合成', ocean: '海洋への吸収', respP: '生産者の呼吸', respC: '消費者の呼吸', decomp: '分解者の呼吸', fossil: '化石燃料の燃焼', landUse: '森林の伐採・焼却' };

export const dojo = {
  tasks: [
    { id: 'zero', text: '①で化石燃料の燃焼を減らし、大気中の炭素がほとんど増えない（増加量±5以内）条件を見つけよう。', short: '増えない条件' },
    { id: 'forest', text: '①で森林を減らす（光合成を小さくする）と、大気中の炭素の増加量が大きくなることを確かめよう。', short: '森林が減ると' },
    { id: 'season', text: '②で、大気中の CO₂ 濃度が1年のうちで最も低くなる季節を確かめよう（時期を変える）。', short: '季節変動' },
  ],
  mount(root, ctx) {
    const st = { tab: 'flow', fossil: BASE.fossil, forest: 100, year: 2020.4, touched: 0, forestMoves: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'flow', label: '①炭素の出入り' }, { value: 'curve', label: '②大気中の CO₂ 濃度' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '炭素の循環のグラフ', aspect: 0.66 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const sF = slider({ label: '化石燃料の燃焼', min: 0, max: 200, step: 5, value: st.fossil, format: (v) => `${v}（億トン/年）`, onInput: (v) => { st.fossil = v; st.touched++; update(); } });
    const sP = slider({ label: '陸上の森林などの量（いまを100%とする）', min: 60, max: 110, step: 5, value: st.forest, format: (v) => `${v}%`, onInput: (v) => { st.forest = v; st.forestMoves++; update(); } });
    const ctlFlow = h('div', null, sF.el, sP.el);
    const sY = slider({ label: '時期', min: 2020, max: 2023, step: 1 / 12, value: st.year, format: (v) => `${Math.floor(v + 1e-6)}年${Math.floor(((v + 1e-6) % 1) * 12) + 1}月`, onInput: (v) => { st.year = v; st.touched++; update(); } });
    const ctlCurve = h('div', null, sY.el);
    const exp = explainBox();
    root.append(panel('操作', ctlFlow, ctlCurve), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlFlow.hidden = st.tab !== 'flow';
      ctlCurve.hidden = st.tab !== 'curve';
      update();
    }

    function flows() {
      const k = st.forest / 100;
      // 森林が減ると、光合成・生産者の呼吸・消費者の呼吸・分解が同じ割合で減るとする（模式）
      return { ...BASE, photo: BASE.photo * k, respP: BASE.respP * k, respC: BASE.respC * k, decomp: BASE.decomp * k, fossil: st.fossil, landUse: st.forest < 100 ? BASE.landUse + (100 - st.forest) * 2 : BASE.landUse };
    }

    function drawFlow() {
      const f = flows();
      const a = atmosphereChange(f);
      title.replaceChildren('大気中の炭素の出入り ', modelNote('単位：億トン/年（目安を丸めた模式）'));
      const outKeys = ['photo', 'ocean'];
      const inKeys = ['respP', 'respC', 'decomp', 'fossil', 'landUse'];
      const spec = {
        alt: `大気へ入る ${fmt(a.inflow, 0)}、大気から出る ${fmt(a.outflow, 0)}、差 ${fmt(a.change, 0)}`,
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1500, label: '炭素の量（億トン/年）', step: 300 },
        bars: {
          categories: ['大気から出る', '大気へ入る'],
          groups: [
            { values: [f.photo, f.respP], color: 'c3', label: '光合成 ／ 生産者の呼吸' },
            { values: [f.ocean, f.respC + f.decomp], color: 'c1', label: '海洋への吸収 ／ 消費者・分解者の呼吸' },
            { values: [0, f.fossil + f.landUse], color: 'c2', label: '化石燃料の燃焼・森林の伐採' },
          ],
        },
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec));
      note.textContent = `大気から出る：${outKeys.map((k) => `${NAMES[k]} ${fmt(f[k], 0)}`).join('、')}。大気へ入る：${inKeys.map((k) => `${NAMES[k]} ${fmt(f[k], 0)}`).join('、')}。`;
      exp.set([
        `大気中の炭素の増加量 ＝ 入る量 − 出る量 ＝ ${fmt(a.inflow, 0)} − ${fmt(a.outflow, 0)} ＝ ${fmt(a.change, 0)} 億トン/年（CO₂濃度にして 約${fmt(a.change / PPM_PER, 1)} ppm/年）。`,
        '炭素は、大気中の CO₂ → 光合成で生産者の有機物 → 食物連鎖で消費者へ → 遺体・排出物は分解者へと移り、それぞれの呼吸で CO₂ として大気にもどる。このように炭素は生態系の中を循環している。',
        '化石燃料は、昔の生物の遺体の炭素が長い間地中にたくわえられたものである。これを燃やすと大気中の CO₂ が増え、温室効果が強まって地球温暖化の原因になる。森林を減らすと、光合成で大気から取り込まれる CO₂ も減る。',
      ]);
      return { change: a.change };
    }

    function drawCurve() {
      const y = st.year;
      title.replaceChildren('大気中の CO₂ 濃度の変化 ', modelNote('北半球の観測地点の模式'));
      chart.draw({
        alt: `${fmt(y, 2)} 年：約 ${fmt(co2(y), 1)} ppm`,
        x: { min: 2020, max: 2023, label: '年', ticks: [2020, 2021, 2022, 2023].map((v) => ({ v, text: String(v) })) },
        y: { min: 404, max: 424, label: 'CO₂ 濃度（ppm）', step: 4 },
        series: [{ points: sample(co2, 2020, 2023, 600), color: 'c1', width: 3 }],
        vlines: [{ x: y, color: 'c2', dash: 'dot' }],
        markers: [{ x: y, y: co2(y), color: 'c2', label: `${fmt(co2(y), 1)} ppm` }],
      });
      leg.replaceChildren(legend([{ label: '大気中の CO₂ 濃度（ppm ＝ 100万分の1）', color: 'c1' }]));
      note.textContent = '濃度の値と振れ幅は目安（実際の観測値は地点や年によって異なる）。';
      const m = Math.floor(((y + 1e-6) % 1) * 12) + 1;
      exp.set([
        `${m}月：約 ${fmt(co2(y), 1)} ppm。大気中の CO₂ 濃度は、1年の中で上がり下がりをくり返しながら、長期的には毎年 約2〜3 ppm ずつ増えている。`,
        '北半球では、春から夏に植物の光合成がさかんになって CO₂ が吸収されるので濃度が下がり、秋から冬は光合成が少なく呼吸や分解が上回るので濃度が上がる。そのため、濃度は5月ごろ最も高く、9〜10月ごろ最も低い。',
      ]);
      return { month: m };
    }

    function update() {
      const r = st.tab === 'flow' ? drawFlow() : drawCurve();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'flow' && s.touched > 0 && Math.abs(s.change) <= 5;
dojo.tasks[1].check = (s) => s.tab === 'flow' && s.forestMoves > 0 && s.forest < 100;
dojo.tasks[2].check = (s) => s.tab === 'curve' && s.touched > 0 && (s.month === 9 || s.month === 10);
