// A13 生態系の物質生産 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { DEFAULT, budget, efficiency, forest } from '../models/production.js';
import { sample } from '../lib/series.js';

// 区分ごとの塗り（区分名を図の中にも書くので、色だけに頼らない）
const FILL = { resp: 'region-2', undig: 'region-4', growth: 'region-3', grazed: 'region', dead: 'surface-2' };
const SHORT = { resp: '呼吸', undig: '不消化', growth: '成長', grazed: '被食', dead: '枯死・死亡' };

export const dojo = {
  tasks: [
    { id: 'resp', text: '①で、生産者の呼吸量の割合を大きくすると、純生産量が減り、上の栄養段階に届く量も減ることを確かめよう。', short: '呼吸が増えると' },
    { id: 'eff', text: '①で、一次消費者のエネルギー効率が10%をこえる条件を見つけよう。', short: 'エネルギー効率10%' },
    { id: 'peak', text: '②で、森林の純生産量が最大になる林齢を見つけよう。', short: '純生産量が最大' },
    { id: 'old', text: '②で、林齢を100年以上にして、総生産量はほぼ一定なのに純生産量が小さくなることを確かめよう。', short: '老齢の森林' },
  ],
  mount(root, ctx) {
    const st = { tab: 'flow', pResp: DEFAULT.pResp, pGrazed: DEFAULT.pGrazed, cUndigested: DEFAULT.cUndigested, cResp: DEFAULT.cResp, age: 20, respMoves: 0, touched: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'flow', label: '①栄養段階ごとの収支' }, { value: 'forest', label: '②森林の林齢と物質生産' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '物質生産のグラフ', aspect: 0.62 });
    const leg = h('div');
    const table = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, table, note);

    const pct = (v) => `${Math.round(v * 100)} %`;
    const mk = (key, label, min, max) => slider({ label, min, max, step: 0.05, value: st[key], format: pct, onInput: (v) => { st[key] = v; st.touched++; if (key === 'pResp') st.respMoves++; update(); } });
    const ctlFlow = h('div', null,
      mk('pResp', '生産者：総生産量のうち呼吸量の割合', 0.3, 0.8).el,
      mk('pGrazed', '生産者：純生産量のうち被食量の割合', 0.05, 0.5).el,
      mk('cUndigested', '消費者：摂食量のうち不消化排出量の割合', 0.1, 0.6).el,
      mk('cResp', '消費者：同化量のうち呼吸量の割合', 0.3, 0.9).el,
    );
    const sAge = slider({ label: '林齢（森林ができてからの年数）', min: 1, max: 150, step: 1, value: st.age, format: (v) => `${v} 年`, onInput: (v) => { st.age = v; st.touched++; update(); } });
    const ctlForest = h('div', null, sAge.el);
    const exp = explainBox();
    root.append(panel('操作', ctlFlow, ctlForest), panel('いま何が起きているか', exp.el));

    function layout() {
      ctlFlow.hidden = st.tab !== 'flow';
      ctlForest.hidden = st.tab !== 'forest';
      update();
    }

    function drawFlow() {
      const p = { ...DEFAULT, pResp: st.pResp, pGrazed: st.pGrazed, cUndigested: st.cUndigested, cResp: st.cResp };
      const b = budget(p);
      const e = efficiency(b);
      title.replaceChildren('栄養段階ごとの物質（エネルギー）の収支 ', modelNote('各段階のはじめの量を100%とした割合'));
      const rows = [
        { y: 2.5, total: b.P.gross, parts: [['resp', b.P.resp], ['growth', b.P.growth], ['grazed', b.P.grazed], ['dead', b.P.dead]] },
        { y: 1.5, total: b.C1.intake, parts: [['undig', b.C1.undigested], ['resp', b.C1.resp], ['growth', b.C1.growth], ['grazed', b.C1.grazed], ['dead', b.C1.dead]] },
        { y: 0.5, total: b.C2.intake, parts: [['undig', b.C2.undigested], ['resp', b.C2.resp], ['growth', b.C2.growth], ['dead', b.C2.dead]] },
      ];
      const polygons = [];
      for (const r of rows) {
        let x = 0;
        for (const [k, v] of r.parts) {
          const w = (v / r.total) * 100;
          if (w <= 0) continue;
          polygons.push({ points: [[x, r.y - 0.32], [x + w, r.y - 0.32], [x + w, r.y + 0.32], [x, r.y + 0.32]], fill: FILL[k], stroke: 'fg', label: w >= 11 ? SHORT[k] : '', at: [x + w / 2, r.y] });
          x += w;
        }
      }
      chart.draw({
        alt: `一次消費者のエネルギー効率 ${fmt(e.c1, 1)}%`,
        x: { min: 0, max: 100, label: '各段階のはじめの量に対する割合（%）', step: 20 },
        y: { min: 0, max: 3, ticks: [{ v: 2.5, text: '生産者' }, { v: 1.5, text: '一次消費者' }, { v: 0.5, text: '二次消費者' }] },
        polygons,
      });
      leg.replaceChildren(legend([{ label: '各段階のはじめの量：生産者は総生産量、消費者は摂食量', color: 'fg' }]));
      const r1 = (v) => fmt(v, 1);
      table.replaceChildren(
        h('div', { class: 'table-scroll' },
          h('table', { class: 'data' },
            h('thead', null, h('tr', null, h('th', null, ''), h('th', null, '生産者'), h('th', null, '一次消費者'), h('th', null, '二次消費者'))),
            h('tbody', null,
              h('tr', null, h('td', null, '総生産量／摂食量'), h('td', null, r1(b.P.gross)), h('td', null, r1(b.C1.intake)), h('td', null, r1(b.C2.intake))),
              h('tr', null, h('td', null, '不消化排出量'), h('td', null, '—'), h('td', null, r1(b.C1.undigested)), h('td', null, r1(b.C2.undigested))),
              h('tr', null, h('td', null, '同化量'), h('td', null, r1(b.P.gross)), h('td', null, r1(b.C1.assim)), h('td', null, r1(b.C2.assim))),
              h('tr', null, h('td', null, '呼吸量'), h('td', null, r1(b.P.resp)), h('td', null, r1(b.C1.resp)), h('td', null, r1(b.C2.resp))),
              h('tr', null, h('td', null, '純生産量／生産量'), h('td', null, r1(b.P.net)), h('td', null, r1(b.C1.prod)), h('td', null, r1(b.C2.prod))),
              h('tr', null, h('td', null, '被食量'), h('td', null, r1(b.P.grazed)), h('td', null, r1(b.C1.grazed)), h('td', null, '0')),
              h('tr', null, h('td', null, '枯死量／死亡量'), h('td', null, r1(b.P.dead)), h('td', null, r1(b.C1.dead)), h('td', null, r1(b.C2.dead))),
              h('tr', null, h('td', null, '成長量'), h('td', null, r1(b.P.growth)), h('td', null, r1(b.C1.growth)), h('td', null, r1(b.C2.growth))),
              h('tr', null, h('td', null, 'エネルギー効率'), h('td', null, '—'), h('td', null, `${fmt(e.c1, 1)}%`), h('td', null, `${fmt(e.c2, 1)}%`)),
            ),
          ),
        ),
      );
      note.textContent = `生産者の総生産量を ${DEFAULT.gross}、枯死量を純生産量の${Math.round(DEFAULT.pDead * 100)}%、消費者の死亡量（死滅量）を生産量の${Math.round(DEFAULT.cDead * 100)}%、一次消費者の被食量を生産量の${Math.round(DEFAULT.cGrazed * 100)}%とした模式（数値は相対値）。生産者のエネルギー効率は入射した光エネルギーが必要なので、ここでは求めない。`;
      exp.set([
        `生産者：純生産量 ＝ 総生産量 − 呼吸量 ＝ ${r1(b.P.gross)} − ${r1(b.P.resp)} ＝ ${r1(b.P.net)}。成長量 ＝ 純生産量 −（被食量 ＋ 枯死量）＝ ${r1(b.P.growth)}。生産者の被食量 ${r1(b.P.grazed)} が、一次消費者の摂食量になる。`,
        `一次消費者：同化量 ＝ 摂食量 − 不消化排出量 ＝ ${r1(b.C1.assim)}、生産量 ＝ 同化量 − 呼吸量 ＝ ${r1(b.C1.prod)}。エネルギー効率 ＝ ${r1(b.C1.assim)} ÷ ${r1(b.P.gross)} × 100 ＝ ${fmt(e.c1, 1)}%。`,
        '各栄養段階で呼吸によって熱として失われる分などがあるので、上の栄養段階ほど利用できるエネルギーは少なくなる。エネルギーは生態系の中を循環せず、最終的には熱として生態系の外へ出ていく。',
      ]);
      return { eff: e.c1 };
    }

    function drawForest() {
      const a = st.age;
      const f = forest(a);
      let best = 1;
      for (let t = 1; t <= 150; t++) if (forest(t).net > forest(best).net) best = t;
      title.replaceChildren('森林の林齢と物質生産 ', modelNote());
      chart.draw({
        alt: `林齢 ${a} 年：総生産量 ${fmt(f.gross, 0)}、呼吸量 ${fmt(f.resp, 0)}、純生産量 ${fmt(f.net, 0)}`,
        x: { min: 0, max: 150, label: '林齢（年）', step: 25 },
        y: { min: 0, max: 120, label: '量（相対値）', step: 20 },
        series: [
          { points: sample((t) => forest(t).gross, 0, 150, 300), color: 'c1', width: 3, label: '総生産量' },
          { points: sample((t) => forest(t).resp, 0, 150, 300), color: 'c2', dash: 'dash', width: 3, label: '呼吸量' },
          { points: sample((t) => forest(t).net, 0, 150, 300), color: 'c3', dash: 'dot', width: 3, label: '純生産量', labelAt: best },
        ],
        vlines: [{ x: a, color: 'muted', dash: 'dot' }],
        markers: [{ x: a, y: f.net, color: 'c3', shape: 'square', label: `純生産量 ${fmt(f.net, 0)}` }],
      });
      leg.replaceChildren(legend([{ label: '総生産量', color: 'c1' }, { label: '呼吸量', color: 'c2', dash: 'dash' }, { label: '純生産量（＝総生産量 − 呼吸量）', color: 'c3', dash: 'dot' }]));
      table.replaceChildren();
      note.textContent = `この模式では、純生産量は林齢 約${best}年で最大になる。`;
      exp.set([
        '森林が若いうちは、葉の量が増えるにつれて総生産量が大きくなり、純生産量も大きくなる。',
        '森林が成熟すると、葉の量はほぼ一定になるので総生産量はほぼ一定になる。一方、幹や枝・根などの光合成をしない部分（非同化器官）が増え続け、その呼吸量が増えるので、純生産量はしだいに小さくなる。',
        `林齢 ${a} 年：総生産量 ${fmt(f.gross, 0)}、呼吸量 ${fmt(f.resp, 0)}、純生産量 ${fmt(f.net, 0)}。`,
      ]);
      return { age: a, best };
    }

    function update() {
      const r = st.tab === 'flow' ? drawFlow() : drawForest();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'flow' && s.respMoves >= 1 && s.pResp >= 0.7;
dojo.tasks[1].check = (s) => s.tab === 'flow' && s.eff > 10;
dojo.tasks[2].check = (s) => s.tab === 'forest' && s.touched > 0 && Math.abs(s.age - s.best) <= 2;
dojo.tasks[3].check = (s) => s.tab === 'forest' && s.age >= 100;
