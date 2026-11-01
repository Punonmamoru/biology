// A18 視覚 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers, assignmentQuestion } from './common.js';
import { thresholdLog, cones, rods, retinaSize, EYE_DEPTH, BLIND } from '../models/vision.js';
import { sample } from '../lib/series.js';

export const A18 = [
  {
    id: 'a18-dark-curve',
    stage: 'a18',
    level: 2,
    kind: 'graph',
    make() {
      return {
        text: '図は、明るい所から暗い所に入ったときの、感じとれる最小の光の強さの時間変化（暗順応曲線）を表している。約8分のところで曲線が折れ曲がる理由として最も適当なものはどれか。',
        chart: {
          x: { min: 0, max: 40, label: '暗い所に入ってからの時間（分）', step: 10 },
          y: { min: -2, max: 5, label: '感じとれる最小の光の強さ（対数）', ticks: [] },
          series: [{ points: sample(thresholdLog, 0, 40, 400), color: 'c1', width: 3 }],
          alt: '暗順応曲線',
        },
        correct: 'はじめは錐体の感度の上昇によるが、その後は感度の高い桿体のはたらきに切りかわるから',
        wrong: ['はじめは桿体の感度の上昇によるが、その後は錐体のはたらきに切りかわるから', '約8分で瞳孔が完全に閉じるから', '約8分で網膜の視細胞の数が増えるから'],
        explanation: 'はじめの数分は錐体の感度が上がるが、すぐに頭打ちになる。桿体はロドプシンが暗所で再合成されるにつれて感度が上がり、約8分で錐体を上回るので、曲線が折れ曲がってさらに下がる。',
      };
    },
  },
  {
    id: 'a18-cells',
    stage: 'a18',
    level: 1,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['色の識別', '弱い光の受容', '黄斑に多い'], ['錐体', '桿体', '錐体']);
      return {
        text: '視細胞の特徴について、次の組合せとして正しいものはどれか。',
        correct: q.correct,
        wrong: [...q.wrong, '色の識別：桿体　弱い光の受容：錐体　黄斑に多い：桿体', '色の識別：錐体　弱い光の受容：桿体　黄斑に多い：桿体', '色の識別：桿体　弱い光の受容：錐体　黄斑に多い：錐体'],
        explanation: '錐体は色を識別し、明るい所ではたらき、黄斑に集中している。桿体はロドプシンを含み、弱い光でも反応するが色は区別しないので、暗い所での視覚にはたらく。',
      };
    },
  },
  {
    id: 'a18-distribution',
    stage: 'a18',
    level: 2,
    kind: 'graph',
    make(rng) {
      const coneIsA = rng.chance(0.5);
      const lab = coneIsA ? { c: KATA[0], r: KATA[1] } : { c: KATA[1], r: KATA[0] };
      return {
        text: '図のア・イは、ヒトの網膜での錐体と桿体の分布（網膜上の黄斑からの角度と密度）を表している。錐体を表すのはどちらか。理由とともに選べ。',
        chart: {
          x: { min: -60, max: 60, label: '網膜上の黄斑からの角度（°）', step: 20 },
          y: { min: 0, max: 180, label: '密度（千個/mm²）', step: 40 },
          regions: [{ x0: BLIND[0], x1: BLIND[1], fill: 'region-2', label: 'X' }],
          series: [
            { points: sample(cones, -60, 60, 960), color: 'c2', dash: coneIsA ? 'solid' : 'dash', width: 3, label: lab.c, labelAt: 4 },
            { points: sample(rods, -60, 60, 960), color: 'c1', dash: coneIsA ? 'dash' : 'solid', width: 3, label: lab.r, labelAt: -30 },
          ],
          alt: '視細胞の分布ア・イ',
        },
        correct: `${lab.c}：黄斑（0°）に集中して分布しているから`,
        wrong: [`${lab.r}：黄斑（0°）にはほとんどなく、周辺に多いから`, `${lab.r}：黄斑（0°）に集中して分布しているから`, `${lab.c}：黄斑（0°）にはほとんどなく、周辺に多いから`],
        explanation: `錐体は黄斑に集中しているので${lab.c}である。図の X の部分は、視神経が束になって眼球から出ていく盲斑で、視細胞がないから、錐体も桿体も0になっている。`,
      };
    },
  },
  {
    id: 'a18-blind-calc',
    stage: 'a18',
    level: 3,
    kind: 'calc',
    make(rng) {
      // 実際の盲斑（直径 約1.5〜1.8 mm）に近い組合せにする：紙の上の幅 ≒ 距離 × 約0.1
      const dist = rng.pick([20, 25, 30, 34, 40]);
      const width = Number((dist * rng.pick([0.09, 0.1])).toFixed(1));
      const ans = retinaSize(width, dist) * 10; // mm
      const d = distinctNumbers(ans, [ans * 10, ans / 10, (width * dist) / EYE_DEPTH, width * EYE_DEPTH, (dist * EYE_DEPTH) / width], ' mm', 2);
      return {
        text: `片目で紙の上の目印を見つめ、眼から紙までの距離を ${dist} cm にしたところ、紙の上の幅 ${width} cm の範囲が見えなくなった。眼の中で光の道すじが交わる点から網膜までの距離を ${EYE_DEPTH} cm とすると、網膜上の盲斑の直径は何 mm か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `紙の上の範囲と網膜上の盲斑は、光の道すじが交わる点をはさんで相似の三角形になるので、${width} × ${EYE_DEPTH} ÷ ${dist} ＝ ${fmt(ans / 10, 3)} cm ＝ ${fmt(ans, 2)} mm となる。見えなくなる範囲は、網膜上の盲斑に像が結ばれる範囲だからである。`,
      };
    },
  },
  {
    id: 'a18-blind-why',
    stage: 'a18',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '盲斑に像が結ばれても、ものが見えない理由として正しいものはどれか。',
        correct: '視神経が束になって眼球から出ていく部分で、視細胞がないから',
        wrong: ['錐体だけがあり、桿体がないから', '黄斑の中心にあり、光が強すぎるから', '水晶体の光が届かない位置にあるから'],
        explanation: '盲斑は、視細胞からの情報を伝える視神経の繊維が集まって眼球の外に出ていく部分である。ここには錐体も桿体もないので、光を受容できず、像が結ばれても見えない。',
      };
    },
  },
  {
    id: 'a18-dark-calc',
    stage: 'a18',
    level: 2,
    kind: 'calc',
    make(rng) {
      const k = rng.pick([2, 3, 4]);
      const ans = Math.pow(10, k);
      const d = distinctNumbers(ans, [k, k * 10, ans / 10, ans * 10, 2 * k], ' 分の1', 0);
      return {
        text: `暗順応曲線で、縦軸（感じとれる最小の光の強さ）は対数目盛りで、1目盛りが10倍を表す。暗い所に入った直後と30分後で、縦軸の値が ${k} 目盛り下がっていた。30分後には、直後の何分の1の強さの光まで感じとれるようになったか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `1目盛り下がるごとに感じとれる最小の光の強さが10分の1になるので、${k} 目盛り下がると ${ans.toLocaleString('ja-JP')} 分の1になる。感じとれる最小の光が弱くなるほど、それだけ弱い光まで感じとれる（感度が高い）からである。`,
      };
    },
  },
  {
    id: 'a18-rhodopsin',
    stage: 'a18',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '明るい所から暗い所に入ると、しばらくして弱い光も見えるようになる。このとき桿体で起こっていることとして最も適当なものはどれか。',
        correct: '明所で分解されていたロドプシンが再合成されて増え、感度が上がる',
        wrong: ['ロドプシンが分解されて増え、感度が上がる', '桿体が錐体に変化する', '瞳孔が小さくなり、光が多く入る'],
        explanation: '桿体の視物質ロドプシンは光を受けると分解され、明るい所では少なくなっている。暗い所ではロドプシンが再合成されて蓄積するので、桿体の感度がしだいに上がる（暗順応）。',
      };
    },
  },
  {
    id: 'a18-pathway',
    stage: 'a18',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '眼に入った光が網膜に達するまでに通る順として正しいものはどれか。',
        correct: '角膜 → 瞳孔 → 水晶体 → ガラス体 → 網膜',
        wrong: ['角膜 → 水晶体 → 瞳孔 → ガラス体 → 網膜', '瞳孔 → 角膜 → 水晶体 → ガラス体 → 網膜', '角膜 → 瞳孔 → ガラス体 → 水晶体 → 網膜'],
        explanation: '光は角膜を通り、虹彩に囲まれた瞳孔を通り、角膜と水晶体で屈折して、ガラス体を通って網膜に像を結ぶ。水晶体の厚さを変えてピントを合わせるので、遠近にかかわらず網膜上に像ができる。',
      };
    },
  },
];
