"use strict";
// My Bouquet（花嫁の姿勢レッスン）の画面。花嫁さん側とコーチ側を1つのページで切りかえる試作
// 保存はこの端末のブラウザだけ（db.js）。同じブラウザで役割を切りかえると、相手側の画面を確かめられる

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((parseYmd(ymdOf(b)) - parseYmd(ymdOf(a))) / 864e5);
const today = () => ymdOf(new Date());
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const WD = "日月火水木金土";
// 姿勢記録シートは別に公開しているので、手元でも公開先でも同じURLを開く
const RECORD_SHEET_URL = "https://keisuke41627-collab.github.io/bridal-shisei-kiroku/";

let S = null; // 保存する状態
const ui = { role: null, tab: "home", lessonMonth: null, clientId: null, coachTab: "talk", sheet: null, draft: null, justBloomed: false };
const urlCache = new Map();

// ---------- 計算 ----------
const client = (id) => S.clients.find((c) => c.id === id);
const exById = (id) => S.exercises.find((e) => e.id === id);
const msgsOf = (c) => S.messages.filter((m) => m.clientId === c.id).sort((a, b) => a.at.localeCompare(b.at));
const dayNo = (c) => Math.min(PROGRAM_DAYS, Math.max(1, daysBetween(parseYmd(c.startDate), new Date()) + 1));
const monthOf = (c, date) => { const n = daysBetween(parseYmd(c.startDate), parseYmd(date)) + 1; return Math.min(3, Math.max(1, Math.floor((n - 1) / 30) + 1)); };
const monthNo = (c) => monthOf(c, today());
const daysToWedding = (c) => daysBetween(new Date(), parseYmd(c.weddingDate));
const doneSet = (c, date = today()) => new Set((S.done[c.id] || {})[date] || []);
const menuOn = (c, date) => c.plan[monthOf(c, date) - 1].items;
function isComplete(c, date) {
  const items = menuOn(c, date), d = doneSet(c, date);
  return items.length > 0 && items.every((i) => d.has(i.ex));
}
function bloomCount(c) {
  let n = 0;
  for (let i = 0; i < PROGRAM_DAYS; i++) {
    const d = ymdOf(addDaysTo(parseYmd(c.startDate), i));
    if (d > today()) break;
    if (isComplete(c, d)) n++;
  }
  return n;
}
const unreadFor = (c, me) => S.messages.filter((m) => m.clientId === c.id && m.from !== me && !m.read).length;
const waitingOf = (c) => S.messages.filter((m) => m.clientId === c.id && m.type === "video" && m.status === "waiting").length;

// ---------- 表示の小物 ----------
const fmtDate = (s) => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; };
const fmtTime = (iso) => { const d = new Date(iso); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const fmtSec = (t) => { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
function fmtDayLabel(iso) {
  const n = daysBetween(new Date(iso), new Date());
  if (n === 0) return "今日";
  if (n === 1) return "昨日";
  return fmtDate(ymdOf(new Date(iso)));
}
function fmtDateTime(iso) { const d = new Date(iso); return `${fmtDate(ymdOf(d))} ${fmtTime(iso)}`; }
function greet() {
  const h = new Date().getHours();
  if (h < 11) return { en: "Good morning", ja: "おはようございます" };
  if (h < 17) return { en: "Good afternoon", ja: "こんにちは" };
  return { en: "Good evening", ja: "こんばんは" };
}

const ICON = {
  home: '<path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5Z"/>',
  lesson: '<circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.6v6.8l5.2-3.4Z"/>',
  talk: '<path d="M4.5 7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v6.5A2.5 2.5 0 0 1 17 16h-6l-4.5 3.5V16a2.5 2.5 0 0 1-2-2.5Z"/>',
  ayumi: '<circle cx="12" cy="12" r="2.3"/><path d="M12 9.7C9.6 6.6 12 3.6 12 3.6s2.4 3 0 6.1Zm2.3 2.3c3.1-2.4 6.1 0 6.1 0s-3 2.4-6.1 0ZM12 14.3c2.4 3.1 0 6.1 0 6.1s-2.4-3 0-6.1ZM9.7 12c-3.1 2.4-6.1 0-6.1 0s3-2.4 6.1 0Z"/>',
  check: '<path d="m5.5 12.5 4 4 9-9"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>',
  back: '<path d="m14.5 6-6 6 6 6"/>',
  close: '<path d="M6.5 6.5l11 11m0-11-11 11"/>',
  send: '<path d="M4.5 12 19.5 5l-4 14-3.6-5.6Z"/><path d="m11.9 13.4 7.6-8.4"/>',
  video: '<rect x="3.5" y="6.5" width="12" height="11" rx="2"/><path d="m15.5 10.5 5-3v9l-5-3Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5Zm0 14A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  pin: '<path d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3.5 9h17v-3h-17Zm8.5 0v11M12 6s-1.5-3-4-2.5S7.5 6 12 6Zm0 0s1.5-3 4-2.5S16.5 6 12 6Z"/>',
};
const icon = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const monogram = () => `<span class="monogram" aria-hidden="true">K</span>`;

function exImg(e, cls = "thumb") {
  if (e.imgBlob) return `<img class="${cls}" data-blob-img="${e.imgBlob}" alt="">`;
  if (e.img) return `<img class="${cls}" src="${esc(e.img)}" alt="" loading="lazy">`;
  // 写真がない種目は、花の絵柄と部位の札にする（運動の写真は勤務先が写るため使わない）
  const k = [...e.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return `<div class="${cls} ex-ph tone-${k % 3}" aria-hidden="true">${miniFlower(BOUQUET_COLORS[k % 4])}${cls === "thumb" ? "" : `<span>${esc(e.part)}</span>`}</div>`;
}
// 動画。デモのデータは動画が無いので、写真と「サンプル」の札を出す
function media(blobId, poster, key) {
  if (blobId) return `<video class="media" data-blob="${blobId}" data-key="${key}" controls playsinline preload="metadata"></video>`;
  return `<div class="media sample" data-key="${key}"><img src="${esc(poster || "img/hands.jpg")}" alt=""><span>サンプルのため動画はありません</span></div>`;
}
// YouTube の URL から動画IDを取り出す（watch?v= ／ youtu.be ／ shorts ／ embed ／ live）
function ytId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
// 限定公開の動画も再生できる。ショート動画は縦長の枠にする
function ytPlayer(url) {
  const id = ytId(url);
  if (!id) return "";
  return `<div class="yt ${/shorts\//.test(url) ? "tall" : ""}"><iframe src="https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0" title="YouTube の動画" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
}
const hasVideo = (e) => !!(e.videoBlob || ytId(e.youtube));
function exMedia(e) {
  if (e.videoBlob) return media(e.videoBlob, "", "ex-" + e.id);
  if (ytId(e.youtube)) return ytPlayer(e.youtube);
  return exImg(e, "sheet-img");
}

// ---------- 入口 ----------
function viewWelcome() {
  return `
  <div class="welcome">
    <img class="welcome-img" src="img/bouquet-tall.jpg" alt="白いブーケを持つ花嫁">
    <div class="welcome-body">
      <span class="eyebrow">Bridal Posture Lesson</span>
      <h1 class="logo">My Bouquet</h1>
      <p class="welcome-copy">挙式の日まで、毎日ひと花ずつ。<br>3か月で、あなただけのブーケを。</p>
      <div class="welcome-actions">
        <button class="btn" data-action="choose-role" data-role="bride">花嫁さんの画面を見る</button>
        <button class="btn sub" data-action="choose-role" data-role="coach">コーチの画面を見る</button>
      </div>
      <p class="note">試作版です。データはこの端末のブラウザにだけ保存され、どこにも送られません。役割は画面右上からいつでも切りかえられます。${DB.persistent() ? "" : "<br><b>このブラウザでは保存ができないため、ページを閉じると元に戻ります。</b>"}</p>
    </div>
  </div>`;
}

function topbar(sub) {
  return `<header class="topbar">
    <span class="brand">My Bouquet${sub ? `<small>${sub}</small>` : ""}</span>
    <button class="chip-btn" data-action="switch-role">${ui.role === "bride" ? "コーチ側へ" : "花嫁さん側へ"}</button>
  </header>`;
}

// ---------- 花嫁さん側 ----------
const me = () => S.clients[0]; // 試作では1人目の花嫁さんとして入る

function viewBride() {
  const c = me();
  const unread = unreadFor(c, "client");
  const tabs = [["home", "ホーム"], ["lesson", "レッスン"], ["talk", "トーク"], ["ayumi", "あゆみ"]];
  const body = { home: brideHome, lesson: brideLesson, talk: brideTalk, ayumi: (x) => viewAyumi(x, false) }[ui.tab](c);
  return `${topbar()}
  <main class="bride tab-${ui.tab}">${body}</main>
  <nav class="tabbar" aria-label="メニュー">
    ${tabs.map(([k, l]) => `<button data-action="tab" data-tab="${k}" ${ui.tab === k ? 'aria-current="page"' : ""}>${icon(k)}<span>${l}</span>${k === "talk" && unread ? `<i class="dot">${unread}</i>` : ""}</button>`).join("")}
  </nav>
  ${ui.sheet ? viewSheet() : ""}`;
}

function brideHome(c) {
  const g = greet(), dn = dayNo(c), ph = PHASES[monthNo(c) - 1], left = daysToWedding(c), bloom = bloomCount(c);
  const items = menuOn(c, today()), ds = doneSet(c), doneN = items.filter((i) => ds.has(i.ex)).length;
  const complete = doneN === items.length && items.length > 0;
  const lastCoach = msgsOf(c).filter((m) => m.from === "coach").pop();
  const unread = unreadFor(c, "client");
  const pct = ((dn - 1) / (PROGRAM_DAYS - 1)) * 100;
  return `
  <section class="hero">
    <img class="hero-img" src="img/chapel.jpg" alt="">
    <div class="hero-text">
      <span class="eyebrow">${g.en}</span>
      <h1>${esc(c.name)}さん、${g.ja}</h1>
      <p class="hero-sub">Day <b>${dn}</b> / ${PROGRAM_DAYS}<span class="sep"></span>${ph.month}か月目「${ph.name}」</p>
    </div>
  </section>
  <div class="wrap">
    <section class="card countdown">
      <span class="en">Until the day</span>
      <p class="cd-num"><span>挙式まで あと</span><b>${left}</b><span>日</span></p>
      <p class="small center">${fmtDate(c.weddingDate)}</p>
      <div class="journey" aria-label="3か月のうち ${dn}日目">
        <div class="journey-line"><i style="width:${pct.toFixed(1)}%"></i><span class="journey-me" style="left:${pct.toFixed(1)}%"></span></div>
        <div class="journey-marks">${PHASES.map((p) => `<span class="${monthNo(c) === p.month ? "on" : ""}"><em>${p.en}</em>${p.name}</span>`).join("")}</div>
      </div>
    </section>

    <section class="card today">
      <div class="card-head">
        <div><span class="en">Today's lesson</span><h2 class="sec-title">今日のメニュー</h2></div>
        <span class="count-pill ${complete ? "full" : ""}">${doneN} / ${items.length}</span>
      </div>
      <ul class="menu">${items.map((it) => menuRow(it, ds)).join("")}</ul>
      ${complete
        ? `<p class="bloomed">${miniFlower()}<span>今日のひと花が咲きました。おつかれさまでした</span></p>`
        : `<p class="small">すべてできたら、ブーケに今日の1輪が咲きます。左の丸をタップして記録します。</p>`}
    </section>

    <section class="card bouquet-card">
      <span class="en center">Your bouquet</span>
      <h2 class="sec-title center">あなたのブーケ</h2>
      ${bouquetSVG(PROGRAM_DAYS, bloom, { newest: ui.justBloomed })}
      <p class="bq-count"><b>${bloom}</b>輪<span> / ${PROGRAM_DAYS}輪</span></p>
      <p class="small center">メニューをやりきった日ごとに1輪。<br>3か月かけて、あなただけのブーケを咲かせましょう。</p>
    </section>

    ${lastCoach ? `
    <section class="card coach-note">
      <div class="coach-line">${monogram()}<div><b>小宮コーチ</b><span class="small">${fmtDayLabel(lastCoach.at)} ${fmtTime(lastCoach.at)}</span></div></div>
      <p class="quote">${lastCoach.type === "review" ? "添削が届いています。" : nl2br(lastCoach.text)}</p>
      <button class="btn sub" data-action="tab" data-tab="talk">トークをひらく${unread ? `<i class="dot inline">${unread}</i>` : ""}</button>
    </section>` : ""}

    ${c.nextSession ? `
    <section class="card next">
      ${icon("video", "lg")}
      <div><span class="en">Next online lesson</span><p><b>${fmtDateTime(c.nextSession)}</b></p><p class="small">次のオンラインレッスン（一緒に体を動かします）</p></div>
    </section>` : ""}
  </div>`;
}

function menuRow(it, ds) {
  const e = exById(it.ex); if (!e) return "";
  const done = ds.has(e.id);
  return `<li class="menu-row ${done ? "is-done" : ""}">
    <button class="check" data-action="toggle-done" data-ex="${e.id}" aria-pressed="${done}" aria-label="${esc(e.name)}を${done ? "まだにもどす" : "できたにする"}">${icon("check")}</button>
    <button class="menu-main" data-action="open-ex" data-ex="${e.id}">
      ${exImg(e)}
      <span class="menu-text"><b>${esc(e.name)}</b><span>${esc(it.reps)}・${esc(it.sets)}</span></span>
      ${icon("chev", "muted")}
    </button>
  </li>`;
}

function brideLesson(c) {
  const cur = monthNo(c), m = ui.lessonMonth || cur, ph = PHASES[m - 1];
  const start = addDaysTo(parseYmd(c.startDate), (m - 1) * 30), end = addDaysTo(start, 29);
  const items = c.plan[m - 1].items;
  return `<div class="wrap">
    <header class="page-head"><span class="en">Lesson</span><h1 class="page-title">レッスン</h1></header>
    <div class="seg" role="tablist" aria-label="月">
      ${PHASES.map((p) => `<button role="tab" data-action="lesson-month" data-m="${p.month}" aria-selected="${p.month === m}">${p.month}か月目${p.month === cur ? '<i class="now">いま</i>' : ""}</button>`).join("")}
    </div>
    <section class="phase">
      <span class="en">${ph.en}</span>
      <h2>${ph.month}か月目「${ph.name}」</h2>
      <p>${esc(ph.note)}</p>
      <p class="small">Day ${(m - 1) * 30 + 1}〜${m * 30}（${fmtDate(ymdOf(start))}〜${fmtDate(ymdOf(end))}）</p>
    </section>
    ${m > cur ? `<p class="note center">この月のメニューは、Day ${(m - 1) * 30 + 1} から始まります。コーチがあなたの様子を見て調整します。</p>` : ""}
    <div class="ex-list">
      ${items.map((it) => { const e = exById(it.ex); return e ? `
        <button class="ex-card" data-action="open-ex" data-ex="${e.id}">
          ${exImg(e, "ex-img")}${hasVideo(e) ? `<span class="has-video">${icon("lesson")}動画</span>` : ""}
          <span class="ex-body">
            <span class="en">${esc(e.part)}</span>
            <b>${esc(e.name)}</b>
            <span class="small">${esc(e.aim)}</span>
            <span class="chips"><i>${esc(it.reps)}</i><i>${esc(it.sets)}</i><i>${esc(e.freq)}</i></span>
          </span>
        </button>` : ""; }).join("")}
    </div>
  </div>`;
}

function brideTalk(c) {
  return `<div class="talk">
    <div class="talk-head">${monogram()}<div><b>小宮コーチ</b><span class="small">毎日お返事します。フォームの動画は、翌日までに動画つきで添削してお返しします。</span></div></div>
    ${chatHTML(c, "client")}
    ${composer()}
  </div>`;
}

function composer() {
  return `<form class="composer" data-form="send">
    <label class="attach" title="動画を送る">${icon("video")}<span class="sr">動画を送る</span><input type="file" accept="video/*" data-change="attach-video" hidden></label>
    <textarea name="text" rows="1" placeholder="メッセージを入力" aria-label="メッセージ"></textarea>
    <button class="send" type="submit" aria-label="送る">${icon("send")}</button>
  </form>`;
}

function chatHTML(c, who) {
  let last = "", out = "";
  for (const m of msgsOf(c)) {
    const d = ymdOf(new Date(m.at));
    if (d !== last) { out += `<p class="day-sep"><span>${fmtDayLabel(m.at)}</span></p>`; last = d; }
    out += bubble(m, who);
  }
  return `<div class="chat">${out || '<p class="note center">まだメッセージはありません</p>'}</div>`;
}

function bubble(m, who) {
  const side = m.from === who ? "mine" : "theirs";
  const time = `<time>${fmtTime(m.at)}${side === "mine" && m.read ? "<i>既読</i>" : ""}</time>`;
  if (m.type === "text") {
    // YouTube の URL が入っていたら、その下で再生できるようにする
    const yt = ytPlayer((m.text.match(/https?:\/\/\S+/g) || []).find(ytId));
    return `<div class="msg ${side} ${yt ? "wide" : ""}"><div class="bubble ${yt ? "video-bubble" : ""}">${nl2br(m.text)}${yt}</div>${time}</div>`;
  }
  const e = exById(m.exId);
  if (m.type === "video") {
    const status = m.status === "waiting" ? '<span class="tag wait">添削待ち</span>' : '<span class="tag ok">添削済み</span>';
    const act = who === "coach" && m.status === "waiting" ? `<button class="btn small-btn" data-action="open-review" data-id="${m.id}">添削する</button>` : "";
    return `<div class="msg ${side} wide"><div class="bubble video-bubble">
      <p class="vb-head">${icon("video")}<b>${e ? esc(e.name) : "動画"}</b>${status}</p>
      ${media(m.blobId, e && e.img, m.id)}
      ${m.text ? `<p>${nl2br(m.text)}</p>` : ""}${act}
    </div>${time}</div>`;
  }
  if (m.type === "review") {
    const src = S.messages.find((x) => x.id === m.reviewOf);
    const key = "rv-" + m.id;
    return `<div class="msg ${side} wide"><article class="review">
      <header><span class="en">Form review</span><b>添削が届きました</b><span class="small">${e ? esc(e.name) : ""}</span></header>
      ${media(src && src.blobId, e && e.img, key)}
      ${(m.comments || []).length ? `<ol class="marks">${m.comments.map((k) => `<li><button data-action="seek" data-key="${key}" data-t="${k.t}"><span class="ts">${icon("pin")}${fmtSec(k.t)}</span><span>${esc(k.text)}</span></button></li>`).join("")}</ol>` : ""}
      ${m.text ? `<p class="review-text">${nl2br(m.text)}</p>` : ""}
      ${m.replyBlobId || ytId(m.replyYoutube) ? `<p class="en">Coach's example</p><p class="small">小宮コーチのお手本</p>${m.replyBlobId ? media(m.replyBlobId, "", "rp-" + m.id) : ytPlayer(m.replyYoutube)}` : ""}
    </article>${time}</div>`;
  }
  return "";
}

function viewAyumi(c, coachMode) {
  const dn = dayNo(c), bloom = bloomCount(c);
  const start = parseYmd(c.startDate);
  let cells = "";
  for (let i = 0; i < PROGRAM_DAYS; i++) {
    const d = ymdOf(addDaysTo(start, i)), n = i + 1;
    let cls = "future", inner = "";
    if (d <= today()) {
      if (isComplete(c, d)) { cls = "bloom"; inner = miniFlower(BOUQUET_COLORS[(n * 7) % 4]); }
      else cls = d === today() ? "today" : "miss";
    }
    if (d === today()) cls += " is-today";
    if (n % 30 === 1) cls += " month-start";
    cells += `<span class="cal ${cls}" title="Day ${n}（${fmtDate(d)}）">${inner}</span>`;
  }
  return `<div class="wrap">
    ${coachMode ? "" : `<header class="page-head"><span class="en">Your journey</span><h1 class="page-title">あゆみ</h1></header>`}
    <section class="card">
      <span class="en">My goals</span><h2 class="sec-title">3か月で叶えたいこと</h2>
      <ul class="goals">${c.goals.map((g) => `<li>${miniFlower(BOUQUET_COLORS[1])}<span>${esc(g)}</span></li>`).join("")}</ul>
    </section>
    <section class="card">
      <div class="card-head"><div><span class="en">90 days</span><h2 class="sec-title">咲いた日</h2></div><span class="count-pill">${bloom}輪</span></div>
      <div class="calendar" aria-label="90日のうち ${bloom}日 メニューをやりきりました">${cells}</div>
      <p class="legend"><span><i class="cal bloom">${miniFlower()}</i>やりきった日</span><span><i class="cal miss"></i>お休みした日</span><span><i class="cal future"></i>これから</span></p>
    </section>
    <section class="card">
      <span class="en">Gifts</span><h2 class="sec-title">1か月ごとの贈りもの</h2>
      <ul class="gifts">${GIFTS.map((g) => {
        const open = dn >= g.day;
        return `<li class="${open ? "open" : ""}">${icon("gift", "lg")}<div><span class="en">${g.en}</span><b>${g.name}</b><span class="small">${g.note}</span><span class="when">${open ? "お届けしました" : `Day ${g.day} にお届け（あと${g.day - dn}日）`}</span></div></li>`;
      }).join("")}</ul>
    </section>
    <a class="card record-link" href="${RECORD_SHEET_URL}" target="_blank" rel="noopener">
      <img src="img/hands.jpg" alt="">
      <div><span class="en">Posture note</span><b>花嫁の姿勢記録シート</b><span class="small">月に一度、立ち姿を前回の自分とくらべます</span></div>
      ${icon("chev", "muted")}
    </a>
  </div>`;
}

// ---------- 下から出るシート ----------
function viewSheet() {
  const s = ui.sheet;
  if (s.type === "exercise") return sheetExercise(exById(s.id));
  if (s.type === "review") return sheetReview(S.messages.find((m) => m.id === s.id));
  return "";
}

function sheetExercise(e) {
  if (!e) return "";
  const c = ui.role === "bride" ? me() : null;
  const it = c ? c.plan[monthNo(c) - 1].items.find((i) => i.ex === e.id) : null;
  const done = c ? doneSet(c).has(e.id) : false;
  return `<div class="sheet-back" data-action="close-sheet"></div>
  <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(e.name)}">
    <button class="sheet-close" data-action="close-sheet" aria-label="とじる">${icon("close")}</button>
    ${exMedia(e)}
    <div class="sheet-body">
      <span class="en">${esc(e.part)}</span>
      <h2 class="sheet-title">${esc(e.name)}</h2>
      <p class="aim">${esc(e.aim)}</p>
      ${c && !hasVideo(e) ? '<p class="note">お手本動画は準備中です。いまは写真とやり方を見ながら行ってください。</p>' : ""}
      <p class="chips big"><i>${esc(it ? it.reps : e.reps)}</i><i>${esc(it ? it.sets : e.sets)}</i><i>${esc(e.freq)}</i></p>
      <h3>やり方</h3>
      <ol class="how">${e.how.map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
      ${e.points.length ? `<h3>ポイント</h3><ul class="points">${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      <p class="caution">痛みやしびれが出たら中止して、トークで教えてください。</p>
      ${c ? `<div class="sheet-actions">
        ${it ? `<button class="btn ${done ? "sub" : ""}" data-action="toggle-done" data-ex="${e.id}">${done ? "できた（取り消す）" : "今日できた"}</button>` : ""}
        <label class="btn sub">${icon("video")}フォームを撮って送る<input type="file" accept="video/*" data-change="form-video" data-ex="${e.id}" hidden></label>
        <p class="note">送った動画は、小宮コーチが翌日までに添削してお返しします。</p>
      </div>` : `<div class="sheet-actions">
        <h3>お手本動画</h3>
        <label class="field">YouTube の URL<input type="url" id="yt-url" value="${esc(e.youtube || "")}" placeholder="https://youtu.be/…" inputmode="url"></label>
        <button class="btn" data-action="save-yt" data-ex="${e.id}">YouTube の動画を登録する</button>
        <p class="note">YouTube に「限定公開」で上げた動画の URL を貼ります（URL を知っている人だけが見られる設定。「非公開」だと再生できません）。</p>
        <label class="btn sub">${icon("video")}${e.videoBlob ? "撮った動画を差しかえる" : "スマホの動画を直接登録する"}<input type="file" accept="video/*" data-change="ex-video" data-ex="${e.id}" hidden></label>
        ${e.sample ? '<p class="note">この種目は写真に合わせたサンプルです。名前・回数・やり方は差しかえてください。</p>' : ""}
      </div>`}
    </div>
  </section>`;
}

function sheetReview(m) {
  if (!m) return "";
  const e = exById(m.exId), c = client(m.clientId), d = ui.draft;
  return `<div class="sheet-back" data-action="close-sheet"></div>
  <section class="sheet wide-sheet" role="dialog" aria-modal="true" aria-label="フォームの添削">
    <button class="sheet-close" data-action="close-sheet" aria-label="とじる">${icon("close")}</button>
    <div class="sheet-body">
      <span class="en">Form review</span>
      <h2 class="sheet-title">${e ? esc(e.name) : "フォームの動画"}</h2>
      <p class="small">${esc(c.name)}さんから ${fmtDateTime(m.at)} に届きました</p>
      ${m.text ? `<p class="quote">${nl2br(m.text)}</p>` : ""}
    </div>
    ${media(m.blobId, e && e.img, "rv-src")}
    <div class="sheet-body">
      <h3>動画にコメントをつける</h3>
      <p class="small">動画を止めたところで書いて「追加」を押すと、その時間にコメントがつきます。花嫁さんがタップすると、その場面から再生されます。</p>
      <div class="mark-add">
        <input id="rv-mark" type="text" placeholder="例：骨盤がいっしょに回っています" aria-label="この時間へのコメント">
        <button class="btn small-btn" data-action="add-mark"><span id="rv-now">${fmtSec(0)}</span> に追加</button>
      </div>
      <ol class="marks" id="rv-marks">${marksDraft(d)}</ol>
      <h3>ひとこと</h3>
      <textarea id="rv-text" rows="3" placeholder="例：よく撮れています！明日はここを意識してみましょう">${esc(d.text)}</textarea>
      <label class="field">お手本の YouTube（任意）<input type="url" id="rv-yt" placeholder="https://youtu.be/…" inputmode="url"></label>
      <label class="btn sub">${icon("video")}<span id="rv-file">${d.replyName ? esc(d.replyName) : "お手本の動画を添える（任意）"}</span><input type="file" accept="video/*" data-change="rv-video" hidden></label>
      <button class="btn" data-action="send-review">添削を送る</button>
    </div>
  </section>`;
}
function marksDraft(d) {
  return d.comments.map((k, i) => `<li><span class="ts">${icon("pin")}${fmtSec(k.t)}</span><span>${esc(k.text)}</span><button class="x" data-action="rm-mark" data-i="${i}" aria-label="消す">${icon("close")}</button></li>`).join("");
}

// ---------- コーチ側 ----------
function viewCoach() {
  const sel = ui.clientId ? client(ui.clientId) : null;
  const lib = !sel && ui.coachTab === "library";
  const main = sel ? coachClient(sel) : lib ? coachLibrary() : `<div class="empty-main">${icon("ayumi", "xl")}<p>左から花嫁さんを選んでください</p></div>`;
  return `${topbar("Coach")}
  <div class="coach ${sel || lib ? "has-main" : ""}">
    <aside class="coach-list">
      <div class="list-head"><span class="en">Brides</span><h2 class="sec-title">花嫁さん</h2></div>
      ${S.clients.map(clientCard).join("")}
      <button class="lib-btn ${lib ? "on" : ""}" data-action="open-library">${icon("book")}運動ライブラリ<span class="small">${S.exercises.length}種目</span></button>
      <button class="link-btn" data-action="reset-demo">デモのデータを最初に戻す</button>
    </aside>
    <main class="coach-main">${main}</main>
  </div>
  ${ui.sheet ? viewSheet() : ""}`;
}

function clientCard(c) {
  const items = menuOn(c, today()), ds = doneSet(c), n = items.filter((i) => ds.has(i.ex)).length;
  const un = unreadFor(c, "coach"), wait = waitingOf(c);
  return `<button class="client-card ${ui.clientId === c.id ? "on" : ""}" data-action="open-client" data-id="${c.id}">
    <span class="cc-name"><b>${esc(c.fullName)}</b>さん</span>
    <span class="small">挙式まであと${daysToWedding(c)}日・Day ${dayNo(c)}</span>
    <span class="cc-tags">
      <i class="${n === items.length ? "ok" : ""}">今日 ${n}/${items.length}</i>
      ${wait ? `<i class="wait">添削待ち ${wait}</i>` : ""}
      ${un ? `<i class="new">未読 ${un}</i>` : ""}
    </span>
  </button>`;
}

function coachClient(c) {
  const tabs = [["talk", "トーク"], ["menu", "メニュー"], ["ayumi", "あゆみ"]];
  const body = ui.coachTab === "menu" ? menuEditor(c) : ui.coachTab === "ayumi" ? viewAyumi(c, true) : `<div class="talk coach-talk">${chatHTML(c, "coach")}${composer()}</div>`;
  return `<div class="client-head">
      <button class="back" data-action="back-list" aria-label="一覧へ">${icon("back")}</button>
      <div><span class="en">${fmtDate(c.weddingDate)} wedding</span><h2>${esc(c.fullName)}さん</h2>
      <p class="small">挙式まであと${daysToWedding(c)}日・Day ${dayNo(c)}・${monthNo(c)}か月目「${PHASES[monthNo(c) - 1].name}」・${bloomCount(c)}輪</p></div>
    </div>
    <div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-action="coach-tab" data-t="${k}" aria-selected="${ui.coachTab === k}">${l}${k === "talk" && waitingOf(c) ? `<i class="now">${waitingOf(c)}</i>` : ""}</button>`).join("")}</div>
    ${body}`;
}

function menuEditor(c) {
  const cur = monthNo(c);
  return `<div class="wrap">
    <p class="note">月ごとのメニューです。月が変わると、花嫁さんの「今日のメニュー」が自動で切りかわります。回数を書きかえると、すぐ花嫁さん側に反映されます。</p>
    ${PHASES.map((p, k) => {
      const used = new Set(c.plan[k].items.map((i) => i.ex));
      const options = S.exercises.filter((e) => !used.has(e.id));
      return `<section class="card">
        <div class="card-head"><div><span class="en">${p.en}</span><h2 class="sec-title">${p.month}か月目「${p.name}」</h2></div>${p.month === cur ? '<span class="count-pill full">いま</span>' : `<span class="small">Day ${k * 30 + 1}〜</span>`}</div>
        <ul class="edit-list">${c.plan[k].items.map((it, i) => { const e = exById(it.ex); return e ? `
          <li>${exImg(e)}
            <div class="edit-main"><b>${esc(e.name)}</b>
              <div class="edit-inputs">
                <input value="${esc(it.reps)}" data-change="item-field" data-k="${k}" data-i="${i}" data-f="reps" aria-label="${esc(e.name)}の回数">
                <input value="${esc(it.sets)}" data-change="item-field" data-k="${k}" data-i="${i}" data-f="sets" aria-label="${esc(e.name)}のセット数">
              </div>
            </div>
            <button class="x" data-action="rm-item" data-k="${k}" data-i="${i}" aria-label="${esc(e.name)}を外す">${icon("close")}</button>
          </li>` : ""; }).join("")}</ul>
        ${options.length ? `<div class="add-row"><select id="add-${k}" aria-label="追加する種目">${options.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select><button class="btn small-btn" data-action="add-item" data-k="${k}">${icon("plus")}追加</button></div>` : ""}
      </section>`;
    }).join("")}
  </div>`;
}

function coachLibrary() {
  return `<div class="wrap">
    <header class="page-head"><span class="en">Library</span><h1 class="page-title">運動ライブラリ</h1>
    <p class="small">ここに登録した種目を、花嫁さんごとの月のメニューに入れます。お手本動画は種目をひらいて登録します。</p></header>
    <div class="lib-grid">${S.exercises.map((e) => `
      <button class="lib-card" data-action="open-ex" data-ex="${e.id}">${exImg(e, "ex-img")}
        <span class="ex-body"><span class="en">${esc(e.part)}</span><b>${esc(e.name)}</b>
        <span class="chips"><i>${esc(e.reps)}</i>${hasVideo(e) ? "<i class='ok'>動画あり</i>" : "<i>動画なし</i>"}${e.sample ? "<i>サンプル</i>" : ""}</span></span>
      </button>`).join("")}</div>
    <form class="card add-ex" data-form="add-ex">
      <span class="en">New exercise</span><h2 class="sec-title">種目を追加する</h2>
      <label>種目の名前<input name="name" required placeholder="例：壁で背中のばし"></label>
      <label>部位<input name="part" placeholder="例：背中・胸"></label>
      <label>ねらい<input name="aim" placeholder="例：ドレスの背中をすっきり見せる"></label>
      <div class="three"><label>回数<input name="reps" placeholder="10回"></label><label>セット<input name="sets" placeholder="2セット"></label><label>頻度<input name="freq" placeholder="毎日"></label></div>
      <label>やり方（1行に1つ）<textarea name="how" rows="3"></textarea></label>
      <label>ポイント（1行に1つ）<textarea name="points" rows="2"></textarea></label>
      <label>写真<input type="file" name="img" accept="image/*"></label>
      <label>お手本の YouTube（限定公開の URL）<input type="url" name="youtube" placeholder="https://youtu.be/…"></label>
      <label>または、スマホの動画<input type="file" name="video" accept="video/*"></label>
      <button class="btn" type="submit">ライブラリに追加</button>
    </form>
  </div>`;
}

// ---------- 描画 ----------
function render() {
  const app = $("#app");
  // トークを開いている間に届いた・送ったものは既読にする
  const viewing = ui.role === "bride" && ui.tab === "talk" ? [me(), "client"]
    : ui.role === "coach" && ui.clientId && ui.coachTab === "talk" ? [client(ui.clientId), "coach"] : null;
  if (viewing && S.messages.some((m) => m.clientId === viewing[0].id && m.from !== viewing[1] && !m.read)) {
    markRead(...viewing); save();
  }
  if (!ui.role) app.innerHTML = viewWelcome();
  else app.innerHTML = ui.role === "bride" ? viewBride() : viewCoach();
  document.body.className = ui.role ? `role-${ui.role}` : "role-none";
  document.body.style.overflow = ui.sheet ? "hidden" : "";
  hydrate(app);
  ui.justBloomed = false;
}

async function blobUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await DB.getBlob(id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urlCache.set(id, u);
  return u;
}
function hydrate(root) {
  // iPhone の Safari は blob の URL に #t= をつけると再生できないことがあるので、そのまま渡す
  root.querySelectorAll("video[data-blob]").forEach(async (v) => { const u = await blobUrl(v.dataset.blob); if (u) v.src = u; });
  root.querySelectorAll("img[data-blob-img]").forEach(async (im) => { const u = await blobUrl(im.dataset.blobImg); if (u) im.src = u; });
  const src = root.querySelector('video[data-key="rv-src"]');
  if (src) src.addEventListener("timeupdate", () => { const n = $("#rv-now"); if (n) n.textContent = fmtSec(src.currentTime); });
}
function scrollChatEnd() {
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));
}
function toast(text) {
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.innerHTML = `${miniFlower()}<span>${esc(text)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3200);
}
async function save() { await DB.setState(S); }
function markRead(c, who) { S.messages.forEach((m) => { if (m.clientId === c.id && m.from !== who) m.read = true; }); }

// ---------- 操作 ----------
const actions = {
  "choose-role": (el) => {
    ui.role = el.dataset.role; ui.tab = "home"; ui.clientId = null; ui.coachTab = "talk";
    try { localStorage.setItem("bridal-role", ui.role); } catch (e) { /* 保存できなくても動く */ }
    window.scrollTo(0, 0);
  },
  "switch-role": () => {
    ui.role = ui.role === "bride" ? "coach" : "bride"; ui.sheet = null; ui.tab = "home"; ui.clientId = null; ui.coachTab = "talk";
    try { localStorage.setItem("bridal-role", ui.role); } catch (e) { /* 同上 */ }
    window.scrollTo(0, 0);
  },
  tab: (el) => {
    ui.tab = el.dataset.tab; ui.sheet = null; ui.lessonMonth = null;
    if (ui.tab === "talk") { render(); scrollChatEnd(); return false; }
    window.scrollTo(0, 0);
  },
  "toggle-done": async (el) => {
    const c = me(), d = today(), ex = el.dataset.ex;
    S.done[c.id] = S.done[c.id] || {};
    const set = new Set(S.done[c.id][d] || []);
    const before = isComplete(c, d);
    set.has(ex) ? set.delete(ex) : set.add(ex);
    S.done[c.id][d] = [...set];
    await save();
    if (!before && isComplete(c, d)) {
      ui.justBloomed = true; ui.sheet = null; ui.tab = "home";
      render(); toast("今日のひと花が咲きました");
      const bq = $(".bouquet-card");
      if (bq) bq.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
  },
  "open-ex": (el) => { ui.sheet = { type: "exercise", id: el.dataset.ex }; },
  "close-sheet": () => { ui.sheet = null; ui.draft = null; },
  "lesson-month": (el) => { ui.lessonMonth = Number(el.dataset.m); },
  seek: (el) => {
    const v = document.querySelector(`video[data-key="${el.dataset.key}"]`);
    el.closest(".marks").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === el));
    if (v) { v.currentTime = Number(el.dataset.t); v.play().catch(() => {}); }
    return false;
  },
  "open-client": (el) => {
    ui.clientId = el.dataset.id; ui.coachTab = "talk";
    render(); scrollChatEnd(); return false;
  },
  "back-list": () => { ui.clientId = null; window.scrollTo(0, 0); },
  "coach-tab": async (el) => {
    ui.coachTab = el.dataset.t;
    if (ui.coachTab === "talk") { render(); scrollChatEnd(); return false; }
  },
  "open-library": () => { ui.clientId = null; ui.coachTab = "library"; window.scrollTo(0, 0); },
  "open-review": (el) => { ui.sheet = { type: "review", id: el.dataset.id }; ui.draft = { comments: [], text: "", reply: null, replyName: "" }; },
  "add-mark": () => {
    const input = $("#rv-mark"), text = input.value.trim();
    if (!text) { input.focus(); return false; }
    const v = document.querySelector('video[data-key="rv-src"]');
    ui.draft.comments.push({ t: v ? Math.round(v.currentTime * 10) / 10 : 0, text });
    ui.draft.comments.sort((a, b) => a.t - b.t);
    input.value = "";
    $("#rv-marks").innerHTML = marksDraft(ui.draft);
    return false;
  },
  "rm-mark": (el) => { ui.draft.comments.splice(Number(el.dataset.i), 1); $("#rv-marks").innerHTML = marksDraft(ui.draft); return false; },
  "send-review": async () => {
    const d = ui.draft, src = S.messages.find((m) => m.id === ui.sheet.id);
    d.text = $("#rv-text").value.trim();
    const yt = $("#rv-yt").value.trim();
    if (yt && !ytId(yt)) { toast("YouTube の URL を確かめてください"); return false; }
    if (!d.text && !d.comments.length && !d.reply && !yt) { toast("コメントかひとことを入れてください"); return false; }
    let replyBlobId = null;
    if (d.reply) { replyBlobId = uid("b"); await DB.putBlob(replyBlobId, d.reply); }
    S.messages.push({ id: uid("m"), clientId: src.clientId, from: "coach", type: "review", reviewOf: src.id, exId: src.exId,
      at: new Date().toISOString(), read: false, text: d.text, comments: d.comments, replyBlobId, replyYoutube: yt || null });
    src.status = "done";
    await save();
    ui.sheet = null; ui.draft = null;
    render(); scrollChatEnd(); toast("添削を送りました");
    return false;
  },
  "save-yt": async (el) => {
    const e = exById(el.dataset.ex), url = $("#yt-url").value.trim();
    if (url && !ytId(url)) { toast("YouTube の URL を確かめてください"); return false; }
    e.youtube = url || null;
    if (url) e.videoBlob = null; // YouTube を優先する（撮った動画は使わない）
    await save();
    toast(url ? "お手本動画を登録しました" : "お手本動画を外しました");
  },
  "add-item": async (el) => {
    const c = client(ui.clientId), k = Number(el.dataset.k), e = exById($(`#add-${k}`).value);
    c.plan[k].items.push({ ex: e.id, reps: e.reps, sets: e.sets });
    await save();
  },
  "rm-item": async (el) => {
    const c = client(ui.clientId);
    c.plan[Number(el.dataset.k)].items.splice(Number(el.dataset.i), 1);
    await save();
  },
  "reset-demo": async () => {
    if (!confirm("この端末に保存したデモのデータ（メッセージ・動画・記録）を消して、最初の状態に戻します。よろしいですか？")) return false;
    await DB.clear(); urlCache.clear();
    S = seedState(); await save();
    ui.clientId = null; ui.sheet = null; ui.coachTab = "talk";
  },
};

const changes = {
  "attach-video": async (el) => {
    const f = el.files[0]; if (!f) return;
    const who = ui.role === "bride" ? "client" : "coach";
    const c = ui.role === "bride" ? me() : client(ui.clientId);
    const id = uid("b"); await DB.putBlob(id, f);
    S.messages.push({ id: uid("m"), clientId: c.id, from: who, type: "video", blobId: id, exId: null,
      status: who === "client" ? "waiting" : "done", at: new Date().toISOString(), read: false, text: "" });
    await save(); render(); scrollChatEnd();
  },
  "form-video": async (el) => {
    const f = el.files[0]; if (!f) return;
    const c = me(), e = exById(el.dataset.ex);
    const id = uid("b"); await DB.putBlob(id, f);
    S.messages.push({ id: uid("m"), clientId: c.id, from: "client", type: "video", blobId: id, exId: e.id,
      status: "waiting", at: new Date().toISOString(), read: false, text: `${e.name}のフォームを撮りました。見てください！` });
    await save();
    ui.sheet = null; ui.tab = "talk"; render(); scrollChatEnd(); toast("動画を送りました");
  },
  "ex-video": async (el) => {
    const f = el.files[0]; if (!f) return;
    const e = exById(el.dataset.ex), id = uid("b");
    await DB.putBlob(id, f); e.videoBlob = id;
    await save(); render(); toast("お手本動画を登録しました");
  },
  "rv-video": (el) => {
    const f = el.files[0]; if (!f) return;
    ui.draft.reply = f; ui.draft.replyName = f.name;
    $("#rv-file").textContent = f.name;
  },
  "item-field": async (el) => {
    const c = client(ui.clientId);
    c.plan[Number(el.dataset.k)].items[Number(el.dataset.i)][el.dataset.f] = el.value.trim();
    await save();
  },
};

const forms = {
  send: async (form) => {
    const ta = form.elements.text, text = ta.value.trim();
    if (!text) return;
    const who = ui.role === "bride" ? "client" : "coach";
    const c = ui.role === "bride" ? me() : client(ui.clientId);
    S.messages.push({ id: uid("m"), clientId: c.id, from: who, type: "text", text, at: new Date().toISOString(), read: false });
    await save(); render(); scrollChatEnd();
  },
  "add-ex": async (form) => {
    const f = new FormData(form), lines = (k) => String(f.get(k) || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const e = { id: uid("x"), name: f.get("name").trim(), part: f.get("part").trim() || "全身", aim: f.get("aim").trim(),
      reps: f.get("reps").trim() || "10回", sets: f.get("sets").trim() || "1セット", freq: f.get("freq").trim() || "毎日",
      how: lines("how"), points: lines("points") };
    const img = f.get("img"), video = f.get("video");
    if (img && img.size) { e.imgBlob = uid("b"); await DB.putBlob(e.imgBlob, img); }
    const yt = String(f.get("youtube") || "").trim();
    if (yt && !ytId(yt)) { toast("YouTube の URL を確かめてください"); return; }
    if (yt) e.youtube = yt;
    else if (video && video.size) { e.videoBlob = uid("b"); await DB.putBlob(e.videoBlob, video); }
    S.exercises.push(e);
    await save(); render(); toast(`「${e.name}」を追加しました`);
  },
};

document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  ev.preventDefault();
  const fn = actions[el.dataset.action];
  if (!fn) return;
  const r = await fn(el);
  if (r !== false) render();
});
document.addEventListener("change", (ev) => {
  const el = ev.target.closest("[data-change]");
  if (el && changes[el.dataset.change]) changes[el.dataset.change](el);
});
document.addEventListener("submit", (ev) => {
  const form = ev.target.closest("[data-form]");
  if (!form) return;
  ev.preventDefault();
  forms[form.dataset.form](form);
});
// Enter で送信、Shift+Enter で改行（スマホの日本語入力の確定は除く）
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && ui.sheet) { ui.sheet = null; ui.draft = null; render(); return; }
  const ta = ev.target.closest(".composer textarea");
  if (ta && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing && matchMedia("(hover: hover)").matches) {
    ev.preventDefault(); ta.form.requestSubmit();
  }
});
document.addEventListener("input", (ev) => {
  const ta = ev.target.closest(".composer textarea");
  if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
});

(async function init() {
  await DB.open();
  try { S = await DB.getState(); } catch (e) { S = null; }
  if (!S || S.version !== 2) { S = seedState(); await save(); }
  try { const r = localStorage.getItem("bridal-role"); if (r === "bride" || r === "coach") ui.role = r; } catch (e) { /* 入口から選ぶ */ }
  render();
})();
