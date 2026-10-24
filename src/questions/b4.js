// B4 光の強さと光合成 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { PLANTS, apparent, compensationPoint, saturationPoint } from '../models/photosynthesis.js';
import { sample } from '../lib/series.js';

const signed = (x) => fmt(x, 2);

export const B4 = [
  {
    id: 'b4-point-def',
    stage: 'b4',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '光補償点（補償点）の説明として正しいものはどれか。',
          correct: '光合成速度と呼吸速度が等しくなり、見かけの光合成速度が0になる光の強さ',
          wrong: ['光合成が止まる光の強さ', '光合成速度が最大になる光の強さ', '呼吸が止まる光の強さ', 'それ以上光を強くしても光合成速度が大きくならない光の強さ'],
          explanation: '補償点は光合成速度と呼吸速度がつり合う光の強さである。補償点でも光合成は行われているが、呼吸で放出するCO₂と同じ量しか吸収しないから、見かけ上CO₂の出入りがなくなる。',
        };
      }
      return {
        text: '光飽和点の説明として正しいものはどれか。',
        correct: 'それ以上光を強くしても光合成速度がほとんど大きくならない光の強さ',
        wrong: ['見かけの光合成速度が0になる光の強さ', '光合成が止まる光の強さ', '呼吸速度が最大になる光の強さ', '光合成速度と呼吸速度が等しくなる光の強さ'],
        explanation: '光飽和点は、光を強くしても光合成速度がそれ以上大きくならなくなる光の強さである。光が十分に強いときは、CO₂濃度や温度など光以外の条件が光合成速度を決める（限定要因になる）からである。',
      };
    },
  },
  {
    id: 'b4-gross-calc',
    stage: 'b4',
    level: 1,
    kind: 'calc',
    make(rng) {
      const R = rng.int(1, 6);
      const a = rng.int(2, 20);
      const d = distinctNumbers(a + R, [a - R, a, a + 2 * R, R, a * R, a + R + 1], '', 0);
      return {
        text: `ある植物に一定の強さの光を当てたとき、見かけの光合成速度（CO₂吸収速度）は ${a}、暗黒での呼吸速度（CO₂放出速度）は ${R} であった（単位は同じ）。このときの光合成速度はいくらか。ただし呼吸速度は光の有無によらず一定とする。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `光合成速度 ＝ 見かけの光合成速度 ＋ 呼吸速度 なので、${a} ＋ ${R} ＝ ${a + R} となる。見かけの光合成速度は、光合成で吸収したCO₂から呼吸で放出したCO₂を差し引いた値だからである。`,
      };
    },
  },
  {
    id: 'b4-graph-gross',
    stage: 'b4',
    level: 2,
    kind: 'graph',
    make(rng) {
      const R = rng.pick([1, 2, 3, 4]);
      const Pmax = rng.pick([8, 10, 12, 14, 16]);
      const p = { Pmax, alpha: 1, R };
      const sat = saturationPoint(p);
      const xMax = Math.ceil((sat * 1.6) / 5) * 5;
      const flat = rng.chance(0.5);
      const X = flat ? Math.round((sat + (xMax - sat) / 2) / 1) : Math.max(R + 1, Math.round(Pmax / 2));
      const ap = Math.round(apparent(p, X));
      const P = ap + R;
      const d = distinctNumbers(P, [ap, Math.abs(ap - R), R, P + R, P * 2, P + 1, Pmax + R], '', 0);
      return {
        text: `図は、ある植物の光の強さと見かけの光合成速度（CO₂吸収速度）の関係である。光の強さが ${X} のときの光合成速度（呼吸速度を差し引く前の値）はいくらか。ただし呼吸速度は光の強さによらず一定とし、図の目盛りから整数で読み取ること。`,
        chart: {
          x: { min: 0, max: xMax, label: '光の強さ', step: 5 },
          y: { min: -R - 1, max: Pmax, label: 'CO₂吸収速度', step: 1 },
          series: [{ points: sample((I) => apparent(p, I), 0, xMax, 200), color: 'c2', width: 3 }],
          markers: [{ x: X, y: apparent(p, X), color: 'c2' }],
          vlines: [{ x: X, color: 'muted', dash: 'dot', label: `${X}` }],
          alt: '見かけの光合成速度のグラフ',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `グラフから、光の強さ0のときのCO₂吸収速度は −${R} なので呼吸速度は ${R}、光の強さ ${X} での見かけの光合成速度は ${ap} である。光合成速度 ＝ 見かけの光合成速度 ＋ 呼吸速度 だから、${ap} ＋ ${R} ＝ ${P} となる。`,
      };
    },
  },
  {
    id: 'b4-which-shade',
    stage: 'b4',
    level: 2,
    kind: 'graph',
    make(rng) {
      const order = rng.shuffle(['sun', 'shade']);
      const lab = { [order[0]]: KATA[0], [order[1]]: KATA[1] };
      const styles = [{ color: 'c2', dash: 'solid' }, { color: 'c1', dash: 'dash' }];
      const ask = rng.pick(['shade', 'sun']);
      const other = ask === 'sun' ? 'shade' : 'sun';
      const correct = ask === 'shade' ? `${lab.shade}：補償点と光飽和点がともに小さいから` : `${lab.sun}：補償点と光飽和点がともに大きいから`;
      return {
        text: `図のア・イは、陽生植物と陰生植物の光の強さと見かけの光合成速度の関係を表している。${PLANTS[ask].name}はどちらか。理由とともに選べ。`,
        chart: {
          x: { min: 0, max: 60, label: '光の強さ（キロルクス）', step: 10 },
          y: { min: -6, max: 18, label: 'CO₂吸収速度（相対値）', step: 3 },
          series: order.map((k, i) => ({ points: sample((I) => apparent(PLANTS[k], I), 0, 60, 240), ...styles[i], width: 3, label: KATA[i] })),
          alt: '2種類の植物の光合成曲線ア・イ',
        },
        correct,
        wrong: [
          ask === 'sun' ? `${lab.sun}：呼吸速度が小さいから` : `${lab.shade}：呼吸速度が大きいから`,
          `${lab[other]}：補償点と光飽和点がともに${ask === 'shade' ? '小さい' : '大きい'}から`,
          `${lab[other]}：最大の光合成速度が${ask === 'shade' ? '大きい' : '小さい'}から`,
          `${lab[ask]}：光が弱いと光合成をしないから`,
        ],
        explanation: `${PLANTS[ask].name}は${lab[ask]}である。陰生植物は呼吸速度が小さく補償点・光飽和点が低いので弱い光でも成長でき、陽生植物は強い光のもとで大きな光合成速度を示すからである。`,
      };
    },
  },
  {
    id: 'b4-growth-region',
    stage: 'b4',
    level: 2,
    kind: 'graph',
    make(rng) {
      const regime = rng.pick(['none', 'shade', 'both']);
      const X = regime === 'none' ? rng.pick([0.05, 0.1]) : regime === 'shade' ? rng.pick([0.4, 0.6, 0.8, 1, 1.2]) : rng.pick([2, 2.5, 3, 3.5]);
      const ANS = { none: 'どちらもCO₂を吸収しない', shade: '陰生植物だけ', both: '陽生植物と陰生植物の両方' };
      const icS = compensationPoint(PLANTS.sun);
      const icH = compensationPoint(PLANTS.shade);
      const why = {
        none: `${X}キロルクスは両方の補償点（陰生植物 約${fmt(icH, 2)}、陽生植物 約${fmt(icS, 2)}）より弱いから、どちらも呼吸のほうが大きい`,
        shade: `${X}キロルクスは陰生植物の補償点（約${fmt(icH, 2)}）より強く、陽生植物の補償点（約${fmt(icS, 2)}）より弱いから`,
        both: `${X}キロルクスは両方の補償点より強いから`,
      };
      return {
        text: `図は陽生植物と陰生植物の、弱い光での見かけの光合成速度を表したものである。光の強さ ${X} キロルクスで見かけの光合成速度が正（CO₂を吸収）になるのはどれか。`,
        chart: {
          x: { min: 0, max: 4, label: '光の強さ（キロルクス）', step: 0.5, digits: 1 },
          y: { min: -5, max: 5, label: 'CO₂吸収速度（相対値）', step: 1 },
          series: [
            { points: sample((I) => apparent(PLANTS.sun, I), 0, 4, 200), color: 'c2', width: 3, label: '陽生植物' },
            { points: sample((I) => apparent(PLANTS.shade, I), 0, 4, 200), color: 'c1', dash: 'dash', width: 3, label: '陰生植物' },
          ],
          vlines: [{ x: X, color: 'fg', dash: 'dot', label: `${X}` }],
          alt: '陽生植物と陰生植物の弱光での光合成曲線',
        },
        correct: ANS[regime],
        wrong: [...Object.values(ANS), '陽生植物だけ'],
        explanation: `答えは「${ANS[regime]}」である。${why[regime]}。補償点より強い光のときだけ、光合成速度が呼吸速度を上回ってCO₂を吸収する。`,
      };
    },
  },
  {
    id: 'b4-succession',
    stage: 'b4',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '森林の遷移が進むと、陽樹林はやがて陰樹林に置きかわり、陰樹林が極相となることが多い。その理由として最も適当なものはどれか。',
        correct: '林床が暗くなると陽樹の芽生えは育ちにくいが、陰樹の芽生えは育つことができるから',
        wrong: ['陰樹は陽樹より成長が速く、すぐに陽樹より高くなるから', '陽樹は寿命が短く、すべての木が同時に枯れるから', '陰樹の芽生えは強い光のもとでしか育たないから'],
        explanation: '陽樹林の林床は暗く、補償点の高い陽樹の芽生えは育ちにくい。陰樹の芽生えは補償点が低く弱い光でも成長できるから、しだいに陰樹が置きかわり陰樹林が極相となる。',
      };
    },
  },
  {
    id: 'b4-comp-calc',
    stage: 'b4',
    level: 3,
    kind: 'calc',
    make(rng) {
      const k = rng.pick([0.5, 1, 1.5, 2, 2.5, 4]);
      const Ic = rng.pick([0.4, 0.5, 0.8, 1, 1.2, 1.5, 2]);
      const R = Number((k * Ic).toFixed(2));
      if (!Number.isInteger(R * 10)) return this.make(rng);
      const d = distinctNumbers(Ic, [k / R, R * k, R + k, R / k / 2, Ic * 2, Ic + 0.5, Ic * 3, Ic + 1.5], ' キロルクス', 2);
      return {
        text: `ある植物では、弱い光の範囲で光合成速度（呼吸を差し引く前）が光の強さに比例し、光の強さが1キロルクス増えるごとに光合成速度が ${k} ずつ大きくなる。呼吸速度が ${R} で一定のとき、この植物の補償点は何キロルクスか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `補償点では光合成速度と呼吸速度が等しいので、${k} × I ＝ ${R} より I ＝ ${R} ÷ ${k} ＝ ${fmt(Ic, 2)} キロルクスとなる。補償点は見かけの光合成速度が0になる光の強さだから、光合成速度が呼吸速度に追いつく点を求めればよい。`,
      };
    },
  },
  {
    id: 'b4-day-balance',
    stage: 'b4',
    level: 2,
    kind: 'calc',
    make(rng) {
      const R = rng.int(1, 4);
      const a = rng.int(R + 2, 15);
      const L = rng.pick([8, 10, 12, 14, 16]);
      const D = 24 - L;
      const ans = a * L - R * D;
      if (ans <= 0) return this.make(rng);
      const d = distinctNumbers(ans, [(a - R) * L - R * D, a * L, a * L + R * D, a * L - R * 24, a * 24 - R * D, ans + R * L, ans * 2, ans + 10], ' mg', 0);
      return {
        text: `ある植物の、明るいときの見かけの光合成速度は CO₂吸収 ${a} mg/時、暗黒での呼吸速度は CO₂放出 ${R} mg/時である。明るい時間が ${L}時間、暗黒が ${D}時間の1日で、この植物が吸収するCO₂の量は差し引き何 mg か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `明るい間の吸収量は ${a}×${L} ＝ ${a * L} mg、暗黒の間の放出量は ${R}×${D} ＝ ${R * D} mg なので、差し引き ${ans} mg となる。見かけの光合成速度にはすでに呼吸の分が差し引かれているから、明るい間の呼吸を重ねて引いてはいけない。`,
      };
    },
  },
  {
    id: 'b4-below-comp',
    stage: 'b4',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '補償点より弱い光のもとに置いた植物の状態として正しいものはどれか。',
        correct: '光合成は行っているが、呼吸速度のほうが大きいのでCO₂を放出している',
        wrong: ['光合成を行っていないので、呼吸によるCO₂の放出だけが起きている', '光合成速度と呼吸速度が等しく、CO₂の出入りがない', '光合成速度が呼吸速度より大きく、CO₂を吸収している'],
        explanation: '補償点より弱い光でも光合成は行われている。ただし光合成速度が呼吸速度より小さいので、差し引きでCO₂を放出しているからである。',
      };
    },
  },
  {
    id: 'b4-traits',
    stage: 'b4',
    level: 1,
    kind: 'term',
    make(rng) {
      const sun = rng.chance(0.5);
      const A = '補償点・光飽和点ともに陰生植物より大きく、強い光のもとで光合成速度が大きい';
      const B = '補償点・光飽和点ともに陽生植物より小さく、弱い光のもとでも成長できる';
      return {
        text: `${sun ? '陽生植物' : '陰生植物'}の特徴として最も適当なものはどれか。`,
        correct: sun ? A : B,
        wrong: [sun ? B : A, '補償点は小さく、光飽和点は大きい', '呼吸速度が0で、光が弱くても必ずCO₂を吸収する', '光の強さに関係なく、光合成速度が一定である'],
        explanation: `${sun ? '陽生植物' : '陰生植物'}は${sun ? A : B}。陰生植物は呼吸速度が小さいので補償点が低く、陽生植物は呼吸速度も最大の光合成速度も大きいからである。`,
      };
    },
  },
  {
    id: 'b4-limiting',
    stage: 'b4',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '光飽和点より強い光を当てている植物の光合成速度を、さらに大きくするための操作として最も適当なものはどれか。',
        correct: '空気中のCO₂濃度を高くする',
        wrong: ['光をさらに強くする', '暗黒にする時間を長くする', '呼吸速度を大きくする'],
        explanation: '光飽和点より強い光では、光の強さは光合成速度を決める要因ではなくなっている。このときはCO₂濃度などが限定要因になっているから、CO₂濃度を高くすると光合成速度が大きくなる。',
      };
    },
  },
];
