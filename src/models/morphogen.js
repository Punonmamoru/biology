// A19 発生と位置情報（ショウジョウバエの前後軸）
// 未受精卵の前端にビコイド遺伝子の mRNA が局在し（母性効果遺伝子）、受精後に翻訳されたビコイドタンパク質が
// 拡散して、前端で高く後端で低い濃度勾配ができる。各細胞（核）はビコイドの濃度を位置情報として受け取り、
// 濃度が閾値以上の領域でハンチバック遺伝子などが発現して、頭部・胸部などの前方の構造がつくられる。
// 位置 x は前端を0、後端を1とした卵の長さに対する割合。
export const LAMBDA = 0.2; // 濃度が 1/e になる距離（卵の長さに対する割合）
export const B0 = 1; // 正常な母親のときの前端の濃度（相対値）
export const THRESH = 0.15; // ハンチバック遺伝子が発現する閾値（相対値）

export function bicoid(x, amount = 1) {
  return B0 * amount * Math.exp(-x / LAMBDA);
}

// 閾値以上になる範囲の後端（境界の位置）。amount が 0 なら境界なし
export function boundary(amount = 1, thresh = THRESH) {
  if (amount <= 0) return 0;
  const x = LAMBDA * Math.log((B0 * amount) / thresh);
  return Math.max(0, Math.min(1, x));
}

// 濃度が半分になる距離
export function halfDistance() {
  return LAMBDA * Math.log(2);
}
