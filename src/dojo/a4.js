// A4 興奮の伝導 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { membrane, fires, nerveResponse, velocity, latency, REST, PEAK, THRESHOLD, THRESHOLD_STIM, NERVE_SPREAD, PHASES, PEAK_TIME, T_END } from '../models/nerve.js';
import { sample } from '../lib/series.js';

const STIM_MAX = 40;
// 神経の種類：伝導速度［m/s］と、神経筋接合部での伝達・筋肉の収縮開始までの時間［ms］
const FIBERS = {
  myelin: { label: '有髄神経繊維（カエルの座骨神経）', v: 30, rest: 2.5 },
  plain: { label: '無髄神経繊維', v: 2, rest: 2.5 },
};

export const dojo = {
  tasks: [
    { id: 'sub', text: '①で、刺激の強さを閾値より小さくすると、活動電位が生じない（膜電位が少し変化するだけ）ことを確かめよう。', short: '閾値未満では興奮しない' },
    { id: 'allornone', text: '①で、閾値以上の刺激の強さを大きく変えても（差を10以上）、活動電位の大きさが変わらないことを確かめよう。', short: '全か無かの法則' },
    { id: 'bundle', text: '①の下の図で、神経（神経繊維の束）では、刺激を強くするほど興奮の大きさが段階的に大きくなる範囲に刺激の強さを合わせよう。', short: '神経は段階的に大きくなる' },
    { id: 'velocity', text: '②で、刺激する2点の位置を変えても、計算で求めた伝導速度が変わらないことを確かめよう（位置を2回以上変える）。', short: '伝導速度は一定' },
    { id: 'plain', text: '②で、無髄神経繊維に切り替えて、有髄神経繊維より伝導速度がずっと小さいことを確かめよう。', short: '有髄と無髄' },
  ],
  mount(root, ctx) {
    const st = { tab: 'ap', stim: 12, fiber: 'myelin', dA: 60, dB: 20 };
    const seen = { stims: new Set(), moves: 0 };

    const tabs = segmented({ label: 'グラフ', options: [{ value: 'ap', label: '①活動電位と閾値' }, { value: 'cv', label: '②伝導速度の測定' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '膜電位の変化のグラフ', aspect: 0.66 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);
    const sub = h('div');
    top.append(sub);
    const chart2 = createChart(sub, { label: '刺激の強さと興奮の大きさのグラフ', aspect: 0.56 });
    const leg2 = h('div');
    const note2 = h('p', { class: 'small muted' });
    sub.append(leg2, note2);

    const sStim = slider({ label: '刺激の強さ（相対値）', min: 0, max: STIM_MAX, step: 1, value: st.stim, format: (v) => String(v), onInput: (v) => { st.stim = v; update(); } });
    const ctlAp = h('div', null, sStim.el);

    const segF = segmented({ label: '神経の種類', options: Object.entries(FIBERS).map(([value, f]) => ({ value, label: f.label })), value: st.fiber, onChange: (v) => { st.fiber = v; update(); } });
    const sA = slider({ label: '刺激する点A（筋肉からの距離）', min: 40, max: 90, step: 5, value: st.dA, format: (v) => `${v} mm`, onInput: (v) => { st.dA = v; seen.moves++; update(); } });
    const sB = slider({ label: '刺激する点B（筋肉からの距離）', min: 5, max: 30, step: 5, value: st.dB, format: (v) => `${v} mm`, onInput: (v) => { st.dB = v; seen.moves++; update(); } });
    const result = h('div', { class: 'explain', 'aria-live': 'polite' });
    const ctlCv = h('div', null, segF.el, sA.el, sB.el, result);

    const exp = explainBox();
    root.append(panel('操作', ctlAp, ctlCv), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlAp.hidden = st.tab !== 'ap';
      ctlCv.hidden = st.tab !== 'cv';
      update();
    }

    function drawAp() {
      const { stim } = st;
      const on = fires(stim);
      title.replaceChildren('1本の神経繊維の膜電位 ', modelNote());
      const regions = on
        ? [
          { x0: PHASES.depol.from, x1: PHASES.depol.to, fill: 'region-2' },
          { x0: PHASES.repol.from, x1: PHASES.repol.to, fill: 'region' },
        ]
        : [];
      chart.draw({
        alt: `刺激の強さ ${stim}。${on ? '活動電位が生じる' : '活動電位は生じない'}`,
        x: { min: 0, max: T_END, label: '時間（ミリ秒）', step: 1 },
        y: { min: -100, max: 60, label: '膜電位（mV）', step: 20 },
        regions,
        series: [{ points: sample((t) => membrane(t, stim), 0, T_END, 360), color: 'c1', width: 3 }],
        hlines: [
          { y: REST, color: 'c3', dash: 'dot', label: `静止電位 ${REST} mV` },
          { y: THRESHOLD, color: 'c2', dash: 'dash', label: `閾値に相当する膜電位 ${THRESHOLD} mV`, align: 'right' },
        ],
        vlines: [{ x: 1, color: 'c4', dash: 'dot' }],
        markers: on ? [{ x: PEAK_TIME, y: PEAK, color: 'c1' }] : [],
        texts: [{ x: 0.95, y: -88, text: '刺激 ↑', color: 'c4', align: 'right' }, ...(on ? [{ x: 2.6, y: 28, text: `← ピーク ＋${PEAK} mV`, color: 'c1', align: 'left' }, { x: 1.2, y: 0, text: '脱分極 →', color: 'c2', align: 'right' }, { x: 2.15, y: 0, text: '← 再分極', color: 'c1', align: 'left' }] : [])],
      });
      leg.replaceChildren(legend([{ label: '膜電位（細胞外を基準にした細胞内の電位）', color: 'c1' }, { label: '静止電位', color: 'c3', dash: 'dot' }, { label: '閾値に相当する膜電位', color: 'c2', dash: 'dash' }]));
      note.textContent = '静止電位 約−70 mV、ピーク 約＋40 mV、1〜2ミリ秒で静止電位にもどる（教科書の図の目安による模式）。';

      const nerveLine = sample((s) => nerveResponse(s) * 100, 0, STIM_MAX, 400);
      const fiberLine = sample((s) => (fires(s) ? 100 : 0), 0, STIM_MAX, 400);
      chart2.draw({
        alt: '刺激の強さと興奮の大きさ',
        x: { min: 0, max: STIM_MAX, label: '刺激の強さ（相対値）', step: 5 },
        y: { min: 0, max: 115, label: '興奮の大きさ（%）', step: 20 },
        series: [
          { points: fiberLine, color: 'c1', width: 3, label: '1本の神経繊維' },
          { points: nerveLine, color: 'c2', dash: 'dash', width: 3, label: '神経（繊維の束）', labelAt: THRESHOLD_STIM * NERVE_SPREAD + 5 },
        ],
        vlines: [{ x: stim, color: 'c4', dash: 'dot' }],
        markers: [
          { x: stim, y: fires(stim) ? 100 : 0, color: 'c1' },
          { x: stim, y: nerveResponse(stim) * 100, color: 'c2', shape: 'square' },
        ],
      });
      leg2.replaceChildren(legend([{ label: '1本の神経繊維（全か無か）', color: 'c1' }, { label: '神経（閾値の異なる多数の神経繊維の束）', color: 'c2', dash: 'dash' }, { label: `いまの刺激の強さ（${stim}）`, color: 'c4', dash: 'dot' }]));
      note2.textContent = `神経は閾値が ${THRESHOLD_STIM}〜${THRESHOLD_STIM * NERVE_SPREAD} の神経繊維が20本集まったものとした模式。`;

      const lines = [];
      if (stim === 0) {
        lines.push('刺激がないので、膜電位は静止電位（約−70 mV）のまま。静止状態では、ナトリウムポンプによって細胞内に K⁺ が多く、細胞外に Na⁺ が多い。常に開いているカリウムチャネルから K⁺ が細胞外へ流出するので、細胞内は細胞外に対して負になっている。');
      } else if (!on) {
        lines.push(`刺激の強さ ${stim} は閾値（${THRESHOLD_STIM}）より小さいので、膜電位が少し上がるだけで、すぐにもとにもどる。活動電位は生じない。`);
      } else {
        lines.push(`刺激の強さ ${stim} は閾値（${THRESHOLD_STIM}）以上なので、活動電位が生じる。電位依存性のナトリウムチャネルが開いて Na⁺ が細胞内に流入し、膜電位が急に上がって（脱分極）、内側が正になる。脱分極とは、膜電位が静止電位より正の方向へ変化することである。`);
        lines.push('すぐにナトリウムチャネルは閉じ、電位依存性のカリウムチャネルが開いて K⁺ が流出するので、膜電位は下がって静止電位にもどる（再分極）。一時的に静止電位より低くなってからもとにもどる。');
        lines.push(`閾値以上なら、刺激をどれだけ強くしても活動電位の大きさ（${PEAK - REST} mV）は変わらない（全か無かの法則）。刺激の強さの情報は、活動電位の大きさではなく、発生する頻度で伝えられる。`);
      }
      const nr = nerveResponse(stim);
      lines.push(nr > 0 && nr < 1
        ? `下の図：神経は閾値の異なる多数の神経繊維の束なので、刺激を強くすると興奮する神経繊維の数が増え、神経全体の興奮は段階的に大きくなる（いまは ${fmt(nr * 100, 0)}% の神経繊維が興奮）。1本1本の神経繊維は全か無かの法則にしたがっている。`
        : nr >= 1
          ? '下の図：すべての神経繊維が興奮しているので、これ以上刺激を強くしても神経全体の興奮は大きくならない。'
          : '下の図：どの神経繊維の閾値にも達していないので、神経は興奮しない。');
      exp.set(lines);
    }

    function drawCv() {
      const f = FIBERS[st.fiber];
      const tA = latency(st.dA, f.v, f.rest);
      const tB = latency(st.dB, f.v, f.rest);
      const v = velocity(st.dA, tA, st.dB, tB);
      title.replaceChildren('刺激してから筋肉が収縮しはじめるまで ', modelNote());
      const tMax = Math.ceil((tA * 1.35) / 5) * 5;
      const twitch = (t0) => (t) => (t < t0 ? 0 : 100 * (1 - Math.exp(-(t - t0) / (tMax / 12))));
      chart.draw({
        alt: `点A ${st.dA} mm で ${fmt(tA, 2)} ミリ秒、点B ${st.dB} mm で ${fmt(tB, 2)} ミリ秒`,
        x: { min: 0, max: tMax, label: '刺激してからの時間（ミリ秒）', step: tMax <= 10 ? 1 : tMax <= 50 ? 5 : 10 },
        y: { min: 0, max: 120, label: '筋肉の張力（相対値）', step: 20 },
        series: [
          { points: sample(twitch(tB), 0, tMax, 400), color: 'c1', width: 3, label: '点Bを刺激' },
          { points: sample(twitch(tA), 0, tMax, 400), color: 'c2', dash: 'dash', width: 3, label: '点Aを刺激' },
        ],
        vlines: [
          { x: tB, color: 'c1', dash: 'dot', label: `B：${fmt(tB, 2)} ms` },
          { x: tA, color: 'c2', dash: 'dot', label: `A：${fmt(tA, 2)} ms`, dy: 18 },
        ],
      });
      leg.replaceChildren(legend([{ label: `点B（筋肉から ${st.dB} mm）を刺激`, color: 'c1' }, { label: `点A（筋肉から ${st.dA} mm）を刺激`, color: 'c2', dash: 'dash' }]));
      note.textContent = '座骨神経と腓腹筋（ふくらはぎの筋肉）の標本で、神経上の2点A・Bを刺激し、筋肉が収縮しはじめるまでの時間をはかる実験の模式。' + (st.fiber === 'plain' ? '「無髄神経繊維」は、伝導速度を比べるために、仮に神経が無髄神経繊維だった場合を示した模式（実際の骨格筋の運動神経は有髄神経繊維）。' : '');
      chart2.draw({
        alt: '神経と筋肉と刺激点の位置',
        x: { min: -20, max: 100, label: '筋肉からの距離（mm）', ticks: [0, 20, 40, 60, 80, 100] },
        y: { min: 0, max: 1, ticks: [] },
        polygons: [{ points: [[-18, 0.25], [0, 0.35], [0, 0.65], [-18, 0.75]], fill: 'region-2', stroke: 'c2', label: '筋肉', at: [-9, 0.5] }],
        series: [{ points: [[0, 0.5], [100, 0.5]], color: 'fg', width: 3 }],
        markers: [
          { x: st.dB, y: 0.5, color: 'c1', label: `B（${st.dB} mm）` },
          { x: st.dA, y: 0.5, color: 'c2', shape: 'square', label: `A（${st.dA} mm）` },
        ],
        texts: [{ x: 70, y: 0.2, text: st.fiber === 'plain' ? '神経（仮に無髄とした場合）' : '神経（座骨神経）', color: 'muted' }],
      });
      leg2.replaceChildren();
      note2.textContent = '';
      const tRest = tA - st.dA / v;
      result.replaceChildren(
        h('p', null, `測定結果：点A → ${fmt(tA, 2)} ミリ秒、点B → ${fmt(tB, 2)} ミリ秒`),
        h('p', null, `伝導速度 ＝ 2点間の距離 ÷ 時間の差 ＝ (${st.dA} − ${st.dB}) mm ÷ (${fmt(tA, 2)} − ${fmt(tB, 2)}) ms ＝ ${fmt(v, 1)} mm/ms ＝ ${fmt(v, 1)} m/s`),
        h('p', null, `神経の末端に興奮が届いてから筋肉が収縮しはじめるまでの時間 ＝ ${fmt(tA, 2)} − ${st.dA} ÷ ${fmt(v, 1)} ＝ ${fmt(tRest, 2)} ミリ秒`),
      );
      exp.set([
        '刺激してから筋肉が収縮しはじめるまでの時間には、興奮が神経を伝わる時間のほかに、神経筋接合部で興奮が伝達され、筋肉が収縮しはじめるまでの時間が含まれる。1点の測定だけでは伝導速度は求められない。',
        '2点で刺激すると、伝達と収縮開始にかかる時間はどちらも同じなので、時間の差は「2点間を興奮が伝わるのにかかった時間」になる。だから 伝導速度 ＝ 2点間の距離 ÷ 時間の差 で求められる。',
        st.fiber === 'myelin'
          ? '有髄神経繊維では、電気を通しにくい髄鞘のすき間（ランビエ絞輪）からランビエ絞輪へと興奮がとびとびに伝わる（跳躍伝導）ので、伝導速度が大きい。'
          : '無髄神経繊維は髄鞘がなく、興奮が隣の部分へ順に伝わるので、跳躍伝導をする有髄神経繊維に比べて伝導速度がずっと小さい。',
      ]);
      return v;
    }

    function update() {
      let v = null;
      if (st.tab === 'ap') {
        drawAp();
        seen.stims.add(st.stim);
      } else v = drawCv();
      ctx.update({ ...st, stims: [...seen.stims], moves: seen.moves, v });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'ap' && s.stim > 0 && s.stim < THRESHOLD_STIM;
dojo.tasks[1].check = (s) => {
  const on = s.stims.filter((x) => x >= THRESHOLD_STIM);
  return s.tab === 'ap' && on.length >= 2 && Math.max(...on) - Math.min(...on) >= 10;
};
dojo.tasks[2].check = (s) => s.tab === 'ap' && nerveResponse(s.stim) > 0.2 && nerveResponse(s.stim) < 0.8;
dojo.tasks[3].check = (s) => s.tab === 'cv' && s.moves >= 2;
dojo.tasks[4].check = (s) => s.tab === 'cv' && s.fiber === 'plain';
