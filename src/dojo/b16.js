// B16 生物濃縮 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { LEVELS, DEFAULT, chain, ratio, SUBSTANCES } from '../models/bioaccumulation.js';

const MARK = ['水', '①', '②', '③', '④', '⑤'];

// ppm の値を読みやすく（小さい値は指数表記）
function ppm(v) {
  if (v >= 0.01) return fmt(v, v >= 10 ? 1 : v >= 1 ? 2 : 3);
  const e = Math.floor(Math.log10(v));
  const sup = String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  return `${fmt(v / Math.pow(10, e), 1)}×10${sup}`;
}

export const dojo = {
  tasks: [
    { id: 'top', text: '「分解・排出されにくい物質」で1段ごとの濃縮倍率を3倍にし、魚を食べる鳥の濃縮率（鳥の体内の濃度 ÷ 水中の濃度）を確かめよう。', short: '鳥の濃縮率' },
    { id: 'deg', text: '「分解・排出されやすい物質」に切り替えて、上の栄養段階ほど濃度が低くなることを確かめよう。', short: '濃縮されない物質' },
    { id: 'f10', text: '1段ごとの濃縮倍率を10倍にして、鳥の体内の濃度が水中の100万倍をこえることを確かめよう。', short: '濃縮倍率の影響' },
  ],
  mount(root, ctx) {
    const st = { preset: 'persistent', f: SUBSTANCES.persistent.f };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '栄養段階と体内の濃度（対数目盛り） ', modelNote()));
    const chart = createChart(top, { label: '栄養段階ごとの体内の濃度のグラフ', aspect: 0.7 });
    const names = h('p', { class: 'small' }, MARK.slice(1).map((m, i) => `${m} ${LEVELS[i + 1]}`).join('　'));
    top.append(names, h('p', { class: 'small muted' }, `濃度の単位は ppm（百万分率。1 ppm は 1 kg あたり 1 mg）。教科書でよく使われる DDT の例（水 ${DEFAULT.c0} ppm、プランクトン 0.04 ppm、魚を食べる鳥 数十 ppm）を参考に、植物プランクトンは水から取り込んで ${DEFAULT.bcf} 倍、それより上は1段ごとに一定の倍率で濃くなるとした模式。縦軸は1目盛りで10倍になる。`));

    const segP = segmented({ label: '物質の性質', options: Object.entries(SUBSTANCES).map(([value, p]) => ({ value, label: p.label })), value: st.preset, onChange: (v) => { st.preset = v; if (v === 'persistent') { st.f = sF.value; } update(); } });
    const sF = slider({ label: '1段ごとの濃縮倍率（食べる側 ÷ 食べられる側）', min: 1.5, max: 10, step: 0.1, value: st.f, format: (v) => `${fmt(v, 1)} 倍`, onInput: (v) => { st.f = v; update(); } });
    const calc = h('div', { 'aria-live': 'polite' });
    const exp = explainBox();
    root.append(panel('操作', segP.el, sF.el), panel('計算：濃縮率', calc), panel('いま何が起きているか', exp.el));

    function update() {
      sF.el.hidden = st.preset !== 'persistent';
      const sub = SUBSTANCES[st.preset];
      const f = st.preset === 'persistent' ? st.f : sub.f;
      const c = chain({ bcf: sub.bcf, f });
      const pts = c.map((v, i) => [i, v]);
      chart.draw({
        alt: `水 ${ppm(c[0])} ppm → 魚を食べる鳥 ${ppm(c[5])} ppm`,
        x: { min: -0.4, max: 5.4, label: '栄養段階（左ほど下位）', ticks: MARK.map((m, i) => ({ v: i, text: m })) },
        y: { min: st.preset === 'persistent' ? 1e-6 : 1e-7, max: 1e4, log: true, label: '体内の濃度（ppm）' },
        series: [{ points: pts, color: st.preset === 'persistent' ? 'c2' : 'c1', width: 3 }],
        // 分解されやすい物質では値が近くて文字が重なるので、値は下の計算欄に書く
        markers: pts.map(([i, v]) => ({ x: i, y: v, color: st.preset === 'persistent' ? 'c2' : 'c1', label: st.preset === 'persistent' ? ppm(v) : null })),
        hlines: [{ y: c[0], color: 'muted', dash: 'dot', width: 1, label: '水中の濃度', align: 'right' }],
      });
      const r = ratio(c[5], c[0]);
      calc.replaceChildren(
        h('p', null, h('b', null, '濃縮率 ＝ 生物の体内の濃度 ÷ 水中（環境中）の濃度')),
        h('p', null, `魚を食べる鳥：${ppm(c[5])} ÷ ${ppm(c[0])} ＝ `, h('b', null, `${r >= 1000 ? Math.round(r).toLocaleString('ja-JP') : fmt(r, 1)} 倍`)),
        h('p', { class: 'small muted' }, `植物プランクトン：${ppm(c[1])} ÷ ${ppm(c[0])} ＝ ${fmt(ratio(c[1], c[0]), 0)} 倍。それより上は1段上がるごとに ${fmt(f, 1)} 倍になる。`),
        h('p', { class: 'small' }, '各段階の濃度（ppm）：', c.map((v, i) => `${MARK[i]} ${ppm(v)}`).join('、')),
      );
      const lines = [];
      if (st.preset === 'persistent') {
        lines.push('分解されにくく、体外に排出されにくい物質は、食べた生物の体内にたまり続ける。食物連鎖で上位の生物は多くの下位の生物を食べるので、栄養段階が上がるほど体内の濃度が高くなる。このように、物質が環境より高い濃度で体内に蓄積する現象を生物濃縮という。');
        lines.push(`この設定では、魚を食べる鳥の体内の濃度は水中の約${r >= 1000 ? Math.round(r).toLocaleString('ja-JP') : fmt(r, 0)}倍になる。水中の濃度がごくわずかでも、上位の生物には害が出る濃度になることがある。`);
        lines.push('例：殺虫剤の DDT、絶縁油などに使われた PCB（どちらも脂肪に溶けやすい）、有機水銀（水俣病の原因。体外に排出されにくい）。DDT が鳥の卵の殻を薄くして繁殖をさまたげたことが知られている。');
      } else {
        lines.push('分解されやすく、体外に排出されやすい物質は、生物の体内にたまらない。体内の濃度は水中の濃度をこえず、上の栄養段階ほど低くなるので、生物濃縮は起こらない。');
      }
      exp.set(lines);
      ctx.update({ ...st, f, ratio: r, top: c[5], c1: c[1] });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.preset === 'persistent' && Math.abs(s.f - 3) < 0.05;
dojo.tasks[1].check = (s) => s.preset === 'degradable' && s.top < s.c1;
dojo.tasks[2].check = (s) => s.preset === 'persistent' && s.f >= 10 && s.ratio > 1e6;
