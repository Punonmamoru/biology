// A17 光周性と花芽形成 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { TYPES, darkPeriods, flowers } from '../models/photoperiod.js';

export const dojo = {
  tasks: [
    { id: 'short', text: '明期を短くして（暗期を長くして）、短日植物が花芽を形成する条件にしよう。', short: '短日植物の花芽形成' },
    { id: 'long', text: '明期を長くして、長日植物だけが花芽を形成する条件にしよう。', short: '長日植物の花芽形成' },
    { id: 'break', text: '短日植物が花芽を形成する条件で光中断を入れ、花芽を形成しなくなることを確かめよう。', short: '光中断' },
    { id: 'samelight', text: '光中断を入れると、明期の合計がほぼ同じでも長日植物が花芽を形成することを確かめよう。', short: '暗期の長さが決め手' },
  ],
  mount(root, ctx) {
    const st = { light: 12, critical: 10.5, useBreak: false, breakAt: 5, touched: 0 };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '1日の明期・暗期と花芽形成 ', modelNote()));
    const chart = createChart(top, { label: '1日の明暗の図', aspect: 0.42 });
    const leg = h('div');
    const table = h('div');
    top.append(leg, table);

    const sL = slider({ label: '明期の長さ（1日24時間のうち）', min: 4, max: 20, step: 1, value: st.light, format: (v) => `${fmt(v, 1)} 時間（暗期 ${fmt(24 - v, 1)} 時間）`, onInput: (v) => { st.light = v; st.touched++; update(); } });
    const sC = slider({ label: '限界暗期', min: 8.5, max: 13.5, step: 1, value: st.critical, format: (v) => `${fmt(v, 1)} 時間`, onInput: (v) => { st.critical = v; st.touched++; update(); } });
    const segB = segmented({ label: '光中断（暗期の途中で約1時間、光を当てる）', options: [{ value: false, label: 'なし' }, { value: true, label: 'あり' }], value: st.useBreak, onChange: (v) => { st.useBreak = v; st.touched++; update(); } });
    const sB = slider({ label: '光中断の時刻（暗期が始まってから）', min: 1, max: 12, step: 1, value: st.breakAt, format: (v) => `${fmt(v, 1)} 時間後`, onInput: (v) => { st.breakAt = v; st.touched++; update(); } });
    const exp = explainBox();
    root.append(panel('操作', sL.el, sC.el, segB.el, sB.el), panel('いま何が起きているか', exp.el));

    function update() {
      const dark = 24 - st.light;
      const br = st.useBreak && st.breakAt < dark ? st.breakAt : null;
      const dp = darkPeriods(st.light, br, 1);
      const res = Object.fromEntries(Object.keys(TYPES).map((k) => [k, flowers(k, dp.longest, st.critical)]));
      // 明期は 6時 から始まるとして描く
      const L0 = 6;
      const polys = [];
      const rect = (x0, x1, fill, label) => polys.push({ points: [[x0, 0.25], [x1, 0.25], [x1, 0.75], [x0, 0.75]], fill, stroke: 'fg', label, at: [(x0 + x1) / 2, 0.5] });
      const seg = (from, len, fill, label) => {
        let a = from % 24;
        let left = len;
        let first = true;
        while (left > 1e-9) {
          const end = Math.min(24, a + left);
          rect(a, end, fill, first && end - a >= 2 ? label : '');
          first = false;
          left -= end - a;
          a = 0;
        }
      };
      seg(L0, st.light, 'day', '明期');
      const ds = L0 + st.light;
      if (br != null) {
        seg(ds, br, 'night', fmt(br, 1) + 'h');
        seg(ds + br, 1, 'c2', '');
        seg(ds + br + 1, Math.max(0, dark - br - 1), 'night', fmt(Math.max(0, dark - br - 1), 1) + 'h');
      } else seg(ds, dark, 'night', `暗期 ${fmt(dark, 1)}h`);
      chart.draw({
        alt: `明期 ${st.light} 時間、最も長い連続した暗期 ${dp.longest} 時間`,
        x: { min: 0, max: 24, label: '時刻（時）', step: 3 },
        y: { min: 0, max: 1, ticks: [] },
        polygons: polys,
        texts: br != null ? [{ x: ((ds + br + 0.5) % 24), y: 0.88, text: '光中断', color: 'c2' }] : [],
      });
      leg.replaceChildren(legend([{ label: '明期（6時から）', color: 'day', bar: true }, { label: '暗期', color: 'night', bar: true }, { label: '光中断', color: 'c2', bar: true }]));
      table.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '植物'), h('th', null, '例'), h('th', null, '花芽形成'))),
          h('tbody', null, ...Object.entries(TYPES).map(([k, t]) => h('tr', null, h('td', null, t.name), h('td', null, t.examples), h('td', null, res[k] ? '◎ する' : '× しない')))),
        ),
      );
      const lines = [];
      lines.push(`最も長い連続した暗期は ${fmt(dp.longest, 1)} 時間${br != null ? `（光中断で ${dp.periods.map((x) => fmt(x, 1)).join(' 時間と ')} 時間に分けられた）` : ''}、限界暗期は ${fmt(st.critical, 1)} 時間。`);
      lines.push(`短日植物は、連続した暗期が限界暗期より長いとき花芽を形成する（いまは${res.short ? 'する' : 'しない'}）。長日植物は、連続した暗期が限界暗期より短いとき花芽を形成する（いまは${res.long ? 'する' : 'しない'}）。`);
      if (br != null) lines.push('暗期の途中で短時間光を当てると（光中断）、明期の長さはほとんど変わらないのに、連続した暗期が短くなる。花芽形成を決めているのは明期の長さではなく、連続した暗期の長さであることがわかる。');
      lines.push('日長は葉で感じとられ、葉でつくられたフロリゲン（花成ホルモン）が師管を通って茎頂に運ばれ、花芽が形成される。');
      exp.set(lines);
      const noBreakShort = flowers('short', darkPeriods(st.light).longest, st.critical);
      const noBreakLong = flowers('long', darkPeriods(st.light).longest, st.critical);
      ctx.update({ ...st, res, br, noBreakShort, noBreakLong });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.touched > 0 && s.br == null && s.res.short;
dojo.tasks[1].check = (s) => s.touched > 0 && s.br == null && s.res.long && !s.res.short;
dojo.tasks[2].check = (s) => s.br != null && s.noBreakShort && !s.res.short;
dojo.tasks[3].check = (s) => s.br != null && !s.noBreakLong && s.res.long;
