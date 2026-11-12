// 最初に入れておくデモのデータ。花嫁さん2人は架空の人。
// 運動の名前・回数・やり方は写真に合わせた【サンプル】で、小宮さんが差し替える前提

const PROGRAM_DAYS = 90;

// 3か月を3つに分ける。種目を切り替えるタイミング＝月の変わり目
const PHASES = [
  { month: 1, en: "Release", name: "ほどく", note: "固まった背中と胸まわりをほどいて、動ける体の土台をつくる月" },
  { month: 2, en: "Align", name: "ととのえる", note: "ほどいた体で、立ち姿・座り姿の位置をととのえる月" },
  { month: 3, en: "Grace", name: "魅せる", note: "ドレスで歩く・振り向く・お辞儀をする、本番の動きに近づける月" },
];

// 1か月ごとのご褒美（④のプレゼントの置き場所。中身は小宮さんが決める）
const GIFTS = [
  { day: 30, en: "First Fitting", name: "1か月目の記念カード", note: "30日間の記録と、小宮コーチからの手紙" },
  { day: 60, en: "Rehearsal", name: "2か月目の記念カード", note: "はじめの写真と、いまの写真を並べたカード" },
  { day: 90, en: "Your Bouquet", name: "卒花の証", note: "90輪のブーケと、卒花生の集まりへのご招待" },
];

const SEED_EXERCISES = [
  { id: "ex2", name: "オープンブック", part: "胸・背中", reps: "左右10回", sets: "2セット", freq: "毎日",
    aim: "丸まりやすい背中をほどき、デコルテをひらく",
    how: ["横向きに寝て、両膝を軽く曲げる", "両腕を前にそろえて伸ばす", "息を吐きながら、上の腕を大きくひらいて胸を天井へ向ける", "息を吸いながら、ゆっくり戻す"],
    points: ["膝は床から離さない", "目線は動かす手を追う", "痛みのない範囲でひらく"] },
  { id: "ex3", name: "横座りの胸ひらき", part: "胸・背中", reps: "左右8回", sets: "2セット", freq: "毎日",
    aim: "座ったままでも、胸をひらく感覚をつかむ",
    how: ["横座りになり、胸に手を当てる", "息を吐きながら、胸から後ろへひねる", "ゆっくり正面へ戻す"],
    points: ["腰ではなく、胸からひねる", "肩に力を入れない"] },
  { id: "ex8", name: "膝立ちの胸はり", part: "肩・胸", reps: "10回", sets: "2セット", freq: "毎日",
    aim: "肩甲骨を寄せて、ドレスの背中をきれいに見せる",
    how: ["膝立ちになり、頭の後ろで手を組む", "息を吸いながら、肘を横にひらいて胸をはる", "息を吐きながら、もとに戻す"],
    points: ["腰を反らせすぎない", "あごを軽く引く"] },
  { id: "ex4", name: "四つ這いのボールリーチ", part: "背中・体幹", reps: "左右8回", sets: "2セット", freq: "1日おき",
    aim: "背中を長く保ったまま、腕を動かす",
    how: ["四つ這いになり、片手をボールに置く", "ボールを前へ転がし、背中を長く伸ばす", "ゆっくり戻す"],
    points: ["腰が反らないように、おへそを軽く引き込む"] },
  { id: "ex9", name: "膝立ちの合掌ツイスト", part: "体幹", reps: "左右8回", sets: "2セット", freq: "毎日",
    aim: "振り向くときの、上半身のしなやかさをつくる",
    how: ["膝立ちで、胸の前で手を合わせる", "骨盤は正面のまま、胸からゆっくり左右へひねる"],
    points: ["骨盤は動かさない", "頭のてっぺんを天井へ"] },
  { id: "ex7", name: "膝立ちの腕のばし", part: "体幹・肩", reps: "10秒×5回", sets: "1セット", freq: "毎日",
    aim: "頭から膝までを一直線に保つ",
    how: ["膝立ちになり、両腕を前へまっすぐ伸ばす", "頭から膝までが一直線になるように保つ"],
    points: ["お尻を後ろに引かない", "肩をすくめない"] },
  { id: "ex5", name: "前屈からの片腕ひらき", part: "背中・脚の裏", reps: "左右6回", sets: "2セット", freq: "1日おき",
    aim: "脚の裏と背中を同時にほどく",
    how: ["立ったまま前屈し、片手をボールに置く", "もう片方の腕を天井へ向けてひらく"],
    points: ["膝は軽く曲げてよい", "首の力を抜く"] },
  { id: "ex6", name: "90/90 のお尻ほぐし", part: "股関節", reps: "左右30秒", sets: "2セット", freq: "毎日",
    aim: "歩き姿を軽くするために、股関節を動かす",
    how: ["両膝を90度に曲げて床に座る", "背すじを伸ばしたまま、前の脚の方へ体を倒す"],
    points: ["背中を丸めない", "痛みが出る手前で止める"] },
  { id: "ex1", name: "ランジの胸ひらき", part: "全身", reps: "左右6回", sets: "2セット", freq: "1日おき",
    aim: "脚の力で体を支えながら、胸をひらく",
    how: ["脚を前後にひらいてランジの姿勢になる", "前脚の側へ、胸からひらく"],
    points: ["前の膝がつま先より内側に入らない"] },
];
SEED_EXERCISES.forEach((e) => { e.sample = true; });

function seedState() {
  const today = new Date();
  const day = (n) => ymdOf(addDaysTo(today, n));
  const at = (n, h, m) => { const d = addDaysTo(today, n); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const item = (id) => { const e = SEED_EXERCISES.find((x) => x.id === id); return { ex: id, reps: e.reps, sets: e.sets }; };
  const plan = () => [
    { items: ["ex2", "ex3", "ex8"].map(item) },
    { items: ["ex2", "ex8", "ex4", "ex9"].map(item) },
    { items: ["ex8", "ex9", "ex7", "ex1"].map(item) },
  ];

  const sakura = {
    id: "c1", name: "さくら", fullName: "山下 さくら", weddingDate: day(80), startDate: day(-22),
    goals: ["背中の丸まりをなくして、デコルテをきれいに見せたい", "ドレスで歩く姿に自信を持ちたい", "写真で肩が上がって見えるのを直したい"],
    nextSession: at(4, 20, 0), plan: plan(),
  };
  const minami = {
    id: "c2", name: "みなみ", fullName: "岡田 みなみ", weddingDate: day(58), startDate: day(-45),
    goals: ["反り腰を整えて、横から見た姿をきれいにしたい", "前撮りまでに肩まわりをすっきりさせたい"],
    nextSession: at(2, 21, 0), plan: plan(),
  };

  // できた日の記録。さくらさんは22日中19日、今日は1種目だけ済み
  const done = { c1: {}, c2: {} };
  for (let i = -22; i < 0; i++) {
    if ([-18, -11, -6].includes(i)) continue;
    done.c1[day(i)] = ["ex2", "ex3", "ex8"];
  }
  done.c1[day(0)] = ["ex2"];
  for (let i = -45; i < 0; i++) {
    if (i % 9 === 0) continue;
    done.c2[day(i)] = i < -15 ? ["ex2", "ex3", "ex8"] : ["ex2", "ex8", "ex4", "ex9"];
  }

  const messages = [
    { id: "m1", clientId: "c1", from: "coach", type: "text", at: at(-22, 9, 0), read: true,
      text: "さくらさん、今日からよろしくお願いします！\n3か月で「背中とデコルテをきれいに見せる」を一緒に目指しましょう。毎日ここでお話ししましょうね。" },
    { id: "m2", clientId: "c1", from: "client", type: "text", at: at(-22, 12, 30), read: true,
      text: "よろしくお願いします！がんばります🌸" },
    { id: "m3", clientId: "c1", from: "client", type: "video", exId: "ex2", status: "done", at: at(-2, 21, 10), read: true,
      text: "オープンブック撮ってみました！左のほうがひらきにくい気がします" },
    { id: "m4", clientId: "c1", from: "coach", type: "review", reviewOf: "m3", exId: "ex2", at: at(-1, 7, 40), read: true,
      text: "左のひらきにくさ、よく気づきましたね。左は2回多めにやってみましょう。お手本も送ります！",
      comments: [
        { t: 3, text: "骨盤がいっしょに回っています。上の膝で床を軽く押さえてみましょう" },
        { t: 9, text: "ここ！胸がしっかり天井を向いています。この感覚です" },
      ] },
    { id: "m5", clientId: "c1", from: "client", type: "text", at: at(-1, 8, 15), read: true,
      text: "ありがとうございます！膝で押さえたら、ひらく感じが全然ちがいました😊" },
    { id: "m6", clientId: "c1", from: "coach", type: "text", at: at(0, 7, 30), read: false,
      text: "おはようございます☀️\n今日は胸はりのとき、あごを軽く引くのを意識してみてください。夜でも大丈夫です！" },

    { id: "m7", clientId: "c2", from: "coach", type: "text", at: at(-1, 20, 0), read: true,
      text: "みなみさん、2か月目に入りましたね。今週から四つ這いのボールリーチが加わります！" },
    { id: "m8", clientId: "c2", from: "client", type: "video", exId: "ex4", status: "waiting", at: at(0, 6, 50), read: false,
      text: "四つ這いのリーチ、腰が反っていないか見てほしいです🙏" },
  ];

  return {
    version: 2,
    coachName: "小宮",
    exercises: SEED_EXERCISES.map((e) => ({ ...e })),
    clients: [sakura, minami],
    done,
    messages,
  };
}

function ymdOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysTo(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
