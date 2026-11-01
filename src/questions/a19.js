// A19 発生と位置情報 の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers } from './common.js';
import { bicoid, THRESH } from '../models/morphogen.js';
import { sample } from '../lib/series.js';

export const A19 = [
  {
    id: 'a19-maternal',
    stage: 'a19',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: 'ショウジョウバエのビコイド遺伝子のように、母親の遺伝子型によって子の形質（体の前後軸など）が決まる遺伝子を何というか。',
        correct: '母性効果遺伝子',
        wrong: ['ホメオティック遺伝子', 'ギャップ遺伝子', 'ペアルール遺伝子', '伴性遺伝子'],
        explanation: 'これは母性効果遺伝子である。母親の体内で卵がつくられるときに、その mRNA が卵に蓄えられるので、子の遺伝子型ではなく母親の遺伝子型によって子の形質が決まる。',
      };
    },
  },
  {
    id: 'a19-deficient',
    stage: 'a19',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: 'ビコイド遺伝子が欠損した母親（ビコイド遺伝子をもたない）が産んだ卵について正しいものはどれか（父親は正常とする）。',
        correct: '受精卵の遺伝子型に関係なく、頭部と胸部が形成されない',
        wrong: ['父親からビコイド遺伝子を受けついだ胚は、頭部と胸部が正常に形成される', '頭部と胸部が2つずつ形成される', '腹部が形成されず、頭部と胸部だけになる'],
        explanation: 'ビコイドの mRNA は母親の体内で卵に蓄えられるので、母親が欠損していると卵にビコイドがない。受精後に胚自身の遺伝子が発現しはじめるより前に前後軸が決まるので、父親から遺伝子を受けついでも頭部と胸部は形成されない。',
      };
    },
  },
  {
    id: 'a19-gradient',
    stage: 'a19',
    level: 2,
    kind: 'graph',
    make(rng) {
      const x = rng.pick([0.1, 0.2, 0.3, 0.5, 0.7]);
      const above = bicoid(x) >= THRESH;
      return {
        text: `図は、ショウジョウバエの受精卵のビコイドタンパク質の濃度（前端を0、後端を1とした位置）と、前方の構造をつくる遺伝子が発現する閾値を表した模式図である。位置 ${x} の核（細胞）について正しいものはどれか。`,
        chart: {
          x: { min: 0, max: 1, label: '卵の前端からの位置', step: 0.2, digits: 1 },
          y: { min: 0, max: 1.1, label: 'ビコイドの濃度（相対値）', step: 0.2, digits: 1 },
          series: [{ points: sample((v) => bicoid(v), 0, 1, 200), color: 'c1', width: 3 }],
          hlines: [{ y: THRESH, color: 'c2', dash: 'dash', label: '閾値', align: 'right' }],
          vlines: [{ x, color: 'fg', dash: 'dot', label: `${x}` }],
          alt: 'ビコイドの濃度勾配',
        },
        correct: above ? '濃度が閾値以上なので、前方（頭部・胸部）の構造をつくる遺伝子が発現する' : '濃度が閾値未満なので、前方（頭部・胸部）の構造をつくる遺伝子は発現しない',
        wrong: ['濃度が閾値以上なので、前方（頭部・胸部）の構造をつくる遺伝子が発現する', '濃度が閾値未満なので、前方（頭部・胸部）の構造をつくる遺伝子は発現しない', '濃度が閾値未満なので、前方（頭部・胸部）の構造をつくる遺伝子が発現する', 'ビコイドの濃度は、遺伝子の発現に関係しない'],
        explanation: `位置 ${x} では濃度が約 ${fmt(bicoid(x), 2)} で、閾値 ${THRESH} ${above ? '以上' : 'より低い'}。各核（細胞）はビコイドの濃度を位置情報として受け取り、濃度が閾値以上の前方でだけ前方の構造をつくる遺伝子が発現するからである。`,
      };
    },
  },
  {
    id: 'a19-half-calc',
    stage: 'a19',
    level: 3,
    kind: 'calc',
    make(rng) {
      const h = rng.pick([10, 12, 15]); // 濃度が半分になる距離（%）
      const k = rng.pick([2, 3, 4]);
      const ans = h * k;
      const d = distinctNumbers(ans, [h * Math.pow(2, k), h + k, h * (k + 1), h * k / 2, 100 - ans], ' %', 0);
      return {
        text: `あるタンパク質の濃度は卵の前端で最も高く、後方へ卵の長さの ${h}% 進むごとに半分になる。前端の濃度の 1/${Math.pow(2, k)} になるのは、前端から卵の長さの何%の位置か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `1/${Math.pow(2, k)} ＝ (1/2)^${k} なので、半分になる距離 ${h}% を ${k} 回進んだ位置、つまり ${h} × ${k} ＝ ${ans}% である。濃度が一定の距離ごとに一定の割合で減る（指数関数的に減少する）からである。`,
      };
    },
  },
  {
    id: 'a19-shift-calc',
    stage: 'a19',
    level: 3,
    kind: 'calc',
    make(rng) {
      const h = rng.pick([10, 12, 15]);
      const b = rng.pick([30, 35, 40]);
      const fold = rng.pick([2, 4]);
      const ans = b + h * Math.log2(fold);
      const d = distinctNumbers(ans, [b * fold, b - h * Math.log2(fold), b + h, b + h * fold, b / fold, b + h * fold * 2, b + 2 * h * Math.log2(fold)], ' %', 0);
      return {
        text: `ビコイドの濃度が卵の長さの ${h}% ごとに半分になるとする。正常な卵では、頭部・胸部になる範囲の境界は前端から ${b}% の位置にある。母親のビコイド遺伝子をふやして、卵の中のビコイドの量を ${fold} 倍にすると、境界は前端から何%の位置になると考えられるか（閾値は変わらないものとする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `濃度が ${fold} 倍になると、閾値の濃度になる位置は、濃度がさらに ${fold} 分の1になるまで、つまり ${h}% を ${fmt(Math.log2(fold), 0)} 回分だけ後方へずれる。そのため境界は ${b} ＋ ${h} × ${fmt(Math.log2(fold), 0)} ＝ ${ans}% の位置になる。`,
      };
    },
  },
  {
    id: 'a19-organizer',
    stage: 'a19',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'イモリの初期原腸胚の原口背唇部を、別の胚の腹側に移植すると、移植片を中心にもう1つの胚（二次胚）ができた。原口背唇部のように、まわりの細胞にはたらきかけて分化を引き起こす部分を何というか。',
        correct: '形成体（オーガナイザー）',
        wrong: ['予定運命図', '母性因子', '神経堤', '体節'],
        explanation: 'これは形成体（オーガナイザー）で、シュペーマンらが移植実験で明らかにした。形成体が接している外胚葉にはたらきかけて神経管を誘導するので、移植された胚の腹側にも神経管などがつくられる。',
      };
    },
  },
  {
    id: 'a19-induction',
    stage: 'a19',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '発生の過程で、ある胚の領域が、隣接する別の領域にはたらきかけて、その分化の方向を決めるはたらきを何というか。',
        correct: '誘導',
        wrong: ['分裂', '分化全能性', '細胞死（アポトーシス）', '再生'],
        explanation: 'これは誘導である。誘導された組織がさらに次の誘導を行うことがあり、眼の形成では眼杯が表皮から水晶体を誘導し、水晶体が表皮から角膜を誘導するので、誘導の連鎖によって複雑な器官がつくられる。',
      };
    },
  },
  {
    id: 'a19-homeotic',
    stage: 'a19',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: 'ショウジョウバエで、体節ごとにどのような器官をつくるかを決めている遺伝子に突然変異が起こると、触角が生えるべき位置に脚が生えることがある。このような遺伝子を何というか。',
        correct: 'ホメオティック遺伝子',
        wrong: ['母性効果遺伝子', 'ギャップ遺伝子', 'ペアルール遺伝子'],
        explanation: 'これはホメオティック遺伝子で、各体節の性質（どの器官をつくるか）を決めている。突然変異が起こると別の体節の性質がつくられるので、触角の位置に脚が生えるような変化（ホメオティック突然変異）が起こる。',
      };
    },
  },
];
