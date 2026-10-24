// B7 腎臓のはたらき
// 濃縮率 ＝ 尿中の濃度 ÷ 血しょう中の濃度
// イヌリンはろ過されるが再吸収も分泌もされないので、原尿量 ＝ 尿量 × イヌリンの濃縮率
// 再吸収量 ＝ 原尿中の量 − 尿中の量、再吸収率 ＝ 再吸収量 ÷ 原尿中の量
// 濃度は質量パーセント［%］（g/100mL とみなす）。数値は教科書の表の目安。
export const SUBSTANCES = [
  { id: 'protein', name: 'タンパク質', plasma: 7.2, filtrate: 0, urine: 0, note: '分子が大きく、糸球体からボーマンのうへろ過されない' },
  { id: 'glucose', name: 'グルコース', plasma: 0.1, filtrate: 0.1, urine: 0, note: 'ろ過されるが、細尿管ですべて再吸収される' },
  { id: 'urea', name: '尿素', plasma: 0.03, filtrate: 0.03, urine: 2, note: '不要な物質だが、一部（この表では約4割）は再吸収される。水が大量に再吸収されるので、尿中で濃縮される' },
  { id: 'uric', name: '尿酸', plasma: 0.004, filtrate: 0.004, urine: 0.05, note: '不要な物質' },
  { id: 'creatinine', name: 'クレアチニン', plasma: 0.001, filtrate: 0.001, urine: 0.075, note: '筋肉でできる不要な物質。濃縮率（75）はイヌリン（120）より小さく、表の数値からは一部が再吸収されたと計算される' },
  { id: 'na', name: 'ナトリウムイオン', plasma: 0.3, filtrate: 0.3, urine: 0.35, note: '大部分が再吸収される（鉱質コルチコイドが促進）' },
  { id: 'k', name: 'カリウムイオン', plasma: 0.02, filtrate: 0.02, urine: 0.15, note: '' },
  { id: 'inulin', name: 'イヌリン', plasma: 0.1, filtrate: 0.1, urine: 12, note: '静脈に注射する多糖類。ろ過されるが再吸収されない' },
];

export function substanceById(id) {
  return SUBSTANCES.find((s) => s.id === id) || null;
}

export function concentrationRatio(plasma, urine) {
  return urine / plasma;
}

export function filtrateVolume(urineVolume, inulinRatio) {
  return urineVolume * inulinRatio;
}

// 原尿量 F・尿量 U と、原尿中・尿中の濃度［%］から再吸収を求める（量は g。体積は mL とする）
export function reabsorption(F, U, cFiltrate, cUrine) {
  const filtered = (F * cFiltrate) / 100;
  const excreted = (U * cUrine) / 100;
  const re = filtered - excreted;
  return { filtered, excreted, reabsorbed: re, rate: filtered > 0 ? re / filtered : 0 };
}

// 水の再吸収率 ＝ 1 − 尿量 ÷ 原尿量
export function waterReabsorption(F, U) {
  return 1 - U / F;
}

// 既定値：1日の尿量 1.5 L、イヌリンの濃縮率 120 → 原尿量 180 L
export const DEFAULT = { urineL: 1.5, inulinPlasma: 0.1, inulinUrine: 12 };
