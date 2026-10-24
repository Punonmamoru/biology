// ホーム：ステージ一覧（生物基礎 / 生物発展 の2タブ）と進捗
import { h } from '../lib/dom.js';
import { loadJSON, saveJSON } from '../lib/storage.js';
import { COURSES, stagesOf } from '../stages.js';
import { getProgress } from '../progress.js';
import { DOJOS } from '../dojo/index.js';
import { GENERATORS } from '../questions/index.js';

function stageCard(stage, p) {
  const st = p.stages[stage.id];
  const dojo = DOJOS[stage.id];
  const nTasks = dojo ? dojo.tasks.length : 0;
  const done = dojo ? dojo.tasks.filter((t) => st.tasks[t.id]).length : 0;
  const rate = st.answered ? Math.round((st.correct / st.answered) * 100) : null;
  const nGen = GENERATORS.filter((g) => g.stage === stage.id).length;
  return h(
    'article',
    { class: 'panel stage-card' },
    h('div', { class: 'stage-head' }, h('span', { class: 'stage-code' }, stage.code), h('span', { class: 'stage-title' }, stage.title)),
    h('div', { class: 'small muted' }, stage.unit, '　', stage.lead),
    h(
      'div',
      { class: 'small' },
      `やってみよう ${done}/${nTasks}`,
      '　',
      rate == null ? '4択 未挑戦' : `4択 正答率 ${rate}%（${st.correct}/${st.answered}）`,
    ),
    h('div', { class: 'progress', role: 'progressbar', 'aria-label': `${stage.code} やってみよう達成度`, 'aria-valuemin': 0, 'aria-valuemax': nTasks || 1, 'aria-valuenow': done },
      h('span', { style: { width: (nTasks ? (done / nTasks) * 100 : 0) + '%' } })),
    h(
      'div',
      { class: 'stage-actions' },
      h('a', { class: 'btn primary', href: `#/dojo/${stage.id}` }, '図解道場'),
      nGen ? h('a', { class: 'btn', href: `#/rush/${stage.id}` }, '4択ラッシュ') : h('span', { class: 'btn', 'aria-disabled': 'true' }, '準備中'),
      h('a', { class: 'btn', href: `#/glossary/${stage.id}` }, '用語帳'),
    ),
  );
}

export function renderHome(app) {
  const p = getProgress();
  let tab = loadJSON('homeTab', 'basic');
  if (!COURSES.some((c) => c.id === tab)) tab = 'basic';

  const list = h('div', { id: 'stage-list', role: 'tabpanel' });
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'コース' });
  const buttons = COURSES.map((c) =>
    h('button', {
      type: 'button',
      role: 'tab',
      id: 'tab-' + c.id,
      'aria-controls': 'stage-list',
      onclick: () => select(c.id),
    }, c.name),
  );
  tabs.append(...buttons);

  function select(id) {
    tab = id;
    saveJSON('homeTab', id);
    buttons.forEach((b, i) => {
      const on = COURSES[i].id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    list.setAttribute('aria-labelledby', 'tab-' + id);
    list.replaceChildren(...stagesOf(id).map((s) => stageCard(s, p)));
    const mixN = GENERATORS.filter((g) => stagesOf(id).some((s) => s.id === g.stage)).length;
    if (mixN) list.append(h('a', { class: 'btn block', href: `#/rush/mix-${id}` }, `${COURSES.find((c) => c.id === id).name} ミックス4択`));
  }
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = COURSES.findIndex((c) => c.id === tab);
    const j = (i + (e.key === 'ArrowRight' ? 1 : COURSES.length - 1)) % COURSES.length;
    select(COURSES[j].id);
    buttons[j].focus();
  });

  const totalAns = Object.values(p.stages).reduce((a, s) => a + s.answered, 0);
  const totalOk = Object.values(p.stages).reduce((a, s) => a + s.correct, 0);
  const nBadges = Object.keys(p.badges).length;

  app.append(
    h('section', { class: 'hero' },
      h('h1', null, 'BIOLOGY'),
      h('p', { class: 'muted small' }, '図解道場でスライダーを動かして形をつかみ、4択ラッシュで定着させよう。'),
    ),
    h('div', { class: 'panel small' }, `これまでの解答 ${totalAns}問（正解 ${totalOk}問）　連続正解の最高 ${p.bestStreak}問　バッジ ${nBadges}個`),
    tabs,
    list,
    h('nav', { class: 'home-links', 'aria-label': 'その他の画面' },
      h('a', { class: 'btn', href: '#/miss' }, 'ミスサマリー'),
      h('a', { class: 'btn', href: '#/glossary' }, '用語帳'),
      h('a', { class: 'btn', href: '#/badges' }, '実績バッジ'),
      h('a', { class: 'btn', href: '#/transfer' }, '引き継ぎ・設定'),
    ),
  );
  select(tab);
}
