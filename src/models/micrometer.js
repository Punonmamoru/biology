// B13 細胞の大きさとミクロメーター
// 対物ミクロメーター：1 mm を100等分した目盛り（1目盛り＝10 μm）。スライドガラスにあり、試料と同じく拡大される。
// 接眼ミクロメーター：接眼レンズの中にある目盛り。対物レンズでは拡大されない（試料とは別に、接眼レンズだけで拡大されて見える）ので、
// 対物レンズの倍率を変えても見かけの間隔は変わらず、1目盛りが表す長さは対物レンズの倍率に反比例する。
//   接眼ミクロメーター1目盛りの長さ ＝ 10 μm × 対物ミクロメーターの目盛り数 ÷ 接眼ミクロメーターの目盛り数（両者が重なる2点の間で数える）
export const OBJ_DIV = 10; // μm
export const LENSES = [4, 10, 40]; // 対物レンズの倍率
// このアプリの顕微鏡では、対物10倍のとき接眼1目盛りが 14 μm（接眼5目盛り＝対物7目盛り）。倍率に反比例する。
export const EYE_K = 140;

export function eyeUnit(mag) {
  return EYE_K / mag;
}

// 重なる2点の間の目盛り数から接眼1目盛りの長さを求める
export function calibrate(eyeCount, objCount) {
  return (OBJ_DIV * objCount) / eyeCount;
}

// 最初に重なる（最小の）目盛り数の組。接眼 e 目盛り ＝ 対物 o 目盛り
export function coincidence(mag) {
  const u = eyeUnit(mag);
  for (let e = 1; e <= 100; e++) {
    const o = (e * u) / OBJ_DIV;
    if (Math.abs(o - Math.round(o)) < 1e-9 && Math.round(o) >= 1) return { eye: e, obj: Math.round(o) };
  }
  return null;
}

export function measure(divs, unit) {
  return divs * unit;
}

// 観察する試料（長さの目安。教科書に出てくる大きさの概数）
export const SPECIMENS = [
  { id: 'paramecium', name: 'ゾウリムシ', length: 200, width: 55, shape: 'slipper' },
  { id: 'cheek', name: 'ヒトの口腔上皮細胞', length: 63, width: 49, shape: 'polygon' },
  { id: 'rbc', name: 'ヒトの赤血球', length: 7.7, width: 7.7, shape: 'disc' },
  { id: 'ecoli', name: '大腸菌', length: 2.8, width: 0.9, shape: 'rod' },
];

// 原形質流動などの速さ（μm/秒）
export function speed(divs, unit, seconds) {
  return (divs * unit) / seconds;
}

// 光学顕微鏡で見分けられる最小の間隔（分解能）の目安
export const RESOLUTION = { eye: 100, light: 0.2, electron: 0.0002 }; // μm（肉眼 約0.1 mm、光学顕微鏡 約0.2 μm、電子顕微鏡 約0.2 nm）
