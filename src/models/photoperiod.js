// A17 光周性と花芽形成
// 花芽形成は、明期の長さではなく「連続した暗期の長さ」で決まる。
//   短日植物：連続した暗期が限界暗期より長くなると花芽を形成する（例：キク、アサガオ、オナモミ）
//   長日植物：連続した暗期が限界暗期より短くなると花芽を形成する（例：アブラナ、ホウレンソウ、コムギ）
//   （図解道場・問題では、暗期と限界暗期がちょうど等しくならない数値だけを使う）
//   中性植物：日長に関係なく花芽を形成する（例：トマト、トウモロコシ）
// 暗期の途中で短時間光を当てる（光中断）と、暗期は2つに分けられ、連続した暗期が短くなる。
export const TYPES = {
  short: { name: '短日植物', examples: 'キク・アサガオ・オナモミ' },
  long: { name: '長日植物', examples: 'アブラナ・ホウレンソウ・コムギ' },
  neutral: { name: '中性植物', examples: 'トマト・トウモロコシ' },
};

// 1日（24時間）の明暗。lightStart：明期の開始時刻、light：明期の長さ、breakAt：光中断の時刻（暗期の開始からの時間、なければ null）、breakLen：光中断の長さ
// 返り値：暗期の区間の長さの配列と、最も長い連続した暗期
export function darkPeriods(light, breakAt = null, breakLen = 1) {
  const dark = 24 - light;
  if (dark <= 0) return { periods: [], longest: 0 };
  if (breakAt == null || breakAt <= 0 || breakAt >= dark) return { periods: [dark], longest: dark };
  const a = breakAt;
  const b = Math.max(0, dark - breakAt - breakLen);
  return { periods: [a, b].filter((x) => x > 0), longest: Math.max(a, b) };
}

export function flowers(type, longestDark, critical) {
  if (type === 'neutral') return true;
  if (type === 'short') return longestDark > critical;
  return longestDark < critical;
}
