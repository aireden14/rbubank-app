/* RBUBANK — demo ledger.
   Everything on this screen is generated from one deterministic seed, so the
   numbers a demo shows today are the same numbers it shows on stage tomorrow.
   No server, no network: the whole bank is a pure function plus localStorage. */

window.RBU = window.RBU || {};
(function (NS) {
  "use strict";

  var TODAY = new Date(Date.UTC(2026, 8, 2)); // 2 Sep 2026 — end of the demo year

  /* ------------------------------------------------------------- profile */

  var profile = {
    firstName: "Denis",
    lastName: "Rechkin",
    initials: "DR",
    handle: "@denrech",
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
    { id: "usd", name: "Main account", currency: "USD", symbol: "$", opening: 4120.55, kind: "current", note: "US Dollar · personal" },
    { id: "eur", name: "Euro pocket", currency: "EUR", symbol: "€", opening: 640.00, kind: "current", note: "Euro · spend & receive" },
    { id: "gbp", name: "Pound pocket", currency: "GBP", symbol: "£", opening: 310.00, kind: "current", note: "British Pound" },
    { id: "vault", name: "Savings vault", currency: "USD", symbol: "$", opening: 15000, kind: "savings", note: "4.15% APY · paid daily" },
    { id: "btc", name: "Bitcoin", currency: "BTC", symbol: "₿", opening: 0.0412, kind: "crypto", note: "Custodial · demo" },
  ];

  /* --------------------------------------------------------------- cards */

  var cards = [
    {
      id: "metal",
      label: "RBU Metal",
      kind: "Physical · Metal",
      last4: "4417",
      number: "5375 •••• •••• 4417",
      fullNumber: "5375 8842 1096 4417",
      expiry: "09/29",
      cvv: "418",
      network: "Mastercard",
      metal: true,
      monthlyLimit: 12000,
    },
    {
      id: "virtual",
      label: "Online card",
      kind: "Virtual · disposable off",
      last4: "8802",
      number: "4231 •••• •••• 8802",
      fullNumber: "4231 7710 5523 8802",
      expiry: "04/28",
      cvv: "907",
      network: "Visa",
      metal: false,
      monthlyLimit: 3000,
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
    income:        { label: "Income",        tone: "credit", icon: "download" },
    housing:       { label: "Housing",       tone: "plain",  icon: "home" },
    groceries:     { label: "Groceries",     tone: "plain",  icon: "cart" },
    dining:        { label: "Restaurants",   tone: "plain",  icon: "cup" },
    transport:     { label: "Transport",     tone: "plain",  icon: "car" },
    shopping:      { label: "Shopping",      tone: "plain",  icon: "bag" },
    travel:        { label: "Travel",        tone: "plain",  icon: "plane" },
    subscriptions: { label: "Subscriptions", tone: "plain",  icon: "repeat" },
    health:        { label: "Health",        tone: "plain",  icon: "heart" },
    utilities:     { label: "Bills",         tone: "plain",  icon: "bolt" },
    cash:          { label: "Cash",          tone: "warn",   icon: "atm" },
    transfer:      { label: "Transfers",     tone: "accent", icon: "send" },
    exchange:      { label: "Exchange",      tone: "accent", icon: "swap" },
    savings:       { label: "Savings",       tone: "accent", icon: "vault" },
    crypto:        { label: "Crypto",        tone: "accent", icon: "coin" },
    fees:          { label: "Fees",          tone: "plain",  icon: "receipt" },
    cashback:      { label: "Rewards",       tone: "credit", icon: "star" },
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
  function iso(y, m, d, h, mi) {
    return new Date(Date.UTC(y, m, Math.min(d, 28), h || 9, mi || 0)).toISOString();
  }

  /* ---------------------------------------------------------- merchants */

  var GROCERS = ["Alphamega", "Lidl", "Carrefour", "Sklavenitis", "Papantoniou", "Green Market"];
  var DINING = ["Blue Olive", "Kafeneio 1912", "Sushi Rock", "Costa Coffee", "Pita House", "Ristorante Milano", "Third Wave Coffee"];
  var TRANSPORT = ["Bolt", "Uber", "Petrolina Fuel", "EKO Station", "City Parking", "Limassol Transit"];
  var SHOPS = ["Zara", "IKEA", "Apple Store", "Decathlon", "MediaMarkt", "Public Bookstore", "Nike"];
  var TRAVEL = ["Aegean Airlines", "Ryanair", "Booking.com", "Airbnb", "Wizz Air", "Hotel Amara"];
  var HEALTH = ["Pharmacy Nicolaou", "Dental Studio", "MedLab Diagnostics"];
  var PAYERS = [
    { name: "Northwind Digital Ltd", detail: "SWIFT · Barclays London", ref: "INV-" },
    { name: "Helios Labs GmbH", detail: "SEPA · Commerzbank", ref: "CT-" },
    { name: "Aurora Studio SARL", detail: "SWIFT · BNP Paribas", ref: "AS-" },
  ];

  /* 12 monthly payments that add up to exactly $80,000 across the year. */
  var INCOME_PLAN = [6450, 7100, 6200, 6900, 6350, 7400, 6050, 6800, 6250, 7250, 6600, 6650];

  var SUBSCRIPTIONS = [
    { name: "Spotify Premium", amount: 10.99, day: 6 },
    { name: "Netflix", amount: 15.49, day: 14 },
    { name: "Apple iCloud+", amount: 9.99, day: 18 },
    { name: "Figma Professional", amount: 15.0, day: 21 },
    { name: "Notion Plus", amount: 12.0, day: 24 },
  ];

  var uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || "tx") + "_" + uidCounter.toString(36) + "_" + (1000 + uidCounter); }

  function tx(o) {
    /* Crypto legs need eight decimals; everything else is cents. */
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
    };
  }

  /* ---------------------------------------------------------- the ledger */

  function buildLedger() {
    var rnd = mulberry32(20260902);
    var out = [];
    var start = { y: 2025, m: 8 }; // September 2025

    for (var i = 0; i < 13; i++) {
      var m = (start.m + i) % 12;
      var y = start.y + Math.floor((start.m + i) / 12);
      var isCurrent = i === 12; // September 2026 — only the first two days exist
      var maxDay = isCurrent ? 2 : 28;

      /* --- salary / contract income (12 payments · $80,000 total) ------- */
      if (!isCurrent) {
        var payer = PAYERS[i % PAYERS.length];
        var amount = INCOME_PLAN[i];
        var payDay = 3 + Math.floor(rnd() * 4);
        out.push(tx({
          date: iso(y, m, payDay, 10, 12),
          title: payer.name,
          subtitle: "Incoming transfer · " + payer.detail,
          amount: amount,
          category: "income",
          method: i % 3 === 1 ? "SEPA credit transfer" : "SWIFT wire transfer",
          type: "credit",
          ref: payer.ref + (1180 + i * 7),
          fee: i % 3 === 1 ? 0 : 15,
          note: "Monthly retainer · development services",
        }));
      }

      /* --- housing & bills --------------------------------------------- */
      if (!isCurrent || maxDay >= 3) {
        out.push(tx({
          date: iso(y, m, 3, 8, 5),
          title: "Seaside Residences",
          subtitle: "Standing order · monthly rent",
          amount: -1450,
          category: "housing",
          method: "Standing order",
        }));
      }
      if (!isCurrent) {
        out.push(tx({ date: iso(y, m, 12, 11, 30), title: "EAC Electricity", subtitle: "Direct debit · utilities", amount: -money(rnd, 96, 178), category: "utilities", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 9, 12, 10), title: "Cyta Mobile", subtitle: "Direct debit · mobile plan", amount: -24.9, category: "utilities", method: "Direct debit" }));
        out.push(tx({ date: iso(y, m, 7, 7, 40), title: "Olympus Gym", subtitle: "Membership", amount: -59, category: "health", method: "Recurring card payment" }));
        out.push(tx({ date: iso(y, m, 16, 13, 0), title: "Allianz Insurance", subtitle: "Health cover", amount: -46.2, category: "health", method: "Direct debit" }));

        SUBSCRIPTIONS.forEach(function (s) {
          out.push(tx({ date: iso(y, m, s.day, 6, 20), title: s.name, subtitle: "Subscription", amount: -s.amount, category: "subscriptions", method: "Recurring card payment" }));
        });
      }

      /* --- savings vault ------------------------------------------------ */
      if (!isCurrent) {
        var vaultDay = 6;
        var pid = uid("pair");
        out.push(tx({ date: iso(y, m, vaultDay, 9, 0), title: "Savings vault", subtitle: "Scheduled top-up", amount: -500, category: "savings", method: "Internal transfer", pairId: pid }));
        out.push(tx({ date: iso(y, m, vaultDay, 9, 0), title: "From Main account", subtitle: "Scheduled top-up", amount: 500, category: "savings", account: "vault", method: "Internal transfer", type: "credit", pairId: pid }));
        out.push(tx({ date: iso(y, m, 28, 23, 0), title: "Vault interest", subtitle: "4.15% APY · paid monthly", amount: money(rnd, 52, 78), category: "income", account: "vault", method: "Interest", type: "credit" }));
      }

      /* --- everyday spending -------------------------------------------- */
      var groceryRuns = isCurrent ? 1 : 5 + Math.floor(rnd() * 3);
      for (var g = 0; g < groceryRuns; g++) {
        out.push(tx({ date: iso(y, m, 1 + Math.floor(rnd() * maxDay), 17, Math.floor(rnd() * 59)), title: pick(rnd, GROCERS), subtitle: "Groceries · Limassol", amount: -money(rnd, 24, 148), category: "groceries" }));
      }
      var diningRuns = isCurrent ? 2 : 4 + Math.floor(rnd() * 3);
      for (var d = 0; d < diningRuns; d++) {
        out.push(tx({ date: iso(y, m, 1 + Math.floor(rnd() * maxDay), 20, Math.floor(rnd() * 59)), title: pick(rnd, DINING), subtitle: "Restaurants & cafés", amount: -money(rnd, 8, 92), category: "dining" }));
      }
      var rides = isCurrent ? 1 : 3 + Math.floor(rnd() * 3);
      for (var r = 0; r < rides; r++) {
        out.push(tx({ date: iso(y, m, 1 + Math.floor(rnd() * maxDay), 15, Math.floor(rnd() * 59)), title: pick(rnd, TRANSPORT), subtitle: "Transport", amount: -money(rnd, 6, 64), category: "transport" }));
      }
      if (!isCurrent && rnd() > 0.35) {
        out.push(tx({ date: iso(y, m, 1 + Math.floor(rnd() * 26), 14, 20), title: pick(rnd, SHOPS), subtitle: "Shopping", amount: -money(rnd, 32, 265), category: "shopping" }));
      }
      if (!isCurrent && rnd() > 0.62) {
        out.push(tx({ date: iso(y, m, 1 + Math.floor(rnd() * 26), 10, 45), title: pick(rnd, HEALTH), subtitle: "Health", amount: -money(rnd, 18, 140), category: "health" }));
      }

      /* --- travel, a few times a year ----------------------------------- */
      if (!isCurrent && (i === 2 || i === 5 || i === 9 || i === 11)) {
        out.push(tx({ date: iso(y, m, 8, 11, 5), title: pick(rnd, TRAVEL), subtitle: "Flights", amount: -money(rnd, 165, 430), category: "travel" }));
        out.push(tx({ date: iso(y, m, 9, 16, 30), title: "Booking.com", subtitle: "Accommodation", amount: -money(rnd, 210, 590), category: "travel" }));
      }

      /* --- cash withdrawals --------------------------------------------- */
      if (!isCurrent && rnd() > 0.42) {
        var cashAmt = pick(rnd, [200, 300, 400, 500]);
        out.push(tx({
          date: iso(y, m, 1 + Math.floor(rnd() * 26), 18, 15),
          title: "ATM withdrawal",
          subtitle: "Euronet · Limassol, CY",
          amount: -cashAmt,
          category: "cash",
          method: "ATM",
          fee: cashAmt > 300 ? 2.5 : 0,
        }));
      }

      /* --- withdrawals to an external bank, once a quarter --------------- */
      if (!isCurrent && (i === 1 || i === 4 || i === 7 || i === 10)) {
        out.push(tx({
          date: iso(y, m, 20, 14, 10),
          title: "Withdrawal to Bank of Cyprus",
          subtitle: "CY17 •••• 0090 · own account",
          amount: -money(rnd, 1500, 3000),
          category: "transfer",
          method: "SEPA credit transfer",
          fee: 0,
          note: "Payout to external account",
        }));
      }

      /* --- transfers to people ------------------------------------------ */
      var peopleRuns = isCurrent ? 1 : 1 + Math.floor(rnd() * 2);
      for (var p = 0; p < peopleRuns; p++) {
        var who = pick(rnd, contacts.slice(0, 6));
        out.push(tx({
          date: iso(y, m, 1 + Math.floor(rnd() * maxDay), 19, 5),
          title: who.name,
          subtitle: who.bank === "RBUBANK" ? "Sent · RBU instant" : "Sent · " + who.detail,
          amount: -money(rnd, 25, 340),
          category: "transfer",
          method: who.bank === "RBUBANK" ? "RBU instant transfer" : "SEPA credit transfer",
        }));
      }
      if (!isCurrent && rnd() > 0.55) {
        var back = pick(rnd, contacts.slice(0, 6));
        out.push(tx({
          date: iso(y, m, 1 + Math.floor(rnd() * 26), 12, 25),
          title: back.name,
          subtitle: "Received · RBU instant",
          amount: money(rnd, 20, 260),
          category: "transfer",
          type: "credit",
          method: "RBU instant transfer",
        }));
      }

      /* --- FX and crypto -------------------------------------------------- */
      if (!isCurrent && i % 2 === 0) {
        var usdOut = money(rnd, 420, 900);
        var eurIn = Math.round((usdOut / rates.EUR) * 100) / 100;
        var fxPair = uid("pair");
        out.push(tx({ date: iso(y, m, 11, 13, 45), title: "Exchanged to EUR", subtitle: "USD → EUR @ " + rates.EUR.toFixed(4), amount: -usdOut, category: "exchange", method: "Instant exchange", pairId: fxPair, fx: { from: "USD", to: "EUR", rate: rates.EUR } }));
        out.push(tx({ date: iso(y, m, 11, 13, 45), title: "Exchanged from USD", subtitle: "USD → EUR @ " + rates.EUR.toFixed(4), amount: eurIn, category: "exchange", account: "eur", type: "credit", method: "Instant exchange", pairId: fxPair, fx: { from: "USD", to: "EUR", rate: rates.EUR } }));
      }
      if (!isCurrent && (i === 1 || i === 5 || i === 8)) {
        var buy = money(rnd, 150, 420);
        var btcPair = uid("pair");
        out.push(tx({ date: iso(y, m, 17, 21, 5), title: "Bought Bitcoin", subtitle: "BTC @ $" + rates.BTC.toLocaleString("en-US"), amount: -buy, category: "crypto", method: "Instant buy", pairId: btcPair }));
        out.push(tx({ date: iso(y, m, 17, 21, 5), title: "Bitcoin purchase", subtitle: "Funded from Main account", amount: Math.round((buy / rates.BTC) * 1e8) / 1e8, category: "crypto", account: "btc", type: "credit", method: "Instant buy", pairId: btcPair }));
      }

      /* --- euro-pocket spending ------------------------------------------ */
      if (!isCurrent && rnd() > 0.5) {
        out.push(tx({ date: iso(y, m, 19, 13, 15), title: pick(rnd, DINING), subtitle: "Paid in EUR", amount: -money(rnd, 18, 120), category: "dining", account: "eur" }));
      }

      /* --- rewards, refunds, fees ---------------------------------------- */
      if (!isCurrent) {
        out.push(tx({ date: iso(y, m, 27, 22, 0), title: "Metal cashback", subtitle: "1% on card spend", amount: money(rnd, 6, 24), category: "cashback", type: "credit", method: "Rewards" }));
      }
      if (!isCurrent && rnd() > 0.72) {
        out.push(tx({ date: iso(y, m, 1 + Math.floor(rnd() * 26), 11, 0), title: "Refund · " + pick(rnd, SHOPS), subtitle: "Card refund", amount: money(rnd, 20, 180), category: "shopping", type: "credit", method: "Card refund" }));
      }
      if (!isCurrent && i % 4 === 3) {
        out.push(tx({ date: iso(y, m, 25, 9, 30), title: "International transfer fee", subtitle: "SWIFT · out of plan allowance", amount: -15, category: "fees", method: "Fee" }));
      }
    }

    /* --- one pending item, so the demo always has live state ------------- */
    out.push(tx({
      date: iso(2026, 8, 2, 8, 40),
      title: "Aegean Airlines",
      subtitle: "Authorisation hold",
      amount: -298.4,
      category: "travel",
      status: "pending",
    }));
    out.push(tx({
      date: iso(2026, 8, 1, 10, 12),
      title: "Helios Labs GmbH",
      subtitle: "Incoming transfer · SEPA · Commerzbank",
      amount: 6700,
      category: "income",
      method: "SEPA credit transfer",
      type: "credit",
      status: "pending",
      ref: "CT-1281",
      note: "September retainer · arriving today",
    }));

    out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return out;
  }

  /* ------------------------------------------------------- scheduled ops */

  var scheduled = [
    { id: "s1", title: "Seaside Residences", sub: "Rent · standing order", amount: -1450, next: "3 Oct 2026", every: "Monthly" },
    { id: "s2", title: "Savings vault", sub: "Auto top-up", amount: -500, next: "6 Oct 2026", every: "Monthly" },
    { id: "s3", title: "EAC Electricity", sub: "Direct debit", amount: -142.6, next: "12 Oct 2026", every: "Monthly" },
    { id: "s4", title: "Netflix", sub: "Subscription", amount: -15.49, next: "14 Oct 2026", every: "Monthly" },
    { id: "s5", title: "Cyta Mobile", sub: "Direct debit", amount: -24.9, next: "9 Oct 2026", every: "Monthly" },
  ];

  NS.data = {
    TODAY: TODAY,
    profile: profile,
    rates: rates,
    accounts: accounts,
    cards: cards,
    contacts: contacts,
    categories: categories,
    scheduled: scheduled,
    buildLedger: buildLedger,
    uid: uid,
    tx: tx,
  };
})(window.RBU);
