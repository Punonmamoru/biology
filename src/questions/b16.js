// B16 生物濃縮 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { chain, LEVELS } from '../models/bioaccumulation.js';

export const B16 = [
  {
    id: 'b16-ratio-calc',
    stage: 'b16',
    level: 1,
    kind: 'calc',
    make(rng) {
      const water = rng.pick([0.00002, 0.00005, 0.0001, 0.0002]);
      const r = rng.pick([1000, 5000, 20000, 50000, 100000, 400000]);
      const body = water * r;
      const d = distinctNumbers(r, [r / 10, r * 10, r / 100, r * 100, r / 2], ' 倍', 0);
      return {
        text: `ある湖の水中の DDT 濃度は ${water} ppm であった。この湖の魚を食べる鳥の体内の DDT 濃度は ${fmt(body, 2)} ppm であった。この鳥の濃縮率（体内の濃度 ÷ 水中の濃度）は何倍か。`,
        correct: d.correct.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        wrong: d.wrong.map((w) => w.replace(/\B(?=(\d{3})+(?!\d))/g, ',')),
        ordered: true,
        explanation: `濃縮率 ＝ ${fmt(body, 2)} ÷ ${water} ＝ ${r.toLocaleString('ja-JP')} 倍となる。DDT は分解されにくく脂肪に溶けやすいので、食物連鎖を通して上位の生物ほど体内に高い濃度でたまるからである。`,
      };
    },
  },
  {
    id: 'b16-chain-calc',
    stage: 'b16',
    level: 2,
    kind: 'calc',
    make(rng) {
      const p = rng.pick([0.02, 0.04, 0.05, 0.1]);
      const f = rng.pick([2, 3, 4, 5, 10]);
      const n = rng.pick([2, 3, 4]);
      const ans = p * Math.pow(f, n);
      const d = distinctNumbers(ans, [p * f * n, p * f, p * Math.pow(f, n - 1), p * Math.pow(f, n + 1), p + f * n], ' ppm', 3);
      return {
        text: `ある物質の濃度は、植物プランクトンで ${p} ppm であった。この物質は、食物連鎖で栄養段階が1つ上がるごとに体内の濃度が ${f} 倍になるとする。植物プランクトンから ${n} 段階上の生物の体内の濃度は何 ppm か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `1段階ごとに ${f} 倍になるので、${n} 段階上では ${p} × ${f}${n === 2 ? '²' : n === 3 ? '³' : '⁴'} ＝ ${fmt(ans, 3)} ppm となる。濃度は段階ごとに「足される」のではなく「かけ算で」高くなるので、上位の生物ほど急激に高い濃度になる。`,
      };
    },
  },
  {
    id: 'b16-mass-calc',
    stage: 'b16',
    level: 3,
    kind: 'calc',
    make(rng) {
      const ppm = rng.pick([2, 5, 10, 20, 25]);
      const kg = rng.pick([0.5, 1, 1.5, 2, 3]);
      const mg = ppm * kg;
      const d = distinctNumbers(mg, [ppm / kg, ppm * kg * 1000, ppm * kg / 1000, ppm, kg], ' mg', 3);
      return {
        text: `体重 ${kg} kg の鳥の体内の PCB 濃度が ${ppm} ppm であった。この鳥の体内に含まれる PCB は何 mg か。ただし 1 ppm は体重 1 kg あたり 1 mg とする。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `1 kg あたり ${ppm} mg 含まれるので、${ppm} × ${kg} ＝ ${fmt(mg, 3)} mg となる。ppm は百万分率で、1 kg（100万 mg）あたり 1 mg が 1 ppm にあたるからである。`,
      };
    },
  },
  {
    id: 'b16-graph',
    stage: 'b16',
    level: 2,
    kind: 'graph',
    make(rng) {
      const order = rng.shuffle(['acc', 'deg']);
      const data = { acc: chain({ f: rng.pick([3, 5, 8]) }), deg: chain({ bcf: 1, f: rng.pick([0.3, 0.5]) }) };
      const ask = order.indexOf('acc');
      const marks = ['水', '①', '②', '③', '④', '⑤'];
      return {
        text: `図は、2種類の物質ア・イについて、水中の濃度と、栄養段階ごとの生物の体内の濃度（対数目盛り）を表したものである（①植物プランクトン → ②動物プランクトン → ③小型の魚 → ④大型の魚 → ⑤魚を食べる鳥）。生物濃縮が起こっている物質と、その物質の性質の組合せとして正しいものはどれか。`,
        chart: {
          x: { min: -0.4, max: 5.4, label: '栄養段階', ticks: marks.map((m, i) => ({ v: i, text: m })) },
          y: { min: 1e-7, max: 1e4, log: true, label: '体内の濃度（ppm）' },
          series: order.map((k, i) => ({ points: data[k].map((v, j) => [j, v]), color: i ? 'c1' : 'c2', dash: i ? 'dash' : 'solid', width: 3, label: KATA[i], labelAt: 4.5 })),
          alt: '物質ア・イの栄養段階ごとの濃度',
        },
        correct: `${KATA[ask]}：分解されにくく、体外に排出されにくい`,
        wrong: [`${KATA[1 - ask]}：分解されにくく、体外に排出されにくい`, `${KATA[ask]}：分解されやすく、体外に排出されやすい`, `${KATA[1 - ask]}：分解されやすく、水に溶けやすい`],
        explanation: `${KATA[ask]}は水中より高い濃度で体内にたまり、栄養段階が上がるほどさらに高くなっているので、生物濃縮が起こっている。分解されにくく、体外に排出されにくい物質は、食べた生物の体内にたまり続けるからである。`,
      };
    },
  },
  {
    id: 'b16-property',
    stage: 'b16',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '生物濃縮が起こりやすい物質の性質として正しいものはどれか。',
        correct: '分解されにくく、脂肪に溶けやすく、体外に排出されにくい',
        wrong: ['分解されやすく、水に溶けやすく、体外に排出されやすい', '分解されにくいが、水に溶けやすく、すぐに尿として排出される', '生物にとって必要な栄養分で、すぐに呼吸で分解される'],
        explanation: '分解されにくく、脂肪に溶けやすく、体外に排出されにくい物質は、取り込まれると体内にたまっていく。食物連鎖の上位の生物は多くの下位の生物を食べるので、体内の濃度が高くなるからである。',
      };
    },
  },
  {
    id: 'b16-examples',
    stage: 'b16',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: '生物濃縮によって人の健康被害が起こった例として、熊本県や新潟県で起こった水俣病の原因物質はどれか。', correct: '有機水銀（メチル水銀）', wrong: ['二酸化炭素', 'フロン', 'リン酸塩'], explanation: '水俣病は、工場の排水に含まれた有機水銀（メチル水銀）が魚介類に濃縮され、それを食べた人に神経の障害が起こった公害である。有機水銀は体外に排出されにくく、食物連鎖を通して濃縮されたからである。' },
        { text: 'かつて殺虫剤として広く使われ、鳥の卵の殻を薄くして繁殖をさまたげたことで知られる、生物濃縮しやすい物質はどれか。', correct: 'DDT', wrong: ['フロン', '窒素酸化物', '二酸化硫黄'], explanation: 'DDT は分解されにくい殺虫剤で、食物連鎖を通して魚を食べる鳥などに高い濃度で蓄積した。その結果、卵の殻が薄くなって割れやすくなり、繁殖がさまたげられたので、多くの国で使用が禁止された。' },
      ];
      return rng.pick(Q);
    },
  },
  {
    id: 'b16-alien',
    stage: 'b16',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '外来生物の説明として正しいものはどれか。',
          correct: '人間の活動によって、本来の生息地から別の地域に持ちこまれて定着した生物',
          wrong: ['もとからその地域にすみ、数が減っている生物', '季節によって長い距離を移動する渡り鳥', '生態系のバランスを保つうえで大きな影響をもつ種'],
          explanation: '外来生物は、人間の活動によって本来の生息地以外に持ちこまれ、定着した生物である。天敵がいないことが多いので数が増え、在来生物を捕食したり競争で追いやったりして、生態系のバランスをくずすことがある。',
        };
      }
      return {
        text: '日本に持ちこまれた外来生物の例として正しいものはどれか。',
        correct: 'オオクチバス（ブラックバス）',
        wrong: ['ニホンザル', 'ゲンジボタル', 'ヤンバルクイナ'],
        explanation: 'オオクチバスは北アメリカ原産で、日本の湖や池に持ちこまれて定着した外来生物である。在来の魚や水生昆虫を食べるので、特定外来生物に指定されて飼育や放流が規制されている。',
      };
    },
  },
  {
    id: 'b16-eutrophication',
    stage: 'b16',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '生活排水などで湖や海に窒素やリンなどの栄養塩類が増え、植物プランクトンが異常に増えて赤潮やアオコが発生することがある。栄養塩類が増えるこの現象を何というか。',
          correct: '富栄養化',
          wrong: ['生物濃縮', '自然浄化', '酸性雨'],
          explanation: 'これは富栄養化である。増えた植物プランクトンが死ぬと、それを分解する微生物が水中の酸素を大量に使うので、魚などが酸欠で死ぬことがある。',
        };
      }
      return {
        text: '川に流れこんだ少量の有機物が、微生物による分解などによって減っていくはたらきを何というか。',
        correct: '自然浄化',
        wrong: ['富栄養化', '生物濃縮', '遷移'],
        explanation: 'これは自然浄化である。川の微生物が有機物を分解したり、水で薄められたりするので、流入量が少なければ水質がもとにもどる。ただし流入量が多すぎると、自然浄化が追いつかなくなる。',
      };
    },
  },
  {
    id: 'b16-why-top',
    stage: 'b16',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: `生物濃縮で、${LEVELS[5]}のような食物連鎖の上位の生物ほど体内の濃度が高くなる理由として最も適当なものはどれか。`,
        correct: '下位の生物を多く食べ、その体内にたまっていた物質を取り込み続けるから',
        wrong: ['上位の生物ほど水を多く飲むから', '上位の生物ほど体内でその物質を合成するから', '上位の生物ほど呼吸でその物質を分解しやすいから'],
        explanation: '上位の生物は、下位の生物を数多く食べて、それぞれの体内にたまっていた物質を取り込む。その物質は分解・排出されにくいので体内にたまり続けるから、栄養段階が上がるほど濃度が高くなる。',
      };
    },
  },
];
