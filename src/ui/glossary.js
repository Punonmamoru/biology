// 用語帳：ステージごとの重要語と意味
import { h } from '../lib/dom.js';
import { STAGES, stageById } from '../stages.js';
import { GLOSSARY } from '../glossary.js';

export function renderGlossary(app, stageId) {
  let current = stageById(stageId) ? stageId : '';
  let query = '';
  const chips = h('div', { class: 'seg', role: 'group', 'aria-label': 'ステージ' });
  const chipBtns = [{ id: '', code: 'すべて' }, ...STAGES.filter((s) => GLOSSARY[s.id])].map((s) =>
    h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { current = s.id; draw(); } }, s.code),
  );
  chips.append(...chipBtns);
  const search = h('input', { type: 'search', class: 'search', placeholder: '用語をさがす（例：補償点）', 'aria-label': '用語をさがす', oninput: () => { query = search.value.trim(); draw(); } });
  const list = h('div');
  app.append(h('div', { class: 'hero' }, h('h1', null, '用語帳')), chips, search, h('div', { style: { height: '10px' } }), list);

  function draw() {
    const ids = [{ id: '' }, ...STAGES.filter((s) => GLOSSARY[s.id])];
    chipBtns.forEach((b, i) => b.setAttribute('aria-pressed', ids[i].id === current ? 'true' : 'false'));
    const stages = STAGES.filter((s) => GLOSSARY[s.id] && (!current || s.id === current));
    const blocks = [];
    for (const s of stages) {
      const terms = GLOSSARY[s.id].filter((t) => !query || t.term.includes(query) || t.desc.includes(query));
      if (!terms.length) continue;
      blocks.push(h('section', { class: 'panel' },
        h('h2', null, `${s.code} ${s.title}`),
        h('dl', null, ...terms.map((t) => h('div', { class: 'term' }, h('dt', null, t.term), h('dd', null, t.desc)))),
        h('div', { class: 'row' }, h('a', { class: 'btn', href: `#/dojo/${s.id}` }, '図解道場'), h('a', { class: 'btn', href: `#/rush/${s.id}` }, '4択ラッシュ')),
      ));
    }
    list.replaceChildren(...(blocks.length ? blocks : [h('div', { class: 'panel muted' }, '見つかりませんでした。')]));
  }
  draw();
  return null;
}
