// A15 PCR と電気泳動
// PCR法：①熱変性（約95℃：2本鎖DNAが1本ずつに分かれる）→ ②アニーリング（約55〜60℃：プライマーが結合）
//        → ③伸長（約72℃：耐熱性のDNAポリメラーゼがDNAを合成）をくり返す。
// 理想的には1サイクルごとに目的のDNA領域が2倍になる：n サイクル後 ＝ はじめの数 × 2ⁿ
export const STEPS = [
  { name: '熱変性', temp: 95, sec: 30, desc: '2本鎖DNAの水素結合が切れて、1本鎖になる' },
  { name: 'アニーリング', temp: 55, sec: 30, desc: 'プライマーが、増やしたい領域の両端に相補的に結合する' },
  { name: '伸長', temp: 72, sec: 60, desc: '耐熱性のDNAポリメラーゼが、プライマーにつなげてDNAを合成する' },
];
export function copies(initial, cycles) {
  return initial * Math.pow(2, cycles);
}
export function cyclesToReach(initial, target) {
  return Math.ceil(Math.log2(target / initial));
}

// 電気泳動：DNAは負の電荷をもつので陽極（＋）へ移動する。短い断片ほど寒天（アガロース）の網目を通りやすく、遠くまで移動する。
// ある範囲では、移動距離は断片の長さ（塩基対）の対数に対してほぼ直線的に小さくなる（模式）：
//   距離 d［mm］＝ D0 − K × log₁₀(長さ)
export const D0 = 140;
export const K = 30;
export function distanceOf(bp) {
  return D0 - K * Math.log10(bp);
}
export function lengthOf(d) {
  return Math.pow(10, (D0 - d) / K);
}
export const LADDER = [10000, 5000, 3000, 2000, 1000, 500, 250];

// 環状のプラスミド（全長 LEN 塩基対）を制限酵素で切断したときの断片
export const PLASMID = { len: 6000, sites: { EcoRI: [500], BamHI: [2500], HindIII: [1500, 4500] } };
export function fragments(len, cuts) {
  const c = [...new Set(cuts)].sort((a, b) => a - b);
  if (c.length === 0) return [len]; // 切断されない（環状のまま。ここでは全長として扱う）
  if (c.length === 1) return [len]; // 環状DNAを1か所で切ると、全長の直鎖DNAが1本できる
  const out = [];
  for (let i = 0; i < c.length - 1; i++) out.push(c[i + 1] - c[i]);
  out.push(len - c[c.length - 1] + c[0]);
  return out.sort((a, b) => b - a);
}
