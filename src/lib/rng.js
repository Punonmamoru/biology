// 再現可能な乱数（mulberry32）。問題は (ジェネレーターID, シード) から必ず同じものが作られる。
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    // 整数 [min, max]
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    // 重複なしで k 個
    sample(arr, k) {
      return rng.shuffle(arr).slice(0, k);
    },
    chance(p) {
      return next() < p;
    },
  };
  return rng;
}

export function randomSeed() {
  return (Math.random() * 4294967296) >>> 0;
}
