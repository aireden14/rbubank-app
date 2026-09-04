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
      class: "row-value" + (credit ? " credit" : "") + (t.status === "declined" ? " is-void" : ""),
      text: ui.money(t.amount, cur, { signed: credit }),
    });
  }

  /* Card payments show the merchant's initials the way a statement does;
     everything else keeps its category icon, so the two read differently. */
  var ICON_CATEGORIES = { salary: 1, income: 1, transfer: 1, exchange: 1, savings: 1, crypto: 1, cash: 1, fees: 1, cashback: 1, utilities: 1, housing: 1, insurance: 1, taxes: 1 };

  function rowGlyph(t) {
    if (ICON_CATEGORIES[t.category] || t.amount > 0) return ui.glyphFor(t);
    var bits = String(t.title).replace(/^Refund · /, "").split(/[\s.]+/).filter(Boolean);
    var initials = ((bits[0] || "?")[0] + (bits[1] ? bits[1][0] : "")).toUpperCase();
    return h("div.glyph", { text: initials });
  }

  function subFor(t) {
    if (t.status === "pending") return "Pending · " + (t.subtitle || t.method);
    if (t.status === "declined") return "Declined · " + (t.reason || t.method);
    return ui.timeLabel(t.date) + " · " + (t.subtitle || t.method);
  }

  function txRow(t) {
    var isSalary = t.category === "salary";
    return h("button.row", {
      type: "button",
      onclick: function () { NS.app.go("receipt", { id: t.id }); },
    }, [
      rowGlyph(t),
      h("div.row-main", {}, [
        h("div.row-title", {}, [
          h("span", { class: "title-text" + (t.status === "declined" ? " is-void" : ""), text: t.title }),
          isSalary ? h("span.tag", { text: t.stream === "bonus" ? "Bonus" : "Salary" }) : null,
        ]),
        h("div.row-sub", { class: t.status === "declined" ? "is-bad" : "" }, [
          t.status === "pending" ? h("span.status-dot") : null,
          t.status === "declined" ? h("span.status-dot.is-bad") : null,
          subFor(t),
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
      h("div.demo-note", { text: "Your personal QR resolves to rbubank.app/pay/denis — it works with any bank or card." }),
      h("button.btn.btn-primary", { type: "button", onclick: function () { ui.closeSheet(); ui.copy("https://rbubank.app/pay/denis", "Payment link copied"); }, text: "Copy my payment link" }),
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
      h("img.logo-mark", { src: "brand/logo-mark.svg", alt: "RBUBANK", width: 80, height: 80 }),
      h("img.logo-word", { src: "brand/logo-wordmark.svg", alt: "RBUBANK" }),
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
      h("div.muted", { style: "font-size:13px", text: "Enter any 4 digits, or tap Face ID." }),
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
    var stats = app.stats("1y");
    /* The monthly budget is derived from how this account actually behaves,
       rounded to a number a human would have picked. */
    var budget = Math.max(1000, Math.ceil((stats.spend / 12) * 1.08 / 500) * 500);

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

      pending ? h("button.card", {
        type: "button",
        style: "width:100%;text-align:left;font-family:inherit;color:inherit;cursor:pointer",
        onclick: function () { app.go("receipt", { id: pending.id }); },
      }, [
        h("div.card-title", { text: pending.category === "salary" ? "Salary arriving today" : "Incoming" }),
        h("div", { style: "display:flex;align-items:center;gap:12px" }, [
          h("div.glyph", {}, ui.icon(pending.category === "salary" ? "wallet" : "download", 20)),
          h("div.row-main", {}, [
            h("div.row-title", { text: pending.title }),
            h("div.row-sub", { text: pending.subtitle + " · " + pending.method.split(" · ")[0] }),
          ]),
          h("div.row-value.credit", { text: ui.money(pending.amount, "USD", { signed: true }) }),
        ]),
      ]) : null,

      h("div.stat-grid", {}, [
        h("div.stat", {}, [
          h("div.stat-label", { text: "Money in · 30 days" }),
          h("div.stat-value.credit", { text: ui.money(inMonth, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Salary · 12 months " + ui.money(stats.salary, "USD", { round: true }) }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Money out · 30 days" }),
          h("div.stat-value", { text: ui.money(outMonth, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Budget " + ui.money(budget, "USD", { round: true }) + " · " + Math.round((outMonth / budget) * 100) + "% used" }),
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

      salaryCard(app, stats),

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

  /* The payroll card: when the next salary lands, what the last one was, and
     twelve bars proving the rhythm. This is the screen a payroll client is
     being sold, so it says "salary" in every line. */
  function salaryCard(app, stats) {
    /* The monthly run, not a bonus that happened to land the same morning. */
    var runs = app.ledger().filter(function (t) { return t.stream === "salary" && t.status === "completed"; });
    var last = runs[0];
    var next = data.employer.payDay + " Oct 2026";
    return h("button.card", {
      type: "button",
      style: "width:100%;text-align:left;font-family:inherit;color:inherit;cursor:pointer",
      onclick: function () { app.period = "1y"; app.filter = "salary"; app.tab("activity"); },
    }, [
      h("div", { style: "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px" }, [
        h("div", {}, [
          h("div.card-title", { style: "margin:0", text: "Salary · " + data.employer.name }),
          h("div", { style: "font-size:13.5px;color:var(--text-2);margin-top:5px", text: "Paid on the " + data.employer.payDay + "th · next " + next }),
        ]),
        h("span.tag", { text: "Payroll" }),
      ]),
      incomeChart(app),
      h("div", { style: "display:flex;justify-content:space-between;margin-top:14px;align-items:baseline" }, [
        h("div.muted", { style: "font-size:13.5px", text: "Net salary · 12 months" }),
        h("div", { style: "font-size:17px;font-weight:700", text: ui.money(stats.salary, "USD", { round: true }) }),
      ]),
      last ? h("div", { style: "display:flex;justify-content:space-between;margin-top:4px" }, [
        h("div.muted", { style: "font-size:13px", text: "Last salary · " + ui.dayLabel(last.date) }),
        h("div.credit", { style: "font-size:13.5px;font-weight:640", text: ui.money(last.amount, "USD", { signed: true }) }),
      ]) : null,
    ]);
  }

  /* Twelve salary bars — the single most-asked question in a payroll demo:
     "does money actually arrive here, and how regularly?" */
  function incomeChart(app) {
    var buckets = {};
    app.ledger().forEach(function (t) {
      if (t.category !== "salary" || t.stream !== "salary" || t.status !== "completed") return;
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
    { id: "salary", label: "Salary" },
    { id: "income", label: "Other income" },
    { id: "card", label: "Card" },
    { id: "subs", label: "Subscriptions" },
    { id: "transfer", label: "Transfers" },
    { id: "cash", label: "Cash & payouts" },
    { id: "exchange", label: "Exchange" },
    { id: "pending", label: "Pending" },
    { id: "declined", label: "Declined" },
  ];

  var PERIODS = [
    { id: "7d", label: "7D", long: "last 7 days" },
    { id: "1m", label: "1M", long: "last month" },
    { id: "3m", label: "3M", long: "last 3 months" },
    { id: "6m", label: "6M", long: "last 6 months" },
    { id: "1y", label: "1Y", long: "last 12 months" },
    { id: "all", label: "All", long: "all time" },
  ];

  /* Opening the ledger shows the last week. Reaching back further pulls in
     hundreds of rows, so those periods load rather than appear. */
  var HEAVY = { "6m": 1, "1y": 1, all: 1 };

  function periodPicker(app, onPick) {
    return h("div.segmented", {}, PERIODS.map(function (p) {
      return h("button", {
        class: "segment" + (app.period === p.id ? " is-on" : ""),
        type: "button",
        text: p.label,
        onclick: function () {
          if (app.period === p.id) return;
          ui.haptic("light");
          app.period = p.id;
          app.listLimit = 60;
          if (HEAVY[p.id]) {
            app.loading = true;
            app.render();
            setTimeout(function () { app.loading = false; app.render(); }, 900);
          } else {
            app.render();
          }
          if (onPick) onPick(p.id);
        },
      });
    }));
  }

  /* Skeleton rows: the loading state has to look like the thing that is
     coming, not like a spinner on an empty screen. */
  function skeletonList(rows) {
    var out = [];
    for (var i = 0; i < (rows || 8); i++) {
      out.push(h("div.skeleton-row", {}, [
        h("div.sk.sk-glyph"),
        h("div.sk-main", {}, [
          h("div.sk.sk-line", { style: "width:" + (46 + ((i * 13) % 34)) + "%" }),
          h("div.sk.sk-line.is-thin", { style: "width:" + (28 + ((i * 7) % 26)) + "%" }),
        ]),
        h("div.sk.sk-amount"),
      ]));
    }
    return h("div", {}, [
      h("div.loading-note", {}, [h("span.spinner"), "Loading your history…"]),
      h("div.rows", {}, out),
    ]);
  }

  function matches(t, filter, query) {
    if (query) {
      var q = query.toLowerCase();
      var hay = (t.title + " " + t.subtitle + " " + t.method + " " + t.ref + " " + t.city + " " + Math.abs(t.amount)).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (filter === "all") return true;
    if (filter === "salary") return t.category === "salary";
    if (filter === "income") return t.amount > 0 && (t.category === "income" || t.category === "cashback");
    if (filter === "card") return (t.method || "").indexOf("ard") > -1;
    if (filter === "subs") return t.category === "subscriptions" || t.category === "software" || (t.method || "").indexOf("Direct debit") > -1;
    if (filter === "transfer") return t.category === "transfer" || t.category === "savings";
    if (filter === "cash") return t.category === "cash";
    if (filter === "exchange") return t.category === "exchange" || t.category === "crypto";
    if (filter === "pending") return t.status === "pending";
    if (filter === "declined") return t.status === "declined";
    return true;
  }

  function periodLabel(id) {
    var p = PERIODS.filter(function (x) { return x.id === id; })[0];
    return p ? p.long : "last 12 months";
  }

  /* Totals ignore internal moves — counting a vault top-up as both income and
     spending is the fastest way to lose an investor's trust in the numbers. */
  var INTERNAL = { savings: 1, exchange: 1, crypto: 1 };

  function summarise(items) {
    return items.reduce(function (acc, t) {
      var cur = accCur(t.account);
      if (cur === "BTC" || t.status !== "completed") return acc;
      acc.count += 1;
      if (INTERNAL[t.category]) return acc;
      var usd = t.amount * (data.rates[cur] || 1);
      if (usd > 0) acc.in += usd; else acc.out += -usd;
      return acc;
    }, { in: 0, out: 0, count: 0 });
  }

  V.activity = function (app) {
    function current() {
      return app.ledger().filter(function (t) {
        return app.inPeriod(t) && matches(t, app.filter, app.query);
      });
    }

    var items = current();
    var totals = summarise(items);
    var listWrap = h("div", {});
    var summaryWrap = h("div.stat-grid", {});

    function paintList() {
      if (app.loading) { ui.clear(listWrap); listWrap.appendChild(skeletonList(9)); return; }
      var next = current();
      ui.clear(listWrap);
      listWrap.appendChild(txList(next, { limit: app.listLimit }));
      if (next.length > app.listLimit) {
        listWrap.appendChild(h("button.btn.btn-ghost", {
          type: "button",
          style: "margin-top:14px",
          onclick: function () { app.listLimit += 80; paintList(); paintSummary(); },
          text: "Show more · " + (next.length - app.listLimit) + " left",
        }));
      }
      paintSummary(next);
    }

    function paintSummary(next) {
      if (app.loading) {
        ui.clear(summaryWrap);
        summaryWrap.appendChild(h("div.stat", {}, [h("div.sk.sk-line", { style: "width:52%" }), h("div.sk.sk-value")]));
        summaryWrap.appendChild(h("div.stat", {}, [h("div.sk.sk-line", { style: "width:40%" }), h("div.sk.sk-value")]));
        return;
      }
      var list = next || current();
      var t = summarise(list);
      ui.clear(summaryWrap);
      /* Declined payments are excluded from every total, so the summary would
         read as two zeroes — show what was attempted instead. */
      if (app.filter === "declined") {
        var attempted = list.reduce(function (sum, x) { return sum + Math.abs(x.amount) * (data.rates[accCur(x.account)] || 1); }, 0);
        summaryWrap.appendChild(h("div.stat", {}, [
          h("div.stat-label", { text: "Declined · " + periodLabel(app.period) }),
          h("div.stat-value", { text: String(list.length) }),
          h("div.stat-sub", { text: "None of these left your account" }),
        ]));
        summaryWrap.appendChild(h("div.stat", {}, [
          h("div.stat-label", { text: "Attempted" }),
          h("div.stat-value", { text: ui.money(attempted, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Blocked by limits or 3-D Secure" }),
        ]));
        return;
      }
      summaryWrap.appendChild(h("div.stat", {}, [
        h("div.stat-label", { text: "In · " + periodLabel(app.period) }),
        h("div.stat-value.credit", { text: ui.money(t.in, "USD", { round: true }) }),
        h("div.stat-sub", { text: t.count + " transactions" }),
      ]));
      summaryWrap.appendChild(h("div.stat", {}, [
        h("div.stat-label", { text: "Out" }),
        h("div.stat-value", { text: ui.money(t.out, "USD", { round: true }) }),
        h("div.stat-sub", { text: "Net " + ui.money(t.in - t.out, "USD", { round: true, signed: t.in > t.out }) }),
      ]));
    }

    paintList();

    return screen([
      h("div.head", {}, [
        h("div", {}, [
          h("div.eyebrow", { text: items.length + " of " + app.ledger().length + " transactions" }),
          h("h1.head-title", { text: "Activity" }),
        ]),
        h("button.icon-btn", { type: "button", "aria-label": "Statement", onclick: function () { app.go("statements"); } }, ui.icon("doc", 20)),
      ]),
      h("div.search", {}, [
        ui.icon("search", 18),
        h("input", {
          type: "search",
          placeholder: "Search merchant, person, amount",
          value: app.query,
          oninput: function (e) { app.query = e.target.value; app.listLimit = 60; paintList(); },
        }),
      ]),
      periodPicker(app),
      h("div.scroll-row", {}, FILTERS.map(function (f) {
        return h("button", {
          class: "pill" + (app.filter === f.id ? " is-on" : ""),
          type: "button",
          text: f.label,
          onclick: function () { app.filter = f.id; app.listLimit = 60; ui.haptic("light"); app.render(); },
        });
      })),
      summaryWrap,
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
    var shown = 40;
    var listWrap = h("div", {});

    function paint() {
      ui.clear(listWrap);
      listWrap.appendChild(txList(items, { limit: shown }));
      if (items.length > shown) {
        listWrap.appendChild(h("button.btn.btn-ghost", {
          type: "button", style: "margin-top:14px",
          onclick: function () { shown += 60; paint(); },
          text: "Show more · " + (items.length - shown) + " left",
        }));
      }
    }
    paint();
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
        sectionHead(items.length + " transactions", null),
        listWrap,
      ]),
      ui.footerNote(),
    ]);
  };

  /* ----------------------------------------------------------- analytics */

  V.analytics = function (app) {
    var stats = app.stats(app.period);
    var byBucket = {};
    var byCat = {};
    var byMerchant = {};
    var biggest = null;
    var weekly = app.period === "1m";

    /* One month of data is too thin for monthly bars, so it gets weeks. */
    function bucketOf(dateStr) {
      if (!weekly) return ui.monthKey(dateStr);
      var days = Math.floor((data.TODAY.getTime() - new Date(dateStr).getTime()) / 864e5);
      var w = Math.min(4, Math.floor(days / 7));
      return "W" + (4 - w);
    }
    function bucketLabel(key) { return weekly ? key : ui.monthShort(key); }

    app.ledger().forEach(function (t) {
      var cur = accCur(t.account);
      if (cur === "BTC" || t.status !== "completed" || !app.inPeriod(t)) return;
      var usd = t.amount * (data.rates[cur] || 1);
      var k = bucketOf(t.date);
      byBucket[k] = byBucket[k] || { in: 0, out: 0 };
      if (INTERNAL[t.category]) return;
      if (usd > 0) byBucket[k].in += usd;
      else {
        byBucket[k].out += -usd;
        byCat[t.category] = (byCat[t.category] || 0) + -usd;
        byMerchant[t.title] = (byMerchant[t.title] || 0) + -usd;
        if (!biggest || -usd > -biggest.amount) biggest = t;
      }
    });

    var buckets = Object.keys(byBucket).sort();
    var max = buckets.reduce(function (m, k) { return Math.max(m, byBucket[k].in, byBucket[k].out); }, 1);

    var cats = Object.keys(byCat).map(function (k) { return { k: k, v: byCat[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
    var catMax = cats.length ? cats[0].v : 1;
    var catTotal = cats.reduce(function (sum, c) { return sum + c.v; }, 0);

    var merchants = Object.keys(byMerchant).map(function (k) { return { k: k, v: byMerchant[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 8);

    var days = { "1m": 30, "3m": 91, "6m": 183, "1y": 365, all: 366 }[app.period] || 365;

    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div.head", {}, h("div", {}, [
        h("div.eyebrow", { text: periodLabel(app.period) }),
        h("h1.head-title", { text: "Analytics" }),
      ])),
      periodPicker(app),
      h("div.stat-grid", {}, [
        h("div.stat", {}, [
          h("div.stat-label", { text: "Total in" }),
          h("div.stat-value.credit", { text: ui.money(stats.income, "USD", { round: true }) }),
          h("div.stat-sub", { text: "Contract income " + ui.money(stats.salary, "USD", { round: true }) }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Total out" }),
          h("div.stat-value", { text: ui.money(stats.spend, "USD", { round: true }) }),
          h("div.stat-sub", { text: ui.money(stats.spend / (days / 30.4), "USD", { round: true }) + " / month" }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Saved" }),
          h("div.stat-value", { text: ui.money(stats.net, "USD", { round: true }) }),
          h("div.stat-sub", { text: Math.round((stats.net / Math.max(stats.income, 1)) * 100) + "% of income" }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Transactions" }),
          h("div.stat-value", { text: String(stats.count) }),
          h("div.stat-sub", { text: (stats.count / (days / 30.4)).toFixed(0) + " / month" }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "In vs out" }),
        h("div.chart", {}, buckets.map(function (k) {
          var b = byBucket[k];
          return h("div.chart-col", { title: k }, [
            h("div", { style: "display:flex;align-items:flex-end;gap:3px;height:100%;width:100%" }, [
              h("div.chart-bar.is-credit", { style: "height:" + Math.max(3, (b.in / max) * 100) + "%" }),
              h("div.chart-bar", { style: "height:" + Math.max(3, (b.out / max) * 100) + "%" }),
            ]),
            h("div.chart-x", { text: bucketLabel(k) }),
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
          return h("button.bar-item", {
            type: "button",
            style: "background:none;border:0;padding:0;font-family:inherit;color:inherit;cursor:pointer;width:100%",
            onclick: function () { categorySheet(app, c.k); },
          }, [
            h("div.bar-name", { text: label }),
            h("div.bar-track", {}, h("div.bar-fill", { style: "width:" + Math.max(4, (c.v / catMax) * 100) + "%" })),
            h("div.bar-val", { text: ui.money(c.v, "USD", { round: true }) }),
          ]);
        })),
        h("div.row-sub", { style: "margin-top:12px", text: "Top 10 categories · " + ui.money(catTotal, "USD", { round: true }) + " of " + ui.money(stats.spend, "USD", { round: true }) + " spent" }),
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
      biggest ? h("div.card", {}, [
        h("div.card-title", { text: "Biggest single payment" }),
        txRow(biggest),
      ]) : null,
      ui.footerNote(),
    ]);
  };

  /* Tapping a category bar opens everything inside it — the question every
     spending chart provokes. */
  function categorySheet(app, key) {
    var cat = data.categories[key] || { label: key };
    var items = app.ledger().filter(function (t) {
      return t.category === key && t.status === "completed" && app.inPeriod(t) && t.amount < 0;
    });
    var total = items.reduce(function (s, t) { return s + -t.amount * (data.rates[accCur(t.account)] || 1); }, 0);
    ui.sheet(cat.label, ui.money(total, "USD") + " across " + items.length + " payments · " + periodLabel(app.period),
      txList(items, { flat: true, limit: 40 }));
  }

  NS.components = { screen: screen, txRow: txRow, txList: txList, quick: quick, sectionHead: sectionHead, accCur: accCur };
})(window.RBU);
