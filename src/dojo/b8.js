// B8 バイオーム の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { BIOMES, classify, polygons, CITIES, JAPAN_HORIZONTAL, VERTICAL, TREE_LINE, verticalZone, tempAt, LAPSE, warmthIndex, biomeByWI, WI_ZONES, T_MIN, T_MAX, P_MAX } from '../models/biome.js';

// 森林・草原・荒原で塗りを分ける（色だけに頼らず、各区画に名前を書く）
const FILL = { 森林: 'region-3', 草原: 'region-2', 荒原: 'region-4' };

// 月平均気温（平年値の概数、℃）
const MONTHLY = {
  札幌: [-3.2, -2.7, 1.1, 7.3, 13.0, 17.0, 21.1, 22.3, 18.6, 12.1, 5.2, -0.9],
  東京: [5.4, 6.1, 9.4, 14.3, 18.8, 21.9, 25.7, 26.9, 23.3, 18.0, 12.5, 7.7],
  那覇: [17.3, 17.5, 19.1, 21.5, 24.2, 27.2, 29.1, 29.0, 27.9, 25.5, 22.5, 19.0],
};

// 模式的な山の形（横は位置、縦は標高 m）
const PEAK = 3200;
const xl = (y) => (50 * y) / PEAK;
const xr = (y) => 100 - (50 * y) / PEAK;

export const dojo = {
  tasks: [
    { id: 'tokyo', text: '都市のボタンで「東京」を選び、東京が照葉樹林の区画に入ることを確かめよう。', short: '東京は照葉樹林' },
    { id: 'dry', text: '年平均気温を24℃以上にしたまま年降水量を減らし、熱帯多雨林 → 雨緑樹林 → サバンナ → 砂漠 と変わるのを確かめよう。', short: '降水量でバイオームが変わる' },
    { id: 'cold', text: '年降水量を1200 mm以上にしたまま気温を下げ、照葉樹林 → 夏緑樹林 → 針葉樹林 → ツンドラ と変わるのを確かめよう。', short: '気温でバイオームが変わる' },
    { id: 'alpine', text: '垂直分布で、標高を森林限界より上（高山帯）に合わせよう。', short: '森林限界をこえる' },
  ],
  mount(root, ctx) {
    const st = { T: 15.4, P: 1530, elev: 500, baseT: 16, city: '東京', wiCity: '東京' };
    const seenDry = new Set();
    const seenCold = new Set();
    const polys = polygons();

    // ---- 世界のバイオーム ----
    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '年平均気温・年降水量とバイオーム ', modelNote()));
    const chart = createChart(top, { label: 'バイオームの分布図', aspect: 0.95, maxHeight: 540 });
    top.append(h('p', { class: 'small muted' }, '境界は教科書の図の目安を直線でつないだ模式。濃い塗りが森林、中間が草原、うすい塗りが荒原。左上の白い部分は、そのような気候の地域がほとんどないことを表す。'));
    const sT = slider({ label: '年平均気温', min: T_MIN, max: T_MAX, step: 0.5, value: st.T, format: (v) => fmt(v, 1) + ' ℃', onInput: (v) => { st.T = v; st.city = null; segCity.set(null, true); update(); } });
    const sP = slider({ label: '年降水量', min: 0, max: P_MAX, step: 50, value: st.P, format: (v) => v + ' mm', onInput: (v) => { st.P = v; st.city = null; segCity.set(null, true); update(); } });
    const segCity = segmented({ label: '都市の気候（平年値の概数）', options: CITIES.map((c) => ({ value: c.name, label: c.name })), value: st.city, onChange: (v) => {
      const c = CITIES.find((x) => x.name === v);
      st.city = v;
      st.T = c.T;
      st.P = c.P;
      sT.set(Math.round(c.T * 2) / 2, true);
      sP.set(Math.round(c.P / 50) * 50, true);
      update();
    } });
    const result = h('div', { class: 'small', 'aria-live': 'polite' });
    const exp = explainBox();
    root.append(panel('操作', sT.el, sP.el, segCity.el, result), panel('いま何が起きているか', exp.el));

    // ---- 日本の水平分布・垂直分布 ----
    const jp = panel('日本のバイオーム');
    root.append(jp);
    jp.append(
      h('p', { class: 'small' }, '日本は降水量が十分に多いので、どこでも極相は森林になる。バイオームは主に気温で決まり、緯度による分布を', h('b', null, '水平分布'), '、標高による分布を', h('b', null, '垂直分布'), 'という。'),
      h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, h('th', null, '気候帯'), h('th', null, 'おもな地域（低地）'), h('th', null, 'バイオーム'), h('th', null, '代表的な樹木'))),
        h('tbody', null, ...JAPAN_HORIZONTAL.map((r) => h('tr', null, h('td', null, r.zone), h('td', null, r.where), h('td', null, BIOMES[r.biome].name), h('td', null, r.trees)))),
      )),
      h('h3', null, '垂直分布（本州中部の目安）'),
    );
    const vchart = createChart(jp, { label: '垂直分布の模式図', aspect: 0.7 });
    const sElev = slider({ label: '標高', min: 0, max: PEAK, step: 50, value: st.elev, format: (v) => v + ' m', onInput: (v) => { st.elev = v; update(); } });
    const sBase = slider({ label: 'ふもと（標高0 m）の年平均気温', min: 10, max: 20, step: 0.5, value: st.baseT, format: (v) => fmt(v, 1) + ' ℃', onInput: (v) => { st.baseT = v; update(); } });
    const vResult = h('div', { class: 'small', 'aria-live': 'polite' });
    jp.append(sElev.el, sBase.el, vResult);

    // ---- 暖かさの指数 ----
    const wiPanel = panel('計算：暖かさの指数（発展）');
    root.append(wiPanel);
    const segWI = segmented({ label: '都市', options: Object.keys(MONTHLY).map((k) => ({ value: k, label: k })), value: st.wiCity, onChange: (v) => { st.wiCity = v; update(); } });
    const wiBox = h('div', { 'aria-live': 'polite' });
    wiPanel.append(
      h('p', { class: 'small' }, h('b', null, '暖かさの指数 ＝ 月平均気温が5℃をこえる月について、（月平均気温 − 5）を1年分たし合わせた値'), '。植物の生育には5℃以上が必要と考えて、1年間の暖かさを数値で表したもの。'),
      segWI.el,
      wiBox,
    );

    function update() {
      const b = classify(st.T, st.P);
      chart.draw({
        alt: `年平均気温 ${fmt(st.T, 1)}℃、年降水量 ${st.P} mm：${b ? BIOMES[b].name : '該当なし'}`,
        x: { min: T_MIN, max: T_MAX, label: '年平均気温（℃）', step: 5, grid: false },
        y: { min: 0, max: P_MAX, label: '年降水量（mm）', step: 500 },
        polygons: polys.map((p) => ({ points: p.points, fill: FILL[BIOMES[p.id].kind], stroke: 'muted', label: BIOMES[p.id].name, at: p.at, bold: p.id === b })),
        markers: [{ x: st.T, y: st.P, color: 'c2', shape: 'diamond', label: st.city || 'いまの点' }],
      });
      if (b) {
        const B = BIOMES[b];
        result.replaceChildren(h('b', null, `判定：${B.name}`), `（${B.kind}）　おもな植物：${B.plants}`);
      } else {
        result.replaceChildren(h('b', null, '判定：該当なし'), '（この気温でこれほど降水量の多い地域はほとんどない）');
      }

      const lines = [];
      if (!b) lines.push('気温が低い地域では、大気中に含まれる水蒸気が少ないので、降水量がこれほど多くなることはほとんどない。');
      else if (BIOMES[b].kind === '森林') lines.push(`年降水量が十分に多いので森林が成立する。森林の種類（${BIOMES[b].name}）は主に気温で決まる。`);
      else if (BIOMES[b].kind === '草原') lines.push(`年降水量が少なく森林が成立しないので、草原（${BIOMES[b].name}）になる。熱帯の草原がサバンナ、温帯の草原がステップで、サバンナには樹木がまばらに生える。`);
      else lines.push(b === 'tundra' ? '年平均気温が非常に低いので、樹木が育たず、コケ植物・地衣類などがまばらに生える荒原（ツンドラ）になる。' : '年降水量が非常に少ないので、乾燥に強い植物がまばらに生える荒原（砂漠）になる。');
      lines.push('バイオームは、その地域の気候（気温と降水量）に応じて成立する植生と、そこにすむ動物などをまとめたものである。陸上では、降水量が多いと森林、少ないと草原、非常に少ないか気温が非常に低いと荒原になり、森林や草原の種類は主に気温で決まる。');
      exp.set(lines);
      if (b && st.T >= 24) seenDry.add(b);
      if (b && st.P >= 1200) seenCold.add(b);

      // 垂直分布
      const bands = VERTICAL.map((v) => {
        const a = v.from;
        const top2 = Math.min(v.to, PEAK);
        const pts = top2 >= PEAK ? [[xl(a), a], [xr(a), a], [50, PEAK]] : [[xl(a), a], [xr(a), a], [xr(top2), top2], [xl(top2), top2]];
        return { points: pts, fill: v.biome ? FILL[BIOMES[v.biome].kind] : 'region-4', stroke: 'muted', label: `${v.zone}`, at: [50, (a + top2) / 2 - (top2 >= PEAK ? 120 : 0)] };
      });
      const z = verticalZone(st.elev);
      const tHere = tempAt(st.baseT, 0, st.elev);
      vchart.draw({
        alt: `標高 ${st.elev} m：${z.zone}、${z.veg}`,
        x: { min: 0, max: 100, ticks: [], grid: false },
        y: { min: 0, max: 3500, label: '標高（m）', step: 500 },
        polygons: bands,
        hlines: [
          { y: 700, color: 'muted', dash: 'dot', width: 1, label: '約700 m', align: 'right' },
          { y: 1700, color: 'muted', dash: 'dot', width: 1, label: '約1700 m', align: 'right' },
          { y: TREE_LINE, color: 'c2', dash: 'dash', width: 1.5, label: `森林限界 約${TREE_LINE} m`, align: 'right' },
        ],
        markers: [{ x: xl(st.elev), y: st.elev, color: 'c2', shape: 'diamond', label: `${fmt(tHere, 1)}℃` }],
      });
      vResult.replaceChildren(
        h('div', null, h('b', null, `標高 ${st.elev} m：${z.zone}`), `　${z.veg}`),
        h('div', null, `気温の目安：${fmt(st.baseT, 1)} − ${LAPSE} × ${st.elev}／100 ＝ ${fmt(tHere, 1)} ℃（標高が100 m 上がるごとに約 ${LAPSE}℃ 下がるとした）`),
        h('div', { class: 'muted' }, '垂直分布の境界の標高は緯度によって変わり、北の地方ほど低くなる。'),
      );

      // 暖かさの指数
      const m = MONTHLY[st.wiCity];
      const wi = warmthIndex(m);
      const wb = biomeByWI(wi);
      wiBox.replaceChildren(
        h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '月'), ...m.map((_, i) => h('th', null, i + 1)))),
          h('tbody', null,
            h('tr', null, h('td', null, '気温'), ...m.map((t) => h('td', null, fmt(t, 1)))),
            h('tr', null, h('td', null, '−5'), ...m.map((t) => h('td', null, t > 5 ? fmt(t - 5, 1) : '—'))),
          ),
        )),
        h('p', null, `${st.wiCity}の暖かさの指数 ＝ `, h('b', null, fmt(wi, 1)), ` → `, h('b', null, BIOMES[wb].name), `（${WI_ZONES.map((zz) => `${zz.lo}${Number.isFinite(zz.hi) ? '〜' + zz.hi : '以上'}：${BIOMES[zz.biome].name}`).join('、')}）`),
      );

      ctx.update({ ...st, b, zone: z.zone, dryAll: ['tropical', 'monsoon', 'savanna', 'desert'].every((k) => seenDry.has(k)), coldAll: ['laurel', 'temperate', 'taiga', 'tundra'].every((k) => seenCold.has(k)) });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.city === '東京' && s.b === 'laurel';
dojo.tasks[1].check = (s) => s.dryAll;
dojo.tasks[2].check = (s) => s.coldAll;
dojo.tasks[3].check = (s) => s.elev >= TREE_LINE;
