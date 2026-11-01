// A19 発生と位置情報 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { segmented, explainBox, panel, modelNote } from './common.js';
import { bicoid, boundary, THRESH, halfDistance } from '../models/morphogen.js';
import { sample } from '../lib/series.js';

const AMOUNTS = [
  { value: 0, label: '欠損' },
  { value: 0.5, label: '半分' },
  { value: 1, label: '正常' },
  { value: 2, label: '2倍' },
];

export const dojo = {
  tasks: [
    { id: 'normal', text: '正常な母親の卵で、ビコイドの濃度が閾値以上になる範囲（頭部・胸部になる範囲）を確かめよう。', short: '正常な卵' },
    { id: 'none', text: 'ビコイド遺伝子が欠損した母親の卵では、頭部・胸部がつくられないことを確かめよう。', short: 'ビコイドの欠損' },
    { id: 'double', text: 'ビコイドを2倍にすると、頭部・胸部になる範囲が後方へ広がることを確かめよう。', short: '2倍にすると' },
  ],
  mount(root, ctx) {
    const st = { amount: 1, touched: 0 };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'ビコイドタンパク質の濃度勾配 ', modelNote('ショウジョウバエの卵の模式')));
    const chart = createChart(top, { label: 'ビコイドの濃度勾配のグラフ', aspect: 0.6 });
    const leg = h('div');
    top.append(leg);
    const chart2 = createChart(top, { label: '卵の模式図', aspect: 0.22 });
    top.append(h('p', { class: 'small muted' }, '横軸は前端を0、後端を1とした卵の長さに対する位置。濃度が閾値以上の範囲でハンチバック遺伝子などが発現し、頭部・胸部の構造がつくられるとした模式。'));

    const segA = segmented({ label: '卵をつくった母親のビコイド遺伝子', options: AMOUNTS, value: st.amount, onChange: (v) => { st.amount = v; st.touched++; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segA.el), panel('いま何が起きているか', exp.el));

    function update() {
      const a = st.amount;
      const b = boundary(a);
      chart.draw({
        alt: `頭部・胸部になる範囲：前端から ${fmt(b, 2)} まで`,
        x: { min: 0, max: 1, label: '卵の前端からの位置（前 0 ← → 1 後）', step: 0.2, digits: 1 },
        y: { min: 0, max: 2.2, label: 'ビコイドの濃度（相対値）', step: 0.5, digits: 1 },
        regions: b > 0 ? [{ x0: 0, x1: b, fill: 'region-3', label: '頭部・胸部' }] : [],
        series: [
          ...(a !== 1 ? [{ points: sample((x) => bicoid(x, 1), 0, 1, 200), color: 'muted', dash: 'dot', width: 1.5 }] : []),
          { points: sample((x) => bicoid(x, a), 0, 1, 300), color: 'c1', width: 3 },
        ],
        hlines: [{ y: THRESH, color: 'c2', dash: 'dash', label: '閾値', align: 'right' }],
        markers: b > 0 ? [{ x: b, y: THRESH, color: 'c2', label: `${fmt(b, 2)}` }] : [],
      });
      leg.replaceChildren(legend([{ label: 'ビコイドの濃度', color: 'c1' }, ...(a !== 1 ? [{ label: '正常な母親の卵（比較）', color: 'muted', dash: 'dot' }] : []), { label: 'ハンチバック遺伝子が発現する閾値', color: 'c2', dash: 'dash' }]));
      const polys = [];
      const seg = (x0, x1, fill, label) => polys.push({ points: [[x0, 0.2], [x1, 0.2], [x1, 0.8], [x0, 0.8]], fill, stroke: 'fg', label, at: [(x0 + x1) / 2, 0.5] });
      if (b > 0) seg(0, b, 'region-3', b > 0.18 ? '頭部・胸部' : '');
      seg(b, 1, 'region-4', '腹部など');
      chart2.draw({ alt: '卵の模式図', x: { min: 0, max: 1, ticks: [{ v: 0, text: '前' }, { v: 1, text: '後' }], grid: false }, y: { min: 0, max: 1, ticks: [] }, polygons: polys });
      const lines = [];
      lines.push('ビコイド遺伝子は、卵形成のときに母親の体内で発現する遺伝子（母性効果遺伝子）で、その mRNA は未受精卵の前端に局在する。この時期の胚は核が分裂しても細胞に仕切られていない（多核体）ので、受精後に翻訳されたビコイドタンパク質が後方へ拡散し、前端で高く後方ほど低い濃度勾配ができる。');
      if (a === 0) lines.push('母親のビコイド遺伝子が欠損していると、卵にビコイドがなく、どの位置でも閾値に達しない。そのため頭部と胸部がつくられず、前端にも尾部の構造ができる（胚の遺伝子型に関係なく、母親の遺伝子型で決まる）。');
      else lines.push(`濃度が閾値以上の範囲（前端から ${fmt(b, 2)} まで）で前方の構造をつくる遺伝子が発現する。各核（細胞）はビコイドの濃度を、自分の位置を知るための情報（位置情報）として受け取っている。`);
      if (a === 2) lines.push(`ビコイドが2倍になると、閾値に達する位置が 約${fmt(halfDistance(), 2)}（濃度が半分になる距離）だけ後方へずれ、頭部・胸部になる範囲が広がる。`);
      if (a === 0.5) lines.push(`ビコイドが半分になると、閾値に達する位置が 約${fmt(halfDistance(), 2)} だけ前方へずれる。`);
      lines.push('後端にはナノス遺伝子の mRNA が局在し、後方（腹部）の構造の形成にかかわる。このように、物質の濃度勾配によって体の前後などの軸が決まっていく。');
      exp.set(lines);
      ctx.update({ ...st, b });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.touched > 0 && s.amount === 1;
dojo.tasks[1].check = (s) => s.amount === 0;
dojo.tasks[2].check = (s) => s.amount === 2;
