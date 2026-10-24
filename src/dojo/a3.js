// A3 個体群の成長 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, niceStep } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { logistic, exponential, logisticRate, inflectionTime, lotkaVolterra, peakTimes } from '../models/population.js';
import { sample } from '../lib/series.js';

const T_LOG = 30;
const T_LV = 50;

export const dojo = {
  tasks: [
    { id: 'k', text: '①で、K を変えても、個体数がいつも K の線に近づいていくことを確かめよう（K を600以上に）。', short: '環境収容力' },
    { id: 'over', text: '①で、最初の個体数 N₀ を K より大きくすると、個体数が減って K に近づくことを確かめよう。', short: 'N₀ ＞ K' },
    { id: 'lag', text: '②の時間グラフで、捕食者の山が被食者の山より遅れて現れることを確かめよう（2つ目の山の時刻を比べる）。', short: '捕食者の山は遅れる' },
    { id: 'phase', text: '②を「相図」に切り替えて、個体数の変化が反時計回りの輪を描くことを確かめよう。', short: '相図の輪' },
  ],
  mount(root, ctx) {
    const st = { tab: 'log', r: 0.5, K: 500, N0: 10, a: 1, b: 0.1, d: 0.5, c: 0.02, view: 'time' };
    const seen = { k: false };

    const tabs = segmented({ label: 'グラフ', options: [{ value: 'log', label: '①ロジスティック成長' }, { value: 'lv', label: '②被食者と捕食者' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '個体数の変化のグラフ', aspect: 0.72 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const sr = slider({ label: '内的自然増加率 r', min: 0.1, max: 1.5, step: 0.05, value: st.r, format: (v) => fmt(v, 2), onInput: (v) => { st.r = v; update(); } });
    const sK = slider({ label: '環境収容力 K', min: 100, max: 1000, step: 50, value: st.K, format: (v) => String(v), onInput: (v) => { st.K = v; seen.k = seen.k || v >= 600; update(); } });
    const sN0 = slider({ label: '最初の個体数 N₀', min: 2, max: 1200, step: 2, value: st.N0, format: (v) => String(v), onInput: (v) => { st.N0 = v; update(); } });
    const ctlLog = h('div', null, sr.el, sK.el, sN0.el);

    const sa = slider({ label: '被食者の増殖率 a', min: 0.4, max: 1.6, step: 0.05, value: st.a, format: (v) => fmt(v, 2), onInput: (v) => { st.a = v; update(); } });
    const sb = slider({ label: '捕食率 b（出会ったときに食べられる割合）', min: 0.04, max: 0.2, step: 0.01, value: st.b, format: (v) => fmt(v, 2), onInput: (v) => { st.b = v; update(); } });
    const sd = slider({ label: '捕食者の死亡率 d', min: 0.2, max: 1, step: 0.05, value: st.d, format: (v) => fmt(v, 2), onInput: (v) => { st.d = v; update(); } });
    const segV = segmented({ label: '表示', options: [{ value: 'time', label: '時間グラフ' }, { value: 'phase', label: '相図（被食者×捕食者）' }], value: st.view, onChange: (v) => { st.view = v; update(); } });
    const ctlLv = h('div', null, segV.el, sa.el, sb.el, sd.el);

    const exp = explainBox();
    root.append(panel('操作', ctlLog, ctlLv), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlLog.hidden = st.tab !== 'log';
      ctlLv.hidden = st.tab !== 'lv';
      update();
    }

    function drawLog() {
      const { r, K, N0 } = st;
      title.replaceChildren('ロジスティック成長と指数関数的成長 ', modelNote());
      const yMax = Math.max(K, N0) * 1.3;
      const ti = inflectionTime(N0, r, K);
      chart.draw({
        alt: `r ${r}、K ${K}、N0 ${N0}`,
        x: { min: 0, max: T_LOG, label: '時間', step: 5 },
        y: { min: 0, max: yMax, label: '個体数 N', step: niceStep(yMax) },
        series: [
          { points: sample((t) => Math.min(exponential(t, N0, r), yMax * 3), 0, T_LOG, 300), color: 'c2', dash: 'dash', width: 2.5, label: '指数関数的成長', labelAt: Math.min(T_LOG - 3, Math.log((yMax * 0.97) / N0) / r) },
          { points: sample((t) => logistic(t, N0, r, K), 0, T_LOG, 300), color: 'c1', width: 3, label: 'ロジスティック成長' },
        ],
        hlines: [{ y: K, color: 'c3', dash: 'dot', label: `環境収容力 K ＝ ${K}` }],
        markers: ti != null && ti < T_LOG ? [{ x: ti, y: K / 2, color: 'c1', label: `K/2：増加速度が最大（dN/dt＝${fmt(logisticRate(K / 2, r, K), 1)}）` }] : [],
      });
      leg.replaceChildren(legend([{ label: 'ロジスティック成長 dN/dt ＝ rN(K−N)/K', color: 'c1' }, { label: '指数関数的成長 dN/dt ＝ rN（比較）', color: 'c2', dash: 'dash' }, { label: '環境収容力 K', color: 'c3', dash: 'dot' }]));
      note.textContent = '時間・個体数の単位は任意（模式図）。';
      const lines = [];
      if (N0 < K) {
        lines.push('はじめは個体数が少なく、食物や生活空間に余裕があるので、指数関数的成長とほぼ同じように急に増える（グラフはJ字形に近い）。');
        lines.push(`個体数が増えると、食物や空間の不足、排出物の増加などで増加の勢いが落ちる（密度効果）。増加速度は N ＝ K/2 ＝ ${K / 2} のとき最大になり、そのあと K に近づいて増えなくなる。全体としてS字形の成長曲線になる。`);
      } else if (N0 > K) {
        lines.push(`最初の個体数（${N0}）が環境収容力（${K}）より多いので、(K−N) が負になり、個体数は減って K に近づく。環境が養える個体数の上限が K だからである。`);
      } else {
        lines.push('最初から K と同じ個体数なので、増えも減りもしない。');
      }
      lines.push(`r を大きくすると K に達するのが早くなるが、最終的な個体数 K は変わらない。K は食物・空間などの環境の条件で決まるからである。`);
      exp.set(lines);
    }

    function drawLv() {
      const p = { a: st.a, b: st.b, c: st.c, d: st.d, x0: 40, y0: 6 };
      const run = lotkaVolterra(p, T_LV);
      const px = peakTimes(run, 'x');
      const py = peakTimes(run, 'y');
      const xMax = Math.max(...run.map((q) => q.x));
      const yMaxV = Math.max(...run.map((q) => q.y));
      title.replaceChildren('被食者と捕食者の個体数の変動 ', modelNote());
      if (st.view === 'time') {
        const ym = Math.max(xMax, yMaxV) * 1.15;
        chart.draw({
          alt: '被食者と捕食者の個体数の時間変化',
          x: { min: 0, max: T_LV, label: '時間', step: 10 },
          y: { min: 0, max: ym, label: '個体数', step: niceStep(ym) },
          series: [
            { points: run.map((q) => [q.t, q.x]), color: 'c3', width: 3, label: '被食者' },
            { points: run.map((q) => [q.t, q.y]), color: 'c2', dash: 'dash', width: 3, label: '捕食者' },
          ],
          markers: [
            ...px.slice(0, 3).map((t) => ({ x: t, y: run[Math.round(t / 0.1)].x, color: 'c3' })),
            ...py.slice(0, 3).map((t) => ({ x: t, y: run[Math.round(t / 0.1)].y, color: 'c2', shape: 'square' })),
          ],
        });
        leg.replaceChildren(legend([{ label: '被食者（●が山）', color: 'c3' }, { label: '捕食者（■が山）', color: 'c2', dash: 'dash' }]));
      } else {
        chart.draw({
          alt: '相図',
          x: { min: 0, max: xMax * 1.15, label: '被食者の個体数', step: niceStep(xMax * 1.15) },
          y: { min: 0, max: yMaxV * 1.2, label: '捕食者の個体数', step: niceStep(yMaxV * 1.2) },
          series: [{ points: run.map((q) => [q.x, q.y]), color: 'c4', width: 2.5 }],
          markers: [
            { x: p.d / p.c, y: p.a / p.b, color: 'muted', shape: 'diamond', label: 'つり合いの点' },
            { x: p.x0, y: p.y0, color: 'c4', label: 'スタート' },
          ],
          texts: [{ x: (p.d / p.c), y: yMaxV * 1.1, text: '反時計回りにまわる ↺', color: 'c4' }],
        });
        leg.replaceChildren(legend([{ label: '（被食者, 捕食者）の組の移り変わり', color: 'c4' }]));
      }
      note.textContent = 'dx/dt ＝ a·x − b·x·y（被食者）、dy/dt ＝ c·x·y − d·y（捕食者）。c ＝ 0.02 で固定。';
      const lag = px.length > 1 && py.length > 1 ? py.find((t) => t > px[1]) - px[1] : null;
      exp.set([
        '被食者が増えると、えさが豊富になった捕食者が遅れて増える。捕食者が増えると被食者は多く食べられて減り、えさが減った捕食者も遅れて減る。これがくり返されるので、両者は周期的に変動する。',
        lag != null ? `このグラフでは、被食者の山から約${fmt(lag, 1)}遅れて捕食者の山が現れる。捕食者が増えるには、被食者を食べて子を残すまでの時間が必要だからである。` : '',
        `つり合いの個体数は、被食者 d/c ＝ ${fmt(st.d / st.c, 0)}、捕食者 a/b ＝ ${fmt(st.a / st.b, 1)}。実際の自然界では、すみかや他の生物との関係も影響するので、このように規則正しくなるとは限らない。`,
      ]);
      return { px, py };
    }

    function update() {
      let lv = null;
      if (st.tab === 'log') drawLog();
      else lv = drawLv();
      ctx.update({ ...st, seenK: seen.k, lv });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'log' && s.seenK;
dojo.tasks[1].check = (s) => s.tab === 'log' && s.N0 > s.K;
dojo.tasks[2].check = (s) => s.tab === 'lv' && s.view === 'time' && s.lv && s.lv.px.length > 1 && s.lv.py.some((t) => t > s.lv.px[1]);
dojo.tasks[3].check = (s) => s.tab === 'lv' && s.view === 'phase';
