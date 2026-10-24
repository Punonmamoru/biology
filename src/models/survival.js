// A8 生存曲線と生命表
// 出生（ふ化）した 1000 個体のうち、各年齢まで生き残っている個体数（生存数）を、
// 縦軸を対数目盛りにして表したものが生存曲線。ここでは寿命を 100（相対値）としたワイブル型の模式：
//   生存数 l(x) ＝ 1000 × exp(−(x/λ)^k)、λ は「寿命 100 で生存数 1」になるように決める。
//   k ＞ 1：晩死型（若いうちの死亡が少なく、老齢で多く死ぬ）
//   k ＝ 1：平均型（死亡率が年齢によらず一定。対数目盛りで直線）
//   k ＜ 1：早死型（生まれてすぐの死亡が非常に多い）
export const L0 = 1000;
export const LIFESPAN = 100;
export const TYPES = {
  late: { name: '晩死型', k: 6, examples: 'ヒトやゾウなどの大形の哺乳類', care: '産む子の数が少なく、親が子を保護する' },
  mid: { name: '平均型', k: 1, examples: '鳥類（シジュウカラなど）・ヒドラ', care: 'どの年齢でも死亡率がほぼ一定' },
  early: { name: '早死型', k: 0.25, examples: '魚類（マイワシなど）・カキなどの貝類', care: '多数の卵を産むが、親が保護しない' },
};

export function lambdaOf(k) {
  return LIFESPAN / Math.pow(Math.log(L0), 1 / k);
}

// 年齢 x（0〜100）の生存数
export function survivors(x, k) {
  if (x <= 0) return L0;
  return L0 * Math.exp(-Math.pow(x / lambdaOf(k), k));
}

// 生命表：年齢の区分ごとの はじめの生存数・死亡数・死亡率
// 死亡率 ＝ その区分の死亡数 ÷ その区分のはじめの生存数
export function lifeTable(lx) {
  return lx.slice(0, -1).map((l, i) => {
    const d = l - lx[i + 1];
    return { start: l, deaths: d, mortality: l > 0 ? d / l : 0 };
  });
}

// 曲線から、区分の境目の生存数（整数）を読む
export function lxFromCurve(k, classes = 10) {
  return Array.from({ length: classes + 1 }, (_, i) => Math.round(survivors((LIFESPAN * i) / classes, k)));
}

// 死亡率がほぼ一定か（平均型の目安）
export function typeOfTable(lx) {
  const m = lifeTable(lx).filter((r) => r.start > 0).map((r) => r.mortality);
  const first = m[0];
  const last = m[m.length - 1];
  if (Math.max(...m) - Math.min(...m) < 0.05) return 'mid';
  return first > last ? 'early' : 'late';
}
