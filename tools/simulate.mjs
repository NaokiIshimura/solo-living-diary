// 方針ごとに自動プレイして、終了時の純資産・充実度・エンディングの分布を出す。
//   node tools/simulate.mjs [回数]
// 中央値などは破綻した回も含めて数える（破綻は一番下として扱う）
import { readFileSync } from "node:fs";
import { STRATEGIES, defaultSettings, endingOf, netWorth, playToEnd, rankOf } from "../js/engine.js";

const data = JSON.parse(readFileSync(new URL("../data/profiles/jp.json", import.meta.url), "utf8"));
const runs = Number(process.argv[2] ?? 1000);
const settings = defaultSettings(data);

const fmt = (v) => (v === -Infinity ? "破綻" : Math.round(v).toLocaleString());
const pct = (n) => `${Math.round((n / runs) * 100)}%`;
const median = (list) => [...list].sort((x, y) => x - y)[Math.floor(list.length / 2)];
console.log(`開始設定: ${settings.age}歳、貯金${settings.savings}万円、年収${settings.income}万円（${runs}回）`);
for (const strategy of STRATEGIES) {
  const totals = [];
  const fulfillment = [];
  const ages = [];
  const ranks = {};
  const endings = { married: 0, single: 0, bankrupt: 0 };
  for (let seed = 1; seed <= runs; seed++) {
    const state = playToEnd(data, settings, seed, strategy);
    const bankrupt = state.ended === "bankrupt";
    const total = bankrupt ? -Infinity : netWorth(state).total;
    totals.push(total);
    fulfillment.push(state.fulfillment);
    ages.push(state.age);
    endings[endingOf(data, state).split("_")[0]] += 1;
    const r = bankrupt ? "破綻" : rankOf(data, total).rank;
    ranks[r] = (ranks[r] ?? 0) + 1;
  }
  totals.sort((x, y) => x - y);
  const at = (p) => totals[Math.min(totals.length - 1, Math.floor(totals.length * p))];
  const order = ["S", "A", "B", "C", "D", "破綻"].filter((r) => ranks[r]).map((r) => `${r}:${pct(ranks[r])}`);
  console.log(
    `${strategy.padEnd(6)} 中央値 ${fmt(at(0.5))}  10% ${fmt(at(0.1))}  90% ${fmt(at(0.9))}  ${order.join(" ")}` +
      `  充実度 ${Math.round(median(fulfillment))}  終了 ${median(ages)}歳  結婚 ${pct(endings.married)}・ひとり ${pct(endings.single)}`,
  );
}
