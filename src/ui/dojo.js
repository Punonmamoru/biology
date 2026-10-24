// 図解道場の画面枠：シミュレーター本体＋「やってみよう」課題
import { h, toast } from '../lib/dom.js';
import { stageById } from '../stages.js';
import { getProgress, markVisited, markTask } from '../progress.js';
import { DOJOS } from '../dojo/index.js';
import { GENERATORS } from '../questions/index.js';
import { panel, modelNote } from '../dojo/common.js';
import { checkBadges } from '../badges.js';

export function renderDojo(app, stageId, ...args) {
  const stage = stageById(stageId);
  const dojo = DOJOS[stageId];
  markVisited(stageId);
  checkBadges();

  app.append(
    h('div', { class: 'hero' },
      h('div', { class: 'stage-head' }, h('span', { class: 'stage-code' }, stage.code), h('h1', { class: 'stage-title' }, stage.title)),
      h('div', { class: 'small muted' }, '図解道場 ', modelNote()),
    ),
  );

  if (!dojo) {
    app.append(panel('準備中', h('p', { class: 'muted' }, 'このステージの図解道場は準備中です。')));
    return null;
  }

  const taskItems = new Map();
  const st = getProgress().stages[stageId];
  const taskList = h('ul', { class: 'tasks' });
  for (const t of dojo.tasks) {
    const li = h('li', { class: st.tasks[t.id] ? 'done' : '' }, h('span', { class: 'task-mark', 'aria-hidden': 'true' }, st.tasks[t.id] ? '✓' : ''), h('span', { class: 'task-text' }, t.text));
    taskItems.set(t.id, li);
    taskList.append(li);
  }

  const ctx = {
    args,
    // 状態が変わるたびに呼ぶ。課題の達成を判定する
    update(state) {
      for (const t of dojo.tasks) {
        if (!t.check || getProgress().stages[stageId].tasks[t.id]) continue;
        let ok = false;
        try {
          ok = t.check(state);
        } catch (e) {
          ok = false;
        }
        if (ok && markTask(stageId, t.id)) {
          const li = taskItems.get(t.id);
          li.classList.add('done');
          li.querySelector('.task-mark').textContent = '✓';
          toast('やってみよう達成：' + (t.short || t.text));
          checkBadges();
        }
      }
    },
  };

  const body = h('div');
  app.append(body);
  const cleanup = dojo.mount(body, ctx);

  app.append(
    panel('やってみよう', taskList),
    h('div', { class: 'row' },
      GENERATORS.some((g) => g.stage === stageId) ? h('a', { class: 'btn primary grow', href: `#/rush/${stageId}` }, 'このステージの4択ラッシュへ') : null,
      h('a', { class: 'btn grow', href: `#/glossary/${stageId}` }, '用語帳'),
    ),
  );
  return cleanup;
}
