// B16 生物濃縮
// 分解されにくく、脂肪に溶けやすく、体外に排出されにくい物質は、食物連鎖を通して栄養段階が上がるほど高い濃度で体内にたまる。
// 模式：水中の濃度 C0、植物プランクトンは水から取り込んで BCF 倍、それより上の栄養段階では1段ごとに F 倍になる。
// 分解・排出されやすい物質は体内にたまらないので、植物プランクトンでも水と同じ程度（BCF ＝ 1）で、
// 上の段階では分解・排出されて濃度が下がる（F ＜ 1）。環境より高い濃度にはならない（生物濃縮は起こらない）。
// 数値は、教科書でよく使われる DDT の例（水 0.00005 ppm、プランクトン 0.04 ppm、魚を食べる鳥 数十 ppm）を参考にした模式。
export const LEVELS = ['水', '植物プランクトン', '動物プランクトン', '小型の魚', '大型の魚', '魚を食べる鳥'];
export const DEFAULT = { c0: 0.00005, bcf: 800, f: 5 }; // ppm（百万分率）
export const SUBSTANCES = {
  persistent: { label: '分解・排出されにくい物質（DDT・PCB・有機水銀など）', bcf: 800, f: 5 },
  degradable: { label: '分解・排出されやすい物質', bcf: 1, f: 0.5 },
};

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
export const PROPERTIES = ['分解されにくい', '体外に排出されにくい']; // DDT・PCB はさらに脂肪に溶けやすい（有機水銀はタンパク質と結合して体内に残る）
