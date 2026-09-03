/* RBUBANK — the money screens: unlock, home, activity, wealth, analytics. */

window.RBU = window.RBU || {};
window.RBU.views = window.RBU.views || {};
(function (NS) {
  "use strict";

  var ui = NS.ui, data = NS.data, h = ui.h;
  var V = NS.views;

  /* ---------------------------------------------------------- components */

  function screen(children, cls) {
    return h("div", { class: "screen" + (cls ? " " + cls : "") }, children);
  }

  function accCur(id) {
    var a = NS.app.account(id);
    return a ? a.currency : "USD";
  }

  function amountEl(t) {
    var cur = accCur(t.account);
    var credit = t.amount > 0;
    return h("div", {
      class: "row-value" + (credit ? " credit" : ""),
      text: ui.money(t.amount, cur, { signed: credit }),
    });
  }

  function txRow(t) {
    var app = NS.app;
    var sub = ui.timeLabel(t.date) + " · " + (t.subtitle || t.method);
    return h("button.row", {
      type: "button",
      onclick: function () { txSheet(t); },
    }, [
      ui.glyphFor(t),
      h("div.row-main", {}, [
        h("div.row-title", { text: t.title }),
        h("div.row-sub", {}, [
          t.status === "pending" ? h("span.status-dot") : null,
          t.status === "pending" ? "Pending · " + (t.subtitle || t.method) : sub,
        ]),
      ]),
      h("div.row-end", {}, [
        amountEl(t),
        t.account !== "usd" ? h("div.row-value-sub", { text: NS.app.account(t.account).name }) : null,
      ]),
    ]);
  }

  /* Transactions are grouped by day — the shape people expect from a bank. */
  function txList(items, opts) {
    opts = opts || {};
    var out = [];
    var lastDay = null;
    items.slice(0, opts.limit || items.length).forEach(function (t) {
      var key = ui.dayKey(t.date);
      if (key !== lastDay && !opts.flat) {
        lastDay = key;
        out.push(h("div.day-head", { text: ui.dayLabel(t.date) }));
      }
      out.push(txRow(t));
    });
    if (!out.length) {
      out.push(h("div.demo-note", { text: "Nothing here yet." }));
    }
    return h("div.rows", {}, out);
  }

  function txSheet(t) {
    var app = NS.app;
    var cur = accCur(t.account);
    var acc = app.account(t.account);
    var cat = data.categories[t.category] || { label: "Other" };
    var rows = [
      ["Status", t.status === "pending" ? "Pending" : "Completed"],
      ["Date", ui.fullDate(t.date)],
      ["Method", t.method],
      ["Account", acc.name + " · " + acc.currency],
      ["Category", cat.label],
      ["Reference", t.ref],
    ];
    if (t.fee) rows.push(["Fee", ui.money(-t.fee, cur)]);
    if (t.fx) rows.push(["Exchange rate", "1 " + t.fx.from + " = " + t.fx.rate.toFixed(4) + " " + t.fx.to]);
    if (t.note) rows.push(["Note", t.note]);

    var body = h("div.stack", {}, [
      h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:10px;padding:4px 0 6px" }, [
        ui.glyphFor(t),
        h("div", { style: "font-size:15px;font-weight:640", text: t.title }),
        h("div", {
          class: t.amount > 0 ? "credit" : "",
          style: "font-size:38px;font-weight:700;letter-spacing:-0.04em;font-variant-numeric:tabular-nums",
          text: ui.money(t.amount, cur, { signed: t.amount > 0 }),
        }),
        h("div.muted", { style: "font-size:13.5px", text: t.subtitle }),
      ]),
      h("div.rows", {}, rows.map(function (r) {
        return h("div.row", {}, [
          h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: r[0] })),
          h("div", { class: "row-value selectable", style: "font-size:15px;font-weight:600;max-width:58%;text-align:right", text: r[1] }),
        ]);
      })),
      h("div.actions", {}, [
        h("button.btn.btn-ghost", {
          type: "button",
          onclick: function () {
            ui.closeSheet();
            if (t.amount < 0) {
              NS.app.flow = { type: "send", step: "amount", recipient: { name: t.title, detail: t.subtitle, bank: "" }, amount: String(Math.abs(t.amount)) };
              NS.app.go("send");
            } else {
              ui.copy(t.ref, "Reference copied");
            }
          },
          text: t.amount < 0 ? "Repeat this payment" : "Copy reference",
        }),
        h("button.btn.btn-ghost", {
          type: "button",
          onclick: function () { ui.closeSheet(); ui.toast("Receipt exported", "Saved to your documents (demo)"); },
          text: "Export receipt",
        }),
        h("button.btn.btn-ghost.btn-danger", {
          type: "button",
          onclick: function () { ui.closeSheet(); ui.toast("Dispute opened", "Our team replies within 2 hours"); },
          text: "Report an issue",
        }),
      ]),
    ]);
    ui.sheet(null, null, body);
  }

  function quick(label, iconName, onclick) {
    return h("button.quick", { type: "button", onclick: onclick }, [
      ui.icon(iconName, 22),
      h("span.quick-label", { text: label }),
    ]);
  }

  function sectionHead(title, actionLabel, onclick) {
    return h("div.section-head", {}, [
      h("h3.section-title", { text: title }),
      actionLabel ? h("button.link", { type: "button", onclick: onclick, text: actionLabel }) : null,
    ]);
  }

  function topbar(app) {
    var hour = new Date().getHours();
    var greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return h("div.topbar", {}, [
      h("button", { class: "avatar", type: "button", style: "border:0;cursor:pointer", onclick: function () { app.go("profile"); }, text: data.profile.initials }),
      h("div.topbar-main", {}, [
        h("div.topbar-hello", { text: greeting + "," }),
        h("div.topbar-name", { text: data.profile.firstName + " " + data.profile.lastName }),
      ]),
      h("button.icon-btn", { type: "button", "aria-label": "Scan to pay", onclick: function () { qrSheet(); } }, ui.icon("scan", 20)),
      h("button.icon-btn", { type: "button", "aria-label": "Notifications", onclick: function () { app.go("notifications"); } }, [
        ui.icon("bell", 20), h("span.dot"),
      ]),
    ]);
  }

  function qrSheet() {
    ui.sheet("Scan to pay", "Point the camera at any RBU QR code, or show yours to get paid.", h("div.stack", {}, [
      h("div", { style: "display:grid;place-items:center;padding:8px 0 4px" },
        h("div", { style: "width:190px;height:190px;border-radius:24px;display:grid;place-items:center;background:#fff;color:#000" }, ui.icon("qr", 120))),
      h("div.demo-note", { text: "Camera access is disabled in the demo build. Your personal QR resolves to rbubank.app/pay/denrech." }),
      h("button.btn.btn-primary", { type: "button", onclick: function () { ui.closeSheet(); ui.copy("https://rbubank.app/pay/denrech", "Payment link copied"); }, text: "Copy my payment link" }),
    ]));
  }

  /* ------------------------------------------------------------- login */

  V.login = function (app) {
    var code = "";
    var dots = h("div.dots", {}, [0, 1, 2, 3].map(function (i) { return h("div.dot-cell"); }));

    function paint() {
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.classList.toggle("is-on", i < code.length);
      });
    }

    function unlock() {
      app.state.unlocked = true;
      ui.haptic("medium");
      app.go("home", {}, { replace: true, reset: true });
    }

    function press(v) {
      ui.haptic("light");
      if (v === "del") { code = code.slice(0, -1); paint(); return; }
      if (code.length >= 4) return;
      code += v;
      paint();
      if (code.length === 4) setTimeout(unlock, 190);
    }

    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(function (n) {
      return h("button.key", { type: "button", text: n, onclick: function () { press(n); } });
    });
    keys.push(h("button.key", { type: "button", "aria-label": "Face ID", onclick: unlock }, ui.icon("sparkle", 26)));
    keys.push(h("button.key", { type: "button", text: "0", onclick: function () { press("0"); } }));
    keys.push(h("button.key", { type: "button", "aria-label": "Delete", onclick: function () { press("del"); } }, ui.icon("backspace", 26)));

    return screen([
      h("div.spacer"),
      h("div.logo-mark", { text: "R" }),
      h("div.wordmark", { text: "RBUBANK" }),
      h("div.tagline", { text: "One account for everything money. Spend, save, send and exchange in 30+ currencies." }),
      h("div", { style: "display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--hairline-soft)" }, [
        h("div.avatar.is-sm", { text: data.profile.initials }),
        h("div", {}, [
          h("div", { style: "font-size:15px;font-weight:660;letter-spacing:-0.02em", text: data.profile.firstName + " " + data.profile.lastName }),
          h("div", { style: "font-size:12px;color:var(--text-3)", text: data.profile.plan + " plan · " + data.profile.handle }),
        ]),
      ]),
      dots,
      h("div", { style: "width:100%;max-width:300px" }, h("div.keypad", {}, keys)),
      h("div.muted", { style: "font-size:13px", text: "Demo build — any 4 digits unlock, or tap Face ID." }),
      h("div.spacer"),
      ui.footerNote(),
    ], "login");
  };

  /* -------------------------------------------------------------- home */

  V.home = function (app) {
    var ledger = app.ledger();
    var total = app.totalUSD();
    /* A calendar month is a bad headline on the 2nd of the month, so Home
       always reports the rolling 30 days. */
    var since = new Date(data.TODAY.getTime() - 30 * 864e5).toISOString();
    var inMonth = 0, outMonth = 0;
    ledger.forEach(function (t) {
      if (t.date < since || t.status === "pending") return;
      var cur = accCur(t.account);
      if (cur === "BTC") return;
      var usd = t.amount * (data.rates[cur] || 1);
      if (t.category === "savings" || t.category === "exchange" || t.category === "crypto") return;
      if (usd > 0) inMonth += usd; else outMonth += -usd;
    });

    var pending = ledger.filter(function (t) { return t.status === "pending" && t.amount > 0; })[0];
    var stats = app.stats(12);

    var accountChips = h("div.scroll-row", {}, data.accounts.map(function (a) {
      var tag = a.kind === "savings" ? "Vault" : a.kind === "crypto" ? "Bitcoin" : a.id === "usd" ? "Main" : a.currency;
      return h("button.pill", {
        type: "button",
        onclick: function () { app.go("account", { id: a.id }); },
      }, [
        h("span", { style: "color:var(--text-3)", text: tag }),
        h("span.num", { text: ui.money(app.balance(a.id), a.currency) }),
      ]);
    }));

    var card = data.cards[0];
    var frozen = app.state.frozen[card.id];

    return screen([
      topbar(app),
      h("div.hero", {}, [
        h("div.hero-label", { text: "Total balance" }),
        h("div.hero-number", {}, ui.heroMoney(total, "USD")),
        h("div.hero-note", { text: "Across " + data.accounts.length + " accounts · " + ui.money(inMonth - outMonth, "USD", { signed: inMonth - outMonth > 0 }) + " in 30 days" }),
      ]),
      accountChips,
      h("div.quick-grid", {}, [
        quick("Send", "send", function () { app.flow = null; app.go("send"); }),
        quick("Request", "download", function () { app.go("request"); }),
        quick("Add money", "plus", function () { app.go("topup"); }),
        quick("Exchange", "swap", function () { app.go("exchange"); }),
      ]),
      h("div.quick-grid", {}, [
        quick("Withdraw", "atm", function () { app.go("withdraw"); }),
        quick("Split", "users", function () { app.go("split"); }),
        quick("Scheduled", "repeat", function () { app.go("scheduled"); }),
        quick("Vault", "vault", function () { app.go("vault"); }),
      ]),

      pending ? h("div.card", { style: "border-color:color-mix(in srgb, var(--credit) 30%, transparent)" }, [
        h("div.card-title", { text: "Incoming" }),
        h("div", { style: "display:flex;align-items:center;gap:12px" }, [
          h("div.glyph.is-credit", {}, ui.icon("download", 20)),
          h("div.row-main", {}, [
            h("div.row-title", { text: pending.title }),
            h("div.row-sub", { text: "Arriving today · " + pending.method }),
          ]),
          h("div.row-value.credit", { text: ui.money(pending.amount, "USD", { signed: true }) }),
        ]),
      ]) : null,

      h("div.stat-grid", {}, [
        h("div.stat", {}, [
          h("div.stat-label", { text: "Money in · 30 days" }),
          h("div.stat-value.credit", { text: ui.money(inMonth, "USD", { round: true }) }),
          h("div.stat-sub", { text: "12-month income " + ui.money(stats.salary, "USD", { round: true }) }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Money out · 30 days" }),
          h("div.stat-value", { text: ui.money(outMonth, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Budget $4,500 · " + Math.round((outMonth / 4500) * 100) + "% used" }),
        ]),
      ]),

      h("button", { class: "bankcard" + (frozen ? " is-frozen" : "") + (card.metal ? " is-metal" : ""), type: "button", style: "text-align:left;font-family:inherit;color:inherit;cursor:pointer;width:100%", onclick: function () { app.go("card", { id: card.id }); } }, [
        h("div.bankcard-top", {}, [
          h("div", {}, [
            h("div.bankcard-brand", { text: "RBUBANK" }),
            h("div.bankcard-kind", { text: card.kind }),
          ]),
          h("div.bankcard-chip"),
        ]),
        h("div.bankcard-num", { text: card.number }),
        h("div.bankcard-bottom", {}, [
          h("div", {}, [
            h("div.bankcard-holder", { text: data.profile.firstName + " " + data.profile.lastName }),
            h("div.bankcard-meta", { text: "Exp " + card.expiry + " · spent " + ui.money(monthCardSpend(app), "USD", { round: true }) + " of " + ui.money(card.monthlyLimit, "USD", { round: true }) }),
          ]),
          h("div.bankcard-net", { text: card.network }),
        ]),
        frozen ? h("div.bankcard-frozen-tag", { text: "Frozen" }) : null,
      ]),

      h("div", {}, [
        sectionHead("Recent activity", "See all", function () { app.go("activity"); }),
        txList(ledger, { limit: 7 }),
      ]),

      h("div.card", {}, [
        h("div.card-title", { text: "Income · last 12 months" }),
        incomeChart(app),
        h("div", { style: "display:flex;justify-content:space-between;margin-top:12px" }, [
          h("div.muted", { style: "font-size:13.5px", text: "Contract income" }),
          h("div", { style: "font-size:15px;font-weight:680", text: ui.money(stats.salary, "USD", { round: true }) }),
        ]),
      ]),

      h("button.card", { type: "button", style: "text-align:left;width:100%;cursor:pointer;color:inherit;font-family:inherit", onclick: function () { app.go("vault"); } }, [
        h("div", { style: "display:flex;align-items:center;gap:12px" }, [
          h("div.glyph.is-accent", {}, ui.icon("vault", 20)),
          h("div.row-main", {}, [
            h("div.row-title", { text: "Savings vault" }),
            h("div.row-sub", { text: "4.15% APY · interest paid monthly" }),
          ]),
          h("div.row-end", {}, [
            h("div.row-value", { text: ui.money(app.balance("vault"), "USD") }),
            h("div.row-value-sub", { text: "+$500 / month" }),
          ]),
        ]),
      ]),

      ui.footerNote(),
    ]);
  };

  function monthCardSpend(app) {
    var since = new Date(data.TODAY.getTime() - 30 * 864e5).toISOString();
    var sum = 0;
    app.ledger().forEach(function (t) {
      if (t.date < since || t.amount > 0) return;
      if (t.method && t.method.indexOf("ard") > -1) sum += -t.amount * (data.rates[accCur(t.account)] || 1);
    });
    return sum;
  }

  /* Twelve income bars — the single most-asked question in a bank demo:
     "does money actually arrive here, and how regularly?" */
  function incomeChart(app) {
    var buckets = {};
    app.ledger().forEach(function (t) {
      if (t.category !== "income" || t.account !== "usd" || t.status === "pending") return;
      var k = ui.monthKey(t.date);
      buckets[k] = (buckets[k] || 0) + t.amount;
    });
    var keys = Object.keys(buckets).sort().slice(-12);
    var max = keys.reduce(function (m, k) { return Math.max(m, buckets[k]); }, 1);
    return h("div.chart", {}, keys.map(function (k) {
      var pct = Math.max(6, (buckets[k] / max) * 100);
      return h("div.chart-col", { title: ui.monthLabel(k) + " · " + ui.money(buckets[k], "USD") }, [
        h("div.chart-stack", {}, h("div.chart-bar.is-credit", { style: "height:" + pct + "%" })),
        h("div.chart-x", { text: ui.monthShort(k) }),
      ]);
    }));
  }

  /* ----------------------------------------------------------- activity */

  var FILTERS = [
    { id: "all", label: "All" },
    { id: "income", label: "Income" },
    { id: "card", label: "Card" },
    { id: "transfer", label: "Transfers" },
    { id: "cash", label: "Withdrawals" },
    { id: "exchange", label: "Exchange" },
    { id: "pending", label: "Pending" },
  ];

  function matches(t, filter, query) {
    if (query) {
      var q = query.toLowerCase();
      var hay = (t.title + " " + t.subtitle + " " + t.method + " " + t.ref).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (filter === "all") return true;
    if (filter === "income") return t.amount > 0 && (t.category === "income" || t.category === "cashback");
    if (filter === "card") return (t.method || "").indexOf("ard") > -1;
    if (filter === "transfer") return t.category === "transfer" || t.category === "savings";
    if (filter === "cash") return t.category === "cash" || (t.category === "transfer" && t.title.indexOf("Withdraw") === 0);
    if (filter === "exchange") return t.category === "exchange" || t.category === "crypto";
    if (filter === "pending") return t.status === "pending";
    return true;
  }

  V.activity = function (app) {
    var items = app.ledger().filter(function (t) { return matches(t, app.filter, app.query); });
    var listWrap = h("div", {}, txList(items, { limit: 220 }));

    /* Internal moves (vault, FX, crypto) are not income or spending — counting
       them would inflate both sides of the summary. */
    var INTERNAL = { savings: 1, exchange: 1, crypto: 1 };
    var totals = items.reduce(function (acc, t) {
      var cur = accCur(t.account);
      if (cur === "BTC" || t.status === "pending" || INTERNAL[t.category]) return acc;
      var usd = t.amount * (data.rates[cur] || 1);
      if (usd > 0) acc.in += usd; else acc.out += -usd;
      return acc;
    }, { in: 0, out: 0 });

    function refresh() {
      var next = app.ledger().filter(function (t) { return matches(t, app.filter, app.query); });
      ui.clear(listWrap).appendChild(txList(next, { limit: 220 }));
    }

    return screen([
      h("div.head", {}, [
        h("div", {}, [
          h("div.eyebrow", { text: "Ledger" }),
          h("h1.head-title", { text: "Activity" }),
        ]),
        h("button.icon-btn", { type: "button", "aria-label": "Statement", onclick: function () { app.go("statements"); } }, ui.icon("doc", 20)),
      ]),
      h("div.search", {}, [
        ui.icon("search", 18),
        h("input", {
          type: "search",
          placeholder: "Search merchant, person, reference",
          value: app.query,
          oninput: function (e) { app.query = e.target.value; refresh(); },
        }),
      ]),
      h("div.scroll-row", {}, FILTERS.map(function (f) {
        var btn = h("button", {
          class: "pill" + (app.filter === f.id ? " is-on" : ""),
          type: "button",
          text: f.label,
          onclick: function () {
            app.filter = f.id;
            ui.haptic("light");
            app.render();
          },
        });
        return btn;
      })),
      h("div.stat-grid", {}, [
        h("div.stat", {}, [
          h("div.stat-label", { text: "In" }),
          h("div.stat-value.credit", { text: ui.money(totals.in, "USD", { round: true }) }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Out" }),
          h("div.stat-value", { text: ui.money(totals.out, "USD", { round: true }) }),
        ]),
      ]),
      listWrap,
      ui.footerNote(),
    ]);
  };

  /* -------------------------------------------------------------- wealth */

  V.wealth = function (app) {
    var total = app.totalUSD();
    return screen([
      h("div.head", {}, [
        h("div", {}, [
          h("div.eyebrow", { text: "Net position" }),
          h("h1.head-title", { text: "Wealth" }),
        ]),
        h("button.icon-btn", { type: "button", "aria-label": "Analytics", onclick: function () { app.go("analytics"); } }, ui.icon("wealth", 20)),
      ]),
      h("div.hero", {}, [
        h("div.hero-label", { text: "Total in USD" }),
        h("div.hero-number", {}, ui.heroMoney(total, "USD")),
        h("div.hero-note", { text: "Cash, savings and crypto · updated live" }),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Accounts" }),
        h("div.rows", {}, data.accounts.map(function (a) {
          var bal = app.balance(a.id);
          return h("button.row", { type: "button", onclick: function () { app.go("account", { id: a.id }); } }, [
            h("div", { class: "glyph" + (a.kind === "savings" ? " is-accent" : a.kind === "crypto" ? " is-warn" : "") },
              ui.icon(a.kind === "savings" ? "vault" : a.kind === "crypto" ? "coin" : "globe", 20)),
            h("div.row-main", {}, [
              h("div.row-title", { text: a.name }),
              h("div.row-sub", { text: a.note }),
            ]),
            h("div.row-end", {}, [
              h("div.row-value", { text: ui.money(bal, a.currency) }),
              a.currency !== "USD" ? h("div.row-value-sub", { text: "≈ " + ui.money(bal * data.rates[a.currency], "USD", { round: true }) }) : null,
            ]),
          ]);
        })),
      ]),
      h("div.actions", {}, [
        h("button.btn.btn-ghost", { type: "button", onclick: function () { openCurrencySheet(app); }, text: "Open a new currency account" }),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Products" }),
        h("div.rows", {}, [
          productRow(app, "Cards", "2 active · Metal & virtual", "card", function () { app.go("cards"); }),
          productRow(app, "Savings vault", "4.15% APY · " + ui.money(app.balance("vault"), "USD", { round: true }), "vault", function () { app.go("vault"); }),
          productRow(app, "Crypto", app.balance("btc").toFixed(6) + " BTC · ≈ " + ui.money(app.balanceInUSD("btc"), "USD", { round: true }), "coin", function () { app.go("crypto"); }),
          productRow(app, "Analytics", "Spending, categories, merchants", "wealth", function () { app.go("analytics"); }),
          productRow(app, "Scheduled payments", data.scheduled.length + " active", "repeat", function () { app.go("scheduled"); }),
        ]),
      ]),
      ui.footerNote(),
    ]);
  };

  function productRow(app, title, sub, iconName, onclick) {
    return h("button.row", { type: "button", onclick: onclick }, [
      h("div.glyph.is-accent", {}, ui.icon(iconName, 20)),
      h("div.row-main", {}, [
        h("div.row-title", { text: title }),
        h("div.row-sub", { text: sub }),
      ]),
      h("div.row-chev", {}, ui.icon("chev", 18)),
    ]);
  }

  function openCurrencySheet(app) {
    var list = ["CHF Swiss Franc", "PLN Polish Zloty", "AED UAE Dirham", "SEK Swedish Krona", "TRY Turkish Lira", "JPY Japanese Yen"];
    ui.sheet("Open an account", "Hold and exchange 30+ currencies with the interbank rate.", h("div.rows", {}, list.map(function (c) {
      return h("button.row", { type: "button", onclick: function () { ui.closeSheet(); ui.toast("Account requested", c + " opens instantly on the live product"); } }, [
        h("div.glyph", {}, ui.icon("globe", 20)),
        h("div.row-main", {}, [h("div.row-title", { text: c.slice(4) }), h("div.row-sub", { text: c.slice(0, 3) + " · no monthly fee" })]),
        h("div.row-chev", {}, ui.icon("plus", 18)),
      ]);
    })));
  }

  /* ------------------------------------------------------------- account */

  V.account = function (app, params) {
    var acc = app.account(params.id) || data.accounts[0];
    var items = app.ledger().filter(function (t) { return t.account === acc.id; });
    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div.hero", {}, [
        h("div.hero-label", { text: acc.name }),
        h("div.hero-number", {}, ui.heroMoney(app.balance(acc.id), acc.currency)),
        h("div.hero-note", { text: acc.note + (acc.currency !== "USD" ? " · ≈ " + ui.money(app.balanceInUSD(acc.id), "USD") : "") }),
      ]),
      h("div.quick-grid", {}, [
        quick("Send", "send", function () { app.flow = null; app.go("send"); }),
        quick("Add", "plus", function () { app.go("topup"); }),
        quick("Exchange", "swap", function () { app.go("exchange"); }),
        quick("Details", "doc", function () { app.go("details"); }),
      ]),
      h("div", {}, [
        sectionHead("Transactions", null),
        txList(items, { limit: 60 }),
      ]),
      ui.footerNote(),
    ]);
  };

  /* ----------------------------------------------------------- analytics */

  V.analytics = function (app) {
    var stats = app.stats(12);
    var byMonth = {};
    var byCat = {};
    var byMerchant = {};
    app.ledger().forEach(function (t) {
      var cur = accCur(t.account);
      if (cur === "BTC" || t.status === "pending") return;
      var usd = t.amount * (data.rates[cur] || 1);
      var k = ui.monthKey(t.date);
      byMonth[k] = byMonth[k] || { in: 0, out: 0 };
      if (t.category === "savings" || t.category === "exchange" || t.category === "crypto") return;
      if (usd > 0) byMonth[k].in += usd;
      else {
        byMonth[k].out += -usd;
        byCat[t.category] = (byCat[t.category] || 0) + -usd;
        byMerchant[t.title] = (byMerchant[t.title] || 0) + -usd;
      }
    });
    var months = Object.keys(byMonth).sort().slice(-12);
    var max = months.reduce(function (m, k) { return Math.max(m, byMonth[k].in, byMonth[k].out); }, 1);

    var cats = Object.keys(byCat).map(function (k) { return { k: k, v: byCat[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
    var catMax = cats.length ? cats[0].v : 1;

    var merchants = Object.keys(byMerchant).map(function (k) { return { k: k, v: byMerchant[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 6);

    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div.head", {}, h("div", {}, [
        h("div.eyebrow", { text: "Last 12 months" }),
        h("h1.head-title", { text: "Analytics" }),
      ])),
      h("div.stat-grid", {}, [
        h("div.stat", {}, [
          h("div.stat-label", { text: "Total in" }),
          h("div.stat-value.credit", { text: ui.money(stats.income, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Contract income " + ui.money(stats.salary, "USD", { round: true }) }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Total out" }),
          h("div.stat-value", { text: ui.money(stats.spend, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Avg " + ui.money(stats.spend / 12, "USD", { round: true }) + " / month" }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Saved" }),
          h("div.stat-value", { text: ui.money(stats.net, "USD", { round: true }) }),
          h("div.stat-sub", { text: Math.round((stats.net / Math.max(stats.income, 1)) * 100) + "% of income" }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Vault" }),
          h("div.stat-value", { text: ui.money(app.balance("vault"), "USD", { round: true }) }),
          h("div.stat-sub", { text: "4.15% APY" }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "In vs out" }),
        h("div.chart", {}, months.map(function (k) {
          var b = byMonth[k];
          return h("div.chart-col", { title: ui.monthLabel(k) }, [
            h("div", { style: "display:flex;align-items:flex-end;gap:3px;height:100%;width:100%" }, [
              h("div.chart-bar.is-credit", { style: "height:" + Math.max(4, (b.in / max) * 100) + "%" }),
              h("div.chart-bar", { style: "height:" + Math.max(4, (b.out / max) * 100) + "%" }),
            ]),
            h("div.chart-x", { text: ui.monthShort(k) }),
          ]);
        })),
        h("div.chart-legend", { style: "margin-top:12px" }, [
          h("span.legend-key", {}, [h("span.legend-swatch", { style: "background:var(--credit)" }), "Money in"]),
          h("span.legend-key", {}, [h("span.legend-swatch", { style: "background:var(--accent-1)" }), "Money out"]),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Where it goes" }),
        h("div.bar-line", {}, cats.map(function (c) {
          var label = (data.categories[c.k] || { label: c.k }).label;
          return h("div.bar-item", {}, [
            h("div.bar-name", { text: label }),
            h("div.bar-track", {}, h("div.bar-fill", { style: "width:" + Math.max(4, (c.v / catMax) * 100) + "%" })),
            h("div.bar-val", { text: ui.money(c.v, "USD", { round: true }) }),
          ]);
        })),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Top merchants" }),
        h("div.rows", {}, merchants.map(function (m) {
          return h("div.row", {}, [
            ui.initialsGlyph(m.k, "is-sm"),
            h("div.row-main", {}, h("div.row-title", { text: m.k })),
            h("div.row-value", { text: ui.money(m.v, "USD", { round: true }) }),
          ]);
        })),
      ]),
      ui.footerNote(),
    ]);
  };

  NS.components = { screen: screen, txRow: txRow, txList: txList, txSheet: txSheet, quick: quick, sectionHead: sectionHead, accCur: accCur };
})(window.RBU);
