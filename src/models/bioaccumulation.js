// B16 生物濃縮
// 分解されにくく、脂肪に溶けやすく、体外に排出されにくい物質は、食物連鎖を通して栄養段階が上がるほど高い濃度で体内にたまる。
// 模式：水中の濃度 C0、植物プランクトンは水から取りこんで BCF 倍、それより上の栄養段階では1段ごとに F 倍になる。
// 分解・排出されやすい物質では F が1より小さく、上の段階ほど濃度が低い。
export const LEVELS = ['水', '植物プランクトン', '動物プランクトン', '小型の魚', '大型の魚', '魚を食べる鳥'];
export const DEFAULT = { c0: 0.00005, bcf: 800, f: 5 }; // ppm（百万分率）

export function chain({ c0 = DEFAULT.c0, bcf = DEFAULT.bcf, f = DEFAULT.f } = {}) {
  const out = [c0];
  let c = c0 * bcf;
  for (let i = 1; i < LEVELS.length; i++) {
    out.push(c);
    c *= f;
  }
  return out;
}

// 濃縮率 ＝ 生物の体内の濃度 ÷ 水中（環境中）の濃度
export function ratio(c, c0) {
  return c / c0;
}

// 生物濃縮の起こりやすい物質の性質
export const PROPERTIES = ['分解されにくい', '脂肪に溶けやすい（水に溶けにくい）', '体外に排出されにくい'];
