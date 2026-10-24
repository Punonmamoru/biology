// A1 酵素の反応速度 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, niceStep } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { rate, inhibited, lineweaver, tempRate, optimumTemp, afterTreatment, activeFraction, ENZYMES, phRate } from '../models/enzyme.js';
import { sample } from '../lib/series.js';

const KI = 2;
const S_MAX = 40;

export const dojo = {
  tasks: [
    { id: 'comp', text: '「競争的阻害」で阻害剤を濃くして（4以上）、最大速度 Vmax が変わらないことを確かめよう。', short: '競争的阻害：Vmax不変' },
    { id: 'noncomp', text: '「非競争的阻害」で阻害剤を濃くして（4以上）、Km が変わらないことを確かめよう。', short: '非競争的阻害：Km不変' },
    { id: 'lb', text: 'ラインウィーバー・バーク表示に切り替え、阻害剤ありの直線を見よう。', short: 'ラインウィーバー・バーク' },
    { id: 'opt', text: '「温度」で、反応速度が最大になる温度（最適温度）を探そう。', short: '最適温度を発見' },
    { id: 'heat', text: '「温度」の処理実験で、60℃以上で処理してから最適温度に戻しても速度が回復しないことを確かめよう。', short: '熱変性は不可逆' },
    { id: 'pepsin', text: '「pH」で、ペプシンがよくはたらく pH に合わせよう。', short: 'ペプシンの最適pH' },
  ],
  mount(root, ctx) {
    const st = { tab: 'S', Vmax: 60, Km: 4, inh: 'none', I: 0, lb: false, T: 30, Th: 20, pH: 7 };
    const done = { lbInh: false };

    const tabs = segmented({ label: 'グラフ', options: [{ value: 'S', label: '①基質濃度' }, { value: 'T', label: '②温度' }, { value: 'pH', label: '③pH' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '酵素の反応速度のグラフ', aspect: 0.72 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    // ① 基質濃度
    const sV = slider({ label: '最大速度 Vmax', min: 20, max: 100, step: 5, value: st.Vmax, format: (v) => String(v), onInput: (v) => { st.Vmax = v; update(); } });
    const sK = slider({ label: 'ミカエリス定数 Km', min: 0.5, max: 10, step: 0.5, value: st.Km, format: (v) => fmt(v, 1), onInput: (v) => { st.Km = v; update(); } });
    const segI = segmented({ label: '阻害剤', options: [{ value: 'none', label: 'なし' }, { value: 'competitive', label: '競争的阻害' }, { value: 'noncompetitive', label: '非競争的阻害' }], value: st.inh, onChange: (v) => { st.inh = v; if (v !== 'none' && st.I === 0) { st.I = 4; sI.set(4, true); } update(); } });
    const sI = slider({ label: '阻害剤の濃度 [I]', min: 0, max: 10, step: 0.5, value: st.I, format: (v) => fmt(v, 1), onInput: (v) => { st.I = v; update(); } });
    const segLB = segmented({ label: '表示', options: [{ value: false, label: 'v−[S] グラフ' }, { value: true, label: 'ラインウィーバー・バーク' }], value: st.lb, onChange: (v) => { st.lb = v; update(); } });
    const ctlS = h('div', null, segI.el, sI.el, segLB.el, sV.el, sK.el);

    // ② 温度
    const sT = slider({ label: '温度', min: 0, max: 80, step: 0.5, value: st.T, format: (v) => fmt(v, 1) + ' ℃', onInput: (v) => { st.T = v; update(); } });
    const sTh = slider({ label: '処理実験：この温度に10分置いてから最適温度に戻す', min: 0, max: 80, step: 5, value: st.Th, format: (v) => v + ' ℃', onInput: (v) => { st.Th = v; update(); } });
    const ctlT = h('div', null, sT.el, sTh.el);

    // ③ pH
    const sP = slider({ label: 'pH', min: 0, max: 14, step: 0.1, value: st.pH, format: (v) => fmt(v, 1), onInput: (v) => { st.pH = v; update(); } });
    const ctlP = h('div', null, sP.el);

    const exp = explainBox();
    root.append(panel('操作', ctlS, ctlT, ctlP), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlS.hidden = st.tab !== 'S';
      ctlT.hidden = st.tab !== 'T';
      ctlP.hidden = st.tab !== 'pH';
      update();
    }

    function drawS() {
      const base = { Vmax: st.Vmax, Km: st.Km };
      const cur = inhibited(st.inh, st.Vmax, st.Km, st.I, KI);
      const hasInh = st.inh !== 'none' && st.I > 0;
      title.replaceChildren('基質濃度と反応速度 ', modelNote());
      if (!st.lb) {
        const series = [];
        if (hasInh) series.push({ points: sample((S) => rate(S, base.Vmax, base.Km), 0, S_MAX, 200), color: 'muted', dash: 'long', width: 2, label: '阻害剤なし', legendLabel: '阻害剤なし' });
        series.push({ points: sample((S) => rate(S, cur.Vmax, cur.Km), 0, S_MAX, 200), color: 'c1', width: 3, label: hasInh ? '阻害剤あり' : null, legendLabel: hasInh ? `阻害剤あり（${st.inh === 'competitive' ? '競争的' : '非競争的'}）` : '反応速度 v' });
        chart.draw({
          alt: `Vmax ${fmt(cur.Vmax, 1)}、Km ${fmt(cur.Km, 1)}`,
          x: { min: 0, max: S_MAX, label: '基質濃度 [S]', step: 5 },
          y: { min: 0, max: 110, label: '反応速度 v', step: 20 },
          series,
          hlines: [
            { y: cur.Vmax, color: 'c1', dash: 'dash', label: `Vmax ＝ ${fmt(cur.Vmax, 1)}`, align: 'right' },
            { y: cur.Vmax / 2, color: 'c2', dash: 'dot', label: `Vmax/2 ＝ ${fmt(cur.Vmax / 2, 1)}` },
          ],
          vlines: cur.Km <= S_MAX ? [{ x: cur.Km, color: 'c2', dash: 'dot' }] : [],
          markers: [{ x: cur.Km, y: cur.Vmax / 2, color: 'c2', label: `Km ＝ ${fmt(cur.Km, 1)}`, dy: 20 }],
        });
        leg.replaceChildren(legend(series.map((s) => ({ label: s.legendLabel, color: s.color, dash: s.dash }))));
        note.textContent = 'v ＝ Vmax[S]／(Km＋[S])。Km は反応速度が Vmax の半分になるときの基質濃度で、小さいほど基質と結合しやすい。';
      } else {
        const L0 = lineweaver(base.Vmax, base.Km);
        const L = lineweaver(cur.Vmax, cur.Km);
        const xMin = Math.min(-1 / base.Km, -1 / cur.Km) * 1.3;
        const xMax = 2;
        const line = (l) => sample((x) => l.slope * x + l.yIntercept, xMin, xMax, 2);
        const yMax = Math.max(L.slope * xMax + L.yIntercept, L0.slope * xMax + L0.yIntercept) * 1.15;
        const series = [];
        if (hasInh) series.push({ points: line(L0), color: 'muted', dash: 'long', width: 2, label: '阻害剤なし', legendLabel: '阻害剤なし' });
        series.push({ points: line(L), color: 'c1', width: 3, label: hasInh ? '阻害剤あり' : '1/v', legendLabel: hasInh ? '阻害剤あり' : '1/v' });
        chart.draw({
          alt: `y切片 ${fmt(L.yIntercept, 4)}、x切片 ${fmt(L.xIntercept, 3)}`,
          x: { min: xMin, max: xMax, label: '1/[S]', step: niceStep(xMax - xMin), digits: 2 },
          y: { min: 0, max: yMax, label: '1/v', step: niceStep(yMax), digits: 3 },
          series,
          markers: [
            { x: 0, y: L.yIntercept, color: 'c2', label: `y切片 1/Vmax ＝ ${fmt(L.yIntercept, 4)}` },
            { x: L.xIntercept, y: 0, color: 'c4', shape: 'diamond', label: `x切片 −1/Km ＝ ${fmt(L.xIntercept, 3)}`, dy: -14 },
          ],
          vlines: [{ x: 0, color: 'fg', dash: 'solid', width: 1 }],
        });
        leg.replaceChildren(legend(series.map((s) => ({ label: s.legendLabel, color: s.color, dash: s.dash }))));
        note.textContent = `1/v ＝ (Km/Vmax)(1/[S]) ＋ 1/Vmax。傾き Km/Vmax ＝ ${fmt(L.slope, 4)}。y切片から Vmax、x切片から Km がわかる。`;
        if (hasInh) done.lbInh = true;
      }
      const lines = [];
      if (!hasInh) {
        lines.push(`[S] が小さいときは、基質が増えるほど酵素と出会う回数が増えるので v はほぼ比例して大きくなる。[S] が大きくなると、すべての酵素の活性部位が基質と結合した状態（飽和）に近づくから、v は Vmax（${st.Vmax}）に近づいて頭打ちになる。`);
      } else if (st.inh === 'competitive') {
        lines.push(`競争的阻害：阻害剤は基質と似た形で、活性部位を基質と奪い合う。見かけの Km は ${fmt(st.Km, 1)} → ${fmt(cur.Km, 1)} に大きくなるが、[S] を十分に高くすれば基質が阻害剤に勝つから、Vmax は ${st.Vmax} のまま変わらない。`);
        if (st.lb) lines.push('ラインウィーバー・バーク表示では、y切片（1/Vmax）が同じで、傾きだけが大きくなる。');
      } else {
        lines.push(`非競争的阻害：阻害剤は活性部位以外の部分に結合し、酵素のはたらきを失わせる。基質を増やしても阻害は解けないから、Vmax は ${st.Vmax} → ${fmt(cur.Vmax, 1)} に下がるが、Km は ${fmt(st.Km, 1)} のまま変わらない。`);
        if (st.lb) lines.push('ラインウィーバー・バーク表示では、x切片（−1/Km）が同じで、y切片と傾きが大きくなる。');
      }
      exp.set(lines);
    }

    function drawT() {
      const To = optimumTemp();
      const v = tempRate(st.T);
      const vAfter = afterTreatment(st.Th);
      title.replaceChildren('温度と反応速度 ', modelNote());
      chart.draw({
        alt: `温度 ${fmt(st.T, 1)}℃で反応速度 ${fmt(v, 2)}`,
        x: { min: 0, max: 80, label: '温度（℃）', step: 10 },
        y: { min: 0, max: 4, label: '反応速度（相対値）', step: 1 },
        series: [{ points: sample(tempRate, 0, 80, 320), color: 'c2', width: 3, label: '反応速度' }],
        vlines: [{ x: st.T, color: 'fg', dash: 'dash', width: 1.5 }],
        markers: [
          { x: st.T, y: v, color: 'c2', label: `${fmt(v, 2)}` },
          { x: To, y: vAfter, color: 'c4', shape: 'square', label: `${st.Th}℃で処理後 → ${fmt(vAfter, 2)}`, dy: st.Th > To ? -6 : 34 },
        ],
      });
      leg.replaceChildren(legend([{ label: '反応速度', color: 'c2' }, { label: '処理実験の結果（最適温度で測定）', color: 'c4', bar: true }]));
      note.textContent = `反応速度 ＝（温度が10℃上がると約2倍になる効果）×（熱で変性していない酵素の割合）。このモデルの最適温度は約${fmt(To, 0)}℃。`;
      const lines = [];
      if (st.T < To - 2) lines.push(`${fmt(st.T, 1)}℃：温度が上がるほど分子の運動が活発になり、酵素と基質がよく出会うので反応速度が大きくなる。低温では反応がおそいだけで、酵素はこわれていない。`);
      else if (st.T <= To + 2) lines.push(`${fmt(st.T, 1)}℃：最適温度付近。温度上昇で速くなる効果と、熱変性で酵素が失活する効果のつり合いで、反応速度が最大になる。ヒトの酵素の多くは体温付近〜40℃くらいが最適温度である。`);
      else lines.push(`${fmt(st.T, 1)}℃：酵素はタンパク質でできているので、高温では立体構造が変化（変性）し、活性部位の形がくずれて失活する。熱変性していない酵素は約${fmt(activeFraction(st.T) * 100, 0)}%しかない。`);
      lines.push(st.Th > To + 5
        ? `処理実験：${st.Th}℃で処理した酵素を最適温度に戻しても、速度は ${fmt(vAfter, 2)} までしか回復しない。熱による変性は不可逆的だからである。`
        : `処理実験：${st.Th}℃で処理した酵素を最適温度に戻すと、速度は ${fmt(vAfter, 2)} で、もとどおりにはたらく。低温では変性が起こっていないからである。`);
      exp.set(lines);
    }

    function drawP() {
      title.replaceChildren('pHと反応速度 ', modelNote());
      const styles = { pepsin: { color: 'c2', dash: 'solid' }, amylase: { color: 'c1', dash: 'dash' }, trypsin: { color: 'c4', dash: 'dashdot' } };
      const series = Object.entries(ENZYMES).map(([k, e]) => ({ points: sample((p) => phRate(p, e.opt), 0, 14, 280), ...styles[k], width: 3, label: e.name, labelAt: e.opt, legendLabel: `${e.name}（${e.where}・最適pH 約${e.opt}）` }));
      chart.draw({
        alt: `pH ${fmt(st.pH, 1)}`,
        x: { min: 0, max: 14, label: 'pH', step: 1 },
        y: { min: 0, max: 1.25, label: '反応速度（相対値）', step: 0.25, digits: 2 },
        series,
        vlines: [{ x: st.pH, color: 'fg', dash: 'dash', width: 1.5, label: `pH ${fmt(st.pH, 1)}` }],
      });
      leg.replaceChildren(legend(series.map((s) => ({ label: s.legendLabel, color: s.color, dash: s.dash }))));
      note.textContent = '各酵素の最大の速度を1とした相対値。山の形は模式的に描いている。';
      const vals = Object.values(ENZYMES).map((e) => `${e.name} ${fmt(phRate(st.pH, e.opt), 2)}`);
      exp.set([
        `pH ${fmt(st.pH, 1)} での反応速度：${vals.join('、')}。`,
        '酵素ごとに最もよくはたらく pH（最適pH）がある。胃液は強い酸性なのでペプシンの最適pHは約2、だ液アミラーゼは中性付近の約7、すい液中のトリプシンは弱アルカリ性の約8である。',
        '最適pHから外れると、酵素タンパク質の立体構造や電荷の状態が変わり、活性部位が基質と結合しにくくなるから、反応速度が下がる。',
      ]);
    }

    function update() {
      if (st.tab === 'S') drawS();
      else if (st.tab === 'T') drawT();
      else drawP();
      ctx.update({ ...st, To: optimumTemp(), lbInh: done.lbInh });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'S' && s.inh === 'competitive' && s.I >= 4;
dojo.tasks[1].check = (s) => s.tab === 'S' && s.inh === 'noncompetitive' && s.I >= 4;
dojo.tasks[2].check = (s) => s.lbInh;
dojo.tasks[3].check = (s) => s.tab === 'T' && Math.abs(s.T - s.To) <= 1;
dojo.tasks[4].check = (s) => s.tab === 'T' && s.Th >= 60;
dojo.tasks[5].check = (s) => s.tab === 'pH' && Math.abs(s.pH - 2) <= 0.3;
