// イベントのイラスト。色は CSS の .il-* で決めるので、ダークモードでもそのまま使える。
// viewBox はすべて 0 0 160 100。

const svg = (body) => `<svg class="illust" viewBox="0 0 160 100" aria-hidden="true">${body}</svg>`;

const ground = '<ellipse class="il-shadow" cx="80" cy="90" rx="56" ry="6"/>';

const ILLUST = {

  trip: svg(`${ground}
    <rect class="il-a" x="50" y="34" width="60" height="50" rx="8"/>
    <rect class="il-line-b" x="68" y="22" width="24" height="14" rx="4" fill="none" stroke-width="5"/>
    <rect class="il-c" x="50" y="52" width="60" height="6"/>
    <circle class="il-b" cx="62" cy="86" r="4"/><circle class="il-b" cx="98" cy="86" r="4"/>
    <path class="il-b" d="M118 20 l22 -8 l-6 6 l8 6 l-6 0 l-4 6 z"/>`),

  books: svg(`${ground}
    <rect class="il-b" x="46" y="66" width="68" height="16" rx="3"/>
    <rect class="il-a" x="52" y="50" width="60" height="16" rx="3"/>
    <rect class="il-c" x="48" y="34" width="62" height="16" rx="3"/>
    <rect class="il-ink" x="56" y="40" width="20" height="3" rx="1.5" opacity=".4"/>
    <path class="il-a" d="M112 18 l4 10 l10 1 l-8 7 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -7 l10 -1z"/>`),

  car: svg(`${ground}
    <path class="il-a" d="M30 70 v-12 c0 -6 4 -10 10 -10 l14 -16 c2 -2 4 -3 7 -3 h38 c3 0 5 1 7 3 l14 16 c6 0 10 4 10 10 v12z"/>
    <path class="il-c" d="M62 34 h14 v14 h-26z M84 34 h14 l12 14 h-26z" opacity=".85"/>
    <circle class="il-ink" cx="56" cy="72" r="11"/><circle class="il-c" cx="56" cy="72" r="4"/>
    <circle class="il-ink" cx="106" cy="72" r="11"/><circle class="il-c" cx="106" cy="72" r="4"/>`),

  house: svg(`${ground}
    <rect class="il-c" x="48" y="46" width="64" height="40"/>
    <path class="il-a" d="M40 50 l40 -32 l40 32 z"/>
    <rect class="il-b" x="72" y="62" width="16" height="24" rx="2"/>
    <rect class="il-b" x="54" y="56" width="12" height="12" rx="2" opacity=".7"/>
    <rect class="il-b" x="94" y="56" width="12" height="12" rx="2" opacity=".7"/>
    <rect class="il-ink" x="98" y="22" width="8" height="16" opacity=".6"/>`),

  chart: svg(`${ground}
    <rect class="il-c" x="40" y="22" width="80" height="62" rx="6"/>
    <rect class="il-b" x="52" y="60" width="12" height="16" rx="2"/>
    <rect class="il-b" x="74" y="48" width="12" height="28" rx="2"/>
    <rect class="il-a" x="96" y="34" width="12" height="42" rx="2"/>
    <path class="il-line-ink" d="M50 52 l24 -12 l22 -10" fill="none" stroke-width="3" stroke-linecap="round"/>`),

};

// イラストのないイベントは、フェーズ3で足す
const EVENT_ILLUST = {
  title: "house",
  room: "house",
  invest: "books",
  car: "car",
  travel: "trip",
  jobOffer: "chart",
};

// 名前でイラストを引く（OGP 画像を作るときに使う）
export function illust(name) {
  return ILLUST[name] ?? "";
}

export function illustFor(eventId) {
  return ILLUST[EVENT_ILLUST[eventId]] ?? "";
}
