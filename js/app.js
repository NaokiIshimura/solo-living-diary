// 画面の操作。ゲームの計算は engine.js、文は i18n.js にまかせる。
import {
  SAVE_VERSION,
  achievementsOf,
  bandOf,
  carValue,
  choose,
  compareWithMid,
  createGame,
  defaultSettings,
  endYear,
  endingOf,
  immediateCost,
  renewalFee,
  medianIncome,
  netWorth,
  newSeed,
  nextEvent,
  randomSettings,
  rankOf,
  titleOf,
} from "./engine.js";
import { LANGS, applyStatic, currentLang, loadLang, money, pageLang, t } from "./i18n.js";
import { illustFor } from "./illust.js";
import { canvasToBlob, drawShareCard } from "./share.js";
import { clearAll, loadRecords, loadSave, loadSettings, recordResult, writeSave, writeSettings } from "./storage.js";

const PROFILE = "jp"; // v1 は日本プロファイルだけ
const SPEED_MS = { 1: 900, 2: 400 };

const $ = (sel) => document.querySelector(sel);

let data;
let state = null;
let speed = 1;
let timer = null;
let settings = loadSettings();

// ---- 言語 ----

async function setLang(code) {
  await loadLang(code, data, PROFILE);
  applyStatic();
  $("#settings-lang").innerHTML = LANGS.map((l) => `<option value="${l.code}"${l.code === code ? " selected" : ""}>${l.name}</option>`).join("");
  updateMoneyHints();
}

// 言語を変えるときは、その言語のページ（/en/ など）へ移る。選んだ言語は nacn.app の全サイトで同じキー（lang）に覚える
function goToLang(code) {
  try {
    localStorage.setItem("lang", code);
  } catch {}
  location.href = `../${code}/`;
}

// ---- 保存 ----

function save() {
  writeSave(state && !state.ended ? state : null);
}

function load() {
  const saved = loadSave();
  return saved && saved.version === SAVE_VERSION && !saved.ended ? saved : null;
}

// ---- 画面の切り替え ----

function show(id) {
  for (const el of document.querySelectorAll(".screen")) el.hidden = el.id !== id;
  window.scrollTo(0, 0);
}

function showTitle() {
  stop();
  $("#btn-continue").hidden = !load();
  $("#title-illust").innerHTML = illustFor("title");
  show("screen-title");
}

for (const b of document.querySelectorAll("[data-back]")) b.addEventListener("click", showTitle);

// ---- 開始設定 ----

const form = $("#setup-form");
let incomeEdited = false;

function fillForm(s) {
  form.gender.value = s.gender;
  form.age.value = s.age;
  form.savings.value = s.savings;
  form.income.value = s.income;
  updateMoneyHints();
}

// 金額の入力欄の下に、表示用の金額（日本語以外では円の額）を出す
function updateMoneyHints() {
  for (const out of document.querySelectorAll("[data-money-for]")) {
    out.textContent = currentLang().code === "ja" ? "" : `= ${money(Number(form[out.dataset.moneyFor].value) || 0)}`;
  }
}

function readForm() {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
  return {
    gender: form.gender.value,
    age: clamp(form.age.value, data.startAge.min, data.startAge.max),
    savings: clamp(form.savings.value, data.startSavings.min, data.startSavings.max),
    income: clamp(form.income.value, 0, 3000),
  };
}

function showSetup() {
  incomeEdited = false;
  fillForm(defaultSettings(data));
  show("screen-setup");
}

// 年齢を変えたら、手で変えていない年収をその年齢の中央値にそろえる
form.age.addEventListener("input", () => {
  if (!incomeEdited) form.income.value = Math.round(medianIncome(data, readForm().age) / 10) * 10;
  updateMoneyHints();
});
form.income.addEventListener("input", () => (incomeEdited = true));
form.addEventListener("input", updateMoneyHints);

form.addEventListener("click", (e) => {
  const key = e.target.dataset?.random;
  if (!key) return;
  const r = randomSettings(data, newSeed());
  const current = readForm();
  if (key === "age") {
    form.age.value = r.age;
    form.age.dispatchEvent(new Event("input"));
  } else if (key === "savings") form.savings.value = r.savings;
  else if (key === "income") {
    const median = medianIncome(data, current.age);
    form.income.value = Math.round((median * (0.7 + Math.random() * 0.6)) / 10) * 10;
    incomeEdited = true;
  }
  updateMoneyHints();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  startGame(readForm());
});

$("#btn-omakase").addEventListener("click", () => startGame(randomSettings(data, newSeed())));

// ---- メイン ----

function startGame(start) {
  state = createGame(data, start);
  $("#diary").replaceChildren();
  shown = 0;
  flushDiary();
  addDiary(
    state.age,
    t("main.startLine", { savings: state.savings, income: start.income }),
  );
  enterMain();
}

function continueGame() {
  state = load();
  if (!state) return showTitle();
  $("#diary").replaceChildren();
  shown = 0;
  flushDiary();
  addDiary(state.age, t("main.resumed"));
  enterMain();
}

function enterMain() {
  show("screen-main");
  renderStatus();
  setSpeed(settings.speed);
}

function addDiary(age, html, moneyHtml) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="age">${t("main.age", { n: age })}</span>${html}${moneyHtml ? ` <span class="money">${moneyHtml}</span>` : ""}`;
  const list = $("#diary");
  list.append(li);
  list.scrollTop = list.scrollHeight;
}

// 日記の出来事（キーと値）を、今の言語の文にする
const historyText = (h) => t(h.key, h.params);

// まだ日記に書いていない出来事を書く
let shown = 0;
function flushDiary() {
  for (const h of state.history.slice(shown)) addDiary(h.age, historyText(h));
  shown = state.history.length;
}

function renderStatus() {
  const s = (k, p) => t(`main.status.${k}`, p);
  const room = state.room ? t(`events.room.${state.room.tier}.label`) : s("none");
  const partner = state.partner ? s("partnerYears", { n: state.age - state.partner.since + 1 }) : s("none");
  const items = [
    [s("age"), t("main.age", { n: state.age })],
    [s("years"), s("yearsN", { n: state.year + 1 })],
    [s("savings"), money(state.savings), "savings" + (state.savings < 0 ? " minus" : "")],
    [s("fulfillment"), t(`band.${bandOf(data, state.fulfillment)}`)],
    [s("room"), room],
    [s("partner"), partner],
    [s("car"), state.car ? t(`events.car.${state.car.tier}.label`) : s("none")],
  ];
  $("#status").replaceChildren(
    ...items.map(([label, value, cls]) => {
      const div = document.createElement("div");
      div.className = cls ?? "";
      div.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
      return div;
    }),
  );
}

function setSpeed(s) {
  speed = s;
  for (const b of document.querySelectorAll("[data-speed]")) b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === s));
  stop();
  if (s > 0 && $("#modal").hidden && state && !state.ended) timer = setInterval(tick, SPEED_MS[s]);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

document.querySelector(".controls").addEventListener("click", (e) => {
  const s = e.target.dataset?.speed;
  if (s !== undefined) setSpeed(Number(s));
});

function tick() {
  const ev = nextEvent(data, state);
  flushDiary(); // 選択のないランダムイベントは nextEvent の中で起きる
  if (ev) {
    stop();
    renderStatus();
    openEvent(ev);
    return;
  }
  const r = endYear(data, state);
  if (settings.yearSummary) showYearSummary(r);
  addDiary(r.age, t("main.yearEnd"), t("main.yearEndMoney", { income: r.income, expense: r.expense, delta: r.delta, savings: r.savings }));
  flushDiary();
  renderStatus();
  save();
  if (state.ended) {
    stop();
    setTimeout(showResult, 800);
  }
}

// 年末の収支を数秒だけ表示する
let summaryTimer = null;
function showYearSummary(r) {
  const el = $("#year-summary");
  const rows = Object.entries(r.items)
    .filter(([, v]) => v > 0.5)
    .map(([k, v]) => `<span>${t(`summary.items.${k}`)}</span><span class="num minus">−${money(v)}</span>`)
    .join("");
  el.innerHTML = `
    <div class="ys-head">${t("summary.head", { age: r.age })} ${t("summary.unit", { delta: r.delta })}</div>
    <div class="ys-grid"><span>${t("summary.income")}</span><span class="num plus">+${money(r.income)}</span>${rows}</div>`;
  el.hidden = false;
  clearTimeout(summaryTimer);
  summaryTimer = setTimeout(() => (el.hidden = true), speed === 2 ? 1200 : 2000);
}

// ---- イベント ----

function describe(ev) {
  const e = (k, p) => t(`event.${ev.id}.${k}`, p);
  const yesNo = () => ({ yes: e("yes"), no: e("no") });
  switch (ev.id) {
    case "room":
      return { title: e("title"), text: ev.move ? e("textMove") : e("text") };
    case "appliance":
      return { title: e("title"), text: ev.replace ? e("textReplace") : e("text") };
    case "renewal":
      return { title: e("title"), text: e("text", { n: state.year - state.room.movedInYear }) };
    case "food":
    case "social":
    case "hobby":
      return {
        title: e("title"),
        text: ev.review ? e("textReview", { n: state.year }) : e("text"),
        ...(data.events[ev.id].skip ? yesNo() : {}),
      };
    case "invest":
    case "konkatsu":
      return { title: e("title"), text: e("text", { age: state.age }), ...yesNo() };
    case "travel":
      return { title: e("title"), text: e("text"), ...yesNo() };
    case "car":
      return ev.replace
        ? { title: e("titleReplace"), text: e("textReplace", { years: state.year - state.car.boughtYear, value: carValue(state.car, state.year) }), yes: e("yes"), no: t("event.later"), never: e("never") }
        : { title: e("titleBuy"), text: e("textBuy"), yes: e("yes"), no: t("event.later"), never: e("never") };
    case "branch":
      return {
        title: e("title"),
        text: state.partner ? e("textPartner", { age: state.age, years: state.age - state.partner.since }) : e("textAlone", { age: state.age, years: state.year + 1 }),
      };
    default:
      return { title: e("title"), text: e("text") };
  }
}

function optionDetail(ev, opt) {
  switch (ev.id) {
    case "room":
      return t("event.room.detail", { annual: opt.annual, cost: opt.oneTime });
    case "partner":
      return `${t("event.annual", { annual: opt.annual })}・${t("event.partner.breakup", { pct: Math.round(opt.breakup * 100) })}`;
    case "appliance":
      return t("event.appliance.detail", { cost: opt.oneTime, life: opt.life }) + (opt.breakdownChance >= 0.2 ? t("event.appliance.fragile") : "");
    case "car":
      return t("event.car.detail", { cost: opt.oneTime, annual: opt.annual, years: opt.years, resale: opt.resale }) + (opt.breakdownChance >= 0.2 ? t("event.car.fragile") : "");
    case "invest":
      return `${money(opt.oneTime)}・${opt.schoolYears ? t("event.invest.school") : t("event.invest.pass", { pct: Math.round(opt.passChance * 100), raise: Math.round(opt.raise * 100) })}`;
    case "konkatsu":
      return t("event.konkatsu.detail", { annual: opt.annual, pct: Math.round(opt.meetBonus * 100) });
    case "friendWedding":
      return t("event.friendWedding.detail", { cost: opt.oneTime });
    default:
      return opt.annual !== undefined ? t("event.annual", { annual: opt.annual }) : money(opt.oneTime);
  }
}

function predicted(ev, choice) {
  return t("event.predicted", { money: state.savings - immediateCost(data, state, ev, choice) });
}

function button(label, sub, onClick, primary) {
  const b = document.createElement("button");
  b.className = "option" + (primary ? " primary" : "");
  b.innerHTML = `<span>${label}</span>${sub ? `<span class="sub">${sub}</span>` : ""}`;
  b.addEventListener("click", onClick);
  return b;
}

function openEvent(ev) {
  const d = describe(ev);
  $("#year-summary").hidden = true;
  $("#modal-illust").innerHTML = illustFor(ev.id);
  $("#modal-title").textContent = d.title;
  $("#modal-text").innerHTML = d.text;
  const box = $("#modal-options");
  const decide = (choice) => {
    $("#modal").hidden = true;
    choose(data, state, ev, choice);
    flushDiary();
    renderStatus();
    save();
    // 分岐イベントで暮らしが終わったら、そのままリザルトへ
    if (state.ended) return setTimeout(showResult, 800);
    // 同じ年のイベントは続けて出す。年を進めるのは再生中だけ
    const next = nextEvent(data, state);
    flushDiary();
    if (next) openEvent(next);
    else setSpeed(speed);
  };

  const tiers = () => {
    const opts = data.events[ev.id].options.map((o) => {
      const label = t("event.tierOption", { tier: t(`event.tier.${o.tier}`), label: t(`events.${ev.id}.${o.tier}.label`) });
      return button(label, `${optionDetail(ev, o)}<br>${predicted(ev, { tier: o.tier })}`, () => decide({ tier: o.tier }));
    });
    if (d.yes) opts.push(button(t("event.back"), "", firstStep));
    box.replaceChildren(...opts);
  };

  const firstStep = () => {
    const e = (k, p) => t(`event.${ev.id}.${k}`, p);
    switch (ev.id) {
      case "jobOffer":
        return box.replaceChildren(
          button(e("accept"), e("acceptSub"), () => decide({ accept: true })),
          button(e("decline"), e("declineSub"), () => decide({ accept: false })),
        );
      case "branch":
        return box.replaceChildren(
          ...(state.partner ? [button(e("marry"), e("marrySub"), () => decide({ marry: true }))] : []),
          button(e("single"), e("singleSub"), () => decide({ marry: false })),
        );
      case "renewal":
        return box.replaceChildren(
          button(e("renew"), `${e("renewSub", { cost: renewalFee(data, state) })}<br>${predicted(ev, { renew: true })}`, () => decide({ renew: true })),
          button(e("move"), e("moveSub"), () => decide({ move: true })),
        );
      case "neighbor":
        return box.replaceChildren(
          button(e("move"), e("moveSub"), () => decide({ move: true })),
          button(e("endure"), e("endureSub"), () => decide({ endure: true })),
        );
    }
    if (!d.yes) return tiers();
    const opts = [button(d.yes, "", tiers, true), button(d.no, predicted(ev, { skip: true }), () => decide({ skip: true }))];
    if (d.never) opts.push(button(d.never, `${t("event.neverSub")}<br>${predicted(ev, { never: true })}`, () => decide({ never: true })));
    box.replaceChildren(...opts);
  };

  firstStep();
  $("#modal").hidden = false;
}

// ---- リザルト ----

const newBadge = () => `<span class="new">${t("result.new")}</span>`;

function endingInfo(nw) {
  const key = endingOf(data, state);
  const rank = key === "bankrupt" ? "―" : rankOf(data, nw.total).rank;
  const comment = key === "bankrupt" ? t("endings.bankrupt.comment") : `${t(`endings.${key}.comment`)}<br>${t(`ranks.${rank}.comment`)}`;
  return { key, rank, ending: t(`endings.${key}.name`), comment };
}

function lifeLines() {
  const r = (k, p) => t(`result.${k}`, p);
  const key = { bankrupt: "lifeBankrupt", married: "lifeMarried", single: "lifeSingle" }[state.ended];
  const band = t(`band.${bandOf(data, state.fulfillment)}`);
  return [r(key, { start: state.startAge, end: state.age }), r("fulfillmentLine", { n: Math.round(state.fulfillment), band })];
}

function showResult() {
  const nw = netWorth(state);
  const ending = endingInfo(nw);
  const title = titleOf(data, state);
  const achieved = achievementsOf(data, state);
  if (!state.recorded) {
    state.fresh = recordResult({ ending: ending.key, title, achievements: achieved, netWorth: state.ended === "bankrupt" ? null : nw.total });
    state.recorded = true;
  }
  const fresh = state.fresh;
  const mid = compareWithMid(data, state);
  const tt = state.totals;
  const r = (k, p) => t(`result.${k}`, p);
  const row = (label, v, cls = "") => `<tr class="${cls}"><td>${label}</td><td class="num">${money(v)}</td></tr>`;
  const bankrupt = state.ended === "bankrupt";

  const spending = [
    ["living", tt.living],
    ["housing", tt.housing],
    ["food", tt.food],
    ["social", tt.social + tt.date + tt.konkatsu],
    ["leisure", tt.hobby + tt.travel],
    ["invest", tt.invest],
    ["car", tt.car],
    ["other", tt.appliance + tt.medical + tt.events + tt.interest],
  ];
  const maxSpend = Math.max(...spending.map(([, v]) => v), 1);
  const compare = bankrupt ? "" : `<p class="compare">${mid === null ? r("compareBankrupt") : r("compare", { mid, diff: `<strong>${signedMoneyHtml(nw.total - mid)}</strong>` })}</p>`;

  $("#result").innerHTML = `
    <div class="result-head">
      <div class="rank">${ending.rank}</div>
      <p class="ending">${ending.ending}${fresh.ending ? newBadge() : ""}</p>
      <p class="comment">${ending.comment}</p>
      <p class="title-badge"><span class="label">${r("titleLabel")}</span>${t(`titles.${title}.name`)}${fresh.title ? newBadge() : ""}<span class="sub">${t(`titles.${title}.desc`)}</span></p>
      <p class="note">${lifeLines().join("<br>")}</p>
    </div>
    <section>
      <h3>${r(bankrupt ? "netWorthBankrupt" : "netWorthEnd")}</h3>
      <table>
        ${row(r("savings"), nw.savings)}
        ${row(r("carValue"), nw.car)}
        ${row(r("netWorth"), nw.total, "total")}
      </table>
      ${compare}
    </section>
    <section>
      <h3>${r("spending")}</h3>
      <div class="bars">${spending
        .map(([k, v]) => `<div class="bar"><span class="bar-label">${r(`spendingItems.${k}`)}</span><span class="bar-track"><span class="bar-fill" style="width:${(v / maxSpend) * 100}%"></span></span><span class="num">${money(v)}</span></div>`)
        .join("")}</div>
      <p class="hint">${r("incomeNote", { income: tt.income, extra: tt.extraIncome })}</p>
    </section>
    <section>
      <h3>${r("achievements")}</h3>
      ${achieved.length
        ? `<ul class="achievements">${achieved
            .map((id) => `<li><strong>${t(`achievements.${id}.name`)}</strong>${fresh.achievements.includes(id) ? newBadge() : ""}<span class="sub">${t(`achievements.${id}.desc`)}</span></li>`)
            .join("")}</ul>`
        : `<p class="hint">${r("noAchievements")}</p>`}
    </section>
    <section>
      <h3>${r("timeline")}</h3>
      <ol class="timeline">${state.history.map((h) => `<li><span class="age">${t("main.age", { n: h.age })}</span>${historyText(h)}</li>`).join("")}</ol>
    </section>`;
  renderShare(nw, ending, title);
  show("screen-result");
  save();
}

function signedMoneyHtml(v) {
  return `<span class="${v >= 0 ? "plus" : "minus"}">${v >= 0 ? "+" : "−"}${money(Math.abs(v))}</span>`;
}

// ---- シェア ----

async function renderShare(nw, ending, title) {
  const canvas = document.createElement("canvas");
  const bankrupt = state.ended === "bankrupt";
  drawShareCard(canvas, {
    gameName: t("meta.gameName"),
    rank: ending.rank,
    ending: ending.ending,
    titleLabel: t("result.titleLabel"),
    title: t(`titles.${title}.name`),
    netWorthLabel: t(bankrupt ? "result.netWorthBankrupt" : "result.netWorthEnd"),
    netWorth: money(nw.total),
    lines: lifeLines(),
    hashtag: t("meta.hashtag"),
  });
  const url = canvas.toDataURL("image/png");
  $("#share-preview").src = url;
  $("#btn-download").href = url;
  const blob = await canvasToBlob(canvas);
  const rank = bankrupt ? t("result.bankruptWord") : t("result.rankWord", { rank: ending.rank });
  const text = `${t("result.shareText", { ending: ending.ending, rank, title: t(`titles.${title}.name`) })} ${t("meta.hashtag")}`;
  const pageUrl = `${location.origin}/${currentLang().code}/`;
  $("#btn-post").href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
  const file = blob && new File([blob], "solo-living-diary.png", { type: "image/png" });
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
  $("#btn-share").hidden = !canShare;
  $("#btn-share").onclick = () => navigator.share({ files: [file], text }).catch(() => {});
}

// ---- エンディング図鑑 ----

function showGallery() {
  const rec = loadRecords();
  const g = (k, p) => t(`gallery.${k}`, p);
  const endings = data.endings;
  const count = (ids, seen) => `${ids.filter((x) => seen[x]).length} / ${ids.length}`;
  const locked = g("locked");
  $("#gallery").innerHTML = `
    <p class="note">${g("plays", { n: rec.plays })}${rec.best !== null ? g("best", { money: rec.best }) : ""}</p>
    <section>
      <h3>${g("endings")} <span class="count">${count(endings, rec.endings)}</span></h3>
      <ul class="cards">${endings
        .map((k) => (rec.endings[k] ? `<li>${t(`endings.${k}.name`)}</li>` : `<li class="locked">${locked}</li>`))
        .join("")}</ul>
    </section>
    <section>
      <h3>${g("titles")} <span class="count">${count(data.titles, rec.titles)}</span></h3>
      <ul class="cards">${data.titles
        .map((id) => (rec.titles[id] ? `<li><strong>${t(`titles.${id}.name`)}</strong><span class="sub">${t(`titles.${id}.desc`)}</span></li>` : `<li class="locked">${locked}</li>`))
        .join("")}</ul>
    </section>
    <section>
      <h3>${g("achievements")} <span class="count">${count(data.achievements, rec.achievements)}</span></h3>
      <ul class="achievements">${data.achievements
        .map((id) => `<li class="${rec.achievements[id] ? "" : "locked"}"><strong>${rec.achievements[id] ? t(`achievements.${id}.name`) : locked}</strong><span class="sub">${t(`achievements.${id}.desc`)}</span></li>`)
        .join("")}</ul>
    </section>`;
  show("screen-gallery");
}

// ---- 設定 ----

const settingsForm = $("#settings-form");

function showSettings() {
  settingsForm.yearSummary.checked = settings.yearSummary;
  settingsForm.speed.value = String(settings.speed);
  settingsForm.lang.value = currentLang().code;
  show("screen-settings");
}

settingsForm.addEventListener("change", (e) => {
  if (e.target.name === "lang") return goToLang(e.target.value);
  settings = { ...settings, yearSummary: settingsForm.yearSummary.checked, speed: Number(settingsForm.speed.value) };
  writeSettings(settings);
});

$("#btn-clear").addEventListener("click", () => {
  if (!confirm(t("settings.confirm"))) return;
  clearAll();
  settings = loadSettings();
  showSettings();
});

$("#btn-start").addEventListener("click", showSetup);
$("#btn-continue").addEventListener("click", continueGame);
$("#btn-again").addEventListener("click", showSetup);
$("#btn-gallery").addEventListener("click", showGallery);
$("#btn-settings").addEventListener("click", showSettings);

data = await (await fetch(new URL(`../data/profiles/${PROFILE}.json`, import.meta.url))).json();
await setLang(pageLang());
showTitle();
