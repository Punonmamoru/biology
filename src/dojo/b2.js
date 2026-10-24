// B2 血糖値の調節 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { PRESETS, simulate, summarize, hormoneRef } from '../models/glucose.js';

const MINUTES = 300;

function at(run, minute) {
  const i = Math.max(0, Math.min(run.length - 1, Math.round(minute)));
  return run[i];
}

export const dojo = {
  tasks: [
    { id: 'peak', text: '「健康」で、血糖値が最も高くなる時刻に「時刻」スライダーを合わせよう。', short: '血糖値のピークを発見' },
    { id: 'glucagonDown', text: '「健康」で、血糖値が上がっている間はグルカゴンが空腹時の半分以下に減っていることを、時刻スライダーで確かめよう。', short: 'グルカゴンが減る' },
    { id: 'type1', text: '「1型糖尿病」に切り替えて、インスリンがほとんど増えないことを確かめよう。', short: '1型を確認' },
    { id: 'sens', text: 'インスリンの分泌能力はそのまま（1.0倍以上）で、効きやすさを0.3倍以下にしてみよう。', short: '効きにくさを体験' },
  ],
  mount(root, ctx) {
    let prm = { ...PRESETS.healthy };
    let preset = 'healthy';
    let cursor = 90;
    const ref = hormoneRef();

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '食後の血糖値とホルモン ', modelNote()));
    const chart = createChart(top, { label: '食後の血糖値・インスリン・グルカゴンのグラフ', aspect: 0.72 });
    top.append(
      legend([
        { label: '血糖値（左の目盛り）', color: 'c2' },
        { label: 'インスリン（右の目盛り）', color: 'c1', dash: 'dash' },
        { label: 'グルカゴン（右の目盛り）', color: 'c3', dash: 'dot' },
        { label: '健康な人の血糖値（比較）', color: 'muted', dash: 'long' },
      ]),
      h('p', { class: 'small muted' }, 'ホルモン量は「健康な人の空腹時＝1」とした相対値。食事は時刻0にとる。'),
    );

    const seg = segmented({
      label: 'プリセット',
      options: [
        { value: 'healthy', label: '健康' },
        { value: 'type1', label: '1型糖尿病' },
        { value: 'type2', label: '2型糖尿病' },
      ],
      value: preset,
      onChange: (v) => {
        preset = v;
        prm = { ...prm, cap: PRESETS[v].cap, sens: PRESETS[v].sens };
        sCap.set(prm.cap, true);
        sSens.set(prm.sens, true);
        update();
      },
    });
    const custom = () => {
      const m = Object.keys(PRESETS).find((k) => Math.abs(PRESETS[k].cap - prm.cap) < 1e-9 && Math.abs(PRESETS[k].sens - prm.sens) < 1e-9);
      preset = m || 'custom';
      seg.set(m || null, true);
    };
    const sMeal = slider({ label: '食事量', min: 0, max: 2, step: 0.1, value: prm.meal, format: (v) => fmt(v, 1) + ' 倍', onInput: (v) => { prm.meal = v; update(); } });
    const sCap = slider({ label: 'インスリン分泌能力（B細胞のはたらき）', min: 0, max: 1.5, step: 0.05, value: prm.cap, format: (v) => fmt(v, 2) + ' 倍', onInput: (v) => { prm.cap = v; custom(); update(); } });
    const sSens = slider({ label: 'インスリンの効きやすさ（受け取る細胞側）', min: 0.1, max: 1.5, step: 0.05, value: prm.sens, format: (v) => fmt(v, 2) + ' 倍', onInput: (v) => { prm.sens = v; custom(); update(); } });
    const sCur = slider({ label: '時刻（値を読む）', min: 0, max: MINUTES, step: 1, value: cursor, format: (v) => `食後 ${Math.floor(v / 60)}時間${v % 60}分`, onInput: (v) => { cursor = v; update(); } });
    const readout = h('div', { class: 'small', 'aria-live': 'polite' });
    const exp = explainBox();

    root.append(panel('操作', seg.el, sMeal.el, sCap.el, sSens.el, sCur.el, readout), panel('いま何が起きているか', exp.el));

    function update() {
      const run = simulate(prm, MINUTES);
      const sm = summarize(run);
      const healthyRun = preset === 'healthy' ? null : simulate({ ...PRESETS.healthy, meal: prm.meal }, MINUTES);
      const cur = at(run, cursor);
      const toH = (pts) => pts.map(([m, v]) => [m / 60, v]);
      const gMax = Math.max(300, Math.ceil(sm.peakG / 50) * 50);
      chart.draw({
        alt: `血糖値は空腹時 ${fmt(sm.fastingG, 0)}、最大 ${fmt(sm.peakG, 0)} mg/100mL（食後${fmt(sm.peakT, 0)}分）`,
        x: { min: 0, max: MINUTES / 60, label: '食事からの時間（時間）', step: 1 },
        y: { min: 0, max: gMax, label: '血糖値（mg/100mL）', step: 50 },
        y2: { min: 0, max: 8, label: 'ホルモン量（相対値）', step: 2 },
        hlines: [{ y: 100, color: 'muted', dash: 'dot', label: '空腹時の目安 約100', align: 'right' }],
        vlines: [{ x: cursor / 60, color: 'fg', dash: 'dash', width: 1.2 }],
        series: [
          !healthyRun ? null : { points: toH(healthyRun.map((r) => [r.t, r.G])), color: 'muted', dash: 'long', width: 1.8 },
          { points: toH(run.map((r) => [r.t, r.G])), color: 'c2', width: 3, label: '血糖値', labelAt: sm.peakT / 60 },
          { points: toH(run.map((r) => [r.t, r.I / ref.I])), color: 'c1', dash: 'dash', axis: 'y2', label: 'インスリン' },
          { points: toH(run.map((r) => [r.t, r.N / ref.N])), color: 'c3', dash: 'dot', axis: 'y2', label: 'グルカゴン' },
        ].filter(Boolean),
        markers: [{ x: cursor / 60, y: cur.G, color: 'c2' }],
      });

      const Irel = cur.I / ref.I;
      const Nrel = cur.N / ref.N;
      readout.replaceChildren(
        h('b', null, `食後 ${cursor} 分：`),
        `血糖値 ${fmt(cur.G, 0)} mg/100mL、インスリン ${fmt(Irel, 1)}、グルカゴン ${fmt(Nrel, 1)}（相対値）`,
      );

      const lines = [];
      const fast = sm.fastingG;
      const kind = prm.cap < 0.15 ? 'type1' : prm.cap < 0.9 || prm.sens < 0.9 ? 'type2' : 'healthy';
      const rising = cursor < sm.peakT && cur.G > fast + 3;
      const high = cur.G > fast + 3;
      if (kind === 'type1') {
        if (rising) lines.push('食事で吸収されたグルコースが血液に入り、血糖値が上がっている。しかしB細胞がはたらかないため、血糖値が上がってもインスリンはほとんど増えない。');
        else if (high) lines.push('インスリンがほとんどないので、細胞へのグルコースの取り込みや肝臓でのグリコーゲン合成が進まない。脳などでのインスリンによらない消費でゆっくり下がるだけで、高い血糖値が続く。');
        else lines.push('インスリンがほとんど分泌されないので、空腹時から血糖値が高い。');
      } else if (kind === 'type2') {
        if (rising) lines.push('食事で吸収されたグルコースが血液に入り、血糖値が上がっている。B細胞はインスリンを分泌するが、量が少ない、または効きにくいため、血糖値が大きく上がる。');
        else if (high) lines.push('インスリンは分泌されているが、効きにくい（または量が少ない）ので、細胞へのグルコースの取り込みが進まず、血糖値が下がるのに時間がかかる。');
        else lines.push('インスリンのはたらきが弱いので、空腹時の血糖値もやや高めに保たれている。');
      } else if (rising) {
        lines.push('食事で吸収されたグルコースが血液に入り、血糖値が上がっている。血糖値の上昇をすい臓ランゲルハンス島のB細胞が直接感知するほか、間脳の視床下部も感知して副交感神経を通じてB細胞を刺激するので、インスリンの分泌が増える。グルカゴンの分泌は減る。');
      } else if (high) {
        lines.push('インスリンのはたらきで、肝臓や筋肉などの細胞がグルコースを取り込み、肝臓ではグリコーゲンが合成されるので、血糖値が下がっていく。血糖値が下がるにつれてインスリンの分泌も減り、空腹時の値に戻ったところで落ち着く。');
      } else if (cur.G < fast - 3) {
        lines.push('血糖値が空腹時より下がっている。ランゲルハンス島のA細胞からグルカゴンの分泌が増え、肝臓のグリコーゲンの分解を促して血糖値を元に戻す。');
      } else {
        lines.push('血糖値は空腹時の値（約100 mg/100mL）に保たれている。血糖値の変化がホルモンの分泌を変え、その結果がもとの変化を打ち消す向きにはたらく（負のフィードバック）。');
      }
      lines.push(`空腹時 ${fmt(fast, 0)} → 最大 ${fmt(sm.peakG, 0)} mg/100mL（食後 ${fmt(sm.peakT, 0)} 分）。食後2時間で ${fmt(sm.g120, 0)} mg/100mL。`);
      if (kind === 'type1') {
        lines.push('インスリンがほとんど分泌されないので（1型糖尿病のような状態）、取り込みが進まず、血糖値が高いまま下がりにくい。1型糖尿病は、免疫のはたらきでB細胞が破壊されることなどで起こり、治療にはインスリンの注射が必要になる。');
      } else if (kind === 'type2') {
        lines.push(`インスリンは分泌されている（最大 ${fmt(sm.insulinPeak / ref.I, 1)}）のに血糖値が高いままになりやすい。インスリンが効きにくい、または分泌量が少ないから（2型糖尿病のような状態）。生活習慣などが関係する。`);
      } else if (prm.meal === 0) {
        lines.push('食事をしていないので、血糖値は空腹時の値のまま保たれる。');
      } else if (prm.meal >= 1.5) {
        lines.push('食事量が多いので血糖値は大きく上がるが、インスリンも多く分泌されるので、2時間ほどで空腹時の値に戻る。健康な人では、血糖値が高いまま下がらないことはない。');
      } else {
        lines.push('血糖値が上がるとインスリンが増え、血糖値が空腹時の値に戻るとインスリンも元の量に戻る。インスリンの山が血糖値の山より遅れるのは、血糖値の上昇を感知してから分泌されるから。');
      }
      exp.set(lines);
      ctx.update({ preset, prm: { ...prm }, cursor, sm, cur, ref });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.preset === 'healthy' && s.prm.meal >= 0.5 && Math.abs(s.cursor - s.sm.peakT) <= 4;
dojo.tasks[1].check = (s) => s.preset === 'healthy' && s.prm.meal >= 0.5 && s.cursor < s.sm.peakT + 30 && s.cur.G > s.sm.fastingG + 15 && s.cur.N / s.ref.N <= 0.5;
dojo.tasks[2].check = (s) => s.preset === 'type1';
dojo.tasks[3].check = (s) => s.prm.cap >= 1 && s.prm.sens <= 0.3 && s.prm.meal >= 0.5;
