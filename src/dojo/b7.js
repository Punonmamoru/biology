// B7 腎臓のはたらき の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, niceStep } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { SUBSTANCES, substanceById, concentrationRatio, filtrateVolume, reabsorption, waterReabsorption, DEFAULT } from '../models/kidney.js';

const pctText = (r) => fmt(r * 100, 1) + '%';

export const dojo = {
  tasks: [
    { id: 'gfr', text: '尿量を 2.0 L にしたとき、原尿量がちょうど 180 L になるように尿中のイヌリン濃度を合わせよう。', short: '原尿量を求める' },
    { id: 'glucose', text: '「グルコース」を選び、ろ過されたグルコースがすべて再吸収されることを確かめよう。', short: 'グルコースの再吸収' },
    { id: 'urea', text: '「尿素」を選び、再吸収率がグルコースや水よりずっと小さいことを確かめよう。', short: '尿素の再吸収率' },
    { id: 'protein', text: '「タンパク質」を選び、原尿に含まれない（ろ過されない）ことを確かめよう。', short: 'タンパク質はろ過されない' },
  ],
  mount(root, ctx) {
    const st = { U: DEFAULT.urineL, cInUrine: DEFAULT.inulinUrine, sub: 'urea' };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '原尿中の量と尿中の量（1日あたり） ', modelNote()));
    const chart = createChart(top, { label: '原尿中と尿中の物質量の棒グラフ', aspect: 0.62 });
    top.append(h('p', { class: 'small muted' }, '濃度は質量パーセント（%）で、血しょう・原尿・尿の1 mL を 1 g とみなして計算する。数値は教科書の表の目安。尿量とイヌリン濃度は計算の練習のために別々に動かせるが、実際のヒトの原尿量は1日約170〜180 L で、尿量が増えると尿は薄くなる。'));

    const sU = slider({ label: '1日の尿量', min: 0.5, max: 3, step: 0.1, value: st.U, format: (v) => fmt(v, 1) + ' L', onInput: (v) => { st.U = v; update(); } });
    const sIn = slider({ label: `尿中のイヌリン濃度（血しょう中は ${DEFAULT.inulinPlasma}%）`, min: 8, max: 24, step: 0.5, value: st.cInUrine, format: (v) => fmt(v, 1) + '%', onInput: (v) => { st.cInUrine = v; update(); } });
    const segSub = segmented({
      label: '調べる物質',
      options: [{ value: 'water', label: '水' }, ...SUBSTANCES.filter((s) => s.id !== 'inulin').map((s) => ({ value: s.id, label: s.name }))],
      value: st.sub,
      onChange: (v) => { st.sub = v; update(); },
    });
    const calcBox = h('div', { 'aria-live': 'polite' });
    const tableBox = h('div', { class: 'table-scroll' });
    const exp = explainBox();
    root.append(
      panel('操作', sU.el, sIn.el, segSub.el),
      panel('計算', calcBox),
      panel('いま何が起きているか', exp.el),
      panel('物質ごとの濃度・濃縮率・再吸収率（この設定の原尿量で計算）', tableBox),
    );

    function update() {
      const ratioIn = concentrationRatio(DEFAULT.inulinPlasma, st.cInUrine);
      const F = filtrateVolume(st.U, ratioIn); // L
      const Fml = F * 1000;
      const Uml = st.U * 1000;
      let bars;
      let unit;
      const lines = [];
      const calc = [
        h('p', null, h('b', null, 'イヌリンの濃縮率'), ` ＝ 尿中の濃度 ÷ 血しょう中の濃度 ＝ ${fmt(st.cInUrine, 1)} ÷ ${DEFAULT.inulinPlasma} ＝ `, h('b', null, fmt(ratioIn, 0))),
        h('p', null, h('b', null, '原尿量'), ` ＝ 尿量 × イヌリンの濃縮率 ＝ ${fmt(st.U, 1)} L × ${fmt(ratioIn, 0)} ＝ `, h('b', null, fmt(F, 1) + ' L')),
      ];
      let info;
      if (st.sub === 'water') {
        const r = waterReabsorption(F, st.U);
        info = { name: '水', rate: r };
        unit = 'L';
        bars = [F, st.U];
        calc.push(h('p', null, h('b', null, '水の再吸収率'), ` ＝ （原尿量 − 尿量）÷ 原尿量 ＝ （${fmt(F, 1)} − ${fmt(st.U, 1)}）÷ ${fmt(F, 1)} ＝ `, h('b', null, pctText(r))));
        lines.push(`原尿 ${fmt(F, 0)} L のうち ${fmt(F - st.U, 1)} L（${pctText(r)}）の水が、細尿管と集合管で再吸収されて血液にもどる。尿として出るのは ${fmt(st.U, 1)} L だけである。`);
        lines.push('集合管での水の再吸収は、脳下垂体後葉から分泌されるバソプレシンによって促進される。体内の水が不足するとバソプレシンが増えて尿量が減り、体液の濃度が一定に保たれる。');
      } else {
        const s = substanceById(st.sub);
        const ratio = concentrationRatio(s.plasma, s.urine);
        const ra = reabsorption(Fml, Uml, s.filtrate, s.urine);
        info = { name: s.name, rate: ra.rate, filtered: ra.filtered };
        unit = 'g';
        bars = [ra.filtered, ra.excreted];
        calc.push(h('p', null, h('b', null, `${s.name}の原尿中の量`), ` ＝ 原尿量 × 濃度 ＝ ${fmt(Fml, 0)} mL × ${s.filtrate}／100 ＝ ${fmt(ra.filtered, 1)} g`));
        calc.push(h('p', null, h('b', null, `${s.name}の尿中の量`), ` ＝ 尿量 × 濃度 ＝ ${fmt(Uml, 0)} mL × ${s.urine}／100 ＝ ${fmt(ra.excreted, 1)} g`));
        if (ra.filtered > 0) {
          calc.push(h('p', null, h('b', null, '再吸収率'), ` ＝ （${fmt(ra.filtered, 1)} − ${fmt(ra.excreted, 1)}）÷ ${fmt(ra.filtered, 1)} ＝ `, h('b', null, pctText(ra.rate))));
          lines.push(`${s.name}：濃縮率は ${fmt(ratio, 1)}。原尿中の ${fmt(ra.filtered, 1)} g のうち ${fmt(ra.reabsorbed, 1)} g（${pctText(ra.rate)}）が再吸収される。${s.note ? s.note + '。' : ''}`);
        } else {
          calc.push(h('p', null, '原尿中に含まれないので、再吸収率は考えない。'));
          lines.push(`${s.name}：${s.note}。そのため健康な人の原尿・尿にはほとんど含まれない。`);
        }
        if (st.sub === 'glucose') lines.push('グルコースは体に必要な物質なので、細尿管ですべて再吸収される。血糖値が非常に高いと再吸収しきれず、尿中にグルコースが出る（糖尿病で尿糖が出る理由）。');
        if (st.sub === 'urea') lines.push('尿素は肝臓でアンモニアからつくられる不要な物質である。一部は再吸収されるが、水のほうがはるかに多く再吸収されるので、尿中では血しょう中の約67倍に濃縮される。');
      }
      lines.push(`イヌリンはろ過されるが再吸収も分泌もされないので、尿中のイヌリンはすべて原尿に由来する。だから、原尿量 ＝ 尿量 × イヌリンの濃縮率 で原尿量を求められる（いまの設定で ${fmt(F, 0)} L／日）。`);

      const yMax = Math.max(1, bars[0] * 1.15);
      chart.draw({
        alt: `${info.name}：原尿中 ${fmt(bars[0], 1)} ${unit}、尿中 ${fmt(bars[1], 1)} ${unit}`,
        x: { min: 0, max: 1 },
        y: { min: 0, max: yMax, label: `${info.name}の量（${unit}／日）`, step: niceStep(yMax, 5), digits: yMax < 2 ? 1 : 0 },
        bars: { categories: ['原尿中', '尿中'], groups: [{ label: info.name, values: bars, color: 'c1' }] },
        texts: [
          { x: 0.25, y: Math.min(bars[0] + yMax * 0.05, yMax * 0.95), text: `${fmt(bars[0], 1)} ${unit}` },
          { x: 0.75, y: Math.min(bars[1] + yMax * 0.05, yMax * 0.95), text: `${fmt(bars[1], 1)} ${unit}` },
          info.filtered === 0 ? null : { x: 0.5, y: yMax * 0.6, text: `再吸収 ${pctText(info.rate)}`, color: 'c2' },
        ].filter(Boolean),
      });
      calcBox.replaceChildren(...calc);

      const rows = [{ name: '水', plasma: '—', urine: '—', ratio: st.U / F, rate: waterReabsorption(F, st.U), water: true }, ...SUBSTANCES.map((s) => {
        const ra = reabsorption(Fml, Uml, s.filtrate, s.urine);
        return { name: s.name, plasma: s.plasma, filtrate: s.filtrate, urine: s.urine, ratio: s.urine / s.plasma, rate: ra.filtered > 0 ? ra.rate : null, inulin: s.id === 'inulin' };
      })];
      tableBox.replaceChildren(h('table', { class: 'data' },
        h('thead', null, h('tr', null, h('th', null, '物質'), h('th', null, '血しょう'), h('th', null, '原尿'), h('th', null, '尿'), h('th', null, '濃縮率'), h('th', null, '再吸収率'))),
        h('tbody', null, ...rows.map((r) => h('tr', null,
          h('td', null, r.name),
          h('td', null, r.water ? '—' : r.plasma + '%'),
          h('td', null, r.water ? '—' : r.filtrate + '%'),
          h('td', null, r.water ? '—' : (r.inulin ? fmt(st.cInUrine, 1) : r.urine) + '%'),
          h('td', null, r.water ? '—' : r.inulin ? fmt(ratioIn, 0) : fmt(r.ratio, r.ratio < 10 ? 1 : 0)),
          h('td', null, r.inulin ? '0%（再吸収されない）' : r.rate == null ? 'ろ過されない' : pctText(r.rate)),
        ))),
      ));
      exp.set(lines);
      ctx.update({ ...st, F, ratioIn, rate: info.rate });
    }

    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => Math.abs(s.U - 2) < 0.01 && Math.abs(s.F - 180) < 0.5;
dojo.tasks[1].check = (s) => s.sub === 'glucose';
dojo.tasks[2].check = (s) => s.sub === 'urea';
dojo.tasks[3].check = (s) => s.sub === 'protein';
