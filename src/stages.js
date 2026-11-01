// ステージ定義
export const COURSES = [
  { id: 'basic', name: '生物基礎', short: '基礎' },
  { id: 'advanced', name: '生物（発展）', short: '発展' },
];

export const STAGES = [
  { id: 'b1', code: 'B1', course: 'basic', title: '細胞周期とDNA量', unit: '遺伝子とそのはたらき', lead: 'S期でDNAが複製され、M期の終わりに2つの細胞へ分配される。' },
  { id: 'b2', code: 'B2', course: 'basic', title: '血糖値の調節', unit: 'ヒトの体の調節', lead: 'インスリンとグルカゴンが負のフィードバックで血糖値を一定に保つ。' },
  { id: 'b3', code: 'B3', course: 'basic', title: '免疫の一次応答・二次応答', unit: 'ヒトの体の調節', lead: '記憶細胞があると、2回目は速く・多く抗体がつくられる。' },
  { id: 'b4', code: 'B4', course: 'basic', title: '光の強さと光合成', unit: '生物の多様性と生態系', lead: '陽生植物と陰生植物で、補償点・光飽和点が違う。' },
  { id: 'b5', code: 'B5', course: 'basic', title: '生態系のバランス（キーストーン種）', unit: '生物の多様性と生態系', lead: 'ラッコ→ウニ→ケルプ。1種の変化が間接効果で広がる。' },
  { id: 'b6', code: 'B6', course: 'basic', title: '酸素解離曲線', unit: 'ヒトの体の調節', lead: 'S字曲線とCO₂分圧による右方移動。組織で酸素を放出する割合を計算。' },
  { id: 'b7', code: 'B7', course: 'basic', title: '腎臓のはたらき', unit: 'ヒトの体の調節', lead: 'イヌリンの濃縮率から原尿量を求め、物質ごとの再吸収率を計算する。' },
  { id: 'b8', code: 'B8', course: 'basic', title: 'バイオーム', unit: '生物の多様性と生態系', lead: '年平均気温と年降水量でバイオームが決まる。日本の水平分布・垂直分布。' },
  { id: 'b9', code: 'B9', course: 'basic', title: 'DNAとタンパク質合成', unit: '遺伝子とそのはたらき', lead: 'DNA→mRNA→アミノ酸。置換と欠失（フレームシフト）の違いを体験（突然変異は「生物」の内容）。' },
  { id: 'b10', code: 'B10', course: 'basic', title: 'DNAの塩基組成', unit: '遺伝子とそのはたらき', lead: 'シャルガフの規則（A＝T、G＝C）と、塩基対の数・DNAの長さの計算。' },
  { id: 'b11', code: 'B11', course: 'basic', title: '植生の遷移', unit: '生物の多様性と生態系', lead: '裸地から極相林まで。林床の明るさと、陽樹・陰樹の芽ばえの育ち方。' },
  { id: 'b12', code: 'B12', course: 'basic', title: 'ホルモンと負のフィードバック', unit: 'ヒトの体の調節', lead: 'TRH → TSH → チロキシン。甲状腺の除去やチロキシンの注射で、ホルモンの量はどう変わるか。' },
  { id: 'b13', code: 'B13', course: 'basic', title: '炭素の循環', unit: '生物の多様性と生態系', lead: '光合成と呼吸・分解・燃焼による大気中の CO₂ の出入りと、CO₂ 濃度の季節変動。' },
  { id: 'a1', code: 'A1', course: 'advanced', title: '酵素の反応速度', unit: '生命現象と物質', lead: '基質濃度・阻害剤・温度・pHで反応速度がどう変わるか。' },
  { id: 'a2', code: 'A2', course: 'advanced', title: '遺伝の分離比', unit: '生物の進化（有性生殖と遺伝子の組合せ）', lead: '交配をくり返すと理論比に近づく。連鎖と組換え価も体験。' },
  { id: 'a3', code: 'A3', course: 'advanced', title: '個体群の成長', unit: '生態と環境', lead: 'ロジスティック成長と、被食者・捕食者の周期的な変動。' },
  { id: 'a4', code: 'A4', course: 'advanced', title: '興奮の伝導', unit: '生物の環境応答', lead: '活動電位の波形、閾値と全か無かの法則。2点刺激で伝導速度を計算する。' },
  { id: 'a5', code: 'A5', course: 'advanced', title: '光合成の限定要因', unit: '生命現象と物質', lead: '光の強さ・CO₂濃度・温度のうち、最も不足している要因が光合成速度を決める。' },
  { id: 'a6', code: 'A6', course: 'advanced', title: '集団遺伝', unit: '生物の進化', lead: 'ハーディー・ワインベルグの法則の計算と、集団の大きさによる遺伝的浮動のちがい。' },
  { id: 'a7', code: 'A7', course: 'advanced', title: '遺伝子発現の調節', unit: '遺伝情報の発現と発生', lead: 'ラクトースオペロン。リプレッサーの結合で転写のオン・オフが切りかわる。' },
  { id: 'a8', code: 'A8', course: 'advanced', title: '生存曲線', unit: '生態と環境', lead: '早死型・平均型・晩死型の比較と、生命表からの死亡率の計算。' },
  { id: 'a9', code: 'A9', course: 'advanced', title: '呼吸と発酵', unit: '生命現象と物質', lead: '呼吸商と呼吸基質、酵母の呼吸とアルコール発酵の割合を、O₂とCO₂の量から計算する。' },
  { id: 'a10', code: 'A10', course: 'advanced', title: '筋収縮', unit: '生物の環境応答', lead: '刺激の頻度と単収縮・強縮、サルコメアの長さと張力（滑り説）。' },
  { id: 'a11', code: 'A11', course: 'advanced', title: '分子系統と分子時計', unit: '生物の進化', lead: 'アミノ酸の違いの数から分岐年代を求め、違いの数の表から系統樹をつくる。' },
  { id: 'a12', code: 'A12', course: 'advanced', title: '植物ホルモン（オーキシン）', unit: '生物の環境応答', lead: 'オーキシン濃度と根・芽・茎の成長。水平に置いた芽ばえの重力屈性。' },
  { id: 'a13', code: 'A13', course: 'advanced', title: '生態系の物質生産', unit: '生態と環境', lead: '総生産量・純生産量・成長量と、栄養段階ごとのエネルギー効率の計算。' },
  { id: 'a14', code: 'A14', course: 'advanced', title: 'シナプスと興奮の統合', unit: '生物の環境応答', lead: 'EPSP と IPSP。時間的加重・空間的加重で閾値に達するかどうか。' },
  { id: 'a15', code: 'A15', course: 'advanced', title: 'PCRと電気泳動', unit: '遺伝情報の発現と発生', lead: 'PCR法で DNA を増やす計算と、電気泳動による DNA 断片の長さの推定。' },
  { id: 'a16', code: 'A16', course: 'advanced', title: '動物の行動', unit: '生物の環境応答', lead: 'ミツバチの8の字ダンスの角度と太陽コンパス。生得的行動と学習。' },
  { id: 'a17', code: 'A17', course: 'advanced', title: '光周性と花芽形成', unit: '生物の環境応答', lead: '連続した暗期と限界暗期。短日植物・長日植物と光中断。' },
  { id: 'a18', code: 'A18', course: 'advanced', title: '視覚', unit: '生物の環境応答', lead: '暗順応の曲線、錐体と桿体の分布、盲斑の大きさの計算。' },
  { id: 'a19', code: 'A19', course: 'advanced', title: '発生と位置情報', unit: '遺伝情報の発現と発生', lead: 'ビコイドの濃度勾配が前後軸を決める。母性効果遺伝子と位置情報。' },
  { id: 'a20', code: 'A20', course: 'advanced', title: '減数分裂と遺伝的多様性', unit: '生物の進化（有性生殖と遺伝子の組合せ）', lead: '減数分裂での DNA 量・染色体数の変化と、配偶子の組合せ 2ⁿ の計算。' },
];

export function stageById(id) {
  return STAGES.find((s) => s.id === id) || null;
}

export function stagesOf(course) {
  return STAGES.filter((s) => s.course === course);
}
