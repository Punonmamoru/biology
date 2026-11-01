import { monotoneCubic } from '../lib/interp.js';
// B13 炭素の循環（模式）
// 単位：炭素の量［億トン/年］の目安を丸めた模式的な値。大気中の CO₂ の増減を、出入りの差として考える。
//   大気から出ていく：生産者の光合成（総生産量）、海洋への溶け込み
//   大気へ入る：生産者の呼吸、消費者の呼吸、分解者の呼吸（分解）、化石燃料の燃焼、森林の伐採・焼却
export const BASE = {
  photo: 1200, // 陸上の生産者の光合成
  respP: 600, // 生産者の呼吸
  respC: 50, // 消費者の呼吸
  decomp: 520, // 分解者の呼吸（遺体・排出物の分解）
  fossil: 100, // 化石燃料の燃焼
  landUse: 10, // 森林の伐採・焼却
  ocean: 30, // 海洋が吸収する正味の量
};

// 大気中の炭素の増加量［億トン/年］（大気中の炭素 約21億トンが CO₂濃度 1 ppm にあたる）
export const PPM_PER = 21;
export function atmosphereChange(f) {
  const inflow = f.respP + f.respC + f.decomp + f.fossil + f.landUse;
  const outflow = f.photo + f.ocean;
  return { inflow, outflow, change: inflow - outflow };
}

// 大気中の CO₂ 濃度（ppm）の季節変動（北半球の観測点の模式）
//   長期的に増加（約 2.4 ppm/年）しながら、夏に植物の光合成がさかんになると減り、冬に増える。
//   最大は5月ごろ、最小は9〜10月ごろ。振れ幅は約6 ppm。
export const TREND = 2.4;
// 1年の中の変動（ppm）：5月中ごろに最大、9月下旬〜10月に最小になる非対称な形（目安の点を単調3次補間でつなぐ）
const SEASON = monotoneCubic([[0, 1.2], [0.37, 3], [0.74, -3], [0.9, -1], [1, 1.2]]);
export function co2(year) {
  const f = year - Math.floor(year);
  return 412 + TREND * (year - 2020) + SEASON(f);
}
