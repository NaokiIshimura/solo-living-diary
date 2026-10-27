// ドット絵（ピクセルアート）。128×72 の canvas に描き、CSS の image-rendering: pixelated で拡大する。
// 人物は 16×16 の文字の格子（TPL）とパレットで描く（異世界転生日記と同じ描き方）。
// 新婚日記にも同じファイルを置くので、絵の部品はここにまとめ、ゲームごとの場面は stage の関数で組み立てる。

export const W = 128;
export const H = 72;
export const GY = 56; // 床の線（ここから下が床）
export const OUT = "#1a1028"; // 輪郭

export function px(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 色を明るく（amt > 0）・暗く（amt < 0）する
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// 人物（2頭身）。e は目、m は口、p はほお、h は髪、s は肌、c は服、C はズボン・スカート、b は靴
const TPL = {
  M: [
    "................",
    ".....kkkkkk.....",
    "...kkhhhhhhkk...",
    "..khhhhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khhshhhhshhk..",
    "..khsssssssshk..",
    "..kssessssessk..",
    "..kpsessssespk..",
    "...kssssmsssk...",
    "....kkkkkkkk....",
    "...kccccccccck..",
    "..ksccccccccsk..",
    "...kcccccccck...",
    "....kCCkkCCk....",
    "....kbbk.kbbk...",
  ],
  F: [
    "................",
    ".....kkkkkk.....",
    "...kkhhhhhhkk...",
    "..khhhhhhhhhhk..",
    ".khhhhhhhhhhhhk.",
    ".khhhshhhhshhhk.",
    ".khhsssssssshhk.",
    ".khssessssesshk.",
    ".khpsessssesphk.",
    ".khhssssmssshhk.",
    ".khkkkkkkkkkkhk.",
    "..kkccccccccck..",
    "..ksccccccccsk..",
    "...kCCCCCCCCk...",
    "..kCCCCCCCCCCk..",
    "....kbbk.kbbk...",
  ],
};

// 表情：ふつう（両目2点）、にこにこ（目は上の1点、口を広げる）、しょんぼり（目は下の1点、口は小さく）
function withMood(rows, mood) {
  if (mood === "mid") return rows;
  return rows.map((row, r) => {
    if (mood === "high") {
      if (r === 8) return row.replace(/e/g, "s");
      if (r === 9) return row.replace(/sms/, "mmm");
    }
    if (mood === "low") {
      if (r === 7) return row.replace(/e/g, "s");
      if (r === 8) return row.replace(/p/g, "s");
    }
    return row;
  });
}

export function personPalette({ hair = "#2b2633", cloth, pants, skin = "#f6d3b3" } = {}) {
  return { k: OUT, s: skin, h: hair, c: cloth, C: pants || shade(cloth, -0.35), e: OUT, m: "#c0504d", p: "#f2a0a0", b: "#5a3a24" };
}

export const LOOK = {
  male: { hair: "#2b2633", cloth: "#3a6ad1" },
  female: { hair: "#5a3426", cloth: "#c4473a" },
};

// 人物を描く。x, y は左上。scale 倍の大きさ（1点が scale×scale）。flip で左右を反転する
export function drawPerson(c, { sex, mood = "mid", pal, scale = 1 }, x, y, flip = false) {
  const rows = withMood(TPL[sex === "male" ? "M" : "F"], mood);
  const p = pal || personPalette(LOOK[sex === "male" ? "male" : "female"]);
  for (let r = 0; r < 16; r++) {
    for (let i = 0; i < 16; i++) {
      const ch = rows[r][flip ? 15 - i : i];
      if (ch !== "." && p[ch]) px(c, x + i * scale, y + r * scale, scale, scale, p[ch]);
    }
  }
}

// ---- 部屋の部品 ----

export function wall(c, col, stripe) {
  px(c, 0, 0, W, GY, col);
  if (stripe) for (let x = 4; x < W; x += 8) px(c, x, 0, 1, GY, stripe);
  px(c, 0, GY - 3, W, 3, shade(col, -0.3)); // 幅木
}

export function floor(c, col, line) {
  px(c, 0, GY, W, H - GY, col);
  for (let y = GY + 4; y < H; y += 5) px(c, 0, y, W, 1, line);
}

// 窓。view は外の景色（"city"・"sky"・"wall"）
export function windowFrame(c, x, y, w, h, view, t = 0) {
  px(c, x - 1, y - 1, w + 2, h + 2, OUT);
  if (view === "city") {
    px(c, x, y, w, h, "#2c3e7a");
    px(c, x, y + h - 10, w, 10, "#22305e");
    for (let i = 0; i < w; i += 5) {
      const bh = 6 + ((i * 7) % 9);
      px(c, x + i, y + h - bh, 4, bh, "#3b4c8c");
      if ((i + Math.floor(t / 4)) % 3 === 0) px(c, x + i + 1, y + h - bh + 2, 1, 1, "#ffe28a");
    }
  } else if (view === "wall") {
    px(c, x, y, w, h, "#8d8a83");
    px(c, x, y, w, 2, "#6f6c66");
  } else {
    px(c, x, y, w, h, "#9ad3f3");
    px(c, x + 3, y + 3, 6, 2, "#ffffff");
  }
  px(c, x + Math.floor(w / 2), y, 1, h, OUT); // 桟
}

export function bed(c, x, w, quilt, futon = false) {
  if (futon) {
    px(c, x, GY + 6, w, 4, "#f4f1e8");
    px(c, x + 2, GY + 2, w - 4, 6, quilt);
    px(c, x + w - 8, GY + 3, 6, 3, "#ffffff");
    return;
  }
  px(c, x, GY - 8, w, 10, "#8a5a3b");
  px(c, x + 1, GY - 10, w - 2, 4, "#f4f1e8");
  px(c, x + 1, GY - 7, w - 2, 6, quilt);
  px(c, x + w - 9, GY - 12, 7, 3, "#ffffff");
  px(c, x, GY - 16, 2, 18, "#6b4226");
}

export function fridge(c, x, big) {
  const h = big ? 30 : 18;
  px(c, x, GY - h, 12, h, "#e8eef2");
  px(c, x, GY - h, 12, 1, "#c4ccd2");
  px(c, x, GY - Math.floor(h * 0.6), 12, 1, "#a9b3ba");
  px(c, x + 10, GY - h + 3, 1, 4, "#7d8790");
}

export function tv(c, x, kind) {
  px(c, x, GY - 14, 22, 4, "#6b4226"); // 台
  px(c, x, GY - 10, 22, 10, "#5a3a24");
  if (kind === "flat") {
    px(c, x - 2, GY - 30, 26, 16, OUT);
    px(c, x - 1, GY - 29, 24, 14, "#3a5ba0");
  } else if (kind === "small") {
    px(c, x + 3, GY - 25, 16, 11, OUT);
    px(c, x + 4, GY - 24, 14, 9, "#4a6a9a");
  } else {
    px(c, x + 3, GY - 27, 16, 13, "#7a6a58");
    px(c, x + 5, GY - 25, 11, 9, "#5b6b62");
    px(c, x + 17, GY - 24, 1, 1, "#c0504d");
  }
}

export function plant(c, x) {
  px(c, x + 2, GY - 6, 6, 6, "#b5651d");
  px(c, x, GY - 14, 10, 8, "#4f9a4a");
  px(c, x + 2, GY - 17, 6, 4, "#62b35a");
}

export function boxes(c, x) {
  px(c, x, GY - 10, 14, 10, "#c8a46b");
  px(c, x + 6, GY - 10, 2, 10, "#a8844b");
  px(c, x + 3, GY - 18, 12, 8, "#d4b07a");
  px(c, x + 8, GY - 18, 2, 8, "#a8844b");
}

export function car(c, x, y, col) {
  px(c, x + 3, y, 12, 4, shade(col, 0.15));
  px(c, x, y + 4, 18, 5, col);
  px(c, x + 5, y + 1, 7, 3, "#bfe3f5");
  px(c, x + 2, y + 8, 4, 3, OUT);
  px(c, x + 12, y + 8, 4, 3, OUT);
}

export function crack(c, x, y) {
  px(c, x, y, 1, 3, "#7a756c");
  px(c, x + 1, y + 3, 1, 3, "#7a756c");
  px(c, x, y + 6, 1, 2, "#7a756c");
}
