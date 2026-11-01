// A9 呼吸と発酵（呼吸商）の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { SUBSTRATES, yeast, splitGlucose } from '../models/respiration.js';

const FATS = [
  { name: 'トリステアリン', eq: '2C₅₇H₁₁₀O₆ ＋ 163O₂ → 114CO₂ ＋ 110H₂O', o2: 163, co2: 114 },
  { name: 'トリパルミチン', eq: '2C₅₁H₉₈O₆ ＋ 145O₂ → 102CO₂ ＋ 98H₂O', o2: 145, co2: 102 },
  { name: 'トリオレイン', eq: '2C₅₇H₁₀₄O₆ ＋ 160O₂ → 114CO₂ ＋ 104H₂O', o2: 160, co2: 114 },
];

export const A9 = [
  {
    id: 'a9-rq-substrate',
    stage: 'a9',
    level: 1,
    kind: 'term',
    make(rng) {
      const k = rng.pick(['carb', 'fat', 'protein']);
      const v = { carb: '1.0', fat: '約0.7', protein: '約0.8' }[k];
      return {
        text: `ある発芽種子の呼吸商を測定したところ ${v} であった。この種子が主に呼吸基質として使っている物質はどれか。`,
        correct: SUBSTRATES[k].name,
        wrong: ['炭水化物', '脂肪', 'タンパク質', '核酸'],
        explanation: `呼吸商は炭水化物で1.0、タンパク質で約0.8、脂肪で約0.7なので、${v} なら${SUBSTRATES[k].name}である。呼吸基質によって、分解に必要なO₂と生じるCO₂の量の比が違うからである。`,
      };
    },
  },
  {
    id: 'a9-respirometer',
    stage: 'a9',
    level: 2,
    kind: 'calc',
    make(rng) {
      const koh = rng.pick([5, 8, 10, 12, 20]);
      const rq = rng.pick([1, 0.7, 0.8, 0.9, 0.75]);
      const water = Number((koh * (1 - rq)).toFixed(2));
      const ans = (koh - water) / koh;
      const d = distinctNumbers(ans, [water / koh, koh / (koh - water), (koh + water) / koh, (koh - water) / (koh + water), 1 - ans / 2, 0.7, 0.8, 1.2, 1.3], '', 2);
      return {
        text: `発芽種子を入れたフラスコを2つ用意し、一方には水酸化カリウム（KOH）水溶液を、もう一方には水を入れて、一定時間の気体の減少量を測定した。KOH側の減少量は ${koh} mL、水側の減少量は ${water} mL であった。この種子の呼吸商はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `KOH はCO₂を吸収するので、KOH側の減少量 ${koh} mL が吸収したO₂、水側の減少量 ${water} mL は O₂ − CO₂ にあたる。放出したCO₂ ＝ ${koh} − ${water} ＝ ${fmt(koh - water, 2)} mL だから、呼吸商 ＝ ${fmt(koh - water, 2)} ÷ ${koh} ＝ ${fmt(ans, 2)} となる。`,
      };
    },
  },
  {
    id: 'a9-fat-eq',
    stage: 'a9',
    level: 2,
    kind: 'calc',
    make(rng) {
      const f = rng.pick(FATS);
      const ans = f.co2 / f.o2;
      const two = (v) => v.toFixed(2);
      const wrong = [f.o2 / f.co2, (f.co2 / 2) / f.o2, f.co2 / (f.o2 * 2), 1, 0.8, 0.9].map(two).filter((v) => v !== two(ans));
      return {
        text: `脂肪の一種である${f.name}は、呼吸で次のように分解される。　${f.eq}　この反応の呼吸商はいくらか（小数第3位を四捨五入して答えよ）。`,
        correct: two(ans),
        wrong,
        explanation: `呼吸商 ＝ 放出したCO₂ ÷ 吸収したO₂ ＝ ${f.co2} ÷ ${f.o2} ≒ ${two(ans)} である。同じ温度・圧力では気体の体積の比は反応式の係数の比に等しいから、係数から求めてよい。`,
      };
    },
  },
  {
    id: 'a9-yeast-split',
    stage: 'a9',
    level: 3,
    kind: 'calc',
    make(rng) {
      const aer = rng.pick([0.5, 1, 1.5, 2, 3]);
      const fer = rng.pick([1, 2, 3, 4, 6]);
      const o2 = 6 * aer;
      const co2 = 6 * aer + 2 * fer;
      const ask = rng.pick(['ratio', 'ethanol']);
      const ans = ask === 'ratio' ? fer / aer : 2 * fer;
      const d = ask === 'ratio'
        ? distinctNumbers(ans, [aer / fer, (co2 - o2) / o2, co2 / o2, (co2 - o2) / 2 / o2, ans * 3], ' 倍', 2)
        : distinctNumbers(ans, [fer, co2 - o2 + 0.5 * fer, co2, (co2 - o2) / 2 / 2, ans * 2, o2], ' mol', 2);
      return {
        text: `酵母をグルコース溶液に入れて培養したところ、一定時間に O₂ を ${fmt(o2, 1)} mol 吸収し、CO₂ を ${fmt(co2, 1)} mol 放出した。酵母は呼吸とアルコール発酵だけを行ったとする。${ask === 'ratio' ? 'アルコール発酵で消費したグルコースの量は、呼吸で消費したグルコースの量の何倍か' : 'アルコール発酵でできたエタノールは何 mol か'}。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `呼吸ではO₂とCO₂が同じ量なので、呼吸のグルコース ＝ ${fmt(o2, 1)} ÷ 6 ＝ ${fmt(aer, 2)} mol で、O₂より多いCO₂ ${fmt(co2 - o2, 1)} mol は発酵によるから、発酵のグルコース ＝ ${fmt(co2 - o2, 1)} ÷ 2 ＝ ${fmt(fer, 2)} mol である。${ask === 'ratio' ? `したがって ${fmt(fer, 2)} ÷ ${fmt(aer, 2)} ＝ ${fmt(ans, 2)} 倍となる。` : `発酵ではグルコース1分子からエタノールが2分子できるので、${fmt(fer, 2)} × 2 ＝ ${fmt(ans, 2)} mol となる。`}`,
      };
    },
  },
  {
    id: 'a9-yeast-rq',
    stage: 'a9',
    level: 2,
    kind: 'calc',
    make(rng) {
      const total = 6;
      const ferm = rng.pick([1 / 3, 0.5, 2 / 3, 0.25, 0.75]);
      const y = yeast(total, ferm);
      const ans = y.co2 / y.o2;
      const d = distinctNumbers(ans, [y.o2 / y.co2, 1, 2 * y.fer / y.o2, (y.co2 + y.o2) / y.o2, ans * 2], ' 倍', 2);
      return {
        text: `酵母がグルコース ${total} mol を消費し、そのうち ${fmt(y.aer, 2)} mol を呼吸に、${fmt(y.fer, 2)} mol をアルコール発酵に使った。このとき放出したCO₂の量は、吸収したO₂の量のおよそ何倍か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `呼吸で O₂ を ${fmt(y.aer, 2)} × 6 ＝ ${fmt(y.o2, 2)} mol 吸収してCO₂ を ${fmt(y.o2, 2)} mol 放出し、発酵でCO₂ を ${fmt(y.fer, 2)} × 2 ＝ ${fmt(2 * y.fer, 2)} mol 放出するので、${fmt(y.co2, 2)} ÷ ${fmt(y.o2, 2)} ＝ ${fmt(ans, 2)} 倍である。発酵はO₂を使わずにCO₂を出すから、発酵の割合が大きいほどこの値は大きくなる。`,
      };
    },
  },
  {
    id: 'a9-bars',
    stage: 'a9',
    level: 2,
    kind: 'graph',
    make(rng) {
      const conds = rng.shuffle([
        { key: 'aer', ferm: 0, desc: '呼吸だけ' },
        { key: 'mix', ferm: 0.5, desc: '呼吸と発酵の両方' },
        { key: 'fer', ferm: 1, desc: 'アルコール発酵だけ' },
      ]);
      const ask = rng.pick(conds);
      const idx = conds.indexOf(ask);
      const ys = conds.map((c) => yeast(3, c.ferm));
      return {
        text: `図は、酵母を条件ア〜ウで培養したときの、一定時間のO₂吸収量とCO₂放出量（mol）を表している。グルコースの消費量はどの条件も同じであった。${ask.desc}を行っていた条件はどれか。`,
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0, max: 20, label: '量（mol）', step: 4 },
          bars: {
            categories: conds.map((_, i) => KATA[i]),
            groups: [
              { values: ys.map((y) => y.o2), color: 'c1', label: 'O₂ 吸収量' },
              { values: ys.map((y) => y.co2), color: 'c2', label: 'CO₂ 放出量' },
            ],
          },
          alt: '条件ア〜ウのO₂吸収量とCO₂放出量',
        },
        correct: KATA[idx],
        wrong: KATA.slice(0, 3).concat(['ア〜ウのどれでもない']),
        explanation: {
          aer: `${KATA[idx]}はO₂吸収量とCO₂放出量が等しいので、呼吸だけを行っている。グルコースの呼吸ではO₂ 6分子を使ってCO₂ 6分子を出すからである。`,
          mix: `${KATA[idx]}はO₂を吸収しているが、CO₂放出量のほうが多いので、呼吸と発酵の両方を行っている。O₂より多い分のCO₂は、O₂を使わない発酵で出たものだからである。`,
          fer: `${KATA[idx]}はO₂を吸収せずにCO₂だけを放出しているので、アルコール発酵だけを行っている。アルコール発酵はO₂を使わずにグルコースをエタノールとCO₂に分解するからである。`,
        }[ask.key],
      };
    },
  },
  {
    id: 'a9-split-from-gas',
    stage: 'a9',
    level: 3,
    kind: 'calc',
    make(rng) {
      const o2 = rng.pick([6, 12, 18, 24]);
      const extra = rng.pick([4, 8, 12, 24]);
      const co2 = o2 + extra;
      const s = splitGlucose(o2, co2);
      const ans = s.aer + s.fer;
      const d = distinctNumbers(ans, [s.aer, s.fer, co2 / 6, (o2 + co2) / 6, co2 / 2, s.aer + extra], ' mol', 2);
      return {
        text: `酵母が一定時間に O₂ を ${o2} mol 吸収し、CO₂ を ${co2} mol 放出した。呼吸とアルコール発酵で消費したグルコースは合わせて何 mol か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `呼吸で消費したグルコースは ${o2} ÷ 6 ＝ ${fmt(s.aer, 2)} mol、発酵で消費したグルコースは (${co2} − ${o2}) ÷ 2 ＝ ${fmt(s.fer, 2)} mol で、合計 ${fmt(ans, 2)} mol となる。呼吸はO₂とCO₂が 6 : 6、発酵はグルコース1分子あたりCO₂ 2分子なので、CO₂ ÷ 6 のようにまとめて計算してはいけないからである。`,
      };
    },
  },
  {
    id: 'a9-lactic',
    stage: 'a9',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'アルコール発酵と乳酸発酵の違いとして正しいものはどれか。',
          correct: 'アルコール発酵ではCO₂が放出されるが、乳酸発酵ではCO₂は放出されない',
          wrong: ['乳酸発酵ではCO₂が放出されるが、アルコール発酵ではCO₂は放出されない', 'アルコール発酵はO₂を必要とするが、乳酸発酵は必要としない', 'どちらもグルコース1分子あたり、呼吸と同じ数のATPをつくる'],
          explanation: 'アルコール発酵は C₆H₁₂O₆ → 2C₂H₅OH ＋ 2CO₂、乳酸発酵は C₆H₁₂O₆ → 2C₃H₆O₃ である。どちらもO₂を使わない反応で、グルコース1分子あたりATPは2分子しかできないから、呼吸よりずっと効率が低い。',
        };
      }
      return {
        text: '激しい運動をしてO₂の供給が追いつかないとき、ヒトの筋肉で行われる、O₂を使わずにグルコースを分解してATPを得るはたらきを何というか。',
        correct: '解糖（乳酸発酵と同じ反応）',
        wrong: ['アルコール発酵', '光合成', 'クエン酸回路', '電子伝達系'],
        explanation: 'これは解糖で、乳酸発酵と同じ反応でグルコースが乳酸に分解される。O₂がないと電子伝達系が進まず、その結果クエン酸回路も止まってしまうので、O₂が不足するとこの反応でATPを得るのである。',
      };
    },
  },
  {
    id: 'a9-rq-meaning',
    stage: 'a9',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '脂肪を呼吸基質としたときの呼吸商が、炭水化物よりも小さくなる理由として最も適当なものはどれか。',
        correct: '脂肪は分子中の酸素の割合が小さく、CO₂と水に分解するのにより多くのO₂を必要とするから',
        wrong: ['脂肪は分子中の酸素の割合が大きく、O₂をほとんど必要としないから', '脂肪からはCO₂が生じないから', '脂肪は発酵によって分解されるから'],
        explanation: '脂肪は炭素と水素が多く酸素が少ない分子なので、CO₂と水にまで分解するには多くのO₂が必要になる。そのため、放出するCO₂に対して吸収するO₂が多くなり、呼吸商は約0.7と小さくなる。',
      };
    },
  },
];
