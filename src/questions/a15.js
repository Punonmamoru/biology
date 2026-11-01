// A15 PCR と電気泳動 の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers, assignmentQuestion } from './common.js';
import { copies, distanceOf, LADDER, fragments } from '../models/biotech.js';

export const A15 = [
  {
    id: 'a15-copies',
    stage: 'a15',
    level: 1,
    kind: 'calc',
    make(rng) {
      const init = rng.pick([1, 2, 5, 10]);
      const n = rng.pick([3, 4, 5, 6, 8, 10]);
      const ans = copies(init, n);
      const d = distinctNumbers(ans, [init * 2 * n, init * n * n, copies(init, n - 1), copies(init, n + 1), init + Math.pow(2, n)], ' 分子', 0);
      return {
        text: `2本鎖 DNA が ${init} 分子ある。PCR法で ${n} サイクルの反応を行うと、目的の DNA 領域は理論上何分子になるか（1サイクルで2倍になるものとする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `1サイクルごとに2倍になるので、${init} × 2 の ${n} 乗 ＝ ${ans.toLocaleString('ja-JP')} 分子となる。1サイクルで2本鎖が1本ずつに分かれ、それぞれを鋳型として新しい鎖が合成されるからである。`,
      };
    },
  },
  {
    id: 'a15-cycles',
    stage: 'a15',
    level: 2,
    kind: 'calc',
    make(rng) {
      const k = rng.pick([10, 20, 30]);
      const target = Math.pow(2, k);
      const label = { 10: '約1000倍（2¹⁰ ＝ 1024倍）', 20: '約100万倍（2²⁰ ≒ 10⁶倍）', 30: '約10億倍（2³⁰ ≒ 10⁹倍）' }[k];
      const d = distinctNumbers(k, [k / 2, k * 2, Math.round(Math.log10(target)), k + 10, k - 5], ' サイクル', 0);
      return {
        text: `PCR法で、目的の DNA を${label.split('（')[0]}に増やしたい。理論上、少なくとも何サイクルの反応が必要か（1サイクルで2倍になるものとする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `n サイクルで 2ⁿ 倍になるので、${label}より ${k} サイクル必要である。2¹⁰ ＝ 1024 ≒ 10³ なので、10サイクルごとにおよそ1000倍になると覚えておくと計算しやすいからである。`,
      };
    },
  },
  {
    id: 'a15-steps',
    stage: 'a15',
    level: 1,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['約95℃', '約55〜60℃', '約72℃'], ['熱変性', 'アニーリング（プライマーの結合）', '伸長（DNAの合成）']);
      return {
        text: 'PCR法の1サイクルの各段階の温度と、そのときに起こることの組合せとして正しいものはどれか。',
        correct: q.correct,
        wrong: q.wrong,
        explanation: '約95℃で2本鎖が1本ずつに分かれ（熱変性）、約55〜60℃に下げるとプライマーが相補的な部分に結合し（アニーリング）、約72℃で DNAポリメラーゼが DNA を合成する（伸長）。温度を変えるだけで各段階を切りかえられるので、これを自動でくり返して DNA を増やすのである。',
      };
    },
  },
  {
    id: 'a15-polymerase',
    stage: 'a15',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: 'PCR法で使う DNAポリメラーゼとして、好熱菌などから得た耐熱性の酵素が使われる理由として最も適当なものはどれか。',
        correct: '熱変性のたびに約95℃に加熱しても失活しないので、くり返し使えるから',
        wrong: ['高温でないと DNA の2本鎖が合成されないから', '耐熱性の酵素はプライマーがなくても DNA を合成できるから', '耐熱性の酵素は RNA を鋳型にして DNA をつくれるから'],
        explanation: 'ふつうの酵素は約95℃の熱変性で失活してしまい、サイクルごとに加え直す必要がある。好熱菌などから得た耐熱性の DNAポリメラーゼは高温でも失活しないので、反応液に一度入れればサイクルをくり返せるからである。',
      };
    },
  },
  {
    id: 'a15-direction',
    stage: 'a15',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'アガロースゲル電気泳動での DNA 断片の移動について正しいものはどれか。',
        correct: 'DNA は負の電荷をもつので陽極側へ移動し、短い断片ほど遠くまで移動する',
        wrong: ['DNA は負の電荷をもつので陽極側へ移動し、長い断片ほど遠くまで移動する', 'DNA は正の電荷をもつので陰極側へ移動し、短い断片ほど遠くまで移動する', 'DNA は電荷をもたないので、断片の長さに関係なく同じ距離だけ移動する'],
        explanation: 'DNA はリン酸を含むので負の電荷をもち、電圧をかけると陽極（＋）側へ移動する。ゲルの網目の中では短い断片ほど通り抜けやすいので、一定時間で遠くまで移動する。',
      };
    },
  },
  {
    id: 'a15-standard',
    stage: 'a15',
    level: 3,
    kind: 'graph',
    make(rng) {
      const bp = rng.pick([700, 1500, 2500, 4000]);
      const d = distanceOf(bp);
      const lpts = [];
      for (let l = 200; l <= 12000; l *= 1.05) lpts.push([Math.log10(l), distanceOf(l)]);
      const dd = distinctNumbers(bp, [bp * 2, bp / 2, Math.round(d * 10), bp * 10, 10000 - bp], ' 塩基対', 0);
      return {
        text: `図は、長さのわかっている DNA 断片（マーカー：◆）の移動距離から作った検量線である。同じゲルで電気泳動した試料の DNA 断片は ${fmt(d, 1)} mm 移動していた。この断片の長さはおよそ何塩基対か。`,
        chart: {
          x: { min: Math.log10(200), max: Math.log10(12000), label: '断片の長さ（塩基対・対数目盛り）', ticks: [250, 500, 1000, 2000, 5000, 10000].map((v) => ({ v: Math.log10(v), text: v.toLocaleString('ja-JP') })) },
          y: { min: 0, max: 80, label: '移動距離（mm）', step: 10 },
          series: [{ points: lpts, color: 'c4', width: 2 }],
          markers: LADDER.map((l) => ({ x: Math.log10(l), y: distanceOf(l), color: 'c4', shape: 'diamond' })),
          hlines: [{ y: d, color: 'c2', dash: 'dash', label: `${fmt(d, 1)} mm`, align: 'right' }],
          alt: '検量線',
        },
        correct: dd.correct,
        wrong: dd.wrong,
        explanation: `移動距離 ${fmt(d, 1)} mm の横線と検量線の交点の横軸を読むと、約 ${bp.toLocaleString('ja-JP')} 塩基対である。移動距離は断片の長さの対数に対してほぼ直線的に変わるので、長さのわかっているマーカーと比べれば、未知の断片の長さを推定できるからである。`,
      };
    },
  },
  {
    id: 'a15-restriction',
    stage: 'a15',
    level: 3,
    kind: 'calc',
    make(rng) {
      const len = rng.pick([4000, 5000, 6000, 8000]);
      const a = rng.pick([500, 1000, 1500]);
      const b = a + rng.pick([1000, 1500, 2000, 2500]);
      if (b >= len || b - a === len / 2) return this.make(rng); // 2本が同じ長さになる組合せは使わない
      const frs = fragments(len, [a, b]);
      const ask = rng.pick(['short', 'long']);
      const ans = ask === 'short' ? Math.min(...frs) : Math.max(...frs);
      const d = distinctNumbers(ans, [len - a, len - b, a, b, len / 2, len], ' 塩基対', 0);
      return {
        text: `全長 ${len.toLocaleString('ja-JP')} 塩基対の環状のプラスミドに、制限酵素 X の切断部位が2か所（基準点から ${a.toLocaleString('ja-JP')} 塩基対と ${b.toLocaleString('ja-JP')} 塩基対の位置）ある。X で完全に切断して電気泳動すると、${ask === 'short' ? '最も遠くまで移動する' : '移動距離が最も小さい'}断片は何塩基対か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `環状の DNA を2か所で切ると断片は2本で、${(b - a).toLocaleString('ja-JP')} 塩基対と ${len.toLocaleString('ja-JP')} − ${(b - a).toLocaleString('ja-JP')} ＝ ${(len - (b - a)).toLocaleString('ja-JP')} 塩基対になる。${ask === 'short' ? '短い断片ほど遠くまで移動する' : '長い断片ほど移動距離が小さい'}ので、答えは ${ans.toLocaleString('ja-JP')} 塩基対である。`,
      };
    },
  },
  {
    id: 'a15-restriction-term',
    stage: 'a15',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'DNA の特定の塩基配列を認識して切断する酵素を何というか。',
          correct: '制限酵素',
          wrong: ['DNAリガーゼ', 'DNAポリメラーゼ', 'RNAポリメラーゼ', '逆転写酵素'],
          explanation: 'これは制限酵素である。なお、制限酵素はもともと細菌がもつ酵素で、侵入したウイルスの DNA を切断して身を守っている。特定の塩基配列だけで切断するので、遺伝子組換えで DNA を切り出す道具として使われる。',
        };
      }
      return {
        text: '遺伝子組換えで、切り出した DNA 断片をプラスミドなどにつなぐ酵素を何というか。',
        correct: 'DNAリガーゼ',
        wrong: ['制限酵素', 'DNAポリメラーゼ', 'RNAポリメラーゼ', 'ヘリカーゼ'],
        explanation: 'これは DNAリガーゼである。なお、同じ制限酵素で切断した DNA どうしは切り口の塩基配列が相補的なので、DNAリガーゼでつなぐと組換え DNA をつくることができる。',
      };
    },
  },
];
