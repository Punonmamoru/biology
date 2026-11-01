// B11 植生の遷移（日本の暖温帯での一次遷移の模式）
// 裸地 → 荒原（地衣類・コケ植物）→ 草原（ススキなど）→ 低木林（ヤシャブシ・ヤマツツジなど）
// → 陽樹林（アカマツ・コナラなど）→ 混交林 → 陰樹林（スダジイ・タブノキなど：極相林）
// 一次遷移は土壌がない状態から始まるので長い年月（数百年以上）がかかる。
// 二次遷移は土壌や種子・根などが残っているところから始まるので速く進む。
export const STAGES = [
  { id: 'bare', name: '裸地・荒原', plants: '地衣類・コケ植物（先駆種）', from: 0 },
  { id: 'grass', name: '草原', plants: 'ススキ・イタドリなどの草本', from: 50 },
  { id: 'shrub', name: '低木林', plants: 'ヤシャブシ・ヤマツツジなど', from: 120 },
  { id: 'sun', name: '陽樹林', plants: 'アカマツ・コナラなど', from: 180 },
  { id: 'mixed', name: '混交林', plants: '陽樹と陰樹が混じる', from: 300 },
  { id: 'climax', name: '陰樹林（極相林）', plants: 'スダジイ・タブノキ・アラカシなど', from: 420 },
];
export const PRIMARY_END = 600;
export const SECONDARY_SPEED = 4; // 二次遷移では、このモデルでは4倍の速さで進む（模式）

const sig = (x, mid, w) => 1 / (1 + Math.exp(-(x - mid) / w));

// 年数 t（一次遷移の年数に換算した値）での各指標（模式・相対値）
export function state(t) {
  const soil = 100 * sig(t, 120, 40); // 土壌の発達
  const height = 2 + 23 * sig(t, 230, 45); // 植生の高さ［m］
  const sunTrees = 100 * sig(t, 190, 25) * (1 - sig(t, 380, 45)); // 陽樹の割合（森林に占める）
  const shadeTrees = 100 * sig(t, 360, 45);
  // 林床の相対照度［%］：植生が高く茂るほど小さくなる。陰樹林では数%以下
  const floorLight = 100 - 97 * sig(t, 170, 25);
  return { soil, height, sunTrees, shadeTrees, floorLight };
}

export function stageAt(t) {
  let s = STAGES[0];
  for (const x of STAGES) if (t >= x.from) s = x;
  return s;
}

// 相対照度（%）＝ 林床の照度 ÷ 林外（裸地）の照度 × 100
export function relativeLight(floor, open) {
  return (floor / open) * 100;
}

// 芽ばえが育つかどうか（B4 の光―光合成曲線の考え方：補償点より明るくないと育たない。模式）
// 陽樹の芽ばえの補償点は相対照度 約10%、陰樹の芽ばえは約2%（目安）
export const COMP = { sun: 10, shade: 2 };
export function seedlingGrows(kind, relLight) {
  return relLight > COMP[kind];
}
