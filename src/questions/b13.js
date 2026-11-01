// B13 炭素の循環 の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers } from './common.js';
import { co2, PPM_PER } from '../models/carbon.js';
import { sample } from '../lib/series.js';

export const B13 = [
  {
    id: 'b13-balance',
    stage: 'b13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const photo = rng.pick([1000, 1100, 1200]);
      const resp = rng.pick([550, 600]);
      const decomp = rng.pick([450, 500, 520]);
      const fossil = rng.pick([80, 100, 120]);
      const ocean = rng.pick([20, 30]);
      const ans = resp + decomp + fossil - photo - ocean;
      if (ans <= 0) return this.make(rng);
      const d = distinctNumbers(ans, [resp + decomp + fossil + photo + ocean, fossil, resp + decomp - photo + ocean + fossil, fossil - ocean, ans + 2 * ocean], ' 億トン', 0);
      return {
        text: `ある時期の地球全体の炭素の出入り（億トン/年）を、陸上の生産者の光合成 ${photo}、生物の呼吸（生産者・消費者）${resp}、分解者の呼吸 ${decomp}、化石燃料の燃焼 ${fossil}、海洋への吸収 ${ocean} とする。大気中の炭素は1年に何億トン増えるか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `大気へ入る量は ${resp} ＋ ${decomp} ＋ ${fossil} ＝ ${resp + decomp + fossil}、大気から出る量は ${photo} ＋ ${ocean} ＝ ${photo + ocean} なので、差は ${ans} 億トンである。呼吸・分解・燃焼で CO₂ が大気にもどり、光合成と海洋への溶け込みで大気から取り除かれるからである。`,
      };
    },
  },
  {
    id: 'b13-ppm',
    stage: 'b13',
    level: 3,
    kind: 'calc',
    make(rng) {
      const inc = rng.pick([42, 50, 63, 84]);
      const ans = inc / PPM_PER;
      const d = distinctNumbers(ans, [inc * PPM_PER / 100, PPM_PER / inc, ans * 2, ans / 2, inc / 10], ' ppm', 1);
      return {
        text: `大気中の炭素が ${PPM_PER} 億トン増えると、大気中の CO₂ 濃度は約 1 ppm 上がる。大気中の炭素が1年に ${inc} 億トン増えると、CO₂ 濃度は1年に約何 ppm 上がるか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${inc} ÷ ${PPM_PER} ＝ ${fmt(ans, 1)} ppm である。CO₂ 濃度の上がり方は大気中の炭素の増加量に比例するから、1 ppm にあたる量で割ればよい。`,
      };
    },
  },
  {
    id: 'b13-season',
    stage: 'b13',
    level: 2,
    kind: 'graph',
    make() {
      return {
        text: '図は、北半球のある観測地点での大気中の CO₂ 濃度の変化（模式）である。毎年、夏から秋にかけて濃度が下がる理由として最も適当なものはどれか。',
        chart: {
          x: { min: 2020, max: 2023, label: '年', ticks: [2020, 2021, 2022, 2023].map((v) => ({ v, text: String(v) })) },
          y: { min: 404, max: 424, label: 'CO₂ 濃度（ppm）', step: 4 },
          series: [{ points: sample(co2, 2020, 2023, 600), color: 'c1', width: 3 }],
          alt: 'CO₂濃度の季節変動',
        },
        correct: '植物の光合成がさかんになり、大気中の CO₂ が多く吸収されるから',
        wrong: ['化石燃料の燃焼がさかんになるから', '植物の呼吸がさかんになり、CO₂ が多く放出されるから', '海水の温度が上がり、海洋が CO₂ を多く放出するから'],
        explanation: '北半球の陸地では、春から夏に植物がさかんに光合成を行うので、大気中の CO₂ が吸収されて濃度が下がる。冬は光合成が少なく、呼吸や分解で放出される CO₂ のほうが多いので、濃度が上がるからである。',
      };
    },
  },
  {
    id: 'b13-flow',
    stage: 'b13',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '炭素の循環で、大気中の CO₂ を生物の体内（有機物）に取り込むはたらきはどれか。',
        correct: '生産者の光合成',
        wrong: ['生産者の呼吸', '分解者による遺体の分解', '化石燃料の燃焼', '消費者の呼吸'],
        explanation: '大気中の CO₂ は、生産者の光合成によって有機物に取り込まれる。有機物の炭素は食物連鎖で消費者に移り、呼吸や分解で再び CO₂ として大気にもどるので、炭素は生態系の中を循環する。',
      };
    },
  },
  {
    id: 'b13-fossil',
    stage: 'b13',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '大気中の CO₂ 濃度が長期的に増え続けている主な原因として最も適当なものはどれか。',
        correct: '化石燃料の大量消費や森林の減少',
        wrong: ['植物の光合成の増加', '海洋による CO₂ の吸収', '分解者の減少'],
        explanation: '化石燃料には、昔の生物の遺体の炭素が長い間たくわえられている。それを大量に燃やすと CO₂ が大気に放出され、森林が減ると光合成による吸収も減るので、大気中の CO₂ 濃度が増え続けている。',
      };
    },
  },
  {
    id: 'b13-greenhouse',
    stage: 'b13',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '大気中の CO₂ 濃度の増加が地球温暖化の原因になる理由として最も適当なものはどれか。',
        correct: 'CO₂ は地表から放出される熱（赤外線）を吸収し、その一部を地表にもどすから',
        wrong: ['CO₂ が太陽の光をさえぎるから', 'CO₂ がオゾン層を破壊するから', 'CO₂ が燃えて熱を出すから'],
        explanation: 'CO₂ などの温室効果ガスは、地表から宇宙へ出ていく熱（赤外線）を吸収し、その一部を地表にもどす。温室効果ガスが増えるとこのはたらき（温室効果）が強まるので、地表付近の気温が上がる。',
      };
    },
  },
  {
    id: 'b13-decomposer',
    stage: 'b13',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '生態系で、生物の遺体や排出物に含まれる有機物を分解して、CO₂ などの無機物にもどすはたらきをする生物を何というか。',
        correct: '分解者',
        wrong: ['生産者', '一次消費者', '二次消費者'],
        explanation: 'これは分解者で、菌類や細菌などが含まれる。分解者が有機物を無機物にもどすので、炭素などの物質は生態系の中を循環できる。',
      };
    },
  },
  {
    id: 'b13-trend-calc',
    stage: 'b13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const y1 = rng.pick([2000, 2005, 2010]);
      const span = rng.pick([10, 15, 20]);
      const c1 = rng.pick([370, 380, 390]);
      const rate = rng.pick([2, 2.2, 2.4, 2.5]);
      const c2 = c1 + rate * span;
      const d = distinctNumbers(rate, [(c2 - c1) / 10, c2 - c1, rate * 2, rate / 2, (c2 - c1) / (span * 2)], ' ppm', 1);
      return {
        text: `ある観測地点の大気中の CO₂ 濃度（年平均）は、${y1}年に ${c1} ppm、${y1 + span}年に ${fmt(c2, 1)} ppm であった。この間、CO₂ 濃度は1年あたり平均何 ppm 増加したか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `(${fmt(c2, 1)} − ${c1}) ÷ ${span} ＝ ${fmt(rate, 1)} ppm である。季節による上下の変動を打ち消すために年平均どうしを比べ、増加量を年数で割るからである。`,
      };
    },
  },
];
