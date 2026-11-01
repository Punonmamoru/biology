// A13 生態系の物質生産とエネルギーの流れ
// 生産者：総生産量 ＝ 純生産量 ＋ 呼吸量
//         純生産量 ＝ 成長量 ＋ 被食量 ＋ 枯死量
// 消費者：同化量 ＝ 摂食量 − 不消化排出量
//         生産量 ＝ 同化量 − 呼吸量
//         成長量 ＝ 生産量 −（被食量 ＋ 死滅量）
// 生産者の被食量 ＝ 一次消費者の摂食量、一次消費者の被食量 ＝ 二次消費者の摂食量。
// エネルギー効率（%）：生産者 ＝ 総生産量 ÷ 生態系に入射した光エネルギー × 100
//                      消費者 ＝ その栄養段階の同化量 ÷ 1つ前の栄養段階の同化量（生産者は総生産量）× 100

// 割合（各段階の内訳の割合）から、各栄養段階の値を計算する。数値は相対値。
export const DEFAULT = {
  gross: 1000, // 生産者の総生産量
  pResp: 0.5, // 生産者：呼吸量 ÷ 総生産量
  pGrazed: 0.2, // 生産者：被食量 ÷ 純生産量
  pDead: 0.4, // 生産者：枯死量 ÷ 純生産量
  cUndigested: 0.3, // 消費者：不消化排出量 ÷ 摂食量
  cResp: 0.6, // 消費者：呼吸量 ÷ 同化量
  cGrazed: 0.25, // 一次消費者：被食量 ÷ 生産量
  cDead: 0.2, // 消費者：死滅量 ÷ 生産量
};

export function budget(p = DEFAULT) {
  const P = {};
  P.gross = p.gross;
  P.resp = p.gross * p.pResp;
  P.net = P.gross - P.resp;
  P.grazed = P.net * p.pGrazed;
  P.dead = P.net * p.pDead;
  P.growth = P.net - P.grazed - P.dead;

  const consumer = (intake, grazedFrac) => {
    const c = { intake };
    c.undigested = intake * p.cUndigested;
    c.assim = intake - c.undigested;
    c.resp = c.assim * p.cResp;
    c.prod = c.assim - c.resp;
    c.grazed = c.prod * grazedFrac;
    c.dead = c.prod * p.cDead;
    c.growth = c.prod - c.grazed - c.dead;
    return c;
  };
  const C1 = consumer(P.grazed, p.cGrazed);
  const C2 = consumer(C1.grazed, 0);
  return { P, C1, C2 };
}

export function efficiency(b) {
  return { c1: (b.C1.assim / b.P.gross) * 100, c2: (b.C2.assim / b.C1.assim) * 100 };
}

// 森林の林齢と物質生産（模式）
//   総生産量は葉の量とともに増えて、やがて一定になる。
//   呼吸量は、幹や枝など呼吸する部分（非同化器官）が増え続けるので増え続ける。
//   そのため純生産量（＝総生産量 − 呼吸量）は、若い森林で最大になり、その後しだいに小さくなる。
export function forest(age) {
  const gross = 100 * (1 - Math.exp(-age / 12));
  const resp = 35 * (1 - Math.exp(-age / 12)) + 0.45 * age;
  return { gross, resp, net: gross - resp };
}
