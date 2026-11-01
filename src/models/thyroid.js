// B12 ホルモンと負のフィードバック（チロキシンの分泌調節）
// 視床下部 → 甲状腺刺激ホルモン放出ホルモン（TRH）→ 脳下垂体前葉 → 甲状腺刺激ホルモン（TSH）→ 甲状腺 → チロキシン
// チロキシンが多くなると、視床下部と脳下垂体前葉のはたらきがおさえられる（負のフィードバック）。
// 値は正常な状態を 1（＝100%）とした相対値。時間の単位は「日」（模式）。
//   抑制の強さ inh(T) ＝ 2 ／ (1 ＋ T²)（T ＝ 1 で 1）
//   TRH：  dH/dt ＝ (inh(T) − H) ／ τH
//   TSH：  dS/dt ＝ (pit × H × inh(T) − S) ／ τS        pit：脳下垂体前葉（除去で0）
//   チロキシン：dT/dt ＝ (thy × S ＋ 注射 − T) ／ τT     thy：甲状腺がチロキシンをつくる能力（除去で0）
export const TAU = { H: 1, S: 1.5, T: 4 };
export const T_EVENT = 5;
export const T_END = 40;

export const CASES = {
  normal: { name: '正常', thy: 1, pit: 1, inj: 0 },
  thyroidectomy: { name: '甲状腺を除去', thy: 0, pit: 1, inj: 0 },
  injection: { name: 'チロキシンを注射し続ける', thy: 1, pit: 1, inj: 2 },
  pituitary: { name: '脳下垂体（前葉）を除去', thy: 1, pit: 0, inj: 0 },
  iodine: { name: '材料のヨウ素が不足', thy: 0.3, pit: 1, inj: 0 },
};

export function inh(T) {
  return 2 / (1 + T * T);
}

// 時刻 T_EVENT に処置を行ったときの変化
export function simulate(caseId, dt = 0.01, every = 10) {
  const c = CASES[caseId];
  let H = 1;
  let S = 1;
  let T = 1;
  const out = [];
  const steps = Math.round(T_END / dt);
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    if (i % every === 0) out.push({ t, H, S, T });
    const after = t >= T_EVENT;
    const thy = after ? c.thy : 1;
    const pit = after ? c.pit : 1;
    const inj = after ? c.inj : 0;
    const k = inh(T);
    H += ((k - H) / TAU.H) * dt;
    S += ((pit * H * k - S) / TAU.S) * dt;
    T += ((thy * S + inj - T) / TAU.T) * dt;
  }
  return out;
}

export function steady(caseId) {
  const run = simulate(caseId);
  return run[run.length - 1];
}
