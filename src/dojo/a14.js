// A14 シナプスと興奮の統合 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { potential, firstCrossing, buildInputs, REST, THRESHOLD, EPSP, IPSP, T_END } from '../models/synapse.js';
import { monotoneCubic } from '../lib/interp.js';
import { sample } from '../lib/series.js';

const mv = (v) => String(v).replace('-', '−');

// 閾値に達したら活動電位を重ねて描く（模式）
function trace(inputs) {
  const tc = firstCrossing(inputs);
  if (tc == null) return { tc, f: (t) => potential(t, inputs) };
  const back = potential(tc + 4, inputs);
  const spike = monotoneCubic([[0, THRESHOLD], [0.5, 40], [1.4, REST], [2, REST - 8], [4, Math.min(back, REST)]]);
  return { tc, f: (t) => (t < tc ? potential(t, inputs) : t < tc + 4 ? spike(t - tc) : Math.min(potential(t, inputs), REST)) };
}

export const dojo = {
  tasks: [
    { id: 'single', text: 'ニューロンAから1回だけ入力して、EPSPだけでは閾値に達しないことを確かめよう。', short: 'EPSP 1回' },
    { id: 'temporal', text: 'Aからの入力を短い間隔でくり返し、時間的加重で活動電位を起こそう。', short: '時間的加重' },
    { id: 'spatial', text: 'AとBから同時に入力して、空間的加重で活動電位を起こそう（Aは1回）。', short: '空間的加重' },
    { id: 'inhib', text: '活動電位が起こる入力に、抑制性ニューロンCの入力を加えて、活動電位が起こらなくなることを確かめよう。', short: '抑制性シナプス' },
    { id: 'long', text: 'Aから2回入力し、間隔を長く（15ミリ秒以上）すると加重が起こりにくいことを確かめよう。', short: '間隔が長いと' },
  ],
  mount(root, ctx) {
    const st = { nA: 1, interval: 5, useB: false, useC: false, touched: 0, firedWithoutC: false };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'シナプス後細胞の膜電位 ', modelNote()));
    const chart = createChart(top, { label: 'シナプス後細胞の膜電位のグラフ', aspect: 0.66 });
    const leg = h('div');
    top.append(leg, h('p', { class: 'small muted' }, `興奮性ニューロンA・Bと抑制性ニューロンCが、1つのシナプス後細胞にシナプスをつくっているとした模式。EPSP は1回 約${EPSP > 0 ? '＋' : ''}${EPSP} mV、IPSP は1回 約${mv(IPSP)} mV、閾値は ${mv(THRESHOLD)} mV。`));

    const sN = slider({ label: 'ニューロンAからの入力の回数', min: 1, max: 4, step: 1, value: st.nA, format: (v) => `${v} 回`, onInput: (v) => { st.nA = v; st.touched++; update(); } });
    const sI = slider({ label: 'Aからの入力の間隔', min: 1, max: 20, step: 1, value: st.interval, format: (v) => `${v} ミリ秒`, onInput: (v) => { st.interval = v; st.touched++; update(); } });
    const segB = segmented({ label: '興奮性ニューロンB（Aの1回目と同時）', options: [{ value: false, label: 'Bなし' }, { value: true, label: 'Bあり' }], value: st.useB, onChange: (v) => { st.useB = v; st.touched++; update(); } });
    const segC = segmented({ label: '抑制性ニューロンC（Aの1回目と同時）', options: [{ value: false, label: 'Cなし' }, { value: true, label: 'Cあり' }], value: st.useC, onChange: (v) => { st.useC = v; st.touched++; update(); } });
    const exp = explainBox();
    root.append(panel('操作', sN.el, sI.el, segB.el, segC.el), panel('いま何が起きているか', exp.el));

    function update() {
      const inputs = buildInputs(st);
      const tr = trace(inputs);
      const noC = firstCrossing(buildInputs({ ...st, useC: false })) != null;
      chart.draw({
        alt: tr.tc != null ? `${fmt(tr.tc, 1)} ミリ秒で閾値に達し、活動電位が生じる` : '閾値に達しない',
        x: { min: 0, max: T_END, label: '時間（ミリ秒）', step: 10 },
        y: { min: -90, max: 50, label: '膜電位（mV）', step: 20 },
        series: [{ points: sample(tr.f, 0, T_END, 800), color: 'c1', width: 3 }],
        hlines: [
          { y: THRESHOLD, color: 'c2', dash: 'dash', label: `閾値 ${mv(THRESHOLD)} mV`, align: 'right' },
          { y: REST, color: 'c3', dash: 'dot', label: `静止電位 ${mv(REST)} mV` },
        ],
        markers: inputs.map((i) => ({ x: i.t, y: -86, color: i.amp > 0 ? (i.from === 'A' ? 'c1' : 'c4') : 'c2', shape: i.amp > 0 ? 'diamond' : 'square' })),
      });
      leg.replaceChildren(legend([{ label: 'シナプス後細胞の膜電位', color: 'c1' }, { label: '閾値', color: 'c2', dash: 'dash' }]), h('p', { class: 'small muted' }, '下の◆は興奮性ニューロン（A：青、B：紫）、■は抑制性ニューロンC からの入力の時刻。'));
      const lines = [];
      lines.push('シナプス前細胞の末端に興奮が伝わると、神経伝達物質がシナプス間隙に放出され、シナプス後細胞の受容体に結合する。興奮性シナプスでは Na⁺ などが流入して脱分極（EPSP）、抑制性シナプスでは Cl⁻ が流入するなどして過分極（IPSP）が起こる。');
      if (tr.tc != null) lines.push(`膜電位の和が閾値に達したので（${fmt(tr.tc, 1)} ミリ秒）、シナプス後細胞に活動電位が生じた。`);
      else lines.push('膜電位の和が閾値に達しないので、シナプス後細胞に活動電位は生じない。');
      if (st.nA >= 2) lines.push(st.interval <= 5 ? `Aからの入力の間隔が短い（${st.interval} ミリ秒）ので、前のEPSPが消えないうちに次のEPSPが重なる（時間的加重）。` : `間隔が ${st.interval} ミリ秒と長いので、前のEPSPがほとんど消えてから次のEPSPが起こり、重なりが小さい。`);
      if (st.useB) lines.push('AとBから同時に入力があるので、2つのEPSPが足し合わされる（空間的加重）。');
      if (st.useC) lines.push('抑制性ニューロンCからの IPSP が加わり、膜電位が下げられる。このように、多くのシナプスからの入力が足し合わされ、その結果で興奮するかどうかが決まる（興奮の統合）。');
      exp.set(lines);
      ctx.update({ ...st, fired: tr.tc != null, firedNoC: noC });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.touched > 0 && s.nA === 1 && !s.useB && !s.useC && !s.fired;
dojo.tasks[1].check = (s) => s.nA >= 2 && !s.useB && !s.useC && s.fired;
dojo.tasks[2].check = (s) => s.nA === 1 && s.useB && !s.useC && s.fired;
dojo.tasks[3].check = (s) => s.useC && !s.fired && s.firedNoC;
dojo.tasks[4].check = (s) => s.nA === 2 && s.interval >= 15 && !s.useB && !s.useC && !s.fired;
