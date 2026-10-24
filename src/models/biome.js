// B8 バイオーム（年平均気温と年降水量による模式的な区分）
import { monotoneCubic } from '../lib/interp.js';
// 境界は教科書の図の目安を直線でつないだ模式。点がどの多角形に入るかで判定する（図と判定が必ず一致する）。
export const T_MIN = -15;
export const T_MAX = 30;
export const P_MAX = 4500;

export const BIOMES = {
  tundra: { name: 'ツンドラ', kind: '荒原', plants: 'コケ植物・地衣類・小形の草本' },
  desert: { name: '砂漠', kind: '荒原', plants: 'サボテン類など乾燥に強い植物' },
  steppe: { name: 'ステップ', kind: '草原', plants: 'イネのなかまの草本' },
  savanna: { name: 'サバンナ', kind: '草原', plants: 'イネのなかまの草本と、まばらな樹木（アカシアなど）' },
  taiga: { name: '針葉樹林', kind: '森林', plants: 'トウヒ類・モミ類などの常緑針葉樹（落葉針葉樹のカラマツ類も見られる）' },
  temperate: { name: '夏緑樹林', kind: '森林', plants: 'ブナ・ミズナラなどの落葉広葉樹' },
  laurel: { name: '照葉樹林', kind: '森林', plants: 'スダジイ・タブノキ・アラカシなどの常緑広葉樹' },
  sclerophyll: { name: '硬葉樹林', kind: '森林', plants: 'オリーブ・コルクガシなど（夏に乾燥し冬に雨が多い地域）' },
  monsoon: { name: '雨緑樹林', kind: '森林', plants: 'チークなど（雨季に葉をつけ乾季に落葉する）' },
  subtropical: { name: '亜熱帯多雨林', kind: '森林', plants: 'ガジュマル・アコウ・ヘゴ、海岸にはマングローブ' },
  tropical: { name: '熱帯多雨林', kind: '森林', plants: '常緑広葉樹。種類が非常に多く、高木が層をなす' },
};

// 境界線（気温 T の関数）
export const pDesert = (T) => 200 + 5 * (T + 5); // これより少ないと砂漠
// 森林と草原の境界（これより少ないと草原）。気温が高いほど蒸発が多いので、森林に必要な降水量が多くなる。
// 目安の点（GRASS_KNOTS）を単調な3次曲線（フリッチュ・カールソン法）でなめらかにつなぐ。
// 段差も折れ曲がりもない曲線を 0.5℃ ごとの点（GRASS_CURVE）にして、判定と図の両方がこの点列を使う（図と判定が必ず一致する）。
// 気温20℃未満の草原がステップ、20℃以上の草原がサバンナ。
export const GRASS_KNOTS = [[-5, 400], [16, 715], [24, 1300], [30, 1300]];
const grassSmooth = monotoneCubic(GRASS_KNOTS);
export const GRASS_STEP = 0.5;
export const GRASS_CURVE = [];
for (let T = GRASS_KNOTS[0][0]; T <= GRASS_KNOTS[GRASS_KNOTS.length - 1][0] + 1e-9; T += GRASS_STEP) {
  GRASS_CURVE.push([Math.round(T * 10) / 10, Math.round(grassSmooth(T) * 10) / 10]);
}
export function pGrass(T) {
  const k = GRASS_CURVE;
  if (T <= k[0][0]) return k[0][1];
  if (T >= k[k.length - 1][0]) return k[k.length - 1][1];
  const i = Math.min(k.length - 2, Math.floor((T - k[0][0]) / GRASS_STEP));
  const [t0, p0] = k[i];
  const [t1, p1] = k[i + 1];
  return p0 + ((p1 - p0) * (T - t0)) / (t1 - t0);
}
export const P_SCLERO = 1200; // 13〜20℃で、これより少ない森林は硬葉樹林
export const P_RAIN = 2000; // 20℃以上で、これ以上なら多雨林
export const pEnvelope = (T) => 1000 + ((T - T_MIN) * 3500) / (T_MAX - T_MIN); // これより多い地域はほとんどない
export const T_TUNDRA = -5;
export const T_TAIGA = 5;
export const T_TEMPERATE = 13;
export const T_WARM = 20;
export const T_TROPICAL = 24;

export function classify(T, P) {
  if (T < T_MIN || T > T_MAX || P < 0 || P > pEnvelope(T)) return null;
  if (T < T_TUNDRA) return 'tundra';
  if (P < pDesert(T)) return 'desert';
  if (T < T_WARM) {
    if (P < pGrass(T)) return 'steppe';
    if (T < T_TAIGA) return 'taiga';
    if (T < T_TEMPERATE) return 'temperate';
    return P < P_SCLERO ? 'sclerophyll' : 'laurel';
  }
  if (P < pGrass(T)) return 'savanna';
  if (P < P_RAIN) return 'monsoon';
  return T < T_TROPICAL ? 'subtropical' : 'tropical';
}

// 図に描く多角形（classify と同じ境界）。[気温, 降水量] の点列
const line = (f, t0, t1) => [[t0, f(t0)], [t1, f(t1)]];
// 森林と草原の境界の曲線（t0〜t1 の間の 0.5℃ ごとの点を含む）
const grassLine = (t0, t1) => [t0, ...GRASS_CURVE.map((k) => k[0]).filter((t) => t > t0 && t < t1), t1].map((t) => [t, pGrass(t)]);
export function polygons() {
  const env = (t0, t1) => line(pEnvelope, t0, t1);
  const rev = (pts) => pts.slice().reverse();
  return [
    { id: 'tundra', points: [[T_MIN, 0], [T_TUNDRA, 0], ...rev(env(T_MIN, T_TUNDRA))], at: [-10, 450] },
    { id: 'desert', points: [[T_TUNDRA, 0], [T_MAX, 0], ...rev(line(pDesert, T_TUNDRA, T_MAX))], at: [12.5, 140] },
    { id: 'steppe', points: [...line(pDesert, T_TUNDRA, T_WARM), ...rev(grassLine(T_TUNDRA, T_WARM))], at: [9, 520] },
    { id: 'taiga', points: [...grassLine(T_TUNDRA, T_TAIGA), ...rev(env(T_TUNDRA, T_TAIGA))], at: [0, 1300] },
    { id: 'temperate', points: [...grassLine(T_TAIGA, T_TEMPERATE), ...rev(env(T_TAIGA, T_TEMPERATE))], at: [9, 1500] },
    { id: 'sclerophyll', points: [...grassLine(T_TEMPERATE, T_WARM), [T_WARM, P_SCLERO], [T_TEMPERATE, P_SCLERO]], at: [16.5, 950] },
    { id: 'laurel', points: [[T_TEMPERATE, P_SCLERO], [T_WARM, P_SCLERO], ...rev(env(T_TEMPERATE, T_WARM))], at: [16.5, 2200] },
    { id: 'savanna', points: [...line(pDesert, T_WARM, T_MAX), ...rev(grassLine(T_WARM, T_MAX))], at: [26, 800] },
    { id: 'monsoon', points: [...grassLine(T_WARM, T_MAX), [T_MAX, P_RAIN], [T_WARM, P_RAIN]], at: [25.5, 1650] },
    { id: 'subtropical', points: [[T_WARM, P_RAIN], [T_TROPICAL, P_RAIN], ...rev(env(T_WARM, T_TROPICAL))], at: [22, 2900] },
    { id: 'tropical', points: [[T_TROPICAL, P_RAIN], [T_MAX, P_RAIN], ...rev(env(T_TROPICAL, T_MAX))], at: [27, 3100] },
  ];
}

// 都市の気候（平年値の概数）
export const CITIES = [
  { name: '東京', T: 15.4, P: 1530 },
  { name: '札幌', T: 8.9, P: 1150 },
  { name: '那覇', T: 23.1, P: 2040 },
  { name: 'シンガポール', T: 27.5, P: 2340 },
  { name: 'カイロ', T: 22.0, P: 25 },
  { name: 'ローマ', T: 15.5, P: 800 },
  { name: 'モスクワ', T: 5.8, P: 700 },
  { name: 'バンコク', T: 28.6, P: 1650 },
];

// 日本の水平分布（緯度による。主に気温で決まる）
export const JAPAN_HORIZONTAL = [
  { zone: '亜寒帯', biome: 'taiga', where: '北海道の東北部', trees: 'エゾマツ・トドマツ' },
  { zone: '冷温帯', biome: 'temperate', where: '北海道の南西部〜東北地方', trees: 'ブナ・ミズナラ' },
  { zone: '暖温帯', biome: 'laurel', where: '関東地方〜四国・九州', trees: 'スダジイ・タブノキ・アラカシ' },
  { zone: '亜熱帯', biome: 'subtropical', where: '南西諸島（沖縄など）', trees: 'ガジュマル・アコウ・ヘゴ' },
];

// 日本の垂直分布（本州中部の目安。標高 m）
export const VERTICAL = [
  { zone: '丘陵帯', from: 0, to: 700, biome: 'laurel', veg: '照葉樹林（スダジイ・タブノキ・アラカシ）' },
  { zone: '山地帯', from: 700, to: 1700, biome: 'temperate', veg: '夏緑樹林（ブナ・ミズナラ）' },
  { zone: '亜高山帯', from: 1700, to: 2500, biome: 'taiga', veg: '針葉樹林（シラビソ・オオシラビソ・コメツガ）' },
  { zone: '高山帯', from: 2500, to: 4000, biome: null, veg: '森林限界より上の、ハイマツの低木林や高山草原（お花畑）' },
];
export const TREE_LINE = 2500;

export function verticalZone(elev) {
  return VERTICAL.find((v) => elev >= v.from && elev < v.to) || VERTICAL[VERTICAL.length - 1];
}

// 標高が 100 m 高くなるごとに気温は約 0.6℃ 下がる（0.5〜0.6℃）
export const LAPSE = 0.6;
export function tempAt(baseT, baseElev, elev) {
  return baseT - (LAPSE * (elev - baseElev)) / 100;
}

// 暖かさの指数：月平均気温が 5℃ を超える月について（月平均気温 − 5）を合計した値
export function warmthIndex(monthly) {
  return monthly.reduce((a, t) => a + (t > 5 ? t - 5 : 0), 0);
}
export const WI_ZONES = [
  { lo: 0, hi: 15, biome: 'tundra' },
  { lo: 15, hi: 45, biome: 'taiga' },
  { lo: 45, hi: 85, biome: 'temperate' },
  { lo: 85, hi: 180, biome: 'laurel' },
  { lo: 180, hi: 240, biome: 'subtropical' },
  { lo: 240, hi: Infinity, biome: 'tropical' },
];
export function biomeByWI(wi) {
  return (WI_ZONES.find((z) => wi >= z.lo && wi < z.hi) || WI_ZONES[0]).biome;
}
