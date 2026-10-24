// A3 個体群の成長
// ロジスティック成長 dN/dt = rN(K − N)/K の解：N(t) = K / (1 + ((K − N0)/N0)·e^(−rt))
export function logistic(t, N0, r, K) {
  return K / (1 + ((K - N0) / N0) * Math.exp(-r * t));
}
export function exponential(t, N0, r) {
  return N0 * Math.exp(r * t);
}
export function logisticRate(N, r, K) {
  return (r * N * (K - N)) / K;
}
// 個体数が K/2 に達する時刻（増加速度が最大になる時刻）
export function inflectionTime(N0, r, K) {
  if (N0 >= K / 2) return null;
  return Math.log((K - N0) / N0) / r;
}

// 被食者・捕食者（ロトカ・ヴォルテラ型）
//   dx/dt = a·x − b·x·y   （被食者：増殖 − 捕食される）
//   dy/dt = c·x·y − d·y   （捕食者：食べて増える − 死亡）
export const LV_DEFAULT = { a: 1, b: 0.1, c: 0.02, d: 0.5, x0: 40, y0: 6 };

export function lotkaVolterra(p, tEnd = 60, dt = 0.01, every = 10) {
  let x = p.x0;
  let y = p.y0;
  const f = (x_, y_) => [p.a * x_ - p.b * x_ * y_, p.c * x_ * y_ - p.d * y_];
  const out = [];
  const steps = Math.round(tEnd / dt);
  for (let i = 0; i <= steps; i++) {
    if (i % every === 0) out.push({ t: i * dt, x, y });
    const [a1, b1] = f(x, y);
    const [a2, b2] = f(x + (a1 * dt) / 2, y + (b1 * dt) / 2);
    const [a3, b3] = f(x + (a2 * dt) / 2, y + (b2 * dt) / 2);
    const [a4, b4] = f(x + a3 * dt, y + b3 * dt);
    x += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    y += (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
  }
  return out;
}

// 極大（山）の時刻
export function peakTimes(run, key) {
  const out = [];
  for (let i = 1; i < run.length - 1; i++) {
    if (run[i][key] > run[i - 1][key] && run[i][key] >= run[i + 1][key]) out.push(run[i].t);
  }
  return out;
}

// 標識再捕法：全体の個体数 ＝ 最初に標識した数 × 2回目の捕獲数 ÷ 2回目の中の標識個体数
export function markRecapture(M, C, R) {
  return (M * C) / R;
}
