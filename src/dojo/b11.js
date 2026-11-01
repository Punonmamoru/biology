// B11 植生の遷移 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { STAGES, state, stageAt, seedlingGrows, COMP, PRIMARY_END, SECONDARY_SPEED } from '../models/succession.js';
import { sample } from '../lib/series.js';

const SEC_END = 150;
const SEC_START = 50; // 二次遷移は草原の段階から始まるとみなす（土壌や種子・根が残っている）
const effOf = (mode, t) => (mode === 'primary' ? t : SEC_START + t * SECONDARY_SPEED);

export const dojo = {
  tasks: [
    { id: 'pioneer', text: '一次遷移のはじめ（裸地）で、先駆種が何かを確かめよう（年数を少し進める）。', short: '先駆種' },
    { id: 'sunfloor', text: '陽樹林の段階で、林床が暗くなり陽樹の芽ばえが育たなくなる年数を見つけよう。', short: '陽樹の芽ばえが育たない' },
    { id: 'climax', text: '極相林（陰樹林）まで進めよう。', short: '極相林' },
    { id: 'secondary', text: '二次遷移に切り替え、一次遷移よりずっと早く森林になることを確かめよう。', short: '二次遷移は速い' },
  ],
  mount(root, ctx) {
    const st = { mode: 'primary', t: 0, touched: 0 };

    const top = panel(null);
    root.append(top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '遷移にともなう変化のグラフ', aspect: 0.7 });
    const leg = h('div');
    const status = h('p', { class: 'small', 'aria-live': 'polite' });
    top.append(leg, status, h('p', { class: 'small muted' }, '日本の暖温帯（関東〜九州の低地）での遷移の模式。年数は目安で、場所によって大きく異なる。'));

    const segM = segmented({ label: '遷移の種類', options: [{ value: 'primary', label: '一次遷移（溶岩台地など）' }, { value: 'secondary', label: '二次遷移（山火事・伐採のあと）' }], value: st.mode, onChange: (v) => { st.mode = v; st.t = 0; sT.setRange(0, v === 'primary' ? PRIMARY_END : SEC_END); sT.set(0, true); st.touched++; update(); } });
    const sT = slider({ label: '遷移が始まってからの年数', min: 0, max: PRIMARY_END, step: 5, value: st.t, format: (v) => `約 ${v} 年`, onInput: (v) => { st.t = v; st.touched++; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segM.el, sT.el), panel('いま何が起きているか', exp.el));

    function update() {
      const end = st.mode === 'primary' ? PRIMARY_END : SEC_END;
      const eff = (t) => effOf(st.mode, t);
      const s = state(eff(st.t));
      const stg = st.mode === 'secondary' && eff(st.t) < 50 ? STAGES[1] : stageAt(eff(st.t));
      title.replaceChildren(`${st.mode === 'primary' ? '一次遷移' : '二次遷移'}：いまは「${stg.name}」 `, modelNote());
      chart.draw({
        alt: `${st.t} 年：${stg.name}、林床の相対照度 ${fmt(s.floorLight, 0)}%`,
        x: { min: 0, max: end, label: '年数', step: st.mode === 'primary' ? 100 : 25 },
        y: { min: 0, max: 110, label: '相対値（%）', step: 20 },
        series: [
          { points: sample((t) => state(eff(t)).floorLight, 0, end, 300), color: 'c5', width: 3, label: '林床の相対照度', labelAt: end * 0.12 },
          { points: sample((t) => state(eff(t)).sunTrees, 0, end, 300), color: 'c2', dash: 'dash', width: 3, label: '陽樹', labelAt: st.mode === 'primary' ? 260 : 60 },
          { points: sample((t) => state(eff(t)).shadeTrees, 0, end, 300), color: 'c3', dash: 'dot', width: 3, label: '陰樹' },
          { points: sample((t) => (state(eff(t)).height / 25) * 100, 0, end, 300), color: 'c1', dash: 'dashdot', width: 2, label: '高さ', labelAt: end * 0.15 },
        ],
        hlines: [{ y: COMP.sun, color: 'c2', dash: 'dot', width: 1 }],
        vlines: [{ x: st.t, color: 'fg', dash: 'dot' }],
      });
      leg.replaceChildren(legend([
        { label: '林床の相対照度（林外＝100）', color: 'c5' },
        { label: '陽樹の量（最大＝100）', color: 'c2', dash: 'dash' },
        { label: '陰樹の量（最大＝100）', color: 'c3', dash: 'dot' },
        { label: '植生の高さ（最大＝100）', color: 'c1', dash: 'dashdot' },
        { label: `相対照度 ${COMP.sun}%（陽樹の芽ばえが育つ明るさの目安）`, color: 'c2', dash: 'dot' },
      ]));
      const sunOk = seedlingGrows('sun', s.floorLight);
      const shadeOk = seedlingGrows('shade', s.floorLight);
      status.textContent = `${st.t} 年：${stg.name}（${stg.plants}）。林床の相対照度 約${fmt(s.floorLight, 0)}%、陽樹の芽ばえ ${sunOk ? '育つ' : '育たない'}、陰樹の芽ばえ ${shadeOk ? '育つ' : '育たない'}。`;
      const lines = [];
      const id = stg.id;
      if (id === 'bare') lines.push('溶岩台地などの裸地には土壌がなく、栄養分や水分が少ない。乾燥や栄養の少なさに強い地衣類やコケ植物が最初に侵入する（先駆種）。日本の火山島などでは、ススキやイタドリなどの草本が先駆種になることも多い。');
      else if (id === 'grass') lines.push('土壌ができると、ススキなどの草本が生育して草原になる。遷移の初期に侵入する植物は、種子が小さく風で遠くまで運ばれるものが多い。');
      else if (id === 'shrub') lines.push('土壌がさらに発達すると、ヤシャブシ・ヤマツツジなどの低木が生育し、低木林になる。');
      else if (id === 'sun') lines.push('アカマツ・コナラなどの陽樹が育って陽樹林になる。陽樹は強い光のもとで成長が速いが、林が茂ると林床が暗くなり、陽樹の芽ばえは育ちにくくなる。');
      else if (id === 'mixed') lines.push('暗い林床でも育つ陰樹の芽ばえが成長し、陽樹と陰樹が混じった混交林になる。陽樹は寿命などで枯れると、陰樹に置きかわっていく。');
      else lines.push('スダジイ・タブノキなどの陰樹が優占する陰樹林になる。林床が暗くても陰樹の芽ばえは育つので、陰樹林は大きく変化しなくなる。この安定した状態を極相といい、その森林を極相林という。');
      lines.push(`陽樹の芽ばえは補償点が高いので、相対照度 約${COMP.sun}% 以下の林床では生育できない（目安）。陰樹の芽ばえは補償点が低いので、約${COMP.shade}% の暗い林床でも生育できる。光の強さと光合成の関係（B4）が、遷移の進み方を決めている。`);
      if (st.mode === 'secondary') lines.push('二次遷移は、山火事や伐採のあとなど、土壌や種子・根が残っている場所から始まるので、一次遷移よりずっと速く進む。');
      exp.set(lines);
      ctx.update({ ...st, stage: id, t: st.t, sunOk });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.mode === 'primary' && s.touched > 0 && s.stage === 'bare' && s.t > 0;
dojo.tasks[1].check = (s) => s.mode === 'primary' && s.stage === 'sun' && !s.sunOk;
dojo.tasks[2].check = (s) => s.stage === 'climax';
dojo.tasks[3].check = (s) => s.mode === 'secondary' && (s.stage === 'sun' || s.stage === 'mixed' || s.stage === 'climax');
