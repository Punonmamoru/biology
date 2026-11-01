// 単調3次補間（フリッチュ・カールソン法）。目安の点を、行き過ぎ（オーバーシュート）のない
// なめらかな曲線（1階微分まで連続）でつなぐ。DOM に依存しない純粋関数。
// knots：x の昇順に並んだ [x, y] の配列。範囲外は端の値で一定にする。
export function monotoneCubic(knots) {
  const n = knots.length;
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(knots[i + 1][0] - knots[i][0]);
    d.push((knots[i + 1][1] - knots[i][1]) / h[i]);
  }
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m.push(0);
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]));
    }
  }
  m.push(d[n - 2]);
  return (x) => {
    if (x <= knots[0][0]) return knots[0][1];
    if (x >= knots[n - 1][0]) return knots[n - 1][1];
    let i = 0;
    while (i < n - 2 && x > knots[i + 1][0]) i++;
    const t = (x - knots[i][0]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * knots[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * knots[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
