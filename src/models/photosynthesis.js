// B4 光の強さと光合成
// 光合成速度 P(I) は非直角双曲線 θP² − (αI ＋ Pmax)P ＋ αI·Pmax ＝ 0 の小さいほうの解。
//   α：弱い光での傾き（光の強さに比例して増える割合）、Pmax：最大の光合成速度、θ：曲がり方（1に近いほど鋭く折れる）
// θ を1に近くとると、弱い光では P ≒ αI（直線）、強い光では P ＝ Pmax で明確に頭打ちになり、教科書の図の形になる。
// 見かけの光合成速度 ＝ P(I) − R（R：呼吸速度）
// 単位：光の強さ［キロルクス］、速度［CO₂吸収速度の相対値］
export const THETA = 0.995;
export const PLANTS = {
  sun: { name: '陽生植物', Pmax: 20, alpha: 1.25, R: 2 },
  shade: { name: '陰生植物', Pmax: 6, alpha: 1.25, R: 0.4 },
};

export function gross(p, I) {
  if (I <= 0) return 0;
  const b = p.alpha * I + p.Pmax;
  const disc = b * b - 4 * THETA * p.alpha * I * p.Pmax;
  return (b - Math.sqrt(Math.max(0, disc))) / (2 * THETA);
}

export function apparent(p, I) {
  return gross(p, I) - p.R;
}

// 二分法（f(lo) と f(hi) の符号が違うとき）
function solve(f, lo, hi) {
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

// 補償点：見かけの光合成速度 = 0（光合成速度 = 呼吸速度）
export function compensationPoint(p) {
  return solve((I) => apparent(p, I), 0, 1000);
}

// 光合成速度の傾き dP/dI（陰関数の微分）
export function slope(p, I) {
  const P = gross(p, I);
  return (p.alpha * (p.Pmax - P)) / (p.alpha * I + p.Pmax - 2 * THETA * P);
}

// 光飽和点：これ以上光を強くしても光合成速度が増えなくなる点。
// 曲線の傾きが弱い光での傾きのほぼ0（1%）まで小さくなった点を、図の上で「増えなくなる点」とした。
export const FLAT = 0.01;
export function saturationPoint(p) {
  return solve((I) => slope(p, I) - FLAT * p.alpha, 1e-6, 1000);
}

// 2本の見かけの光合成曲線の交点
export function crossingPoint(a, b, lo = 0, hi = 100) {
  return solve((I) => apparent(a, I) - apparent(b, I), lo, hi);
}
