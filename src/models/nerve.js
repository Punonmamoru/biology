// A4 興奮の伝導
// 活動電位の波形は、教科書の図の目安（静止電位 約−70 mV、ピーク 約＋40 mV、1〜2ミリ秒で静止電位にもどる）を
// 単調3次補間でなめらかにつないだ模式。単位：膜電位［mV］（細胞外を基準にした細胞内の電位）、時間［ミリ秒］。
import { monotoneCubic } from '../lib/interp.js';

export const REST = -70; // 静止電位
export const PEAK = 40; // 活動電位のピーク
export const THRESHOLD = -55; // 閾値に達したときの膜電位
export const UNDERSHOOT = -80; // 再分極のあと、一時的に静止電位より低くなる（過分極）
export const T_STIM = 1; // 刺激を与える時刻［ms］
export const T_END = 6; // 表示する時間［ms］
export const THRESHOLD_STIM = 10; // 1本の神経繊維が興奮する最小の刺激の強さ（相対値）

// 閾値以上のときの波形の目安の点［時刻 ms, 膜電位 mV］
const SPIKE_KNOTS = [
  [0, REST],
  [T_STIM, REST],
  [T_STIM + 0.25, THRESHOLD], // 刺激で閾値まで脱分極
  [T_STIM + 0.6, PEAK], // ナトリウムチャネルが開き、Na⁺ が流入して急に脱分極（内側が正に逆転）
  [T_STIM + 1.4, REST], // カリウムチャネルが開き、K⁺ が流出して再分極
  [T_STIM + 1.9, UNDERSHOOT], // 一時的に静止電位より低くなる
  [T_STIM + 4, REST],
  [T_END, REST],
];
const spikeCurve = monotoneCubic(SPIKE_KNOTS);

// 区間の目印（図の色分け・問題用）
export const PHASES = {
  rest: { name: '静止電位', from: 0, to: T_STIM },
  depol: { name: '脱分極', from: T_STIM, to: T_STIM + 0.6 },
  repol: { name: '再分極', from: T_STIM + 0.6, to: T_STIM + 1.4 },
  after: { name: '過分極（一時的に静止電位より低くなる）', from: T_STIM + 1.4, to: T_STIM + 4 },
};
export const PEAK_TIME = T_STIM + 0.6;

// 1本の神経繊維の膜電位。stim：刺激の強さ（相対値）、threshold：その繊維が興奮する最小の刺激の強さ
// 閾値未満：刺激の強さに応じた小さな脱分極（閾値の膜電位には届かず、すぐもとにもどる）
// 閾値以上：刺激の強さに関係なく、同じ大きさの活動電位（全か無かの法則）
export function membrane(t, stim, threshold = THRESHOLD_STIM) {
  if (stim >= threshold) return spikeCurve(t);
  if (t <= T_STIM || stim <= 0) return REST;
  const amp = (THRESHOLD - REST) * 0.9 * (stim / threshold); // 閾値の膜電位の手前まで
  const tau = 0.35;
  const x = (t - T_STIM) / tau;
  return REST + amp * x * Math.exp(1 - x);
}

export function fires(stim, threshold = THRESHOLD_STIM) {
  return stim >= threshold;
}

// 活動電位の大きさ（静止電位からピークまで）
export function amplitude(rest = REST, peak = PEAK) {
  return peak - rest;
}

// 神経（多数の神経繊維の束）：繊維ごとに閾値が違う。興奮した繊維の数の割合［0〜1］
// 閾値は THRESHOLD_STIM 〜 THRESHOLD_STIM×NERVE_SPREAD の範囲にほぼ均等に分布するとする
export const NERVE_SPREAD = 3;
export const NERVE_FIBERS = 20;
export function nerveFiberThresholds(n = NERVE_FIBERS) {
  return Array.from({ length: n }, (_, i) => THRESHOLD_STIM * (1 + ((NERVE_SPREAD - 1) * i) / (n - 1)));
}
export function nerveResponse(stim, n = NERVE_FIBERS) {
  return nerveFiberThresholds(n).filter((th) => stim >= th).length / n;
}

// 伝導速度：2点で刺激して、筋肉が収縮しはじめるまでの時間の差から求める
//   速度［m/s］＝ 2点間の距離［mm］÷ 時間の差［ms］（1 mm/ms ＝ 1 m/s）
export function velocity(d1mm, t1ms, d2mm, t2ms) {
  return Math.abs(d1mm - d2mm) / Math.abs(t1ms - t2ms);
}
// 刺激してから筋肉が収縮しはじめるまでの時間［ms］＝ 伝導の時間 ＋ 神経筋接合部での伝達と筋肉の収縮開始までの時間
export function latency(dmm, vms, tRest) {
  return dmm / vms + tRest;
}
