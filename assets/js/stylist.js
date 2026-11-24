/* =========================================================
   MALABISY AI STYLIST — independent add-on module
   - Loads after app.js; talks to the shop only through window.MLB_API (read-only bridge).
   - Every answer is computed from the live catalogue (prices, sizes in stock, colours, brands).
     It never writes product facts of its own: fabric/fit claims are only made when the
     product title or type states them.
   - Scoped DOM (#mst-root) and CSS (mst-*): nothing on the existing page is changed.
   ========================================================= */
(() => {
  const API = window.MLB_API;
  if (!API || document.getElementById("mst-root")) return;
  // settings from the site editor (assets/js/cms.js): name, greeting, suggestions, taught answers, on/off
  const AS = (window.MLB_CMS && window.MLB_CMS.assistant) || {};
  if (AS.off) return;
  const SET = API.settings || {};
  // skills (all on unless switched off in the dashboard) and reply texts the dashboard can rewrite
  const SKILL = (k) => !(AS.skills && AS.skills[k] === false);
  const fill = (t) => String(t).replace(/\{free\}/g, API.money(POL.free)).replace(/\{days\}/g, POL.days).replace(/\{exchange\}/g, String(POL.exch)).replace(/\{payments\}/g, POL.pays.join(", "));
  const REPLY = (key, def, vars = {}) => { const t = AS.replies && String(AS.replies[key] || "").trim(); if (!t) return def; let h = esc(fill(t)).replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); for (const [k, v] of Object.entries(vars)) h = h.split("{" + k + "}").join(esc(v)); return h; };
  const LOGK = "mst_log";
  const logMsg = (raw, q) => { try { const l = JSON.parse(localStorage.getItem(LOGK) || "[]"); l.unshift({ at: new Date().toISOString(), m: String(raw).slice(0, 200), i: q.intent, b: q.brand || "", ok: !/^(unknown|nobrand|offtopic)$/.test(q.intent), p: page }); localStorage.setItem(LOGK, JSON.stringify(l.slice(0, 1000))); } catch {} };
  const POL = { free: SET.FREE ?? 3500, days: SET.DAYS || "2–5", exch: SET.EXCH ?? 14, pays: (SET.PAYMENTS || []).map((p) => p.name) };
  const CAT = API.catalog;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const page = document.body.dataset.page;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- knowledge: categories, colours, occasions, fabrics ---------------- */
  const text = (r) => (r.t + " " + r.ty).toLowerCase();
  const CATS = {
    dress:   { label: "dresses", test: (r) => /\b(dress|abaya|kaftan|jumpsuit|gown)\b/.test(text(r)) },
    top:     { label: "tops", test: (r) => /\b(top|t-shirt|tee|shirt|blouse|bodysuit|tank|cami|crop|polo|tunic)s?\b/.test(text(r)) && !/\bdress\b/.test(text(r)) },
    knit:    { label: "knitwear", test: (r) => /\b(sweater|pullover|knit|knitwear|cardigan|jumper|hoodie|sweatshirt)s?\b/.test(text(r)) },
    outer:   { label: "jackets & coats", test: (r) => /\b(jacket|coat|blazer|trench|vest|gilet|kimono|overshirt|parka)s?\b/.test(text(r)) },
    bottom:  { label: "trousers & skirts", test: (r) => /\b(pants|trousers?|jeans|skirt|shorts|leggings|sweatpants|joggers|culottes)\b/.test(text(r)) },
    set:     { label: "sets", test: (r) => /\b(set|co-ord|coord|two[- ]piece)\b/.test(text(r)) },
    shoes:   { label: "shoes", test: (r) => r.d === "Footwear" },
    bag:     { label: "bags", test: (r) => r.d === "Bags" },
    acc:     { label: "accessories", test: (r) => r.d === "Accessories" || /\b(scarf|hijab|belt|necklace|earrings?|bracelet|watch)\b/.test(text(r)) },
    home:    { label: "homewear", test: (r) => r.d === "Homewear" },
  };
  const CAT_WORDS = [
    [/\b(dress(es)?|abaya|kaftan|jumpsuit|gown|فستان|عباية|قفطان)\b/, "dress"],
    [/\b(tops?|t-?shirts?|tees?|shirts?|blouses?|bodysuits?|tanks?|cami|توب|بلوزة|قميص|تيشيرت)\b/, "top"],
    [/\b(sweaters?|pullovers?|knit(wear)?|cardigans?|jumpers?|hoodies?|sweatshirts?|بلوفر|كارديجان|هودي)\b/, "knit"],
    [/\b(jackets?|coats?|blazers?|trench|outerwear|vests?|kimonos?|جاكيت|جاكت|بالطو|كوت|بليزر)\b/, "outer"],
    [/\b(pants|trousers?|jeans|skirts?|shorts|leggings|sweatpants|joggers|bottoms?|بنطلون|جيبة|جينز|شورت)\b/, "bottom"],
    [/\b(sets?|co-?ords?|طقم)\b/, "set"],
    [/\b(shoes?|boots?|loafers?|sneakers?|heels?|sandals?|ballerinas?|flats?|mules?|slippers?|footwear|جزمة|حذاء|كوتشي|بوت|صندل|كعب)\b/, "shoes"],
    [/\b(bags?|handbags?|tote|clutch|backpack|crossbody|شنطة|حقيبة)\b/, "bag"],
    [/\b(accessor(y|ies)|scarf|scarves|hijab|belt|jewel(le)?ry|طرحة|حجاب|اكسسوار)\b/, "acc"],
    [/\b(pajamas?|pyjamas?|nightwear|sleepwear|homewear|lingerie|بيجامة|بيجامه)\b/, "home"],
  ];
  const COLORS = {
    black: /\b(black|noir|jet|اسود|أسود)\b/, white: /\b(white|off[- ]?white|ivory|ابيض|أبيض)\b/, cream: /\b(cream|ecru|vanilla|كريمي)\b/,
    beige: /\b(beige|sand|nude|camel|greige|oat|oatmeal|tan|taupe|stone|khaki|بيج|كاميل)\b/, brown: /\b(brown|chocolate|coffee|caf[eé]|mocha|cognac|bunny|بني)\b/,
    grey: /\b(gr[ae]y|charcoal|melange|silver|رمادي|فضي)\b/, navy: /\b(navy|نيفي|كحلي)\b/, blue: /\b(blue|denim|sky|baby blue|indigo|ازرق|أزرق|لبني)\b/,
    green: /\b(green|olive|sage|mint|teal|emerald|khaki green|اخضر|أخضر|زيتي)\b/, pink: /\b(pink|rose|blush|fuchsia|dusty pink|بينك|روز|وردي)\b/,
    red: /\b(red|burgundy|maroon|wine|bordeaux|cherry|احمر|أحمر|نبيتي)\b/, purple: /\b(purple|lilac|lavender|plum|mauve|موف|بنفسجي)\b/,
    yellow: /\b(yellow|mustard|lemon|اصفر|أصفر)\b/, orange: /\b(orange|rust|coral|terracotta|برتقالي)\b/, gold: /\b(gold|golden|دهبي|ذهبي)\b/,
    print: /\b(print(ed)?|floral|checked|check|striped|stripes|plaid|polka|leopard|animal|multi(colou?r)?)\b/,
  };
  const NEUTRAL = new Set(["black", "white", "cream", "beige", "grey", "navy", "brown"]);
  const HARMONY = {
    black: ["white", "cream", "beige", "grey", "red", "pink", "gold", "black"], white: ["black", "navy", "beige", "blue", "brown", "green", "pink", "white"],
    cream: ["brown", "beige", "black", "navy", "green", "cream"], beige: ["white", "cream", "brown", "black", "navy", "green", "blue"],
    brown: ["cream", "beige", "white", "blue", "green", "orange", "black"], grey: ["black", "white", "pink", "navy", "purple", "blue"],
    navy: ["white", "cream", "beige", "grey", "pink", "red"], blue: ["white", "beige", "brown", "cream", "grey", "navy"],
    green: ["beige", "cream", "brown", "white", "black"], pink: ["grey", "white", "navy", "beige", "cream", "blue"],
    red: ["black", "white", "navy", "beige", "cream"], purple: ["grey", "white", "black", "cream"], yellow: ["navy", "white", "grey", "blue"],
    orange: ["navy", "white", "brown", "cream"], gold: ["black", "white", "cream", "brown"], print: ["black", "white", "cream", "beige"],
  };
  const OCCASIONS = {
    work: { re: /\b(work|office|meeting|interview|business|formal|شغل|مكتب|انترفيو)\b/, cats: ["outer", "top", "bottom", "shoes", "bag"], words: /\b(blazer|trousers?|tailored|shirt|blouse|loafer|trench|pleated|vest)\b/, tone: "polished and neutral" },
    evening: { re: /\b(wedding|party|evening|night out|dinner|engagement|gala|فرح|خطوبة|سهرة|حفلة)\b/, cats: ["dress", "shoes", "bag", "acc"], words: /\b(dress|satin|velvet|heels?|clutch|sequin|maxi|midi)\b/, tone: "elegant and dressed-up" },
    casual: { re: /\b(casual|weekend|everyday|daily|errands|outing|خروجة|كاجوال|يومي)\b/, cats: ["top", "bottom", "outer", "shoes", "bag"], words: /\b(jeans|t-?shirt|tee|sweatpants|sneakers?|hoodie|cardigan|denim|wide[- ]leg)\b/, tone: "relaxed and easy" },
    eid: { re: /\b(eid|ramadan|iftar|suhoor|عيد|رمضان|فطار|سحور)\b/, cats: ["dress", "set", "shoes", "bag"], words: /\b(abaya|kaftan|set|dress|maxi|modest)\b/, tone: "graceful and modest" },
    uni: { re: /\b(uni|university|college|campus|class|school|جامعة|كلية)\b/, cats: ["top", "bottom", "knit", "shoes", "bag"], words: /\b(jeans|sweatshirt|hoodie|sneakers?|backpack|tote|cardigan)\b/, tone: "comfortable and put-together" },
    date: { re: /\b(date|anniversary|romantic)\b/, cats: ["dress", "top", "bottom", "shoes", "bag"], words: /\b(dress|skirt|blouse|heels?|satin)\b/, tone: "soft and confident" },
    travel: { re: /\b(travel|trip|airport|flight|vacation|holiday|سفر|رحلة)\b/, cats: ["set", "bottom", "top", "shoes", "bag"], words: /\b(set|sweatpants|joggers|sneakers?|tote|linen|cardigan)\b/, tone: "comfortable for long days" },
    winter: { re: /\b(winter|cold|chilly|snow|شتا|شتاء|برد)\b/, cats: ["outer", "knit", "bottom", "shoes"], words: /\b(coat|jacket|wool|knit|boots?|leather|suede|fleece|velvet)\b/, tone: "warm and layered" },
    summer: { re: /\b(summer|beach|hot|vacation|sea|صيف|بحر|ساحل)\b/, cats: ["dress", "top", "bottom", "shoes", "bag"], words: /\b(linen|cotton|sandals?|shorts|dress|swim|maxi)\b/, tone: "light and breathable" },
    gym: { re: /\b(gym|workout|sport|training|yoga|run|جيم|رياضة)\b/, cats: ["top", "bottom", "shoes"], words: /\b(training|sport|yoga|leggings|sneakers?|active)\b/, tone: "sporty" },
  };
  const FABRICS = ["leather", "suede", "linen", "denim", "wool", "knit", "cotton", "satin", "velvet", "silk", "chiffon", "fleece", "corduroy", "cashmere", "jersey", "lace", "tweed", "faux fur", "crochet", "ribbed", "pleated"];
  const FABRIC_NOTE = { leather: "structured and wind-proof; pairs well with softer knits", suede: "soft texture; reads warm and expensive next to cream or denim", linen: "breathes well in the heat; a relaxed, slightly creased look is part of its charm", denim: "a durable everyday base that goes with almost anything", wool: "warm and holds its shape; a classic for winter layering", knit: "cosy texture that softens sharper pieces like leather or tailoring", cotton: "easy-care and breathable for daily wear", satin: "light-catching sheen for evenings; keep the rest of the look simple", velvet: "rich, evening-appropriate texture for winter", fleece: "soft and warm for relaxed days", ribbed: "stretchy texture that layers neatly under jackets", pleated: "adds movement and a polished line" };

  /* ---------------- product helpers (all facts come from the catalogue) ---------------- */
  const colorOf = (r) => { const s = (r.k.join(" ") + " " + r.t).toLowerCase(); for (const [c, re] of Object.entries(COLORS)) if (re.test(s)) return c; return null; };
  const catOf = (r) => { for (const k of ["dress", "set", "outer", "knit", "bottom", "top", "shoes", "bag", "acc", "home"]) if (CATS[k].test(r)) return k; return null; };
  const fabricOf = (r) => FABRICS.find((f) => text(r).includes(f)) || null;
  const off = (r) => (r.c ? Math.round((1 - r.p / r.c) * 100) : 0);
  const inStock = (r) => (r.s.length ? r.a.length > 0 : true);
  const sizesText = (r) => (r.s.length ? (r.a.length ? r.a.join(", ") : "sold out") : "one size");
  const PROFILE = (() => { try { return JSON.parse(localStorage.getItem("mst_profile") || "{}"); } catch { return {}; } })();
  const saveProfile = () => localStorage.setItem("mst_profile", JSON.stringify(PROFILE));

  /* ---------------- language layer ----------------
     Turns whatever the shopper types (English, Egyptian Arabic, Franco-Arabic such as "3ayza fostan eswed",
     typos such as "blak dres", Arabic digits, elongated letters) into plain English words the parser below
     already understands. Unknown words are kept so the stylist can say what it did not understand. */
  const normChars = (s) => String(s).toLowerCase()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[ً-ْـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[’‘`´]/g, "'").replace(/،/g, ",").replace(/؟/g, "?")
    .replace(/([ء-ي])\1{2,}/g, "$1").replace(/([a-z])\1{2,}/g, "$1$1");
  const LEX = {};
  const put = (canon, words) => words.trim().split(/\s+/).forEach((w) => { LEX[normChars(w)] = canon; });
  // categories and pieces
  put("dress", "fostan fustan fostn fstan fosatin fasatin fasateen fsatin fostane dres dresse فستان فساتين فستاني");
  put("abaya", "abaya 3abaya 3abaia abaia عبايه عبايات عباية");
  put("kaftan", "kaftan 2oftan oftan qoftan قفطان");
  put("jumpsuit", "jumpsuit jumbsuit jampsuit salopette salopet جمبسوت سالوبيت");
  put("blouse", "blouza bloza blouze blouz بلوزه بلوزات بلوزة");
  put("shirt", "2amis amis qamis 2ameis 2omsan قميص قمصان");
  put("t-shirt", "tshirt tshirts tishirt tisheert teshert tshert تيشيرت تيشرت تيشيرتات");
  put("top", "توب توبات crop كروب بادي");
  put("pullover", "pullover bolover blover bulover bolovar بلوفر بلوفرات بلوفرز");
  put("sweater", "sweater swetar sweter switer سويتر");
  put("cardigan", "kardigan cardigan cardgan كارديجان كاردجان كارديجن");
  put("hoodie", "hodi hoody hoodi هودي هوديز");
  put("knitwear", "triko trico treko تريكو knitted");
  put("jacket", "gaket jaket jakit ga2et gakit jaketa jakcet jacekt jackt جاكيت جاكت جواكت جاكيتات جاكتات puffer بافر");
  put("coat", "balto baltu baltoo بالطو بلاطي كوت");
  put("blazer", "blazar blezer blazr بليزر بلايزر");
  put("trench", "ترنش trensh");
  put("vest", "sedery sedeiry صديري فيست");
  put("trousers", "bantalon bantaloon bantlon bantaloun bntlon pantalon بنطلون بنطلونات بناطيل بنطلوني");
  put("jeans", "jeanz geans gins جينز");
  put("skirt", "jupe jeeba gipa gieba jiba جيبه جيبات جيب");
  put("shorts", "shourt شورت شورتات");
  put("leggings", "legging lagen leggen ليجن ليجنز ليقنز");
  put("sweatpants", "sweatbants swetpants sweetpants");
  put("joggers", "jogger جوجر");
  put("set", "ta2m taqm atqom at2om طقم اطقم co-ord");
  put("set sport", "trng tring treng trening ترينج ترنج");
  put("shoes", "gazma gezma gazm gizma shoz shooz جزمه جزم احذيه حذاء كوتشيات");
  put("sneakers", "kotchy kotshy koshy kotchi kotshi كوتشي sneaker sneeker sneekers snikers");
  put("boots", "boot boots bot buts بوت بوط بوتس بوتات");
  put("heels", "ka3b kaab كعب heel heals hils");
  put("sandals", "sandal sandel sandl صندل صنادل");
  put("slippers", "shebshb shebsheb shbshb شبشب");
  put("ballerinas", "ballerina balerina بالرينا باليرينا");
  put("loafers", "loafer lofer لوفر");
  put("bag", "shanta shant shnta sh2nta shanata شنطه شنط حقيبه حقايب حقيبة");
  put("clutch", "clatch كلاتش");
  put("backpack", "backbag");
  put("hijab", "7egab hegab 7ijab hijab حجاب");
  put("scarf", "tar7a tarha طرحه طرح ايشارب esharb isharb shal shaal شال كوفيه kofeya");
  put("belt", "7ezam hezam حزام");
  put("accessories", "ekseswar eksesoar axesoar accessory اكسسوار اكسسوارات اكسسورات");
  put("necklace", "selsela silsila سلسله");
  put("earrings", "7ala2 حلق");
  put("watch", "sa3a ساعه");
  put("pajamas", "bijama bejama pijama بيجامه بيجامات");
  // colours
  put("black", "aswed eswed iswed swed soda sooda swda اسود سودا سوده سود");
  put("white", "abyad abyd ebyad beda bida bayda ابيض بيضا بيضه offwhite");
  put("red", "a7mar ahmar e7mar 7amra hamra احمر حمرا");
  put("blue", "azra2 azra2a azraq zar2a zarqa ازرق زرقا لبني labany");
  put("green", "a5dar akhdar e5dar khadra 5adra اخضر خضرا زيتي zeity zaity");
  put("brown", "bonni bunni bony boni بني");
  put("beige", "bej beij bej بيج كاميل kamel");
  put("grey", "ramadi ramady rosasi rsasy رمادي رصاصي فضي fedy");
  put("navy", "kohly ko7li ko7ly كحلي");
  put("pink", "wardy wardi bamby bamba بمبي وردي بينك روز simon سيمون");
  put("purple", "mof mov موف بنفسجي");
  put("yellow", "asfar a9far safra اصفر صفرا");
  put("orange", "borto2ani bortu2ani برتقاني برتقالي");
  put("gold", "dahabi dahaby دهبي ذهبي");
  put("burgundy", "nebity nbiti نبيتي");
  put("cream", "krem kreemy kremy كريمي كريم");
  // occasions
  put("work", "shoghl sho8l sho3'l shoghol shogl شغل مكتب maktab ofice offise oficce");
  put("interview", "intervew interveiw انترفيو مقابله");
  put("wedding", "fara7 fr7 farah far7 afra7 فرح افراح weding wedin");
  put("engagement", "khetoba 5otoba 5etoba khotoba خطوبه");
  put("party", "sahra sahrah 7afla hafla parti سهره حفله بارتي");
  put("casual", "5aroga khrooga khroga 5rooga khorooga خروجه kajual kaggual كاجوال casul");
  put("everyday", "yomy yawmy يومي");
  put("eid", "3eid 3id 3ed عيد العيد");
  put("ramadan", "ramdan رمضان");
  put("university", "game3a gam3a gam3ah koleya kolya madrasa جامعه كليه مدرسه uni");
  put("date", "ديت");
  put("travel", "safar sfr re7la rehla سفر رحله");
  put("winter", "shita sheta shetwy shitwy shtwy شتوي شتا شتاء شتويه bard برد sa23a ساقعه wintr");
  put("summer", "seif sayf sefy seify صيفي صيف 7ar حر sumer");
  put("beach", "ba7r ba7ar sa7el sahel بحر ساحل");
  put("gym", "جيم riyada reyada رياضه sport سبور");
  // money, ranges, size, intents
  put("best", "a7la ahla احلي احلى trending popular bestseller bestsellers");
  put("brands", "براند براندات ماركه ماركات brandat brand");
  put("cheaper", "ar5as arkhas ar5s rkhees re5is رخيص ارخص cheep chep");
  put("under", "ta7t ta7at t7t تحت");
  put("over", "fo2 foo2 فوق");
  put("around", "7awaly hawaly ta2riban حوالي تقريبا");
  put("budget", "mizanya mezanya ميزانيه ميزانيتي");
  put("le", "geneh gneh gnih gene genih جنيه جنيه ج egp pounds pound");
  put("sale", "5asm khasm 3rd 3orod 3roud ta5fedat takhfidat okazyon خصم خصومات عروض تخفيضات اوكازيون discount discont");
  put("new arrivals", "gdid gedid gded جديد الجديد newest latest احدث");
  put("size", "ma2as mas2 maas مقاس المقاس");
  put("my size is", "ma2asy ma2asi مقاسي");
  put("i am", "ana انا");
  put("size m", "medium meduim midum midium ميديم ميديوم");
  put("size s", "small smol smal سمول");
  put("size l", "large larg lardj لارج");
  put("size xl", "xlarge اكسلارج");
  put("compare", "2aren qaren 2arn قارن قارنلي مقارنه far2 فرق الفرق");
  put("goes with", "yeli2 yeliq yli2 ylee2 يليق هيليق يليق يناسب ynaseb");
  put("outfit", "look lok lock لوك اوتفت outfet");
  put("fabric", "5ama khama 2omash omash خامه قماش");
  put("hello", "hi hii hey helo hellow ahlan ahln salam slam سلام السلام مرحبا ازيك ازيكم ezayak ezayek ezayk izayak هاي هلو");
  put("thanks", "thx thanx merci mersi ميرسي shokran shukran شكرا tslm teslam تسلم تسلمي");
  put("more", "kaman tany tani 8erhom ghirhom gherhom zyada كمان تاني غيرهم زياده");
  put("cart", "sala سله السله basket");
  put("not", "msh mish mesh مش بدون bdon bedon without no");
  put("kids", "atfal 3eyal 3yal wlad awlad ولاد اولاد عيال اطفال بيبي");
  put("menswear", "rgaly regaly rigaly رجالي رجاله");
  put("women", "harimy 7arimy حريمي ستات sitat");
  put("modest", "ma2fool m2fol mo7tashem محتشم مقفول wase3 wasee3 واسع");
  put("gift", "hedeya hdya hedya هديه هدايا mom mama ماما مامتي omy sister okhty اختي friend sa7bty صاحبتي");
  put("bust", "sedr صدر chest");
  put("waist", "west wst وسط خصر");
  put("hips", "hipz 7ips ارداف هيبس حوض");
  put("height", "tol tooly tuli طول طولي");
  put("weight", "wazn wazny وزن وزني kg كيلو");
  put("__delivery", "delivery delevery delivry shipping shiping tawseel tawsil توصيل shi7n sha7n شحن");
  put("__returns", "return returns refund exchange estebdal esterga3 estergaa استبدال استرجاع ارجع ابدل raga3");
  put("__payment", "payment pay visa فيزا cash كاش cod instapay انستاباي انستا valu فاليو ta2seet ta2set تقسيط اقساط fawry فوري");
  put("__track", "track tracking tetba3 اتابع تتبع");
  put("__human", "agent human support");
  put("__compliment", "amazing awesome gamed gamda جامد جامده tohfa تحفه 7elw 7elwa حلو حلوه wow nice");
  put("__yes", "yes yeah yep aywa ah ايوه اه تمام tamam ok okay اوكي");
  put("__no", "la2 laa nope لا");
  // number words
  put("100", "meya mya ميه مية"); put("200", "miten mitin ميتين"); put("300", "tlatmeya تلتميه تلاتميه"); put("400", "rob3meya ربعميه");
  put("500", "5amsmeya khamsmeya خمسميه"); put("600", "setmeya ستميه"); put("700", "sab3meya سبعميه"); put("800", "tmnmeya تمنميه"); put("900", "tes3meya تسعميه");
  put("1000", "alf الف"); put("2000", "alfen alfin الفين");
  // filler words: understood, carry no meaning on their own
  const FILL = new Set(normChars(`ana 3ayez 3ayza 3awz 3awza 3ayz 3ayzah 3ayzeen 3ozt ayez ayza mehtag me7tag me7taga mehtaga momken mmkn mumkin law lw sama7t sm7t please pls plz ya enta enty inta inti eh eih ezay ezzay keda kda el al l b bta3 beta3 betaa 7aga haga 7agat hagat shwaya awi 2awi gedan khales men mn m3 ma3 w wala aw howa heya fe fi f 3la 3ala 3al lel lil ely elly illi da di dol dool 3shan 3ashan aho ahe yalla bas
    عندكم عندك 3ndko 3andko 3ndku 3andak 3ndak بتبيعوا بتبيعو bteb3o btbe3o
    عايز عايزه عاوز عاوزه محتاج محتاجه ممكن لو سمحت يا انت انتي ايه ازاي كده ده دي دول حاجه حاجات شويه اوي جدا خالص من مع و ولا او هو هي في فى على عشان علشان بتاع بتاعت اللي يلا بس الا
    i me my want wanna need looking look show find get give something some anything a an the for to of in on at is are am it this that these those with and or please can could would you your do does have has be just any also
    nice good best cute lovely pretty beautiful stylish elegant classy simple basic comfy comfortable warm light heavy long short wide loose tight fitted oversized plain everything ideas idea options option pieces piece clothes clothing wear wearing style styles color colour colors colours what which where when how much many price prices cost than less expensive think recommend suggest would like love really very too maybe other`).split(/\s+/));
  const EN_KEEP = new Set("i me my want need show find for to of in on with and or the this that it is am a an any something looking look what which how much other long short wide loose nice good best cute pretty elegant simple basic comfy comfortable warm light heavy tight fitted oversized plain clothes clothing wear style color colour colors colours price cost expensive".split(" "));
  const PHRASES = [
    [/(?:من غير|men gher|mn 8er|mn gher)/g, " not "], [/(?:مش عايز|msh 3ayez|msh 3ayza|mesh 3ayza|don'?t want|no more)/g, " not "],
    [/(?:خدمه العملاء|customer (?:service|care|support)|talk to (?:a )?(?:person|human|someone)|ﻛﻠﻢ حد|كلم حد|اكلم حد|kalem 7ad|akalem 7ad|real person|phone number|رقم تليفون|رقمكم)/g, " __human "],
    [/(?:فودافون كاش|vodafone cash|voda cash)/g, " __payment "], [/(?:new arrivals?|new in|وصل جديد|جديد عندكم)/g, " new arrivals "],
    [/(?:اكس اكس لارج|xx ?large|2x ?large|ex ex large)/g, " size xxl "], [/(?:اكس لارج|x ?large|ex large|extra large)/g, " size xl "], [/(?:اكس سمول|x ?small|ex small|extra small)/g, " size xs "],
    [/(?:night out|كتب كتاب|katb ketab|katb kitab)/g, " wedding "], [/(?:يمشي مع|ymshi m3|yemshi ma3|yemshy m3|tmshi m3|تمشي مع|ينفع مع|ynfa3 m3|يتلبس مع|matches with)/g, " goes with "],
    [/(?:البس ايه|البس ايه|البس اي|albes eh|a?lbs eh|albes eih|ala?bes eh|what (?:should|can|do) i wear|what to wear)/g, " outfit "],
    [/(?:اوف وايت|off[- ]?white)/g, " white "], [/(?:شنطه ضهر|shanta dahr)/g, " backpack "], [/(?:سويت شيرت|sweat ?shirt)/g, " sweatshirt "], [/(?:سويت بانتس|sweat ?pants)/g, " sweatpants "],
    [/(?:فين الاوردر|فين طلبي|فين الطلب|fen el order|feen el order|fen el talab|where(?:'s| is) my order|order status|حاله الطلب|track (?:my )?order)/g, " __track "],
    [/(?:هيوصل امتي|هيوصل امتى|يوصل امتي|يوصل امتى|hywsal emta|hayewsal emta|yewsal emta|when will (?:it|my order) arrive|how long (?:does )?delivery)/g, " __delivery "],
    [/(?:انت مين|انتي مين|enta meen|enty meen|inta min|who are you|are you (?:a )?(?:bot|robot|human|ai))/g, " __who "],
    [/(?:بتعمل ايه|تقدر تعمل ايه|تعملي ايه|bt3ml eh|te2dar te3mel eh|what can you do|how (?:does this|do you) work|help me|ساعدني|sa3dny|sa3dini|مساعده)/g, " __help "],
    [/(?:عيد ميلاد|3eid milad|3id milad|birthday)/g, " gift "], [/(?:for men|men'?s|mens|menswear|رجالي)/g, " menswear "],
    [/(?:^|\s)(?:من|men|mn|from)\s*(\d+)\s*(?:to|l|le|ل|لل|الي|لحد|l7d|l7ad|-|–)\s*(\d+)/g, " between $1 and $2 "], [/(\d+)\s*(?:-|–|to|الي|لحد)\s*(\d+)/g, " between $1 and $2 "],
    [/(?:الف ونص|alf w ?nos|alf w ?nus)/g, " 1500 "], [/(?:الفين ونص|alfen w ?nos)/g, " 2500 "],
    [/(?:مقابله شغل|job interview)/g, " interview "], [/(?:كل يوم|kol yom|every day)/g, " everyday "],
    [/(?:weather|طقس|الجو|joke|نكته|football|كوره|match score|politics|سياسه|recipe|وصفه|bitcoin|crypto)/g, " __offtopic "],
  ];
  // words the parser already understands, harvested from its own vocabulary, plus brand words: never "corrected"
  for (const x of AS.words || []) {
    const w = normChars(String(x && x.w || "")).trim(), mean = String(x && x.m || "").trim().toLowerCase(); if (!w || !mean) continue;
    if (/\s/.test(w)) PHRASES.unshift([new RegExp("(?:" + w.replace(/[.*+?^\x24{}()|[\]\\]/g, (c) => "\\" + c) + ")", "g"), " " + mean + " "]); else LEX[w] = mean;
  }
  const KNOWN = new Set([...Object.keys(LEX), ...Object.values(LEX).flatMap((v) => v.split(" ")), ...FILL]);
  // typo-correction targets: product, colour, occasion and service words only (no brands, no everyday English)
  const VOCAB = new Set([...Object.keys(LEX), ...Object.values(LEX).flatMap((v) => v.split(" ")), ...FABRICS]);
  const harvest = (re) => (re.source.match(/[a-z]{3,}/g) || []).forEach((w) => { KNOWN.add(w); VOCAB.add(w); });
  CAT_WORDS.forEach(([re]) => harvest(re)); Object.values(COLORS).forEach(harvest); Object.values(OCCASIONS).forEach((o) => { harvest(o.re); harvest(o.words); }); FABRICS.forEach((f) => KNOWN.add(f));
  // everyday English: understood as-is, never "corrected" into a product word
  normChars(`today tomorrow yesterday tonight tell told know knew think thing things stuff help thank sure okay fine great cool love hate hope wish wait wanted needed buy bought order orders shop shopping store website site page money free fast time week weeks days hour hours soon still again actually only even here there where when while whom whose why many most least every each another same such then them they their these those about after before into onto from yours mine ours hers his him her she he we us our its was were been being had having did doing done make made take took gave come came going gone went found shown looked see seen feel felt seem keep kept call called works worked people person woman women girl lady ladies family mother father brother wife husband daughter son child sizes small large medium wore worn fashion trend trendy outfits looks item items better bad ugly gorgeous fancy formal dark bright soft cool thin thick stretchy joke jokes funny`).split(/\s+/).forEach((w) => KNOWN.add(w));
  const HAS_MEN = CAT.some((r) => r.g === "Men");
  const BRAND_WORDS = new Map(); // single distinctive brand words ("kava", "carinawear"); words that are also vocabulary ("black", "rose") need the full brand name
  [...new Set(CAT.map((r) => r.v))].forEach((b) => normChars(b).split(/[^a-z0-9]+/).filter((w) => w.length >= 3).forEach((w) => { const vocab = KNOWN.has(w) || LEX[w] !== undefined; KNOWN.add(w); if (w.length >= 4 && !vocab && !BRAND_WORDS.has(w)) BRAND_WORDS.set(w, b); }));
  /* ---- brands: names as shoppers type them ---- */
  const BRANDS = [...new Set(CAT.map((r) => r.v))];
  const compact = (x) => normChars(x).replace(/&/g, " and ").replace(/[^a-z0-9\u0621-\u064A]+/g, "");
  // names that are also everyday words (a colour, "plaid", "together", "chic") only count next to the word "brand"
  const AMBIG = new Set(["navy", "ward", "suwa", "karohat", "sheek"]);
  const BRAND_EXTRA = {
    "XO Style": "اكس او ستايل|اكس او|xo", "Carinawear": "كارينا|كارينا وير|كرينا|carina|carina wear", "Clue": "كلو|كلوو", "Mr. Joe": "مستر جو|مستر چو|mister joe|mr joe|mrjoe",
    "Anja": "انجا|انچا", "Shoeroom": "شو روم|شوروم|shoe room", "Fluffy accessories": "فلافي|fluffy", "Just 4 Women": "جاست فور وومن|جست فور ومن|just for women|just 4 women|j4w",
    "Libra": "ليبرا", "Eve Chantelle": "ايف شانتيل|ايف شانتال|eve chantal|eve chantel", "Leocansa": "ليوكانسا|ليو كانسا|leo cansa", "KAVA": "كافا|كاڤا",
    "Havana Socks": "هافانا|havana", "Hoolt": "هولت", "Onda": "اوندا", "Navy": "navy brand|brand navy|براند نيفي", "Aida": "عايده|ايدا", "SheChick": "شي شيك|she chick|shechic",
    "B.S Collection": "بي اس كولكشن|bs collection|b s collection", "Viola": "فيولا", "The PG Designs": "بي جي ديزاينز|pg designs|pg design", "Runes": "رونز",
    "Tobay": "توباي", "Virmo": "فيرمو", "DS Handmade": "دي اس هاند ميد|ds handmade|ds hand made", "Uji": "اوجي", "Seline": "سيلين", "PIA": "بيا",
    "Marwa Elezaby": "مروه العزبي|مروه عزبي|marwa el ezaby|marwa elezabi|marwa ezaby|marwa", "Amaze": "اميز", "Hesper": "هسبر|هيسبر", "Podia": "بوديا",
    "Ema Black & White": "ايما|ema black and white|ema", "Champs Land": "شامبس لاند|champs", "Remark": "ريمارك", "Nart": "نارت", "Meraski": "ميراسكي",
    "Sheek": "sheek brand|brand sheek", "99 THREADS": "99 ثريدز|ninety nine threads", "Azya2": "azya|ازيا", "KEEN": "كين", "Mira Fashion": "ميرا|mira", "Kebaa": "كيباء",
    "Karohat": "karohat brand|brand karohat|براند كاروهات", "SUWA": "suwa brand|brand suwa|براند سوا", "Sabotage": "سابوتاج", "Menaksha": "منقشه براند", "HANS": "هانز",
    "Ward": "ward brand|brand ward|براند ورد", "Reebelle": "ريبيل|rebelle|rebel le", "Miss Venus": "ميس فينوس", "Malabisy": "ملابسي|malabisy label",
  };
  const OTHER_BRANDS = [["Zara", "zara|زارا"], ["H&M", "h&m|h and m|hm|اتش اند ام|اتش ان ام"], ["Shein", "shein|she in|شي ان|شين"], ["Mango", "mango|مانجو"], ["Bershka", "bershka|برشكا"],
    ["Pull&Bear", "pull and bear|pull&bear|pull bear|بول اند بير"], ["Stradivarius", "stradivarius|ستراديفاريوس"], ["LC Waikiki", "lc waikiki|lcw|waikiki|ال سي وايكيكي"], ["DeFacto", "defacto|de facto|ديفاكتو"],
    ["Nike", "nike|نايكي|نايك"], ["Adidas", "adidas|اديداس"], ["Puma", "puma|بوما"], ["Gucci", "gucci|جوتشي|جوجي"], ["Splash", "splash|سبلاش"], ["Town Team", "town team|تاون تيم"], ["Concrete", "concrete|كونكريت"], ["Mobaco", "mobaco|موباكو"], ["American Eagle", "american eagle|امريكان ايجل"]];
  for (const n of AS.notCarried || []) { const name = String(n).trim(); if (name && !OTHER_BRANDS.some(([x]) => x.toLowerCase() === name.toLowerCase())) OTHER_BRANDS.push([name, name.toLowerCase()]); }
  const OTHER_RE = [];
  OTHER_BRANDS.forEach(([name, al], i) => al.split("|").forEach((a) => { a = normChars(a); OTHER_RE.push([new RegExp("(^|[^a-z0-9\\u0621-\\u064A])" + a.replace(/[.*+?^\x24{}()|[\]\\&]/g, (c) => "\\" + c).replace(/ /g, "\\s*") + "(?=$|[^a-z0-9\\u0621-\\u064A])", "g"), i]); }));
  for (const x of AS.aliases || []) { const a = String(x && x.a || "").trim(), b = x && x.b; if (a && b && BRANDS.includes(b)) BRAND_EXTRA[b] = (BRAND_EXTRA[b] ? BRAND_EXTRA[b] + "|" : "") + a; }
  const BRAND_ALIAS = []; // [normalised alias, brand index]
  BRANDS.forEach((b, i) => {
    const full = normChars(b).replace(/&/g, " and ").replace(/[^a-z0-9\u0621-\u064A]+/g, " ").trim();
    const forms = new Set([full, full.replace(/^the /, ""), compact(b), ...(BRAND_EXTRA[b] || "").split("|").filter(Boolean).map((x) => normChars(x))]);
    for (const f of forms) if (f && !(AMBIG.has(f)) && f.length >= 2) BRAND_ALIAS.push([f, i]);
  });
  BRAND_ALIAS.sort((a, b) => b[0].length - a[0].length);
  const ARW = "[\\u0621-\\u064A]", WB = "[^a-z0-9\\u0621-\\u064A]";
  const BRAND_RE = BRAND_ALIAS.map(([a, i]) => [new RegExp("(^|" + WB + ")" + (/[\u0621-\u064A]/.test(a) ? "(?:و|ب|ل|ف|من|لل)?" : "") + a.replace(/[.*+?^\x24{}()|[\]\\]/g, (c) => "\\" + c).replace(/ /g, "\\s*") + "(?=$|" + WB + ")", "g"), i]);
  const BRAND_FUZZ = BRAND_ALIAS.filter(([a]) => /^[a-z0-9]+$/.test(a) && a.length >= 4);
  const nearestBrandFn = (w, max) => { let best = null, bd = max + 1; for (const [a, i] of BRAND_FUZZ) { const d = lev(w, a, max); if (d < bd) { bd = d; best = i; } } return bd <= max ? { i: best, d: bd } : null; };
  try {
    const meanings = {}; for (const [w, m] of Object.entries(LEX)) (meanings[m] = meanings[m] || []).push(w);
    const aliases = {}; for (const [a, i] of BRAND_ALIAS) (aliases[BRANDS[i]] = aliases[BRANDS[i]] || []).push(a);
    localStorage.setItem("mst_kb", JSON.stringify({ at: new Date().toISOString(), words: Object.keys(LEX).length, phrases: PHRASES.length, meanings, colors: Object.keys(COLORS), occasions: Object.keys(OCCASIONS), categories: Object.values(CATS).map((c) => c.label), brands: BRANDS.length, aliases, notCarried: OTHER_BRANDS.map(([n]) => n), fabrics: FABRICS }));
  } catch {}
  const lev = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j), prev2 = null;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1); // swapped letters
      }
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  };
  const nearestBrand = (w, max) => nearestBrandFn(w, max);
  let FUZZY = null; // built lazily once the parser vocabulary below is harvested
  const nearest = (w, max) => {
    let best = null, bd = max + 1;
    for (const k of FUZZY) { if (k.length < 4 || /^\d+$/.test(k) || FILL.has(k)) continue; const d = lev(w, k, max); if (d < bd || (d === bd && best && k[0] === w[0] && best[0] !== w[0])) { bd = d; best = k; } }
    return bd <= max ? { word: best, d: bd } : null;
  };
  const AR_PRE = ["وال", "بال", "فال", "كال", "لل", "ال", "و", "ب", "ف", "ل"];
  function normalize(raw) {
    if (!FUZZY) FUZZY = [...VOCAB].filter((k) => /^[a-z][a-z0-9'-]+$/.test(k) && !FILL.has(k));
    let s = " " + normChars(raw) + " ";
    s = s.replace(/(\d),(\d{3})/g, "$1$2").replace(/(\d+(?:\.\d+)?)\s*k\b/g, (_, n) => String(Math.round(parseFloat(n) * 1000)));
    for (const [re, i] of BRAND_RE) s = s.replace(re, (_, pre) => pre + " __b" + i + " ");
    for (const [re, i] of OTHER_RE) s = s.replace(re, (_, pre) => pre + " __o" + i + " ");
    // two typed words that together are a misspelt brand ("xo stile", "mr jo", "carina wer")
    s = s.replace(/(^|\s)([a-z][a-z0-9]{1,})\s+([a-z0-9]{2,})(?=\s|$)/g, (all, pre, a, b) => {
      if (LEX[a] || LEX[b] || FILL.has(a) || FILL.has(b)) return all;
      const j = (a + b), n = j.length >= 4 ? nearestBrand(j, 1) : null;
      return n ? pre + "__b" + n.i + " " : all;
    });
    for (const [re, rep] of PHRASES) s = s.replace(re, rep);
    s = s.replace(/(^|\s)(?:ب|b|bi|be|for)\s+(?=\d)/g, "$1for ").replace(/(^|\s)ل(?=\d)/g, "$1to ").replace(/(^|\s)ب(?=\d)/g, "$1for ").replace(/(\d)(le|egp|ج|جنيه)\b/g, "$1 le");
    const out = [], unknown = [], fixed = [];
    for (const tok of s.split(/[^a-z0-9ء-ي'_-]+/).filter(Boolean)) {
      if (/^\d+(\.\d+)?$/.test(tok) || /^_/.test(tok)) { out.push(tok); continue; }
      if (LEX[tok]) { out.push(LEX[tok]); continue; }
      if (/[ء-ي]/.test(tok)) {
        let hit = null;
        for (const p of AR_PRE) if (tok.startsWith(p) && tok.length - p.length >= 2) { const rest = tok.slice(p.length); hit = LEX[rest] || LEX[rest.replace(/^ال/, "")] || LEX[rest.replace(/(ات|ه|ي)$/, "")] || null; if (hit) break; }
        if (!hit) hit = LEX[tok.replace(/(ات|ه|ي)$/, "")] || null;
        if (hit) out.push(hit); else if (FILL.has(tok)) continue; else { out.push(tok); unknown.push(tok); }
        continue;
      }
      if (FILL.has(tok)) { if (EN_KEEP.has(tok)) out.push(tok); continue; }
      if (KNOWN.has(tok) || tok.length < 4) { out.push(tok); continue; }
      const n = nearest(tok, tok.length <= 5 ? 1 : 2), nb = nearestBrand(tok, tok.length <= 5 ? 1 : 2);
      if (nb && (!n || nb.d < n.d)) { out.push("__b" + nb.i); fixed.push([tok, BRANDS[nb.i]]); continue; }
      if (n) { out.push(LEX[n.word] || n.word); fixed.push([tok, n.word]); continue; }
      out.push(tok); unknown.push(tok);
    }
    let text = " " + out.join(" ") + " ";
    text = text.replace(/\bsize( size)+\b/g, "size").replace(/\bnot not\b/g, "not")
      .replace(/(\d+) 1000\b/g, (_, n) => String(+n * 1000));
    return { text: text.trim(), unknown, fixed };
  }
  const suggest = (w) => { if (!FUZZY) normalize(""); const n = nearest(normChars(w), 2); return n ? n.word : null; };

  /* ---------------- understanding a message ---------------- */
  const LOOSE = new Map();
  const loose = (re) => { if (!LOOSE.has(re)) LOOSE.set(re, new RegExp(re.source.split("\\b").join(""), re.flags)); return LOOSE.get(re); };
  function parse(raw, ctx) {
    const N = normalize(raw);
    const m = " " + N.text.replace(/[’']/g, "'") + " ";
    const AR = /[؀-ۿ]/.test(m);
    const T = (re) => re.test(m) || (AR && loose(re).test(m));
    const has = (tok) => m.includes(" " + tok + " ");
    const q = { raw, norm: N.text, unknown: N.unknown, fixed: N.fixed, cats: [], colors: [], notColors: [], occasion: null, max: null, min: null, sizes: [], fabric: null, brand: null, label: null,
      kids: /\b(kids?|girls?|child(ren)?|daughter|baby|toddler|بنت|بنات)\b/.test(m), men: has("menswear"), sale: /\b(sale|discount|offers?|deals?|cheap|cheaper|تخفيض)\b/.test(m),
      newIn: /\bnew arrivals\b|\bnew\b/.test(m), best: /\bbest\b/.test(m), modest: has("modest"), gift: has("gift"), measure: null, intent: "recommend" };
    for (const [re, c] of CAT_WORDS) if (T(re) && !q.cats.includes(c)) q.cats.push(c);
    for (const [c, re] of Object.entries(COLORS)) if (T(re)) q.colors.push(c);
    // "not black", "msh eswed", "من غير اسود" → leave that colour out
    for (const [c, re] of Object.entries(COLORS)) if (new RegExp("\\bnot\\s+(?:\\S+\\s+)?(?:" + re.source.replace(/\\b/g, "") + ")").test(m)) { q.notColors.push(c); q.colors = q.colors.filter((x) => x !== c); }
    for (const [k, o] of Object.entries(OCCASIONS)) if (T(o.re)) { q.occasion = k; break; }
    if (!q.occasion && /\b(engagement|party|interview|everyday|beach)\b/.test(m)) q.occasion = { engagement: "evening", party: "evening", interview: "work", everyday: "casual", beach: "summer" }[m.match(/\b(engagement|party|interview|everyday|beach)\b/)[1]];
    const num = (x) => parseFloat(String(x).replace(/,/g, ""));
    const between = m.match(/between\s*(?:le\s*)?([\d.]+)\s*(?:le\s*)?(?:and|-|to)\s*(?:le\s*)?([\d.]+)/);
    const under = m.match(/(?:under|below|less than|max(?:imum)?|up to|within|budget(?: is| of)?|for|<|اقل من)\s*(?:le\s*)?([\d.]+)/);
    const over = m.match(/(?:over|above|more than|min(?:imum)?|starting(?: at| from)?|>)\s*(?:le\s*)?([\d.]+)/);
    const around = m.match(/(?:around|about|approx(?:imately)?)\s*(?:le\s*)?([\d.]+)/);
    const priced = m.match(/(?:\ble\s*([\d.]+)\b|\b([\d.]+)\s*le\b)/);
    if (between) { q.min = num(between[1]); q.max = num(between[2]); if (q.min > q.max) [q.min, q.max] = [q.max, q.min]; }
    else if (around) { q.min = Math.round(num(around[1]) * 0.75); q.max = Math.round(num(around[1]) * 1.25); }
    else { if (under) q.max = num(under[1]); if (over) q.min = num(over[1]); if (!under && !over && priced) q.max = num(priced[1] || priced[2]); }
    if (q.max !== null && q.max < 50) q.max = null; // "for 2" is not a budget
    const sz = m.match(/\b(?:size|مقاس)\s*(?:is\s*)?()(xxs|xs|s|m|l|xl|2xl|xxl|3xl|4xl)\b/) || m.match(/\b(xxs|xs|s|m|l|xl|2xl|xxl|3xl)\b(?=\s*(size|$|\.|,|!|\?))/);
    if (sz) q.sizes.push((sz[2] || sz[1]).toUpperCase());
    const shoe = m.match(/\b(3[5-9]|4[0-3])\b/); if (shoe && (q.cats.includes("shoes") || /\bsize\s*(3[5-9]|4[0-3])\b/.test(m))) { q.sizes = q.sizes.filter((x) => x !== shoe[1]); q.sizes.push(shoe[1]); }
    // body measurements in cm → size from the site's own size guide
    const meas = {}; for (const k of ["bust", "waist", "hips"]) { const x = m.match(new RegExp("\\b" + k + "\\s*(?:is\\s*)?(\\d{2,3})")); if (x) meas[k] = +x[1]; }
    if (Object.keys(meas).length) q.measure = meas; else if (/\b(height|weight)\b/.test(m) || /\b1[4-9]\d\s*cm\b/.test(m)) q.measure = { hw: true };
    q.fabric = FABRICS.find((f) => m.includes(f)) || null;
    // a specific piece type narrows the category (e.g. "sneakers" within shoes, "coat" within outerwear)
    const SUB = [["sneaker", /sneakers?|كوتشي/], ["boot", /boots?|بوت/], ["loafer", /loafers?|لوفر/], ["heel", /heels?|pumps?|كعب/], ["sandal", /sandals?|صندل/], ["ballerina", /ballerinas?|flats?|باليرينا/], ["mule", /mules?|slippers?/],
      ["coat", /\bcoats?\b|بالطو|كوت/], ["trench", /trench/], ["blazer", /blazers?|بليزر/], ["jacket", /\bjackets?\b|جاكيت|جاكت/], ["cardigan", /cardigans?|كارديجان/], ["hoodie", /hoodies?|هودي/], ["sweater", /sweaters?|pullovers?|بلوفر/],
      ["jean", /\bjeans\b|جينز/], ["skirt", /skirts?|جيبة/], ["short", /\bshorts\b|شورت/], ["legging", /leggings?/], ["blouse", /blouses?|بلوزة/], ["shirt", /\bshirts?\b|قميص/], ["abaya", /abayas?|عباية/], ["kaftan", /kaftans?|قفطان/], ["clutch", /clutch/], ["tote", /\btotes?\b/], ["backpack", /backpacks?/]];
    for (const [stem, re] of SUB) if (re.test(m)) { q.sub = stem; break; }
    const bt = m.match(/__b(\d+)/);
    if (bt) { const b = BRANDS[+bt[1]]; if (b === "Malabisy") q.label = true; else q.brand = b; }
    const brands = BRANDS;
    if (!q.brand) q.brand = brands.find((b) => b !== "Malabisy" && !AMBIG.has(compact(b)) && normChars(b).length >= 3 && m.includes(" " + normChars(b).replace(/[^a-z0-9\u0621-\u064A]+/g, " ").trim() + " ")) || null;
    if (!q.brand) for (const w of m.trim().split(" ")) if (BRAND_WORDS.has(w) && BRAND_WORDS.get(w) !== "Malabisy") { q.brand = BRAND_WORDS.get(w); break; }
    if (/\b(malabisy label|your label|own label|in-house|label|ملابسي)\b/.test(m) || (/\bmalabisy\b/.test(m) && !/\b(sell|join)\b/.test(m))) q.label = true;
    if (q.men) q.kids = false;
    if (q.brand) q.label = null;
    const ob = m.match(/__o(\d+)/);
    const signal = !!(q.cats.length || q.colors.length || q.notColors.length || q.occasion || q.max || q.min || q.sizes.length || q.fabric || q.brand || q.label || q.sale || q.newIn || q.sub || q.kids || q.men || q.modest || q.gift || q.best);
    q.signal = signal;
    // service questions first: they have one right answer, taken from the site's own policies
    if (ob && !q.brand && !q.cats.length) { q.intent = "nobrand"; q.missing = OTHER_BRANDS[+ob[1]][0]; }
    else if (has("__track")) q.intent = "track";
    else if (has("__human")) q.intent = "human";
    else if (has("__payment")) q.intent = "payment";
    else if (has("__returns")) q.intent = "returns";
    else if (has("__delivery")) q.intent = "delivery";
    else if (has("__who")) q.intent = "who";
    else if (has("__offtopic") && !signal) q.intent = "offtopic";
    else if (q.measure) q.intent = "measure";
    else if (/\b(sell on|sell my|become a (seller|vendor)|vendor|seller|partner with|join (the )?marketplace)\b/.test(m)) q.intent = "sell";
    else if (/\b(compare|comparison|difference|vs\.?|versus|which is better|قارن|مقارنة|الفرق)\b/.test(m)) q.intent = "compare";
    else if (/\b(go(es)? with|match(es|ing)?|pair|complete (the|this|my) (look|outfit)|style (it|this)|outfit|look for|wear with|هيليق|يليق|يمشي مع|طقم كامل)\b/.test(m)) q.intent = "outfit";
    else if (/\b(what colou?rs?|which colou?rs?|colou?r (go|match)|الوان|ألوان|لون ايه)\b/.test(m) && q.colors.length && !q.cats.length) q.intent = "color";
    else if (/\b(size guide|my size|what size|which size|fit|sizing|size chart|size)\b/.test(m) && !q.cats.length && !q.sizes.length && !q.occasion) q.intent = "size";
    else if (/\b(fabric|material|made of|خامة|قماش)\b/.test(m) && q.fabric) q.intent = "fabric";
    else if (/\b(more|others?|else|another|غيرهم|تاني|كمان)\b/.test(m) && ctx.last && !q.cats.length) q.intent = "more";
    else if (/\b(my bag|cart|basket|الشنطة|السلة)\b/.test(m) && !q.colors.length) q.intent = "bag";
    else if (has("__help")) q.intent = "help";
    else if (q.gift) q.intent = "gift";
    else if (!signal && /\b(hello|good (morning|evening))\b/.test(m)) q.intent = "hello";
    else if (!signal && /\b(thank|thanks)\b/.test(m)) q.intent = "thanks";
    else if (!signal && has("__compliment")) q.intent = "compliment";
    else if (!signal && has("__yes")) q.intent = ctx.last ? "more" : "help";
    else if (!signal && has("__no")) q.intent = "no";
    else if (!signal && q.unknown.length && (/\b(brands?)\b/.test(m) || /\b(do you (have|sell|carry)|have you got|you have|carry)\b/.test(m) || /(^|\s)(عندكم|عندك|بتبيعوا|بتبيعو|fe|fi|في|3ndko|3andko|3ndku)(\s|$)/.test(normChars(raw)))) { q.intent = "nobrand"; q.missing = q.unknown[q.unknown.length - 1]; }
    else if (!signal && /\bbrands?\b/.test(m)) q.intent = "brands";
    else if (!signal) q.intent = "unknown";
    if (q.occasion && !q.cats.length && q.intent === "recommend") q.intent = "outfit";
    if (q.men && /^(recommend|outfit|gift|unknown)$/.test(q.intent) && !HAS_MEN) q.intent = "nomen";
    if (q.sizes[0] && SKILL("memory") && /\b(i('m| am)|my size is|i wear|wear|مقاسي)\b/.test(m)) { PROFILE.size = q.sizes[0]; saveProfile(); }
    return q;
  }

  /* ---------------- search & ranking ---------------- */
  function find(q, { limit = 6, exclude = new Set(), cats = q.cats } = {}) {
    const occ = q.occasion && OCCASIONS[q.occasion];
    const wantSize = q.sizes[0] || PROFILE.size;
    const gender = q.kids ? "Kids" : q.men ? "Men" : "Women";
    let rows = CAT.filter((r) => inStock(r) && !exclude.has(r.h) && r.g === gender && (cats.includes("home") || r.d !== "Homewear") && r.d !== "Socks");
    if (cats.length) rows = rows.filter((r) => cats.some((c) => CATS[c].test(r)));
    if (q.colors.length) rows = rows.filter((r) => q.colors.includes(colorOf(r)));
    if (q.notColors && q.notColors.length) rows = rows.filter((r) => !q.notColors.includes(colorOf(r)));
    if (q.newIn) { const fresh = rows.filter((r) => r.n); if (fresh.length) rows = fresh; }
    if (q.modest) rows = rows.filter((r) => !/\b(mini|crop|cropped|bodysuit|tank|cami|strapless|backless|bralette|shorts?|sleeveless|off[- ]shoulder)\b/.test(text(r)));
    if (q.max) rows = rows.filter((r) => r.p <= q.max);
    if (q.min) rows = rows.filter((r) => r.p >= q.min);
    if (q.fabric) rows = rows.filter((r) => text(r).includes(q.fabric));
    if (q.brand) rows = rows.filter((r) => r.v === q.brand);
    if (q.label) rows = rows.filter((r) => API.isOwn(r));
    if (q.sale) rows = rows.filter((r) => r.c);
    if (q.sub && cats.length === q.cats.length) { const narrowed = rows.filter((r) => text(r).includes(q.sub)); if (narrowed.length) rows = narrowed; }
    const score = (r) => (r.sb ? 3 : 0) + (r.i.length > 1 ? 1 : 0) + (r.n ? 1.5 : 0) + (occ && occ.words.test(text(r)) ? 4 : 0) + (wantSize && r.a.includes(wantSize) ? 2.5 : 0) + (q.sale ? off(r) / 25 : 0) + (API.isOwn(r) ? 0.8 : 0) + (q.modest && /\b(maxi|abaya|kaftan|long|wide|oversized|loose|modest|hijab|midi)\b/.test(text(r)) ? 3 : 0);
    rows = rows.map((r) => [score(r), r]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    // variety: at most 2 per brand and one colourway per model (titles differ only after the dash)
    const perBrand = {}, models = new Set(), out = [];
    for (const r of rows) {
      const model = r.v + "|" + r.t.split(/\s[–-]\s/)[0].toLowerCase().trim();
      if (models.has(model) || (perBrand[r.v] || 0) >= (q.brand || q.label ? 99 : 2)) continue;
      models.add(model); perBrand[r.v] = (perBrand[r.v] || 0) + 1; out.push(r); if (out.length >= limit) break;
    }
    return out;
  }

  /* complete outfit around an anchor piece (or an occasion): colour-harmonious, real stock */
  function outfit(anchor, q) {
    const occ = q.occasion && OCCASIONS[q.occasion];
    const a = anchor ? catOf(anchor) : null;
    let roles = occ ? [...occ.cats] : ["top", "bottom", "outer", "shoes", "bag"];
    if (a) {
      if (a === "dress" || a === "set") roles = ["outer", "shoes", "bag", "acc"];
      else if (a === "top" || a === "knit") roles = ["bottom", "outer", "shoes", "bag"];
      else if (a === "bottom") roles = ["top", "outer", "shoes", "bag"];
      else if (a === "outer") roles = ["top", "bottom", "shoes", "bag"];
      else if (a === "shoes") roles = ["bottom", "top", "bag"];
      else if (a === "bag") roles = ["top", "bottom", "shoes"];
      roles = roles.filter((r) => r !== a);
    }
    const base = anchor ? colorOf(anchor) : q.colors[0] || null;
    const palette = base ? HARMONY[base] || [...NEUTRAL] : null;
    const pieces = [], used = new Set(anchor ? [anchor.h] : []);
    let budgetLeft = q.max ? q.max - (anchor ? anchor.p : 0) : null;
    for (const role of roles.slice(0, 4)) {
      const sub = { ...q, cats: [role], colors: [], max: null, brand: null, label: null, sub: null, fabric: null, sale: false };
      let pool = find(sub, { limit: 40, exclude: used, cats: [role] });
      if (palette) pool = pool.filter((r) => { const c = colorOf(r); return !c || palette.includes(c) || NEUTRAL.has(c); }).sort((x, y) => (palette.includes(colorOf(y)) ? 1 : 0) - (palette.includes(colorOf(x)) ? 1 : 0));
      if (budgetLeft !== null) pool = pool.filter((r) => r.p <= Math.max(150, budgetLeft / Math.max(1, roles.length - pieces.length)) * 1.6);
      const pick = pool.find((r) => !pieces.some((p) => p.v === r.v)) || pool[0];
      const ROLE = { top: "Top", knit: "Knit", outer: "Layer", bottom: "Bottom", shoes: "Shoes", bag: "Bag", acc: "Accessory", dress: "Dress", set: "Set", home: "Homewear" };
      if (pick) { pieces.push(Object.assign({}, pick, { _role: ROLE[role] })); used.add(pick.h); if (budgetLeft !== null) budgetLeft -= pick.p; }
    }
    return { anchor, pieces, base, palette };
  }

  /* ---------------- UI ---------------- */
  const AVATAR = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#F3ECE3"/><path d="M14 64c2-11 9-17 18-17s16 6 18 17" fill="#141414"/><path d="M26 47l6 7 6-7" fill="#F3ECE3"/><ellipse cx="32" cy="31" rx="9.5" ry="11.5" fill="#E9C9AE"/><path d="M22.5 31c-.5-9 4-15 10-15 6.5 0 10.5 6 9.5 15-1-5-4-8.5-9.5-9.5-4 2.5-7.5 5-10 9.5z" fill="#2A1C15"/><circle cx="32" cy="13.5" r="5.6" fill="#2A1C15"/><path d="M29 34.5c1.8 1.4 4.2 1.4 6 0" stroke="#9C5B4E" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="28.4" cy="30.2" r="1" fill="#2A1C15"/><circle cx="35.6" cy="30.2" r="1" fill="#2A1C15"/><circle cx="22.4" cy="34.5" r="1.4" fill="#C9A24B"/><circle cx="41.6" cy="34.5" r="1.4" fill="#C9A24B"/></svg>`;
  const ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>',
  };
  const root = document.createElement("div");
  root.id = "mst-root";
  root.innerHTML = `
    <div class="mst-nudge" role="status"><span class="mst-nudge__t"></span><button type="button" data-mst="open">Ask the stylist</button></div>
    <button class="mst-launch" type="button" data-mst="open" aria-haspopup="dialog" aria-controls="mst-panel" aria-label="Open the Malabisy AI stylist">
      <span class="mst-avatar">${AVATAR}</span><span class="mst-launch__t"><b>${esc(AS.launcher || "AI Stylist")}</b><span>${AS.launcherSub ? esc(AS.launcherSub) : "Outfits, colours &amp; sizes"}</span></span>
    </button>
    <section class="mst-panel" id="mst-panel" role="dialog" aria-modal="false" aria-label="Malabisy AI stylist" hidden>
      <header class="mst-head"><span class="mst-avatar">${AVATAR}</span><div class="mst-head__t"><b>${esc(AS.name || "Malabisy Stylist")}</b><span>${esc(AS.subtitle || "Personal shopping assistant")}</span></div>
        <button class="mst-ibtn" type="button" data-mst="reset" aria-label="Start a new conversation">${ICON.reset}</button>
        <button class="mst-ibtn" type="button" data-mst="close" aria-label="Close the stylist">${ICON.x}</button></header>
      <div class="mst-log" aria-live="polite"></div>
      <div class="mst-tray"></div>
      <form class="mst-form"><label class="sr" for="mst-input">Message the stylist</label><input id="mst-input" autocomplete="off" placeholder="e.g. an office look under LE 2,000" maxlength="240"><button class="mst-send" type="submit" aria-label="Send">${ICON.send}</button></form>
      <p class="mst-note">Suggestions use live prices, colours and sizes from the Malabisy catalogue.</p>
    </section>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const log = $(".mst-log"), panel = $(".mst-panel"), input = $("#mst-input"), tray = $(".mst-tray");

  const state = { last: null, shown: new Set(), compare: [], sel: {}, history: [] };
  try { const saved = JSON.parse(sessionStorage.getItem("mst_chat") || "null"); if (saved) { state.history = saved.h || []; (saved.shown || []).forEach((h) => state.shown.add(h)); } } catch {}
  const persist = () => sessionStorage.setItem("mst_chat", JSON.stringify({ h: state.history.slice(-30), shown: [...state.shown].slice(-200) }));

  const priceHTML = (r) => `<span class="mst-p__price">${API.money(r.p)}${r.c ? `<s>${API.money(r.c)}</s> <em>−${off(r)}%</em>` : ""}</span>`;
  function productCard(r, role) {
    const sizes = r.s.length ? r.s.slice(0, 7) : ["One size"];
    const def = sizes.length === 1 ? sizes[0] : (PROFILE.size && r.a.includes(PROFILE.size) ? PROFILE.size : null);
    if (def && !state.sel[r.h]) state.sel[r.h] = def;
    const cmp = state.compare.includes(r.h);
    return `<article class="mst-p" data-h="${esc(r.h)}">
      <a class="mst-p__img" href="product.html?h=${encodeURIComponent(r.h)}"><img src="${API.img(r.i[0], 360)}" alt="${esc(r.t)}" loading="lazy">${role ? `<span class="mst-p__role">${esc(role)}</span>` : ""}</a>
      <div class="mst-p__b"><span class="mst-p__brand">${esc(r.v)}${API.isOwn(r) ? " · Label" : ""}</span><a class="mst-p__title" href="product.html?h=${encodeURIComponent(r.h)}">${esc(r.t)}</a>${priceHTML(r)}
        <div class="mst-p__sizes" role="group" aria-label="Size">${sizes.map((s) => `<button type="button" data-size="${esc(s)}" aria-pressed="${state.sel[r.h] === s}" ${sizes.length === 1 || r.a.includes(s) ? "" : "disabled"}>${esc(s)}</button>`).join("")}</div>
        <div class="mst-p__act"><button type="button" class="mst-btn mst-btn--dark" data-mst="add">Add</button><button type="button" class="mst-btn mst-btn--ghost" data-mst="cmp" aria-pressed="${cmp}">${cmp ? "Added" : "Compare"}</button></div></div>
    </article>`;
  }
  function rail(rows, roles) { rows.forEach((r) => state.shown.add(r.h)); return `<div class="mst-rail">${rows.map((r, i) => productCard(r, roles ? roles[i] : null)).join("")}</div>`; }
  function add(kind, html, store = true) {
    const el = document.createElement("div");
    el.className = `mst-msg mst-msg--${kind}${/mst-rail|mst-cmp/.test(html) ? " mst-msg--wide" : ""}`;
    el.innerHTML = kind === "me" ? `<div class="mst-bubble">${html}</div>` : html.startsWith("<div class=\"mst-") || html.startsWith("<table") ? html : `<div class="mst-bubble">${html}</div>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    if (store) { state.history.push([kind, html]); persist(); }
    return el;
  }
  const chips = (list) => `<div class="mst-chips">${list.map((c) => `<button type="button" class="mst-chip" data-say="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
  const fmtList = (arr) => arr.length < 2 ? arr.join("") : arr.slice(0, -1).join(", ") + " and " + arr.slice(-1);

  /* ---------------- conversation ---------------- */
  const current = () => (page === "product" ? API.byHandle(API.params.get("h")) : null);
  function greet() {
    const p = current();
    const bag = API.bag();
    let hi = "Hi, I’m your Malabisy stylist. Tell me the occasion, a colour or a budget, and I’ll build looks from pieces that are in stock right now. You can write in English, Arabic or Franco.";
    if (AS.greeting) hi = esc(AS.greeting);
    let opts = ["Office look under LE 2,000", "Wedding guest outfit", "What goes with brown?", "Winter coats on sale"];
    if (AS.chips && AS.chips.length) opts = AS.chips.slice(0, 6);
    if (p) { hi = `Styling the <b>${esc(p.t)}</b>? I can complete the look, suggest colours that work with it, or compare it with similar pieces.`; opts = ["Complete this look", "Similar but cheaper", "What colours go with it?", "Compare with similar"]; }
    else if (bag.length) { opts.unshift("What goes with my bag?"); }
    add("bot", hi + chips(opts), false);
  }
  function respond(raw) {
    const q = parse(raw, state);
    const p = current();
    const m = raw.toLowerCase() + " | " + q.norm;
    // follow-up refinement keeps context from the previous request
    if (state.last && (q.intent === "more" || (q.intent === "recommend" && !q.cats.length && !q.occasion && (q.colors.length || q.notColors.length || q.max || q.min || q.sale || q.fabric || q.sizes.length || q.newIn || q.modest)))) {
      const prev = state.last;
      if (/cheaper|less|ارخص|أرخص/.test(m) && !q.max) q.max = Math.max(150, Math.round((prev.lastAvg || 1500) * 0.75));
      q.cats = q.cats.length ? q.cats : prev.cats; q.occasion = q.occasion || prev.occasion; q.colors = q.colors.length ? q.colors : prev.colors;
      q.max = q.max ?? prev.max; q.min = q.min ?? prev.min; q.brand = q.brand || prev.brand; q.label = q.label ?? prev.label;
      q.men = q.men || prev.men; q.kids = q.kids || prev.kids; q.modest = q.modest || prev.modest; q.sub = q.sub || prev.sub;
      if (!q.colors.length && prev.notColors) q.notColors = [...new Set([...(prev.notColors || []), ...q.notColors])];
      if (q.intent === "more") q.intent = prev.intent === "outfit" ? "outfit" : "recommend";
    }
    if (/complete this look|this look|style (it|this)|goes with (it|this)/.test(m) && p) return doOutfit(p, q);
    if (/similar/.test(m) && p) { const qq = { ...q, cats: [catOf(p)].filter(Boolean), colors: [], max: /cheaper/.test(m) ? Math.round(p.p * 0.85) : q.max }; return doRecommend(qq, `Pieces similar to the ${esc(p.t)}${qq.max ? ` under ${API.money(qq.max)}` : ""}:`, new Set([p.h])); }
    if (/colou?rs? go with (it|this)/.test(m) && p) { q.colors = [colorOf(p)].filter(Boolean); return doColor(q, p); }
    if (/compare with similar/.test(m) && p) { const sim = find({ ...q, cats: [catOf(p)].filter(Boolean), colors: [] }, { limit: 2, exclude: new Set([p.h]) }); return doCompare([p, ...sim].slice(0, 3)); }
    logMsg(raw, q);
    const OFF = () => add("bot", REPLY("off", "That isn’t something I can help with here. I can suggest pieces by type, colour or budget.") + chips(["Show me new arrivals", "Best offers right now"]));
    if (!SKILL("brands") && (q.intent === "brands" || q.intent === "nobrand")) return OFF();
    if (!SKILL("brands")) q.brand = null;
    if (!SKILL("outfits") && (q.intent === "outfit" || q.intent === "bag")) q.intent = "recommend";
    if (!SKILL("colors") && q.intent === "color") q.intent = "recommend";
    if (!SKILL("compare") && q.intent === "compare") return OFF();
    if (!SKILL("sizes") && (q.intent === "size" || q.intent === "measure")) return OFF();
    if (!SKILL("policies") && /^(delivery|returns|payment|track|human|sell)$/.test(q.intent)) return OFF();
    if (!SKILL("gifts") && q.intent === "gift") q.intent = "recommend";
    const taught = (AS.qa || []).find((x) => x && x.answer && String(x.keys || "").split(",").map((k) => normChars(k).trim()).filter(Boolean).some((k) => normChars(raw).includes(k) || q.norm.includes(k)));
    if (taught) { add("bot", esc(taught.answer).replace(/\n/g, "<br>")); return; }
    switch (q.intent) {
      case "hello": add("bot", REPLY("hello", "Hello! What are you shopping for today: an occasion, a piece, or a colour you love?") + chips(["Casual weekend look", "Eid outfit", "Black dress under LE 1,500", "Shoes for an office look"])); return;
      case "thanks": add("bot", REPLY("thanks", "With pleasure. Anything else I can style for you?") + chips(["Show me new arrivals", "Best offers right now"])); return;
      case "compliment": add("bot", REPLY("compliment", "Glad you like it! Want more like this, or shall I build a full look?") + chips(state.last ? ["Show more", "Complete a look", "Show cheaper options"] : ["Show me new arrivals", "Office look", "Casual weekend look"])); return;
      case "no": add("bot", REPLY("no", "No problem. Tell me what you’d prefer: a different colour, a lower budget, or another kind of piece.") + chips(["Show cheaper options", "Different colour", "Show me new arrivals"])); return;
      case "help": case "who":
        add("bot", (q.intent === "who" ? REPLY("who", "I’m the Malabisy stylist, a shopping assistant that only suggests pieces that are in stock right now.") + " " : "") +
          REPLY("help", "I can find pieces by type, colour, size or budget, build a complete outfit for an occasion, suggest colours that match, compare pieces, and answer questions about sizes, delivery, exchanges and payment. You can write in English, Arabic or Franco.") +
          chips(["Office look under LE 2,000", "فستان اسود للفرح", "3ayza jacket shetwy", "How long does delivery take?"])); return;
      case "delivery": add("bot", REPLY("delivery", `Malabisy delivers across Egypt, with fast delivery in Cairo &amp; Giza. Delivery takes <b>${esc(POL.days)} working days</b>, and it’s <b>free on orders over ${API.money(POL.free)}</b>.`) + chips(["How can I pay?", "Exchange policy", "Best offers right now"])); return;
      case "returns": add("bot", REPLY("returns", `Items can be <b>exchanged within ${POL.exch} days</b> in their original condition. You’ll find <b>Returns &amp; exchanges</b> under Customer care at the bottom of every page.`) + chips(["How long does delivery take?", "What size am I?"])); return;
      case "payment": add("bot", REPLY("payment", `You can pay by ${POL.pays.length ? POL.pays.map((p) => `<b>${esc(p)}</b>`).join(", ").replace(/, (?=[^,]*$)/, ", or ") : "<b>cash on delivery</b>"}. You choose at the payment step of checkout.`) + chips(["How long does delivery take?", "Exchange policy"])); return;
      case "track": add("bot", REPLY("track", "Your orders and their status are in <a href=\"account.html#orders\">My account → Orders</a>, where you can also tap <b>Buy again</b>.") + chips(["How long does delivery take?", "Exchange policy"])); return;
      case "human": add("bot", REPLY("human", "I can’t connect you to a person from this chat. The <b>Customer care</b> links at the bottom of every page cover order tracking, delivery and returns &amp; exchanges. I’m happy to help with anything about pieces, sizes or outfits.") + chips(["Track my order", "Exchange policy", "How can I pay?"])); return;
      case "offtopic": add("bot", REPLY("offtopic", "That’s outside what I can help with here. I’m best at outfits, sizes, colours, delivery and payment.") + chips(["Casual weekend look", "Best offers right now", "What size am I?"])); return;
      case "sell": add("bot", REPLY("sell", "Brands can join the Marketplace through <a href=\"sell.html\">Sell on Malabisy</a>: Malabisy handles delivery and payments, and the partnerships team replies within two working days.")); return;
      case "measure": return doMeasure(q);
      case "brands": {
        const top = BRANDS.filter((b) => b !== "Malabisy").map((b) => [b, CAT.filter((r) => r.v === b && r.g !== "Men").length]).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x[0]);
        add("bot", "Malabisy carries the <b>Malabisy Label</b> and <b>" + (BRANDS.length - 1) + " partner brands</b>. Name any brand, in English or Arabic, and I'll show what's in stock, or see them all on <a href=\"brands.html\">Brands A–Z</a>." + chips(top));
        return;
      }
      case "nobrand": {
        const top = BRANDS.filter((b) => b !== "Malabisy").map((b) => [b, CAT.filter((r) => r.v === b).length]).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]);
        add("bot", REPLY("nobrand", "I couldn't find a brand called “" + esc(q.missing) + "” on Malabisy. These brands are available, or browse <a href=\"brands.html\">Brands A–Z</a>:", { brand: q.missing }) + chips(top));
        return;
      }
      case "nomen": add("bot", REPLY("nomen", "Malabisy currently carries womenswear and kids’ pieces only, so I can’t suggest menswear. If it’s a gift, bags and accessories are an easy choice.") + chips(["Gift ideas under LE 1,000", "Kids’ shoes"])); return;
      case "gift": {
        const qq = { ...q, cats: q.cats.length ? q.cats : ["bag", "acc", "knit"], intent: "recommend" };
        return doRecommend(qq, `Gift ideas${qq.max ? ` under ${API.money(qq.max)}` : ""}: pieces that are easy to get right without knowing an exact size.`);
      }
      case "unknown": {
        const words = q.unknown.length ? q.unknown : raw.trim().split(/\s+/);
        const guess = words.map(suggest).filter(Boolean)[0];
        const guessLabel = guess && (LEX[guess] || guess);
        add("bot", REPLY("unknown", `Sorry, I didn’t understand “${esc(raw.trim().slice(0, 40))}”.`, { word: raw.trim().slice(0, 40) }) + ` ${guessLabel && !/^_/.test(guessLabel) ? `Did you mean <b>${esc(guessLabel)}</b>? ` : ""}${REPLY("unknownHint", "Tell me a piece, a colour, an occasion or a budget, in English, Arabic or Franco.")}` +
          chips([...(guessLabel && !/^_/.test(guessLabel) ? [guessLabel[0].toUpperCase() + guessLabel.slice(1)] : []), "Office look under LE 2,000", "فستان للفرح", "Winter coats on sale"]));
        return;
      }
      case "size": return doSize(q);
      case "fabric": return doFabric(q);
      case "color": return doColor(q);
      case "compare": return state.compare.length >= 2 ? doCompare(state.compare.map(API.byHandle).filter(Boolean)) : add("bot", "Tap <b>Compare</b> on two or three pieces and I’ll put them side by side: price, discount, sizes in stock and more.");
      case "bag": return doBag();
      case "outfit": {
        const anchorHint = q.cats.length ? find({ ...q }, { limit: 1, exclude: state.shown })[0] : null;
        if (/with (my|the|this) (\w+ )?(jacket|coat|dress|trousers?|jeans|skirt|top|shirt|bag|shoes|boots)/.test(m) && p) return doOutfit(p, q);
        if (/go(es)? with|match|pair/.test(m) && q.colors.length && !q.cats.length) return doColor(q);
        return doOutfit(anchorHint, q);
      }
      default: return doRecommend(q);
    }
  }
  function doRecommend(q, title, exclude = new Set(state.shown)) {
    let rows = find(q, { limit: Math.max(2, Math.min(12, +AS.limit || 6)), exclude });
    if (!rows.length && exclude.size) rows = find(q, { limit: 6 });
    state.last = { ...q, intent: "recommend", lastAvg: rows.length ? rows.reduce((a, r) => a + r.p, 0) / rows.length : null };
    if (!rows.length) {
      const relaxed = find({ ...q, colors: [], fabric: null, sizes: [] }, { limit: 6 });
      if (relaxed.length) { add("bot", `I couldn’t find an exact match${q.max ? ` under ${API.money(q.max)}` : ""}${q.colors.length ? ` in ${fmtList(q.colors)}` : ""}. These are the closest pieces in stock:`); add("bot", rail(relaxed)); return; }
      add("bot", "Nothing in stock matches that yet. Try a different colour, category or budget." + chips(["Show me new arrivals", "Best offers right now"])); return;
    }
    const bits = [q.colors.length && fmtList(q.colors), q.fabric, q.cats.length && fmtList(q.cats.map((c) => CATS[c].label)), q.occasion && `for ${{ work: "work", evening: "a wedding or evening", casual: "casual days", eid: "Eid", uni: "university", date: "a date", travel: "travel", winter: "winter", summer: "summer", gym: "the gym" }[q.occasion]}`, q.modest && "modest", q.newIn && "new in", q.notColors && q.notColors.length && `not ${fmtList(q.notColors)}`, q.brand && `from ${q.brand}`, q.label && "from the Malabisy Label", q.max && `under ${API.money(q.max)}`, q.sale && "on sale"].filter(Boolean);
    add("bot", (title || `Here are ${rows.length} pieces${bits.length ? " — " + bits.join(", ") : ""}, all in stock:`) + (PROFILE.size ? ` <span style="color:var(--grey-700)">(sizes shown for ${esc(PROFILE.size)} first)</span>` : ""));
    add("bot", rail(rows));
    if (q.brand) add("bot", "See everything from <a href=\"brand.html?b=" + q.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "\">" + esc(q.brand) + "</a>.");
    const cross = rows[0] && catOf(rows[0]);
    const next = cross === "dress" ? ["Shoes to go with it", "A bag to match"] : cross === "bottom" ? ["Tops to pair with these", "Shoes for this"] : cross === "outer" ? ["What to wear underneath", "Boots for this"] : ["Complete a look", "Show cheaper options"];
    add("bot", "Want me to style any of these?" + chips([...next, "Show more"]));
  }
  function doOutfit(anchor, q) {
    const look = outfit(anchor, q);
    state.last = { ...q, intent: "outfit" };
    if (!look.pieces.length) { add("bot", "I couldn’t build a complete look from what’s in stock for that. Tell me a colour or a piece to start from."); return; }
    const occ = q.occasion && OCCASIONS[q.occasion];
    const intro = anchor
      ? `Here’s a complete look built around the <b>${esc(anchor.t)}</b>${look.base ? ` (${look.base})` : ""}${look.palette ? `: I kept to ${fmtList(look.palette.slice(0, 3))} and neutrals so the colours stay calm and intentional` : ""}.`
      : `A ${occ ? occ.tone + " " : ""}look${q.occasion ? ` for ${q.occasion === "uni" ? "university" : q.occasion}` : ""}${q.max ? ` within about ${API.money(q.max)}` : ""}${look.base ? `, built around ${look.base}` : ""}:`;
    const all = anchor ? [anchor, ...look.pieces] : look.pieces;
    const roles = all.map((r, i) => (anchor && i === 0 ? "Your piece" : r._role || ""));
    add("bot", intro);
    add("bot", rail(all, roles));
    const extra = look.pieces.filter((r) => !anchor || r.h !== anchor.h);
    const total = extra.reduce((a, r) => a + r.p, 0);
    const fab = all.map(fabricOf).filter(Boolean);
    const tip = fab.length ? `<br><br>Styling note: ${esc(fab[0])} is ${FABRIC_NOTE[fab[0]] || "a good textural anchor"}.` : "";
    add("bot", `<div class="mst-bubble">The ${extra.length} added piece${extra.length === 1 ? "" : "s"} come to <b>${API.money(total)}</b>${q.max && total > q.max ? " (a little over budget; ask for “cheaper” and I’ll swap pieces)" : ""}. Pick sizes on each card, or add the whole look.${tip}</div>` +
      `<div class="mst-total"><span>Full look · ${API.money(total)}</span><button type="button" class="mst-btn mst-btn--dark" data-mst="addall" data-hs="${esc(extra.map((r) => r.h).join(","))}">Add look</button></div>` + chips(["Swap for cheaper", "Different colour", "Show more"]));
  }
  function doColor(q, piece) {
    const c = q.colors[0];
    if (!c || !HARMONY[c]) { add("bot", "Tell me the colour you want to match, e.g. “what goes with olive?”."); return; }
    const pal = HARMONY[c].filter((x) => x !== c).slice(0, 5);
    const rows = find({ ...q, colors: pal, cats: q.cats.length ? q.cats : [] }, { limit: 6, exclude: new Set(piece ? [piece.h] : []) });
    state.last = { ...q, colors: pal, intent: "recommend" };
    add("bot", `<b>${c[0].toUpperCase() + c.slice(1)}</b> works best with ${fmtList(pal)}. ${NEUTRAL.has(c) ? "As a neutral it also carries one bold accent piece well." : "Let it be the one statement colour and keep the rest neutral."} Pieces in those shades:`);
    if (rows.length) add("bot", rail(rows));
  }
  function doCompare(items) {
    items = items.filter(Boolean).slice(0, 3);
    if (items.length < 2) { add("bot", "I need at least two pieces to compare."); return; }
    const best = (fn, lowWins = true) => { const v = items.map(fn); const t = lowWins ? Math.min(...v) : Math.max(...v); return (i) => v[i] === t && v.filter((x) => x === t).length === 1; };
    const cheap = best((r) => r.p), disc = best((r) => off(r), false), sizes = best((r) => r.a.length, false);
    const row = (label, fn, win) => `<tr><th>${label}</th>${items.map((r, i) => `<td class="${win && win(i) ? "mst-win" : ""}">${fn(r)}</td>`).join("")}</tr>`;
    const html = `<table class="mst-cmp"><tr><th></th>${items.map((r) => `<td><a href="product.html?h=${encodeURIComponent(r.h)}"><img src="${API.img(r.i[0], 200)}" alt=""></a></td>`).join("")}</tr>
      ${row("Piece", (r) => esc(r.t))}${row("Brand", (r) => esc(r.v) + (API.isOwn(r) ? " (Label)" : ""))}${row("Price", (r) => API.money(r.p), cheap)}
      ${row("Discount", (r) => (r.c ? `−${off(r)}% (was ${API.money(r.c)})` : "—"), disc)}${row("In stock", (r) => esc(sizesText(r)), sizes)}
      ${row("Colour", (r) => esc(r.k.join(", ") || colorOf(r) || "—"))}${row("Category", (r) => esc(r.ty || r.d))}${row("Material", (r) => esc(fabricOf(r) || "not stated"))}</table>`;
    add("bot", "Side by side (highlighted where one clearly wins):");
    add("bot", html);
    const cheapest = items.reduce((a, b) => (a.p <= b.p ? a : b));
    const mostSizes = items.reduce((a, b) => (a.a.length >= b.a.length ? a : b));
    add("bot", `The <b>${esc(cheapest.t)}</b> is the best value at ${API.money(cheapest.p)}${mostSizes.h !== cheapest.h ? `, while the <b>${esc(mostSizes.t)}</b> has the most sizes in stock` : ""}.`);
    state.compare = []; renderTray();
  }
  function doSize(q) {
    add("bot", `I go by the sizes each brand has in stock. ${PROFILE.size ? `I have you as size <b>${esc(PROFILE.size)}</b>; tell me if that changed.` : "Tell me your usual size (e.g. “I’m a size M”) and I’ll show what’s available in it first."} You can also send your measurements in cm (e.g. “bust 90, waist 72, hips 98”) and I’ll match them to the size guide. Or open the <a href="#" data-sizeguide="Clothing">clothing size guide</a> or the <a href="#" data-sizeguide="Footwear">shoe size guide</a>. Between sizes, size up; fit varies by brand.`);
  }
  // the same table the site's size guide shows (bust / waist / hips in cm)
  const SIZE_TABLE = [["S", [84, 88], [66, 70], [90, 94]], ["M", [88, 94], [70, 76], [94, 100]], ["L", [94, 100], [76, 82], [100, 106]], ["XL", [100, 106], [82, 88], [106, 112]], ["2XL", [106, 114], [88, 96], [112, 120]]];
  function doMeasure(q) {
    const ms = q.measure;
    if (ms.hw) { add("bot", "I can’t tell a size reliably from height or weight alone. Send your bust, waist and hips in cm (e.g. “bust 90, waist 72, hips 98”) and I’ll match them to the Malabisy size guide." + chips(["Bust 90, waist 72, hips 98"])); return; }
    const col = { bust: 1, waist: 2, hips: 3 }, parts = [];
    let idx = -1, below = false, above = false;
    for (const [k, v] of Object.entries(ms)) {
      let i = SIZE_TABLE.findIndex((row) => v <= row[col[k]][1]);
      if (i === -1) { i = SIZE_TABLE.length - 1; above = true; }
      if (v < SIZE_TABLE[0][col[k]][0]) below = true;
      parts.push(`${k} ${v} cm → ${SIZE_TABLE[i][0]}`); idx = Math.max(idx, i);
    }
    const size = SIZE_TABLE[idx][0];
    if (SKILL("memory")) { PROFILE.size = size; saveProfile(); }
    add("bot", `From the size guide: ${parts.join(", ")}. I’d go with <b>${size}</b>${Object.keys(ms).length > 1 ? " (the largest of your measurements decides, so nothing feels tight)" : ""}.${below ? " You measure below our smallest size; S may feel roomy, so check XS where a brand offers it." : ""}${above ? " You measure above 2XL on the guide; check each brand’s sizes on the product page." : ""} I’ll show pieces in ${size} first from now on. Fit varies by brand.` +
      chips([`Office look in size ${size}`, "Show me new arrivals"]));
  }
  function doFabric(q) {
    const rows = find(q, { limit: 6 });
    add("bot", `${q.fabric[0].toUpperCase() + q.fabric.slice(1)} is ${FABRIC_NOTE[q.fabric] || "a lovely texture to build a look around"}. ${rows.length ? "Pieces whose product name lists it:" : "I don’t see any in stock with that in the name right now."}`);
    if (rows.length) add("bot", rail(rows));
  }
  function doBag() {
    const bag = API.bag().map((x) => API.byHandle(x.h)).filter(Boolean);
    if (!bag.length) { add("bot", "Your bag is empty. Want a starting point?" + chips(["New arrivals", "Best offers right now", "Office look"])); return; }
    const anchor = bag[bag.length - 1];
    add("bot", `You have ${bag.length} piece${bag.length > 1 ? "s" : ""} in your bag. Here’s what completes the latest one, the <b>${esc(anchor.t)}</b>:`);
    doOutfit(anchor, { cats: [], colors: [], occasion: null, max: null, sizes: [], sale: false });
  }
  function upsellAfterAdd(r) {
    if (!SKILL("crossSell")) return;
    const c = catOf(r);
    const want = { dress: "shoes", bottom: "top", top: "bottom", knit: "bottom", outer: "top", shoes: "bag", bag: "shoes", set: "shoes" }[c] || "bag";
    const palette = HARMONY[colorOf(r)] || null;
    let rows = find({ cats: [want], colors: [], sizes: [], sale: false }, { limit: 20, exclude: new Set([r.h, ...state.shown]) });
    if (palette) rows = rows.filter((x) => !colorOf(x) || palette.includes(colorOf(x)) || NEUTRAL.has(colorOf(x)));
    rows = rows.slice(0, 4);
    if (rows.length) { add("bot", `Added. ${CATS[want].label[0].toUpperCase() + CATS[want].label.slice(1)} that go with it:`); add("bot", rail(rows)); }
  }

  /* ---------------- compare tray ---------------- */
  function renderTray() {
    tray.classList.toggle("mst-on", state.compare.length > 0);
    tray.innerHTML = state.compare.map((h) => { const r = API.byHandle(h); return r ? `<img src="${API.img(r.i[0], 80)}" alt="${esc(r.t)}">` : ""; }).join("") +
      `<span>${state.compare.length}/3 to compare</span><button type="button" class="mst-btn mst-btn--dark" data-mst="docmp" ${state.compare.length < 2 ? "disabled" : ""}>Compare</button>`;
    log.querySelectorAll('[data-mst="cmp"]').forEach((b) => { const h = b.closest(".mst-p").dataset.h; const on = state.compare.includes(h); b.setAttribute("aria-pressed", on); b.textContent = on ? "Added" : "Compare"; });
  }

  /* ---------------- events ---------------- */
  let opened = false;
  const phone = matchMedia("(max-width: 600px)");
  const vv = window.visualViewport;
  const fitSheet = () => {
    if (!phone.matches || !root.classList.contains("mst-open") || !vv) { panel.style.removeProperty("--mst-h"); panel.style.removeProperty("--mst-b"); return; }
    panel.style.setProperty("--mst-h", vv.height + "px");
    panel.style.setProperty("--mst-b", Math.max(0, innerHeight - vv.height - vv.offsetTop) + "px");
    log.scrollTop = log.scrollHeight;
  };
  if (vv) { vv.addEventListener("resize", fitSheet); vv.addEventListener("scroll", fitSheet); }
  const lockPage = (on) => document.documentElement.classList.toggle("mst-lock", on && phone.matches);
  function openPanel() {
    root.classList.add("mst-open"); panel.hidden = false; lockPage(true); fitSheet(); $(".mst-nudge").classList.remove("mst-on");
    if (!opened) { opened = true; if (state.history.length) state.history.forEach(([k, h]) => add(k, h, false)); else greet(); }
    if (!phone.matches) setTimeout(() => input.focus(), reduce ? 0 : 250);
  }
  function closePanel() { root.classList.remove("mst-open"); lockPage(false); input.blur(); fitSheet(); setTimeout(() => { if (!root.classList.contains("mst-open")) panel.hidden = true; }, 400); if (!phone.matches) $(".mst-launch").focus(); }
  function send(textIn) {
    const t = textIn.trim(); if (!t) return;
    add("me", esc(t));
    const typing = add("bot", '<div class="mst-typing" aria-label="Stylist is typing"><i></i><i></i><i></i></div>', false);
    setTimeout(() => { typing.remove(); try { respond(t); } catch (e) { console.error("[stylist]", e); add("bot", "Sorry, I couldn’t work that out. Try rephrasing, e.g. “black boots under LE 2,000”."); } }, reduce ? 50 : 420);
  }
  root.addEventListener("click", (e) => {
    const t = e.target.closest("button, a"); if (!t) return;
    const act = t.dataset.mst;
    if (act === "open") return openPanel();
    if (act === "close") return closePanel();
    if (act === "reset") { state.history = []; state.last = null; state.shown.clear(); state.compare = []; persist(); log.innerHTML = ""; renderTray(); greet(); return; }
    if (t.dataset.say) return send(t.dataset.say);
    if (t.dataset.sizeguide !== undefined) return; // handled by the site's own size-guide listener
    const card = t.closest(".mst-p");
    if (t.dataset.size && card) { state.sel[card.dataset.h] = t.dataset.size; card.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", b === t)); return; }
    if (act === "add" && card) {
      const r = API.byHandle(card.dataset.h), size = state.sel[r.h];
      if (!size) { card.querySelector(".mst-p__sizes").animate?.([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 260 }); add("bot", `Pick a size for the <b>${esc(r.t)}</b> first (in stock: ${esc(sizesText(r))}).`); return; }
      API.addToBag(r.h, size); t.textContent = "Added ✓"; upsellAfterAdd(r); return;
    }
    if (act === "addall") {
      const hs = (t.dataset.hs || "").split(",").filter(Boolean), missing = [];
      hs.forEach((h) => { const r = API.byHandle(h); const size = state.sel[h] || (r.s.length <= 1 ? r.s[0] || "One size" : (PROFILE.size && r.a.includes(PROFILE.size) ? PROFILE.size : null)); if (size) API.addToBag(h, size); else missing.push(r.t); });
      if (missing.length) add("bot", `Added the rest. Choose a size for ${missing.map((x) => `<b>${esc(x)}</b>`).join(" and ")} on its card, then tap Add.`); else { t.textContent = "Added ✓"; add("bot", "The whole look is in your bag. <a href=\"bag.html\">Go to checkout</a> or keep styling."); }
      return;
    }
    if (act === "cmp" && card) { const h = card.dataset.h; state.compare = state.compare.includes(h) ? state.compare.filter((x) => x !== h) : [...state.compare, h].slice(-3); renderTray(); return; }
    if (act === "docmp") return doCompare(state.compare.map(API.byHandle));
  });
  $(".mst-form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; if (phone.matches) input.blur(); send(v); });
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("mst-open")) { e.stopPropagation(); closePanel(); } });

  /* ---------------- stay out of the way of the shop ---------------- */
  let queueDodge = () => {};
  const satc = document.getElementById("satc");
  const sync = () => {
    const blocking = document.querySelector(".drawer.open, .search.open, .modal.open, .mnav.open, .lightbox.open, .filters.open");
    root.classList.toggle("mst-hidden", !!blocking && !root.classList.contains("mst-open"));
    root.classList.toggle("mst-lift", !!(satc && satc.classList.contains("show")));
    queueDodge();
  };
  new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  sync();
  // dodge: never sit on top of a shop control (buttons, fields, small links); large image tiles are ignored
  const launcher = $(".mst-launch");
  let dodgeRaf = 0;
  const dodge = () => {
    dodgeRaf = 0;
    if (root.classList.contains("mst-open")) return root.classList.remove("mst-dodge");
    if (phone.matches || matchMedia("(hover: none)").matches) return root.classList.remove("mst-dodge");
    // exact rectangle test against every visible shop control near the launcher's corner
    const r = launcher.getBoundingClientRect(), pad = 6;
    const L = r.left - pad, R = r.right + pad, T = r.top - pad, B = r.bottom + pad;
    let hit = false;
    for (const ctl of document.querySelectorAll("button, input, select, textarea, label, a")) {
      if (root.contains(ctl)) continue;
      const b = ctl.getBoundingClientRect();
      if (b.right < L || b.left > R || b.bottom < T || b.top > B || !b.width || b.width * b.height >= 200 * 200) continue;
      const st = getComputedStyle(ctl);
      if (st.visibility === "hidden" || +st.opacity === 0 || st.pointerEvents === "none") continue;
      hit = true; break;
    }
    root.classList.toggle("mst-dodge", hit);
  };
  queueDodge = () => { if (!dodgeRaf) dodgeRaf = requestAnimationFrame(dodge); };
  addEventListener("scroll", queueDodge, { passive: true });
  addEventListener("resize", queueDodge);
  // pages re-render without scrolling (checkout steps, filters, account tabs): re-check when the shop's DOM changes
  const app = document.getElementById("app");
  if (app) new MutationObserver(queueDodge).observe(app, { childList: true, subtree: true });
  setTimeout(queueDodge, 600);

  /* gentle, one-time contextual nudge (once per session, after the shopper has looked around) */
  if (SKILL("nudge") && !sessionStorage.getItem("mst_nudged")) setTimeout(() => {
    if (root.classList.contains("mst-open")) return;
    const p = current();
    $(".mst-nudge__t").innerHTML = p ? `Not sure what to wear with the <b>${esc(p.t.split("–")[0].trim())}</b>? I can style it.` : "Need an outfit for an occasion? I can build a look from what’s in stock.";
    $(".mst-nudge").classList.add("mst-on"); sessionStorage.setItem("mst_nudged", "1");
    setTimeout(() => $(".mst-nudge").classList.remove("mst-on"), 9000);
  }, page === "product" ? 6000 : 12000);

  window.MLB_STYLIST = { parse, normalize, find, outfit, respond: (t) => send(t), open: openPanel, close: closePanel, _state: state };
})();
