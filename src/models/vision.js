// A18 視覚
// ① 暗順応：明るい所から暗い所に入ると、しだいに弱い光も感じられるようになる。
//   感じとれる最小の光の強さ（閾値、対数）の変化：はじめは錐体の感度が上がり（数分で頭打ち）、
//   約7〜10分後からは桿体の感度が錐体を上回り、30分ほどでさらに大きく下がる（屈曲点がある曲線）。
//   閾値（log、相対値）＝ min(錐体, 桿体)
export function coneLog(t) {
  return 2 + 2 * Math.exp(-t / 2);
}
export function rodLog(t) {
  return -1.5 + 11 * Math.exp(-t / 7);
}
export function thresholdLog(t) {
  return Math.min(coneLog(t), rodLog(t));
}
// 錐体と桿体の曲線が交わる時刻（屈曲点）
export function breakTime() {
  let lo = 0;
  let hi = 40;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (rodLog(m) > coneLog(m)) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

// ② 網膜の視細胞の分布（模式、千個/mm²）。角度は黄斑（中心窩）からの角度、正が鼻側。
//   錐体：黄斑に集中。桿体：黄斑にはほとんどなく、周辺に多い。盲斑（視神経乳頭）：鼻側 約15〜18° に視細胞がない。
export const BLIND = [13, 18.5];
export function cones(a) {
  if (a >= BLIND[0] && a <= BLIND[1]) return 0;
  return 5 + 145 * Math.exp(-Math.abs(a) / 1.5);
}
export function rods(a) {
  if (a >= BLIND[0] && a <= BLIND[1]) return 0;
  const x = Math.abs(a);
  return 160 * (1 - Math.exp(-x / 4)) * Math.exp(-Math.max(0, x - 20) / 40);
}

// ③ 盲斑の大きさ（相似の三角形）：網膜上の大きさ ＝ 紙の上で見えなくなる範囲 × 眼の節点から網膜までの距離 ÷ 眼から紙までの距離
export const EYE_DEPTH = 1.7; // cm（節点から網膜まで、目安）
export function retinaSize(onPaper, distance, depth = EYE_DEPTH) {
  return (onPaper * depth) / distance;
}
