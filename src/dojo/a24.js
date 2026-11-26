// A24 種間競争と生態的地位 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { SPECIES, PAIRS, DAYS, run, outcome, distanceOfOverlap, useCurve } from '../models/competition.js';
import { sample } from '../lib/series.js';

export const dojo = {
  tasks: [
    { id: 'single', text: '「単独飼育」で、ゾウリムシもヒメゾウリムシも、それぞれ一定の数（環境収容力）まで増えることを確かめよう。', short: '単独飼育' },
    { id: 'exclude', text: '「ヒメゾウリムシと混合飼育」にして、ゾウリムシがいなくなる（競争的排除）ことを確かめよう。', short: '競争的排除' },
    { id: 'coexist', text: '「ミドリゾウリムシと混合飼育」で、2種が共存することを確かめよう。そのあと、ヒメゾウリムシとの組で、もし生態的地位の重なりが小さかったら（仮定）共存できることも確かめよう。', short: '共存' },
  ],
  mount(root, ctx) {
    const st = { pair: 'bursaria', mixed: false, ov: Math.round(PAIRS.bursaria.overlap * 100), seenSingle: false, seenBursaria: false };

    const top = panel(null);
    root.append(top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '個体数の変化のグラフ', aspect: 0.62 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);
    const title2 = h('h3', { class: 'small' });
    top.append(title2);
    const chart2 = createChart(top, { label: '資源の利用のしかたのグラフ', aspect: 0.4 });
    const leg2 = h('div');
    top.append(leg2);

    const segPair = segmented({
      label: 'ゾウリムシと組み合わせる種',
      options: [{ value: 'aurelia', label: 'ヒメゾウリムシ' }, { value: 'bursaria', label: 'ミドリゾウリムシ' }],
      value: st.pair,
      onChange: (v) => { st.pair = v; sOv.set(Math.round(PAIRS[v].overlap * 100), true); st.ov = sOv.value; update(); },
    });
    const segMix = segmented({
      label: '飼育のしかた',
      options: [{ value: 'single', label: '単独飼育（別々の容器）' }, { value: 'mixed', label: '混合飼育（同じ容器）' }],
      value: st.mixed ? 'mixed' : 'single',
      onChange: (v) => { st.mixed = v === 'mixed'; update(); },
    });
    const sOv = slider({ label: '生態的地位（食物・生活場所）の重なり', min: 0, max: 100, step: 5, value: st.ov, format: (v) => `${v}%`, onInput: (v) => { st.ov = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segPair.el, segMix.el, sOv.el), panel('いま何が起きているか', exp.el));

    function update() {
      const s1 = SPECIES.caudatum;
      const s2 = SPECIES[PAIRS[st.pair].partner];
      const ov = st.ov / 100;
      const r = run(st.pair, ov, st.mixed);
      const end = r[r.length - 1];
      const res = st.mixed ? outcome(st.pair, ov) : 'single';
      if (!st.mixed && st.pair === 'aurelia') st.seenSingle = true;
      if (st.mixed && st.pair === 'bursaria' && res === 'coexist') st.seenBursaria = true;
      title.replaceChildren(`ゾウリムシと${s2.name}の${st.mixed ? '混合飼育' : '単独飼育'} `, modelNote());
      const ymax = 180;
      chart.draw({
        alt: `${DAYS}日目：ゾウリムシ ${fmt(end.n1, 0)}、${s2.name} ${fmt(end.n2, 0)}`,
        x: { min: 0, max: DAYS, label: '日数', step: 4 },
        y: { min: 0, max: ymax, label: '個体数（相対値）', step: 40 },
        series: [
          { points: r.map((q) => [q.t, q.n2]), color: 'c3', dash: 'dash', width: 3, label: s2.name },
          { points: r.map((q) => [q.t, q.n1]), color: 'c1', width: 3, label: 'ゾウリムシ' },
        ],
        hlines: st.mixed ? [] : [{ y: s1.K, color: 'c1', dash: 'dot' }, { y: s2.K, color: 'c3', dash: 'dot' }],
      });
      leg.replaceChildren(legend([{ label: 'ゾウリムシ', color: 'c1' }, { label: s2.name, color: 'c3', dash: 'dash' }, ...(st.mixed ? [] : [{ label: '単独飼育での環境収容力', color: 'muted', dash: 'dot' }])]));
      note.textContent = 'ガウゼの実験をもとにした模式図。えさを一定の割合で与えて飼育した。個体数・日数は目安。';

      // 資源の利用曲線
      const d = distanceOfOverlap(ov);
      const c1 = -d / 2;
      const c2 = d / 2;
      const span = Math.max(4, d / 2 + 3.5);
      title2.textContent = `資源の利用のしかた（重なり ${st.ov}%）`;
      chart2.draw({
        alt: `資源の利用曲線の重なり ${st.ov}%`,
        x: { min: -span, max: span, label: '食物の大きさ・生活する場所など', ticks: [] },
        y: { min: 0, max: 1.25, label: '利用の多さ', ticks: [] },
        series: [
          { points: sample((x) => useCurve(x, c2), -span, span, 300), color: 'c3', dash: 'dash', width: 2.5 },
          { points: sample((x) => useCurve(x, c1), -span, span, 300), color: 'c1', width: 2.5 },
          { points: sample((x) => Math.min(useCurve(x, c1), useCurve(x, c2)), -span, span, 300), color: 'c4', width: 1.5, dash: 'dot' },
        ],
        texts: [{ x: 0, y: 1.15, text: st.ov >= 5 ? `重なり ${st.ov}%` : 'ほとんど重ならない', color: 'c4' }],
      });
      leg2.replaceChildren(legend([{ label: 'ゾウリムシ', color: 'c1' }, { label: s2.name, color: 'c3', dash: 'dash' }, { label: '2種が同じ資源を使う部分', color: 'c4', dash: 'dot' }]));

      const lines = [];
      if (!st.mixed) {
        lines.push(`別々の容器で飼育すると、ゾウリムシは約${s1.K}、${s2.name}は約${s2.K}まで増えて、それ以上は増えない。えさや生活空間には限りがあり、同じ種の個体どうしで奪い合う（種内競争）からである。`);
        lines.push('「混合飼育」に切りかえて、同じ容器で飼うとどうなるか見てみよう。');
      } else if (res === 'exclude1') {
        lines.push(`同じ容器で飼うと、はじめは両方とも増えるが、やがてゾウリムシが減って、${DAYS}日目には約${fmt(end.n1, 0)}になる。${s2.name}との間で同じえさや生活場所を奪い合い（種間競争）、やがて競争に強い${s2.name}だけが残る${end.n1 >= 3 ? '（このグラフの範囲ではまだ残っているが、時間がたつと排除される）' : ''}。`);
        lines.push('このように、生態的地位（ニッチ）が大きく重なる2種が同じ場所にいると、一方がもう一方を排除することがある。これを競争的排除という。');
      } else if (res === 'exclude2') {
        lines.push(`重なりが ${st.ov}% と大きいので、${s2.name}が減っていき、ゾウリムシだけが残る（このモデルの場合）。生態的地位が大きく重なると、一方がもう一方を排除する（競争的排除）。`);
      } else {
        lines.push(`同じ容器で飼っても、ゾウリムシ（約${fmt(end.n1, 0)}）と${s2.name}（約${fmt(end.n2, 0)}）が共存する。${st.ov === 0 ? '生態的地位がまったく重ならないので、どちらも単独飼育と同じ数まで増える。' : 'ただし、資源の一部を奪い合うので、どちらも単独飼育のときより少ない。'}`);
        lines.push(st.pair === 'bursaria'
          ? 'ゾウリムシとミドリゾウリムシは、試験管の中で主に生活する場所や食物が異なり、生態的地位の重なりが小さい。そのため奪い合いが弱く、共存できる。'
          : '生態的地位の重なりが小さいと、使う資源の奪い合いが弱くなるので、競争に弱い種も生き残り、2種は共存できる。');
      }
      lines.push('自然界では、すむ場所を分けるすみわけや、食物を分ける食いわけによって、生態的地位の重なりが小さくなり、似た種が共存していることが多い。');
      exp.set(lines);
      ctx.update({ ...st, res, n1: end.n1, n2: end.n2 });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.seenSingle;
dojo.tasks[1].check = (s) => s.mixed && s.pair === 'aurelia' && s.res === 'exclude1';
dojo.tasks[2].check = (s) => s.seenBursaria && s.mixed && s.pair === 'aurelia' && s.res === 'coexist';
