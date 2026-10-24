// A5 光合成の限定要因 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers, assignmentText } from './common.js';
import { rate, limitingFactor, FACTORS, T_OPT } from '../models/limiting.js';
import { sample } from '../lib/series.js';

const FNAME = { light: '光の強さ', co2: 'CO₂濃度', temp: '温度' };

export const A5 = [
  {
    id: 'a5-define',
    stage: 'a5',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '光合成速度に影響する環境要因のうち、最も不足していて光合成速度を決めている要因を何というか。',
        correct: '限定要因',
        wrong: ['光飽和点', '補償点', '環境収容力', '最適温度'],
        explanation: 'これを限定要因という。なお、光合成速度は光の強さ・CO₂濃度・温度のうち最も不足している要因によっておさえられるので、それ以外の要因を増やしても速度はほとんど変わらない。',
      };
    },
  },
  {
    id: 'a5-two-points',
    stage: 'a5',
    level: 2,
    kind: 'graph',
    make(rng) {
      const T = 25;
      const lo = 0.02;
      const hi = rng.pick([0.08, 0.12]);
      const xA = rng.pick([3, 4, 5]);
      const xB = rng.pick([35, 40, 45]);
      return {
        text: `図は、温度 ${T}℃ で、CO₂濃度を ${lo}% と ${hi}% にして光の強さと光合成速度（光合成速度は呼吸速度を差し引かない値・相対値）の関係を調べた結果である。点ア（CO₂ ${lo}%、弱い光）と点イ（CO₂ ${lo}%、強い光）の限定要因の組合せとして正しいものはどれか。`,
        chart: {
          x: { min: 0, max: 50, label: '光の強さ（キロルクス）', step: 10 },
          y: { min: 0, max: 140, label: '光合成速度（相対値）', step: 20 },
          series: [
            { points: sample((x) => rate(x, hi, T), 0, 50, 200), color: 'c1', width: 3, label: `CO₂ ${hi}%` },
            { points: sample((x) => rate(x, lo, T), 0, 50, 200), color: 'c2', dash: 'dash', width: 3, label: `CO₂ ${lo}%` },
          ],
          markers: [
            { x: xA, y: rate(xA, lo, T), color: 'fg', label: KATA[0] },
            { x: xB, y: rate(xB, lo, T), color: 'fg', shape: 'square', label: KATA[1] },
          ],
          alt: 'CO₂濃度の異なる2本の光―光合成曲線',
        },
        correct: assignmentText(['ア', 'イ'], ['光の強さ', 'CO₂濃度']),
        wrong: [assignmentText(['ア', 'イ'], ['CO₂濃度', '光の強さ']), assignmentText(['ア', 'イ'], ['光の強さ', '光の強さ']), assignmentText(['ア', 'イ'], ['CO₂濃度', 'CO₂濃度']), assignmentText(['ア', 'イ'], ['温度', 'CO₂濃度'])],
        explanation: 'アでは2本の曲線が重なっていて、CO₂濃度を高くしても速度が変わらず、光を強くすると速度が上がるので、限定要因は光の強さである。イでは光を強くしても速度が増えないが、CO₂濃度の高い曲線のほうが速度が大きいから、限定要因はCO₂濃度である。',
      };
    },
  },
  {
    id: 'a5-what-to-raise',
    stage: 'a5',
    level: 2,
    kind: 'graph',
    make(rng) {
      const case_ = rng.pick(['co2', 'temp']);
      const c = case_ === 'co2' ? 0.03 : 0.12;
      const T = case_ === 'co2' ? 30 : rng.pick([12, 15]);
      const I = 40;
      if (limitingFactor(I, c, T).factor !== case_) throw new Error('a5-what-to-raise: 想定と違う限定要因');
      return {
        text: `図の曲線は、CO₂濃度 ${c}%、温度 ${T}℃ で光の強さを変えたときの光合成速度（光合成速度は呼吸速度を差し引かない値・相対値）である。この植物の最適温度は約${T_OPT}℃とする。光の強さ ${I} キロルクス（●）で光合成速度をさらに大きくするには、どの条件を変えるのが最も効果的か。`,
        chart: {
          x: { min: 0, max: 50, label: '光の強さ（キロルクス）', step: 10 },
          y: { min: 0, max: 160, label: '光合成速度（相対値）', step: 20 },
          series: [{ points: sample((x) => rate(x, c, T), 0, 50, 200), color: 'c1', width: 3 }],
          markers: [{ x: I, y: rate(I, c, T), color: 'c2' }],
          alt: '光の強さと光合成速度の曲線',
        },
        correct: case_ === 'co2' ? 'CO₂濃度を高くする' : `温度をこの植物の最適温度（約${T_OPT}℃）に近づける`,
        wrong: ['光をさらに強くする', case_ === 'co2' ? `温度を ${T + 10}℃ に上げる` : 'CO₂濃度をさらに高くする', '光を弱くする', case_ === 'co2' ? 'CO₂濃度を低くする' : '温度を下げる'],
        ordered: true,
        explanation: case_ === 'co2'
          ? `●では光を強くしても速度が増えない（光飽和）ので、光の強さは限定要因ではない。温度はこの植物の最適温度に近い ${T}℃ なので、CO₂濃度が限定要因であり、CO₂濃度を高くすると速度が上がる。`
          : `●では光を強くしても速度が増えず、CO₂濃度も ${c}% と十分に高い。温度が ${T}℃ と低く、カルビン回路の酵素反応がおそいことが限定要因になっているから、温度を最適温度に近づけると速度が上がる。`,
      };
    },
  },
  {
    id: 'a5-low-light-temp',
    stage: 'a5',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '弱い光のもとでは、温度を10℃上げても光合成速度はほとんど変わらないが、強い光のもとでは大きく増加した。この理由として最も適当なものはどれか。',
        correct: '弱い光では光の強さが限定要因になっていて、温度の影響を受けやすい酵素反応の速さは光合成速度を決めていないから',
        wrong: [
          '弱い光では、温度が上がると酵素が失活するから',
          '強い光では、光の強さが限定要因になっているから',
          '温度は光合成速度にまったく影響しないから',
        ],
        explanation: '弱い光では、光エネルギーを使う反応でつくられる ATP や NADPH の量が光合成速度を決めている（光の強さが限定要因）。温度は主にカルビン回路の酵素反応の速さに影響するので、光が十分に強く、酵素反応が限定要因になったときにはじめて温度の効果が現れるからである。',
      };
    },
  },
  {
    id: 'a5-proportional',
    stage: 'a5',
    level: 2,
    kind: 'calc',
    make(rng) {
      const I1 = rng.pick([2, 4, 5]);
      const k = rng.pick([3, 4, 5, 6]);
      const plateau = rng.pick([40, 50, 60, 80]);
      const I2 = rng.pick([6, 8, 10, 15, 20, 25]);
      const ans = Math.min(k * I2, plateau);
      if (k * I1 >= plateau) return this.make(rng);
      const d = distinctNumbers(ans, [k * I2, plateau, k * I1, k * I2 + plateau, plateau / 2, k * I2 / 2, k * I2 * 2, plateau * 2, k * (I2 - I1), plateau + k * I1], '', 0);
      return {
        text: `ある植物で、CO₂濃度と温度を一定にして光合成速度（相対値）を調べた（呼吸の影響は考えないものとする）。光が弱い範囲では光合成速度は光の強さに比例し、光の強さ ${I1} キロルクスのとき ${k * I1} であった。また、この条件の光合成速度の最大値は ${plateau} であった。光の強さ ${I2} キロルクスのときの光合成速度はいくらと考えられるか（比例する範囲をこえると、すぐに最大値で一定になるものとする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: k * I2 > plateau
          ? `比例する範囲なら ${I2} キロルクスで ${k} × ${I2} ＝ ${k * I2} になるが、これは最大値 ${plateau} より大きいので、速度は最大値の ${plateau} でおさえられる。光が強くなると、光の強さではなくCO₂濃度や温度が限定要因になり、それ以上は速度が増えないからである。`
          : `${k * I2} は最大値 ${plateau} より小さいので、${I2} キロルクスはまだ光の強さが限定要因の範囲であり、速度は ${k} × ${I2} ＝ ${k * I2} である。この範囲では光が強いほど光合成に使えるエネルギーが増えるので、速度は光の強さに比例するからである。`,
      };
    },
  },
  {
    id: 'a5-table',
    stage: 'a5',
    level: 3,
    kind: 'calc',
    make(rng) {
      // 2×2 の条件（光の強さ 弱・強 × CO₂濃度 低・高）。限定要因の考え方で値を決める
      const k = rng.pick([4, 5, 6]);
      const weak = rng.pick([3, 4, 5]);
      const strong = rng.pick([30, 40]);
      const cLow = rng.pick([40, 50, 60]);
      const cHigh = cLow * 2;
      const v = (I, cap) => Math.min(k * I, cap);
      const vals = { wl: v(weak, cLow), wh: v(weak, cHigh), sl: v(strong, cLow), sh: v(strong, cHigh) };
      const ask = rng.pick(['sh-sl', 'sh-wh']);
      const ans = ask === 'sh-sl' ? vals.sh / vals.sl : vals.sh / vals.wh;
      const d = distinctNumbers(ans, [vals.wh / vals.wl, vals.sl / vals.wl, cHigh / cLow, strong / weak, ans * 2, ans / 2, 1], ' 倍', 2);
      return {
        text: `ある植物の光合成速度（呼吸速度を差し引かない値・相対値）を、光の強さ（${weak} キロルクス・${strong} キロルクス）とCO₂濃度（低・高）を組み合わせて測定したところ、弱光・低CO₂ ${vals.wl}、弱光・高CO₂ ${vals.wh}、強光・低CO₂ ${vals.sl}、強光・高CO₂ ${vals.sh} であった。${ask === 'sh-sl' ? '強光のもとでCO₂濃度を低から高にすると、光合成速度は何倍になったか' : '高CO₂のもとで光を弱光から強光にすると、光合成速度は何倍になったか'}。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'sh-sl'
          ? `${vals.sh} ÷ ${vals.sl} ＝ ${fmt(ans, 2)}倍である。弱光ではCO₂濃度を変えても ${vals.wl} のまま変わらない（光の強さが限定要因）が、強光ではCO₂濃度が限定要因になっているから、CO₂濃度を高くすると速度が上がる。`
          : `${vals.sh} ÷ ${vals.wh} ＝ ${fmt(ans, 2)}倍である。弱光では光の強さが限定要因なので、高CO₂でも速度は ${vals.wh} にとどまり、光を強くすると大きく上がるからである。`,
      };
    },
  },
  {
    id: 'a5-temp-curve',
    stage: 'a5',
    level: 2,
    kind: 'graph',
    make(rng) {
      const c = rng.pick([0.08, 0.12]);
      return {
        text: '図は、強い光のもとで温度を変えて光合成速度（光合成速度は呼吸速度を差し引かない値・相対値）を測定した結果である。最適温度より高い温度で光合成速度が急に低下する理由として最も適当なものはどれか。',
        chart: {
          x: { min: 0, max: 45, label: '温度（℃）', step: 5 },
          y: { min: 0, max: 160, label: '光合成速度（相対値）', step: 20 },
          series: [{ points: sample((t) => rate(40, c, t), 0, 45, 200), color: 'c1', width: 3 }],
          alt: '温度と光合成速度の山形のグラフ',
        },
        correct: '光合成にはたらく酵素（タンパク質）が高温で変性し、失活するから',
        wrong: ['高温では光が弱くなるから', '高温ではCO₂濃度が限定要因になるから', '高温では葉緑体のクロロフィルが光を吸収しなくなるから'],
        explanation: '光合成の反応、特にカルビン回路には多くの酵素がはたらいている。酵素はタンパク質でできているので、最適温度をこえると立体構造が変化して（変性）はたらきを失い、光合成速度が急に低下するからである。',
      };
    },
  },
  {
    id: 'a5-greenhouse',
    stage: 'a5',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '晴れた日の日中、閉め切った温室の中でCO₂を発生させる装置（CO₂の施用）を使うと、作物の光合成速度が大きくなる。この理由として最も適当なものはどれか。',
        correct: '光が十分に強いとき、CO₂濃度が限定要因になりやすいから',
        wrong: ['光が弱いとき、CO₂濃度が限定要因になりやすいから', 'CO₂濃度を高くすると、光の強さが強くなるから', 'CO₂は光合成速度ではなく呼吸速度を小さくするから'],
        explanation: '晴れた日の日中は光が強いので、光の強さは限定要因になりにくい。閉め切った温室では光合成でCO₂が使われて濃度が下がり、CO₂濃度が限定要因になりやすいから、CO₂を補うと光合成速度が上がる。',
      };
    },
  },
  {
    id: 'a5-model-read',
    stage: 'a5',
    level: 3,
    kind: 'graph',
    make(rng) {
      const cases = [
        { I: rng.pick([4, 6, 8]), c: rng.pick([0.04, 0.08, 0.12]), T: rng.pick([20, 25, 30]) },
        { I: rng.pick([35, 40, 45]), c: rng.pick([0.02, 0.03, 0.04]), T: rng.pick([25, 30]) },
        { I: rng.pick([40, 45]), c: rng.pick([0.1, 0.12, 0.15]), T: rng.pick([10, 12, 40]) },
      ];
      const cs = rng.pick(cases);
      const lim = limitingFactor(cs.I, cs.c, cs.T);
      if (lim.close) return this.make(rng);
      const k = lim.caps;
      const names = ['light', 'co2', 'temp'];
      return {
        text: `図は、光の強さ ${cs.I} キロルクス、CO₂濃度 ${cs.c}%、温度 ${cs.T}℃ のとき、3つの要因それぞれについて「その要因だけで決まる光合成速度の上限」を棒で表したものである（ほかの2つの要因は十分にあるとしたときの値。光合成速度は呼吸速度を差し引かない値）。この植物の最適温度は約${T_OPT}℃とする。この条件で光合成速度を上げるために最も効果的な操作はどれか。`,
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0, max: 200, label: '上限（相対値）', step: 40 },
          bars: { categories: names.map((n) => FACTORS[n].name), groups: [{ values: names.map((n) => Math.min(k[n], 200)), color: 'c1', label: '上限' }] },
          alt: '3つの要因の上限の棒グラフ',
        },
        correct: { light: '光を強くする', co2: 'CO₂濃度を高くする', temp: `温度をこの植物の最適温度（約${T_OPT}℃）に近づける` }[lim.factor],
        wrong: ['光を強くする', 'CO₂濃度を高くする', `温度をこの植物の最適温度（約${T_OPT}℃）に近づける`, '3つの要因のうち、上限が最も大きい要因をさらに増やす'],
        explanation: `上限が最も小さいのは${FNAME[lim.factor]}（約${fmt(k[lim.factor], 0)}）なので、これが限定要因である。光合成速度は最も不足している要因でおさえられるから、${FNAME[lim.factor]}を改善しないかぎり、ほかの要因を増やしても速度はほとんど上がらない。`,
      };
    },
  },
];
