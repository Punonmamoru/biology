// A15 PCR と電気泳動 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { STEPS, copies, distanceOf, LADDER, PLASMID, fragments } from '../models/biotech.js';

const ENZ = {
  E: { label: 'EcoRI', cuts: ['EcoRI'] },
  B: { label: 'BamHI', cuts: ['BamHI'] },
  EB: { label: 'EcoRI＋BamHI', cuts: ['EcoRI', 'BamHI'] },
  H: { label: 'HindIII', cuts: ['HindIII'] },
  all: { label: '3種すべて', cuts: ['EcoRI', 'BamHI', 'HindIII'] },
};
const sci = (n) => {
  if (n < 1e4) return Math.round(n).toLocaleString('ja-JP');
  const e = Math.floor(Math.log10(n));
  const m = n / Math.pow(10, e);
  return `約 ${fmt(m, 1)} × 10${String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`;
};

export const dojo = {
  tasks: [
    { id: 'pcr10', text: '①で、10サイクルで約1000倍（2¹⁰ ＝ 1024倍）に増えることを確かめよう。', short: '10サイクルで約1000倍' },
    { id: 'pcr30', text: '①で、サイクル数を30にして、1分子が約10億分子になることを確かめよう。', short: '30サイクル' },
    { id: 'gel2', text: '②で、2か所で切れる組合せを選び、2本のバンドが現れることを確かめよう。', short: '断片は2本' },
    { id: 'same', text: '②で HindIII を選び、同じ長さの断片が2本できると、バンドは1本に見えることを確かめよう。', short: '同じ長さは1本' },
  ],
  mount(root, ctx) {
    const st = { tab: 'pcr', cycles: 5, initial: 1, enz: 'E', touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'pcr', label: '①PCR法' }, { value: 'gel', label: '②電気泳動' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: 'グラフ', aspect: 0.66 });
    const leg = h('div');
    const sub = h('div');
    top.append(leg, sub);
    const chart2 = createChart(sub, { label: '補助のグラフ', aspect: 0.5 });
    const leg2 = h('div');
    const note = h('p', { class: 'small muted' });
    sub.append(leg2);
    top.append(note);

    const sC = slider({ label: 'サイクル数', min: 0, max: 35, step: 1, value: st.cycles, format: (v) => `${v} サイクル`, onInput: (v) => { st.cycles = v; st.touched++; update(); } });
    const segI = segmented({ label: 'はじめの DNA の分子数', options: [1, 10, 100].map((v) => ({ value: v, label: `${v} 分子` })), value: st.initial, onChange: (v) => { st.initial = v; st.touched++; update(); } });
    const ctlPcr = h('div', null, sC.el, segI.el);
    const segE = segmented({ label: 'プラスミドを切断する制限酵素', options: Object.entries(ENZ).map(([value, e]) => ({ value, label: e.label })), value: st.enz, onChange: (v) => { st.enz = v; st.touched++; update(); } });
    const ctlGel = h('div', null, h('p', { class: 'small' }, `全長 ${PLASMID.len.toLocaleString('ja-JP')} 塩基対の環状のプラスミドを、制限酵素で切断して電気泳動する。切断部位：EcoRI 1か所、BamHI 1か所、HindIII 2か所。`), segE.el);
    const exp = explainBox();
    root.append(panel('操作', ctlPcr, ctlGel), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlPcr.hidden = st.tab !== 'pcr';
      ctlGel.hidden = st.tab !== 'gel';
      update();
    }

    function drawPcr() {
      const n = st.cycles;
      const N = copies(st.initial, n);
      title.replaceChildren('PCR法：サイクル数と DNA の量 ', modelNote('理想的に毎回2倍になるとした場合'));
      const pts = [];
      for (let i = 0; i <= 35; i++) pts.push([i, copies(st.initial, i)]);
      chart.draw({
        alt: `${n} サイクルで ${sci(N)} 分子`,
        x: { min: 0, max: 35, label: 'サイクル数', step: 5 },
        y: { min: 1, max: 1e13, log: true, label: 'DNAの分子数（対数目盛り）', ticks: [1, 1e3, 1e6, 1e9, 1e12].map((v) => ({ v, text: v === 1 ? '1' : `10${String(Math.log10(v)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}` })) },
        series: [{ points: pts, color: 'c1', width: 3 }],
        vlines: [{ x: n, color: 'c2', dash: 'dot' }],
        markers: [{ x: n, y: N, color: 'c2', label: sci(N) }],
      });
      leg.replaceChildren(legend([{ label: '目的の DNA 領域の分子数（はじめの数 × 2ⁿ）', color: 'c1' }]));
      const pts2 = [];
      let t = 0;
      for (let c = 0; c < 2; c++) for (const s of STEPS) { pts2.push([t, s.temp], [t + s.sec, s.temp]); t += s.sec; }
      chart2.draw({
        alt: '1サイクルの温度変化（2サイクル分）',
        x: { min: 0, max: t, label: '時間（秒）', step: 60 },
        y: { min: 40, max: 100, label: '温度（℃）', step: 20 },
        series: [{ points: pts2, color: 'c2', width: 2.5 }],
        texts: STEPS.map((s, i) => ({ x: STEPS.slice(0, i).reduce((a, x) => a + x.sec, 0) + s.sec / 2, y: s.temp + 6, text: s.name, color: 'fg' })),
      });
      leg2.replaceChildren(legend([{ label: '温度の変化（2サイクル分。時間は目安）', color: 'c2' }]));
      note.textContent = '実際には、サイクル数が多くなるとプライマーや材料が減って増え方が鈍る。また、はじめの数サイクルでは目的の長さより長い DNA も含まれる。';
      exp.set([
        `${n} サイクル後の DNA ＝ ${st.initial} × 2^${n} ＝ ${sci(N)} 分子。1サイクルで2本鎖が1本ずつに分かれ、それぞれを鋳型に新しい鎖が合成されるので、理想的には毎回2倍になる。`,
        STEPS.map((s) => `${s.name}（約${s.temp}℃）：${s.desc}`).join('。') + '。',
        '熱変性で約95℃の高温になるので、高温でも失活しない耐熱性の DNAポリメラーゼ（好熱菌などから得たもの）を使う。プライマーは増やしたい領域の両端に結合する短い1本鎖 DNA である。',
      ]);
      return { cycles: n };
    }

    function drawGel() {
      const cuts = ENZ[st.enz].cuts.flatMap((e) => PLASMID.sites[e]);
      const frs = fragments(PLASMID.len, cuts);
      const uniq = [...new Set(frs)];
      title.replaceChildren('アガロースゲル電気泳動 ', modelNote());
      const band = (x, bp, fill, w = 0.32) => {
        const d = distanceOf(bp);
        return { points: [[x - w, -d - 0.9], [x + w, -d - 0.9], [x + w, -d + 0.9], [x - w, -d + 0.9]], fill, stroke: fill };
      };
      chart.draw({
        alt: `断片 ${frs.join('、')} 塩基対`,
        x: { min: 0.3, max: 2.7, ticks: [{ v: 1, text: 'マーカー' }, { v: 2, text: ENZ[st.enz].label }], grid: false },
        y: { min: -80, max: 6, label: '移動距離（mm）', ticks: [0, -20, -40, -60, -80].map((v) => ({ v, text: String(-v) })) },
        polygons: [
          { points: [[0.65, 0], [1.35, 0], [1.35, 3], [0.65, 3]], fill: 'surface-2', stroke: 'fg' },
          { points: [[1.65, 0], [2.35, 0], [2.35, 3], [1.65, 3]], fill: 'surface-2', stroke: 'fg' },
          ...LADDER.map((bp) => band(1, bp, 'c4')),
          ...uniq.map((bp) => band(2, bp, 'c1', frs.filter((x) => x === bp).length > 1 ? 0.34 : 0.32)),
        ],
        texts: [
          ...LADDER.map((bp) => ({ x: 0.62, y: -distanceOf(bp), text: bp.toLocaleString('ja-JP'), align: 'right', color: 'muted' })),
          ...uniq.map((bp) => ({ x: 2.4, y: -distanceOf(bp), text: `${bp.toLocaleString('ja-JP')}${frs.filter((x) => x === bp).length > 1 ? '（2本分）' : ''}`, align: 'left', color: 'c1' })),
        ],
      });
      leg.replaceChildren(h('p', { class: 'small muted' }, '上のウェルに DNA を入れ、上が陰極（－）、下が陽極（＋）。マーカーの数字は塩基対。'));
      const lpts = [];
      for (let l = 200; l <= 12000; l *= 1.05) lpts.push([Math.log10(l), distanceOf(l)]);
      chart2.draw({
        alt: '断片の長さと移動距離の関係',
        x: { min: Math.log10(200), max: Math.log10(12000), label: '断片の長さ（塩基対・対数目盛り）', ticks: [250, 500, 1000, 2000, 5000, 10000].map((v) => ({ v: Math.log10(v), text: v.toLocaleString('ja-JP') })) },
        y: { min: 0, max: 80, label: '移動距離（mm）', step: 20 },
        series: [{ points: lpts, color: 'c4', width: 2 }],
        markers: [...LADDER.map((bp) => ({ x: Math.log10(bp), y: distanceOf(bp), color: 'c4', shape: 'diamond' })), ...uniq.map((bp) => ({ x: Math.log10(bp), y: distanceOf(bp), color: 'c1' }))],
      });
      leg2.replaceChildren(legend([{ label: 'マーカーから作った検量線（◆マーカー、●試料）', color: 'c4' }]));
      note.textContent = '移動距離と断片の長さの関係は、マーカー（長さのわかっている断片）から求めた模式。';
      const sum = frs.reduce((a, x) => a + x, 0);
      exp.set([
        'DNA はリン酸を含み負の電荷をもつので、電圧をかけると陽極（＋）へ向かって移動する。寒天（アガロース）の網目の中では、短い断片ほど通りやすいので遠くまで移動する。',
        `${ENZ[st.enz].label} で切断すると、断片は ${frs.map((x) => x.toLocaleString('ja-JP')).join('・')} 塩基対（合計 ${sum.toLocaleString('ja-JP')}）。${cuts.length === 1 ? '環状の DNA を1か所で切ると、全長の直鎖状の DNA が1本できる。' : `環状の DNA を${cuts.length}か所で切ると、断片は${cuts.length}本できる。`}`,
        '長さのわからない断片の長さは、マーカーの移動距離から作った検量線に、その断片の移動距離をあてはめて求める。同じ長さの断片は同じ位置に重なって1本のバンドに見える。',
      ]);
      return { nFrag: frs.length, nBand: uniq.length };
    }

    function update() {
      const r = st.tab === 'pcr' ? drawPcr() : drawGel();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'pcr' && s.cycles === 10;
dojo.tasks[1].check = (s) => s.tab === 'pcr' && s.cycles === 30 && s.initial === 1;
dojo.tasks[2].check = (s) => s.tab === 'gel' && s.nFrag === 2 && s.nBand === 2;
dojo.tasks[3].check = (s) => s.tab === 'gel' && s.enz === 'H';
