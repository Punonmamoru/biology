// A17 光周性と花芽形成 の問題
import { KATA } from './common.js';
import { TYPES, darkPeriods, flowers } from '../models/photoperiod.js';

const yesNo = (b) => (b ? '花芽を形成する' : '花芽を形成しない');

export const A17 = [
  {
    id: 'a17-judge',
    stage: 'a17',
    level: 2,
    kind: 'calc',
    make(rng) {
      const type = rng.pick(['short', 'long']);
      const critical = rng.pick([9.5, 10.5, 11.5, 12.5]);
      const light = rng.pick([8, 10, 12, 14, 16]);
      const dark = 24 - light;
      const ok = flowers(type, dark, critical);
      return {
        text: `限界暗期が ${critical} 時間の${TYPES[type].name}を、明期 ${light} 時間・暗期 ${dark} 時間の条件で育てた。この植物は花芽を形成するか。`,
        correct: `${yesNo(ok)}（連続した暗期 ${dark} 時間が限界暗期より${dark > critical ? '長い' : '短い'}から）`,
        wrong: [`${yesNo(!ok)}（連続した暗期 ${dark} 時間が限界暗期より${dark > critical ? '長い' : '短い'}から）`, `${yesNo(!ok)}（明期 ${light} 時間が限界暗期より${light > critical ? '長い' : '短い'}から）`, `${yesNo(ok)}（明期 ${light} 時間が限界暗期より${light > critical ? '長い' : '短い'}から）`],
        explanation: `${TYPES[type].name}は、連続した暗期が限界暗期より${type === 'short' ? '長い' : '短い'}ときに花芽を形成する。この条件では暗期 ${dark} 時間が限界暗期 ${critical} 時間より${dark > critical ? '長い' : '短い'}ので、${yesNo(ok)}。花芽形成を決めるのは明期ではなく連続した暗期の長さだからである。`,
      };
    },
  },
  {
    id: 'a17-break',
    stage: 'a17',
    level: 3,
    kind: 'calc',
    make(rng) {
      const type = rng.pick(['short', 'long']);
      const critical = rng.pick([9.5, 10.5, 11.5]);
      const light = rng.pick([8, 9, 10]);
      const dark = 24 - light;
      const at = rng.pick([4, 5, 6, 7]);
      const dp = darkPeriods(light, at, 1);
      const ok = flowers(type, dp.longest, critical);
      const okNoBreak = flowers(type, dark, critical);
      return {
        text: `限界暗期が ${critical} 時間の${TYPES[type].name}を、明期 ${light} 時間・暗期 ${dark} 時間で育て、暗期が始まってから ${at} 時間後に1時間だけ光を当てた（光中断）。この植物は花芽を形成するか。`,
        correct: `${yesNo(ok)}（最も長い連続した暗期は ${dp.longest} 時間）`,
        wrong: [`${yesNo(!ok)}（最も長い連続した暗期は ${dp.longest} 時間）`, `${yesNo(okNoBreak)}（連続した暗期は ${dark} 時間）`, `${yesNo(!okNoBreak)}（連続した暗期は ${dark} 時間）`, `${yesNo(!ok)}（連続した暗期は ${dark - 1} 時間）`],
        explanation: `光中断で暗期は ${dp.periods.join(' 時間と ')} 時間に分けられ、最も長い連続した暗期は ${dp.longest} 時間になる。${TYPES[type].name}は連続した暗期が限界暗期 ${critical} 時間より${type === 'short' ? '長い' : '短い'}ときに花芽を形成するので、${yesNo(ok)}。`,
      };
    },
  },
  {
    id: 'a17-types',
    stage: 'a17',
    level: 1,
    kind: 'term',
    make(rng) {
      const t = rng.pick(['short', 'long', 'neutral']);
      return {
        text: `${TYPES[t].examples.split('・').slice(0, 2).join('や')}のように、${t === 'short' ? '連続した暗期が限界暗期より長くなると花芽を形成する' : t === 'long' ? '連続した暗期が限界暗期より短くなると花芽を形成する' : '日長に関係なく花芽を形成する'}植物を何というか。`,
        correct: TYPES[t].name,
        wrong: ['短日植物', '長日植物', '中性植物', '陰生植物'],
        explanation: `これは${TYPES[t].name}である。${t === 'neutral' ? 'なお、中性植物は日長ではなく、ある程度成長すると花芽を形成するので、季節に関係なく花をつけることができる。' : 'なお、名前は「日が短い（長い）ときに咲く」ことからついたが、実際に花芽形成を決めているのは連続した暗期の長さなので、光中断で結果が変わる。'}`,
      };
    },
  },
  {
    id: 'a17-leaf',
    stage: 'a17',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '短日植物の一部の葉だけを短日条件にし、残りを長日条件にしても花芽が形成された。また、短日処理した植物を、長日条件の植物に接ぎ木すると、長日条件の植物にも花芽が形成された。これらから考えられることとして最も適当なものはどれか。',
        correct: '日長は葉で感じとられ、葉でつくられた物質が移動して花芽形成を促す',
        wrong: ['日長は茎の先端（茎頂）で直接感じとられる', '日長は根で感じとられ、根でつくられた物質が花芽形成を促す', '花芽形成には、すべての葉が短日条件になる必要がある'],
        explanation: '一部の葉が短日条件を受ければ花芽ができ、接ぎ木でも効果が伝わるので、日長は葉で感じとられ、そこでつくられた物質が移動すると考えられる。この物質はフロリゲン（花成ホルモン）とよばれ、師管を通って茎頂に運ばれるからである。',
      };
    },
  },
  {
    id: 'a17-schedule-graph',
    stage: 'a17',
    level: 2,
    kind: 'graph',
    make(rng) {
      const critical = 10.5;
      const conds = [
        { light: 14, at: null },
        { light: 10, at: null },
        { light: 10, at: 6 },
      ];
      const type = rng.pick(['short', 'long']);
      const res = conds.map((c) => flowers(type, darkPeriods(c.light, c.at, 1).longest, critical));
      const ansIdx = res.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
      // 短日植物ではイだけ、長日植物ではアとウが正答になる
      const polys = [];
      conds.forEach((c, i) => {
        const y = 2.5 - i;
        const rect = (x0, x1, fill, label = '') => polys.push({ points: [[x0, y - 0.3], [x1, y - 0.3], [x1, y + 0.3], [x0, y + 0.3]], fill, stroke: 'fg', label: x1 - x0 >= 3 ? label : '', at: [(x0 + x1) / 2, y] });
        rect(0, c.light, 'day', '明期');
        if (c.at == null) rect(c.light, 24, 'night', '暗期');
        else {
          rect(c.light, c.light + c.at, 'night', '暗期');
          rect(c.light + c.at, c.light + c.at + 1, 'c2');
          rect(c.light + c.at + 1, 24, 'night', '暗期');
        }
      });
      const names = (ans) => ans.map((i) => KATA[i]).join('と');
      const correct = names(ansIdx);
      return {
        text: `図のア〜ウは、1日24時間の明期（明るい黄色）・暗期（濃い色）・光中断（暗期の中の朱色の部分、1時間）の条件である。限界暗期が ${critical} 時間の${TYPES[type].name}が花芽を形成するのはどの条件か。`,
        chart: {
          x: { min: 0, max: 24, label: '明期の開始からの時間（時間）', step: 2 },
          y: { min: 0, max: 3, ticks: [{ v: 2.5, text: 'ア' }, { v: 1.5, text: 'イ' }, { v: 0.5, text: 'ウ' }] },
          polygons: polys,
          alt: 'ア：明期14・暗期10、イ：明期10・暗期14、ウ：明期10・暗期14で6時間後に光中断',
        },
        correct,
        wrong: ['ア', 'イ', 'ウ', 'アとイ', 'アとウ', 'イとウ', 'アとイとウ'],
        explanation: `連続した暗期は、アが10時間、イが14時間、ウが6時間と7時間（最長7時間）である。${TYPES[type].name}は連続した暗期が ${critical} 時間より${type === 'short' ? '長い' : '短い'}ときに花芽を形成するので、${correct}で花芽を形成する。`,
      };
    },
  },
  {
    id: 'a17-vernal',
    stage: 'a17',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '秋まきコムギは、冬の低温を一定期間経験しないと、春になっても花芽を形成しない。このように、低温を経験することで花芽形成が促進される現象を何というか。',
        correct: '春化',
        wrong: ['光中断', '休眠', '頂芽優勢', '光屈性'],
        explanation: 'これは春化である。なお、冬の低温を経験したあとに花芽をつけるので、寒い冬の間に花が咲いてしまうことを防ぎ、春の適した時期に開花できる。',
      };
    },
  },
  {
    id: 'a17-photoreceptor',
    stage: 'a17',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '短日植物で、暗期の途中に赤色光を当てると花芽形成が抑えられるが、その直後に遠赤色光を当てると花芽が形成される。この反応にかかわる光受容体はどれか。',
        correct: 'フィトクロム',
        wrong: ['フォトトロピン', 'クリプトクロム', 'ロドプシン', 'クロロフィル'],
        explanation: 'これはフィトクロムで、赤色光を吸収すると遠赤色光吸収型（Pfr型）に、遠赤色光を吸収すると赤色光吸収型（Pr型）に変わる。最後に当てた光の種類でフィトクロムの型が決まるので、光中断の効果が赤色光と遠赤色光で打ち消し合うからである。',
      };
    },
  },
  {
    id: 'a17-critical-calc',
    stage: 'a17',
    level: 3,
    kind: 'calc',
    make(rng) {
      const critical = rng.pick([9.5, 10.5, 11.5]);
      const type = rng.pick(['short', 'long']);
      // 何時間以上（以下）の明期で花芽を形成するか
      const lim = 24 - critical;
      return {
        text: `限界暗期が ${critical} 時間の${TYPES[type].name}を、1日24時間のうち明期の長さだけを変えて育てる（光中断はしない）。花芽を形成する明期の長さの範囲を、過不足なく表したものはどれか。`,
        correct: type === 'short' ? `明期が ${lim} 時間より短いとき` : `明期が ${lim} 時間より長いとき`,
        // 短日植物で「明期が限界暗期の値より短いとき」は、花芽を形成する範囲の一部なので誤答に使わない
        wrong: [type === 'short' ? `明期が ${lim} 時間より長いとき` : `明期が ${lim} 時間より短いとき`, type === 'short' ? '明期の長さに関係なく花芽を形成する' : `明期が ${critical} 時間より短いとき`, `明期が ${critical} 時間より長いとき`],
        explanation: `暗期 ＝ 24 − 明期 なので、暗期が限界暗期 ${critical} 時間より${type === 'short' ? '長い' : '短い'}のは、明期が 24 − ${critical} ＝ ${lim} 時間より${type === 'short' ? '短い' : '長い'}ときである。花芽形成を決めるのは連続した暗期の長さなので、明期の長さに直すときは24時間から引いて考えなければならないからである。`,
      };
    },
  },
];
