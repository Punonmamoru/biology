// A22 DNAの複製（メセルソンとスタールの実験） の問題
import { fmt, gcd } from '../lib/format.js';
import { distinctNumbers } from './common.js';
import { bands, profile, molecules } from '../models/replication.js';
import { sample } from '../lib/series.js';

const ratio = (a, b) => {
  const g = gcd(a, b);
  return `${a / g}：${b / g}`;
};

export const A22 = [
  {
    id: 'a22-ratio-calc',
    stage: 'a22',
    level: 2,
    kind: 'calc',
    make(rng) {
      const g = rng.pick([2, 3, 4, 5]);
      const n = molecules(g);
      const correct = ratio(2, n - 2);
      const cands = [ratio(1, n - 1), ratio(1, n), ratio(1, g), ratio(1, g - 1), ratio(2, n), ratio(1, 1), ratio(1, 2 * n - 1)];
      return {
        text: `¹⁵N だけを含む培地で何世代も育てた大腸菌を、¹⁴N だけを含む培地に移して ${g} 回分裂させた。DNA を取り出して密度勾配遠心法で調べると、中間の重さの DNA と軽い DNA の量の比（中間：軽い）はいくらになるか。`,
        correct,
        wrong: cands.filter((c) => c !== correct),
        explanation: `${g} 回分裂すると DNA は ${n} 分子になり、半保存的複製では、もとの ¹⁵N の鎖を1本ずつ含む中間の DNA が2分子、残りの ${n - 2} 分子が軽い DNA となる。したがって中間：軽い ＝ 2：${n - 2} ＝ ${correct} である。もとの2本の ¹⁵N 鎖は分かれて別々の分子に入り、その後もずっと残るからである。`,
      };
    },
  },
  {
    id: 'a22-light-pct',
    stage: 'a22',
    level: 2,
    kind: 'calc',
    make(rng) {
      const g = rng.pick([2, 3, 4, 5]);
      const n = molecules(g);
      const ans = (100 * (n - 2)) / n;
      const d = distinctNumbers(ans, [100 * (n - 1) / n, 100 / n, 200 / n, 50, 100 * (1 - 1 / g), 100 * (n - 4) / n, 100, 100 * (n - 2) / (2 * n)], ' %', 3);
      return {
        text: `メセルソンとスタールの実験で、¹⁵N の DNA をもつ大腸菌を ¹⁴N の培地に移して ${g} 世代たった。全 DNA のうち、軽い DNA（2本鎖とも ¹⁴N）は何 % か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `DNA は ${n} 分子になり、そのうち中間の DNA が2分子なので、軽い DNA は (${n} − 2) ÷ ${n} × 100 ＝ ${fmt(ans, 3)} % となる。半保存的複製では、もとの ¹⁵N の鎖を含む分子の数は2のまま増えないからである。`,
      };
    },
  },
  {
    id: 'a22-strand-calc',
    stage: 'a22',
    level: 2,
    kind: 'calc',
    make(rng) {
      const g = rng.pick([1, 2, 3, 4]);
      const n = molecules(g);
      const ans = 100 / n;
      const d = distinctNumbers(ans, [200 / n, 100 / (2 * n), 100 / g, 50, 100 - 100 / n, 100 / (4 * n), 100 - 100 / (2 * n)], ' %', 4);
      return {
        text: `¹⁵N の DNA をもつ大腸菌を ¹⁴N の培地に移して ${g} 回分裂させた。すべての DNA の鎖（1本鎖として数える）のうち、¹⁵N を含む鎖は何 % か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `DNA は ${n} 分子、鎖は ${2 * n} 本になるが、¹⁵N の鎖ははじめの2本のままなので、2 ÷ ${2 * n} × 100 ＝ ${fmt(ans, 4)} % となる。複製では新しい鎖がすべて ¹⁴N でつくられ、もとの鎖は分解されずに残るからである。`,
      };
    },
  },
  {
    id: 'a22-band-graph',
    stage: 'a22',
    level: 2,
    kind: 'graph',
    make(rng) {
      const g = rng.pick([1, 2, 3]);
      const bs = bands(g, 'semi');
      const cands = ['移す前（0世代）', '1世代', '2世代', '3世代', '4世代'];
      return {
        text: '¹⁵N の DNA をもつ大腸菌を ¹⁴N の培地に移して育て、ある世代で DNA を取り出して密度勾配遠心法で調べると、図のようになった（山の高さは DNA の量の割合）。これは何世代目の結果か。',
        chart: {
          x: { min: -0.2, max: 1.2, label: 'DNA の密度', ticks: [{ v: 0, text: '軽い' }, { v: 0.5, text: '中間' }, { v: 1, text: '重い' }] },
          y: { min: 0, max: 1.15, label: 'DNA の量（割合）', step: 0.25, digits: 2 },
          series: [{ points: sample((x) => profile(bs, x), -0.2, 1.2, 300), color: 'c1', width: 3 }],
          alt: `バンド：${bs.map((b) => `${b.kind === 'light' ? '軽い' : '中間'} ${fmt(b.frac * 100, 0)}%`).join('、')}`,
        },
        correct: `${g}世代`,
        wrong: cands.filter((c) => c !== `${g}世代`),
        explanation: g === 1
          ? '中間の DNA だけなので1世代目である。半保存的複製では、1回の複製でできた2分子がどちらも「¹⁵N の古い鎖＋¹⁴N の新しい鎖」になるからである。'
          : `中間：軽い ＝ ${fmt(bs[1].frac * 100, 0)}：${fmt(bs[0].frac * 100, 0)} ＝ 2：${molecules(g) - 2} なので、DNA が ${molecules(g)} 分子になった ${g} 世代目である。中間の DNA はいつも2分子で、世代ごとに全体の分子数が2倍になるからである。`,
      };
    },
  },
  {
    id: 'a22-reject-cons',
    stage: 'a22',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '¹⁵N の DNA をもつ大腸菌を ¹⁴N の培地に移して1回分裂させたところ、DNA はすべて中間の重さになった。この結果から否定される複製のしかた（仮説）はどれか。',
        correct: '保存的複製（もとの2本鎖がそのまま残り、新しい2本鎖が別にできる）',
        wrong: ['半保存的複製（もとの鎖が1本ずつ新しい分子に受けつがれる）', '分散的複製（もとの鎖と新しい鎖が混ざり合う）', 'どの仮説も否定されない'],
        explanation: '保存的複製なら、1世代で重い DNA と軽い DNA が1：1でできるはずなので、中間だけという結果と合わない。分散的複製でも1世代ではすべて中間になるので、1世代の結果だけでは否定できないからである。',
      };
    },
  },
  {
    id: 'a22-reject-disp',
    stage: 'a22',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '¹⁵N の DNA をもつ大腸菌を ¹⁴N の培地に移して1回分裂させると、DNA はすべて中間の重さだった。さらに2回目の分裂のあとでは、中間の DNA と軽い DNA が1：1で見られた。1回目の結果では否定できず、2回目の結果で初めて否定される複製のしかた（仮説）はどれか。',
        correct: '分散的複製（もとの鎖と新しい鎖が混ざり合う）',
        wrong: ['半保存的複製（もとの鎖が1本ずつ新しい分子に受けつがれる）', '保存的複製（もとの2本鎖がそのまま残り、新しい2本鎖が別にできる）', 'どの仮説も否定されない'],
        explanation: '分散的複製でも1世代ではすべて中間になるので1回目の結果では否定できないが、2世代ではどの分子も ¹⁵N を同じ割合（1/4）ずつ含み、中間と軽いの間に1本のバンドだけができるはずである。実際には中間と軽いの2本に分かれたので、2回目の結果で分散的複製が否定される。保存的複製は、1世代で重いと軽いの2本になるはずなので、1回目の結果ですでに否定されているからである。',
      };
    },
  },
  {
    id: 'a22-reverse-calc',
    stage: 'a22',
    level: 3,
    kind: 'calc',
    make(rng) {
      const g = rng.pick([2, 3, 4]);
      const n = molecules(g);
      const correct = ratio(2, n - 2);
      const cands = [ratio(1, n - 1), ratio(1, n), ratio(1, g), ratio(n - 2, 2), ratio(1, 1), ratio(2, n)].filter((c) => c !== correct);
      return {
        text: `¹⁴N だけを含む培地で育てた大腸菌（DNA はすべて軽い）を、¹⁵N だけを含む培地に移して ${g} 回分裂させた。中間の重さの DNA と重い DNA の量の比（中間：重い）はいくらか。`,
        correct,
        wrong: cands,
        explanation: `今度は新しい鎖が ¹⁵N でつくられるので、もとの ¹⁴N の鎖を1本ずつ含む中間の DNA が2分子、残りの ${n - 2} 分子が重い DNA となり、中間：重い ＝ ${correct} である。半保存的複製では、どちらの向きに培地を移しても、もとの2本の鎖は分かれて2つの分子に残るからである。`,
      };
    },
  },
  {
    id: 'a22-semi-term',
    stage: 'a22',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['semi', 'nitrogen']);
      if (which === 'semi') {
        return {
          text: 'DNA が複製されるとき、もとの2本鎖がほどけてそれぞれが鋳型となり、新しくできた2本鎖 DNA には、もとの鎖が1本ずつ受けつがれる。このような複製のしかたを何というか。',
          correct: '半保存的複製',
          wrong: ['保存的複製', '分散的複製', '転写', '翻訳'],
          explanation: 'これは半保存的複製で、メセルソンとスタールが ¹⁵N を使った実験で確かめた。もとの鎖の塩基に相補的な塩基をもつヌクレオチドがつながって新しい鎖ができるので、もとと同じ塩基配列の DNA が2つできる。',
        };
      }
      return {
        text: 'メセルソンとスタールの実験で、¹⁵N を使って DNA に目印をつけることができたのはなぜか。',
        correct: 'DNA の塩基が窒素を含むから',
        wrong: ['DNA の糖（デオキシリボース）が窒素を含むから', 'DNA のリン酸が窒素を含むから', 'DNA には窒素が含まれず、まわりのタンパク質に目印がつくから'],
        explanation: 'DNA のヌクレオチドは糖・リン酸・塩基からなり、窒素を含むのは塩基である。¹⁵N を取り込んだ DNA は ¹⁴N の DNA より密度が大きいので、密度勾配遠心法で位置の違いとして区別できるからである。',
      };
    },
  },
  {
    id: 'a22-molecules-calc',
    stage: 'a22',
    level: 1,
    kind: 'calc',
    make(rng) {
      const g = rng.pick([3, 4, 5, 6]);
      const n = molecules(g);
      const ask = rng.pick(['hybrid', 'light']);
      const ans = ask === 'hybrid' ? 2 : n - 2;
      const d = distinctNumbers(ans, [1, 2, 4, n, n - 1, n / 2, g, 2 * g], ' 分子', 0);
      return {
        text: `¹⁵N の DNA をもつ大腸菌1個（DNA 1分子とする）を ¹⁴N の培地に移して ${g} 回分裂させ、DNA が ${n} 分子になった。このうち${ask === 'hybrid' ? '中間の重さの DNA' : '軽い DNA'}は何分子か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `もとの ¹⁵N の鎖2本は、1本ずつ別の DNA 分子に受けつがれるので、中間の DNA は世代によらず2分子、軽い DNA は ${n} − 2 ＝ ${n - 2} 分子である。したがって答えは ${ans} 分子で、¹⁵N の鎖は分解されずに残り、新しい鎖はすべて ¹⁴N でつくられるからである。`,
      };
    },
  },
];
