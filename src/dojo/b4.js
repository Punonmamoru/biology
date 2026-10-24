// B4 光の強さと光合成（陽生植物・陰生植物）の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { PLANTS, apparent, gross, compensationPoint, saturationPoint, crossingPoint } from '../models/photosynthesis.js';
import { sample } from '../lib/series.js';

const STYLE = { sun: { color: 'c2', dash: 'solid' }, shade: { color: 'c1', dash: 'dash' } };

function status(p, I) {
  const a = apparent(p, I);
  const ic = compensationPoint(p);
  if (Math.abs(I - ic) < Math.max(0.02, ic * 0.04)) return 'ほぼ補償点：光合成速度と呼吸速度が等しく、見かけ上CO₂の出入りがない';
  if (a < 0) return '補償点より弱い光：呼吸速度が光合成速度を上回り、CO₂を放出している（光合成は行っている）';
  if (I >= saturationPoint(p)) return '光飽和点以上：光を強くしても速度はほとんど増えない（CO₂濃度や温度が限定要因）';
  return '補償点と光飽和点の間：光を強くするほど見かけの光合成速度が大きくなる';
}

export const dojo = {
  tasks: [
    { id: 'sunComp', text: '「陽生植物」で、光の強さを補償点（見かけの光合成速度＝0）に合わせよう。', short: '陽生植物の補償点' },
    { id: 'shadeComp', text: '「陰生植物」で、補償点を探そう（「弱光を拡大」が便利）。', short: '陰生植物の補償点' },
    { id: 'cross', text: '「両方」で、陰生植物のほうが見かけの光合成速度が大きい光の強さを見つけよう。', short: '弱光では陰生植物が有利' },
    { id: 'sat', text: '「陽生植物」で、光の強さを光飽和点に合わせよう。', short: '陽生植物の光飽和点' },
  ],
  mount(root, ctx) {
    const st = { show: 'both', I: 10, zoom: false };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '光の強さとCO₂吸収速度 ', modelNote()));
    const chart = createChart(top, { label: '光の強さと見かけの光合成速度のグラフ', aspect: 0.75 });
    const leg = h('div');
    top.append(leg, h('p', { class: 'small muted' }, '光合成速度 P ＝ Pmax·I/(K＋I)、見かけの光合成速度 ＝ P − 呼吸速度。光飽和点は、ここでは光合成速度が最大値の90%に達する光の強さとした。'));

    const segShow = segmented({ label: '表示する植物', options: [{ value: 'sun', label: '陽生植物' }, { value: 'shade', label: '陰生植物' }, { value: 'both', label: '両方' }], value: st.show, onChange: (v) => { st.show = v; update(); } });
    const segZoom = segmented({ label: '横軸の範囲', options: [{ value: false, label: '全体（0〜60）' }, { value: true, label: '弱光を拡大（0〜6）' }], value: st.zoom, onChange: (v) => {
      st.zoom = v;
      sI.input.step = v ? '0.01' : '0.05';
      sI.setRange(0, v ? 6 : 60);
      st.I = sI.value;
      update();
    } });
    const sI = slider({ label: '光の強さ', min: 0, max: 60, step: 0.05, value: st.I, format: (v) => fmt(v, 2) + ' キロルクス', onInput: (v) => { st.I = v; update(); } });
    const readout = h('div', { class: 'small', 'aria-live': 'polite' });
    const exp = explainBox();
    root.append(panel('操作', segShow.el, segZoom.el, sI.el, readout), panel('いま何が起きているか', exp.el));

    function update() {
      const xMax = st.zoom ? 6 : 60;
      const keys = st.show === 'both' ? ['sun', 'shade'] : [st.show];
      const series = [];
      const markers = [];
      const hlines = [];
      for (const k of keys) {
        const p = PLANTS[k];
        series.push({ points: sample((I) => apparent(p, I), 0, xMax, 300), color: STYLE[k].color, dash: STYLE[k].dash, width: 3, label: p.name, legendLabel: p.name + '（見かけの光合成速度）' });
        const ic = compensationPoint(p);
        const is = saturationPoint(p);
        const single = keys.length === 1;
        markers.push({ x: ic, y: 0, color: STYLE[k].color, label: single || st.zoom ? (single ? '補償点' : `補償点（${p.name.slice(0, 2)}）`) : null, dy: k === 'shade' ? -18 : 0 });
        if (is <= xMax) markers.push({ x: is, y: apparent(p, is), color: STYLE[k].color, shape: 'square', label: single ? '光飽和点' : `光飽和点（${p.name.slice(0, 2)}）`, dy: 22 });
        if (keys.length === 1) {
          series.push({ points: sample((I) => gross(p, I), 0, xMax, 300), color: 'muted', dash: 'dot', width: 2, label: '光合成速度', legendLabel: '光合成速度（見かけ＋呼吸）' });
          hlines.push({ y: -p.R, color: 'muted', dash: 'dot', label: `呼吸速度 ${fmt(p.R, 1)}（光がなくても続く）` });
        }
      }
      const yMin = keys.includes('sun') ? -6 : -2;
      const yMax = st.zoom ? (keys.includes('sun') ? 8 : 6) : keys.length === 1 && keys[0] === 'shade' ? 8 : 22;
      chart.draw({
        alt: `光の強さ ${fmt(st.I, 2)} キロルクス`,
        x: { min: 0, max: xMax, label: '光の強さ（キロルクス）', step: st.zoom ? 1 : 10 },
        y: { min: yMin, max: yMax, label: 'CO₂吸収速度（相対値）', step: 2 },
        series,
        markers,
        hlines,
        vlines: [{ x: st.I, color: 'fg', dash: 'dash', width: 1.5, label: `${fmt(st.I, 2)}` }],
      });
      leg.replaceChildren(legend(series.map((s) => ({ label: s.legendLabel, color: s.color, dash: s.dash }))));

      const vals = keys.map((k) => ({ k, p: PLANTS[k], a: apparent(PLANTS[k], st.I) }));
      readout.replaceChildren(...vals.map((v) => h('div', null, h('b', null, v.p.name), `：見かけ ${fmt(v.a, 2)}、光合成 ${fmt(gross(v.p, st.I), 2)}、呼吸 ${fmt(v.p.R, 1)}`)));

      const lines = vals.map((v) => `${v.p.name}：${status(v.p, st.I)}。`);
      const cross = crossingPoint(PLANTS.sun, PLANTS.shade);
      if (keys.length === 2) {
        lines.push(`2本の曲線は約 ${fmt(cross, 1)} キロルクスで交わる。これより弱い光では陰生植物のほうが見かけの光合成速度が大きい。陰生植物は呼吸速度が小さく補償点が低いので、弱い光でも成長できるからである。`);
      }
      lines.push(`補償点：陽生植物 約${fmt(compensationPoint(PLANTS.sun), 2)}、陰生植物 約${fmt(compensationPoint(PLANTS.shade), 2)} キロルクス。光飽和点：陽生植物 約${fmt(saturationPoint(PLANTS.sun), 0)}、陰生植物 約${fmt(saturationPoint(PLANTS.shade), 1)} キロルクス。`);
      if (st.I < 3) {
        lines.push('森林の林床はこのくらい暗い。陽樹の芽生えは補償点が高く育ちにくいが、陰樹の芽生えは育つことができる。そのため遷移が進むと、陽樹林はやがて陰樹林に置きかわり、陰樹林が極相となる。');
      }
      exp.set(lines);
      ctx.update({ ...st, cross });
    }
    update();
    return null;
  },
};

const near = (I, x, tol) => Math.abs(I - x) <= tol;
dojo.tasks[0].check = (s) => s.show !== 'shade' && near(s.I, compensationPoint(PLANTS.sun), 0.1);
dojo.tasks[1].check = (s) => s.show !== 'sun' && near(s.I, compensationPoint(PLANTS.shade), 0.03);
dojo.tasks[2].check = (s) => s.show === 'both' && s.I > 0 && s.I < s.cross - 0.05;
dojo.tasks[3].check = (s) => s.show !== 'shade' && near(s.I, saturationPoint(PLANTS.sun), 1);
