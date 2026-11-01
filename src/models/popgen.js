// A6 集団遺伝（ハーディー・ワインベルグの法則と遺伝的浮動）
// 対立遺伝子 A の遺伝子頻度を p、a の遺伝子頻度を q（p ＋ q ＝ 1）とすると、自由交配のとき
// 次の世代の遺伝子型頻度は AA : Aa : aa ＝ p² : 2pq : q²（ハーディー・ワインベルグの法則）。
export function genotypeFreq(p) {
  const q = 1 - p;
  return { AA: p * p, Aa: 2 * p * q, aa: q * q };
}

// 遺伝子型の個体数から遺伝子頻度を求める：p ＝ (2×AA ＋ Aa) ÷ (2 × 個体数)
export function alleleFreqFromCounts(nAA, nAa, naa) {
  const n = nAA + nAa + naa;
  return (2 * nAA + nAa) / (2 * n);
}
export function alleleFreqFromGenotypeFreq(fAA, fAa) {
  return fAA + fAa / 2;
}

// 潜性形質（aa）の個体の割合から q を求める（ハーディー・ワインベルグの法則が成り立つとき）
export function qFromRecessive(fraction) {
  return Math.sqrt(fraction);
}

// 遺伝的浮動のシミュレーション（ライト・フィッシャー型）
// 個体数 N の集団の 2N 個の遺伝子から、次の世代の 2N 個を無作為に選び直す。
// 自然選択・突然変異・移入・移出はないとする（遺伝子頻度の変化は偶然だけで起こる）。
function binomial(n, p, rng) {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  if (n <= 200) {
    let k = 0;
    for (let i = 0; i < n; i++) if (rng.next() < p) k++;
    return k;
  }
  // 大きい n は正規近似（集団が大きいときは変動が小さいことを表すのに十分）
  const u1 = Math.max(rng.next(), 1e-12);
  const u2 = rng.next();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const k = Math.round(n * p + z * Math.sqrt(n * p * (1 - p)));
  return Math.min(n, Math.max(0, k));
}

export function drift(N, p0, generations, rng) {
  const out = [p0];
  let p = p0;
  for (let g = 0; g < generations; g++) {
    p = binomial(2 * N, p, rng) / (2 * N);
    out.push(p);
  }
  return out;
}

export function driftLines(N, p0, generations, lines, rng) {
  return Array.from({ length: lines }, () => drift(N, p0, generations, rng));
}

// 固定（p＝1）・消失（p＝0）した集団の数
export function fixationSummary(runs) {
  const last = runs.map((r) => r[r.length - 1]);
  return { fixed: last.filter((p) => p === 1).length, lost: last.filter((p) => p === 0).length };
}
