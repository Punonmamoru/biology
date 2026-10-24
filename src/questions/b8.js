// B8 バイオーム の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { BIOMES, classify, polygons, T_MIN, T_MAX, P_MAX, VERTICAL, LAPSE, warmthIndex, biomeByWI, WI_ZONES, JAPAN_HORIZONTAL } from '../models/biome.js';

const FILL = { 森林: 'region-3', 草原: 'region-2', 荒原: 'region-4' };

// 図：区画の名前を出す／隠して記号にする
function biomeChart({ labels = true, marks = [], point = null }) {
  return {
    x: { min: T_MIN, max: T_MAX, label: '年平均気温（℃）', step: 5, grid: false },
    y: { min: 0, max: P_MAX, label: '年降水量（mm）', step: 1000 },
    polygons: polygons().map((p) => ({ points: p.points, fill: FILL[BIOMES[p.id].kind], stroke: 'muted', label: labels ? BIOMES[p.id].name : null, at: p.at })),
    texts: marks.map((m) => ({ x: m.at[0], y: m.at[1], text: m.label, color: 'c2' })),
    markers: point ? [{ x: point[0], y: point[1], color: 'c2', shape: 'diamond', label: point[2] || null }] : [],
    alt: 'バイオームと気候の関係の図',
  };
}

// 境界から十分離れた点を選ぶ（周囲の点も同じ区画になるもの）
function interiorPoint(rng, id) {
  for (let i = 0; i < 400; i++) {
    const T = rng.int(T_MIN * 2, T_MAX * 2) / 2;
    const P = rng.int(0, P_MAX / 50) * 50;
    if (classify(T, P) !== id) continue;
    const ok = [[-2, 0], [2, 0], [0, -150], [0, 150], [-2, -150], [2, 150], [-2, 150], [2, -150]].every(([dT, dP]) => classify(T + dT, P + dP) === id);
    if (ok) return [T, P];
  }
  return null;
}

const ALL = Object.keys(BIOMES);

export const B8 = [
  {
    id: 'b8-classify-point',
    stage: 'b8',
    level: 1,
    kind: 'graph',
    make(rng) {
      const id = rng.pick(ALL);
      const pt = interiorPoint(rng, id);
      if (!pt) return this.make(rng);
      const [T, P] = pt;
      const B = BIOMES[id];
      return {
        text: `図は、年平均気温と年降水量によるバイオームの分布を表している。年平均気温 ${fmt(T, 1)}℃、年降水量 ${P} mm の地域（図の◆）に成立するバイオームはどれか。`,
        chart: biomeChart({ labels: true, point: [T, P] }),
        correct: B.name,
        wrong: rng.shuffle(ALL.filter((k) => k !== id)).map((k) => BIOMES[k].name),
        explanation: `図の◆は${B.name}の区画に入る。陸上のバイオームは、まず年降水量によって森林・草原・荒原に分かれ、さらに年平均気温によって分かれるから、2つの値の組合せで決まる。`,
      };
    },
  },
  {
    id: 'b8-letter',
    stage: 'b8',
    level: 2,
    kind: 'graph',
    make(rng) {
      const pool = ['tropical', 'laurel', 'temperate', 'taiga', 'savanna', 'steppe', 'desert', 'tundra', 'sclerophyll', 'monsoon', 'subtropical'];
      const ids = rng.sample(pool, 4);
      const polys = polygons();
      const marks = ids.map((id, i) => ({ label: KATA[i], at: polys.find((p) => p.id === id).at }));
      const ask = rng.pick([0, 1, 2, 3]);
      const B = BIOMES[ids[ask]];
      const desc = {
        tropical: '一年中高温で降水量が多く、高木が何層にも重なる常緑広葉樹の森林',
        subtropical: '熱帯よりやや気温が低く、降水量の多い地域の常緑広葉樹林（日本では南西諸島）',
        monsoon: '雨季と乾季がある熱帯の地域で、乾季に葉を落とす樹木からなる森林',
        savanna: '熱帯で降水量が少ない地域の、イネのなかまの草本と樹木がまばらに生える草原',
        steppe: '温帯で降水量が少ない地域の、イネのなかまの草本が中心の草原',
        desert: '降水量が非常に少なく、乾燥に強い植物がまばらに生える荒原',
        tundra: '年平均気温が非常に低く、コケ植物・地衣類が中心の荒原',
        taiga: '冬の寒さがきびしい地域の、トウヒ・モミなどの常緑針葉樹が中心の森林',
        temperate: '冬に葉を落とすブナ・ミズナラなどの落葉広葉樹が中心の森林',
        laurel: 'スダジイ・タブノキなど、葉の表面に光沢のある常緑広葉樹が中心の森林',
        sclerophyll: '夏に乾燥し冬に雨が多い地域の、オリーブ・コルクガシなど硬く小さい葉をもつ常緑樹の森林',
      };
      return {
        text: `図のア〜エは、年平均気温と年降水量で区切ったバイオームの区画のいずれかを示している。「${desc[ids[ask]]}」が成立するのはどの区画か。`,
        chart: biomeChart({ labels: false, marks }),
        correct: KATA[ask],
        wrong: KATA.slice(0, 4).filter((_, i) => i !== ask),
        explanation: `この説明は${B.name}で、図の${KATA[ask]}にあたる。${B.kind === '森林' ? '降水量が十分に多いので森林になり、気温によって森林の種類が決まる' : B.kind === '草原' ? '降水量が少なく森林が成立しないので草原になる' : '気温が非常に低いか降水量が非常に少ないので、植物がまばらな荒原になる'}からである。`,
      };
    },
  },
  {
    id: 'b8-trees',
    stage: 'b8',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { trees: 'ブナ・ミズナラ', a: '夏緑樹林', why: '冬に葉を落とす落葉広葉樹で、冷温帯に分布する' },
        { trees: 'スダジイ・タブノキ・アラカシ', a: '照葉樹林', why: '葉の表面にクチクラ層が発達して光沢のある常緑広葉樹で、暖温帯に分布する' },
        { trees: 'エゾマツ・トドマツ', a: '針葉樹林', why: '寒さに強い常緑針葉樹で、亜寒帯（北海道の東北部など）に分布する' },
        { trees: 'ガジュマル・アコウ・ヘゴ', a: '亜熱帯多雨林', why: '亜熱帯の南西諸島に分布する常緑の樹木やシダ植物だ' },
      ];
      const x = rng.pick(Q);
      return {
        text: `日本で、${x.trees}が代表的な樹木であるバイオームはどれか。`,
        correct: x.a,
        wrong: Q.map((y) => y.a).filter((a) => a !== x.a).concat(['硬葉樹林', '雨緑樹林']),
        explanation: `${x.trees}は${x.a}の代表的な樹木である。${x.why}からである。`,
      };
    },
  },
  {
    id: 'b8-horizontal',
    stage: 'b8',
    level: 1,
    kind: 'term',
    make(rng) {
      const r = rng.pick(JAPAN_HORIZONTAL);
      return {
        text: `日本の水平分布で、${r.where}の低地に成立するバイオームはどれか。`,
        correct: BIOMES[r.biome].name,
        wrong: JAPAN_HORIZONTAL.filter((x) => x !== r).map((x) => BIOMES[x.biome].name).concat(['ステップ']),
        explanation: `${r.where}の低地は${r.zone}にあたり、${BIOMES[r.biome].name}（${r.trees}など）が成立する。日本はどこでも降水量が十分に多いので森林が成立し、緯度による気温の違いで森林の種類が変わるからである。`,
      };
    },
  },
  {
    id: 'b8-vertical-zone',
    stage: 'b8',
    level: 1,
    kind: 'term',
    make(rng) {
      const v = rng.pick(VERTICAL);
      const range = v.to >= 4000 ? `標高 約${v.from} m 以上` : `標高 約${v.from}〜${v.to} m`;
      return {
        text: `本州中部の垂直分布で、${v.zone}（${range}）に見られる植生はどれか。`,
        correct: v.veg,
        wrong: VERTICAL.filter((x) => x !== v).map((x) => x.veg).concat(['硬葉樹林（オリーブ・コルクガシ）']),
        explanation: `${v.zone}の植生は${v.veg}である。標高が高くなるほど気温が下がるので、水平分布で北へ向かうのと同じ順に、照葉樹林→夏緑樹林→針葉樹林と変わっていくからである。`,
      };
    },
  },
  {
    id: 'b8-lapse-calc',
    stage: 'b8',
    level: 2,
    kind: 'calc',
    make(rng) {
      const baseT = rng.int(12, 18);
      const rate = rng.pick([0.5, 0.6]);
      if (rng.chance(0.5)) {
        const elev = rng.pick([1000, 1500, 2000, 2500, 3000]);
        const ans = baseT - (rate * elev) / 100;
        const d = distinctNumbers(ans + 100, [baseT - rate * elev + 100, baseT - (rate * elev) / 1000 + 100, baseT + (rate * elev) / 100 + 100, ans + 102, ans + 99], '', 1);
        const un = (s) => fmt(Number(s) - 100, 1) + ' ℃';
        return {
          text: `標高0 m の地点の年平均気温が ${baseT}℃ の山がある。標高が100 m 高くなるごとに気温が ${rate}℃ 下がるとすると、標高 ${elev} m の地点の年平均気温は何℃か。`,
          correct: un(d.correct),
          wrong: d.wrong.map(un),
          ordered: true,
          explanation: `${elev} m は100 m の ${elev / 100} 倍なので、気温は ${rate} × ${elev / 100} ＝ ${fmt((rate * elev) / 100, 1)}℃ 下がり、${baseT} − ${fmt((rate * elev) / 100, 1)} ＝ ${fmt(ans, 1)}℃ となる。標高が高いほど気温が下がるので、山では標高によってバイオームが変わる（垂直分布）からである。`,
        };
      }
      const target = rng.pick([0, 2, 4, 6]);
      const elev = ((baseT - target) / rate) * 100;
      const d = distinctNumbers(elev, [(baseT - target) * rate * 100, ((baseT + target) / rate) * 100, (baseT - target) * 100, elev / 2, elev + 500], ' m', 0);
      return {
        text: `標高0 m の地点の年平均気温が ${baseT}℃ の山がある。標高が100 m 高くなるごとに気温が ${rate}℃ 下がるとすると、年平均気温が ${target}℃ になるのは標高何 m の地点か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `気温が ${baseT} − ${target} ＝ ${baseT - target}℃ 下がる標高を求めるので、${baseT - target} ÷ ${rate} × 100 ＝ ${fmt(elev, 0)} m となる。100 m ごとに ${rate}℃ ずつ下がるから、下がる温度を ${rate} でわれば100 m がいくつ分かがわかる。`,
      };
    },
  },
  {
    id: 'b8-wi-calc',
    stage: 'b8',
    level: 3,
    kind: 'calc',
    make(rng) {
      // 1月が最も寒く7〜8月が最も暑い、整数の月平均気温（5℃以下の月がまざる）
      const mean = rng.int(6, 16);
      const amp = rng.int(8, 12);
      const months = Array.from({ length: 12 }, (_, i) => Math.round(mean - amp * Math.cos((2 * Math.PI * (i - 0.5)) / 12)));
      const wi = warmthIndex(months);
      const wrongAll = months.reduce((a, t) => a + (t - 5), 0);
      const wrongSum = months.filter((t) => t > 5).reduce((a, t) => a + t, 0);
      const d = distinctNumbers(wi, [wrongAll, wrongSum, wi + 5 * months.filter((t) => t <= 5).length, wi - 10, wi + 12], '', 0);
      if (d.wrong.length < 3 || wrongAll === wi) return this.make(rng);
      const biome = BIOMES[biomeByWI(wi)].name;
      const z = WI_ZONES.find((zz) => wi >= zz.lo && wi < zz.hi);
      const zoneText = Number.isFinite(z.hi) ? `${z.lo}〜${z.hi}` : `${z.lo}以上`;
      return {
        text: `ある地点の月平均気温（℃）は、1月から順に ${months.join('、')} である。この地点の暖かさの指数はいくらか。ただし、暖かさの指数は月平均気温が5℃をこえる月について（月平均気温 − 5）を合計した値である。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `5℃をこえる月だけについて（月平均気温 − 5）をたすと ${months.filter((t) => t > 5).map((t) => t - 5).join('＋')} ＝ ${wi} となり、${zoneText}の範囲なので${biome}が成立する気候である。5℃以下の月は植物の生育にほとんど寄与しないとみなすから、合計に入れない。`,
      };
    },
  },
  {
    id: 'b8-grassland',
    stage: 'b8',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'サバンナとステップの違いとして正しいものはどれか。',
          correct: 'サバンナは熱帯の草原で樹木がまばらに生え、ステップは温帯の草原で樹木がほとんどない',
          wrong: ['サバンナは温帯の草原で、ステップは熱帯の草原である', 'サバンナは降水量が多い地域の森林で、ステップは草原である', 'どちらも降水量が非常に少ない荒原である'],
          explanation: 'どちらも降水量が少なく森林が成立しない地域の草原である。熱帯の草原がサバンナで樹木がまばらに生え、温帯の草原がステップで樹木がほとんど見られないから、気温の違いで区別される。',
        };
      }
      return {
        text: '年平均気温が同じでも、森林・草原・荒原のどれが成立するかが変わる主な原因はどれか。',
        correct: '年降水量の違い',
        wrong: ['土壌の色の違い', '昼の長さの違い', '標高の違いによる気温の差'],
        explanation: '年平均気温が同じでも、年降水量が多ければ森林、少なければ草原、非常に少なければ荒原になる。樹木が育つには多くの水が必要だから、降水量が少ない地域では森林が成立しない。',
      };
    },
  },
  {
    id: 'b8-deciduous',
    stage: 'b8',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '夏緑樹林の樹木が秋に葉を落とす理由として最も適当なものはどれか。',
          correct: '冬の低温で光合成がほとんどできない時期に、葉を維持する損失を避けるため',
          wrong: ['夏の乾燥で水が不足する時期に、蒸散を防ぐため', '雨季に葉が傷むのを防ぐため', '冬に光が強くなりすぎるのを防ぐため'],
          explanation: '夏緑樹林が分布する冷温帯は冬の寒さがきびしく、冬には光合成がほとんどできない。葉をつけたままでは呼吸や凍結による損失が大きいので、秋に落葉して冬を越すからである。',
        };
      }
      return {
        text: '雨緑樹林の樹木が葉を落とすのはいつか。',
        correct: '乾季',
        wrong: ['雨季', '冬の低温期', '一年中落葉しない'],
        explanation: '雨緑樹林は、雨季と乾季がはっきりした熱帯・亜熱帯に分布する。乾季には水が不足するので、葉を落として蒸散を抑えるからである。',
      };
    },
  },
  {
    id: 'b8-treeline',
    stage: 'b8',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '本州中部の高い山で、標高約2500 m より上に高木の森林が見られなくなる境界を何というか。',
        correct: '森林限界',
        wrong: ['極相', '林床', '環境収容力'],
        explanation: 'この境界を森林限界という。標高が高くなると気温が低く、風も強くなるので高木が育たず、それより上はハイマツなどの低木林や高山草原（お花畑）になるからである。',
      };
    },
  },
];
