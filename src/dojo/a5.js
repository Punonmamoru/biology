// A5 光合成の限定要因 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, legendFromSpec } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { rate, caps, limitingFactor, lightCap, FACTORS, ALPHA, CO2_AIR, T_OPT } from '../models/limiting.js';
import { sample } from '../lib/series.js';

const I_MAX = 50;
const Y_MAX = 160;
const COMPARE_CO2 = [0.02, 0.04, 0.12];
const COMPARE_T = [15, 25, 35];
const DASH = ['dot', 'dash', 'long'];
const COLORS = ['c3', 'c4', 'c5'];

export const dojo = {
  tasks: [
    { id: 'light', text: '光の強さが限定要因になる条件にしよう。', short: '光の強さが限定要因' },
    { id: 'co2', text: 'CO₂濃度が限定要因になる条件にしよう（光を強くしてみよう）。', short: 'CO₂濃度が限定要因' },
    { id: 'temp', text: '温度が限定要因になる条件にしよう。', short: '温度が限定要因' },
    { id: 'dark', text: '光の強さが限定要因のとき、温度やCO₂濃度を変えても光合成速度がほとんど変わらないことを確かめよう。', short: '限定要因以外を変えても変わらない' },
    { id: 'compare', text: '「比較の曲線」でCO₂濃度の違う曲線を表示し、弱い光では3本が重なり、強い光で差がつくことを確かめよう。', short: '教科書の図を再現' },
  ],
  mount(root, ctx) {
    const st = { I: 10, c: CO2_AIR, T: 25, compare: 'none' };
    const track = { changedWhileLight: 0, touched: 0 };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '光の強さと光合成速度 ', modelNote()));
    const chart = createChart(top, { label: '光の強さと光合成速度のグラフ', aspect: 0.7 });
    const leg = h('div');
    top.append(leg);
    top.append(h('h3', { style: { marginTop: '10px' } }, '3つの要因それぞれが許す光合成速度の上限'));
    const chart2 = createChart(top, { label: '3つの要因の上限の棒グラフ', aspect: 0.5 });
    const leg2 = h('div');
    top.append(leg2, h('p', { class: 'small muted' }, '光合成速度は呼吸を差し引かない値（相対値）。各要因の「上限」は、ほかの2つの要因が十分なときの光合成速度を表す模式。'));

    const sI = slider({ label: '光の強さ', min: 0, max: I_MAX, step: 1, value: st.I, format: (v) => `${v} キロルクス`, onInput: (v) => { st.I = v; track.touched++; update(); } });
    const sC = slider({ label: 'CO₂濃度', min: 0.01, max: 0.15, step: 0.01, value: st.c, format: (v) => `${fmt(v, 2)} %${Math.abs(v - CO2_AIR) < 1e-9 ? '（大気と同じ）' : ''}`, onInput: (v) => { st.c = v; changed(); update(); } });
    const sT = slider({ label: '温度', min: 0, max: 45, step: 1, value: st.T, format: (v) => `${v} ℃`, onInput: (v) => { st.T = v; changed(); update(); } });
    const segCmp = segmented({ label: '比較の曲線', options: [{ value: 'none', label: 'なし' }, { value: 'co2', label: 'CO₂濃度を変えた曲線' }, { value: 'temp', label: '温度を変えた曲線' }], value: st.compare, onChange: (v) => { st.compare = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', sI.el, sC.el, sT.el, segCmp.el), panel('いま何が起きているか', exp.el));

    function changed() {
      track.touched++;
      if (limitingFactor(st.I, st.c, st.T).factor === 'light') track.changedWhileLight++;
    }

    function update() {
      const { I, c, T } = st;
      const P = rate(I, c, T);
      const lim = limitingFactor(I, c, T);
      const k = caps(I, c, T);
      const series = [];
      if (st.compare === 'co2') {
        COMPARE_CO2.forEach((cc, i) => series.push({ points: sample((x) => rate(x, cc, T), 0, I_MAX, 200), color: COLORS[i], dash: DASH[i], width: 2, label: `CO₂ ${cc}%`, legendLabel: `CO₂濃度 ${cc}%（${T}℃）` }));
      } else if (st.compare === 'temp') {
        COMPARE_T.forEach((tt, i) => series.push({ points: sample((x) => rate(x, c, tt), 0, I_MAX, 200), color: COLORS[i], dash: DASH[i], width: 2, label: `${tt}℃`, legendLabel: `温度 ${tt}℃（CO₂ ${fmt(c, 2)}%）` }));
      }
      const caps_ = st.compare === 'none'; // 比較の曲線を出すときは、図が混みあうので上限の線を省く
      if (caps_) series.push({ points: sample((x) => Math.min(lightCap(x), Y_MAX * 2), 0, I_MAX, 50), color: 'c2', dash: 'dash', width: 1.5, legendLabel: '光の強さによる上限' });
      series.push({ points: sample((x) => rate(x, c, T), 0, I_MAX, 240), color: 'c1', width: 3.5, legendLabel: `いまの条件（CO₂ ${fmt(c, 2)}%・${T}℃）` });
      const spec = {
        alt: `光の強さ ${I} キロルクス、CO₂ ${fmt(c, 2)}%、${T}℃ で光合成速度 ${fmt(P, 0)}。限定要因は${FACTORS[lim.factor].name}`,
        x: { min: 0, max: I_MAX, label: '光の強さ（キロルクス）', step: 10 },
        y: { min: 0, max: Y_MAX, label: '光合成速度（相対値）', step: 20 },
        series,
        hlines: caps_ ? [
          { y: k.co2, color: 'c3', dash: 'dot', label: `CO₂濃度による上限 ${fmt(k.co2, 0)}`, align: 'right' },
          { y: k.temp, color: 'c4', dash: 'dashdot', label: `温度による上限 ${fmt(k.temp, 0)}`, align: 'right' },
        ] : [],
        vlines: [{ x: I, color: 'muted', dash: 'dot' }],
        markers: [{ x: I, y: P, color: 'c1', label: `${fmt(P, 0)}` }],
      };
      chart.draw(spec);
      leg.replaceChildren(legendFromSpec(spec), caps_ ? legend([{ label: 'CO₂濃度による上限', color: 'c3', dash: 'dot' }, { label: '温度による上限', color: 'c4', dash: 'dashdot' }]) : '');

      const names = ['light', 'co2', 'temp'];
      const spec2 = {
        alt: `光 ${fmt(k.light, 0)}、CO₂ ${fmt(k.co2, 0)}、温度 ${fmt(k.temp, 0)}`,
        x: { min: 0, max: 1 },
        y: { min: 0, max: Y_MAX + 40, label: '上限（相対値）', step: 40 },
        bars: {
          categories: names.map((n) => FACTORS[n].name + (n === lim.factor ? '（限定要因）' : '')),
          groups: [{ values: names.map((n) => Math.min(k[n], Y_MAX + 40)), color: 'c1', label: 'その要因だけで決まる上限' }],
        },
        hlines: [{ y: P, color: 'c2', dash: 'dash', width: 2, label: `実際の光合成速度 ${fmt(P, 0)}`, align: 'right' }],
      };
      chart2.draw(spec2);
      leg2.replaceChildren(legendFromSpec(spec2), legend([{ label: '実際の光合成速度', color: 'c2', dash: 'dash' }]));

      const lines = [];
      const fname = FACTORS[lim.factor].name;
      lines.push(`いまの限定要因は「${fname}」。光合成速度は、最も強く速度をおさえている要因（上限が最も小さい要因。多くは最も不足している要因）でほぼ決まり、実際の速度 ${fmt(P, 0)} はその上限 ${fmt(k[lim.factor], 0)} を少し下回る値になっている。`);
      if (lim.close) lines.push(`${FACTORS[lim.second].name}の上限も ${fmt(k[lim.second], 0)} とほぼ同じなので、${fname}と${FACTORS[lim.second].name}の両方を増やさないと、速度はあまり上がらない。`);
      if (lim.factor === 'light') {
        lines.push(`光が弱いので、光の強さを強くすると速度は光の強さにほぼ比例して増える（1キロルクスあたり約${ALPHA}）。一方、CO₂濃度や温度を変えても速度はほとんど変わらない。光が弱いと、光エネルギーを使う反応でつくられる ATP や NADPH が不足し、カルビン回路がそれ以上速く進めないからである。`);
      } else if (lim.factor === 'co2') {
        lines.push('光は十分に強いので、光をさらに強くしても速度はほとんど増えない（光飽和）。CO₂濃度を高くすると速度が上がる。CO₂を取り込む反応（カルビン回路）の材料が不足しているからである。');
      } else {
        lines.push(T > T_OPT
          ? `温度がこの植物の最適温度（約${T_OPT}℃。モデルで決めた値）より高く、光合成にはたらく酵素が失活しはじめているので、速度が下がっている。光を強くしてもCO₂濃度を高くしても速度は上がらない。`
          : `温度が低く、光合成にはたらく酵素の反応（カルビン回路）がおそいので、光を強くしてもCO₂濃度を高くしても速度は上がらない。温度をこの植物の最適温度（約${T_OPT}℃。モデルで決めた値）に近づけると速度が上がる。`);
      }
      if (st.compare === 'co2') lines.push('比較の曲線：弱い光では、どのCO₂濃度でも曲線が重なる（光が限定要因）。光が強くなると、CO₂濃度の高いほうが高い位置で頭打ちになる（CO₂濃度が限定要因）。');
      if (st.compare === 'temp') lines.push('比較の曲線：弱い光では温度による差がほとんどない（光が限定要因）。光が強くなると、温度によって頭打ちになる高さが違ってくる。');
      exp.set(lines);
      ctx.update({ ...st, factor: lim.factor, close: lim.close, changedWhileLight: track.changedWhileLight, touched: track.touched });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.touched > 0 && s.factor === 'light' && !s.close;
dojo.tasks[1].check = (s) => s.touched > 0 && s.factor === 'co2' && !s.close;
dojo.tasks[2].check = (s) => s.touched > 0 && s.factor === 'temp' && !s.close;
dojo.tasks[3].check = (s) => s.factor === 'light' && s.changedWhileLight >= 3;
dojo.tasks[4].check = (s) => s.compare === 'co2';
