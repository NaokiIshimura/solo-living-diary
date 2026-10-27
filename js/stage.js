// メイン画面のステージ：いまの部屋と本人（恋人がいれば恋人も）をドット絵で描く
import { GY, W, H, px, wall, floor, windowFrame, bed, fridge, tv, plant, boxes, car, crack, drawPerson } from "./pixel.js";

const ROOM = {
  // 高い：明るい壁、街が見える大きな窓、観葉植物
  high: { wall: "#f3ead8", stripe: null, floor: "#c08a55", line: "#a9763f", win: [58, 3, 48, 21], view: "city", quilt: "#5b8fd6" },
  // 普通：ふつうの壁と窓
  mid: { wall: "#efe3c8", stripe: "#e6d8b8", floor: "#b8875a", line: "#a0744a", win: [64, 4, 34, 19], view: "sky", quilt: "#e08a5a" },
  // 安い：くすんだ壁にひび、小さな窓の外は隣の建物、布団
  low: { wall: "#cfc6b0", stripe: "#c4bba4", floor: "#9c8a62", line: "#8a7852", win: [70, 6, 22, 15], view: "wall", quilt: "#7a9a6a" },
};

const CAR_COL = { high: "#c4473a", mid: "#4a7ac0", low: "#8a8f7a" };

// view: { sex, mood, room（tier か null）, appliance（tier か null）, car（tier か null）, partner（true/false） }
export function drawStage(c, view, t = 0) {
  c.imageSmoothingEnabled = false;
  const r = ROOM[view.room] ?? ROOM.mid;
  wall(c, r.wall, r.stripe);
  floor(c, r.floor, r.line);
  const [wx, wy, ww, wh] = r.win;
  windowFrame(c, wx, wy, ww, wh, r.view, t);
  if (view.car && r.view !== "wall") car(c, wx + ww - 22, wy + wh - 11, CAR_COL[view.car]);

  if (!view.room) {
    // 部屋が決まる前：段ボール
    boxes(c, 88);
    boxes(c, 106);
  } else {
    if (view.room === "low") {
      crack(c, 50, 12);
      crack(c, 116, 20);
      bed(c, 96, 30, r.quilt, true);
    } else {
      bed(c, 98, 30, r.quilt);
    }
    if (view.room === "high") plant(c, 0);
  }

  // 家電（買う前は何もない）
  if (view.appliance) {
    tv(c, 62, view.appliance === "high" ? "flat" : view.appliance === "mid" ? "small" : "old");
    fridge(c, 85, view.appliance === "high");
  }

  // 人物（2倍の大きさ）。少し上下に揺れる
  const bob = Math.floor(t / 2) % 2;
  const y = GY - 26;
  if (view.partner) {
    drawPerson(c, { sex: view.sex === "male" ? "female" : "male", mood: "high", scale: 2 }, 32, y - (bob ? 0 : 1), true);
    drawPerson(c, { sex: view.sex, mood: view.mood, scale: 2 }, 6, y - bob);
  } else {
    drawPerson(c, { sex: view.sex, mood: view.mood, scale: 2 }, 18, y - bob);
  }
}

export { W, H };
