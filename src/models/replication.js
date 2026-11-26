// A22 DNAの複製（メセルソンとスタールの実験）
// ¹⁵N だけを含む培地で何世代も育てた大腸菌（DNA の2本鎖がどちらも ¹⁵N：重い）を、¹⁴N の培地に移して g 世代分裂させる。
// DNA を取り出して密度勾配遠心法で分けると、DNA は密度に応じた位置にバンドをつくる。
//   重い（¹⁵N/¹⁵N）・中間（¹⁵N/¹⁴N）・軽い（¹⁴N/¹⁴N）
// 位置は「軽い＝0、重い＝1」の相対値で表す（遠心管では重いものほど底に近い）。
export const POS = { light: 0, hybrid: 0.5, heavy: 1 };
export const MODES = {
  semi: '半保存的複製',
  cons: '保存的複製',
  disp: '分散的複製',
};

// g 世代後の DNA 分子の数（はじめの DNA 分子 1 個あたり）
export function molecules(g) {
  return Math.pow(2, g);
}

// バンドの一覧 [{ pos, frac, kind }]。frac は全 DNA に対する割合
export function bands(g, mode = 'semi') {
  if (g <= 0) return [{ pos: POS.heavy, frac: 1, kind: 'heavy' }];
  const n = molecules(g);
  if (mode === 'semi') {
    // 親の ¹⁵N 鎖2本は、それぞれ別の分子に1本ずつ残る → 中間の分子はいつも2個
    const out = [{ pos: POS.hybrid, frac: 2 / n, kind: 'hybrid' }];
    if (n > 2) out.unshift({ pos: POS.light, frac: (n - 2) / n, kind: 'light' });
    return out;
  }
  if (mode === 'cons') {
    // 親の2本鎖はそのまま1個残り、新しい分子はすべて ¹⁴N/¹⁴N
    return [
      { pos: POS.light, frac: (n - 1) / n, kind: 'light' },
      { pos: POS.heavy, frac: 1 / n, kind: 'heavy' },
    ];
  }
  // 分散的：どの分子も ¹⁵N を同じ割合（1/2^g）ずつ含む → 1本のバンドが少しずつ軽い側へ移る
  return [{ pos: 1 / n, frac: 1, kind: 'mixed' }];
}

// 中間：軽い の比（半保存的複製）。g ≧ 1
export function hybridLightRatio(g) {
  const n = molecules(g);
  return { hybrid: 2, light: n - 2 };
}

// 全 DNA 鎖（1本鎖）のうち ¹⁵N の鎖の割合
export function heavyStrandFraction(g) {
  return 1 / molecules(g);
}

// 密度勾配の吸光度のような分布（バンドを山で表す）
export function profile(bs, x, width = 0.045) {
  let y = 0;
  for (const b of bs) y += b.frac * Math.exp(-((x - b.pos) ** 2) / (2 * width * width));
  return y;
}
