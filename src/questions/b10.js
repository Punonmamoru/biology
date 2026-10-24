// B10 DNAの塩基組成 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { compositionFromA, strandComposition, NM_PER_BP } from '../models/dna.js';

// 10のべき乗の表示（例：3.4 × 10⁹）
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sci(x) {
  const e = Math.floor(Math.log10(x) + 1e-9);
  const m = x / Math.pow(10, e);
  return `${fmt(m, 2)} × 10${String(e).split('').map((c) => SUP[c]).join('')}`;
}

export const B10 = [
  {
    id: 'b10-chargaff-a',
    stage: 'b10',
    level: 1,
    kind: 'calc',
    make(rng) {
      const a = rng.int(15, 35);
      const c = compositionFromA(a);
      const ask = rng.pick(['G', 'C', 'T']);
      const ans = c[ask];
      const d = distinctNumbers(ans, [100 - a, 100 - 2 * a, a / 2, 50 - a / 2, (100 - a) / 3, ask === 'T' ? c.G : a], '%', 1);
      return {
        text: `ある生物の2本鎖DNAに含まれる塩基のうち、A（アデニン）の割合は ${a}% であった。このDNAの ${ask}（${{ G: 'グアニン', C: 'シトシン', T: 'チミン' }[ask]}）の割合は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: ask === 'T'
          ? `2本鎖DNAではAとTが対をつくるので、T ＝ A ＝ ${a}% となる。AとT、GとCが相補的に結合しているから、AとTの数、GとCの数はそれぞれ等しい。`
          : `T ＝ A ＝ ${a}% なので G＋C ＝ 100 − ${a}×2 ＝ ${100 - 2 * a}%、G ＝ C ＝ ${fmt(ans, 1)}% となる。2本鎖DNAではAとT、GとCがそれぞれ対をつくるから、A＝T、G＝Cが成り立つ。`,
      };
    },
  },
  {
    id: 'b10-chargaff-gc',
    stage: 'b10',
    level: 1,
    kind: 'calc',
    make(rng) {
      const gc = rng.pick([36, 40, 42, 44, 46, 50, 52, 56, 60, 64]);
      const a = (100 - gc) / 2;
      const d = distinctNumbers(a, [100 - gc, gc / 2, gc, 50 - gc / 4, a + 10], '%', 1);
      return {
        text: `ある生物の2本鎖DNAでは、G（グアニン）とC（シトシン）の割合の合計が ${gc}% であった。A（アデニン）の割合は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `A＋T ＝ 100 − ${gc} ＝ ${100 - gc}% で、A ＝ T なので A ＝ ${100 - gc} ÷ 2 ＝ ${fmt(a, 1)}% となる。2本鎖DNAではAとTが相補的に対をつくるから、AとTの割合は等しい。`,
      };
    },
  },
  {
    id: 'b10-strand',
    stage: 'b10',
    level: 3,
    kind: 'calc',
    make(rng) {
      const A = rng.int(15, 35), T = rng.int(10, 30), G = rng.int(10, 30);
      const C = 100 - A - T - G;
      if (C < 8 || A === T) return this.make(rng);
      const r = strandComposition({ A, T, G, C });
      const ask = rng.pick(['s2A', 's2G', 'bothA', 'bothG']);
      const map = { s2A: [r.s2.A, '相補的なもう一方の鎖（鎖2）の A'], s2G: [r.s2.G, '相補的なもう一方の鎖（鎖2）の G'], bothA: [r.both.A, '2本鎖全体の A'], bothG: [r.both.G, '2本鎖全体の G'] };
      const [ans, label] = map[ask];
      const d = distinctNumbers(ans, [A, T, G, C, (A + G) / 2, (A + C) / 2, (T + G) / 2, 100 - ans], '%', 1);
      const why = {
        s2A: `鎖2のAは鎖1のTと対をつくるので、鎖2のA ＝ 鎖1のT ＝ ${T}% となる`,
        s2G: `鎖2のGは鎖1のCと対をつくるので、鎖2のG ＝ 鎖1のC ＝ 100 −（${A}＋${T}＋${G}）＝ ${C}% となる`,
        bothA: `2本鎖全体のAは（鎖1のA＋鎖2のA）÷2 ＝（${A}＋${T}）÷2 ＝ ${fmt(ans, 1)}% となる`,
        bothG: `鎖1のCは 100 −（${A}＋${T}＋${G}）＝ ${C}% なので、2本鎖全体のGは（鎖1のG＋鎖2のG）÷2 ＝（${G}＋${C}）÷2 ＝ ${fmt(ans, 1)}% となる`,
      };
      return {
        text: `ある2本鎖DNAの一方の鎖（鎖1）の塩基組成は、A ${A}%、T ${T}%、G ${G}%（残りはC）であった。${label}の割合は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${why[ask]}。鎖1と鎖2は相補的で、鎖1のAには鎖2のT、鎖1のGには鎖2のCが必ず向かい合うから、一方の鎖の組成からもう一方の鎖の組成が決まる。`,
      };
    },
  },
  {
    id: 'b10-length',
    stage: 'b10',
    level: 2,
    kind: 'calc',
    make(rng) {
      if (rng.chance(0.5)) {
        const bp = rng.pick([1000, 2000, 3000, 5000, 10000, 20000, 50000]);
        const nm = bp * NM_PER_BP;
        const d = distinctNumbers(nm, [bp * 3.4, bp / 10, bp * 0.68, bp * 0.034, nm * 2], ' nm', 1);
        return {
          text: `2本鎖DNAは10塩基対でらせんが1回転し、その長さは3.4 nmである。${bp.toLocaleString('ja-JP')} 塩基対のDNAの長さは何 nm か。`,
          correct: d.correct,
          wrong: d.wrong,
          ordered: true,
          explanation: `1塩基対あたりの長さは 3.4 ÷ 10 ＝ 0.34 nm なので、${bp.toLocaleString('ja-JP')} × 0.34 ＝ ${fmt(nm, 1)} nm となる。DNAの長さは塩基対の数に比例するから、1塩基対あたりの長さをかければよい。`,
        };
      }
      const turns = rng.pick([50, 100, 150, 200, 300, 500]);
      const nm = turns * 3.4;
      const bp = turns * 10;
      const d = distinctNumbers(bp, [turns, turns * 2, turns * 20, turns * 3.4, nm / 3.4 / 2], ' 塩基対', 0);
      return {
        text: `長さ ${fmt(nm, 0)} nm の2本鎖DNAがある。DNAは10塩基対でらせんが1回転し、その長さは3.4 nmである。このDNAは何塩基対か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `らせんの回転数は ${fmt(nm, 0)} ÷ 3.4 ＝ ${turns} 回で、1回転が10塩基対なので ${turns} × 10 ＝ ${bp} 塩基対となる。1塩基対あたり 0.34 nm だから、${fmt(nm, 0)} ÷ 0.34 と計算しても同じになる。`,
      };
    },
  },
  {
    id: 'b10-genome-calc',
    stage: 'b10',
    level: 3,
    kind: 'calc',
    make(rng) {
      if (rng.chance(0.5)) {
        // ヒトの体細胞のDNAの全長
        const hap = 3.0e9;
        const total = hap * 2 * NM_PER_BP * 1e-9; // m
        const d = distinctNumbers(total, [hap * NM_PER_BP * 1e-9, total * 10, total / 10, hap * 3.4 * 1e-9], ' m', 2);
        return {
          text: 'ヒトのゲノム（1組）は約30億（3.0 × 10⁹）塩基対からなる。体細胞1個に含まれるDNAをすべてつなぐと、およそ何 m になるか。ただし、1塩基対の長さを 0.34 nm（1 nm ＝ 10⁻⁹ m）とする。',
          correct: '約' + d.correct,
          wrong: d.wrong.map((w) => '約' + w),
          ordered: true,
          explanation: `体細胞には両親から受け継いだゲノムが2組あるので、3.0 × 10⁹ × 2 × 0.34 × 10⁻⁹ ≒ ${fmt(total, 2)} m となる。ゲノム1組分（約1 m）ではなく、2組分を計算しなければならないからである。`,
        };
      }
      const genes = rng.pick([2.0e4, 2.2e4]);
      const aa = rng.pick([300, 400, 500]);
      const coding = genes * aa * 3;
      const pct = (coding / 3.0e9) * 100;
      const d = distinctNumbers(pct, [pct * 2, pct / 3, pct * 3, pct * 10, (genes * aa) / 3.0e9 * 100], '%', 2);
      return {
        text: `ヒトのゲノムは約 3.0 × 10⁹ 塩基対で、遺伝子は約 ${sci(genes)} 個ある。1つの遺伝子が平均 ${aa} 個のアミノ酸を指定するとすると、アミノ酸を指定する部分の塩基対の数は、ゲノム全体のおよそ何%か（終止コドンは考えない）。`,
        correct: '約' + d.correct,
        wrong: d.wrong.map((w) => '約' + w),
        ordered: true,
        explanation: `アミノ酸1個に3塩基対が必要なので、${sci(genes)} × ${aa} × 3 ＝ ${sci(coding)} 塩基対となり、${sci(coding)} ÷ (3.0 × 10⁹) × 100 ≒ ${fmt(pct, 2)}% である。ヒトのゲノムではアミノ酸を指定する部分はごく一部で、大部分は翻訳されない領域だからである。`,
      };
    },
  },
  {
    id: 'b10-graph',
    stage: 'b10',
    level: 2,
    kind: 'graph',
    make(rng) {
      // ア〜エ：2本鎖DNA 1つと、A≠T または G≠C の試料（1本鎖DNA）3つ
      const make2 = () => {
        const a = rng.int(18, 32);
        return { A: a, T: a, G: 50 - a, C: 50 - a };
      };
      const make1 = () => {
        for (;;) {
          const A = rng.int(15, 35), T = rng.int(12, 33), G = rng.int(12, 30);
          const C = 100 - A - T - G;
          if (C >= 10 && Math.abs(A - T) >= 6 && Math.abs(G - C) >= 4) return { A, T, G, C };
        }
      };
      const idx = rng.int(0, 3);
      const samples = [0, 1, 2, 3].map((i) => (i === idx ? make2() : make1()));
      const cats = ['A', 'T', 'G', 'C'];
      return {
        text: '図のア〜エは、4種類のDNA試料の塩基組成（%）である。このうち1つだけが2本鎖DNAで、残りは1本鎖DNAである。2本鎖DNAはどれか。',
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0, max: 45, label: '割合（%）', step: 5 },
          bars: { categories: KATA.slice(0, 4), groups: cats.map((c, ci) => ({ label: c, values: samples.map((s) => s[c]), color: ['c1', 'c2', 'c3', 'c4'][ci] })) },
          alt: 'DNA試料ア〜エの塩基組成の棒グラフ',
        },
        correct: KATA[idx],
        wrong: KATA.slice(0, 4).filter((_, i) => i !== idx),
        explanation: `${KATA[idx]}だけがAとT、GとCの割合がそれぞれ等しい。2本鎖DNAではAとT、GとCが相補的に対をつくるので、A＝T、G＝Cになるからである。`,
      };
    },
  },
  {
    id: 'b10-pair-term',
    stage: 'b10',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: 'DNAの2本の鎖の間で対をつくる塩基の組合せとして正しいものはどれか。', correct: 'AとT、GとC', wrong: ['AとG、TとC', 'AとC、GとT', 'AとU、GとC'], explanation: 'DNAではAとT、GとCが対をつくる。この相補的な塩基対によって2本の鎖が結びついているから、一方の鎖の塩基配列が決まればもう一方も決まる。' },
        { text: 'DNAを構成する基本単位（ヌクレオチド）の成分の組合せとして正しいものはどれか。', correct: 'リン酸・糖（デオキシリボース）・塩基', wrong: ['リン酸・糖（リボース）・塩基', 'アミノ酸・糖・塩基', 'リン酸・脂肪酸・塩基'], explanation: 'DNAのヌクレオチドは、リン酸・糖（デオキシリボース）・塩基からなる。RNAのヌクレオチドは糖がリボースなので、糖の種類でDNAと区別できる。' },
        { text: '「どの生物の2本鎖DNAでも、Aの割合とTの割合、Gの割合とCの割合はそれぞれ等しい」ことを発見した人物はだれか。', correct: 'シャルガフ', wrong: ['ワトソンとクリック', 'メンデル', 'グリフィス'], explanation: 'この規則はシャルガフが発見した（シャルガフの規則）。この規則は、AとT、GとCが対をつくる二重らせんのモデル（ワトソンとクリック）の手がかりになったので重要である。' },
        { text: 'DNAの立体構造として正しいものはどれか。', correct: '2本の鎖が塩基どうしで結合し、ねじれた二重らせん構造', wrong: ['1本の鎖が折りたたまれた球状の構造', '3本の鎖がねじれた三重らせん構造', '2本の鎖が糖どうしで結合した平らなはしご構造'], explanation: 'DNAは、2本のヌクレオチド鎖が内側の塩基どうしで結合し、全体がねじれた二重らせん構造をとる。ワトソンとクリックがX線回折の結果などをもとに提唱したモデルで、塩基の相補性からA＝T、G＝Cも説明できるからである。' },
      ];
      return rng.pick(Q);
    },
  },
  {
    id: 'b10-genome-term',
    stage: 'b10',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'ゲノムの説明として最も適当なものはどれか。',
          correct: 'その生物が生命活動を営むのに必要な、1組の遺伝情報（DNA）の全体',
          wrong: ['体細胞に含まれるすべてのタンパク質の全体', 'DNAのうち、タンパク質のアミノ酸配列を指定する部分だけ', '1本の染色体に含まれる1つの遺伝子'],
          explanation: 'ゲノムは、その生物が生きていくのに必要な1組の遺伝情報の全体である。ヒトの体細胞は両親からゲノムを1組ずつ受け継ぐので、ゲノムを2組もっている。',
        };
      }
      return {
        text: 'ヒトのゲノムについての説明として最も適当なものはどれか。',
        correct: '約30億塩基対からなり、遺伝子の数は約2万個で、アミノ酸を指定する部分は全体のごく一部である',
        wrong: ['約30億塩基対からなり、そのすべてがアミノ酸を指定している', '約2万塩基対からなり、遺伝子は約30億個ある', '体細胞ごとに異なり、皮膚の細胞と肝臓の細胞ではゲノムが違う'],
        explanation: 'ヒトのゲノムは約30億塩基対で、遺伝子は約2万個ある。アミノ酸を指定する部分は全体の1〜2%程度にすぎない。体のどの細胞も同じゲノムをもつが、細胞の種類によってはたらく遺伝子が違うから、さまざまな細胞ができる。',
      };
    },
  },
];
