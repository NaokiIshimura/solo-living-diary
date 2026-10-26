import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STRATEGIES,
  achievementsOf,
  autoChoice,
  bandOf,
  carValue,
  choose,
  compareWithMid,
  createGame,
  defaultSettings,
  endYear,
  endingOf,
  fulfillmentDelta,
  handoffData,
  medianIncome,
  meetChance,
  promotionChance,
  netWorth,
  nextEvent,
  playToEnd,
  rankOf,
  titleOf,
  workIncome,
} from "../js/engine.js";

const data = JSON.parse(readFileSync(new URL("../data/profiles/jp.json", import.meta.url), "utf8"));
const settings = defaultSettings(data);

// その年の判定（昇進・病気・ランダムイベント・リスク）が起きないようにした状態で始め、
// 最初のイベント（部屋・家電・食生活・付き合い）を普通で選ぶ
function quiet(overrides = {}) {
  const state = createGame(data, { ...settings, ...overrides }, 1);
  state.rolledYear = Infinity;
  choose(data, state, { id: "room" }, { tier: "mid" });
  choose(data, state, { id: "appliance" }, { tier: "mid" });
  choose(data, state, { id: "food" }, { tier: "mid" });
  choose(data, state, { id: "social" }, { tier: "mid" });
  return state;
}

// 「全部普通」で選び、分岐イベントはひとりで生きていく
const midOrSingle = (state) => (ev) => (ev.id === "branch" ? { marry: false } : autoChoice(data, state, ev, "mid"));

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

test("最初は部屋探し、家電・家具、食生活、付き合いの順に聞かれる", () => {
  const state = createGame(data, settings, 1);
  assert.equal(nextEvent(data, state).id, "room");
  choose(data, state, { id: "room" }, { tier: "low" });
  assert.equal(nextEvent(data, state).id, "appliance");
  choose(data, state, { id: "appliance" }, { tier: "low" });
  assert.equal(nextEvent(data, state).id, "food");
  choose(data, state, { id: "food" }, { tier: "low" });
  assert.equal(nextEvent(data, state).id, "social");
  choose(data, state, { id: "social" }, { skip: true });
  assert.equal(state.recurring.social.tier, "none");
  assert.equal(state.choices.none, 1);
});

test("部屋と家電は初期費用をその場で払い、食生活と付き合いは3年ごとに見直す", () => {
  const state = createGame(data, { ...settings, savings: 100 }, 1);
  choose(data, state, { id: "room" }, { tier: "high" });
  choose(data, state, { id: "appliance" }, { tier: "mid" });
  assert.equal(state.savings, 100 - 60 - 25);
  choose(data, state, { id: "food" }, { tier: "mid" });
  choose(data, state, { id: "social" }, { tier: "mid" });
  assert.equal(state.recurring.food.reviewAt, 3);
  state.year = 3;
  assert.deepEqual(nextEvent(data, state), { id: "food", review: true });
});

test("趣味は2年目から、旅行は2年目から2年ごとに聞かれる", () => {
  const state = quiet();
  assert.notEqual(nextEvent(data, state)?.id, "hobby");
  state.year = 1;
  assert.equal(nextEvent(data, state).id, "hobby");
  choose(data, state, { id: "hobby" }, { skip: true });
  assert.equal(nextEvent(data, state).id, "travel");
  choose(data, state, { id: "travel" }, { tier: "high" });
  assert.equal(state.fulfillment, data.fulfillment.start + 6); // 旅行の充実度はその年だけ
  state.year = 2;
  assert.notEqual(nextEvent(data, state)?.id, "travel");
});

test("入居から2年ごとに部屋の更新があり、更新料は家賃1か月分。引っ越すと部屋探しになる", () => {
  const state = quiet();
  state.year = 2;
  choose(data, state, { id: "hobby" }, { skip: true });
  assert.equal(nextEvent(data, state).id, "renewal");
  const before = state.savings;
  choose(data, state, { id: "renewal" }, { renew: true });
  assert.equal(state.savings, before - state.room.annual / 12);
  assert.notEqual(nextEvent(data, state)?.id, "renewal");
  state.year = 4;
  choose(data, state, { id: "renewal" }, { move: true });
  assert.equal(state.moves, 1);
  assert.deepEqual(nextEvent(data, state), { id: "room", move: true });
});

test("隣人トラブルで我慢すると、充実度がもう一度下がる", () => {
  const state = quiet();
  state.fulfillment = 50;
  choose(data, state, { id: "neighbor" }, { endure: true });
  assert.equal(state.fulfillment, 45);
});

test("家電は寿命が来ると買い替えになる", () => {
  const state = quiet();
  state.year = state.appliance.life;
  assert.deepEqual(nextEvent(data, state), { id: "appliance", replace: true });
});

test("車の買い替えでは、今の車を評価額で売って差し引く", () => {
  const state = quiet({ age: 25, savings: 500 });
  choose(data, state, { id: "car", replace: false }, { tier: "mid" });
  assert.equal(state.savings, 500 - 40 - 25 - 150);
  state.year = state.car.years;
  assert.equal(carValue(state.car, state.year), state.car.resale);
  const before = state.savings;
  choose(data, state, { id: "car", replace: true }, { tier: "low" });
  assert.equal(state.savings, before - 60 + 30);
});

test("自己投資は24歳から3年ごと、最大3回。資格に受かると年収が上がる", () => {
  const state = quiet({ age: 22 });
  state.age = 24;
  assert.equal(nextEvent(data, state).id, "invest");
  let passed = false;
  for (let seed = 1; !passed && seed < 50; seed++) {
    const s = quiet({ age: 24, income: 300 });
    s.rng = seed;
    choose(data, s, { id: "invest" }, { tier: "mid" });
    passed = s.flags.certified;
    if (passed) assert.ok(Math.abs(s.baseIncome - 315) < 1e-9);
  }
  assert.ok(passed);
  const late = quiet({ age: 28 });
  assert.equal(late.invest.nextAge, 30);
});

test("スクールに通っている2年間は昇進しやすく、無気力なら昇進しない", () => {
  const state = quiet({ age: 24 });
  state.fulfillment = 50;
  const base = promotionChance(data, state);
  choose(data, state, { id: "invest" }, { tier: "high" });
  assert.ok(Math.abs(promotionChance(data, state) - base - data.yearly.promotion.schoolBonus) < 1e-9);
  state.year += 2;
  assert.equal(promotionChance(data, state), base);
  state.fulfillment = 0;
  assert.equal(promotionChance(data, state), 0);
});

test("婚活は28歳以降、恋人がいない年に2年ごと。出会いの確率に足され、恋人ができたら止まる", () => {
  const state = quiet({ age: 28 });
  state.fulfillment = 50;
  state.carNever = true;
  state.invest.count = data.events.invest.max;
  assert.equal(nextEvent(data, state).id, "konkatsu");
  choose(data, state, { id: "konkatsu" }, { tier: "high" });
  assert.ok(Math.abs(meetChance(data, state) - (0.15 + 0.25)) < 1e-9);
  assert.equal(state.konkatsuNextYear, 2);
  for (let seed = 1; !state.partner && seed < 100; seed++) {
    state.rng = seed;
    endYear(data, state);
  }
  assert.ok(state.partner);
  assert.equal(state.konkatsu, null);
});

test("充実度は、選んだものの値の合計から自然減を引いて、0〜100に収まる", () => {
  const state = quiet();
  assert.equal(fulfillmentDelta(data, state), 0 + 1 + 1 - data.fulfillment.decayPerYear);
  state.fulfillment = 1;
  state.partner = { since: 0, tier: "high", annual: 0, breakup: 0 };
  state.room.fulfillment = -10;
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
  assert.equal(state.queue[0].id, "partner");
  choose(data, state, { id: "partner" }, { tier: "mid" });
  assert.equal(state.partner.annual, data.events.partner.options[1].annual);
});

test("分岐イベントは、恋人がいて30歳以上・交際2年以上か、35歳で来る", () => {
  const state = quiet({ age: 28 });
  state.partner = { since: 28, tier: "high", annual: 0, breakup: 0 };
  state.age = 29;
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
  assert.equal(rankOf(data, 800).rank, "S");
  assert.equal(rankOf(data, 300).rank, "B");
  assert.equal(rankOf(data, 299).rank, "C");
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
  state.choices = { high: 1, mid: 8, low: 1, none: 0 };
  assert.equal(titleOf(data, state), "steady");
  state.choices = { high: 8, mid: 1, low: 1, none: 0 };
  assert.equal(titleOf(data, state), "showoff");
  state.choices = { high: 1, mid: 2, low: 3, none: 4 };
  assert.equal(titleOf(data, state), "frugal"); // 安い＋やらないで7割
  state.choices = { high: 3, mid: 3, low: 3, none: 0 };
  assert.equal(titleOf(data, state), "balanced");
  state.carNever = true;
  assert.equal(titleOf(data, state), "carFree");
  state.moves = 3;
  assert.equal(titleOf(data, state), "mover");
  state.picks.social = ["high", "high"];
  assert.equal(titleOf(data, state), "social");
  state.invest.tiers = ["mid", "low"];
  assert.equal(titleOf(data, state), "selfInvest");
  state.picks.hobby = ["high", "high"];
  assert.equal(titleOf(data, state), "oshi");
});

test("推し活命・社交家・自分磨きは、1回だけでは取れない", () => {
  const state = quiet();
  state.choices = { high: 3, mid: 3, low: 3, none: 0 };
  state.picks.hobby = ["high"];
  state.picks.social = ["high"];
  state.invest.tiers = ["high"];
  assert.equal(titleOf(data, state), "balanced");
  state.invest.tiers = ["high", "none"];
  assert.equal(titleOf(data, state), "balanced");
});

test("付き合いと趣味で選んだ段階が順に記録される", () => {
  const state = quiet();
  state.year = 1;
  choose(data, state, { id: "hobby" }, { tier: "high" });
  choose(data, state, { id: "social", review: true }, { skip: true });
  assert.deepEqual(state.picks.hobby, ["high"]);
  assert.deepEqual(state.picks.social, ["mid", "none"]);
});

test("結婚の実績は、婚活の使い方で分かれる", () => {
  const fate = quiet();
  fate.partner = { since: fate.age, tier: "mid", annual: 30, breakup: 0.1 };
  choose(data, fate, { id: "branch" }, { marry: true });
  assert.ok(achievementsOf(data, fate).includes("fate"));
  assert.ok(!achievementsOf(data, fate).includes("agency"));

  const agency = quiet({ age: 28 });
  choose(data, agency, { id: "konkatsu" }, { tier: "high" });
  agency.partner = { since: agency.age, tier: "mid", annual: 30, breakup: 0.1 };
  choose(data, agency, { id: "branch" }, { marry: true });
  assert.ok(achievementsOf(data, agency).includes("agency"));
  assert.ok(!achievementsOf(data, agency).includes("fate"));
});

test("引っ越しの回数と充実度で取れる実績", () => {
  const state = quiet();
  state.fulfillment = 95;
  choose(data, state, { id: "branch" }, { marry: false });
  const got = achievementsOf(data, state);
  assert.ok(got.includes("stayed"));
  assert.ok(got.includes("happy"));
  state.moves = 5;
  assert.ok(achievementsOf(data, state).includes("wanderer"));
  assert.ok(!achievementsOf(data, state).includes("stayed"));
});

test("新婚日記へ引き継ぐデータは、今の年収と車の値をそのまま持つ", () => {
  const state = quiet({ age: 25, savings: 500, income: 300, gender: "male" });
  choose(data, state, { id: "car", replace: false }, { tier: "mid" });
  state.raise = 1.1;
  state.age = 30;
  state.year = 5;
  state.fulfillment = 50;
  state.partner = { since: 27, tier: "mid", annual: 30, breakup: 0.1 };
  choose(data, state, { id: "branch" }, { marry: true });
  const d = handoffData(data, state);
  assert.deepEqual(d, {
    v: 2,
    country: "jp",
    gender: "male",
    age: 30,
    savings: Math.round(state.savings),
    income: 330,
    car: { tier: "mid", price: 150, resale: 30, years: 8, annual: 30, breakdownChance: 0.1, boughtAge: 25 },
    ending: "married_mid",
  });
});

test("年の途中で一度でも貯金がマイナスになると「借金ゼロ」にならない", () => {
  const rich = quiet({ age: 28, savings: 300, income: 600 });
  advance(rich, 10, midOrSingle(rich));
  assert.equal(rich.ended, "single");
  assert.ok(achievementsOf(data, rich).includes("noCardLoan"));

  const poor = quiet({ age: 28, savings: 300, income: 600 });
  poor.savings = -1;
  poor.flags.minSavings = -1;
  advance(poor, 10, midOrSingle(poor));
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
  for (const id of data.titles) assert.ok(profileTexts.titles[id]?.desc, id);
  for (const r of data.ranks) assert.ok(profileTexts.ranks[r.rank]?.comment, r.rank);
  for (const e of data.endings) assert.ok(profileTexts.endings[e]?.name, e);
});

test("遊んでいる国を状態に持つ（途中保存と新婚日記への引き継ぎに使う）", () => {
  const state = createGame(data, settings, 1);
  assert.equal(state.country, data.country);
  assert.equal(data.country, "jp");
});

test("国の対応表：言語ごとの既定の国は、プロファイルのそろった国の中から選ぶ", () => {
  const countries = JSON.parse(readFileSync(new URL("../data/countries.json", import.meta.url), "utf8"));
  for (const c of countries.available) {
    const profile = JSON.parse(readFileSync(new URL(`../data/profiles/${c}.json`, import.meta.url), "utf8"));
    assert.equal(profile.country, c);
  }
  for (const [lang, list] of Object.entries(countries.byLang)) {
    assert.ok(list.length > 0, lang);
    // そろった国は、その国を選べる言語の文を持つ
    for (const c of list.filter((x) => countries.available.includes(x))) assert.ok(countries.texts[c].includes(lang), `${c}/${lang}`);
  }
  // texts に書いた言語の文のファイルがある
  for (const [c, langs] of Object.entries(countries.texts)) {
    for (const lang of langs) assert.ok(readFileSync(new URL(`../data/profiles/${c}/${lang}.json`, import.meta.url), "utf8"), `${c}/${lang}`);
  }
});

test("更新料のない国は、部屋の更新で家賃が上がる", () => {
  const raise = { ...data, events: { ...data.events, renewal: { every: 2, feeMonths: 0, rentIncrease: 0.04 } } };
  const state = quiet();
  const rent = state.room.annual;
  state.year = 2;
  const before = state.savings;
  choose(raise, state, { id: "renewal" }, { renew: true });
  assert.equal(state.savings, before); // 更新料はかからない
  assert.ok(Math.abs(state.room.annual - rent * 1.04) < 1e-9);
  assert.equal(state.history.at(-1).key, "h.renewedRaise");
});

test("開始設定の既定と刻みは国の値を使う", () => {
  assert.equal(defaultSettings(data).savings, data.startSavings.default);
  assert.equal(defaultSettings(data).income % data.inputStep, 0);
});


for (const code of ["us", "sg", "ph", "ca", "au"]) {
  test(`${code} のプロファイル：日本と同じ項目を持ち、方針ごとの結果が釣り合う`, () => {
    const profile = JSON.parse(readFileSync(new URL(`../data/profiles/${code}.json`, import.meta.url), "utf8"));
    const shape = (v) => (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v);
    // 年収の表と通貨の記号は国によって形が違ってよい
    const strip = ({ medianIncomeByAge, currencySymbol, ...rest }) => rest;
    assert.deepEqual(strip(shape(profile)), strip(shape(data)));
    assert.equal(profile.country, code);

    const s = defaultSettings(profile);
    const median = (strategy) => {
      const totals = [];
      for (let seed = 1; seed <= 200; seed++) {
        const state = playToEnd(profile, s, seed, strategy);
        totals.push(state.ended === "bankrupt" ? -Infinity : netWorth(state).total);
      }
      return totals.sort((x, y) => x - y)[100];
    };
    assert.ok(["B", "C"].includes(rankOf(profile, median("mid")).rank)); // 「全部普通」は日本と同じく真ん中あたり
    assert.equal(median("high"), -Infinity); // 全部高いは破綻する
    assert.equal(rankOf(profile, median("none")).rank, "S");

    const state = playToEnd(profile, s, 1, "mid");
    assert.equal(handoffData(profile, state).country, code);
  });
}
