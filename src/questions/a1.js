// A1 酵素の反応速度 の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers } from './common.js';
import { rate, inhibited, ENZYMES } from '../models/enzyme.js';
import { sample } from '../lib/series.js';

const EFFECT = {
  competitive: 'Vmax は変わらず、Km は大きくなる',
  noncompetitive: 'Vmax は小さくなり、Km は変わらない',
};
const EFFECT_WRONG = ['Vmax も Km も小さくなる', 'Vmax は大きくなり、Km は変わらない', 'Vmax は変わらず、Km は小さくなる', 'Vmax も Km も変わらない'];
const NAME = { competitive: '競争的阻害', noncompetitive: '非競争的阻害' };

export const A1 = [
  {
    id: 'a1-mm-calc',
    stage: 'a1',
    level: 2,
    kind: 'calc',
    make(rng) {
      const n = rng.pick([1, 2, 3, 4, 9]);
      const Vmax = (n + 1) * rng.pick([4, 5, 6, 8, 10, 12]);
      const Km = rng.pick([0.5, 1, 2, 3, 4, 5]);
      const S = n * Km;
      const v = (Vmax * n) / (n + 1);
      const d = distinctNumbers(v, [Vmax / 2, (Vmax * S) / Km, Vmax, Vmax - v, (Vmax * Km) / (Km + S), v / 2, v + Vmax / 10], '', 2);
      return {
        text: `ある酵素の反応速度 v は v ＝ Vmax[S]／(Km ＋ [S]) で表され、Vmax ＝ ${Vmax}、Km ＝ ${Km} である。基質濃度 [S] ＝ ${fmt(S, 2)} のときの反応速度はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `v ＝ ${Vmax} × ${fmt(S, 2)}／(${Km} ＋ ${fmt(S, 2)}) ＝ ${fmt(v, 2)} となる。[S] が Km の${n}倍なので、v は Vmax の ${n}/${n + 1} になるからである。`,
      };
    },
  },
  {
    id: 'a1-inhibition-effect',
    stage: 'a1',
    level: 2,
    kind: 'term',
    make(rng) {
      const k = rng.pick(['competitive', 'noncompetitive']);
      return {
        text: `${NAME[k]}を起こす阻害剤を加えたとき、反応の最大速度 Vmax と、ミカエリス定数 Km（見かけの値）はどう変化するか。`,
        correct: EFFECT[k],
        wrong: [...Object.values(EFFECT), ...EFFECT_WRONG],
        explanation: k === 'competitive'
          ? '競争的阻害では、阻害剤が活性部位を基質と奪い合うので、同じ速度を出すのにより多くの基質が必要になり Km が大きくなる。基質濃度を十分に高くすれば基質が阻害剤に勝つから、Vmax は変わらない。'
          : '非競争的阻害では、阻害剤が活性部位以外に結合して酵素のはたらきを失わせる。基質を増やしても阻害は解けないから Vmax は小さくなるが、はたらける酵素と基質の結合のしやすさは変わらないので Km は変わらない。',
      };
    },
  },
  {
    id: 'a1-inhibition-graph',
    stage: 'a1',
    level: 2,
    kind: 'graph',
    make(rng) {
      const k = rng.pick(['competitive', 'noncompetitive']);
      const Vmax = rng.pick([40, 50, 60, 80]);
      const Km = rng.pick([2, 3, 4]);
      const I = rng.pick([2, 4, 6]);
      const cur = inhibited(k, Vmax, Km, I, 2);
      const A = {
        competitive: '競争的阻害（基質濃度を高くすると、阻害の影響が小さくなる）',
        noncompetitive: '非競争的阻害（基質濃度を高くしても、最大速度は回復しない）',
      };
      return {
        text: '図は、ある酵素の基質濃度と反応速度の関係を、阻害剤を加えない場合（実線）と加えた場合（破線）で比べたものである。この阻害剤による阻害として最も適当なものはどれか。',
        chart: {
          x: { min: 0, max: 60, label: '基質濃度', step: 10 },
          y: { min: 0, max: Vmax * 1.2, label: '反応速度', step: 10 },
          series: [
            { points: sample((S) => rate(S, Vmax, Km), 0, 60, 200), color: 'c1', width: 3, label: '阻害剤なし' },
            { points: sample((S) => rate(S, cur.Vmax, cur.Km), 0, 60, 200), color: 'c2', dash: 'dash', width: 3, label: '阻害剤あり' },
          ],
          alt: '阻害剤のありなしで比べた反応速度のグラフ',
        },
        correct: A[k],
        wrong: [...Object.values(A), '競争的阻害（最大速度が小さくなる）', '非競争的阻害（Km が大きくなる）', '阻害は起こっていない（2本の曲線は同じ形である）'],
        explanation: k === 'competitive'
          ? '破線は基質濃度が低いと大きく下がるが、基質濃度が高くなると実線に近づいて同じ最大速度に向かっているので、競争的阻害である。阻害剤と基質が活性部位を奪い合うので、基質が多いほど阻害剤の影響が小さくなるからである。'
          : '破線は基質濃度を高くしても実線の最大速度に届かないので、非競争的阻害である。阻害剤が活性部位以外に結合してはたらける酵素そのものを減らすから、基質を増やしても回復しない。',
      };
    },
  },
  {
    id: 'a1-lb-meaning',
    stage: 'a1',
    level: 3,
    kind: 'term',
    make(rng) {
      const Q = [
        { q: '縦軸との交点（y切片）', a: '1/Vmax' },
        { q: '横軸との交点（x切片）', a: '−1/Km' },
        { q: '直線の傾き', a: 'Km/Vmax' },
      ];
      const x = rng.pick(Q);
      return {
        text: `反応速度の逆数 1/v を縦軸に、基質濃度の逆数 1/[S] を横軸にとったグラフ（ラインウィーバー・バークのプロット）は直線になる。この直線の${x.q}が表すものはどれか。`,
        correct: x.a,
        wrong: ['1/Vmax', '−1/Km', 'Km/Vmax', 'Vmax', 'Km', 'Vmax/Km'],
        explanation: `ミカエリス・メンテンの式の逆数をとると 1/v ＝ (Km/Vmax)(1/[S]) ＋ 1/Vmax となるので、${x.q}は ${x.a} を表す。1次関数 y ＝ ax ＋ b と同じ形になるから、傾きが Km/Vmax、y切片が 1/Vmax、y＝0 とおいた x切片が −1/Km になる。`,
      };
    },
  },
  {
    id: 'a1-lb-calc',
    stage: 'a1',
    level: 3,
    kind: 'calc',
    make(rng) {
      const Vmax = rng.pick([2, 4, 5, 10, 20, 25, 50]);
      const Km = rng.pick([0.2, 0.25, 0.5, 1, 2, 4, 5]);
      const ask = rng.pick(['Vmax', 'Km']);
      const yi = 1 / Vmax;
      const xi = -1 / Km;
      const ans = ask === 'Vmax' ? Vmax : Km;
      const cands = ask === 'Vmax' ? [yi, Km, -xi, Vmax * 2, Vmax / 2, Vmax / Km, Vmax * 10, Vmax / 10] : [-xi, Vmax, yi, Km * 2, Km / 2, Km * Vmax, Km * 10, Km / 10];
      const d = distinctNumbers(ans, cands, '', 3);
      return {
        text: `ある酵素について、1/v を縦軸、1/[S] を横軸にとってグラフにすると直線になり、縦軸との交点（y切片）は ${fmt(yi, 4)}、横軸との交点（x切片）は ${fmt(xi, 4)} であった。この酵素の ${ask} はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `y切片は 1/Vmax、x切片は −1/Km を表すので、Vmax ＝ 1 ÷ ${fmt(yi, 4)} ＝ ${Vmax}、Km ＝ 1 ÷ ${fmt(-xi, 4)} ＝ ${Km} となる。1/v ＝ (Km/Vmax)(1/[S]) ＋ 1/Vmax の直線だからである。`,
      };
    },
  },
  {
    id: 'a1-km-read',
    stage: 'a1',
    level: 2,
    kind: 'graph',
    make(rng) {
      const Vmax = rng.pick([40, 60, 80, 100]);
      const Km = rng.pick([2, 4, 6, 8, 10]);
      const xMax = Math.max(20, Math.ceil((Km * 5) / 10) * 10);
      const d = distinctNumbers(Km, [Vmax / 2, Km * 2, Km / 2, Vmax, Km + 4, Km + 3], '', 0);
      return {
        text: `図は、ある酵素の基質濃度と反応速度の関係である（最大速度 Vmax ＝ ${Vmax}、横軸の目盛りは1ごと）。この酵素のミカエリス定数 Km（反応速度が Vmax の半分になるときの基質濃度）はおよそいくらか。`,
        chart: {
          x: { min: 0, max: xMax, label: '基質濃度', ticks: Array.from({ length: xMax + 1 }, (_, i) => ({ v: i, text: i % 5 === 0 ? String(i) : ' ' })) },
          y: { min: 0, max: Vmax * 1.2, label: '反応速度', step: 10 },
          series: [{ points: sample((S) => rate(S, Vmax, Km), 0, xMax, 240), color: 'c1', width: 3 }],
          hlines: [
            { y: Vmax, color: 'muted', dash: 'dash', label: `Vmax ＝ ${Vmax}`, align: 'right' },
            { y: Vmax / 2, color: 'c2', dash: 'dot', label: `Vmax/2 ＝ ${Vmax / 2}`, align: 'right' },
          ],
          alt: '基質濃度と反応速度のグラフ',
        },
        correct: d.correct,
        wrong: d.wrong,
        explanation: `反応速度が Vmax の半分（${Vmax / 2}）になるときの基質濃度を読むと、約${Km}である。Km は酵素の半分が基質と結合しているときの基質濃度で、Km が小さいほど酵素と基質が結合しやすいからである。`,
      };
    },
  },
  {
    id: 'a1-temperature',
    stage: 'a1',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '酵素の反応速度は、ある温度（最適温度）を超えると急に小さくなる。その理由として最も適当なものはどれか。',
        correct: '酵素をつくるタンパク質の立体構造が熱で変化（変性）し、失活するから',
        wrong: ['温度が高いと基質が分子運動をしなくなるから', '高温では酵素が基質を分解しすぎて、基質がなくなるから', '温度が上がると、酵素の活性部位が大きくなりすぎるから'],
        explanation: '酵素はタンパク質でできているので、高温では立体構造が変化して活性部位の形がくずれる。これを熱変性といい、変性した酵素は温度を下げてももとに戻らないからである。',
      };
    },
  },
  {
    id: 'a1-reversibility',
    stage: 'a1',
    level: 2,
    kind: 'term',
    make(rng) {
      const hot = rng.chance(0.5);
      const Th = hot ? rng.pick([70, 80, 90]) : rng.pick([0, 4, 10]);
      return {
        text: `だ液アミラーゼを ${Th}℃ に10分間置いたあと、37℃ に戻してデンプンを加えた。このときの反応について最も適当なものはどれか。`,
        correct: hot ? 'ほとんど反応しない' : 'はじめから37℃に置いた場合と同じように反応する',
        wrong: ['ほとんど反応しない', 'はじめから37℃に置いた場合と同じように反応する', '37℃に置いた場合より速く反応する', `${Th}℃に置いている間と同じ速さで反応する`],
        explanation: hot
          ? `${Th}℃ では酵素タンパク質が熱変性して失活する。熱変性は不可逆的なので、37℃ に戻しても活性は回復しないからである。`
          : '低温では分子の運動がにぶいので反応はおそいが、酵素は変性していない。そのため37℃ に戻すと、もとどおりにはたらくからである。',
      };
    },
  },
  {
    id: 'a1-ph',
    stage: 'a1',
    level: 1,
    kind: 'term',
    make(rng) {
      const e = rng.pick(Object.values(ENZYMES));
      const lab = (x) => `約${x}`;
      return {
        text: `${e.where}にふくまれる消化酵素「${e.name}」の最適pHはおよそいくらか。`,
        correct: lab(e.opt),
        wrong: [2, 5, 7, 8, 11].filter((x) => x !== e.opt).map(lab),
        explanation: `${e.name}の最適pHは約${e.opt}である。酵素は、それがはたらく場所の pH（胃液は強い酸性、だ液はほぼ中性、すい液は弱アルカリ性）でよくはたらくようになっているからである。`,
      };
    },
  },
  {
    id: 'a1-saturation',
    stage: 'a1',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '酵素の量を一定にして基質濃度を高くしていくと、反応速度はやがて一定（最大速度）になる。その理由として最も適当なものはどれか。',
        correct: 'ほぼすべての酵素の活性部位が基質と結合した状態になるから',
        wrong: ['基質が多すぎると酵素が変性するから', '生成物がすべて基質に戻ってしまうから', '基質どうしが結合して酵素に結合できなくなるから'],
        explanation: '基質濃度が十分高いと、ほぼすべての酵素が酵素−基質複合体をつくっている。酵素の数以上には同時に反応できないので、それ以上基質を増やしても反応速度は大きくならないからである。',
      };
    },
  },
  {
    id: 'a1-specificity',
    stage: 'a1',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { q: '酵素が、特定の物質（基質）にだけ作用する性質', a: '基質特異性', why: '活性部位の立体構造に合う形の基質としか結合できないからである' },
        { q: '酵素の分子の中で、基質が結合して反応が起こる部分', a: '活性部位', why: '活性部位は基質の形にぴったり合う立体構造をもっており、そこに基質が結合するからである' },
        { q: '酵素と基質が結合してできる複合体', a: '酵素−基質複合体', why: '酵素は基質と一時的に結合して反応を進め、反応後は変化せずに離れて再びはたらくからである' },
      ];
      const x = rng.pick(Q);
      return {
        text: `「${x.q}」を何というか。`,
        correct: x.a,
        wrong: [...Q.map((y) => y.a), '最適温度', '補酵素'],
        explanation: `これは${x.a}である。${x.why}。`,
      };
    },
  },
  {
    id: 'a1-enzyme-conc',
    stage: 'a1',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '基質濃度と反応速度の関係を調べる実験で、酵素の濃度だけを2倍にした。最大速度 Vmax と Km はどうなるか。',
        correct: 'Vmax は2倍になり、Km は変わらない',
        wrong: ['Vmax も Km も2倍になる', 'Vmax は変わらず、Km は半分になる', 'Vmax は変わらず、Km は2倍になる', 'Vmax も Km も変わらない'],
        explanation: '酵素が2倍になると、同時にはたらける活性部位の数が2倍になるので Vmax は2倍になる。一方、1つ1つの酵素と基質の結合のしやすさは変わらないから、Km は変わらない。',
      };
    },
  },
];
