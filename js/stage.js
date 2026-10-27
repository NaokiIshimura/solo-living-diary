// メイン画面のステージ：いまの部屋の中と、本人（恋人がいれば恋人も）をドット絵で描く。
// 人物・色・車の型は新婚日記と共通の pixel.js を使い、部屋の中の部品だけここで描く
import { W, H, GY, OUT, px, shade, drawSprite, personLook, CARS } from "./pixel.js";

function wall(c, col, stripe) {
  px(c, 0, 0, W, GY, col);
  if (stripe) for (let x = 4; x < W; x += 8) px(c, x, 0, 1, GY, stripe);
  px(c, 0, GY - 3, W, 3, shade(col, -0.3)); // 幅木
}

function floor(c, col, line) {
  px(c, 0, GY, W, H - GY, col);
  for (let y = GY + 4; y < H; y += 5) px(c, 0, y, W, 1, line);
}

// 窓。外は "city"（夜景）・"sky"（空）・"wall"（となりの建物）。車があれば窓の下のほうに描く
function windowFrame(c, [x, y, w, h], view, carTier, t) {
  px(c, x - 1, y - 1, w + 2, h + 2, OUT);
  if (view === "city") {
    px(c, x, y, w, h, "#2c3e7a");
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
  if (carTier && view !== "wall" && CARS[carTier]) {
    // 車の型は地面（GY）を基準に描くので、窓の下の端に合わせてずらし、窓の外にはみ出さないよう切り取る
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    c.translate(x + w - 30, y + h - GY);
    CARS[carTier](c, 0);
    c.restore();
  }
  px(c, x + Math.floor(w / 2), y, 1, h, OUT); // 桟
}

function bed(c, x, w, quilt, futon) {
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

function fridge(c, x, big) {
  const h = big ? 30 : 18;
  px(c, x, GY - h, 12, h, "#e8eef2");
  px(c, x, GY - h, 12, 1, "#c4ccd2");
  px(c, x, GY - Math.floor(h * 0.6), 12, 1, "#a9b3ba");
  px(c, x + 10, GY - h + 3, 1, 4, "#7d8790");
}

function tv(c, x, kind) {
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

function plant(c, x) {
  px(c, x + 2, GY - 6, 6, 6, "#b5651d");
  px(c, x, GY - 14, 10, 8, "#4f9a4a");
  px(c, x + 2, GY - 17, 6, 4, "#62b35a");
}

function boxes(c, x) {
  px(c, x, GY - 10, 14, 10, "#c8a46b");
  px(c, x + 6, GY - 10, 2, 10, "#a8844b");
  px(c, x + 3, GY - 18, 12, 8, "#d4b07a");
  px(c, x + 8, GY - 18, 2, 8, "#a8844b");
}

function crack(c, x, y) {
  px(c, x, y, 1, 3, "#7a756c");
  px(c, x + 1, y + 3, 1, 3, "#7a756c");
  px(c, x, y + 6, 1, 2, "#7a756c");
}

const ROOM = {
  // 高い：明るい壁、夜景の見える大きな窓、観葉植物
  high: { wall: "#f3ead8", stripe: null, floor: "#c08a55", line: "#a9763f", win: [58, 3, 48, 21], view: "city", quilt: "#5b8fd6" },
  // 普通：ふつうの壁と窓
  mid: { wall: "#efe3c8", stripe: "#e6d8b8", floor: "#b8875a", line: "#a0744a", win: [64, 4, 34, 19], view: "sky", quilt: "#e08a5a" },
  // 安い：くすんだ壁にひび、小さな窓の外はとなりの建物、ベッドのかわりに布団
  low: { wall: "#cfc6b0", stripe: "#c4bba4", floor: "#9c8a62", line: "#8a7852", win: [70, 6, 22, 15], view: "wall", quilt: "#7a9a6a" },
};

// view: { sex, mood, room（tier か null）, appliance（tier か null）, car（tier か null）, partner（true/false） }
export function drawStage(c, view, t = 0) {
  c.imageSmoothingEnabled = false;
  const r = ROOM[view.room] ?? ROOM.mid;
  wall(c, r.wall, r.stripe);
  floor(c, r.floor, r.line);
  windowFrame(c, r.win, r.view, view.car, t);

  if (!view.room) {
    boxes(c, 88); // 部屋が決まる前は段ボール
    boxes(c, 106);
  } else if (view.room === "low") {
    crack(c, 50, 12);
    crack(c, 116, 20);
    bed(c, 96, 30, r.quilt, true);
  } else {
    bed(c, 98, 30, r.quilt, false);
  }
  if (view.room === "high") plant(c, 0);

  if (view.appliance) {
    tv(c, 62, view.appliance === "high" ? "flat" : view.appliance === "mid" ? "small" : "old");
    fridge(c, 85, view.appliance === "high");
  }

  // 人物は部屋の中なので2倍で描く。少し上下に揺れる
  const bob = Math.floor(t / 2) % 2;
  const y = GY - 26;
  const me = personLook(view.sex, false, false);
  if (view.partner) {
    const other = personLook(view.sex === "male" ? "female" : "male", true, false);
    drawSprite(c, other.tpl, other.pal, 32, y - (bob ? 0 : 1), true, 2, "high");
    drawSprite(c, me.tpl, me.pal, 6, y - bob, false, 2, view.mood);
  } else {
    drawSprite(c, me.tpl, me.pal, 18, y - bob, false, 2, view.mood);
  }
}
