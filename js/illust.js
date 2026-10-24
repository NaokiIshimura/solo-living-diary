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

  // 冷蔵庫と電子レンジ
  appliance: svg(`${ground}
    <rect class="il-b" x="48" y="18" width="36" height="68" rx="6"/>
    <rect class="il-c" x="48" y="44" width="36" height="3"/>
    <rect class="il-ink" x="76" y="26" width="3" height="12" rx="1.5" opacity=".5"/><rect class="il-ink" x="76" y="54" width="3" height="16" rx="1.5" opacity=".5"/>
    <rect class="il-c" x="90" y="56" width="34" height="30" rx="5"/>
    <rect class="il-ink" x="95" y="62" width="18" height="18" rx="2" opacity=".35"/>
    <circle class="il-a" cx="118" cy="66" r="2.5"/><circle class="il-a" cx="118" cy="75" r="2.5"/>`),

  // ごはんの茶わんと湯気
  food: svg(`${ground}
    <path class="il-c" d="M44 52 h72 c0 20 -16 34 -36 34 c-20 0 -36 -14 -36 -34z"/>
    <path class="il-a" d="M44 52 h72 c0 4 -1 7 -2 10 h-68 c-1 -3 -2 -6 -2 -10z"/>
    <ellipse class="il-shadow" cx="80" cy="50" rx="34" ry="8"/>
    <path class="il-line-ink" d="M106 18 l-26 30 M116 22 l-28 28" fill="none" stroke-width="3" stroke-linecap="round"/>
    <path class="il-line-b" d="M60 40 q-4 -8 0 -14 q4 -6 0 -12 M72 38 q-4 -8 0 -14" fill="none" stroke-width="3" stroke-linecap="round"/>`),

  // 乾杯するジョッキ
  social: svg(`${ground}
    <g transform="rotate(-12 60 56)">
      <rect class="il-c" x="42" y="36" width="30" height="46" rx="4"/>
      <rect class="il-shadow" x="40" y="30" width="34" height="10" rx="5"/>
      <path d="M42 46 h-8 v20 h8" fill="none" stroke="var(--il-c)" stroke-width="5"/>
    </g>
    <g transform="rotate(12 100 56)">
      <rect class="il-c" x="88" y="36" width="30" height="46" rx="4"/>
      <rect class="il-shadow" x="86" y="30" width="34" height="10" rx="5"/>
      <path d="M118 46 h8 v20 h-8" fill="none" stroke="var(--il-c)" stroke-width="5"/>
    </g>
    <path class="il-a" d="M80 14 l3 8 l8 0 l-6 5 l2 8 l-7 -5 l-7 5 l2 -8 l-6 -5 l8 0z"/>`),

  // ペンライトと音符
  hobby: svg(`${ground}
    <rect class="il-ink" x="62" y="56" width="10" height="30" rx="3" transform="rotate(-18 67 70)"/>
    <rect class="il-a" x="58" y="18" width="14" height="42" rx="7" transform="rotate(-18 65 40)"/>
    <path class="il-ink" d="M100 26 v34 a8 7 0 1 1 -4 -6 v-24 l22 -6 v28 a8 7 0 1 1 -4 -6 v-18z"/>
    <circle class="il-c" cx="40" cy="30" r="3"/><circle class="il-b" cx="126" cy="20" r="3"/><circle class="il-c" cx="128" cy="74" r="2.5"/>`),

  // ふたつのハート
  partner: svg(`${ground}
    <path class="il-a" d="M66 80 l-24 -24 c-10 -10 -4 -26 10 -26 c6 0 10 4 14 8 c4 -4 8 -8 14 -8 c14 0 20 16 10 26z"/>
    <path class="il-b" d="M100 62 l-16 -16 c-7 -7 -3 -18 7 -18 c4 0 7 3 9 5 c2 -2 5 -5 9 -5 c10 0 14 11 7 18z"/>`),

  // スマートフォンとハート
  konkatsu: svg(`${ground}
    <rect class="il-ink" x="58" y="12" width="44" height="76" rx="8"/>
    <rect class="il-c" x="62" y="20" width="36" height="58" rx="3"/>
    <path class="il-a" d="M80 64 l-12 -12 c-5 -5 -2 -13 5 -13 c3 0 5 2 7 4 c2 -2 4 -4 7 -4 c7 0 10 8 5 13z"/>
    <circle class="il-b" cx="118" cy="30" r="6"/><circle class="il-b" cx="42" cy="44" r="4"/>`),

  // 招待状（封筒とハート）
  invitation: svg(`${ground}
    <rect class="il-c" x="40" y="30" width="80" height="54" rx="4"/>
    <path class="il-line-ink" d="M40 32 l40 28 l40 -28" fill="none" stroke-width="3" opacity=".5"/>
    <circle class="il-a" cx="80" cy="60" r="9"/>
    <path class="il-c" d="M80 64 l-5 -5 c-2 -2 -1 -5 2 -5 c1 0 2 1 3 2 c1 -1 2 -2 3 -2 c3 0 4 3 2 5z"/>
    <circle class="il-b" cx="34" cy="22" r="3"/><circle class="il-a" cx="128" cy="20" r="3"/>`),

  // 道しるべ
  signpost: svg(`${ground}
    <rect class="il-ink" x="76" y="16" width="8" height="72" rx="2"/>
    <path class="il-a" d="M84 24 h36 l10 9 l-10 9 h-36z"/>
    <path class="il-b" d="M76 48 h-36 l-10 9 l10 9 h36z"/>`),

  // 部屋のかぎ
  key: svg(`${ground}
    <circle class="il-line-a" cx="56" cy="50" r="16" fill="none" stroke-width="8"/>
    <rect class="il-a" x="70" y="46" width="52" height="8" rx="3"/>
    <rect class="il-a" x="104" y="54" width="7" height="12" rx="2"/><rect class="il-a" x="114" y="54" width="7" height="8" rx="2"/>
    <rect class="il-c" x="36" y="74" width="40" height="8" rx="4" opacity=".8"/>`),

  // 壁ごしの物音
  noise: svg(`${ground}
    <rect class="il-c" x="70" y="16" width="20" height="70" rx="2"/>
    <path class="il-line-a" d="M100 30 l10 6 l-8 6 l12 6 l-8 6 l12 6" fill="none" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
    <path class="il-line-ink" d="M58 34 q-8 8 0 16 M48 28 q-14 14 0 28" fill="none" stroke-width="3" stroke-linecap="round" opacity=".6"/>`),

};

// イベントごとのイラスト
const EVENT_ILLUST = {
  title: "house",
  room: "house",
  appliance: "appliance",
  food: "food",
  social: "social",
  hobby: "hobby",
  renewal: "key",
  neighbor: "noise",
  invest: "books",
  car: "car",
  travel: "trip",
  partner: "partner",
  konkatsu: "konkatsu",
  friendWedding: "invitation",
  branch: "signpost",
  jobOffer: "chart",
};

// 名前でイラストを引く（OGP 画像を作るときに使う）
export function illust(name) {
  return ILLUST[name] ?? "";
}

export function illustFor(eventId) {
  return ILLUST[EVENT_ILLUST[eventId]] ?? "";
}
