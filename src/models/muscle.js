// A10 筋収縮
// ① 刺激の頻度と収縮（カエルの腓腹筋を想定した模式）
//   1回の刺激による収縮（単収縮）は約0.1秒：潜伏期 約0.01秒 → 収縮期 約0.04秒 → 弛緩期 約0.05秒。
//   刺激の間隔が単収縮の時間より短いと、収縮が重なり合って大きくなる（不完全強縮 → 完全強縮）。
//   重なり合いは「活性化の和 S」を張力に変換して表す：張力 ＝ T_MAX × (1 − e^(−S/C))（筋が出せる張力には上限がある）
export const LATENT = 0.01; // 潜伏期［秒］
export const T_CONTRACT = 0.04; // 収縮期［秒］
export const T_RELAX = 0.05; // 弛緩期［秒］（単収縮は合計 約0.1秒）
export const T_MAX = 1; // 張力の上限（相対値）
export const C = 4; // 単収縮のピークが上限の2〜3割になるように決めた値

// 1回の刺激による活性化（刺激後 t 秒）：潜伏期のあと sin² の形で上がり、弛緩期に cos² の形で下がって 0.1 秒で0にもどる
export function twitchActivation(t) {
  const x = t - LATENT;
  if (x <= 0) return 0;
  if (x < T_CONTRACT) return Math.pow(Math.sin((Math.PI / 2) * (x / T_CONTRACT)), 2);
  const y = x - T_CONTRACT;
  if (y < T_RELAX) return Math.pow(Math.cos((Math.PI / 2) * (y / T_RELAX)), 2);
  return 0;
}

export function stimulusTimes(freq, duration) {
  if (freq <= 0) return [0];
  const out = [];
  for (let t = 0; t < duration - 1e-9; t += 1 / freq) out.push(Number(t.toFixed(6)));
  return out;
}

export function tension(t, stimuli) {
  const S = stimuli.reduce((a, s) => a + (t >= s ? twitchActivation(t - s) : 0), 0);
  return T_MAX * (1 - Math.exp(-S / C));
}

export const SINGLE_PEAK = T_MAX * (1 - Math.exp(-1 / C));

// 刺激を続けたときの後半の張力のゆれ（最大と最小の差）から、収縮のようすを判定する
export function contractionType(freq, duration = 1) {
  const st = stimulusTimes(freq, duration);
  const ts = [];
  for (let t = duration * 0.5; t <= duration; t += 0.0005) ts.push(tension(t, st));
  const max = Math.max(...ts);
  const min = Math.min(...ts);
  if (min < SINGLE_PEAK * 0.05) return { type: 'single', max, min };
  // 図で見てぎざぎざがわからない程度（ゆれ1%未満）を完全強縮とする
  if ((max - min) / max < 0.01) return { type: 'complete', max, min };
  return { type: 'incomplete', max, min };
}
export const TYPE_NAME = { single: '単収縮のくり返し', incomplete: '不完全強縮', complete: '完全強縮' };

// ② サルコメア（筋節）の長さと張力（滑り説。カエルの骨格筋の測定にもとづく教科書の図の目安）
//   太いフィラメント（ミオシン）1.6 μm、細いフィラメント（アクチン）は Z膜から各 1.0 μm、
//   太いフィラメントの中央の、ミオシン頭部のない部分 0.2 μm。
export const MYOSIN = 1.6;
export const ACTIN = 1.0;
export const BARE = 0.2;
export const L_PLATEAU_LO = 2 * ACTIN; // 2.0：これより短いと細いフィラメントどうしが重なる
export const L_PLATEAU_HI = 2 * ACTIN + BARE; // 2.2：これより長いと重なりが減る
export const L_ZERO = 2 * ACTIN + MYOSIN; // 3.6：重なりがなくなり張力0
export const L_MIN = 1.3; // これより短いと張力はほぼ0（模式）

// 最大張力に対する割合［0〜1］
export function sarcomereTension(L) {
  if (L >= L_ZERO) return 0;
  if (L >= L_PLATEAU_HI) return (L_ZERO - L) / (L_ZERO - L_PLATEAU_HI);
  if (L >= L_PLATEAU_LO) return 1;
  // 2.0 μm より短い側：細いフィラメントどうしが重なり、1.6 μm より短いと太いフィラメントが Z膜にあたって急に下がる（模式）
  if (L >= MYOSIN) return 1 - (0.15 * (L_PLATEAU_LO - L)) / (L_PLATEAU_LO - MYOSIN);
  if (L > L_MIN) return 0.85 * (L - L_MIN) / (MYOSIN - L_MIN);
  return 0;
}

// 明帯・暗帯・H帯の長さ［μm］
//   暗帯（A帯）＝ 太いフィラメントの長さ（収縮しても変わらない）
//   明帯（I帯）＝ サルコメアの長さ − 太いフィラメントの長さ（1つのサルコメアの中の明帯の合計）
//   H帯 ＝ 太いフィラメントのうち、細いフィラメントと重なっていない部分 ＝ サルコメアの長さ − 2 × 細いフィラメントの長さ（0未満なら0）
export function bands(L) {
  const A = Math.min(MYOSIN, L);
  const I = Math.max(0, L - MYOSIN);
  const H = Math.min(MYOSIN, Math.max(0, L - 2 * ACTIN));
  return { A, I, H };
}
