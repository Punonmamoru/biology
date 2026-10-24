// B10 DNAの塩基組成 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, HATCHES } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { strandComposition, compositionFromA, lengthNm, NM_PER_BP, BP_PER_TURN, GENOMES } from '../models/dna.js';

const KEYS = ['A', 'T', 'G', 'C'];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pow10 = (e) => '10' + String(e).split('').map((c) => SUP[Number(c)]).join('');

function lengthText(nm) {
  if (nm >= 1e9) return `${fmt(nm / 1e9, 2)} m`;
  if (nm >= 1e6) return `${fmt(nm / 1e6, 2)} mm`;
  if (nm >= 1e3) return `${fmt(nm / 1e3, 2)} μm`;
  return `${fmt(nm, 1)} nm`;
}

export const dojo = {
  tasks: [
    { id: 'chargaff', text: '「2本鎖DNA」で A の割合を動かし、いつでも A＝T、G＝C になることを確かめよう。', short: 'シャルガフの規則' },
    { id: 'gc', text: '「2本鎖DNA」で、G＋C の割合がちょうど60%になるように A の割合を合わせよう。', short: 'G＋C＝60%' },
    { id: 'strand', text: '「1本ずつ見る」で、鎖1では A と T が等しくないのに、2本鎖全体では A＝T になることを確かめよう。', short: '1本鎖と2本鎖の違い' },
    { id: 'human', text: '長さの計算で「ヒトの体細胞」を選び、DNAの全長がおよそ何mになるか確かめよう。', short: 'ヒトのDNAの長さ' },
  ],
  mount(root, ctx) {
    const st = { mode: 'double', a: 30, s1: { A: 35, T: 20, G: 15 }, bpExp: 4, bpMant: 1, preset: null };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'DNAの塩基組成（%） ', modelNote()));
    const chart = createChart(top, { label: '塩基組成の棒グラフ', aspect: 0.62 });
    const leg = h('div');
    top.append(leg);

    const segMode = segmented({ label: '表示', options: [{ value: 'double', label: '2本鎖DNA' }, { value: 'strand', label: '1本ずつ見る' }], value: st.mode, onChange: (v) => { st.mode = v; draw(); } });
    const sA = slider({ label: '2本鎖DNAの A の割合', min: 5, max: 45, step: 0.5, value: st.a, format: (v) => fmt(v, 1) + '%', onInput: (v) => { st.a = v; draw(); } });
    const s1A = slider({ label: '鎖1の A', min: 5, max: 50, step: 1, value: st.s1.A, format: (v) => v + '%', onInput: (v) => { st.s1.A = v; fix1('A'); draw(); } });
    const s1T = slider({ label: '鎖1の T', min: 5, max: 50, step: 1, value: st.s1.T, format: (v) => v + '%', onInput: (v) => { st.s1.T = v; fix1('T'); draw(); } });
    const s1G = slider({ label: '鎖1の G', min: 5, max: 50, step: 1, value: st.s1.G, format: (v) => v + '%', onInput: (v) => { st.s1.G = v; fix1('G'); draw(); } });
    const c1Out = h('div', { class: 'small' });
    const strandBox = h('div', null, s1A.el, s1T.el, s1G.el, c1Out);
    const exp = explainBox();
    root.append(panel('操作', segMode.el, sA.el, strandBox), panel('いま何が起きているか', exp.el));

    // 鎖1の C は残り（5%以上になるように、動かしていない値を減らす）
    function fix1(moved) {
      const others = ['A', 'T', 'G'].filter((k) => k !== moved);
      let over = st.s1.A + st.s1.T + st.s1.G - 95;
      for (const k of others) {
        if (over <= 0) break;
        const d = Math.min(over, st.s1[k] - 5);
        st.s1[k] -= d;
        over -= d;
      }
      s1A.set(st.s1.A, true);
      s1T.set(st.s1.T, true);
      s1G.set(st.s1.G, true);
    }

    // ---- 長さの計算 ----
    const lp = panel('計算：塩基対の数とDNAの長さ');
    root.append(lp);
    const segPre = segmented({ label: '例', options: [{ value: 'ecoli', label: '大腸菌のゲノム' }, { value: 'human1', label: 'ヒトのゲノム（1組）' }, { value: 'human2', label: 'ヒトの体細胞（2組）' }], value: null, onChange: (v) => {
      const bp = v === 'ecoli' ? GENOMES[1].bp : v === 'human1' ? GENOMES[0].bp : GENOMES[0].bp * 2;
      st.bpExp = Math.floor(Math.log10(bp));
      st.bpMant = Number((bp / Math.pow(10, st.bpExp)).toFixed(1));
      st.preset = v;
      sExp.set(st.bpExp, true);
      sMant.set(st.bpMant, true);
      draw();
    } });
    const sMant = slider({ label: '塩基対の数（仮数）', min: 1, max: 9.9, step: 0.1, value: st.bpMant, format: (v) => fmt(v, 1), onInput: (v) => { st.bpMant = v; st.preset = null; segPre.set(null, true); draw(); } });
    const sExp = slider({ label: '塩基対の数（10の何乗か）', min: 1, max: 10, step: 1, value: st.bpExp, format: (v) => `× ${pow10(v)}`, onInput: (v) => { st.bpExp = v; st.preset = null; segPre.set(null, true); draw(); } });
    const lenBox = h('div', { 'aria-live': 'polite' });
    lp.append(
      h('p', { class: 'small' }, h('b', null, `DNAの長さ ＝ 塩基対の数 × ${NM_PER_BP} nm`), `（2本鎖DNAは ${BP_PER_TURN} 塩基対でらせんが1回転し、その長さが約 ${fmt(NM_PER_BP * BP_PER_TURN, 1)} nm）`),
      segPre.el, sMant.el, sExp.el, lenBox,
    );

    function draw() {
      strandBox.hidden = st.mode !== 'strand';
      sA.el.hidden = st.mode !== 'double';
      let groups;
      const lines = [];
      if (st.mode === 'double') {
        const c = compositionFromA(st.a);
        groups = [{ label: '2本鎖DNA', values: KEYS.map((k) => c[k]), color: 'c1' }];
        lines.push(`A ${fmt(c.A, 1)}%、T ${fmt(c.T, 1)}%、G ${fmt(c.G, 1)}%、C ${fmt(c.C, 1)}%。2本鎖DNAでは、AとT、GとCがそれぞれ相補的に対をつくっているので、Aの数＝Tの数、Gの数＝Cの数になる（シャルガフの規則）。`);
        lines.push(`計算のしかた：A＝T＝${fmt(st.a, 1)}% なので、G＋C ＝ 100 − 2×${fmt(st.a, 1)} ＝ ${fmt(100 - 2 * st.a, 1)}%、G＝C ＝ ${fmt(c.G, 1)}%。`);
        lines.push('AとTの割合（またはGとCの割合）は生物の種類によって異なるが、どの生物の2本鎖DNAでもA＝T、G＝Cが成り立つ。');
      } else {
        const s1 = { ...st.s1, C: 100 - st.s1.A - st.s1.T - st.s1.G };
        const r = strandComposition(s1);
        c1Out.textContent = `鎖1の C ＝ 100 − (A＋T＋G) ＝ ${fmt(s1.C, 0)}%`;
        groups = [
          { label: '鎖1', values: KEYS.map((k) => r.s1[k]), color: 'c1' },
          { label: '鎖2（相補鎖）', values: KEYS.map((k) => r.s2[k]), color: 'c2' },
          { label: '2本鎖全体', values: KEYS.map((k) => r.both[k]), color: 'c3' },
        ];
        lines.push(`鎖1：A ${s1.A}%、T ${s1.T}%、G ${s1.G}%、C ${s1.C}%。鎖2は鎖1と相補的なので、鎖2のA＝鎖1のT（${s1.T}%）、鎖2のT＝鎖1のA（${s1.A}%）、鎖2のG＝鎖1のC（${s1.C}%）、鎖2のC＝鎖1のG（${s1.G}%）になる。`);
        lines.push(`2本鎖全体では、A ＝（${s1.A}＋${s1.T}）÷2 ＝ ${fmt(r.both.A, 1)}%、T も ${fmt(r.both.T, 1)}%。1本の鎖の中ではA＝Tとは限らないが、2本鎖全体では必ずA＝T、G＝Cになる。`);
      }
      chart.draw({
        alt: groups.map((g) => `${g.label}：` + KEYS.map((k, i) => `${k} ${fmt(g.values[i], 1)}%`).join('、')).join('。'),
        x: { min: 0, max: 1 },
        y: { min: 0, max: 60, label: '割合（%）', step: 10 },
        bars: { categories: KEYS, groups },
      });
      leg.replaceChildren(legend(groups.map((g, i) => ({ label: g.label, color: g.color, bar: true, hatch: HATCHES[i] }))));
      exp.set(lines);

      const bp = st.bpMant * Math.pow(10, st.bpExp);
      const nm = lengthNm(bp);
      lenBox.replaceChildren(
        h('p', null, `${fmt(st.bpMant, 1)} × ${pow10(st.bpExp)} 塩基対 × ${NM_PER_BP} nm ＝ `, h('b', null, lengthText(nm)), `（らせんの回転数 ${fmt(bp / BP_PER_TURN, 0)} 回）`),
        h('p', { class: 'small muted' }, st.preset === 'human2'
          ? 'ヒトの体細胞には、両親から受け継いだゲノムが2組（約60億塩基対）あるので、DNAをすべてつなぐと約2 mになる。これが直径数 μm の核の中に、ヒストンに巻きついて折りたたまれて収まっている。'
          : st.preset === 'ecoli'
            ? '大腸菌のゲノムは約460万塩基対で、約4500個の遺伝子がある。原核生物では、DNAの大部分が遺伝子として使われている。'
            : st.preset === 'human1'
              ? 'ヒトのゲノム（1組）は約30億塩基対で、遺伝子は約2万個。タンパク質のアミノ酸配列を指定する部分は、ゲノム全体の1〜2%程度にすぎない。'
              : '1 nm ＝ 10⁻⁹ m、1 μm ＝ 10⁻⁶ m、1 mm ＝ 10⁻³ m。'),
      );
      const two = compositionFromA(st.a);
      ctx.update({ ...st, two, gcSum: two.G + two.C, s1C: 100 - st.s1.A - st.s1.T - st.s1.G, seenA: (st.seenA = (st.seenA || new Set()).add(st.a)) });
    }
    draw();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.mode === 'double' && s.seenA.size >= 3;
dojo.tasks[1].check = (s) => s.mode === 'double' && Math.abs(s.gcSum - 60) < 0.01;
dojo.tasks[2].check = (s) => s.mode === 'strand' && s.s1.A !== s.s1.T;
dojo.tasks[3].check = (s) => s.preset === 'human2';
