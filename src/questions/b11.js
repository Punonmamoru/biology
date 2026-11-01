// B11 植生の遷移 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers, assignmentQuestion } from './common.js';
import { state } from '../models/succession.js';
import { sample } from '../lib/series.js';

const ORDER = ['荒原', '草原', '低木林', '陽樹林', '混交林', '陰樹林'];

export const B11 = [
  {
    id: 'b11-order',
    stage: 'b11',
    level: 1,
    kind: 'term',
    make(rng) {
      const correct = ORDER.join(' → ');
      const swap = (i, j) => { const a = ORDER.slice(); [a[i], a[j]] = [a[j], a[i]]; return a.join(' → '); };
      return {
        text: '溶岩台地などの裸地から始まる遷移（一次遷移）で、植生が移り変わる順として正しいものはどれか。',
        correct,
        wrong: rng.shuffle([swap(3, 5), swap(1, 2), swap(0, 1), swap(3, 4), swap(2, 3)]),
        explanation: '土壌のない裸地にはまず地衣類やコケ植物が侵入し、土壌ができると草原、低木林、陽樹林へと進む。陽樹林の林床は暗く、陽樹の芽ばえは育たないが陰樹の芽ばえは育つので、混交林を経て陰樹林（極相林）になる。',
      };
    },
  },
  {
    id: 'b11-pioneer',
    stage: 'b11',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '一次遷移で、裸地に最初に侵入する植物（先駆種）として最も適当なものはどれか。',
        correct: '地衣類やコケ植物',
        wrong: ['スダジイやタブノキ', 'アカマツやコナラ', 'ヤシャブシやヤマツツジ'],
        explanation: '裸地には土壌がなく、水や栄養分が少ないので、乾燥や貧栄養に強い地衣類やコケ植物が最初に侵入する。これらの遺体や岩石の風化によって土壌がつくられるから、のちに草本や木本が生育できるようになる。',
      };
    },
  },
  {
    id: 'b11-climax-why',
    stage: 'b11',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '陽樹林が、やがて陰樹林に移り変わる理由として最も適当なものはどれか。',
        correct: '陽樹林の林床は暗く、陽樹の芽ばえは育たないが、陰樹の芽ばえは育つことができるから',
        wrong: ['陰樹のほうが強い光のもとでの光合成速度が大きいから', '陽樹林の林床は明るく、陰樹の芽ばえだけが育つから', '陽樹は土壌の栄養分がないと育たないから'],
        explanation: '陽樹林が茂ると林床に届く光が弱くなり、補償点の高い陽樹の芽ばえは育たない。陰樹の芽ばえは補償点が低く弱い光でも成長できるので、陽樹が枯れるとしだいに陰樹に置きかわる。',
      };
    },
  },
  {
    id: 'b11-relative-light',
    stage: 'b11',
    level: 1,
    kind: 'calc',
    make(rng) {
      const open = rng.pick([50, 80, 100, 120]);
      const pct = rng.pick([2, 3, 5, 10, 20, 40]);
      const floor = (open * pct) / 100;
      const d = distinctNumbers(pct, [open / floor, floor, 100 - pct, pct * 10, pct / 10], ' %', 1);
      return {
        text: `晴れた日の正午に、森林の外の照度が ${open} キロルクス、林床の照度が ${fmt(floor, 1)} キロルクスであった。林床の相対照度は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `相対照度 ＝ 林床の照度 ÷ 林外の照度 × 100 ＝ ${fmt(floor, 1)} ÷ ${open} × 100 ＝ ${pct}% となる。天気や時刻で照度そのものは変わるので、林外に対する割合で比べると林床の明るさを比べやすいからである。`,
      };
    },
  },
  {
    id: 'b11-light-graph',
    stage: 'b11',
    level: 2,
    kind: 'graph',
    make(rng) {
      const t = rng.pick([20, 100, 250, 450]);
      const s = state(t);
      const grows = s.floorLight > 10;
      return {
        text: `図は、一次遷移が進むにつれて林床の相対照度がどう変わるかを表した模式図である。遷移が始まってから約${t}年（●）の林床で、陽樹の芽ばえは育つことができるか。陽樹の芽ばえは相対照度が約10%より明るくないと育たないものとする。`,
        chart: {
          x: { min: 0, max: 600, label: '遷移が始まってからの年数', step: 100 },
          y: { min: 0, max: 110, label: '林床の相対照度（%）', step: 20 },
          series: [{ points: sample((x) => state(x).floorLight, 0, 600, 300), color: 'c5', width: 3 }],
          hlines: [{ y: 10, color: 'c2', dash: 'dash', label: '10%', align: 'right' }],
          markers: [{ x: t, y: s.floorLight, color: 'c1', label: `約${fmt(s.floorLight, 0)}%` }],
          alt: '林床の相対照度の変化',
        },
        correct: grows ? '育つ（林床が十分に明るいから）' : '育たない（林床が暗いから）',
        wrong: ['育つ（林床が十分に明るいから）', '育たない（林床が暗いから）', '育つ（林床が暗いほど陽樹はよく育つから）', '育たない（林床が明るすぎるから）'],
        explanation: grows
          ? `約${t}年では相対照度が約${fmt(s.floorLight, 0)}%と10%より明るいので、陽樹の芽ばえは育つことができる。遷移の初期は植生が低く、林床まで光がよく届くからである。`
          : `約${t}年では相対照度が約${fmt(s.floorLight, 0)}%と10%より暗いので、陽樹の芽ばえは育たない。高い木が茂って光がさえぎられるので、補償点の高い陽樹の芽ばえは光合成で呼吸を補えないからである。`,
      };
    },
  },
  {
    id: 'b11-secondary',
    stage: 'b11',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '山火事や森林の伐採のあとに始まる遷移（二次遷移）が、一次遷移より速く進む理由として最も適当なものはどれか。',
        correct: '土壌がすでにあり、土壌中に種子や地下茎・根などが残っているから',
        wrong: ['土壌がなく、地衣類やコケ植物から始まるから', '山火事のあとは林床が暗いから', '二次遷移では陰樹から先に侵入するから'],
        explanation: '二次遷移は、土壌がすでにあるところから始まる。土壌中に種子や地下茎・根などが残っていて、すぐに草本などが生育できるので、一次遷移より速く進む。',
      };
    },
  },
  {
    id: 'b11-species',
    stage: 'b11',
    level: 2,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['草原', '陽樹林', '陰樹林'], ['ススキ', 'アカマツ', 'スダジイ']);
      return {
        text: '暖温帯での遷移の各段階で優占する植物の組合せとして正しいものはどれか。',
        correct: q.correct,
        wrong: q.wrong,
        explanation: '草原ではススキなどの草本、陽樹林ではアカマツ・コナラなどの陽樹、陰樹林ではスダジイ・タブノキなどの陰樹が優占する。陽樹は強い光のもとで速く成長し、陰樹は弱い光でも育つので、遷移の段階によって優占する樹種が変わるのである。',
      };
    },
  },
  {
    id: 'b11-gap',
    stage: 'b11',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '極相林でも、高木が倒れて林冠にすき間（ギャップ）ができると、そこに陽樹が生えることがある。この理由として最も適当なものはどれか。',
        correct: 'ギャップでは林床まで強い光が届き、陽樹の芽ばえも成長できるから',
        wrong: ['ギャップでは土壌がなくなり、一次遷移が始まるから', 'ギャップでは光が弱くなり、陽樹だけが育つから', '高木が倒れると、陰樹の芽ばえはすべて枯れるから'],
        explanation: 'ギャップができると林床まで強い光が届くので、成長の速い陽樹の芽ばえも育つことができる。大きなギャップでは陽樹が、小さなギャップでは陰樹の幼木が成長しやすく、このような入れかわり（ギャップ更新）によって極相林の中にも多様な樹種が保たれるのである。',
      };
    },
  },
  {
    id: 'b11-curve-read',
    stage: 'b11',
    level: 2,
    kind: 'graph',
    make(rng) {
      const sunIsA = rng.chance(0.5);
      const lab = sunIsA ? { sun: KATA[0], shade: KATA[1] } : { sun: KATA[1], shade: KATA[0] };
      return {
        text: '図のア・イは、遷移が進むにつれて、森林の高木に占める陽樹と陰樹の割合がどう変わるかを表した模式図である。陰樹を表すのはどちらか。',
        chart: {
          x: { min: 0, max: 600, label: '遷移が始まってからの年数', step: 100 },
          y: { min: 0, max: 110, label: '高木に占める割合（%）', step: 20 },
          series: [
            { points: sample((x) => state(x).sunTrees, 0, 600, 300), color: 'c2', dash: sunIsA ? 'solid' : 'dash', width: 3, label: lab.sun, labelAt: 220 },
            { points: sample((x) => state(x).shadeTrees, 0, 600, 300), color: 'c3', dash: sunIsA ? 'dash' : 'solid', width: 3, label: lab.shade, labelAt: 520 },
          ],
          alt: '陽樹と陰樹の割合の変化（ア・イ）',
        },
        correct: `${lab.shade}：遷移の後半に増え、最後まで優占しているから`,
        wrong: [`${lab.sun}：遷移の後半に増え、最後まで優占しているから`, `${lab.sun}：遷移の前半に増え、のちに減っているから`, `${lab.shade}：遷移の前半に増え、のちに減っているから`],
        explanation: `陰樹は${lab.shade}である。陽樹林の暗い林床でも陰樹の芽ばえは育つので、陽樹が枯れると陰樹に置きかわり、陰樹が極相林で優占するからである。`,
      };
    },
  },
];
