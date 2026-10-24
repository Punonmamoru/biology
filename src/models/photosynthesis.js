// B4 光の強さと光合成
// 光合成速度 P(I) = Pmax·I / (K + I)、見かけの光合成速度 = P(I) − R（R：呼吸速度）
// 単位：光の強さ［キロルクス］、速度［CO₂吸収速度の相対値］
export const PLANTS = {
  sun: { name: '陽生植物', Pmax: 20, K: 6, R: 4 },
  shade: { name: '陰生植物', Pmax: 6, K: 1.5, R: 0.6 },
};
export const SAT_FRACTION = 0.9; // 光飽和点の目安：光合成速度が Pmax の90%に達する光の強さ

export function gross(p, I) {
  return (p.Pmax * I) / (p.K + I);
}

export function apparent(p, I) {
  return gross(p, I) - p.R;
}

// 補償点：見かけの光合成速度 = 0（光合成速度 = 呼吸速度）
export function compensationPoint(p) {
  return (p.R * p.K) / (p.Pmax - p.R);
}

// 光飽和点（このモデルでは Pmax の90%に達する光の強さ）
export function saturationPoint(p) {
  return (SAT_FRACTION * p.K) / (1 - SAT_FRACTION);
}

// 2本の見かけの光合成曲線の交点（二分法）
export function crossingPoint(a, b, lo = 0, hi = 100) {
  const f = (I) => apparent(a, I) - apparent(b, I);
  let fl = f(lo);
  if (fl * f(hi) > 0) return null;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    const fm = f(m);
    if (fl * fm <= 0) hi = m;
    else {
      lo = m;
      fl = fm;
    }
  }
  return (lo + hi) / 2;
}
