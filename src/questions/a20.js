// A20 減数分裂と遺伝的多様性 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { dnaAt, TOTAL, PHASES, gameteTypes } from '../models/meiosis.js';
import { sample } from '../lib/series.js';

export const A20 = [
  {
    id: 'a20-dna-graph',
    stage: 'a20',
    level: 2,
    kind: 'graph',
    make(rng) {
      let acc = 0;
      const at = {};
      for (const p of PHASES) { at[p.id] = [acc, acc + p.len]; acc += p.len; }
      const pts = { S: (at.S[0] + at.S[1]) / 2, M1end: at.M1[1], M2end: TOTAL };
      const labels = { S: KATA[0], M1end: KATA[1], M2end: KATA[2] };
      return {
        text: '図は、減数分裂での細胞1個あたりの DNA 量の変化を表している。ア〜ウのうち、相同染色体が分かれて別々の細胞に入り、染色体数が半分（n）になるところはどれか。',
        chart: {
          x: { min: 0, max: TOTAL, label: '時間', ticks: [] },
          y: { min: 0, max: 5, label: 'DNA量（相対値）', step: 1 },
          series: [{ points: sample((x) => dnaAt(x), 0, TOTAL - 1e-6, 600), color: 'c1', width: 3 }],
          texts: Object.keys(pts).map((k) => ({ x: pts[k] - (k === 'M2end' ? 0.8 : 0), y: dnaAt(Math.min(pts[k] - 0.01, TOTAL - 0.01)) + 0.5, text: labels[k], color: 'c2' })),
          alt: '減数分裂の DNA 量ア〜ウ',
        },
        correct: `${labels.M1end}（第一分裂の終わり）`,
        wrong: [`${labels.S}（DNA の複製）`, `${labels.M2end}（第二分裂の終わり）`, 'ア〜ウのどれでもない'],
        explanation: `相同染色体が分かれるのは第一分裂で、その終わりの${labels.M1end}で DNA 量が4から2になり、染色体数が n になる。第二分裂（${labels.M2end}）では染色分体が分かれるので、DNA 量は半分になるが染色体数は n のままだからである。`,
      };
    },
  },
  {
    id: 'a20-gametes',
    stage: 'a20',
    level: 1,
    kind: 'calc',
    make(rng) {
      const n = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const ans = gameteTypes(n);
      const d = distinctNumbers(ans, [2 * n, n * n, gameteTypes(n - 1), gameteTypes(n + 1), ans * ans], ' 通り', 0);
      return {
        text: `体細胞の染色体数が 2n ＝ ${2 * n} の生物がある。乗換えが起こらないとすると、1個体がつくる配偶子の染色体の組合せは何通りか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `相同染色体は ${n} 組あり、第一分裂でそれぞれの組のどちらが配偶子に入るかは独立に決まるので、2^${n} ＝ ${ans} 通りとなる。各組で2通りずつの選び方があり、それを ${n} 組分かけ合わせるからである。`,
      };
    },
  },
  {
    id: 'a20-zygotes',
    stage: 'a20',
    level: 2,
    kind: 'calc',
    make(rng) {
      const n = rng.pick([2, 3, 4, 5]);
      const g = gameteTypes(n);
      const ans = g * g;
      const d = distinctNumbers(ans, [g, 2 * g, g + g, Math.pow(2, 2 * n + 1), n * n * 4], ' 通り', 0);
      return {
        text: `2n ＝ ${2 * n} の生物で、両親の配偶子が受精して子ができる。乗換えが起こらないとすると、子の染色体の組合せは何通り考えられるか（両親はそれぞれ異なる染色体の組をもつものとする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `1個体の配偶子は 2^${n} ＝ ${g} 通りで、父親と母親の配偶子が無作為に組み合わさるので、${g} × ${g} ＝ ${ans} 通りとなる。受精で両親の配偶子が組み合わさることも、子の遺伝的多様性を大きくするからである。`,
      };
    },
  },
  {
    id: 'a20-dna-amount',
    stage: 'a20',
    level: 2,
    kind: 'calc',
    make(rng) {
      const base = rng.pick([2, 4, 6, 8]); // 精子の DNA 量（相対値）
      const ask = rng.pick(['G1', 'G2', 'M1end']);
      const ans = { G1: base * 2, G2: base * 4, M1end: base * 2 }[ask];
      const name = { G1: '一次精母細胞（DNA 複製前の G1 期）', G2: '一次精母細胞（DNA 複製後の G2 期）', M1end: '二次精母細胞（第一分裂のあと）' }[ask];
      const d = distinctNumbers(ans, [base, base * 2, base * 4, base * 8, base / 2], '', 0);
      return {
        text: `ある動物の精子の核の DNA 量を ${base}（相対値）とする。${name}の核の DNA 量はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `精子の DNA 量（${base}）は G1 期の体細胞の半分なので、G1 期は ${base * 2}、複製後の G2 期は ${base * 4}、第一分裂のあとの二次精母細胞は ${base * 2}、第二分裂のあとの精細胞・精子は ${base} となる。したがって答えは ${ans} で、減数分裂では DNA の複製は1回だけなのに分裂が2回続くから、DNA 量が半分になる。`,
      };
    },
  },
  {
    id: 'a20-bivalent',
    stage: 'a20',
    level: 1,
    kind: 'calc',
    make(rng) {
      const n = rng.pick([4, 6, 8, 12, 23]);
      const ask = rng.pick(['bivalent', 'gamete']);
      const ans = n;
      const d = distinctNumbers(ans, [2 * n, 4 * n, n / 2, n + 1], ask === 'bivalent' ? ' 個' : ' 本', 0);
      return {
        text: ask === 'bivalent'
          ? `体細胞の染色体数が ${2 * n} 本の生物で、減数分裂の第一分裂前期に見られる二価染色体はいくつか。`
          : `体細胞の染色体数が ${2 * n} 本の生物で、減数分裂によってできた配偶子の染色体数は何本か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'bivalent'
          ? `相同染色体どうしが対合して1つの二価染色体になるので、${2 * n} ÷ 2 ＝ ${n} 個である。二価染色体の数は相同染色体の組の数（n）に等しいからである。`
          : `減数分裂では相同染色体が別々の細胞に分かれるので、配偶子の染色体数は ${2 * n} ÷ 2 ＝ ${n} 本（n）である。受精によって ${2 * n} 本（2n）にもどるから、世代をこえて染色体数が保たれる。`,
      };
    },
  },
  {
    id: 'a20-crossover',
    stage: 'a20',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '減数分裂で、配偶子の遺伝子の組合せを多様にするしくみとして正しいものはどれか。',
        correct: '第一分裂で相同染色体が独立に分配されることと、相同染色体の間で乗換えが起こること',
        wrong: ['第二分裂の前に DNA がもう一度複製されること', '第一分裂で染色分体が分かれること', '体細胞分裂と同じように、もとと同じ染色体の組がつくられること'],
        explanation: '第一分裂では相同染色体の組ごとに、どちらがどの細胞に入るかが独立に決まる。さらに第一分裂前期に乗換えが起こって遺伝子の組合せが変わるので、配偶子の遺伝子の組合せは非常に多様になる。',
      };
    },
  },
  {
    id: 'a20-compare',
    stage: 'a20',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '体細胞分裂と減数分裂の違いとして正しいものはどれか。',
        correct: '減数分裂では2回の分裂が続いて起こり、娘細胞の染色体数はもとの半分になる',
        wrong: ['体細胞分裂では、娘細胞の染色体数はもとの半分になる', '減数分裂では、分裂のたびに DNA が複製される', '体細胞分裂でも、二価染色体ができて乗換えが起こる'],
        explanation: '体細胞分裂は1回の分裂で、もとと同じ染色体数（2n）の娘細胞が2個できる。減数分裂は DNA の複製のあとに2回の分裂が続くので、染色体数が半分（n）の娘細胞が4個できる。',
      };
    },
  },
  {
    id: 'a20-human',
    stage: 'a20',
    level: 3,
    kind: 'calc',
    make(rng) {
      const ask = rng.pick(['gamete', 'zygote']);
      const g = gameteTypes(23);
      const ans = ask === 'gamete' ? g : g * g;
      const fmtBig = (x) => `約 ${fmt(x / Math.pow(10, Math.floor(Math.log10(x))), 1)} × 10^${Math.floor(Math.log10(x))}`;
      const correct = `${fmtBig(ans)} 通り`;
      const wrong = [fmtBig(g * 2), fmtBig(46), fmtBig(g * g * 2), fmtBig(g), fmtBig(g * g), fmtBig(Math.pow(2, 46) * 2)].map((x) => `${x} 通り`);
      return {
        text: ask === 'gamete'
          ? 'ヒトの体細胞の染色体数は 2n ＝ 46 である。乗換えを考えないとき、1人がつくる配偶子の染色体の組合せはおよそ何通りか（2¹⁰ ≒ 1000 として考えてよい）。'
          : 'ヒトの体細胞の染色体数は 2n ＝ 46 である。乗換えを考えないとき、同じ両親から生まれる子の染色体の組合せはおよそ何通りか（2¹⁰ ≒ 1000 として考えてよい）。',
        correct,
        wrong,
        explanation: ask === 'gamete'
          ? `相同染色体は23組なので、2^23 ＝ ${g.toLocaleString('ja-JP')}、つまり ${correct} である。各組で2通りずつの選び方があるので、23組分をかけ合わせればよいからである。`
          : `1人の配偶子は 2^23 ≒ 8.4 × 10^6 通りで、両親の配偶子が組み合わさるので 2^23 × 2^23 ＝ 2^46、つまり ${correct} である。乗換えも考えると組合せはさらに多くなるので、同じ両親からでも遺伝的に同じ子はほぼ生まれない。`,
      };
    },
  },
];
