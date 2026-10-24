// A2 遺伝の分離比
// 交配の種類
//   mono  ：一遺伝子雑種 Aa × Aa            → 表現型 [A]:[a] = 3:1
//   testMono：検定交雑 Aa × aa               → [A]:[a] = 1:1
//   di    ：二遺伝子雑種 AaBb × AaBb（独立）→ [AB]:[Ab]:[aB]:[ab] = 9:3:3:1
//   testDi：検定交雑 AaBb × aabb（連鎖あり、AとB・aとbが同じ染色体上）
//           配偶子 AB:Ab:aB:ab = (1−r)/2 : r/2 : r/2 : (1−r)/2（r＝組換え価）→ そのまま表現型の比になる
export const CROSSES = {
  mono: { label: '一遺伝子雑種（Aa×Aa）', cats: ['[A]', '[a]'] },
  testMono: { label: '検定交雑（Aa×aa）', cats: ['[A]', '[a]'] },
  di: { label: '二遺伝子雑種（AaBb×AaBb）', cats: ['[AB]', '[Ab]', '[aB]', '[ab]'] },
  testDi: { label: '検定交雑（AaBb×aabb）', cats: ['[AB]', '[Ab]', '[aB]', '[ab]'] },
};

export function gameteRatio(r) {
  return { AB: (1 - r) / 2, Ab: r / 2, aB: r / 2, ab: (1 - r) / 2 };
}

export function expected(type, r = 0.5) {
  if (type === 'mono') return [3 / 4, 1 / 4];
  if (type === 'testMono') return [1 / 2, 1 / 2];
  if (type === 'di') return [9 / 16, 3 / 16, 3 / 16, 1 / 16];
  const g = gameteRatio(r);
  return [g.AB, g.Ab, g.aB, g.ab];
}

// 1個体ずつ配偶子を乱数で選んで交配する
export function simulate(type, n, rng, r = 0.5) {
  const counts = new Array(CROSSES[type].cats.length).fill(0);
  const allele = () => (rng.next() < 0.5 ? 1 : 0); // 1=顕性の遺伝子（A/B）
  for (let i = 0; i < n; i++) {
    if (type === 'mono') {
      const dom = allele() | allele();
      counts[dom ? 0 : 1]++;
    } else if (type === 'testMono') {
      counts[allele() ? 0 : 1]++;
    } else if (type === 'di') {
      const A = allele() | allele();
      const B = allele() | allele();
      counts[A ? (B ? 0 : 1) : B ? 2 : 3]++;
    } else {
      // AaBb（AB/ab）の配偶子：組換えが起こる確率 r
      const recomb = rng.next() < r;
      const A = allele();
      const B = recomb ? 1 - A : A;
      counts[A ? (B ? 0 : 1) : B ? 2 : 3]++;
    }
  }
  return counts;
}

// 検定交雑の結果から組換え価を求める：組換え価 ＝ 組換えで生じた個体数 ÷ 全個体数
export function recombinationValue(counts) {
  const n = counts.reduce((a, b) => a + b, 0);
  return n ? (counts[1] + counts[2]) / n : 0;
}
