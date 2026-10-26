// ゲームロジック。DOM に依存しないので、ブラウザとシミュレーション（tools/simulate.mjs）の両方から使う。
// 金額の単位はすべて万円。
// 新婚日記のエンジンをもとに、一人暮らし用に作り直したもの。

export const SAVE_VERSION = 4;

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
    country: data.country, // 遊んでいる国（途中保存から続けるときと、新婚日記への引き継ぎに使う）
    year: 0, // 一人暮らしを始めてからの年数。始めた年が 0
    startAge: settings.age,
    age: settings.age,
    savings: settings.savings,
    gender: settings.gender,
    baseIncome: settings.income,
    raise: 1, // 年齢による年収の伸び（中央値の比）。無気力の年は伸びない
    fulfillment: data.fulfillment.start,
    room: null, // { tier, annual, fulfillment, troubleChance, movedInYear }
    moves: 0, // 引っ越した回数（最初の部屋探しは数えない）
    renewalDoneYear: -1,
    appliance: null, // { tier, price, breakdownChance, life, boughtYear }
    recurring: {}, // 食生活・付き合い・趣味：{ tier, annual, fulfillment, meetBonus, reviewAt }
    invest: { count: 0, nextAge: firstInvestAge(data, settings.age), schoolUntilYear: -1, tiers: [] },
    car: null, // { tier, price, resale, years, annual, breakdownChance, boughtYear }
    carNever: false,
    carNextAge: data.events.car.firstAge,
    tripDoneYear: -1,
    konkatsu: null, // { tier, annual, meetBonus }
    konkatsuNextYear: 0,
    partner: null, // { since（交際を始めた年齢）, tier, annual, breakup }
    meetBonusYear: { year: -1, bonus: 0 }, // 友人の結婚式の二次会など、その年だけの出会いの補正
    queue: [], // 順番待ちのイベント（恋人との交際・隣人トラブル・選択のあるランダムイベント）
    rolledYear: -1, // 昇進・病気・ランダムイベント・リスク判定をした年
    bonusCutYear: -1,
    totals: {
      income: 0, extraIncome: 0, living: 0, housing: 0, food: 0, social: 0, date: 0, konkatsu: 0, hobby: 0, travel: 0,
      appliance: 0, invest: 0, car: 0, medical: 0, events: 0, interest: 0,
    },
    choices: { high: 0, mid: 0, low: 0, none: 0 }, // 称号用に、高い／普通／安い／やらないを選んだ回数を数える
    picks: { social: [], hobby: [] }, // 称号用に、付き合いと趣味で選んだ段階を順に記録する
    // 実績用の記録
    flags: { minSavings: settings.savings, maxWindfall: 0, jobUp: false, certified: false, konkatsu: false, agency: false },
    settings: { ...settings },
    history: [],
    ended: null, // married / single / bankrupt
  };
  addHistory(state, "h.started");
  return state;
}

// 自己投資を最初に提案する年齢。firstAge から every 年ごとの年齢のうち、開始年齢以上で一番早いもの
function firstInvestAge(data, startAge) {
  const { firstAge, every } = data.events.invest;
  return startAge <= firstAge ? firstAge : firstAge + Math.ceil((startAge - firstAge) / every) * every;
}

// 日記の出来事。文そのものは持たず、翻訳のキーと差し込む値を持つ（画面側で言語に合わせて文にする）
//   "events." で始まるキーは国プロファイルの文（data/profiles/<国>/<言語>.json）、"h." で始まるキーは共通の文（i18n/<言語>.json）
function addHistory(state, key, params) {
  state.history.push(params ? { age: state.age, key, params } : { age: state.age, key });
}

const pick = (state, [min, max]) => randInt(state, min, max);

function pay(state, amount, total) {
  state.savings -= amount;
  state.totals[total] += amount;
  state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);
}

function addFulfillment(state, delta) {
  state.fulfillment = Math.max(0, Math.min(100, state.fulfillment + delta));
}

// ---- イベント ----

// 毎年かかる費用を選ぶイベント。選んだものは state.recurring に入り、reviewEvery 年ごとに見直す
const RECURRING = ["food", "social", "hobby"];

// 今年まだ処理していないイベントを1つ返す。なければ null（年末へ進む）
// ライフイベントのあとに、その年の判定（昇進・病気・ランダムイベント・リスク）を1回だけ行う。
// 選択のないものはその場で処理して日記に書き、選択のあるものは順番待ちに入れる
export function nextEvent(data, state) {
  if (state.ended) return null;
  const ev = data.events;
  if (!state.room) return { id: "room", move: state.moves > 0 };
  if (!state.appliance) return { id: "appliance" };
  if (state.year - state.appliance.boughtYear >= state.appliance.life) return { id: "appliance", replace: true };
  if (state.queue.length) return state.queue[0];
  if (branchDue(data, state)) return { id: "branch" };

  for (const id of RECURRING) {
    const r = state.recurring[id];
    if (!r && state.year >= (ev[id].firstYear ?? 0)) return { id };
    if (r && state.year >= r.reviewAt) return { id, review: true };
  }

  const lived = state.year - state.room.movedInYear;
  if (lived > 0 && lived % ev.renewal.every === 0 && state.renewalDoneYear !== state.year) return { id: "renewal" };

  if (state.invest.count < ev.invest.max && state.age >= state.invest.nextAge) return { id: "invest" };

  if (!state.carNever && state.age >= state.carNextAge) {
    if (!state.car) return { id: "car", replace: false };
    if (state.year - state.car.boughtYear >= state.car.years) return { id: "car", replace: true };
  }

  const t = ev.travel;
  if (state.year >= t.firstYear && (state.year - t.firstYear) % t.every === 0 && state.tripDoneYear !== state.year) return { id: "travel" };

  if (!state.partner && state.age >= ev.konkatsu.minAge && state.year >= state.konkatsuNextYear) return { id: "konkatsu" };

  if (state.rolledYear !== state.year) {
    state.rolledYear = state.year;
    rollYear(data, state);
    if (state.queue.length) return state.queue[0];
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

const inSchool = (state) => state.year < state.invest.schoolUntilYear;

// 昇進の確率。無気力なら昇進しない
export function promotionChance(data, state) {
  const p = data.yearly.promotion;
  const band = bandOf(data, state.fulfillment);
  if (band === "low") return 0;
  return p.chance + (band === "high" ? p.highBonus : 0) + (inSchool(state) ? p.schoolBonus : 0);
}

// 病気・ケガの確率
export function illnessChance(data, state) {
  const p = data.yearly.illness;
  const food = state.recurring.food?.illnessBonus ?? 0;
  return p.chance + food + (bandOf(data, state.fulfillment) === "low" ? p.lowBonus : 0);
}

// その年の判定。昇進 → 病気・ケガ → ランダムイベント → 所有物のリスク（家電の故障・隣人トラブル）の順
function rollYear(data, state) {
  const y = data.yearly;
  if (rand(state) < promotionChance(data, state)) {
    state.baseIncome *= 1 + y.promotion.rate;
    addHistory(state, "h.promotion", { pct: Math.round(y.promotion.rate * 100) });
  }
  if (rand(state) < illnessChance(data, state)) {
    const cost = pick(state, y.illness.cost);
    pay(state, cost, "medical");
    addHistory(state, "h.illness", { cost });
  }
  if (rand(state) < data.random.chancePerYear) {
    const ev = rollRandomEvent(data, state);
    if (ev) state.queue.push(ev);
  }
  if (rand(state) < state.appliance.breakdownChance) {
    const cost = Math.round(state.appliance.price * data.events.appliance.breakdownShare);
    pay(state, cost, "appliance");
    addHistory(state, "h.applianceBroke", { cost });
  }
  if (rand(state) < state.room.troubleChance) {
    addFulfillment(state, data.events.neighbor.fulfillment);
    addHistory(state, "h.neighborTrouble");
    state.queue.push({ id: "neighbor" });
  }
}

// ランダムイベントを1つ選ぶ。選択のあるものはイベントを返し、ないものはその場で処理して null を返す
function rollRandomEvent(data, state) {
  const eligible = Object.entries(data.random.events);
  const total = eligible.reduce((s, [, d]) => s + d.weight, 0);
  let r = rand(state) * total;
  const [id, def] = eligible.find(([, d]) => (r -= d.weight) < 0) ?? eligible[eligible.length - 1];

  switch (id) {
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
    case "friendWedding":
      return { id };
  }
  return null;
}

// 車の評価額。購入額から、買い替えの年の売却額まで直線で下がる（新婚日記と同じ式）
export function carValue(car, year) {
  const owned = Math.min(1, (year - car.boughtYear) / car.years);
  return car.price - (car.price - car.resale) * owned;
}

// 部屋の更新料
export function renewalFee(data, state) {
  return (state.room.annual / 12) * data.events.renewal.feeMonths;
}

// 選んだ場合にその場で貯金がいくら減るか（ボタンの予測値の表示用）。毎年かかる費用は含まない
export function immediateCost(data, state, event, choice) {
  if (event.id === "renewal") return choice.renew ? renewalFee(data, state) : 0;
  const resale = event.id === "car" && event.replace ? carValue(state.car, state.year) : 0;
  const ev = data.events[event.id];
  if (!ev?.options || !choice.tier) return -resale;
  return (ev.options.find((o) => o.tier === choice.tier).oneTime ?? 0) - resale;
}

// choice は { tier } / { skip: true } / { never: true } / { accept } / { renew } / { move } / 分岐イベントは { marry }
export function choose(data, state, event, choice) {
  const head = state.queue[0];
  if (head && head.id === event.id) state.queue.shift();

  const ev = data.events[event.id];
  const opt = choice.tier && ev?.options ? ev.options.find((o) => o.tier === choice.tier) : null;
  if (opt) state.choices[opt.tier] += 1;
  else if (choice.skip || choice.never) state.choices.none += 1;
  const cost = immediateCost(data, state, event, choice);
  state.savings -= cost;
  state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);

  switch (event.id) {
    case "room":
      state.room = { tier: opt.tier, annual: opt.annual, fulfillment: opt.fulfillment, troubleChance: opt.troubleChance, movedInYear: state.year };
      state.renewalDoneYear = state.year;
      state.totals.housing += cost;
      addHistory(state, `events.room.${opt.tier}.diary`);
      break;

    case "renewal":
      state.renewalDoneYear = state.year;
      state.totals.housing += cost;
      if (choice.move) moveOut(state);
      else addHistory(state, "h.renewed", { cost: Math.round(cost) });
      break;

    case "neighbor":
      if (choice.move) moveOut(state);
      else {
        addFulfillment(state, ev.fulfillment);
        addHistory(state, "h.neighborEndured");
      }
      break;

    case "appliance":
      state.appliance = { tier: opt.tier, price: opt.oneTime, breakdownChance: opt.breakdownChance, life: opt.life, boughtYear: state.year };
      state.totals.appliance += cost;
      addHistory(state, event.replace ? "h.applianceReplaced" : `events.appliance.${opt.tier}.diary`);
      break;

    case "food":
    case "social":
    case "hobby": {
      const picked = opt ?? ev.skip;
      const before = state.recurring[event.id]?.tier;
      state.recurring[event.id] = {
        tier: opt ? opt.tier : "none",
        annual: picked.annual,
        fulfillment: picked.fulfillment,
        meetBonus: picked.meetBonus ?? 0,
        illnessBonus: picked.illnessBonus ?? 0,
        reviewAt: state.year + ev.reviewEvery,
      };
      state.picks[event.id]?.push(state.recurring[event.id].tier);
      const tier = opt ? opt.tier : "skip";
      addHistory(state, event.review && before === state.recurring[event.id].tier ? `events.${event.id}.same` : `events.${event.id}.${tier}.diary`);
      break;
    }

    case "invest": {
      const inv = state.invest;
      inv.count += 1;
      inv.nextAge = state.age + ev.every;
      inv.tiers.push(opt ? opt.tier : "none");
      state.totals.invest += cost;
      if (!opt) {
        addHistory(state, "events.invest.skip.diary");
      } else if (opt.schoolYears) {
        inv.schoolUntilYear = state.year + opt.schoolYears;
        addHistory(state, `events.invest.${opt.tier}.diary`);
      } else if (rand(state) < opt.passChance) {
        state.baseIncome *= 1 + opt.raise;
        state.flags.certified = true;
        addHistory(state, `events.invest.${opt.tier}.pass`, { pct: Math.round(opt.raise * 100) });
      } else {
        addHistory(state, `events.invest.${opt.tier}.fail`);
      }
      break;
    }

    case "car": {
      if (event.replace) addHistory(state, "h.carSold", { value: Math.round(carValue(state.car, state.year)) });
      state.totals.car += cost;
      if (opt) {
        state.car = { tier: opt.tier, price: opt.oneTime, resale: opt.resale, years: opt.years, annual: opt.annual, breakdownChance: opt.breakdownChance, boughtYear: state.year };
        addHistory(state, `events.car.${opt.tier}.diary`);
      } else {
        state.car = null;
        if (choice.never) {
          state.carNever = true;
          addHistory(state, "events.car.never");
        } else {
          state.carNextAge = state.age + ev.reproposeAfter;
          addHistory(state, "events.car.skip");
        }
      }
      break;
    }

    case "travel":
      state.tripDoneYear = state.year;
      state.totals.travel += cost;
      addFulfillment(state, (opt ?? ev.skip).fulfillment);
      addHistory(state, `events.travel.${opt ? opt.tier : "skip"}.diary`);
      break;

    case "konkatsu":
      state.konkatsuNextYear = state.year + ev.every;
      state.konkatsu = opt ? { tier: opt.tier, annual: opt.annual, meetBonus: opt.meetBonus } : null;
      if (opt) state.flags.konkatsu = true;
      if (opt?.tier === "high") state.flags.agency = true;
      addHistory(state, `events.konkatsu.${opt ? opt.tier : "skip"}.diary`);
      break;

    case "partner":
      state.partner = { ...state.partner, tier: opt.tier, annual: opt.annual, breakup: opt.breakup };
      addHistory(state, `events.partner.${opt.tier}.diary`);
      break;

    case "friendWedding":
      state.totals.events += cost;
      addFulfillment(state, opt.fulfillment);
      if (opt.meetBonus) state.meetBonusYear = { year: state.year, bonus: opt.meetBonus };
      addHistory(state, `events.friendWedding.${opt.tier}.diary`);
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
        const def = data.random.events.jobOffer;
        // スクールに通っているあいだは、上がる側に寄る
        const low = inSchool(state) ? def.schoolMin : -1;
        const change = (low + rand(state) * (1 - low)) * def.range;
        state.baseIncome *= 1 + change;
        if (change > 0) state.flags.jobUp = true;
        addHistory(state, "h.jobAccepted", { pct: Math.round(change * 100) });
      } else addHistory(state, "h.jobDeclined");
      break;
    }
  }
}

// 部屋を出る。次の nextEvent で部屋探しになる
function moveOut(state) {
  state.room = null;
  state.moves += 1;
  addHistory(state, "h.moveOut");
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

// 1年の充実度の増減。選んでいる部屋・食生活・付き合い・趣味の値の合計から、自然減を引く
export function fulfillmentDelta(data, state) {
  const sources = [state.room, ...Object.values(state.recurring)].filter(Boolean);
  return sources.reduce((s, r) => s + r.fulfillment, 0) - data.fulfillment.decayPerYear;
}

// 出会いの確率。恋人がいない年に1回判定する
export function meetChance(data, state) {
  const m = data.meeting;
  const band = bandOf(data, state.fulfillment);
  const social = state.recurring.social?.meetBonus ?? 0;
  const konkatsu = state.konkatsu?.meetBonus ?? 0;
  const once = state.meetBonusYear.year === state.year ? state.meetBonusYear.bonus : 0;
  const bonus = band === "high" ? m.highBonus : band === "low" ? m.lowBonus : 0;
  return Math.max(0, m.baseChance + social + konkatsu + once + bonus);
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
    housing: state.room ? state.room.annual : 0,
    food: state.recurring.food?.annual ?? 0,
    social: state.recurring.social?.annual ?? 0,
    hobby: state.recurring.hobby?.annual ?? 0,
    date: state.partner?.annual ?? 0,
    konkatsu: state.konkatsu?.annual ?? 0,
    car: state.car ? state.car.annual : 0,
    breakdown: 0,
    interest: state.savings < 0 ? -state.savings * data.cardLoanRate : 0,
  };
  if (state.car && rand(state) < state.car.breakdownChance) {
    items.breakdown = pick(state, data.events.car.breakdownCost);
    addHistory(state, "h.carBreakdown", { cost: items.breakdown });
  }
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
  t.hobby += items.hobby;
  t.date += items.date;
  t.konkatsu += items.konkatsu;
  t.car += items.car + items.breakdown;
  t.interest += items.interest;

  addFulfillment(state, fulfillmentDelta(data, state));

  // 出会いと別れ。恋人ができたら、翌年の初めに交際費を選ぶ。婚活は翌年から止める
  if (state.partner) {
    if (rand(state) < breakupChance(data, state)) {
      state.partner = null;
      state.konkatsuNextYear = state.year + 1; // 別れたら、翌年に婚活を提案し直す
      addHistory(state, "h.brokeUp");
    }
  } else if (rand(state) < meetChance(data, state)) {
    state.partner = { since: state.age + 1 };
    state.konkatsu = null;
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

// 全部が指定の段階で、回数が min 以上か
const allOf = (list, tier, min = 2) => list.length >= min && list.every((x) => x === tier);

// 称号の条件。data.titles（称号の id の並び）の順に調べて、最初に当てはまったものの id を返す
const TITLE_RULES = {
  oshi: (s) => allOf(s.picks.hobby, "high"),
  selfInvest: (s) => s.invest.tiers.length >= 2 && !s.invest.tiers.includes("none"),
  showoff: (s) => tierShare(s, "high") >= 0.7,
  frugal: (s) => tierShare(s, "low") + tierShare(s, "none") >= 0.7,
  steady: (s) => tierShare(s, "mid") >= 0.7,
  social: (s) => allOf(s.picks.social, "high"),
  mover: (s) => s.moves >= 3,
  carFree: (s) => s.carNever,
  balanced: () => true,
};

export function titleOf(data, state) {
  return data.titles.find((id) => TITLE_RULES[id]?.(state));
}

// 実績の条件。最後まで行った暮らし（破綻していない）だけで判定するものは finished を見る
// 「物語は続く」（新婚日記へ続くボタンを押した）は画面の操作で記録するので、ここでは判定しない
const finished = (s) => s.ended === "married" || s.ended === "single";
const ACHIEVEMENT_RULES = {
  rankS: (s, nw, data) => finished(s) && rankOf(data, nw.total).rank === "S",
  bankrupt: (s) => s.ended === "bankrupt",
  stayed: (s) => finished(s) && s.moves === 0,
  wanderer: (s) => s.moves >= 5,
  certified: (s) => s.flags.certified,
  jobUp: (s) => s.flags.jobUp,
  fate: (s) => s.ended === "married" && !s.flags.konkatsu,
  agency: (s) => s.ended === "married" && s.flags.agency,
  happy: (s, nw, data) => finished(s) && s.fulfillment >= data.happyFulfillment,
  noCardLoan: (s) => finished(s) && s.flags.minSavings >= 0,
  bigWindfall: (s, nw, data) => s.flags.maxWindfall >= data.bigWindfall,
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

// ---- 新婚日記への引き継ぎ ----

// 新婚日記の開始設定に渡すデータ（設計書の「新婚日記への引き継ぎ」）。URL のクエリ d に base64url にして入れる
// 車は新婚日記の state.car と同じ値をそのまま渡し、買った年は年齢で渡す。
// 版2で国を足した（新婚日記は引き継いだ国で始める）。金額はその国のプロファイルの単位
export function handoffData(data, state) {
  const c = state.car;
  return {
    v: 2,
    country: state.country ?? data.country,
    gender: state.gender,
    age: state.age,
    savings: Math.round(state.savings),
    income: Math.round(state.baseIncome * state.raise),
    car: c ? { tier: c.tier, price: c.price, resale: c.resale, years: c.years, annual: c.annual, breakdownChance: c.breakdownChance, boughtAge: state.startAge + c.boughtYear } : null,
    ending: endingOf(data, state),
  };
}

// ---- 自動プレイ（バランス確認用） ----

// 方針
//   high / mid / low: 毎回その段階を選ぶ
//   none: やらないを選べるものは、すべてやらない（車は生涯持たない）。ほかは安い
//   random: 毎回ランダム
//   smart: 要所（付き合い・自己投資）だけ「高い」、ほかは普通
// どの方針も、部屋は更新し、隣人トラブルは我慢する。車は買うと貯金がマイナスになるときは見送る。分岐イベントは、恋人がいれば結婚する
export const STRATEGIES = ["high", "mid", "low", "none", "random", "smart"];

const SKIPPABLE = new Set(["social", "hobby", "invest", "travel", "konkatsu"]);

export function autoChoice(data, state, event, strategy) {
  const tiers = ["high", "mid", "low"];
  const tier =
    strategy === "random" ? tiers[randInt(state, 0, 2)]
    : strategy === "smart" ? (event.id === "social" || event.id === "invest" ? "high" : "mid")
    : strategy === "none" ? "low"
    : strategy;
  switch (event.id) {
    case "jobOffer":
      return { accept: strategy === "high" || (strategy === "smart" && inSchool(state)) || (strategy === "random" && rand(state) < 0.5) };
    case "branch":
      return { marry: !!state.partner };
    case "renewal":
      return { renew: true };
    case "neighbor":
      return { endure: true };
    case "car":
      if (strategy === "none") return { never: true };
      return state.savings - immediateCost(data, state, event, { tier }) < 0 ? { skip: true } : { tier };
    default:
      return strategy === "none" && SKIPPABLE.has(event.id) ? { skip: true } : { tier };
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
