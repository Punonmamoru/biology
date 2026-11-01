// A11 分子系統と分子時計
// 分子時計：ある遺伝子（タンパク質）では、アミノ酸（塩基）の置換が時間にほぼ比例して蓄積する。
//   2種が分岐してから t 年たつと、2つの系統それぞれで置換が起こるので、
//   2種の間の違いの数 D ≒ 2 × r × t（r：1つの系統で1年あたりに起こる置換の数）
//   → 分岐年代は違いの数に比例する：t₂ ＝ t₁ × D₂ ÷ D₁
// ここでは架空の生物 A〜D と、架空のタンパク質（アミノ酸 300 個）で考える。

export function diffs(t, rate) {
  return 2 * rate * t;
}
export function divergenceTime(D, rate) {
  return D / (2 * rate);
}
export function proportionalTime(t1, D1, D2) {
  return (t1 * D2) / D1;
}

// 系統樹：最も近い2種 pair（例 ['A','B']）が t1 に分岐し、残りの1種とは t2、D とは t3 に分岐した（百万年前、t1 ＜ t2 ＜ t3）。
// rate：1つの系統で百万年あたりに起こる置換の数。違いの数は整数に丸める。
export const SPECIES = ['A', 'B', 'C', 'D'];
export const pairKey = (x, y) => [x, y].sort().join('');
export function distanceMatrix({ pair = ['A', 'B'], t1, t2, t3, rate }) {
  const third = ['A', 'B', 'C'].find((x) => !pair.includes(x));
  const m = {};
  m[pairKey(pair[0], pair[1])] = Math.round(diffs(t1, rate));
  for (const p of pair) m[pairKey(p, third)] = Math.round(diffs(t2, rate));
  for (const p of ['A', 'B', 'C']) m[pairKey(p, 'D')] = Math.round(diffs(t3, rate));
  return m;
}

// 違いの数の表から、最も近い2つの組を順にまとめて系統樹を作る（UPGMA 法の考え方）
// 返り値：[{ members: ['A','B'], height: 違いの数 ÷ 2 }, ...]（まとめた順）
export function upgma(matrix, names = SPECIES) {
  let clusters = names.map((n) => ({ id: n, members: [n], height: 0 }));
  const dist = (c1, c2) => {
    let s = 0;
    for (const a of c1.members) for (const b of c2.members) s += matrix[pairKey(a, b)];
    return s / (c1.members.length * c2.members.length);
  };
  const steps = [];
  while (clusters.length > 1) {
    let best = null;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = dist(clusters[i], clusters[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    const a = clusters[best.i];
    const b = clusters[best.j];
    const merged = { id: `(${a.id},${b.id})`, members: [...a.members, ...b.members], height: best.d / 2, left: a, right: b };
    steps.push({ a: a.id, b: b.id, members: merged.members, d: best.d, height: best.d / 2 });
    clusters = clusters.filter((_, k) => k !== best.i && k !== best.j).concat(merged);
  }
  return { root: clusters[0], steps };
}

// 分子進化の速さの違い（教科書の例）：機能上の制約が小さい部分ほど速く変化する
export const RATE_ORDER = ['フィブリノペプチド', 'ヘモグロビン', 'シトクロム c', 'ヒストン H4'];
