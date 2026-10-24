import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STRATEGIES,
  achievementsOf,
  choose,
  compareWithMid,
  createGame,
  defaultSettings,
  endYear,
  medianIncome,
  netWorth,
  nextEvent,
  playToEnd,
  rankOf,
  titleOf,
  workIncome,
} from "../js/engine.js";

const data = JSON.parse(readFileSync(new URL("../data/profiles/jp.json", import.meta.url), "utf8"));
const settings = defaultSettings(data);

// ランダムイベントが起きないようにした状態で始める
function quiet(overrides = {}) {
  const state = createGame(data, { ...settings, ...overrides }, 1);
  state.randomRolledYear = Infinity;
  return state;
}

// 年を進める。イベントは渡した関数で選ぶ
function advance(state, years, pickChoice) {
  const until = state.year + years;
  let guard = 0;
  while (!state.ended && state.year < until && guard++ < 1000) {
    const ev = nextEvent(data, state);
    if (ev) choose(data, state, ev, pickChoice(ev));
    else endYear(data, state);
  }
}

test("どの方針でも、破綻か35歳で最後まで終わる", () => {
  for (const strategy of STRATEGIES) {
    for (let seed = 1; seed <= 30; seed++) {
      const state = playToEnd(data, settings, seed, strategy);
      assert.ok(["end", "bankrupt"].includes(state.ended), `${strategy} ${seed}`);
      if (state.ended === "end") assert.equal(state.age, data.endAge);
    }
  }
});

test("開始年齢の上限から始めても35歳で終わる", () => {
  const state = playToEnd(data, { ...settings, age: data.startAge.max }, 1, "mid");
  assert.equal(state.ended, "end");
  assert.equal(state.age, data.endAge);
});

test("同じシードなら同じ人生になる", () => {
  const a = playToEnd(data, settings, 42, "random");
  const b = playToEnd(data, settings, 42, "random");
  assert.deepEqual(a, b);
});

test("手取りは年収×0.78で、年齢の中央値の比で伸びる", () => {
  const state = quiet({ age: 22, income: 252 });
  assert.equal(workIncome(data, state), 252 * data.takeHomeRate);
  state.age = 25;
  assert.equal(workIncome(data, state), 315 * data.takeHomeRate);
});

test("年末に手取りから生活費・家賃・食費を引く", () => {
  const state = quiet({ savings: 100 });
  const summary = endYear(data, state);
  assert.equal(summary.expense, data.baseLiving + data.rent + data.food);
  assert.equal(state.savings, 100 + summary.income - summary.expense);
  assert.equal(state.age, settings.age + 1);
});

test("貯金がマイナスだと年10%の利息がつく", () => {
  const state = quiet();
  state.savings = -200;
  const summary = endYear(data, state);
  assert.equal(summary.items.interest, 20);
});

test("−300万円を下回ると家計破綻で終わる", () => {
  const state = quiet();
  state.savings = -1000;
  endYear(data, state);
  assert.equal(state.ended, "bankrupt");
});

test("ランクの境目の金額ちょうどは上のランクに入る", () => {
  assert.equal(rankOf(data, 600).rank, "S");
  assert.equal(rankOf(data, 200).rank, "B");
  assert.equal(rankOf(data, 199).rank, "C");
  assert.equal(rankOf(data, 0).rank, "C");
  assert.equal(rankOf(data, -1).rank, "D");
});

test("年収の中央値は表の間を直線で補う", () => {
  const t = data.medianIncomeByAge;
  assert.equal(medianIncome(data, 22), t["22"]);
  assert.equal(medianIncome(data, 27), t["25"] + ((t["30"] - t["25"]) * 2) / 5);
});

test("称号は条件の順に調べて、最初に当てはまったものになる", () => {
  const state = quiet();
  state.choices = { high: 1, mid: 8, low: 1 };
  assert.equal(titleOf(data, state), "steady");
  state.choices = { high: 8, mid: 1, low: 1 };
  assert.equal(titleOf(data, state), "showoff");
  state.choices = { high: 3, mid: 3, low: 3 };
  assert.equal(titleOf(data, state), "balanced");
});

test("年の途中で一度でも貯金がマイナスになると「借金ゼロ」にならない", () => {
  const rich = quiet({ age: 28, savings: 300, income: 600 });
  advance(rich, 10, () => ({ tier: "mid" }));
  assert.equal(rich.ended, "end");
  assert.ok(achievementsOf(data, rich).includes("noCardLoan"));

  const poor = quiet({ age: 28, savings: 300, income: 600 });
  poor.savings = -1;
  poor.flags.minSavings = -1;
  advance(poor, 10, () => ({ tier: "mid" }));
  assert.ok(!achievementsOf(data, poor).includes("noCardLoan"));
});

test("転職を受けると年収が変わり、上がったら「転職成功」", () => {
  const state = quiet({ income: 300 });
  for (let seed = 1; seed < 50 && !state.flags.jobUp; seed++) {
    state.rng = seed;
    const before = state.baseIncome;
    choose(data, state, { id: "jobOffer" }, { accept: true });
    assert.ok(Math.abs(state.baseIncome / before - 1) <= data.random.events.jobOffer.range + 1e-9);
  }
  assert.ok(state.flags.jobUp);
  assert.ok(achievementsOf(data, state).includes("jobUp"));
});

test("「全部普通」との比較は同じ開始条件・同じシードで計算する", () => {
  const state = playToEnd(data, settings, 5, "low");
  const mid = playToEnd(data, settings, 5, "mid");
  assert.equal(compareWithMid(data, state), mid.ended === "bankrupt" ? null : netWorth(mid).total);
});

test("日記に書く出来事のキーは、すべて日本語の文がある", () => {
  const ui = JSON.parse(readFileSync(new URL("../i18n/ja.json", import.meta.url), "utf8"));
  const profileTexts = JSON.parse(readFileSync(new URL("../data/profiles/jp/ja.json", import.meta.url), "utf8"));
  const lookup = (key) => key.split(".").reduce((o, k) => o?.[k], key.startsWith("events.") ? profileTexts : ui);
  const keys = new Set();
  for (const strategy of STRATEGIES) {
    for (let seed = 1; seed <= 40; seed++) {
      for (const h of playToEnd(data, settings, seed, strategy).history) keys.add(h.key);
    }
  }
  for (const key of keys) assert.equal(typeof lookup(key), "string", key);
  for (const id of data.titles) assert.ok(profileTexts.titles[id]?.name, id);
  for (const id of data.achievements) assert.ok(profileTexts.achievements[id]?.name, id);
  for (const r of [...data.ranks.map((x) => x.rank), "bankrupt"]) assert.ok(profileTexts.ranks[r]?.ending, r);
});
