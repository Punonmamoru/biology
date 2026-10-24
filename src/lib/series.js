// グラフ用の点列を作る純粋関数（DOM に依存しないので Node の検証でも使える）
export function sample(f, x0, x1, n = 160) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const xv = x0 + ((x1 - x0) * i) / n;
    pts.push([xv, f(xv)]);
  }
  return pts;
}

// 点列を間引く（表示用）
export function thin(points, maxN = 240) {
  if (points.length <= maxN) return points;
  const step = (points.length - 1) / (maxN - 1);
  const out = [];
  for (let i = 0; i < maxN; i++) out.push(points[Math.round(i * step)]);
  return out;
}
