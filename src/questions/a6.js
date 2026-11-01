// A6 集団遺伝 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { genotypeFreq, alleleFreqFromCounts, driftLines } from '../models/popgen.js';

export const A6 = [
  {
    id: 'a6-genotype',
    stage: 'a6',
    level: 1,
    kind: 'calc',
    make(rng) {
      const p = rng.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
      const q = Number((1 - p).toFixed(2));
      const ask = rng.pick(['AA', 'Aa', 'aa']);
      const g = genotypeFreq(p);
      const ans = g[ask];
      const d = distinctNumbers(ans, [p * q, ask === 'Aa' ? p * p : 2 * p * q, ask === 'aa' ? q : p, ask === 'aa' ? p * p : q * q, p, q, 2 * ans], '', 2);
      const formula = { AA: 'p²', Aa: '2pq', aa: 'q²' }[ask];
      return {
        text: `ハーディー・ワインベルグの法則が成り立つ集団で、対立遺伝子 A の遺伝子頻度が ${p}、a の遺伝子頻度が ${q} である。この集団で遺伝子型 ${ask} の個体の頻度はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `遺伝子型 ${ask} の頻度は ${formula} ＝ ${ask === 'AA' ? `${p}²` : ask === 'aa' ? `${q}²` : `2 × ${p} × ${q}`} ＝ ${fmt(ans, 2)} である。自由交配では、A をもつ配偶子と a をもつ配偶子がそれぞれの遺伝子頻度の割合で無作為に受精するから、遺伝子型頻度は (pA ＋ qa)² を展開した p²AA ＋ 2pqAa ＋ q²aa になる。`,
      };
    },
  },
  {
    id: 'a6-from-recessive',
    stage: 'a6',
    level: 2,
    kind: 'calc',
    make(rng) {
      const q = rng.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
      const aa = Number((q * q).toFixed(4));
      const ask = rng.pick(['p', 'q']);
      const p = Number((1 - q).toFixed(2));
      const ans = ask === 'q' ? q : p;
      const d = distinctNumbers(ans, [aa, 1 - aa, ask === 'q' ? p : q, aa / 2, Math.sqrt(1 - aa), ans / 2], '', 2);
      return {
        text: `ある植物の集団では、潜性形質 [a] を示す個体（遺伝子型 aa）が全体の ${fmt(aa * 100, 2)}% を占めていた。この集団でハーディー・ワインベルグの法則が成り立つとすると、対立遺伝子 ${ask === 'q' ? 'a' : 'A'} の遺伝子頻度はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: false,
        explanation: `aa の頻度 q² ＝ ${aa} だから、q ＝ √${aa} ＝ ${q}${ask === 'p' ? `、p ＝ 1 − ${q} ＝ ${p}` : ''} となる。顕性形質の個体には AA と Aa が混ざっていて見分けられないので、遺伝子型がわかる潜性ホモ接合体 aa の頻度から計算するのである。`,
      };
    },
  },
  {
    id: 'a6-carrier',
    stage: 'a6',
    level: 3,
    kind: 'calc',
    make(rng) {
      const n = rng.pick([10, 20, 50, 100]);
      const q = 1 / n;
      const p = 1 - q;
      const ans = 2 * p * q;
      const d = distinctNumbers(ans * 100, [q * q * 100, q * 100, 2 * q * 100 * 2, p * p * 100, (1 - q * q) * 100, ans * 50], ' %', 2);
      return {
        text: `ある潜性の遺伝形質は、${(n * n).toLocaleString('ja-JP')} 人に 1 人の割合で現れる。ハーディー・ワインベルグの法則が成り立つとすると、この形質の遺伝子をヘテロ接合でもつ人（Aa）の割合はおよそ何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `q² ＝ 1/${(n * n).toLocaleString('ja-JP')} より q ＝ 1/${n} ＝ ${fmt(q, 3)}、p ＝ ${fmt(p, 3)} なので、Aa の割合は 2pq ＝ 2 × ${fmt(p, 3)} × ${fmt(q, 3)} ≒ ${fmt(ans * 100, 2)}% となる。形質が現れる人（aa）よりずっと多いのは、潜性の遺伝子の多くが表現型に現れないヘテロ接合体の中にあるからである。`,
      };
    },
  },
  {
    id: 'a6-counts',
    stage: 'a6',
    level: 2,
    kind: 'calc',
    make(rng) {
      const N = rng.pick([100, 200, 400, 500]);
      const fAA = rng.pick([0.2, 0.3, 0.36, 0.4, 0.49, 0.5]);
      const fAa = rng.pick([0.2, 0.3, 0.4, 0.42]);
      if (fAA + fAa >= 1) return this.make(rng);
      const nAA = Math.round(N * fAA);
      const nAa = Math.round(N * fAa);
      const naa = N - nAA - nAa;
      const p = alleleFreqFromCounts(nAA, nAa, naa);
      const d = distinctNumbers(p, [(nAA + nAa) / N, nAA / N, (nAA + nAa) / (2 * N), (2 * nAA + nAa) / N / 4, 1 - p, (2 * naa + nAa) / (2 * N) + 0.1], '', 3);
      return {
        text: `ある集団 ${N} 個体の遺伝子型を調べたところ、AA が ${nAA} 個体、Aa が ${nAa} 個体、aa が ${naa} 個体であった。この集団の対立遺伝子 A の遺伝子頻度はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${N} 個体がもつ遺伝子は全部で ${2 * N} 個で、そのうち A は AA から ${2 * nAA} 個、Aa から ${nAa} 個なので、${2 * nAA + nAa} ÷ ${2 * N} ＝ ${fmt(p, 3)} となる。1個体は対立遺伝子を2個ずつもつから、個体数ではなく遺伝子の数で割合を求めなければならない。`,
      };
    },
  },
  {
    id: 'a6-next-gen',
    stage: 'a6',
    level: 3,
    kind: 'calc',
    make(rng) {
      const fAA = rng.pick([0.5, 0.6, 0.4, 0.3]);
      const fAa = rng.pick([0.2, 0.4]);
      const faa = Number((1 - fAA - fAa).toFixed(2));
      if (faa <= 0) return this.make(rng);
      const q = Number((faa + fAa / 2).toFixed(2));
      const ans = q * q;
      const d = distinctNumbers(ans, [faa, q, faa * faa, (faa + fAa) * (faa + fAa), 2 * q * (1 - q), fAa / 4 + faa], '', 4);
      return {
        text: `ある集団の遺伝子型頻度は AA ${fAA}、Aa ${fAa}、aa ${faa} であった。この集団で自由交配が行われ、ハーディー・ワインベルグの法則が成り立つ条件がそろっているとき、次の世代の aa の頻度はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `a の遺伝子頻度は q ＝ ${faa} ＋ ${fAa} ÷ 2 ＝ ${q} で、次の世代の aa の頻度は q² ＝ ${fmt(ans, 4)} となる。いまの集団の遺伝子型頻度がつり合っていなくても、自由交配をすると配偶子の遺伝子頻度だけで次の世代の遺伝子型頻度が決まるからである。`,
      };
    },
  },
  {
    id: 'a6-conditions',
    stage: 'a6',
    level: 1,
    kind: 'term',
    make(rng) {
      const wrong = rng.pick([
        '特定の遺伝子型の個体が生存や繁殖に有利である',
        '集団の個体数が少ない',
        '他の集団との間で個体の移入や移出がある',
        '突然変異がひんぱんに起こる',
      ]);
      return {
        text: 'ハーディー・ワインベルグの法則が成り立つための条件として誤っているものはどれか。',
        correct: wrong,
        wrong: ['集団が十分に大きい', '交配が自由に（無作為に）行われる', '突然変異が起こらない', '自然選択がはたらかない', '他の集団との間で個体の移入や移出がない'],
        explanation: `「${wrong}」は条件にあてはまらない。法則が成り立つには、集団が十分に大きく、自由交配で、突然変異・自然選択・移入や移出がないことが必要であり、どれかが欠けると遺伝子頻度が変化する（進化が起こる）からである。`,
      };
    },
  },
  {
    id: 'a6-drift-graph',
    stage: 'a6',
    level: 2,
    kind: 'graph',
    make(rng) {
      let small = driftLines(10, 0.5, 60, 4, rng);
      // 0 か 1 になった集団が少なくとも1つある結果を使う（正答の文と図を一致させる）
      while (!small.some((r) => r[r.length - 1] === 0 || r[r.length - 1] === 1)) small = driftLines(10, 0.5, 60, 4, rng);
      const large = driftLines(5000, 0.5, 60, 4, rng);
      const smallIsA = rng.chance(0.5);
      const lab = smallIsA ? { small: KATA[0], large: KATA[1] } : { small: KATA[1], large: KATA[0] };
      // アは実線、イは破線で描く
      const style = (isA) => (isA ? { color: 'c1', dash: 'solid' } : { color: 'c2', dash: 'dash' });
      const mk = (runs, isA) => runs.map((r) => ({ points: r.map((v, g) => [g, v]), ...style(isA), width: 2 }));
      return {
        text: '図は、個体数 10 の集団と個体数 5000 の集団について、対立遺伝子 A の遺伝子頻度の変化をそれぞれ4回ずつシミュレーションした結果で、一方をア（実線）、もう一方をイ（破線）で示した（自然選択・突然変異・移入や移出はない）。個体数 10 の集団の結果はどちらか。理由とともに選べ。',
        chart: {
          x: { min: 0, max: 60, label: '世代', step: 10 },
          y: { min: 0, max: 1, label: 'A の遺伝子頻度', step: 0.2, digits: 1 },
          series: [...mk(smallIsA ? small : large, true), ...mk(smallIsA ? large : small, false)],
          alt: '遺伝子頻度の変化（ア：実線、イ：破線）',
        },
        correct: `${lab.small}：遺伝子頻度が大きく変動し、0や1になる集団があるから`,
        wrong: [
          `${lab.large}：遺伝子頻度が大きく変動し、0や1になる集団があるから`,
          `${lab.large}：遺伝子頻度がほとんど変化しないから`,
          `${lab.small}：遺伝子頻度がほとんど変化しないから`,
          `${lab.large}：自然選択によって遺伝子頻度が一定に保たれるから`,
        ],
        explanation: `個体数 10 の集団は${lab.small}である。集団が小さいと、どの遺伝子が次の世代に伝わるかの偶然のかたよりの影響が大きいので、遺伝子頻度が大きく変動し、消失（0）や固定（1）が起こりやすいからである。`,
      };
    },
  },
  {
    id: 'a6-drift-term',
    stage: 'a6',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['drift', 'bottleneck', 'founder']);
      const Q = {
        drift: { text: '自然選択とは関係なく、偶然によって集団の遺伝子頻度が変化することを何というか。', correct: '遺伝的浮動', explanation: 'これは遺伝的浮動である。なお、どの配偶子が受精して次の世代に遺伝子を伝えるかには偶然が関わるので、有利・不利に関係なく遺伝子頻度が変化し、その影響は小さな集団ほど大きい。' },
        bottleneck: { text: '病気や災害などで集団の個体数が急激に減少し、遺伝子頻度がもとの集団と大きく変わってしまうことを何というか。', correct: 'びん首効果', explanation: 'これはびん首効果で、遺伝的浮動の影響が大きく現れる例である。個体数が急に減ると、生き残った少数の個体がもつ遺伝子だけが次の世代に伝わるので、偶然によって遺伝子頻度が大きく変わり、遺伝的な多様性も小さくなる。' },
        founder: { text: 'もとの集団から少数の個体が離れて新しい集団をつくったとき、新しい集団の遺伝子頻度がもとの集団と異なるものになることを何というか。', correct: '創始者効果', explanation: 'これは創始者効果で、遺伝的浮動の影響が大きく現れる例である。新しい集団の遺伝子頻度は、移り住んだ少数の個体が偶然もっていた遺伝子で決まるので、もとの集団と異なりやすい。' },
      }[which];
      // びん首効果・創始者効果は遺伝的浮動の一種なので、それらを問うときは「遺伝的浮動」を誤答に入れない。
      // 遺伝的浮動を問うときは、まぎらわしい「中立進化」を誤答に入れない。
      const wrong = which === 'drift' ? ['びん首効果', '創始者効果', '自然選択', '隔離', '共進化'] : ['びん首効果', '創始者効果', '自然選択', '隔離', '共進化', '適応放散'];
      return { text: Q.text, correct: Q.correct, wrong, explanation: Q.explanation };
    },
  },
  {
    id: 'a6-dominant-phenotype',
    stage: 'a6',
    level: 2,
    kind: 'calc',
    make(rng) {
      const q = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
      const p = Number((1 - q).toFixed(2));
      const ans = 1 - q * q;
      const d = distinctNumbers(ans * 100, [p * 100, p * p * 100, q * q * 100, 2 * p * q * 100, q * 100, (1 - p * p) * 100, (ans * 100) / 2, (p * p + q * q) * 100], ' %', 0);
      return {
        text: `ハーディー・ワインベルグの法則が成り立つ集団で、顕性の対立遺伝子 A の遺伝子頻度が ${p}、潜性の対立遺伝子 a の遺伝子頻度が ${q} である。顕性形質 [A] を示す個体は全体の何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `顕性形質 [A] を示すのは AA と Aa の個体なので、p² ＋ 2pq ＝ 1 − q² ＝ 1 − ${fmt(q * q, 2)} ＝ ${fmt(ans, 2)}、つまり ${fmt(ans * 100, 0)}% である。A が a に対して顕性なので、Aa の個体も [A] になるからである。`,
      };
    },
  },
];
