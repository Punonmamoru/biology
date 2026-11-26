// A24 種間競争と生態的地位（ガウゼのゾウリムシの実験の模式）
// 2種の個体数 N1・N2（相対値）。それぞれロジスティック型に増え、生態的地位（ニッチ）が重なるほど、相手からの影響が大きい。
//   dN1/dt ＝ r1·N1·(K1 − N1 − α12·N2)/K1
//   dN2/dt ＝ r2·N2·(K2 − N2 − α21·N1)/K2
// α は「相手1個体が、自分の何個体分の資源を使うか」。ここでは生態的地位の重なり（0〜1）に種ごとの係数をかける。
export const SPECIES = {
  caudatum: { name: 'ゾウリムシ', K: 100, r: 0.9 },
  aurelia: { name: 'ヒメゾウリムシ', K: 160, r: 0.7 },
  bursaria: { name: 'ミドリゾウリムシ', K: 80, r: 0.5 },
};
// 相手（partner）とゾウリムシの組合せ
export const PAIRS = {
  aurelia: { partner: 'aurelia', overlap: 1, on1: 0.8, on2: 0.9 },
  bursaria: { partner: 'bursaria', overlap: 0.25, on1: 1.0, on2: 1.0 },
};
export const DAYS = 24;
export const N0 = 2;

export function coefficients(pairKey, overlap) {
  const p = PAIRS[pairKey];
  return { a12: overlap * p.on1, a21: overlap * p.on2 };
}

// mixed：混合飼育なら true、単独飼育なら相手からの影響なし
export function run(pairKey, overlap, mixed = true, dt = 0.02, every = 10) {
  const s1 = SPECIES.caudatum;
  const s2 = SPECIES[PAIRS[pairKey].partner];
  const { a12, a21 } = mixed ? coefficients(pairKey, overlap) : { a12: 0, a21: 0 };
  const f = (x, y) => [
    (s1.r * x * (s1.K - x - a12 * y)) / s1.K,
    (s2.r * y * (s2.K - y - a21 * x)) / s2.K,
  ];
  let x = N0;
  let y = N0;
  const out = [];
  const steps = Math.round(DAYS / dt);
  for (let i = 0; i <= steps; i++) {
    if (i % every === 0) out.push({ t: i * dt, n1: x, n2: y });
    const [a1, b1] = f(x, y);
    const [a2, b2] = f(x + (a1 * dt) / 2, y + (b1 * dt) / 2);
    const [a3, b3] = f(x + (a2 * dt) / 2, y + (b2 * dt) / 2);
    const [a4, b4] = f(x + a3 * dt, y + b3 * dt);
    x = Math.max(0, x + (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4));
    y = Math.max(0, y + (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4));
  }
  return out;
}

// 長い時間ののちの結果：'coexist' | 'exclude1'（ゾウリムシが排除）| 'exclude2'（相手が排除）
export function outcome(pairKey, overlap) {
  const s1 = SPECIES.caudatum;
  const s2 = SPECIES[PAIRS[pairKey].partner];
  const { a12, a21 } = coefficients(pairKey, overlap);
  const ok1 = a12 * s2.K < s1.K; // 相手が K2 のときでも、ゾウリムシが増えられる
  const ok2 = a21 * s1.K < s2.K;
  if (ok1 && ok2) return 'coexist';
  if (!ok1 && ok2) return 'exclude1';
  if (ok1 && !ok2) return 'exclude2';
  return 'bistable';
}

// 資源の利用曲線（例：えさの大きさ）。2種の山の間の距離 d と重なり（共通部分の面積）の関係
function erfc(x) {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
  return x >= 0 ? y : 2 - y;
}
export function overlapOfDistance(d, sigma = 1) {
  return erfc(d / (2 * Math.SQRT2 * sigma));
}
export function distanceOfOverlap(ov, sigma = 1) {
  if (ov >= 1) return 0;
  let lo = 0;
  let hi = 20 * sigma;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (overlapOfDistance(mid, sigma) > ov) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export function useCurve(x, center, sigma = 1) {
  return Math.exp(-((x - center) ** 2) / (2 * sigma * sigma));
}
