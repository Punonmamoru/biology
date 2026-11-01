// A16 動物の行動（ミツバチのダンス）
// えさ場が近いとき（約50〜100 m 以内）は円形ダンス、遠いときは8の字ダンスを踊る。
// 8の字ダンスでは、巣箱の中の垂直な巣板の上で、尻を振りながら直進する向きが、
//   重力と反対の方向（真上）から測った角度 ＝ 太陽の方向から測ったえさ場の方向の角度
// を表す（時計回りを正とする）。えさ場が遠いほど、一定時間あたりのダンスの回数は少なくなる。
// 方位は北を0°として時計回りに測る（東 90°、南 180°、西 270°）。
export const NEAR = 100; // これより近いと円形ダンス（目安）

export function norm180(a) {
  let x = ((a % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

// 真上から時計回りに測った、8の字ダンスの直進方向の角度（−180〜180°）
export function danceAngle(sunAz, foodAz) {
  return norm180(foodAz - sunAz);
}

// 逆に、ダンスの角度と太陽の方位から、えさ場の方位を求める
export function foodAzimuth(sunAz, dance) {
  return ((sunAz + dance) % 360 + 360) % 360;
}

export function danceType(distance) {
  return distance < NEAR ? 'round' : 'waggle';
}

// 一定時間（15秒）あたりの8の字ダンスの回数（距離が大きいほど少ない。模式）
export function dancesPer15s(distance) {
  return 10 / (1 + distance / 500);
}

// 太陽の方位は1時間に約15°ずつ（東→南→西へ）移る（模式）
export const SUN_SPEED = 15;

export const AZ_NAMES = [
  [0, '北'], [45, '北東'], [90, '東'], [135, '南東'], [180, '南'], [225, '南西'], [270, '西'], [315, '北西'],
];
export function azName(a) {
  const x = ((a % 360) + 360) % 360;
  const hit = AZ_NAMES.find(([v]) => Math.abs(v - x) < 1e-9);
  return hit ? hit[1] : `${Math.round(x)}°`;
}
