// ゲームロジック。DOM に依存しないので、ブラウザとシミュレーション（tools/simulate.mjs）の両方から使う。
// 金額の単位はすべて万円。
// 新婚日記のエンジンをもとに、一人暮らし用に作り直したもの。

export const SAVE_VERSION = 2;

// 毎年かかる費用を選ぶイベント。選んだものは state.recurring に入り、reviewEvery 年ごとに見直す
const RECURRING = ["food", "social"];

// ---- 乱数（シード付き。状態に乱数の内部値を持たせるので、途中保存しても同じ人生を再現できる） ----

export function rand(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state, min, max) {
  return min + Math.floor(rand(state) * (max - min + 1));
}

export function newSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

// ---- 開始設定 ----

// 年齢の年収の中央値（額面）。表にない年齢は前後の値から直線で補う
export function medianIncome(data, age) {
  const points = Object.entries(data.medianIncomeByAge)
    .map(([a, v]) => [Number(a), v])
    .sort((x, y) => x[0] - y[0]);
  if (age <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [a1, v1] = points[i];
    if (age <= a1) {
      const [a0, v0] = points[i - 1];
      return v0 + ((v1 - v0) * (age - a0)) / (a1 - a0);
    }
  }
  return points[points.length - 1][1];
}

const round10 = (v) => Math.round(v / 10) * 10;

export function defaultSettings(data) {
  const age = data.startAge.min;
  return { gender: "female", age, savings: 100, income: round10(medianIncome(data, age)) };
}

export function randomSettings(data, seed) {
  const s = { rng: seed >>> 0 };
  const age = randInt(s, data.startAge.min, data.startAge.max);
  return {
    gender: ["female", "male"][randInt(s, 0, 1)],
    age,
    savings: randInt(s, data.startSavings.min / 10, data.startSavings.max / 10) * 10,
    income: round10(medianIncome(data, age) * (0.7 + rand(s) * 0.6)),
  };
}

export function createGame(data, settings, seed = newSeed()) {
  const state = {
    version: SAVE_VERSION,
    seed,
    rng: seed >>> 0,
    year: 0, // 一人暮らしを始めてからの年数。始めた年が 0
    startAge: settings.age,
    age: settings.age,
    savings: settings.savings,
    gender: settings.gender,
    baseIncome: settings.income,
    raise: 1, // 年齢による年収の伸び（中央値の比）。無気力の年は伸びない
    fulfillment: data.fulfillment.start,
    room: null, // { tier, annual, fulfillment, movedInYear }
    recurring: {}, // 食生活・付き合い：{ tier, annual, fulfillment, meetBonus, reviewAt }
    partner: null, // { since（交際を始めた年齢）, tier, annual, breakup }
    queue: [], // 順番待ちのイベント（恋人との交際・選択のあるランダムイベント）
    car: null,
    randomRolledYear: -1,
    bonusCutYear: -1,
    totals: { income: 0, extraIncome: 0, living: 0, housing: 0, food: 0, social: 0, date: 0, car: 0, medical: 0, interest: 0 },
    choices: { high: 0, mid: 0, low: 0, none: 0 }, // 称号用に、高い／普通／安い／やらないを選んだ回数を数える
    // 実績用の記録
    flags: { minSavings: settings.savings, maxWindfall: 0, jobUp: false },
    settings: { ...settings },
    history: [],
    ended: null, // married / single / bankrupt
  };
  addHistory(state, "h.started");
  return state;
}

// 日記の出来事。文そのものは持たず、翻訳のキーと差し込む値を持つ（画面側で言語に合わせて文にする）
//   "events." で始まるキーは国プロファイルの文（data/profiles/<国>/<言語>.json）、"h." で始まるキーは共通の文（i18n/<言語>.json）
function addHistory(state, key, params) {
  state.history.push(params ? { age: state.age, key, params } : { age: state.age, key });
}

const pick = (state, [min, max]) => randInt(state, min, max);

// ---- イベント ----

// 今年まだ処理していないイベントを1つ返す。なければ null（年末へ進む）
// ランダムイベントの抽選もここで年に1回行う。選択のないランダムイベントはその場で処理して日記に書く
export function nextEvent(data, state) {
  if (state.ended) return null;
  if (!state.room) return { id: "room" };
  if (state.queue.length) return state.queue[0];
  if (branchDue(data, state)) return { id: "branch" };

  for (const id of RECURRING) {
    const r = state.recurring[id];
    if (!r) return { id };
    if (state.year >= r.reviewAt) return { id, review: true };
  }

  if (state.randomRolledYear !== state.year) {
    state.randomRolledYear = state.year;
    if (rand(state) < data.random.chancePerYear) {
      const ev = rollRandomEvent(data, state);
      if (ev) {
        state.queue.push(ev);
        return ev;
      }
    }
  }

  return null;
}

// ランダムイベントを1つ選ぶ。選択のあるものはイベントを返し、ないものはその場で処理して null を返す
function rollRandomEvent(data, state) {
  // 無気力のあいだは昇進しない
  const eligible = Object.entries(data.random.events).filter(([id]) => id !== "promotion" || bandOf(data, state.fulfillment) !== "low");
  const total = eligible.reduce((s, [, d]) => s + d.weight, 0);
  let r = rand(state) * total;
  const [id, def] = eligible.find(([, d]) => (r -= d.weight) < 0) ?? eligible[eligible.length - 1];

  switch (id) {
    case "promotion":
      state.baseIncome *= 1 + def.rate;
      addHistory(state, "h.promotion", { pct: Math.round(def.rate * 100) });
      return null;
    case "illness": {
      const cost = pick(state, def.cost);
      state.savings -= cost;
      state.totals.medical += cost;
      state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);
      addHistory(state, "h.illness", { cost });
      return null;
    }
    case "bonusCut":
      state.bonusCutYear = state.year;
      addHistory(state, "h.bonusCut");
      return null;
    case "windfall": {
      const amount = Math.round(def.min + (def.max - def.min) * Math.pow(rand(state), 3));
      state.savings += amount;
      state.totals.extraIncome += amount;
      state.flags.maxWindfall = Math.max(state.flags.maxWindfall, amount);
      addHistory(state, "h.windfall", { amount });
      return null;
    }
    case "jobOffer":
      return { id: "jobOffer" };
  }
  return null;
}

// 分岐イベント「これからの暮らし」。恋人がいて30歳以上・交際2年以上か、35歳になったら
function branchDue(data, state) {
  if (state.age >= data.endAge) return true;
  const b = data.branch;
  return !!state.partner && state.age >= b.minAge && state.age - state.partner.since >= b.minPartnerYears;
}

// 充実度の段階：high（充実）・mid（ふつう）・low（無気力）
export function bandOf(data, fulfillment) {
  if (fulfillment >= data.fulfillment.highMin) return "high";
  if (fulfillment <= data.fulfillment.lowMax) return "low";
  return "mid";
}

// 車の評価額。購入額から、買い替えの年の売却額まで直線で下がる（新婚日記と同じ式）
export function carValue(car, year) {
  const owned = Math.min(1, (year - car.boughtYear) / car.years);
  return car.price - (car.price - car.resale) * owned;
}

// 選んだ場合にその場で貯金がいくら減るか（ボタンの予測値の表示用）。毎年かかる費用は含まない
export function immediateCost(data, state, event, choice) {
  const ev = data.events[event.id];
  if (!ev || !ev.options || !choice.tier) return 0;
  return ev.options.find((o) => o.tier === choice.tier).oneTime ?? 0;
}

// choice は { tier } / { skip: true } / { accept } / 分岐イベントは { marry }
export function choose(data, state, event, choice) {
  const head = state.queue[0];
  if (head && head.id === event.id) state.queue.shift();

  const ev = data.events[event.id];
  const opt = choice.tier && ev?.options ? ev.options.find((o) => o.tier === choice.tier) : null;
  if (opt) state.choices[opt.tier] += 1;
  else if (choice.skip) state.choices.none += 1;
  const cost = immediateCost(data, state, event, choice);
  state.savings -= cost;
  state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);

  switch (event.id) {
    case "room":
      state.room = { tier: opt.tier, annual: opt.annual, fulfillment: opt.fulfillment, movedInYear: state.year };
      addHistory(state, `events.room.${opt.tier}.diary`);
      break;

    case "food":
    case "social": {
      const picked = opt ?? ev.skip;
      const before = state.recurring[event.id]?.tier;
      state.recurring[event.id] = {
        tier: opt ? opt.tier : "none",
        annual: picked.annual,
        fulfillment: picked.fulfillment,
        meetBonus: picked.meetBonus ?? 0,
        reviewAt: state.year + ev.reviewEvery,
      };
      const tier = opt ? opt.tier : "skip";
      addHistory(state, event.review && before === state.recurring[event.id].tier ? `events.${event.id}.same` : `events.${event.id}.${tier}.diary`);
      break;
    }

    case "partner":
      state.partner = { ...state.partner, tier: opt.tier, annual: opt.annual, breakup: opt.breakup };
      addHistory(state, `events.partner.${opt.tier}.diary`);
      break;

    case "branch": {
      const marry = !!choice.marry && !!state.partner; // 恋人がいないときは、ひとりで生きていくだけ
      state.ended = marry ? "married" : "single";
      state.queue = [];
      addHistory(state, marry ? "h.married" : "h.single");
      break;
    }

    case "jobOffer": {
      if (choice.accept) {
        const range = data.random.events.jobOffer.range;
        const change = (rand(state) * 2 - 1) * range;
        state.baseIncome *= 1 + change;
        if (change > 0) state.flags.jobUp = true;
        addHistory(state, "h.jobAccepted", { pct: Math.round(change * 100) });
      } else addHistory(state, "h.jobDeclined");
      break;
    }
  }
}

// ---- 年末の収支 ----

// 基本生活費（光熱水費・通信費・日用品など）。一人暮らしを始めてから毎年少しずつ上がる
export function baseLiving(data, state) {
  return data.baseLiving * Math.pow(1 + data.livingGrowthPerYear, state.year);
}

// 手取り。年収は開始時の年収に、年齢による伸び（中央値の比。無気力の年は伸びない）を掛けたもの
export function workIncome(data, state) {
  const cut = state.bonusCutYear === state.year ? 1 - data.random.events.bonusCut.rate : 1;
  return state.baseIncome * state.raise * data.takeHomeRate * cut;
}

// 家賃。入居から renewalEvery 年ごとに、更新料（家賃1か月分）がかかる
export function rentCost(data, state) {
  if (!state.room) return 0;
  const years = state.year - state.room.movedInYear;
  const renewal = years > 0 && years % data.events.room.renewalEvery === 0 ? state.room.annual / 12 : 0;
  return state.room.annual + renewal;
}

// 1年の充実度の増減。選んでいる部屋・食生活・付き合いの値の合計から、自然減を引く
export function fulfillmentDelta(data, state) {
  const sources = [state.room, ...Object.values(state.recurring)].filter(Boolean);
  return sources.reduce((s, r) => s + r.fulfillment, 0) - data.fulfillment.decayPerYear;
}

// 出会いの確率。恋人がいない年に1回判定する
export function meetChance(data, state) {
  const m = data.meeting;
  const band = bandOf(data, state.fulfillment);
  const social = state.recurring.social?.meetBonus ?? 0;
  const bonus = band === "high" ? m.highBonus : band === "low" ? m.lowBonus : 0;
  return Math.max(0, m.baseChance + social + bonus);
}

// 別れの確率。交際中は毎年1回判定する
export function breakupChance(data, state) {
  const low = bandOf(data, state.fulfillment) === "low";
  return state.partner.breakup + (low ? data.meeting.lowBreakupBonus : 0);
}

// 1年分の収支を計算して年齢を進める。表示用に内訳を返す
export function endYear(data, state) {
  const income = workIncome(data, state);

  const items = {
    living: baseLiving(data, state),
    housing: rentCost(data, state),
    food: state.recurring.food?.annual ?? 0,
    social: state.recurring.social?.annual ?? 0,
    date: state.partner?.annual ?? 0,
    interest: state.savings < 0 ? -state.savings * data.cardLoanRate : 0,
  };
  const apathetic = bandOf(data, state.fulfillment) === "low";

  const expense = Object.values(items).reduce((x, y) => x + y, 0);
  state.savings += income - expense;
  state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);

  const t = state.totals;
  t.income += income;
  t.living += items.living;
  t.housing += items.housing;
  t.food += items.food;
  t.social += items.social;
  t.date += items.date;
  t.interest += items.interest;

  state.fulfillment = Math.max(0, Math.min(100, state.fulfillment + fulfillmentDelta(data, state)));

  // 出会いと別れ。恋人ができたら、翌年の初めに交際費を選ぶ
  if (state.partner) {
    if (rand(state) < breakupChance(data, state)) {
      state.partner = null;
      addHistory(state, "h.brokeUp");
    }
  } else if (rand(state) < meetChance(data, state)) {
    state.partner = { since: state.age + 1 };
    state.queue.push({ id: "partner" });
    addHistory(state, "h.met");
  }

  const closedAge = state.age;
  state.age += 1;
  state.year += 1;
  if (!apathetic) state.raise *= medianIncome(data, state.age) / medianIncome(data, closedAge);

  if (state.savings < data.bankruptLine) {
    state.ended = "bankrupt";
    state.queue = [];
    addHistory(state, "h.bankrupt");
  }

  return { age: closedAge, income, items, expense, delta: income - expense, savings: state.savings };
}

// ---- 結果 ----

export function netWorth(state) {
  const car = state.car ? carValue(state.car, state.year) : 0;
  return { savings: state.savings, car, total: state.savings + car };
}

export function rankOf(data, total) {
  return data.ranks.find((r) => r.min === null || total >= r.min);
}

// エンディング。結婚かひとりかと、終了時の充実度の組み合わせ
export function endingOf(data, state) {
  return state.ended === "bankrupt" ? "bankrupt" : `${state.ended}_${bandOf(data, state.fulfillment)}`;
}

// ---- 称号と実績 ----

const TIERS = ["high", "mid", "low", "none"];

function tierShare(state, tier) {
  const total = TIERS.reduce((s, t) => s + (state.choices[t] ?? 0), 0);
  return total ? (state.choices[tier] ?? 0) / total : 0;
}

// 称号の条件。data.titles（称号の id の並び）の順に調べて、最初に当てはまったものの id を返す
const TITLE_RULES = {
  showoff: (s) => tierShare(s, "high") >= 0.7,
  frugal: (s) => tierShare(s, "low") + tierShare(s, "none") >= 0.7,
  steady: (s) => tierShare(s, "mid") >= 0.7,
  balanced: () => true,
};

export function titleOf(data, state) {
  return data.titles.find((id) => TITLE_RULES[id]?.(state));
}

// 実績の条件。最後まで行った暮らし（破綻していない）だけで判定するものは finished を見る
const finished = (s) => s.ended === "married" || s.ended === "single";
const ACHIEVEMENT_RULES = {
  rankS: (s, nw, data) => finished(s) && rankOf(data, nw.total).rank === "S",
  bankrupt: (s) => s.ended === "bankrupt",
  noCardLoan: (s) => finished(s) && s.flags.minSavings >= 0,
  bigWindfall: (s, nw, data) => s.flags.maxWindfall >= data.bigWindfall,
  jobUp: (s) => s.flags.jobUp,
};

export function achievementsOf(data, state) {
  const nw = netWorth(state);
  return data.achievements.filter((id) => ACHIEVEMENT_RULES[id]?.(state, nw, data));
}

// 同じ開始条件・同じシードで「全部普通」を選んだ場合の純資産（破綻なら null）
export function compareWithMid(data, state) {
  const mid = playToEnd(data, state.settings, state.seed, "mid");
  return mid.ended === "bankrupt" ? null : netWorth(mid).total;
}

// ---- 自動プレイ（バランス確認用） ----

// 方針
//   high / mid / low: 毎回その段階を選ぶ
//   none: やらないを選べるものは、すべてやらない。ほかは安い
//   random: 毎回ランダム
//   smart: 要所（付き合い）だけ「高い」、ほかは普通
// 分岐イベントは、恋人がいれば結婚する
export const STRATEGIES = ["high", "mid", "low", "none", "random", "smart"];

export function autoChoice(data, state, event, strategy) {
  const tiers = ["high", "mid", "low"];
  const tier =
    strategy === "random" ? tiers[randInt(state, 0, 2)]
    : strategy === "smart" ? (event.id === "social" ? "high" : "mid")
    : strategy === "none" ? "low"
    : strategy;
  switch (event.id) {
    case "jobOffer":
      return { accept: strategy === "high" || (strategy === "random" && rand(state) < 0.5) };
    case "branch":
      return { marry: !!state.partner };
    case "social":
      return strategy === "none" ? { skip: true } : { tier };
    default:
      return { tier };
  }
}

export function playToEnd(data, settings, seed, strategy) {
  const state = createGame(data, settings, seed);
  let guard = 0;
  while (!state.ended && guard++ < 2000) {
    const ev = nextEvent(data, state);
    if (ev) choose(data, state, ev, autoChoice(data, state, ev, strategy));
    else endYear(data, state);
  }
  return state;
}
