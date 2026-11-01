// A14 シナプスと興奮の統合
// シナプス後細胞の膜電位（模式）：静止電位 −70 mV、閾値 −55 mV。
//   興奮性シナプス後電位（EPSP）：1回で約 ＋10 mV の脱分極（Na⁺ などが流入）。
//   抑制性シナプス後電位（IPSP）：1回で約 −6 mV の過分極（Cl⁻ が流入するなど）。
// 1回の電位変化は数ミリ秒〜十数ミリ秒で消えていく。間隔が短いと重なり合う（時間的加重）。
// 複数のシナプスから同時に入力があると足し合わされる（空間的加重）。
// 和が閾値に達すると、シナプス後細胞に活動電位が生じる。
export const REST = -70;
export const THRESHOLD = -55;
export const EPSP = 10;
export const IPSP = -6;
export const RISE = 4; // ms（ピークまでの時間。そのあと十数ミリ秒で消えていく）
export const T_END = 50; // 表示する時間 ms

// 1回のシナプス後電位の形（ピークで1）
export function psp(t) {
  if (t <= 0) return 0;
  const x = t / RISE;
  return x * Math.exp(1 - x);
}

// inputs：[{ t: 時刻 ms, amp: mV }]
export function potential(t, inputs) {
  return REST + inputs.reduce((a, i) => a + i.amp * psp(t - i.t), 0);
}

// 閾値に初めて達する時刻（達しなければ null）
export function firstCrossing(inputs, dt = 0.05) {
  for (let t = 0; t <= T_END; t += dt) if (potential(t, inputs) >= THRESHOLD) return t;
  return null;
}

// 入力の組み立て：興奮性ニューロンA（n回、間隔 interval ms）、興奮性ニューロンB（Aの1回目と同時に1回）、抑制性ニューロンC（Aの1回目と同時に1回）
export function buildInputs({ nA = 1, interval = 5, useB = false, useC = false, t0 = 5 }) {
  const inputs = [];
  for (let i = 0; i < nA; i++) inputs.push({ t: t0 + i * interval, amp: EPSP, from: 'A' });
  if (useB) inputs.push({ t: t0, amp: EPSP, from: 'B' });
  if (useC) inputs.push({ t: t0, amp: IPSP, from: 'C' });
  return inputs;
}

// 同時に入力したときの膜電位のピーク（単純な足し算）
export function summedPeak(nE, nI) {
  return REST + nE * EPSP + nI * IPSP;
}
