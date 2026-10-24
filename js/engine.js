// ゲームロジック。DOM に依存しないので、ブラウザとシミュレーション（tools/simulate.mjs）の両方から使う。
// 金額の単位はすべて万円。
// 新婚日記のエンジンをもとに、ひとり暮らし用に作り直したもの。ライフイベント（部屋探し・食生活など）はまだ入っていない。

export const SAVE_VERSION = 1;

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
    queue: [], // 順番待ちのイベント（選択のあるランダムイベント）
    car: null,
    randomRolledYear: -1,
    bonusCutYear: -1,
    totals: { income: 0, extraIncome: 0, living: 0, housing: 0, food: 0, car: 0, medical: 0, interest: 0 },
    choices: { high: 0, mid: 0, low: 0 }, // 称号用に、高い／普通／安いを選んだ回数を数える
    // 実績用の記録
    flags: { minSavings: settings.savings, maxWindfall: 0, jobUp: false },
    settings: { ...settings },
    history: [],
    ended: null, // end / bankrupt
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
  if (state.queue.length) return state.queue[0];

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
  const eligible = Object.entries(data.random.events);
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

// choice は { tier } / { skip: true } / { never: true } / { accept }
export function choose(data, state, event, choice) {
  const head = state.queue[0];
  if (head && head.id === event.id) state.queue.shift();

  const ev = data.events[event.id];
  const opt = choice.tier && ev?.options ? ev.options.find((o) => o.tier === choice.tier) : null;
  if (opt) state.choices[opt.tier] += 1;
  const cost = immediateCost(data, state, event, choice);
  state.savings -= cost;
  state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);

  switch (event.id) {
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

// 手取り。年収は「開始時の年収 × 今の年齢の中央値 ÷ 開始年齢の中央値」で伸びる
export function workIncome(data, state) {
  const ratio = medianIncome(data, state.age) / medianIncome(data, state.startAge);
  const cut = state.bonusCutYear === state.year ? 1 - data.random.events.bonusCut.rate : 1;
  return state.baseIncome * ratio * data.takeHomeRate * cut;
}

// 1年分の収支を計算して年齢を進める。表示用に内訳を返す
export function endYear(data, state) {
  const income = workIncome(data, state);

  // 家賃と食費は、部屋探し・食生活のイベントが入るまでの仮の固定額
  const items = {
    living: baseLiving(data, state),
    housing: data.rent,
    food: data.food,
    interest: state.savings < 0 ? -state.savings * data.cardLoanRate : 0,
  };

  const expense = Object.values(items).reduce((x, y) => x + y, 0);
  state.savings += income - expense;
  state.flags.minSavings = Math.min(state.flags.minSavings, state.savings);

  const t = state.totals;
  t.income += income;
  t.living += items.living;
  t.housing += items.housing;
  t.food += items.food;
  t.interest += items.interest;

  const closedAge = state.age;
  state.age += 1;
  state.year += 1;

  if (state.savings < data.bankruptLine) {
    state.ended = "bankrupt";
    addHistory(state, "h.bankrupt");
  } else if (state.age >= data.endAge) {
    state.ended = "end";
    state.queue = [];
    addHistory(state, "h.ended");
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

// ---- 称号と実績 ----

const TIERS = ["high", "mid", "low"];

function tierShare(state, tier) {
  const total = TIERS.reduce((s, t) => s + state.choices[t], 0);
  return total ? state.choices[tier] / total : 0;
}

// 称号の条件。data.titles（称号の id の並び）の順に調べて、最初に当てはまったものの id を返す
const TITLE_RULES = {
  showoff: (s) => tierShare(s, "high") >= 0.7,
  frugal: (s) => tierShare(s, "low") >= 0.7,
  steady: (s) => tierShare(s, "mid") >= 0.7,
  balanced: () => true,
};

export function titleOf(data, state) {
  return data.titles.find((id) => TITLE_RULES[id]?.(state));
}

// 実績の条件。最後まで行った暮らしだけで判定するものは end を見る
const ACHIEVEMENT_RULES = {
  rankS: (s, nw, data) => s.ended === "end" && rankOf(data, nw.total).rank === "S",
  bankrupt: (s) => s.ended === "bankrupt",
  noCardLoan: (s) => s.ended === "end" && s.flags.minSavings >= 0,
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
//   random: 毎回ランダム
//   smart: 要所だけ「高い」を選ぶ例（イベントが入るまでは普通と同じ）
export const STRATEGIES = ["high", "mid", "low", "random", "smart"];

export function autoChoice(data, state, event, strategy) {
  const tiers = ["high", "mid", "low"];
  const tier =
    strategy === "random" ? tiers[randInt(state, 0, 2)]
    : strategy === "smart" ? "mid"
    : strategy;
  switch (event.id) {
    case "jobOffer":
      return { accept: strategy === "high" || (strategy === "random" && rand(state) < 0.5) };
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
