// B5 生態系のバランス（ラッコ・ウニ・ケルプ）
// ケルプ k：ロジスティック成長し、ウニに食べられる
// ウニ u ：ケルプを食べて増え、ラッコに食べられる
// ラッコ o：人間による乱獲（スライダー）で外から決める
//   dk/dt = rk·k(1 − k) − a·k·u
//   du/dt = b·a·k·u − c·u·o − m·u
// 量はすべて相対値。ラッコの数が変わる時刻 tHunt 以降、ラッコは新しい値へなめらかに移る。
export const K = { rk: 0.5, a: 1, b: 0.6, c: 0.4, m: 0.1 };

export function otterAt(t, o0, o1, tHunt, tau = 3) {
  if (t <= tHunt) return o0;
  return o1 + (o0 - o1) * Math.exp(-(t - tHunt) / tau);
}

// 平衡状態（ラッコの量 o のとき）
export function equilibrium(o) {
  let k = (K.c * o + K.m) / (K.b * K.a);
  if (k >= 1) return { k: 1, u: 0 };
  return { k, u: (K.rk * (1 - k)) / K.a };
}

export function simulate({ o0 = 1, o1 = 1, tHunt = 20, tEnd = 150, dt = 0.1 } = {}) {
  const e = equilibrium(o0);
  let k = e.k;
  let u = Math.max(e.u, 0.02);
  const out = [];
  const f = (t, k_, u_) => {
    const o = otterAt(t, o0, o1, tHunt);
    return [K.rk * k_ * (1 - k_) - K.a * k_ * u_, K.b * K.a * k_ * u_ - K.c * u_ * o - K.m * u_];
  };
  const every = Math.round(0.5 / dt);
  let i = 0;
  for (let t = 0; t <= tEnd + 1e-9; t += dt, i++) {
    if (i % every === 0) out.push({ t, k, u, o: otterAt(t, o0, o1, tHunt) });
    const [a1, b1] = f(t, k, u);
    const [a2, b2] = f(t + dt / 2, k + (a1 * dt) / 2, u + (b1 * dt) / 2);
    const [a3, b3] = f(t + dt / 2, k + (a2 * dt) / 2, u + (b2 * dt) / 2);
    const [a4, b4] = f(t + dt, k + a3 * dt, u + b3 * dt);
    k += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    u += (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
    k = Math.max(k, 1e-6);
    u = Math.max(u, 1e-6);
  }
  return out;
}

// 表示用の相対値（0〜100）
export const SCALE = { k: 100, u: 150, o: 100 };
