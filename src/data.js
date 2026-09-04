/* RBUBANK — demo ledger.
   Everything on this screen is generated from one deterministic seed, so the
   numbers a demo shows today are the numbers it shows on stage tomorrow.
   No server, no network: the whole bank is a pure function plus localStorage. */

window.RBU = window.RBU || {};
(function (NS) {
  "use strict";

  var TODAY = new Date(Date.UTC(2026, 8, 2)); // 2 Sep 2026 — end of the demo year

  /* ------------------------------------------------------------- profile */

  var profile = {
    firstName: "Denis",
    lastName: "Reshetov",
    initials: "DR",
    handle: "@denis.r",
    plan: "Metal",
    memberSince: "March 2024",
    email: "denis@rbubank.app",
    phone: "+357 96 ••• 412",
    address: "12 Amathountos Ave, Limassol, Cyprus",
    kyc: "Verified",
    iban: "GB29 RBUB 6016 1331 9268 19",
    bic: "RBUBGB2LXXX",
    accountNumber: "19268 19",
    sortCode: "60-16-13",
    routing: "026073150",
    bankAddress: "RBUBANK, 1 Canada Square, London E14 5AB",
    referralCode: "DENIS-RBU",
  };

  /* ------------------------------------------------------------ currency */

  var rates = { USD: 1, EUR: 1.0842, GBP: 1.2715, BTC: 84320 };

  var accounts = [
    { id: "usd", name: "Main account", currency: "USD", symbol: "$", opening: 8420.55, kind: "current", note: "US Dollar · personal" },
    { id: "eur", name: "Euro pocket", currency: "EUR", symbol: "€", opening: 640.00, kind: "current", note: "Euro · spend & receive" },
    { id: "gbp", name: "Pound pocket", currency: "GBP", symbol: "£", opening: 310.00, kind: "current", note: "British Pound" },
    { id: "vault", name: "Savings vault", currency: "USD", symbol: "$", opening: 15000, kind: "savings", note: "4.15% APY · paid daily" },
    { id: "btc", name: "Bitcoin", currency: "BTC", symbol: "₿", opening: 0.0412, kind: "crypto", note: "Custodial · demo" },
  ];

  /* --------------------------------------------------------------- cards */

  var cards = [
    {
      id: "metal", label: "RBU Metal", kind: "Physical · Metal",
      last4: "4417", number: "5375 •••• •••• 4417", fullNumber: "5375 8842 1096 4417",
      expiry: "09/29", cvv: "418", network: "Mastercard", metal: true, monthlyLimit: 12000,
    },
    {
      id: "virtual", label: "Online card", kind: "Virtual · disposable off",
      last4: "8802", number: "4231 •••• •••• 8802", fullNumber: "4231 7710 5523 8802",
      expiry: "04/28", cvv: "907", network: "Visa", metal: false, monthlyLimit: 3000,
    },
  ];

  /* ------------------------------------------------------------ contacts */

  var contacts = [
    { id: "c1", name: "Anna Kovalenko", handle: "@annak", bank: "RBUBANK", detail: "RBU · instant", fav: true },
    { id: "c2", name: "Mark Thiessen", handle: "@markt", bank: "N26", detail: "DE89 •••• 3021", fav: true },
    { id: "c3", name: "Sofia Marino", handle: "@sofiam", bank: "RBUBANK", detail: "RBU · instant", fav: true },
    { id: "c4", name: "Northwind Digital", handle: "@northwind", bank: "Barclays", detail: "GB44 •••• 7781", fav: false },
    { id: "c5", name: "Lukas Berger", handle: "@lukasb", bank: "Revolut", detail: "LT12 •••• 6640", fav: false },
    { id: "c6", name: "Elena Popescu", handle: "@elenap", bank: "RBUBANK", detail: "RBU · instant", fav: false },
    { id: "c7", name: "Bank of Cyprus", handle: "", bank: "Bank of Cyprus", detail: "CY17 •••• 0090", fav: false },
  ];

  /* ------------------------------------------------------------ taxonomy */

  var categories = {
    income:        { label: "Income",         tone: "credit", icon: "download" },
    housing:       { label: "Housing",        tone: "plain",  icon: "home" },
    groceries:     { label: "Groceries",      tone: "plain",  icon: "cart" },
    dining:        { label: "Restaurants",    tone: "plain",  icon: "cup" },
    delivery:      { label: "Food delivery",  tone: "plain",  icon: "cup" },
    transport:     { label: "Transport",      tone: "plain",  icon: "car" },
    fuel:          { label: "Fuel & parking", tone: "plain",  icon: "car" },
    shopping:      { label: "Shopping",       tone: "plain",  icon: "bag" },
    electronics:   { label: "Electronics",    tone: "plain",  icon: "bag" },
    travel:        { label: "Travel",         tone: "plain",  icon: "plane" },
    subscriptions: { label: "Subscriptions",  tone: "plain",  icon: "repeat" },
    software:      { label: "Software",       tone: "plain",  icon: "repeat" },
    health:        { label: "Health",         tone: "plain",  icon: "heart" },
    beauty:        { label: "Beauty & care",  tone: "plain",  icon: "sparkle" },
    entertainment: { label: "Entertainment",  tone: "plain",  icon: "star" },
    education:     { label: "Education",      tone: "plain",  icon: "doc" },
    utilities:     { label: "Bills",          tone: "plain",  icon: "bolt" },
    cash:          { label: "Cash",           tone: "warn",   icon: "atm" },
    transfer:      { label: "Transfers",      tone: "accent", icon: "send" },
    exchange:      { label: "Exchange",       tone: "accent", icon: "swap" },
    savings:       { label: "Savings",        tone: "accent", icon: "vault" },
    crypto:        { label: "Crypto",         tone: "accent", icon: "coin" },
    fees:          { label: "Fees",           tone: "plain",  icon: "receipt" },
    cashback:      { label: "Rewards",        tone: "credit", icon: "star" },
    charity:       { label: "Donations",      tone: "plain",  icon: "heart" },
    gifts:         { label: "Gifts",          tone: "plain",  icon: "bag" },
  };

  /* ----------------------------------------------------------------- rng */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function money(rnd, lo, hi) { return Math.round((lo + rnd() * (hi - lo)) * 100) / 100; }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }
  function chance(rnd, p) { return rnd() < p; }
  function iso(y, m, d, h, mi) {
    return new Date(Date.UTC(y, m, Math.min(Math.max(d, 1), 28), h || 9, mi || 0)).toISOString();
  }

  /* ---------------------------------------------------------- merchants */

  var CITY = ["Limassol, CY", "Nicosia, CY", "Larnaca, CY", "Paphos, CY"];
  var CITY_AWAY = ["Athens, GR", "Berlin, DE", "Milan, IT", "Lisbon, PT", "Vienna, AT", "Dubai, AE"];

  var M = {
    groceries: ["Alphamega", "Lidl", "Carrefour", "Sklavenitis", "Papantoniou", "Green Market", "Kyprou Farm Shop", "Metro Supermarket", "Fresh Corner"],
    dining: ["Blue Olive", "Kafeneio 1912", "Sushi Rock", "Costa Coffee", "Pita House", "Ristorante Milano", "Third Wave Coffee", "Ocean Basket", "Taverna Elia", "Brew Lab", "Nolan's Bistro", "Sakura Ramen"],
    coffee: ["Third Wave Coffee", "Costa Coffee", "Brew Lab", "Gloria Jean's", "Espresso Bar 24"],
    delivery: ["Wolt", "Bolt Food", "Foody", "Deliveroo"],
    transport: ["Bolt", "Uber", "Limassol Transit", "Cyprus Taxi", "InterCity Bus"],
    fuel: ["Petrolina Fuel", "EKO Station", "Lukoil Station", "City Parking", "Airport Parking", "CarWash Express"],
    shopping: ["Zara", "H&M", "IKEA", "Decathlon", "Public Bookstore", "Nike", "Mango", "JYSK", "Pandora"],
    electronics: ["Apple Store", "MediaMarkt", "Stephanis Electronics", "Amazon", "AliExpress", "eBay"],
    travel: ["Aegean Airlines", "Ryanair", "Wizz Air", "Booking.com", "Airbnb", "Hotel Amara", "Hertz Rent a Car", "Flixbus"],
    health: ["Pharmacy Nicolaou", "Dental Studio", "MedLab Diagnostics", "Apollonion Clinic", "Optic House"],
    beauty: ["Barber Republic", "Beauty Lab", "Sephora", "Spa Amathus"],
    entertainment: ["K-Cineplex", "Steam", "PlayStation Store", "Rialto Theatre", "Escape Room CY", "Bowling City"],
    education: ["Udemy", "Coursera", "Domestika", "Kindle Store", "Duolingo Max"],
    software: ["Figma", "Notion", "GitHub", "Adobe Creative Cloud", "OpenAI", "Vercel", "Linear", "Framer"],
    charity: ["Red Cross Cyprus", "Animal Rescue CY", "Wikipedia Foundation"],
    gifts: ["Flower Studio", "Gift Box CY", "Amazon Gift Card"],
  };

  var PAYERS = [
    { name: "Northwind Digital Ltd", detail: "SWIFT · Barclays London", ref: "INV-", method: "SWIFT wire transfer" },
    { name: "Helios Labs GmbH", detail: "SEPA · Commerzbank", ref: "CT-", method: "SEPA credit transfer" },
    { name: "Aurora Studio SARL", detail: "SWIFT · BNP Paribas", ref: "AS-", method: "SWIFT wire transfer" },
  ];

  /* 12 monthly payments that add up to exactly $80,000 across the year. */
  var INCOME_PLAN = [6450, 7100, 6200, 6900, 6350, 7400, 6050, 6800, 6250, 7250, 6600, 6650];

  var SUBSCRIPTIONS = [
    { name: "Spotify Premium", amount: 10.99, day: 6, cat: "subscriptions" },
    { name: "Netflix", amount: 15.49, day: 14, cat: "subscriptions" },
    { name: "Apple iCloud+", amount: 9.99, day: 18, cat: "subscriptions" },
    { name: "YouTube Premium", amount: 13.99, day: 22, cat: "subscriptions" },
    { name: "Figma Professional", amount: 15.0, day: 21, cat: "software" },
    { name: "Notion Plus", amount: 12.0, day: 24, cat: "software" },
    { name: "GitHub Team", amount: 4.0, day: 11, cat: "software" },
    { name: "OpenAI", amount: 20.0, day: 23, cat: "software" },
    { name: "Adobe Creative Cloud", amount: 22.99, day: 26, cat: "software" },
    { name: "Vercel Pro", amount: 20.0, day: 27, cat: "software" },
  ];

  var uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || "tx") + "_" + uidCounter.toString(36) + "_" + (1000 + uidCounter); }

  function tx(o) {
    var precision = o.account === "btc" ? 1e8 : 100;
    return {
      id: o.id || uid(),
      date: o.date,
      title: o.title,
      subtitle: o.subtitle || "",
      amount: Math.round(o.amount * precision) / precision,
      account: o.account || "usd",
      category: o.category,
      method: o.method || "Card payment",
      status: o.status || "completed",
      type: o.type || (o.amount > 0 ? "credit" : "debit"),
      ref: o.ref || ("RBU" + Math.abs(Math.round(o.amount * 100)).toString(36).toUpperCase().slice(0, 6) + "K"),
      fee: o.fee || 0,
      note: o.note || "",
      pairId: o.pairId || null,
      fx: o.fx || null,
      stream: o.stream || "",
      city: o.city || "",
      card: o.card || "",
      reason: o.reason || "",
    };
  }

  /* ---------------------------------------------------------- the ledger */

  function buildLedger() {
    uidCounter = 0;
    var rnd = mulberry32(20260902);
    var out = [];
    var start = { y: 2025, m: 8 }; // September 2025

    /* A card payment: the most common row in the app, so it carries the most
       detail — merchant, city, which card, and sometimes a foreign currency. */
    function card(y, m, day, name, cat, lo, hi, opts) {
      opts = opts || {};
      var amount = -money(rnd, lo, hi);
      var whichCard = opts.card || (chance(rnd, 0.22) ? cards[1] : cards[0]);
      out.push(tx({
        date: iso(y, m, day, opts.hour || (8 + Math.floor(rnd() * 13)), Math.floor(rnd() * 59)),
        title: name,
        subtitle: (categories[cat] || {}).label + " · " + (opts.city || pick(rnd, CITY)),
        amount: amount,
        account: opts.account || "usd",
        category: cat,
        method: opts.method || "Card payment",
        status: opts.status || "completed",
        card: whichCard.last4,
        city: opts.city || pick(rnd, CITY),
        reason: opts.reason || "",
        note: opts.note || "",
      }));
    }

    for (var i = 0; i < 13; i++) {
      var m = (start.m + i) % 12;
      var y = start.y + Math.floor((start.m + i) / 12);
      var isCurrent = i === 12;          // September 2026 — only the first two days exist
      var maxDay = isCurrent ? 2 : 28;
      var scale = isCurrent ? 0.08 : 1;  // the current month is barely started
      var n = function (base) { return Math.max(0, Math.round(base * scale)); };
      var day = function () { return 1 + Math.floor(rnd() * maxDay); };

      /* --- contract income · 12 payments · $80,000 exactly -------------- */
      if (!isCurrent) {
        var payer = PAYERS[i % PAYERS.length];
        out.push(tx({
          date: iso(y, m, 3 + Math.floor(rnd() * 4), 10, 12),
          title: payer.name,
          subtitle: "Incoming transfer · " + payer.detail,
          amount: INCOME_PLAN[i],
          category: "income",
          method: payer.method,
          type: "credit",
          ref: payer.ref + (1180 + i * 7),
          fee: payer.method.indexOf("SWIFT") === 0 ? 15 : 0,
          stream: "contract",
          note: "Monthly retainer · development services",
        }));
      }

      /* --- other money in ----------------------------------------------- */
      if (!isCurrent) {
        out.push(tx({ date: iso(y, m, 27, 22, 0), title: "Metal cashback", subtitle: "1% on card spend", amount: money(rnd, 8, 32), category: "cashback", type: "credit", method: "Rewards" }));
        out.push(tx({ date: iso(y, m, 28, 23, 0), title: "Vault interest", subtitle: "4.15% APY · paid monthly", amount: money(rnd, 52, 82), category: "income", account: "vault", method: "Interest", type: "credit" }));
      }
      if (!isCurrent && chance(rnd, 0.45)) {
        out.push(tx({ date: iso(y, m, day(), 16, 20), title: "Stripe Payouts", subtitle: "Marketplace payout · side project", amount: money(rnd, 180, 940), category: "income", type: "credit", method: "SEPA credit transfer", ref: "PO-" + (4100 + i) }));
      }
      if (!isCurrent && chance(rnd, 0.3)) {
        out.push(tx({ date: iso(y, m, day(), 12, 5), title: "Upwork Escrow", subtitle: "Contract milestone released", amount: money(rnd, 240, 1300), category: "income", type: "credit", method: "SWIFT wire transfer", fee: 12 }));
      }
      if (!isCurrent && (i === 4 || i === 10)) {
        out.push(tx({ date: iso(y, m, 15, 11, 0), title: "Dividend · Vanguard ETF", subtitle: "Quarterly distribution", amount: money(rnd, 120, 380), category: "income", type: "credit", method: "Dividend" }));
      }
      if (!isCurrent && i === 7) {
        out.push(tx({ date: iso(y, m, 19, 9, 40), title: "Tax refund", subtitle: "Cyprus Tax Department", amount: money(rnd, 380, 720), category: "income", type: "credit", method: "SEPA credit transfer" }));
      }
      if (!isCurrent && chance(rnd, 0.25)) {
        out.push(tx({ date: iso(y, m, day(), 14, 30), title: "Referral bonus", subtitle: "A friend joined RBUBANK", amount: 25, category: "cashback", type: "credit", method: "Rewards" }));
      }

      /* --- housing & bills ---------------------------------------------- */
      out.push(tx({ date: iso(y, m, 3, 8, 5), title: "Seaside Residences", subtitle: "Standing order · monthly rent", amount: -1450, category: "housing", method: "Standing order" }));
      if (!isCurrent) {
        out.push(tx({ date: iso(y, m, 12, 11, 30), title: "EAC Electricity", subtitle: "Direct debit · utilities", amount: -money(rnd, 96, 178), category: "utilities", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 13, 11, 35), title: "Water Board Limassol", subtitle: "Direct debit · utilities", amount: -money(rnd, 18, 42), category: "utilities", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 9, 12, 10), title: "Cyta Mobile", subtitle: "Direct debit · mobile plan", amount: -24.9, category: "utilities", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 10, 12, 20), title: "Primetel Fibre", subtitle: "Direct debit · home internet", amount: -32.5, category: "utilities", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 16, 13, 0), title: "Allianz Insurance", subtitle: "Health cover", amount: -46.2, category: "health", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 7, 7, 40), title: "Olympus Gym", subtitle: "Membership", amount: -59, category: "health", method: "Recurring card payment", card: cards[0].last4 }));
        SUBSCRIPTIONS.forEach(function (s) {
          out.push(tx({ date: iso(y, m, s.day, 6, 20), title: s.name, subtitle: "Subscription · renews monthly", amount: -s.amount, category: s.cat, method: "Recurring card payment", card: cards[1].last4 }));
        });
      }

      /* --- savings ------------------------------------------------------- */
      if (!isCurrent) {
        var pid = uid("pair");
        out.push(tx({ date: iso(y, m, 6, 9, 0), title: "Savings vault", subtitle: "Scheduled top-up", amount: -500, category: "savings", method: "Internal transfer", pairId: pid }));
        out.push(tx({ date: iso(y, m, 6, 9, 0), title: "From Main account", subtitle: "Scheduled top-up", amount: 500, category: "savings", account: "vault", method: "Internal transfer", type: "credit", pairId: pid }));
        /* Round-ups: the small habit feature every neobank ships. */
        var ru = uid("pair");
        var roundUp = money(rnd, 12, 38);
        out.push(tx({ date: iso(y, m, 25, 23, 30), title: "Round-ups", subtitle: "Spare change from card payments", amount: -roundUp, category: "savings", method: "Round-up", pairId: ru }));
        out.push(tx({ date: iso(y, m, 25, 23, 30), title: "Round-ups", subtitle: "Spare change from card payments", amount: roundUp, category: "savings", account: "vault", method: "Round-up", type: "credit", pairId: ru }));
      }

      /* --- everyday card spending ---------------------------------------- */
      var g;
      for (g = 0; g < n(11 + rnd() * 4); g++) card(y, m, day(), pick(rnd, M.groceries), "groceries", 8, 82);
      for (g = 0; g < n(7 + rnd() * 4); g++) card(y, m, day(), pick(rnd, M.coffee), "dining", 2.6, 12, { hour: 8 + Math.floor(rnd() * 3) });
      for (g = 0; g < n(6 + rnd() * 4); g++) card(y, m, day(), pick(rnd, M.dining), "dining", 14, 88, { hour: 19 + Math.floor(rnd() * 3) });
      for (g = 0; g < n(3 + rnd() * 3); g++) card(y, m, day(), pick(rnd, M.delivery), "delivery", 11, 46, { hour: 20 });
      for (g = 0; g < n(6 + rnd() * 4); g++) card(y, m, day(), pick(rnd, M.transport), "transport", 3.5, 26);
      for (g = 0; g < n(2 + rnd() * 3); g++) card(y, m, day(), pick(rnd, M.fuel), "fuel", 12, 78);
      for (g = 0; g < n(2 + rnd() * 3); g++) card(y, m, day(), pick(rnd, M.shopping), "shopping", 18, 165);
      if (!isCurrent && chance(rnd, 0.4)) card(y, m, day(), pick(rnd, M.electronics), "electronics", 40, 430);
      for (g = 0; g < n(1 + rnd() * 3); g++) card(y, m, day(), pick(rnd, M.entertainment), "entertainment", 9, 74);
      if (!isCurrent && chance(rnd, 0.6)) card(y, m, day(), pick(rnd, M.beauty), "beauty", 18, 120);
      if (!isCurrent && chance(rnd, 0.5)) card(y, m, day(), pick(rnd, M.health), "health", 12, 165);
      if (!isCurrent && chance(rnd, 0.4)) card(y, m, day(), pick(rnd, M.education), "education", 12, 190);
      if (!isCurrent && chance(rnd, 0.3)) card(y, m, day(), pick(rnd, M.charity), "charity", 10, 60);
      if (!isCurrent && chance(rnd, 0.28)) card(y, m, day(), pick(rnd, M.gifts), "gifts", 25, 180);

      /* --- travel, seasonal ----------------------------------------------- */
      if (!isCurrent && (i === 2 || i === 5 || i === 9 || i === 11)) {
        var away = pick(rnd, CITY_AWAY);
        card(y, m, 8, pick(rnd, ["Aegean Airlines", "Ryanair", "Wizz Air"]), "travel", 145, 430, { city: "Online" });
        card(y, m, 9, "Booking.com", "travel", 210, 590, { city: "Online" });
        card(y, m, 11, "Hertz Rent a Car", "travel", 90, 260, { city: away });
        for (g = 0; g < 4; g++) card(y, m, 11 + Math.floor(rnd() * 4), pick(rnd, M.dining), "dining", 18, 96, { city: away, account: chance(rnd, 0.6) ? "eur" : "usd" });
        out.push(tx({
          date: iso(y, m, 12, 12, 0), title: "Foreign exchange fee", subtitle: "Weekend FX markup · 0.5%",
          amount: -money(rnd, 2, 9), category: "fees", method: "Fee",
        }));
      }

      /* --- cash ----------------------------------------------------------- */
      for (g = 0; g < n(1 + rnd() * 2); g++) {
        var cashAmt = pick(rnd, [100, 200, 300, 400, 500]);
        out.push(tx({
          date: iso(y, m, day(), 18, 15),
          title: "ATM withdrawal",
          subtitle: "Euronet · " + pick(rnd, CITY),
          amount: -cashAmt,
          category: "cash",
          method: "ATM",
          card: cards[0].last4,
          fee: cashAmt > 300 ? 2.5 : 0,
        }));
      }

      /* --- payouts to an external bank, once a quarter --------------------- */
      if (!isCurrent && (i === 4 || i === 10)) {
        out.push(tx({
          date: iso(y, m, 20, 14, 10),
          title: "Withdrawal to Bank of Cyprus",
          subtitle: "CY17 •••• 0090 · own account",
          amount: -money(rnd, 900, 1800),
          category: "cash",
          method: "SEPA credit transfer",
          note: "Payout to external account",
        }));
      }

      /* --- people --------------------------------------------------------- */
      for (g = 0; g < n(2 + rnd() * 2); g++) {
        var who = pick(rnd, contacts.slice(0, 6));
        out.push(tx({
          date: iso(y, m, day(), 19, 5),
          title: who.name,
          subtitle: who.bank === "RBUBANK" ? "Sent · RBU instant" : "Sent · " + who.detail,
          amount: -money(rnd, 12, 210),
          category: "transfer",
          method: who.bank === "RBUBANK" ? "RBU instant transfer" : "SEPA credit transfer",
          note: pick(rnd, ["Dinner split", "Rent share", "Taxi", "Gift", "Concert tickets", ""]),
        }));
      }
      for (g = 0; g < n(1 + rnd() * 2); g++) {
        var back = pick(rnd, contacts.slice(0, 6));
        out.push(tx({
          date: iso(y, m, day(), 12, 25),
          title: back.name,
          subtitle: "Received · RBU instant",
          amount: money(rnd, 15, 280),
          category: "transfer",
          type: "credit",
          method: "RBU instant transfer",
          note: pick(rnd, ["Split settled", "Paid you back", "Bill share", ""]),
        }));
      }

      /* --- FX ------------------------------------------------------------- */
      if (!isCurrent) {
        var fxRuns = 1 + (chance(rnd, 0.5) ? 1 : 0);
        for (g = 0; g < fxRuns; g++) {
          var toEur = chance(rnd, 0.7);
          var target = toEur ? "eur" : "gbp";
          var tCur = toEur ? "EUR" : "GBP";
          var usdOut = money(rnd, 180, 900);
          var got = Math.round((usdOut / rates[tCur]) * 100) / 100;
          var fxPair = uid("pair");
          out.push(tx({ date: iso(y, m, day(), 13, 45), title: "Exchanged to " + tCur, subtitle: "USD → " + tCur + " @ " + (1 / rates[tCur]).toFixed(4), amount: -usdOut, category: "exchange", method: "Instant exchange", pairId: fxPair, fx: { from: "USD", to: tCur, rate: 1 / rates[tCur] } }));
          out.push(tx({ date: iso(y, m, day(), 13, 45), title: "Exchanged from USD", subtitle: "USD → " + tCur + " @ " + (1 / rates[tCur]).toFixed(4), amount: got, category: "exchange", account: target, type: "credit", method: "Instant exchange", pairId: fxPair, fx: { from: "USD", to: tCur, rate: 1 / rates[tCur] } }));
        }
      }

      /* --- euro / pound pocket spending ------------------------------------ */
      for (g = 0; g < n(2 + rnd() * 3); g++) {
        card(y, m, day(), pick(rnd, M.dining.concat(M.shopping)), chance(rnd, 0.5) ? "dining" : "shopping", 12, 130, { account: "eur", city: pick(rnd, CITY_AWAY) });
      }
      if (!isCurrent && chance(rnd, 0.45)) {
        card(y, m, day(), pick(rnd, ["Marks & Spencer", "Waterstones", "Tesco", "Pret A Manger"]), "shopping", 9, 120, { account: "gbp", city: "London, UK" });
      }

      /* --- crypto ---------------------------------------------------------- */
      if (!isCurrent && (i % 3 === 1)) {
        var buy = money(rnd, 120, 420);
        var btcPair = uid("pair");
        out.push(tx({ date: iso(y, m, 17, 21, 5), title: "Bought Bitcoin", subtitle: "BTC @ $" + rates.BTC.toLocaleString("en-US"), amount: -buy, category: "crypto", method: "Instant buy", pairId: btcPair }));
        out.push(tx({ date: iso(y, m, 17, 21, 5), title: "Bitcoin purchase", subtitle: "Funded from Main account", amount: buy / rates.BTC, account: "btc", category: "crypto", type: "credit", method: "Instant buy", pairId: btcPair }));
      }

      /* --- refunds, declines, fees ------------------------------------------ */
      if (!isCurrent && chance(rnd, 0.5)) {
        out.push(tx({
          date: iso(y, m, day(), 11, 0), title: "Refund · " + pick(rnd, M.shopping),
          subtitle: "Card refund · returned item", amount: money(rnd, 18, 190),
          category: "shopping", type: "credit", method: "Card refund", card: cards[0].last4,
        }));
      }
      if (!isCurrent && chance(rnd, 0.42)) {
        out.push(tx({
          date: iso(y, m, day(), 15, 40), title: pick(rnd, M.electronics.concat(M.travel)),
          subtitle: "Payment declined", amount: -money(rnd, 40, 480),
          category: "shopping", status: "declined", method: "Card payment",
          card: cards[1].last4, reason: pick(rnd, ["Card limit exceeded", "3-D Secure not completed", "Merchant not allowed on this card"]),
        }));
      }
      if (!isCurrent && i % 4 === 3) {
        out.push(tx({ date: iso(y, m, 25, 9, 30), title: "International transfer fee", subtitle: "SWIFT · out of plan allowance", amount: -15, category: "fees", method: "Fee" }));
      }
      if (!isCurrent && i === 6) {
        out.push(tx({ date: iso(y, m, 14, 10, 10), title: "Card delivery", subtitle: "Metal card · express courier", amount: -12, category: "fees", method: "Fee" }));
      }
    }

    /* --- live state for the demo ------------------------------------------- */
    out.push(tx({
      date: iso(2026, 8, 2, 8, 40), title: "Aegean Airlines", subtitle: "Authorisation hold",
      amount: -298.4, category: "travel", status: "pending", card: cards[0].last4, city: "Online",
    }));
    out.push(tx({
      date: iso(2026, 8, 1, 10, 12), title: "Helios Labs GmbH",
      subtitle: "Incoming transfer · SEPA · Commerzbank", amount: 6700, category: "income",
      method: "SEPA credit transfer", type: "credit", status: "pending", ref: "CT-1281",
      stream: "contract", note: "September retainer · arriving today",
    }));

    /* Nothing in a bank statement is dated in the future — the current month is
       only two days old, so anything past today is dropped. */
    var horizon = new Date(TODAY.getTime() + 86399e3).toISOString();
    out = out.filter(function (t) { return t.date <= horizon; });

    out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return out;
  }

  /* ------------------------------------------------------- scheduled ops */

  var scheduled = [
    { id: "s1", title: "Seaside Residences", sub: "Rent · standing order", amount: -1450, next: "3 Oct 2026", every: "Monthly" },
    { id: "s2", title: "Savings vault", sub: "Auto top-up", amount: -500, next: "6 Oct 2026", every: "Monthly" },
    { id: "s3", title: "EAC Electricity", sub: "Direct debit", amount: -142.6, next: "12 Oct 2026", every: "Monthly" },
    { id: "s4", title: "Primetel Fibre", sub: "Direct debit", amount: -32.5, next: "10 Oct 2026", every: "Monthly" },
    { id: "s5", title: "Netflix", sub: "Subscription", amount: -15.49, next: "14 Oct 2026", every: "Monthly" },
    { id: "s6", title: "Cyta Mobile", sub: "Direct debit", amount: -24.9, next: "9 Oct 2026", every: "Monthly" },
    { id: "s7", title: "Allianz Insurance", sub: "Health cover", amount: -46.2, next: "16 Oct 2026", every: "Monthly" },
  ];

  NS.data = {
    TODAY: TODAY, profile: profile, rates: rates, accounts: accounts, cards: cards,
    contacts: contacts, categories: categories, scheduled: scheduled,
    buildLedger: buildLedger, uid: uid, tx: tx, merchants: M,
  };
})(window.RBU);
