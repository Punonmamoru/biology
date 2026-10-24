// B1 細胞周期とDNA量 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { PHASES } from '../models/cellcycle.js';

const NAME = { G1: 'G1期', S: 'S期', G2: 'G2期', M: 'M期' };
const FULL = { G1: 'G1期（DNA合成準備期）', S: 'S期（DNA合成期）', G2: 'G2期（分裂準備期）', M: 'M期（分裂期）' };
const WHY = {
  G1: 'G1期はDNA合成の準備をする時期で、DNA量は複製前の2のままだから、DNA量が2で一定の区間になる。',
  S: 'S期にはDNAが複製されるから、DNA量が2から4へしだいに増える区間になる。',
  G2: 'G2期は複製が終わって分裂の準備をする時期だから、DNA量は4で一定の区間になる。',
  M: 'M期の終わりに細胞質分裂が起こってDNAが2つの細胞に分けられるから、DNA量が4から2へ急に減る直前の区間になる。',
};

// 指定した時期から始まる1周期分のDNA量の点列と区間
function cycleChart(len, startIdx, labels) {
  let x = 0;
  const pts = [];
  const regions = [];
  for (let i = 0; i < 4; i++) {
    const ph = PHASES[(startIdx + i) % 4];
    const x1 = x + len[ph];
    const v0 = ph === 'G1' ? 2 : ph === 'S' ? 2 : 4;
    const v1 = ph === 'G1' ? 2 : 4;
    pts.push([x, v0], [x1, v1]);
    if (ph === 'M') pts.push([x1, 2]);
    regions.push({ x0: x, x1, label: labels ? labels[i] : null, fill: i % 2 ? 'region-2' : 'region', phase: ph });
    x = x1;
  }
  return { pts, regions, T: x };
}

function randomLengths(rng) {
  return { G1: rng.int(4, 10), S: rng.int(4, 8), G2: rng.int(2, 5), M: rng.int(2, 3) };
}

export const B1 = [
  {
    id: 'b1-graph-phase',
    stage: 'b1',
    level: 1,
    kind: 'graph',
    make(rng) {
      const len = randomLengths(rng);
      const start = rng.int(0, 3);
      const { pts, regions, T } = cycleChart(len, start, KATA.slice(0, 4));
      const ask = rng.pick(PHASES);
      const idx = regions.findIndex((r) => r.phase === ask);
      return {
        text: `図は、ある細胞の細胞周期における細胞1個あたりのDNA量（相対値）の変化を表している。${FULL[ask]}にあたる区間はア〜エのどれか。`,
        chart: {
          x: { min: 0, max: T, label: '時間', ticks: [] },
          y: { min: 0, max: 5, label: 'DNA量（相対値）', step: 1 },
          regions: regions.map(({ x0, x1, label, fill }) => ({ x0, x1, label, fill })),
          series: [{ points: pts, color: 'c1', width: 3 }],
          alt: 'DNA量の変化のグラフ。区間ア〜エ',
        },
        correct: KATA[idx],
        wrong: KATA.slice(0, 4),
        explanation: `${FULL[ask]}は区間${KATA[idx]}である。${WHY[ask]}`,
      };
    },
  },
  {
    id: 'b1-dna-change',
    stage: 'b1',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '細胞周期の中で、DNAが複製されて細胞1個あたりのDNA量が2倍になるのはどの時期か。',
          correct: 'S期（DNA合成期）',
          wrong: ['G1期（DNA合成準備期）', 'G2期（分裂準備期）', 'M期（分裂期）の中期', 'M期（分裂期）の後期'],
          explanation: 'DNAが複製されるのはS期である。S期の間にDNAが少しずつ合成されるから、DNA量は2から4へしだいに増える。',
        };
      }
      return {
        text: '体細胞分裂で、細胞1個あたりのDNA量が4から2に減るのはいつか。',
        correct: 'M期の終わり（細胞質分裂が起こるとき）',
        wrong: ['S期の終わり', 'G2期のはじめ', 'M期の中期（染色体が赤道面に並ぶとき）', 'G1期の終わり'],
        explanation: 'DNA量が半分に戻るのはM期の終わりである。細胞質分裂で1つの細胞が2つに分かれ、複製されたDNAが2つの細胞に等しく分配されるからである。',
      };
    },
  },
  {
    id: 'b1-calc-length',
    stage: 'b1',
    level: 2,
    kind: 'calc',
    make(rng) {
      const T = rng.pick([12, 16, 18, 20, 24, 30]);
      const N = rng.pick([100, 200, 400, 500]);
      const pctM = rng.int(4, 12);
      const pctG2 = rng.int(10, 18);
      const pctS = rng.int(25, 38);
      const counts = { M: (N * pctM) / 100, G2: (N * pctG2) / 100, S: (N * pctS) / 100 };
      counts.G1 = N - counts.M - counts.G2 - counts.S;
      const ask = rng.pick(PHASES);
      const c = counts[ask];
      const ans = (T * c) / N;
      const d = distinctNumbers(ans, [(c / N) * 100, (T * (N - c)) / N, ans * 2, ans / 2, c / T, ans + T / 10, T - ans + 1], ' 時間');
      return {
        text: `ある組織の細胞を固定・染色して観察したところ、G1期 ${counts.G1}個、S期 ${counts.S}個、G2期 ${counts.G2}個、M期 ${counts.M}個であった。この細胞の細胞周期が ${T}時間のとき、${NAME[ask]}の長さは何時間か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `各期の時間 ＝ 全周期の時間 ×（その期の細胞数 ÷ 観察した細胞の総数）で求める。${T} × ${c}/${N} ＝ ${fmt(ans, 2)}時間となる。細胞がそれぞれの時期にいる割合は、その時期にかかる時間の割合に等しいとみなせるからである。`,
      };
    },
  },
  {
    id: 'b1-calc-mcount',
    stage: 'b1',
    level: 2,
    kind: 'calc',
    make(rng) {
      const len = { G1: rng.int(6, 12), S: rng.int(5, 8), G2: rng.int(2, 5), M: rng.pick([1, 2, 3]) };
      const T = len.G1 + len.S + len.G2 + len.M;
      const k = rng.pick([10, 20, 50]);
      const N = T * k;
      const ask = rng.pick(['M', 'S', 'G2']);
      const ans = (N * len[ask]) / T;
      const d = distinctNumbers(ans, [(N * len[ask]) / 100, N / 4, N - ans, ans * 2, ans / 2, ans + k], ' 個', 1);
      return {
        text: `ある細胞の細胞周期は G1期 ${len.G1}時間、S期 ${len.S}時間、G2期 ${len.G2}時間、M期 ${len.M}時間である。この細胞が細胞周期のさまざまな時期にばらばらに分布している組織で ${N}個の細胞を観察すると、${NAME[ask]}の細胞はおよそ何個見られるか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `全周期は ${T}時間なので、${NAME[ask]}の細胞の数は ${N} × ${len[ask]}/${T} ＝ ${fmt(ans, 1)}個となる。各時期の細胞数の割合は、その時期にかかる時間の割合に比例するからである。`,
      };
    },
  },
  {
    id: 'b1-calc-total',
    stage: 'b1',
    level: 3,
    kind: 'calc',
    make(rng) {
      const cands = [];
      for (const T of [10, 12, 15, 16, 18, 20, 24, 25, 30, 40]) for (const M of [1, 1.5, 2, 3]) {
        const p = (M / T) * 100;
        if (Number.isInteger(p * 2) && p < 20) cands.push({ T, M, p });
      }
      const { T, M, p } = rng.pick(cands);
      const N = rng.pick([200, 400, 1000]);
      const m = (N * p) / 100;
      const d = distinctNumbers(T, [(M * p) / 100, T * 2, T / 2, M * 10, T + M, (M * 100) / (100 - p)], ' 時間', 2);
      return {
        text: `体細胞分裂が盛んな組織で ${N}個の細胞を観察したところ、M期の細胞が ${fmt(m, 1)}個あった。M期の長さが ${M}時間のとき、この細胞の細胞周期（1周期）は何時間か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `M期の細胞の割合は ${fmt(m, 1)}/${N} ＝ ${fmt(p / 100, 4)} である。M期の時間 ＝ 全周期 × 割合 だから、全周期 ＝ ${M} ÷ ${fmt(p / 100, 4)} ＝ ${T}時間となる。`,
      };
    },
  },
  {
    id: 'b1-dna-value',
    stage: 'b1',
    level: 2,
    kind: 'calc',
    make(rng) {
      const len = { G1: rng.int(6, 10), S: rng.pick([4, 6, 8]), G2: rng.int(2, 4), M: 2 };
      const where = rng.pick(['G1', 'S1', 'S2', 'S3', 'G2', 'M']);
      let t;
      let ans;
      if (where === 'G1') { t = rng.int(1, len.G1 - 1); ans = 2; }
      else if (where[0] === 'S') { const q = Number(where[1]); t = len.G1 + (len.S * q) / 4; ans = 2 + q / 2; }
      else if (where === 'G2') { t = len.G1 + len.S + 1; ans = 4; }
      else { t = len.G1 + len.S + len.G2 + 1; ans = 4; }
      const d = distinctNumbers(ans, [1, 2, 2.5, 3, 3.5, 4, 8], '', 1);
      return {
        text: `ある細胞の細胞周期は G1期 ${len.G1}時間、S期 ${len.S}時間、G2期 ${len.G2}時間、M期 ${len.M}時間で、S期にはDNAが一定の速さで合成される。G1期に入った直後の細胞1個あたりのDNA量を2とすると、その ${fmt(t, 1)}時間後のDNA量はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${fmt(t, 1)}時間後は${where[0] === 'S' ? 'S期' : NAME[where]}にあたる。${where[0] === 'S' ? `S期の ${where[1]}/4 が過ぎているので、DNA量は 2 ＋ 2 × ${where[1]}/4 ＝ ${fmt(ans, 1)} となる。` : where === 'G1' ? 'G1期はまだDNAが複製されていないから、DNA量は2のままである。' : 'S期でDNAの複製が終わっているから、細胞質分裂が起こるまではDNA量は4のままである。'}`,
      };
    },
  },
  {
    id: 'b1-subphase',
    stage: 'b1',
    level: 1,
    kind: 'term',
    make(rng) {
      const D = {
        前期: '核の中で染色体が凝縮し、太く短いひも状に見えるようになる',
        中期: '染色体が細胞の中央の赤道面に並ぶ',
        後期: '各染色体が縦に裂けるように分かれ、両極へ移動する',
        終期: '核膜が再び現れ、細胞質分裂が起こる',
      };
      const keys = Object.keys(D);
      const k = rng.pick(keys);
      if (rng.chance(0.5)) {
        return {
          text: `体細胞分裂のM期で、「${D[k]}」のはどの時期か。`,
          correct: k,
          wrong: keys,
          explanation: `これは${k}の特徴である。M期は染色体の様子によって前期・中期・後期・終期に分けられ、染色体を正確に2つに分けるためにこの順に進むからである。`,
        };
      }
      return {
        text: `体細胞分裂のM期の「${k}」の特徴として正しいものはどれか。`,
        correct: D[k],
        wrong: keys.map((x) => D[x]).concat(['DNAが複製され、DNA量が2倍になる']),
        explanation: `${k}には${D[k]}。M期は前期→中期→後期→終期の順に進み、染色体を2つの細胞へ等しく分けるからである。`,
      };
    },
  },
  {
    id: 'b1-interphase-majority',
    stage: 'b1',
    level: 1,
    kind: 'term',
    make(rng) {
      const tissue = rng.pick(['タマネギの根端', 'ソラマメの根端', 'ネギの根端']);
      return {
        text: `${tissue}の細胞を固定・染色して観察すると、分裂期（M期）の細胞より間期の細胞のほうがはるかに多く見られた。その理由として最も適当なものはどれか。`,
        correct: '細胞周期の中で、間期にかかる時間が分裂期よりずっと長いから',
        wrong: ['間期の細胞だけが染色液でよく染まるから', '分裂期の細胞は、固定すると間期の細胞に戻るから', '分裂期の細胞は核をもたないから', '間期の細胞は分裂期の細胞より大きく、見つけやすいから'],
        explanation: '細胞はばらばらの時期にあるので、各時期の細胞数の割合はその時期にかかる時間の割合に等しい。間期は細胞周期の大部分を占めるから、間期の細胞が多く見られる。',
      };
    },
  },
  {
    id: 'b1-phase-desc',
    stage: 'b1',
    level: 1,
    kind: 'term',
    make(rng) {
      const D = {
        G1: 'DNAの合成（複製）の準備をする時期',
        S: 'DNAが合成（複製）される時期',
        G2: 'DNAの複製が終わり、分裂の準備をする時期',
        M: '染色体が凝縮して2つの細胞に分配される時期',
      };
      const k = rng.pick(PHASES);
      return {
        text: `細胞周期のうち、「${D[k]}」はどれか。`,
        correct: FULL[k],
        wrong: PHASES.map((x) => FULL[x]),
        explanation: `「${D[k]}」は${FULL[k]}である。細胞周期は G1期 → S期 → G2期 → M期 の順に進み、DNAを複製してから分裂することで、娘細胞が同じ遺伝情報を受け継ぐからである。`,
      };
    },
  },
  {
    id: 'b1-graph-length',
    stage: 'b1',
    level: 2,
    kind: 'graph',
    make(rng) {
      const len = { G1: 2 * rng.int(3, 5), S: 2 * rng.int(2, 4), G2: 2 * rng.int(1, 2), M: 2 };
      const { pts, regions, T } = cycleChart(len, 0, null);
      const ask = rng.pick(['G1', 'S', 'G2']);
      const ans = len[ask];
      const end = { G1: len.G1, S: len.G1 + len.S, G2: len.G1 + len.S + len.G2 }[ask];
      const d = distinctNumbers(ans, [T, end, ...PHASES.map((p) => len[p]), ans * 2, ans + 1, ans - 1], ' 時間', 0);
      return {
        text: `図は、ある細胞の細胞1個あたりのDNA量の変化を表している（横軸の目盛りは2時間ごと、M期の長さは2時間）。${FULL[ask]}の長さは何時間か。`,
        chart: {
          x: { min: 0, max: T, label: '時間（時間）', step: 2 },
          y: { min: 0, max: 5, label: 'DNA量（相対値）', step: 1 },
          series: [{ points: pts, color: 'c1', width: 3 }],
          alt: 'DNA量の変化のグラフ（時間目盛りつき）',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${NAME[ask]}は${ask === 'S' ? 'DNA量が2から4へ増えている区間' : ask === 'G1' ? 'DNA量が2で一定の最初の区間' : 'DNA量が4になってから細胞質分裂で2に戻るまでの区間から、M期の2時間を除いた部分'}で、その長さは ${ans}時間である。${WHY[ask]}`,
      };
    },
  },
];
