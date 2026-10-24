import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STRATEGIES,
  achievementsOf,
  bandOf,
  choose,
  compareWithMid,
  createGame,
  defaultSettings,
  endYear,
  endingOf,
  fulfillmentDelta,
  medianIncome,
  meetChance,
  netWorth,
  nextEvent,
  playToEnd,
  rankOf,
  titleOf,
  workIncome,
} from "../js/engine.js";

const data = JSON.parse(readFileSync(new URL("../data/profiles/jp.json", import.meta.url), "utf8"));
const settings = defaultSettings(data);

// ランダムイベントが起きないようにした状態で始め、最初のイベント（部屋・食生活・付き合い）を普通で選ぶ
function quiet(overrides = {}) {
  const state = createGame(data, { ...settings, ...overrides }, 1);
  state.randomRolledYear = Infinity;
  choose(data, state, { id: "room" }, { tier: "mid" });
  choose(data, state, { id: "food" }, { tier: "mid" });
  choose(data, state, { id: "social" }, { tier: "mid" });
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

test("どの方針でも、結婚・ひとり・破綻のどれかで、遅くとも35歳で終わる", () => {
  for (const strategy of STRATEGIES) {
    for (let seed = 1; seed <= 30; seed++) {
      const state = playToEnd(data, settings, seed, strategy);
      assert.ok(["married", "single", "bankrupt"].includes(state.ended), `${strategy} ${seed}`);
      assert.ok(state.age <= data.endAge, `${strategy} ${seed}`);
    }
  }
});

test("最初は部屋探し、食生活、付き合いの順に聞かれる", () => {
  const state = createGame(data, settings, 1);
  assert.equal(nextEvent(data, state).id, "room");
  choose(data, state, { id: "room" }, { tier: "low" });
  assert.equal(nextEvent(data, state).id, "food");
  choose(data, state, { id: "food" }, { tier: "low" });
  assert.equal(nextEvent(data, state).id, "social");
  choose(data, state, { id: "social" }, { skip: true });
  assert.equal(state.recurring.social.tier, "none");
  assert.equal(state.choices.none, 1);
});

test("部屋は初期費用をその場で払い、食生活と付き合いは3年ごとに見直す", () => {
  const state = createGame(data, { ...settings, savings: 100 }, 1);
  state.randomRolledYear = Infinity;
  choose(data, state, { id: "room" }, { tier: "high" });
  assert.equal(state.savings, 100 - data.events.room.options[0].oneTime);
  choose(data, state, { id: "food" }, { tier: "mid" });
  choose(data, state, { id: "social" }, { tier: "mid" });
  for (let i = 0; i < 3; i++) {
    state.randomRolledYear = Infinity;
    assert.equal(nextEvent(data, state), null);
    endYear(data, state);
    state.partner = null;
    state.queue = [];
  }
  state.randomRolledYear = Infinity;
  assert.deepEqual(nextEvent(data, state), { id: "food", review: true });
});

test("家賃は入居から2年ごとに、更新料として1か月分多くかかる", () => {
  const state = quiet();
  const rent = state.room.annual;
  assert.equal(endYear(data, state).items.housing, rent);
  assert.equal(endYear(data, state).items.housing, rent);
  assert.equal(endYear(data, state).items.housing, rent + rent / 12);
});

test("充実度は、選んだものの値の合計から自然減を引いて、0〜100に収まる", () => {
  const state = quiet();
  assert.equal(fulfillmentDelta(data, state), 0 + 1 + 1 - data.fulfillment.decayPerYear);
  state.fulfillment = 1;
  state.partner = { since: 0, tier: "high", annual: 0, breakup: 0 };
  endYear(data, state);
  assert.equal(state.fulfillment, 0);
  assert.equal(bandOf(data, 70), "high");
  assert.equal(bandOf(data, 69), "mid");
  assert.equal(bandOf(data, 30), "low");
});

test("出会いの確率は、基本＋付き合い＋充実度の補正で、0未満にならない", () => {
  const state = quiet();
  state.fulfillment = 50;
  assert.ok(Math.abs(meetChance(data, state) - 0.15) < 1e-9);
  state.recurring.social = { ...state.recurring.social, meetBonus: -0.05 };
  state.fulfillment = 0;
  assert.equal(meetChance(data, state), 0);
});

test("恋人ができると翌年の初めに交際費を選び、交際年数が数えられる", () => {
  const state = quiet();
  for (let seed = 1; !state.partner && seed < 200; seed++) {
    state.rng = seed;
    endYear(data, state);
  }
  assert.ok(state.partner);
  assert.equal(state.partner.since, state.age);
  state.randomRolledYear = Infinity;
  assert.equal(nextEvent(data, state).id, "partner");
  choose(data, state, { id: "partner" }, { tier: "mid" });
  assert.equal(state.partner.annual, data.events.partner.options[1].annual);
});

test("分岐イベントは、恋人がいて30歳以上・交際2年以上か、35歳で来る", () => {
  const state = quiet({ age: 28 });
  state.partner = { since: 28, tier: "high", annual: 0, breakup: 0 };
  state.age = 29;
  state.randomRolledYear = Infinity;
  assert.notEqual(nextEvent(data, state)?.id, "branch");
  state.age = 30;
  assert.equal(nextEvent(data, state).id, "branch");
  state.partner = null;
  assert.notEqual(nextEvent(data, state)?.id, "branch");
  state.age = 35;
  assert.equal(nextEvent(data, state).id, "branch");
});

test("恋人がいないと結婚は選べず、ひとりエンドになる", () => {
  const state = quiet();
  choose(data, state, { id: "branch" }, { marry: true });
  assert.equal(state.ended, "single");
  state.fulfillment = 20;
  assert.equal(endingOf(data, state), "single_low");
});

test("無気力の年は、年齢による年収の伸びが止まる", () => {
  const a = quiet({ age: 22 });
  const b = quiet({ age: 22 });
  b.fulfillment = 0;
  b.room.fulfillment = -100; // 無気力のまま
  endYear(data, a);
  endYear(data, b);
  assert.ok(a.raise > 1);
  assert.equal(b.raise, 1);
});

test("同じシードなら同じ人生になる", () => {
  const a = playToEnd(data, settings, 42, "random");
  const b = playToEnd(data, settings, 42, "random");
  assert.deepEqual(a, b);
});

test("手取りは年収×0.78で、年齢の中央値の比で伸びる", () => {
  const state = quiet({ age: 22, income: 252 });
  assert.equal(workIncome(data, state), 252 * data.takeHomeRate);
  for (let i = 0; i < 3; i++) {
    endYear(data, state);
    state.partner = null;
  }
  assert.ok(Math.abs(workIncome(data, state) - 315 * data.takeHomeRate) < 1e-9);
});

test("年末に手取りから生活費・家賃・食費・付き合いを引く", () => {
  const state = quiet({ savings: 100 });
  const before = state.savings;
  const summary = endYear(data, state);
  const ev = data.events;
  assert.equal(summary.expense, data.baseLiving + ev.room.options[1].annual + ev.food.options[1].annual + ev.social.options[1].annual);
  assert.equal(state.savings, before + summary.income - summary.expense);
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
  state.choices = { high: 1, mid: 2, low: 3, none: 4 };
  assert.equal(titleOf(data, state), "frugal"); // 安い＋やらないで7割
});

test("年の途中で一度でも貯金がマイナスになると「借金ゼロ」にならない", () => {
  const rich = quiet({ age: 28, savings: 300, income: 600 });
  advance(rich, 10, (ev) => (ev.id === "branch" ? { marry: false } : { tier: "mid" }));
  assert.equal(rich.ended, "single");
  assert.ok(achievementsOf(data, rich).includes("noCardLoan"));

  const poor = quiet({ age: 28, savings: 300, income: 600 });
  poor.savings = -1;
  poor.flags.minSavings = -1;
  advance(poor, 10, (ev) => (ev.id === "branch" ? { marry: false } : { tier: "mid" }));
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
  for (const r of data.ranks) assert.ok(profileTexts.ranks[r.rank]?.comment, r.rank);
  for (const e of data.endings) assert.ok(profileTexts.endings[e]?.name, e);
});
