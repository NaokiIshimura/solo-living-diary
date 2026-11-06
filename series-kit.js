/*! nacn series-kit — 結果画面の共通部品（シェア・ベストと連続日数・次に遊ぶゲーム・広告枠）
 * 元の版は claude-skills の skills/series-kit。各ゲームの /series-kit.js は写しなので、直すときは元の版を直して全ゲームに写す。
 * このファイルは scripts/build_kit.py が書き出す（ゲームの一覧はポータル nacn-app-portal の言語データから作る）。直接は編集しない。
 *
 * 使い方（結果を出したところで1回呼ぶ）:
 *   NacnKit.result(document.getElementById('kit'), {
 *     game: 'busy-reception',          // このゲームのサブドメイン
 *     lang: 'ja',                      // ページの言語（ja・en・zh-tw・ko・es・pt-br・id。地域版などは近い言語にまとめる）
 *     score: 1200,                     // 数値の点数（ベストと連続日数の記録に使う。なければ省く）
 *     lowerIsBetter: false,            // 小さいほどよい点数（タイムなど）のとき true
 *     headline: '受付の鑑',             // シェア文の1行目（称号・ランク・結果）
 *     detail: '1,200点',               // シェア文の2行目（点数など。省略可）
 *     grid: '🟩🟩🟥🟩',                 // 絵文字の列（省略可）
 *     best: true,                      // ベストを表示する（ゲームが自分で出しているなら false）
 *     share: true,                     // シェアを出す（ゲームが自分のシェアを持っているなら false）
 *     adSlot: '',                      // 広告ユニットID。空なら広告枠を出さない
 *     exclude: ['solo-living-diary']   // 「次に遊ぶ」に出さないゲーム（ゲームがすでに自分で案内しているものなど。省略可）
 *   });
 */
(function () {
  'use strict';
  var VERSION = '20261106b';
  var CATALOG = {"ja":[{"s":"tsunapop","n":"つなポップ","u":"https://tsunapop.nacn.app/","i":"https://nacn.app/images/tsunapop.png?v=20261102c"},{"s":"tsunapeaks","n":"つなピークス","u":"https://tsunapeaks.nacn.app/","i":"https://nacn.app/images/tsunapeaks.png?v=20261102c"},{"s":"gete-emon","n":"ゲテえもん","u":"https://gete-emon.nacn.app/ja/","i":"https://nacn.app/images/gete-emon.png?v=20261102c"},{"s":"busy-reception","n":"受付は今日も騒がしい","u":"https://busy-reception.nacn.app/ja/","i":"https://nacn.app/images/busy-reception.png?v=20261102c"},{"s":"salary-haggle","n":"査定面談、ゴネます。","u":"https://salary-haggle.nacn.app/ja/","i":"https://nacn.app/images/salary-haggle.png?v=20261102c"},{"s":"meeting-slacker","n":"会議中、サボります。","u":"https://meeting-slacker.nacn.app/ja/","i":"https://nacn.app/images/meeting-slacker.png?v=20261102c"},{"s":"hayaben-dash","n":"早弁ダッシュ","u":"https://hayaben-dash.nacn.app/ja/","i":"https://nacn.app/images/hayaben-dash.png?v=20261102c"},{"s":"sneak-out-at-five","n":"定時ダッシュ","u":"https://sneak-out-at-five.nacn.app/ja/","i":"https://nacn.app/images/sneak-out-at-five.png?v=20261102c"},{"s":"mebunryo","n":"目分量","u":"https://mebunryo.nacn.app/ja/","i":"https://nacn.app/images/mebunryo.png?v=20261102c"},{"s":"sunny-side-up","n":"目玉焼き、半熟で","u":"https://sunny-side-up.nacn.app/ja/","i":"https://nacn.app/images/sunny-side-up.png?v=20261102c"},{"s":"no-lemon","n":"レモン、かけないで","u":"https://no-lemon.nacn.app/ja/","i":"https://nacn.app/images/no-lemon.png?v=20261102c"},{"s":"crowded-train","n":"満員電車、座ります。","u":"https://crowded-train.nacn.app/ja/","i":"https://nacn.app/images/crowded-train.png?v=20261102c"},{"s":"elevator-close","n":"エレベーター、閉めます。","u":"https://elevator-close.nacn.app/ja/","i":"https://nacn.app/images/elevator-close.png?v=20261102c"},{"s":"diet-diary","n":"ダイエット日記","u":"https://diet-diary.nacn.app/ja/","i":"https://nacn.app/images/diet-diary.png?v=20261102c"},{"s":"muscle-diary","n":"筋トレ日記","u":"https://muscle-diary.nacn.app/ja/","i":"https://nacn.app/images/muscle-diary.png?v=20261102c"},{"s":"boba-diary","n":"タピオカ店日記","u":"https://boba-diary.nacn.app/ja/","i":"https://nacn.app/images/boba-diary.png?v=20261102c"},{"s":"nostalgia-diary","n":"ノスタルジア日記","u":"https://nostalgia-diary.nacn.app/ja/","i":"https://nacn.app/images/nostalgia-diary.png?v=20261102c"},{"s":"solo-living-diary","n":"一人暮らし日記","u":"https://solo-living-diary.nacn.app/ja/","i":"https://nacn.app/images/solo-living-diary.png?v=20261102c"},{"s":"newlywed-diary","n":"新婚日記","u":"https://newlywed-diary.nacn.app/ja/","i":"https://nacn.app/images/newlywed-diary.png?v=20261102c"},{"s":"isekai-diary","n":"異世界転生日記","u":"https://isekai-diary.nacn.app/?lang=ja","i":"https://nacn.app/images/isekai-diary.png?v=20261102c"}],"en":[{"s":"tsunapop","n":"TsunaPop","u":"https://tsunapop.nacn.app/?lang=en","i":"https://nacn.app/images/tsunapop-en.png?v=20261102c"},{"s":"tsunapeaks","n":"TsunaPeaks","u":"https://tsunapeaks.nacn.app/?lang=en","i":"https://nacn.app/images/tsunapeaks-en.png?v=20261102c"},{"s":"gete-emon","n":"Yum or Yuck!","u":"https://gete-emon.nacn.app/en/","i":"https://nacn.app/images/gete-emon-en.png?v=20261102c"},{"s":"busy-reception","n":"Front Desk Frenzy","u":"https://busy-reception.nacn.app/en/","i":"https://nacn.app/images/busy-reception-en.png?v=20261102c"},{"s":"salary-haggle","n":"Performance Review Poker","u":"https://salary-haggle.nacn.app/en/","i":"https://nacn.app/images/salary-haggle-en.png?v=20261102c"},{"s":"meeting-slacker","n":"Camera On, Brain Off","u":"https://meeting-slacker.nacn.app/en/","i":"https://nacn.app/images/meeting-slacker-en.png?v=20261102c"},{"s":"hayaben-dash","n":"Sneaky Lunch","u":"https://hayaben-dash.nacn.app/en/","i":"https://nacn.app/images/hayaben-dash-en.png?v=20261102c"},{"s":"sneak-out-at-five","n":"Sneak Out at Five","u":"https://sneak-out-at-five.nacn.app/en/","i":"https://nacn.app/images/sneak-out-at-five-en.png?v=20261102c"},{"s":"mebunryo","n":"Eyeball It","u":"https://mebunryo.nacn.app/en/","i":"https://nacn.app/images/mebunryo-en.png?v=20261102c"},{"s":"sunny-side-up","n":"Sunny Side Up, Please","u":"https://sunny-side-up.nacn.app/en/","i":"https://nacn.app/images/sunny-side-up-en.png?v=20261102c"},{"s":"no-lemon","n":"Don't Ketchup the Fries!","u":"https://no-lemon.nacn.app/en/","i":"https://nacn.app/images/no-lemon-en.png?v=20261102c"},{"s":"crowded-train","n":"Next Stop, My Seat","u":"https://crowded-train.nacn.app/en/","i":"https://nacn.app/images/crowded-train-en.png?v=20261102c"},{"s":"diet-diary","n":"Diet Diary","u":"https://diet-diary.nacn.app/en/","i":"https://nacn.app/images/diet-diary-en.png?v=20261102c"},{"s":"muscle-diary","n":"Muscle Diary","u":"https://muscle-diary.nacn.app/en/","i":"https://nacn.app/images/muscle-diary-en.png?v=20261102c"},{"s":"boba-diary","n":"Boba Shop Diary","u":"https://boba-diary.nacn.app/en/","i":"https://nacn.app/images/boba-diary-en.png?v=20261102c"},{"s":"nostalgia-diary","n":"Nostalgia Diary","u":"https://nostalgia-diary.nacn.app/en/","i":"https://nacn.app/images/nostalgia-diary-en.png?v=20261102c"},{"s":"solo-living-diary","n":"Solo Living Diary","u":"https://solo-living-diary.nacn.app/en/","i":"https://nacn.app/images/solo-living-diary-en.png?v=20261102c"},{"s":"newlywed-diary","n":"Newlywed Diary","u":"https://newlywed-diary.nacn.app/en/","i":"https://nacn.app/images/newlywed-diary-en.png?v=20261102c"},{"s":"isekai-diary","n":"Isekai Diary","u":"https://isekai-diary.nacn.app/?lang=en","i":"https://nacn.app/images/isekai-diary-en.png?v=20261102c"}],"zh-tw":[{"s":"tsunapop","n":"TsunaPop","u":"https://tsunapop.nacn.app/?lang=zh-tw","i":"https://nacn.app/images/tsunapop-zh-tw.png?v=20261102c"},{"s":"tsunapeaks","n":"TsunaPeaks","u":"https://tsunapeaks.nacn.app/?lang=zh-tw","i":"https://nacn.app/images/tsunapeaks-zh-tw.png?v=20261102c"},{"s":"gete-emon","n":"黑暗料理攤","u":"https://gete-emon.nacn.app/zh-tw/","i":"https://nacn.app/images/gete-emon-zh-tw.png?v=20261102c"},{"s":"busy-reception","n":"櫃檯今天也熱鬧滾滾","u":"https://busy-reception.nacn.app/zh-tw/","i":"https://nacn.app/images/busy-reception-zh-tw.png?v=20261102c"},{"s":"salary-haggle","n":"加薪盧到底","u":"https://salary-haggle.nacn.app/zh-tw/","i":"https://nacn.app/images/salary-haggle-zh-tw.png?v=20261102c"},{"s":"meeting-slacker","n":"開會摸魚中","u":"https://meeting-slacker.nacn.app/zh-tw/","i":"https://nacn.app/images/meeting-slacker-zh-tw.png?v=20261102c"},{"s":"hayaben-dash","n":"偷吃便當大作戰","u":"https://hayaben-dash.nacn.app/zh-tw/","i":"https://nacn.app/images/hayaben-dash-zh-tw.png?v=20261102c"},{"s":"sneak-out-at-five","n":"準時下班大作戰","u":"https://sneak-out-at-five.nacn.app/zh-tw/","i":"https://nacn.app/images/sneak-out-at-five-zh-tw.png?v=20261102c"},{"s":"mebunryo","n":"目測大師","u":"https://mebunryo.nacn.app/zh-tw/","i":"https://nacn.app/images/mebunryo-zh-tw.png?v=20261102c"},{"s":"sunny-side-up","n":"荷包蛋，半熟就好","u":"https://sunny-side-up.nacn.app/zh-tw/","i":"https://nacn.app/images/sunny-side-up-zh-tw.png?v=20261102c"},{"s":"no-lemon","n":"香菜，不要加","u":"https://no-lemon.nacn.app/zh-tw/","i":"https://nacn.app/images/no-lemon-zh-tw.png?v=20261102c"},{"s":"crowded-train","n":"捷運爆滿，我要坐","u":"https://crowded-train.nacn.app/zh-tw/","i":"https://nacn.app/images/crowded-train-zh-tw.png?v=20261102c"},{"s":"diet-diary","n":"減重日記","u":"https://diet-diary.nacn.app/zh-tw/","i":"https://nacn.app/images/diet-diary-zh-tw.png?v=20261102c"},{"s":"muscle-diary","n":"重訓日記","u":"https://muscle-diary.nacn.app/zh-tw/","i":"https://nacn.app/images/muscle-diary-zh-tw.png?v=20261102c"},{"s":"boba-diary","n":"珍奶店日記","u":"https://boba-diary.nacn.app/zh-tw/","i":"https://nacn.app/images/boba-diary-zh-tw.png?v=20261102c"},{"s":"nostalgia-diary","n":"懷舊日記","u":"https://nostalgia-diary.nacn.app/zh-tw/","i":"https://nacn.app/images/nostalgia-diary-zh-tw.png?v=20261102c"},{"s":"solo-living-diary","n":"獨居日記","u":"https://solo-living-diary.nacn.app/zh-tw/","i":"https://nacn.app/images/solo-living-diary-zh-tw.png?v=20261102c"},{"s":"newlywed-diary","n":"新婚日記","u":"https://newlywed-diary.nacn.app/zh-tw/","i":"https://nacn.app/images/newlywed-diary-zh-tw.png?v=20261102c"},{"s":"isekai-diary","n":"異世界轉生日記","u":"https://isekai-diary.nacn.app/?lang=zh-tw","i":"https://nacn.app/images/isekai-diary-zh-tw.png?v=20261102c"}],"ko":[{"s":"tsunapop","n":"츠나팝","u":"https://tsunapop.nacn.app/?lang=ko","i":"https://nacn.app/images/tsunapop-ko.png?v=20261102c"},{"s":"tsunapeaks","n":"츠나피크스","u":"https://tsunapeaks.nacn.app/?lang=ko","i":"https://nacn.app/images/tsunapeaks-ko.png?v=20261102c"},{"s":"gete-emon","n":"엽기 포차","u":"https://gete-emon.nacn.app/ko/","i":"https://nacn.app/images/gete-emon-ko.png?v=20261102c"},{"s":"busy-reception","n":"안내데스크는 오늘도 시끌벅적","u":"https://busy-reception.nacn.app/ko/","i":"https://nacn.app/images/busy-reception-ko.png?v=20261102c"},{"s":"salary-haggle","n":"연봉협상, 밀당 중","u":"https://salary-haggle.nacn.app/ko/","i":"https://nacn.app/images/salary-haggle-ko.png?v=20261102c"},{"s":"meeting-slacker","n":"부장님 몰래 딴짓 중","u":"https://meeting-slacker.nacn.app/ko/","i":"https://nacn.app/images/meeting-slacker-ko.png?v=20261102c"},{"s":"hayaben-dash","n":"몰래 도시락 대작전","u":"https://hayaben-dash.nacn.app/ko/","i":"https://nacn.app/images/hayaben-dash-ko.png?v=20261102c"},{"s":"sneak-out-at-five","n":"칼퇴 대작전","u":"https://sneak-out-at-five.nacn.app/ko/","i":"https://nacn.app/images/sneak-out-at-five-ko.png?v=20261102c"},{"s":"mebunryo","n":"눈대중","u":"https://mebunryo.nacn.app/ko/","i":"https://nacn.app/images/mebunryo-ko.png?v=20261102c"},{"s":"sunny-side-up","n":"계란 프라이, 반숙으로","u":"https://sunny-side-up.nacn.app/ko/","i":"https://nacn.app/images/sunny-side-up-ko.png?v=20261102c"},{"s":"no-lemon","n":"소스, 붓지 마세요","u":"https://no-lemon.nacn.app/ko/","i":"https://nacn.app/images/no-lemon-ko.png?v=20261102c"},{"s":"crowded-train","n":"만원 지하철, 앉겠습니다","u":"https://crowded-train.nacn.app/ko/","i":"https://nacn.app/images/crowded-train-ko.png?v=20261102c"},{"s":"diet-diary","n":"다이어트 일기","u":"https://diet-diary.nacn.app/ko/","i":"https://nacn.app/images/diet-diary-ko.png?v=20261102c"},{"s":"muscle-diary","n":"근력운동 일기","u":"https://muscle-diary.nacn.app/ko/","i":"https://nacn.app/images/muscle-diary-ko.png?v=20261102c"},{"s":"boba-diary","n":"버블티 가게 일기","u":"https://boba-diary.nacn.app/ko/","i":"https://nacn.app/images/boba-diary-ko.png?v=20261102c"},{"s":"nostalgia-diary","n":"노스탤지어 일기","u":"https://nostalgia-diary.nacn.app/ko/","i":"https://nacn.app/images/nostalgia-diary-ko.png?v=20261102c"},{"s":"solo-living-diary","n":"자취일기","u":"https://solo-living-diary.nacn.app/ko/","i":"https://nacn.app/images/solo-living-diary-ko.png?v=20261102c"},{"s":"newlywed-diary","n":"신혼일기","u":"https://newlywed-diary.nacn.app/ko/","i":"https://nacn.app/images/newlywed-diary-ko.png?v=20261102c"},{"s":"isekai-diary","n":"이세계 전생 일기","u":"https://isekai-diary.nacn.app/?lang=ko","i":"https://nacn.app/images/isekai-diary-ko.png?v=20261102c"}],"es":[{"s":"tsunapop","n":"TsunaPop","u":"https://tsunapop.nacn.app/?lang=es","i":"https://nacn.app/images/tsunapop-es.png?v=20261102c"},{"s":"tsunapeaks","n":"TsunaPeaks","u":"https://tsunapeaks.nacn.app/?lang=es","i":"https://nacn.app/images/tsunapeaks-es.png?v=20261102c"},{"s":"gete-emon","n":"¿Asco o antojo?","u":"https://gete-emon.nacn.app/es/","i":"https://nacn.app/images/gete-emon-es.png?v=20261102c"},{"s":"busy-reception","n":"Recepción de locos","u":"https://busy-reception.nacn.app/es/","i":"https://nacn.app/images/busy-reception-es.png?v=20261102c"},{"s":"salary-haggle","n":"¿Y mi aumento?","u":"https://salary-haggle.nacn.app/es/","i":"https://nacn.app/images/salary-haggle-es.png?v=20261102c"},{"s":"meeting-slacker","n":"Flojeando en la junta","u":"https://meeting-slacker.nacn.app/es/","i":"https://nacn.app/images/meeting-slacker-es.png?v=20261102c"},{"s":"hayaben-dash","n":"Lonche a escondidas","u":"https://hayaben-dash.nacn.app/es/","i":"https://nacn.app/images/hayaben-dash-es.png?v=20261102c"},{"s":"sneak-out-at-five","n":"Escápate a las 6","u":"https://sneak-out-at-five.nacn.app/es/","i":"https://nacn.app/images/sneak-out-at-five-es.png?v=20261102c"},{"s":"mebunryo","n":"A Ojo","u":"https://mebunryo.nacn.app/es/","i":"https://nacn.app/images/mebunryo-es.png?v=20261102c"},{"s":"sunny-side-up","n":"Huevo Estrellado, Tiernito","u":"https://sunny-side-up.nacn.app/es/","i":"https://nacn.app/images/sunny-side-up-es.png?v=20261102c"},{"s":"no-lemon","n":"No le pongas piña","u":"https://no-lemon.nacn.app/es/","i":"https://nacn.app/images/no-lemon-es.png?v=20261102c"},{"s":"crowded-train","n":"Metro lleno, ¡me siento!","u":"https://crowded-train.nacn.app/es/","i":"https://nacn.app/images/crowded-train-es.png?v=20261102c"},{"s":"diet-diary","n":"Diario de Dieta","u":"https://diet-diary.nacn.app/es/","i":"https://nacn.app/images/diet-diary-es.png?v=20261102c"},{"s":"muscle-diary","n":"Diario de Gimnasio","u":"https://muscle-diary.nacn.app/es/","i":"https://nacn.app/images/muscle-diary-es.png?v=20261102c"},{"s":"boba-diary","n":"Diario de Bubble Tea","u":"https://boba-diary.nacn.app/es/","i":"https://nacn.app/images/boba-diary-es.png?v=20261102c"},{"s":"nostalgia-diary","n":"Diario de Nostalgia","u":"https://nostalgia-diary.nacn.app/es/","i":"https://nacn.app/images/nostalgia-diary-es.png?v=20261102c"},{"s":"solo-living-diary","n":"Diario de vida independiente","u":"https://solo-living-diary.nacn.app/es/","i":"https://nacn.app/images/solo-living-diary-es.png?v=20261102c"},{"s":"newlywed-diary","n":"Diario de recién casados","u":"https://newlywed-diary.nacn.app/es/","i":"https://nacn.app/images/newlywed-diary-es.png?v=20261102c"},{"s":"isekai-diary","n":"Isekai Diary","u":"https://isekai-diary.nacn.app/?lang=es","i":"https://nacn.app/images/isekai-diary-es.png?v=20261102c"}],"pt-br":[{"s":"gete-emon","n":"Barraca Bizarra","u":"https://gete-emon.nacn.app/pt-br/","i":"https://nacn.app/images/gete-emon-pt-br.png?v=20261102c"},{"s":"busy-reception","n":"Recepção Sem Sossego","u":"https://busy-reception.nacn.app/pt-br/","i":"https://nacn.app/images/busy-reception-pt-br.png?v=20261102c"},{"s":"salary-haggle","n":"Cadê meu aumento?","u":"https://salary-haggle.nacn.app/pt-br/","i":"https://nacn.app/images/salary-haggle-pt-br.png?v=20261102c"},{"s":"meeting-slacker","n":"Essa reunião podia ser um e-mail","u":"https://meeting-slacker.nacn.app/pt-br/","i":"https://nacn.app/images/meeting-slacker-pt-br.png?v=20261102c"},{"s":"hayaben-dash","n":"Lanche Escondido","u":"https://hayaben-dash.nacn.app/pt-br/","i":"https://nacn.app/images/hayaben-dash-pt-br.png?v=20261102c"},{"s":"sneak-out-at-five","n":"Fuga das 18h","u":"https://sneak-out-at-five.nacn.app/pt-br/","i":"https://nacn.app/images/sneak-out-at-five-pt-br.png?v=20261102c"},{"s":"mebunryo","n":"No Olhômetro","u":"https://mebunryo.nacn.app/pt-br/","i":"https://nacn.app/images/mebunryo-pt-br.png?v=20261102c"},{"s":"sunny-side-up","n":"Ovo Frito, Gema Mole","u":"https://sunny-side-up.nacn.app/pt-br/","i":"https://nacn.app/images/sunny-side-up-pt-br.png?v=20261102c"},{"s":"no-lemon","n":"Ketchup na pizza, não!","u":"https://no-lemon.nacn.app/pt-br/","i":"https://nacn.app/images/no-lemon-pt-br.png?v=20261102c"},{"s":"crowded-train","n":"Metrô lotado, vou sentar!","u":"https://crowded-train.nacn.app/pt-br/","i":"https://nacn.app/images/crowded-train-pt-br.png?v=20261102c"},{"s":"diet-diary","n":"Diário da Dieta","u":"https://diet-diary.nacn.app/pt-br/","i":"https://nacn.app/images/diet-diary-pt-br.png?v=20261102c"},{"s":"muscle-diary","n":"Diário da Musculação","u":"https://muscle-diary.nacn.app/pt-br/","i":"https://nacn.app/images/muscle-diary-pt-br.png?v=20261102c"},{"s":"boba-diary","n":"Diário da Loja de Bubble Tea","u":"https://boba-diary.nacn.app/pt-br/","i":"https://nacn.app/images/boba-diary-pt-br.png?v=20261102c"},{"s":"nostalgia-diary","n":"Diário da Nostalgia","u":"https://nostalgia-diary.nacn.app/pt-br/","i":"https://nacn.app/images/nostalgia-diary-pt-br.png?v=20261102c"}],"id":[{"s":"gete-emon","n":"Warung Ekstrem","u":"https://gete-emon.nacn.app/id/","i":"https://nacn.app/images/gete-emon-id.png?v=20261102c"},{"s":"busy-reception","n":"Resepsionis Pusing Tujuh Keliling","u":"https://busy-reception.nacn.app/id/","i":"https://nacn.app/images/busy-reception-id.png?v=20261102c"},{"s":"salary-haggle","n":"Naik Gaji Dong, Pak!","u":"https://salary-haggle.nacn.app/id/","i":"https://nacn.app/images/salary-haggle-id.png?v=20261102c"},{"s":"meeting-slacker","n":"Rapat Sambil Mager","u":"https://meeting-slacker.nacn.app/id/","i":"https://nacn.app/images/meeting-slacker-id.png?v=20261102c"},{"s":"hayaben-dash","n":"Bekal Diam-Diam","u":"https://hayaben-dash.nacn.app/id/","i":"https://nacn.app/images/hayaben-dash-id.png?v=20261102c"},{"s":"sneak-out-at-five","n":"Pulang Tenggo","u":"https://sneak-out-at-five.nacn.app/id/","i":"https://nacn.app/images/sneak-out-at-five-id.png?v=20261102c"},{"s":"mebunryo","n":"Takaran Kira-Kira","u":"https://mebunryo.nacn.app/id/","i":"https://nacn.app/images/mebunryo-id.png?v=20261102c"},{"s":"sunny-side-up","n":"Telur Ceplok Setengah Matang","u":"https://sunny-side-up.nacn.app/id/","i":"https://nacn.app/images/sunny-side-up-id.png?v=20261102c"},{"s":"no-lemon","n":"Jangan Diaduk!","u":"https://no-lemon.nacn.app/id/","i":"https://nacn.app/images/no-lemon-id.png?v=20261102c"},{"s":"crowded-train","n":"KRL Penuh, Aku Mau Duduk","u":"https://crowded-train.nacn.app/id/","i":"https://nacn.app/images/crowded-train-id.png?v=20261102c"},{"s":"diet-diary","n":"Diari Diet","u":"https://diet-diary.nacn.app/id/","i":"https://nacn.app/images/diet-diary-id.png?v=20261102c"},{"s":"muscle-diary","n":"Diari Otot","u":"https://muscle-diary.nacn.app/id/","i":"https://nacn.app/images/muscle-diary-id.png?v=20261102c"},{"s":"boba-diary","n":"Diari Kedai Boba","u":"https://boba-diary.nacn.app/id/","i":"https://nacn.app/images/boba-diary-id.png?v=20261102c"},{"s":"nostalgia-diary","n":"Diari Nostalgia","u":"https://nostalgia-diary.nacn.app/id/","i":"https://nacn.app/images/nostalgia-diary-id.png?v=20261102c"}]};
  var SERIES = {"hentekoshoji":["busy-reception","salary-haggle","meeting-slacker","sneak-out-at-five"],"kitchen":["mebunryo","sunny-side-up","no-lemon"],"school-commute":["hayaben-dash","crowded-train","sneak-out-at-five","elevator-close"],"diary-life":["nostalgia-diary","solo-living-diary","newlywed-diary"],"diary-sim":["diet-diary","muscle-diary","boba-diary","isekai-diary"],"puzzle":["tsunapop","tsunapeaks","gete-emon"]};
  var STRINGS = {"ja":{"share":"結果をシェア","x":"𝕏 でポスト","apps":["line"],"more":"ほかのアプリ","copy":"コピー","copied":"コピーしました","best":"ベスト {n}","newBest":"ベスト更新！","streak":"{n}日連続プレイ","next":"次はこれで遊ぶ"},"en":{"share":"Share your result","x":"Post on 𝕏","apps":["whatsapp"],"more":"More…","copy":"Copy","copied":"Copied!","best":"Best {n}","newBest":"New best!","streak":"{n}-day streak","next":"Play next"},"zh-tw":{"share":"分享結果","x":"分享到 𝕏","apps":["line"],"more":"其他 App","copy":"複製","copied":"已複製","best":"最佳 {n}","newBest":"刷新紀錄！","streak":"連續 {n} 天","next":"接著玩這個"},"ko":{"share":"결과 공유","x":"𝕏에 공유","apps":[],"more":"다른 앱","copy":"복사","copied":"복사했어요","best":"최고 {n}","newBest":"최고 기록 경신!","streak":"{n}일 연속 플레이","next":"다음엔 이거"},"es":{"share":"Comparte tu resultado","x":"Publicar en 𝕏","apps":["whatsapp"],"more":"Más…","copy":"Copiar","copied":"¡Copiado!","best":"Récord {n}","newBest":"¡Nuevo récord!","streak":"{n} días seguidos","next":"Juega ahora"},"pt-br":{"share":"Compartilhe o resultado","x":"Postar no 𝕏","apps":["whatsapp"],"more":"Mais…","copy":"Copiar","copied":"Copiado!","best":"Recorde {n}","newBest":"Novo recorde!","streak":"{n} dias seguidos","next":"Jogue agora"},"id":{"share":"Bagikan hasilmu","x":"Posting ke 𝕏","apps":["whatsapp"],"more":"Lainnya…","copy":"Salin","copied":"Tersalin!","best":"Terbaik {n}","newBest":"Rekor baru!","streak":"{n} hari berturut-turut","next":"Main ini juga"}};
  var AD_CLIENT = 'ca-pub-3999397576072658';

  function langOf(lang) {
    lang = String(lang || 'en').toLowerCase();
    if (CATALOG[lang]) return lang;
    if (lang === 'zh-hk' || lang.indexOf('zh') === 0) return CATALOG['zh-tw'] ? 'zh-tw' : 'en';
    if (lang.indexOf('pt') === 0) return CATALOG['pt-br'] ? 'pt-br' : 'en';
    var base = lang.split('-')[0];
    return CATALOG[base] ? base : 'en';
  }

  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* 計測の失敗でゲームを止めない */ }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function fmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }

  // ---- 記録（ベストと連続日数）。localStorage はサブドメインごとなので、ゲームごとの記録になる ----
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dayDiff(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function record(game, score, lowerIsBetter) {
    var key = 'nacn-kit:' + game, rec = {};
    try { rec = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { rec = {}; }
    var day = today(), isBest = false;
    if (rec.day !== day) {
      rec.streak = rec.day && dayDiff(rec.day, day) === 1 ? (rec.streak || 1) + 1 : 1;
      rec.day = day;
    }
    if (typeof score === 'number' && isFinite(score)) {
      if (rec.best == null || (lowerIsBetter ? score < rec.best : score > rec.best)) { isBest = rec.best != null; rec.best = score; }
    }
    rec.plays = (rec.plays || 0) + 1;
    try { localStorage.setItem(key, JSON.stringify(rec)); } catch (e) { /* 保存できなくても表示はする */ }
    return { best: rec.best, isBest: isBest, streak: rec.streak || 1, plays: rec.plays };
  }

  // ---- 次に遊ぶゲーム（同じシリーズを先に、なければほかから。日によって入れ替わる） ----
  function pickNext(game, lang, n, exclude) {
    var list = (CATALOG[lang] || []).filter(function (g) { return !exclude || exclude.indexOf(g.s) < 0; });
    var mine = null;
    for (var s in SERIES) if (SERIES[s].indexOf(game) >= 0) mine = s;
    var others = list.filter(function (g) { return g.s !== game; });
    var seed = 0, d = today();
    for (var i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) >>> 0;
    function rotate(arr) {
      if (!arr.length) return arr;
      var k = seed % arr.length;
      return arr.slice(k).concat(arr.slice(0, k));
    }
    var same = rotate(others.filter(function (g) { return mine && SERIES[mine].indexOf(g.s) >= 0; }));
    var rest = rotate(others.filter(function (g) { return same.indexOf(g) < 0; }));
    // 1枚目は同じシリーズ、2枚目はほかのゲーム（シリーズがなければ2枚ともほかから）
    return same.slice(0, 1).concat(rest).slice(0, n);
  }

  function withUtm(url, game) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=' + encodeURIComponent(game) + '&utm_medium=next_card&utm_campaign=series_kit';
  }

  function hashtagOf(name) {
    // 名前から記号と空白を外したもの（「受付は今日も騒がしい」→ #受付は今日も騒がしい、Front Desk Frenzy → #FrontDeskFrenzy）
    // ラテン文字の単語は頭を大文字にしてつなぐ（Yum or Yuck! → #YumOrYuck）
    var s = String(name).replace(/(^|\s)([a-z])/g, function (m, sp, c) { return sp + c.toUpperCase(); });
    return '#' + s.replace(/[\s!！?？、。,.・:：'’"“”「」『』()（）&¿¡]/g, '');
  }

  // ---- 部品 ----
  function shareBox(o, L, self) {
    var url = o.url || (location.origin + '/' + (o.pathLang || o.lang) + '/');
    var tag = o.hashtag || (self ? hashtagOf(self.n) : '');
    var lines = [];
    if (self) lines.push(self.n);
    if (o.headline) lines.push(o.headline);
    if (o.detail) lines.push(o.detail);
    if (o.grid) lines.push(o.grid);
    var text = lines.join('\n') + (tag ? '\n' + tag : '');
    var box = el('div', 'nk-share');
    box.appendChild(el('p', 'nk-label', L.share));
    var row = el('div', 'nk-row');
    function link(label, href, method, cls) {
      var a = el('a', 'nk-btn ' + (cls || ''), label);
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', function () { track('share', { method: method, content_type: 'result', item_id: o.game }); });
      row.appendChild(a);
    }
    link(L.x, 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), 'x', 'nk-x');
    (L.apps || []).forEach(function (app) {
      if (app === 'line') link('LINE', 'https://line.me/R/share?text=' + encodeURIComponent(text + '\n' + url), 'line', 'nk-line');
      if (app === 'whatsapp') link('WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), 'whatsapp', 'nk-wa');
    });
    if (navigator.share) {
      var nb = el('button', 'nk-btn', L.more);
      nb.type = 'button';
      nb.addEventListener('click', function () {
        track('share', { method: 'native', content_type: 'result', item_id: o.game });
        navigator.share({ text: text, url: url }).catch(function () {});
      });
      row.appendChild(nb);
    }
    var cb = el('button', 'nk-btn', L.copy);
    cb.type = 'button';
    cb.addEventListener('click', function () {
      track('share', { method: 'copy', content_type: 'result', item_id: o.game });
      var done = function () { cb.textContent = L.copied; setTimeout(function () { cb.textContent = L.copy; }, 1600); };
      var all = text + '\n' + url;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(all).then(done, function () {});
      else {
        var ta = el('textarea'); ta.value = all; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* コピーできない環境 */ }
        document.body.removeChild(ta);
      }
    });
    row.appendChild(cb);
    box.appendChild(row);
    return box;
  }

  function statsLine(o, L, rec) {
    var parts = [];
    if (o.best !== false && rec.best != null) parts.push(rec.isBest ? L.newBest : fmt(L.best, { n: o.formatScore ? o.formatScore(rec.best) : rec.best.toLocaleString() }));
    if (rec.streak >= 2) parts.push(fmt(L.streak, { n: rec.streak }));
    if (!parts.length) return null;
    return el('p', 'nk-stats', parts.join(' ・ '));
  }

  function nextBox(o, L, lang) {
    var games = pickNext(o.game, lang, 2, o.exclude);
    if (!games.length) return null;
    var box = el('div', 'nk-next');
    box.appendChild(el('p', 'nk-label', L.next));
    var row = el('div', 'nk-cards');
    games.forEach(function (g) {
      var a = el('a', 'nk-card');
      a.href = withUtm(g.u, o.game); a.target = '_blank'; a.rel = 'noopener';
      var img = el('img'); img.src = g.i; img.alt = ''; img.loading = 'lazy'; img.width = 240; img.height = 126;
      a.appendChild(img);
      a.appendChild(el('span', 'nk-name', g.n));
      a.addEventListener('click', function () { track('select_content', { content_type: 'game', item_id: g.s, from: o.game }); });
      row.appendChild(a);
    });
    box.appendChild(row);
    return box;
  }

  function adBox(o) {
    if (!o.adSlot || location.protocol === 'file:') return null;
    var box = el('div', 'nk-ad');
    var ins = el('ins', 'adsbygoogle');
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', AD_CLIENT);
    ins.setAttribute('data-ad-slot', o.adSlot);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    box.appendChild(ins);
    setTimeout(function () { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* 広告が読めなくても結果は出す */ } }, 0);
    return box;
  }

  var styled = false;
  function style() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = ".nacn-kit{display:flex;flex-direction:column;gap:12px;margin:12px auto 0;width:100%;max-width:420px;text-align:center;font-size:14px;line-height:1.5} .nacn-kit *{box-sizing:border-box} .nacn-kit .nk-label{margin:0 0 6px;font-size:12px;opacity:.75;letter-spacing:.04em} .nacn-kit .nk-stats{margin:0;font-size:13px;opacity:.9} .nacn-kit .nk-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center} .nacn-kit .nk-btn{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:6px 12px;border-radius:999px;border:1.5px solid currentColor;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:700;text-decoration:none;cursor:pointer} .nacn-kit .nk-btn:hover{opacity:.85} .nacn-kit .nk-btn:focus-visible,.nacn-kit .nk-card:focus-visible{outline:2px solid currentColor;outline-offset:2px} .nacn-kit .nk-x{background:#000;border-color:#000;color:#fff} .nacn-kit .nk-line{background:#06c755;border-color:#06c755;color:#fff} .nacn-kit .nk-wa{background:#25d366;border-color:#25d366;color:#fff} .nacn-kit .nk-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px} .nacn-kit .nk-card{display:flex;flex-direction:column;gap:4px;padding:6px;border-radius:10px;border:1.5px solid currentColor;color:inherit;text-decoration:none;background:rgba(127,127,127,.08)} .nacn-kit .nk-card img{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;border-radius:6px;background:rgba(127,127,127,.15)} .nacn-kit .nk-name{font-size:12px;font-weight:700;line-height:1.35} .nacn-kit .nk-ad{min-height:100px}";
    document.head.appendChild(s);
  }

  function result(container, o) {
    if (!container || !o || !o.game) return null;
    style();
    var lang = langOf(o.lang || document.documentElement.lang);
    o.lang = o.lang || lang;
    var L = STRINGS[lang] || STRINGS.en;
    var self = null;
    (CATALOG[lang] || []).forEach(function (g) { if (g.s === o.game) self = g; });
    var rec = record(o.game, o.score, o.lowerIsBetter);
    container.innerHTML = '';
    var root = el('div', 'nacn-kit');
    root.setAttribute('data-kit', VERSION);
    var stats = statsLine(o, L, rec);
    if (stats) root.appendChild(stats);
    // share:false なら、シェアはゲームのものを使い、ベスト・連続日数と「次に遊ぶ」だけ出す
    if (o.share !== false) root.appendChild(shareBox(o, L, self));
    var ad = adBox(o);
    if (ad) root.appendChild(ad);
    var next = o.next === false ? null : nextBox(o, L, lang);
    if (next) root.appendChild(next);
    container.appendChild(root);
    return { record: rec, element: root };
  }

  window.NacnKit = { version: VERSION, result: result, record: record, track: track, catalog: CATALOG, strings: STRINGS };
})();
