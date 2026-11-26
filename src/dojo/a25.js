// A25 自然選択と遺伝子頻度 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { PRESETS, fitness, trajectory, lethalQ, heteroEquilibrium } from '../models/selection.js';

const T_HETERO = 1 - fitness('hetero', 0).aa; // 鎌状赤血球貧血症（aa）で子を残せない割合（モデルで固定）

export const dojo = {
  tasks: [
    { id: 'dark', text: '「工業暗化」で、暗色型の割合が 50% をこえる世代まで「見る世代」を進めよう。', short: '暗色型が増える' },
    { id: 'lethal', text: '「潜性致死」で 10 世代目を見て、q が q₀ ÷ (1 ＋ 10q₀) と一致することを確かめよう。', short: '潜性致死の計算' },
    { id: 'hetero', text: '「ヘテロ接合体が有利（発展）」で、はじめの頻度 q₀ を変えても、q が同じ値に近づくことを確かめよう。', short: '平衡の頻度' },
  ],
  mount(root, ctx) {
    const st = { preset: 'industrial', s: 20, q0: PRESETS.industrial.q0, gen: 0, heteroQ0s: [] };

    const top = panel(null);
    root.append(top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '遺伝子頻度の変化のグラフ', aspect: 0.62 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const segP = segmented({
      label: '場面',
      options: [{ value: 'industrial', label: '工業暗化' }, { value: 'lethal', label: '潜性致死' }, { value: 'hetero', label: 'ヘテロ接合体が有利（発展）' }],
      value: st.preset,
      onChange: (v) => {
        st.preset = v;
        sQ.set(Math.round(PRESETS[v].q0 * 100), true);
        st.q0 = sQ.value / 100;
        sGen.setRange(0, PRESETS[v].gens);
        st.gen = sGen.value;
        layout();
      },
    });
    const sS = slider({ label: '選択の強さ', min: 0, max: 50, step: 5, value: st.s, format: (v) => `${v}%`, onInput: (v) => { st.s = v; update(); } });
    const sQ = slider({ label: 'はじめの潜性の遺伝子の頻度 q₀', min: 1, max: 99, step: 1, value: Math.round(st.q0 * 100), format: (v) => fmt(v / 100, 2), onInput: (v) => { st.q0 = v / 100; update(); } });
    const sGen = slider({ label: '見る世代', min: 0, max: PRESETS.industrial.gens, step: 1, value: st.gen, format: (v) => `${v} 世代`, onInput: (v) => { st.gen = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segP.el, sS.el, sQ.el, sGen.el), panel('いま何が起きているか', exp.el));

    function layout() {
      sS.el.hidden = st.preset === 'lethal';
      const lab = sS.el.querySelector('label');
      if (lab) lab.textContent = st.preset === 'industrial' ? '明色型（cc）が鳥に食べられて子を残せない割合' : '正常型（AA）がマラリアで子を残せない割合';
      update();
    }

    function update() {
      const { preset, q0, gen } = st;
      const s = st.s / 100;
      const w = fitness(preset, s);
      const gens = PRESETS[preset].gens;
      const tr = trajectory(q0, w, gens);
      const q = tr[gen];
      const isInd = preset === 'industrial';
      const pheno = isInd ? 1 - q * q : q * q;
      if (preset === 'hetero' && !st.heteroQ0s.includes(q0)) st.heteroQ0s.push(q0);
      const qName = isInd ? '明色の遺伝子 c の頻度 q' : preset === 'lethal' ? '致死遺伝子 a の頻度 q' : '鎌状赤血球の遺伝子 a の頻度 q';
      const pName = isInd ? '暗色型（CC・Cc）の割合' : preset === 'lethal' ? '生まれた子のうち aa の割合（q²）' : '生まれた子のうち aa（貧血症）の割合（q²）';
      const heading = { industrial: '工業暗化（オオシモフリエダシャク）', lethal: '潜性致死遺伝子', hetero: 'ヘテロ接合体が有利な場合（鎌状赤血球貧血症とマラリア）' }[preset];
      title.replaceChildren(`${heading} `, modelNote());
      const eq = preset === 'hetero' ? heteroEquilibrium(s, T_HETERO) : null;
      chart.draw({
        alt: `${gen}世代：q ＝ ${fmt(q, 3)}、${pName} ${fmt(pheno * 100, 1)}%`,
        x: { min: 0, max: gens, label: '世代', step: gens >= 60 ? 10 : 5 },
        y: { min: 0, max: 1, label: '頻度・割合', step: 0.2, digits: 1 },
        series: [
          { points: tr.map((v, i) => [i, isInd ? 1 - v * v : v * v]), color: 'c3', dash: 'dash', width: 3 },
          { points: tr.map((v, i) => [i, v]), color: 'c1', width: 3 },
        ],
        hlines: eq != null && s > 0 ? [{ y: eq, color: 'c4', dash: 'dot', label: `平衡 ${fmt(eq, 2)}` }] : [],
        vlines: [{ x: gen, color: 'muted', dash: 'dot' }],
        // 2つの点が近いときは、文字を1つにまとめて重ならないようにする
        markers: Math.abs(q - pheno) < 0.12
          ? [
            { x: gen, y: q, color: 'c1', label: `q ＝ ${fmt(q, 3)}・${fmt(pheno * 100, 1)}%` },
            { x: gen, y: pheno, color: 'c3', shape: 'square' },
          ]
          : [
            { x: gen, y: q, color: 'c1', label: `q ＝ ${fmt(q, 3)}` },
            { x: gen, y: pheno, color: 'c3', shape: 'square', label: `${fmt(pheno * 100, 1)}%` },
          ],
      });
      leg.replaceChildren(legend([{ label: qName, color: 'c1' }, { label: pName, color: 'c3', dash: 'dash' }, ...(eq != null && s > 0 ? [{ label: '平衡の頻度', color: 'c4', dash: 'dot' }] : [])]));
      note.textContent = '毎世代、自由交配で AA : Aa : aa ＝ p² : 2pq : q² の子が生まれ、遺伝子型ごとに子を残せる割合が違うとした模式図（集団は十分に大きく、突然変異・移入・移出はない）。';

      const lines = [`${gen} 世代目：q ＝ ${fmt(q, 3)}、${pName}は ${fmt(pheno * 100, 1)}%。`];
      if (isInd) {
        lines.push(s > 0
          ? `工業地帯で樹皮がすすで黒くなると、明色型（cc）は鳥に見つかりやすく、${st.s}% が食べられて子を残せない。暗色型の遺伝子 C は顕性なので、CC・Cc はどちらも暗色型で生き残りやすい。そのため世代を重ねると、c が減って暗色型の割合が増える（工業暗化）。`
          : '選択の強さが 0% なので、どの型も同じように子を残し、遺伝子頻度は変わらない（ハーディー・ワインベルグの法則）。');
        lines.push('はじめのうち暗色型の増え方がゆっくりなのは、まれな C の遺伝子が、まだ少ない暗色型の個体にしか含まれていないからである。大気汚染が改善されると、明色型が再び増えた。');
      } else if (preset === 'lethal') {
        lines.push(`aa の子は育たないので、毎世代 a が取り除かれ、q ＝ q₀ ÷ (1 ＋ n·q₀) と減っていく。${gen} 世代目は ${fmt(q0, 2)} ÷ (1 ＋ ${gen} × ${fmt(q0, 2)}) ＝ ${fmt(lethalQ(q0, gen), 3)}。`);
        lines.push('q が小さくなるほど減り方がゆっくりになる。a の多くは表現型に現れないヘテロ接合体（Aa）の中にあり、自然選択を受けないからである。そのため有害な潜性の遺伝子は、集団からなかなかなくならない。');
      } else {
        lines.push(s > 0
          ? `マラリアの多い地域では、ヘテロ接合体（Aa）がマラリアにかかりにくく、最も子を残しやすい。AA はマラリアで、aa は貧血で子を残しにくいので、q は AA と aa の不利さのつり合う ${fmt(eq, 2)} に近づく。はじめの q₀ を変えても、近づく値は同じである。`
          : '正常型が不利でない（0%）と、aa だけが不利なので、a は少しずつ減っていく。');
        lines.push('このように、ある環境で有利な形質をもつ個体がより多くの子を残すことで、集団の遺伝子頻度が変化することを自然選択という。');
      }
      exp.set(lines);
      ctx.update({ ...st, q, pheno, heteroCount: st.heteroQ0s.length, eq });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.preset === 'industrial' && s.s > 0 && s.pheno > 0.5;
dojo.tasks[1].check = (s) => s.preset === 'lethal' && s.gen === 10;
dojo.tasks[2].check = (s) => s.preset === 'hetero' && s.s > 0 && s.heteroCount >= 2;
