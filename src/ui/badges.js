// 実績バッジ一覧
import { h } from '../lib/dom.js';
import { getProgress } from '../progress.js';
import { BADGES, checkBadges } from '../badges.js';

function dateText(t) {
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function renderBadges(app) {
  checkBadges();
  const p = getProgress();
  const got = BADGES.filter((b) => p.badges[b.id]).length;
  app.append(
    h('div', { class: 'hero' }, h('h1', null, '実績バッジ'), h('p', { class: 'small muted' }, `${got} / ${BADGES.length} 個獲得`)),
    h('div', { class: 'badges' }, ...BADGES.map((b) => {
      const on = !!p.badges[b.id];
      const [cur, goal] = b.progress(p);
      return h('div', { class: 'badge' + (on ? '' : ' locked'), role: 'group', 'aria-label': `${b.name}：${on ? '獲得済み' : '未獲得'}` },
        h('span', { class: 'icon', 'aria-hidden': 'true' }, b.icon),
        h('span', { class: 'name' }, b.name),
        h('span', { class: 'small muted' }, b.desc),
        h('span', { class: 'state' }, on ? `✓ 獲得（${dateText(p.badges[b.id])}）` : `未獲得（${Math.min(cur, goal)} / ${goal}）`),
      );
    })),
    h('div', { class: 'row', style: { marginTop: '12px' } }, h('a', { class: 'btn grow', href: '#/transfer' }, '引き継ぎコード・設定'), h('a', { class: 'btn grow', href: '#/home' }, 'ホーム')),
  );
  return null;
}
