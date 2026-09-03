/* RBUBANK — the account side of the app: cards, profile, account details,
   statements, security, notifications, support, plans and the product story
   an investor tends to ask for. */

window.RBU = window.RBU || {};
window.RBU.views = window.RBU.views || {};
(function (NS) {
  "use strict";

  var ui = NS.ui, data = NS.data, h = ui.h;
  var V = NS.views;
  var head = NS.flows.head;

  function screen(children, cls) { return NS.components.screen(children, cls); }
  function sectionHead(t, a, f) { return NS.components.sectionHead(t, a, f); }

  function navRow(title, sub, iconName, onclick, tone) {
    return h("button.row", { type: "button", onclick: onclick }, [
      h("div", { class: "glyph" + (tone ? " is-" + tone : "") }, ui.icon(iconName, 20)),
      h("div.row-main", {}, [
        h("div.row-title", { text: title }),
        sub ? h("div.row-sub", { text: sub }) : null,
      ]),
      h("div.row-chev", {}, ui.icon("chev", 18)),
    ]);
  }

  function switchRow(title, sub, on, onchange) {
    var sw = h("button", { class: "switch" + (on ? " is-on" : ""), type: "button", "aria-label": title });
    sw.addEventListener("click", function () {
      on = !on;
      sw.classList.toggle("is-on", on);
      ui.haptic("light");
      onchange(on);
    });
    return h("div.row", {}, [
      h("div.row-main", {}, [
        h("div.row-title", { text: title }),
        sub ? h("div.row-sub", { text: sub }) : null,
      ]),
      sw,
    ]);
  }

  function copyRow(label, value) {
    return h("button.row", { type: "button", onclick: function () { ui.copy(value, label + " copied"); } }, [
      h("div.row-main", {}, [
        h("div.row-sub", { style: "margin:0", text: label }),
        h("div.row-title", { class: "selectable", style: "font-size:15.5px;margin-top:3px", text: value }),
      ]),
      h("div.row-chev", {}, ui.icon("copy", 18)),
    ]);
  }

  /* -------------------------------------------------------------- cards */

  function bankcardEl(app, card, onclick) {
    var frozen = app.state.frozen[card.id];
    var revealed = app.state.revealed[card.id];
    return h("button", {
      class: "bankcard" + (card.metal ? " is-metal" : "") + (frozen ? " is-frozen" : ""),
      type: "button",
      style: "text-align:left;font-family:inherit;color:inherit;cursor:pointer;width:100%",
      onclick: onclick,
    }, [
      h("div.bankcard-top", {}, [
        h("div", {}, [
          h("div.bankcard-brand", { text: "RBUBANK" }),
          h("div.bankcard-kind", { text: card.kind }),
        ]),
        h("div.bankcard-chip"),
      ]),
      h("div", { class: "bankcard-num selectable", text: revealed ? card.fullNumber : card.number }),
      h("div.bankcard-bottom", {}, [
        h("div", {}, [
          h("div.bankcard-holder", { text: data.profile.firstName + " " + data.profile.lastName }),
          h("div.bankcard-meta", { text: revealed ? "Exp " + card.expiry + " · CVV " + card.cvv : "Exp " + card.expiry + " · CVV •••" }),
        ]),
        h("div.bankcard-net", { text: card.network }),
      ]),
      frozen ? h("div.bankcard-frozen-tag", { text: "Frozen" }) : null,
    ]);
  }

  V.cards = function (app) {
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Cards", "2 active"),
      h("div.stack.is-sm", {}, data.cards.map(function (c) {
        return bankcardEl(app, c, function () { app.go("card", { id: c.id }); });
      })),
      h("div.card", {}, [
        h("div.card-title", { text: "Add a card" }),
        h("div.rows", {}, [
          navRow("New virtual card", "Free · unlimited · instant", "plus", function () { ui.toast("Virtual card created", "Ready to use online (demo)"); }, "accent"),
          navRow("Disposable card", "New number after every purchase", "repeat", function () { ui.toast("Disposable card enabled", "Number refreshes after each payment"); }, "accent"),
          navRow("Order a physical card", "Metal · delivered in 5 days", "card", function () { ui.toast("Card ordered", "Tracking appears here once it ships"); }, "accent"),
        ]),
      ]),
      ui.footerNote(),
    ]);
  };

  V.card = function (app, params) {
    var card = data.cards.filter(function (c) { return c.id === params.id; })[0] || data.cards[0];
    var frozen = !!app.state.frozen[card.id];
    var spent = 0;
    var since = new Date(data.TODAY.getTime() - 30 * 864e5).toISOString();
    app.ledger().forEach(function (t) {
      if (t.date >= since && t.amount < 0 && (t.method || "").indexOf("ard") > -1) spent += -t.amount;
    });
    var cardTx = app.ledger().filter(function (t) { return (t.method || "").indexOf("ard") > -1; });

    return screen([
      ui.backBtn(function () { app.back(); }),
      bankcardEl(app, card, function () {
        app.state.revealed[card.id] = !app.state.revealed[card.id];
        ui.haptic("light");
        app.render();
      }),
      h("div.muted", { style: "text-align:center;font-size:13px", text: app.state.revealed[card.id] ? "Tap the card to hide the details" : "Tap the card to reveal the full number" }),
      h("div.quick-grid", {}, [
        NS.components.quick(frozen ? "Unfreeze" : "Freeze", "snow", function () {
          app.state.frozen[card.id] = !frozen;
          app.save();
          ui.haptic("medium");
          ui.toast(frozen ? "Card unfrozen" : "Card frozen", frozen ? "Payments work again" : "All payments are blocked instantly");
          app.render();
        }),
        NS.components.quick("Limits", "gear", function () { app.go("limits"); }),
        NS.components.quick("PIN", "lock", function () { ui.toast("Card PIN", "PIN " + card.cvv + "9 (demo only)"); }),
        NS.components.quick("Copy", "copy", function () { ui.copy(card.fullNumber, "Card number copied"); }),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Last 30 days" }),
        h("div", { style: "display:flex;align-items:baseline;justify-content:space-between" }, [
          h("div", { style: "font-size:26px;font-weight:700;letter-spacing:-0.03em", text: ui.money(spent, "USD") }),
          h("div.muted", { style: "font-size:13.5px", text: "of " + ui.money(card.monthlyLimit, "USD", { round: true }) + " limit" }),
        ]),
        h("div.bar-track", { style: "margin-top:10px" }, h("div.bar-fill", { style: "width:" + Math.min(100, (spent / card.monthlyLimit) * 100) + "%" })),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Card settings" }),
        h("div.rows", {}, [
          switchRow("Online payments", "Allow e-commerce transactions", true, function (v) { ui.toast(v ? "Online payments on" : "Online payments off"); }),
          switchRow("Contactless", "Tap to pay up to $200", true, function (v) { ui.toast(v ? "Contactless on" : "Contactless off"); }),
          switchRow("ATM withdrawals", "Cash out worldwide", true, function (v) { ui.toast(v ? "ATM on" : "ATM off"); }),
          switchRow("Magnetic stripe", "Off by default for security", false, function (v) { ui.toast(v ? "Stripe enabled for 24h" : "Stripe disabled"); }),
        ]),
      ]),
      h("div", {}, [
        sectionHead("Card transactions", null),
        NS.components.txList(cardTx, { limit: 25 }),
      ]),
      h("button.btn.btn-ghost.btn-danger", { type: "button", onclick: function () { ui.toast("Card reported", "A replacement is on its way"); }, text: "Report lost or stolen" }),
      ui.footerNote(),
    ]);
  };

  V.limits = function (app) {
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Limits", "Metal plan"),
      h("div.card", {}, [
        h("div.card-title", { text: "Card" }),
        h("div.rows", {}, [
          limitRow("Monthly card spend", 4380, 12000),
          limitRow("Single payment", 0, 5000),
          limitRow("ATM withdrawals (month)", 400, 2000),
          limitRow("Contactless without PIN", 0, 200),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Transfers" }),
        h("div.rows", {}, [
          limitRow("Daily transfers", 1200, 25000),
          limitRow("Fee-free FX (month)", 5240, 12000),
          limitRow("Crypto (month)", 420, 6000),
        ]),
      ]),
      h("div.demo-note", { text: "Limits are set by your plan and KYC tier. Raising a limit takes about two minutes and one extra document." }),
      ui.footerNote(),
    ]);
  };

  function limitRow(label, used, cap) {
    return h("div.row.is-stacked", { style: "display:block;padding:14px 0" }, [
      h("div", { style: "display:flex;justify-content:space-between;align-items:baseline" }, [
        h("div.row-title", { text: label }),
        h("div.row-value", { style: "font-size:14px", text: ui.money(used, "USD", { round: true }) + " / " + ui.money(cap, "USD", { round: true }) }),
      ]),
      h("div.bar-track", { style: "margin-top:9px" }, h("div.bar-fill", { style: "width:" + Math.min(100, (used / cap) * 100) + "%" })),
    ]);
  }

  /* ------------------------------------------------------------ profile */

  V.profile = function (app) {
    return screen([
      h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:10px;padding:6px 0 2px" }, [
        h("div.avatar.is-lg", { text: data.profile.initials }),
        h("div", { style: "font-size:23px;font-weight:700;letter-spacing:-0.03em", text: data.profile.firstName + " " + data.profile.lastName }),
        h("div.muted", { style: "font-size:14px", text: data.profile.handle + " · member since " + data.profile.memberSince }),
        h("div.pill-row", { style: "justify-content:center" }, [
          h("span.pill.is-static.is-accent", {}, [ui.icon("star", 14), data.profile.plan + " plan"]),
          h("span.pill.is-static.is-good", {}, [ui.icon("shield", 14), "KYC " + data.profile.kyc]),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Banking" }),
        h("div.rows", {}, [
          navRow("Account details", "IBAN, BIC, sort code, routing", "doc", function () { app.go("details"); }, "accent"),
          navRow("Statements", "Monthly PDF & CSV export", "receipt", function () { app.go("statements"); }, "accent"),
          navRow("Cards", "Metal & virtual", "card", function () { app.go("cards"); }, "accent"),
          navRow("Limits", "Spending and transfer caps", "gear", function () { app.go("limits"); }, "accent"),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Security & privacy" }),
        h("div.rows", {}, [
          navRow("Security", "Passcode, biometrics, devices", "shield", function () { app.go("security"); }),
          navRow("Notifications", "Alerts and what we message you about", "bell", function () { app.go("notifications"); }),
          switchRow("Travel mode", "Allow payments abroad without checks", app.state.settings.travelMode, function (v) {
            app.state.settings.travelMode = v; app.save();
          }),
          switchRow("Round-ups to vault", "Round every card payment to the nearest $1", app.state.settings.roundUps, function (v) {
            app.state.settings.roundUps = v; app.save();
          }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Your plan" }),
        h("div.rows", {}, [
          navRow("Plans & pricing", "Standard · Premium · Metal", "star", function () { app.go("plans"); }, "accent"),
          navRow("Invite friends", "Both get $25 · code " + data.profile.referralCode, "users", function () { ui.copy("https://rbubank.app/join/" + data.profile.referralCode, "Invite link copied"); }),
          navRow("Support", "Chat with us 24/7", "help", function () { app.go("support"); }),
          navRow("About RBUBANK", "The product, the licence, the roadmap", "sparkle", function () { app.go("about"); }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Profile" }),
        h("div.rows", {}, [
          h("div.row", {}, [h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: "Email" })), h("div.row-value", { style: "font-size:15px", text: data.profile.email })]),
          h("div.row", {}, [h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: "Phone" })), h("div.row-value", { style: "font-size:15px", text: data.profile.phone })]),
          h("div.row", {}, [h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: "Address" })), h("div.row-value", { style: "font-size:14px;max-width:60%;text-align:right", text: data.profile.address })]),
        ]),
      ]),
      h("div.actions", {}, [
        h("button.btn.btn-ghost", { type: "button", onclick: function () { app.reset(); }, text: "Reset demo data" }),
        h("button.btn.btn-ghost.btn-danger", {
          type: "button",
          onclick: function () {
            app.state.unlocked = false;
            app.stack = [];
            app.go("login", {}, { replace: true, reset: true });
          },
          text: "Log out",
        }),
      ]),
      ui.footerNote(),
    ]);
  };

  /* ----------------------------------------------------- account details */

  V.details = function (app) {
    var p = data.profile;
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Account details", "Get paid into RBUBANK"),
      h("div.card", {}, [
        h("div.card-title", { text: "International (USD / EUR / GBP)" }),
        h("div.rows", {}, [
          copyRow("Account holder", p.firstName + " " + p.lastName),
          copyRow("IBAN", p.iban),
          copyRow("BIC / SWIFT", p.bic),
          copyRow("Bank address", p.bankAddress),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Local (UK)" }),
        h("div.rows", {}, [
          copyRow("Sort code", p.sortCode),
          copyRow("Account number", p.accountNumber),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Local (US)" }),
        h("div.rows", {}, [
          copyRow("Routing number (ACH)", p.routing),
          copyRow("Account number", "9412 8830 1174"),
        ]),
      ]),
      h("div.actions", {}, [
        h("button.btn.btn-primary", { type: "button", onclick: function () { ui.copy(p.iban + " / " + p.bic, "Details copied"); }, text: "Copy all details" }),
        h("button.btn.btn-ghost", { type: "button", onclick: function () { ui.copy("https://rbubank.app/pay/denrech", "Payment link copied"); }, text: "Share payment link" }),
      ]),
      ui.footerNote(),
    ]);
  };

  /* --------------------------------------------------------- statements */

  V.statements = function (app) {
    var months = {};
    app.ledger().forEach(function (t) {
      var k = ui.monthKey(t.date);
      months[k] = months[k] || { in: 0, out: 0, n: 0 };
      var cur = NS.components.accCur(t.account);
      if (cur === "BTC") return;
      var usd = t.amount * (data.rates[cur] || 1);
      months[k].n += 1;
      if (usd > 0) months[k].in += usd; else months[k].out += -usd;
    });
    var keys = Object.keys(months).sort().reverse();

    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Statements", "Download or print"),
      h("div.card", {}, [
        h("div.card-title", { text: "Monthly statements" }),
        h("div.rows", {}, keys.map(function (k) {
          return h("button.row", { type: "button", onclick: function () { app.go("statement", { month: k }); } }, [
            h("div.glyph", {}, ui.icon("doc", 20)),
            h("div.row-main", {}, [
              h("div.row-title", { text: ui.monthLabel(k) }),
              h("div.row-sub", { text: months[k].n + " transactions · in " + ui.money(months[k].in, "USD", { round: true }) + " · out " + ui.money(months[k].out, "USD", { round: true }) }),
            ]),
            h("div.row-chev", {}, ui.icon("chev", 18)),
          ]);
        })),
      ]),
      h("button.btn.btn-ghost", { type: "button", onclick: function () { exportCSV(app); }, text: "Export full year as CSV" }),
      ui.footerNote(),
    ]);
  };

  function exportCSV(app) {
    var rows = [["date", "title", "subtitle", "account", "currency", "amount", "category", "method", "status", "reference"]];
    app.ledger().forEach(function (t) {
      rows.push([t.date, t.title, t.subtitle, t.account, NS.components.accCur(t.account), t.amount, t.category, t.method, t.status, t.ref]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    try {
      var blob = new Blob([csv], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "rbubank-statement.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      ui.toast("CSV exported", "rbubank-statement.csv");
    } catch (e) {
      ui.toast("Export unavailable", "Try from a desktop browser");
    }
  }

  V.statement = function (app, params) {
    var key = params.month || ui.monthKey(data.TODAY);
    var items = app.ledger().filter(function (t) { return ui.monthKey(t.date) === key; })
      .slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var inSum = 0, outSum = 0;
    items.forEach(function (t) {
      var cur = NS.components.accCur(t.account);
      if (cur === "BTC") return;
      var usd = t.amount * (data.rates[cur] || 1);
      if (usd > 0) inSum += usd; else outSum += -usd;
    });

    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div", { style: "display:flex;justify-content:space-between;align-items:flex-start" }, [
        h("div", {}, [
          h("div.wordmark", { style: "font-size:20px", text: "RBUBANK" }),
          h("div.muted", { style: "font-size:13px;margin-top:4px", text: "Statement · " + ui.monthLabel(key) }),
        ]),
        h("button.icon-btn", { type: "button", "aria-label": "Print", onclick: function () { window.print(); } }, ui.icon("download", 20)),
      ]),
      h("div.card", {}, h("div.rows", {}, [
        ["Account holder", data.profile.firstName + " " + data.profile.lastName],
        ["IBAN", data.profile.iban],
        ["Money in", ui.money(inSum, "USD")],
        ["Money out", ui.money(outSum, "USD")],
        ["Net", ui.money(inSum - outSum, "USD", { signed: inSum > outSum })],
      ].map(function (r) {
        return h("div.row", {}, [
          h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: r[0] })),
          h("div.row-value", { style: "font-size:15px", text: r[1] }),
        ]);
      }))),
      NS.components.txList(items, { flat: true, limit: 300 }),
      h("button.btn.btn-primary", { type: "button", onclick: function () { window.print(); }, text: "Print / save as PDF" }),
      ui.footerNote(),
    ]);
  };

  /* ------------------------------------------------------------ security */

  V.security = function (app) {
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Security", "You are protected"),
      h("div.card", {}, [
        h("div.card-title", { text: "Access" }),
        h("div.rows", {}, [
          switchRow("Face ID / biometrics", "Unlock and confirm payments", app.state.settings.biometrics, function (v) { app.state.settings.biometrics = v; app.save(); }),
          navRow("Change passcode", "Last changed 3 months ago", "lock", function () { ui.toast("Passcode", "Change flow is disabled in the demo"); }),
          navRow("Two-factor authentication", "On · authenticator app", "shield", function () { ui.toast("2FA is active", "Backup codes were downloaded in March"); }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Devices" }),
        h("div.rows", {}, [
          deviceRow("iPhone 16 Pro", "Limassol, CY · this device", true),
          deviceRow("MacBook Pro", "Limassol, CY · 2 days ago", false),
          deviceRow("iPad Air", "Nicosia, CY · 3 weeks ago", false),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Protection" }),
        h("div.rows", {}, [
          switchRow("Instant payment alerts", "Push for every transaction", app.state.settings.instantAlerts, function (v) { app.state.settings.instantAlerts = v; app.save(); }),
          switchRow("Block gambling merchants", "Declines gambling payments", false, function (v) { ui.toast(v ? "Gambling blocked" : "Gambling unblocked"); }),
          navRow("Deposit protection", "Eligible deposits covered up to €100,000", "shield", function () { ui.toast("Deposit protection", "Held with our partner bank under an EMI safeguarding structure"); }, "accent"),
        ]),
      ]),
      ui.footerNote(),
    ]);
  };

  function deviceRow(name, sub, current) {
    return h("div.row", {}, [
      h("div", { class: "glyph" + (current ? " is-accent" : "") }, ui.icon("lock", 20)),
      h("div.row-main", {}, [
        h("div.row-title", { text: name }),
        h("div.row-sub", { text: sub }),
      ]),
      current ? h("span.pill.is-static.is-good", { text: "Active" })
        : h("button.link", { type: "button", text: "Remove", onclick: function () { ui.toast("Device removed", name + " was signed out"); } }),
    ]);
  }

  /* ------------------------------------------------------- notifications */

  V.notifications = function (app) {
    var ledger = app.ledger();
    var items = [
      { icon: "download", tone: "credit", title: "Payment received", sub: "Helios Labs GmbH · $6,700.00 arriving today", when: "2h ago" },
      { icon: "card", tone: "", title: "Card payment", sub: (ledger[2] ? ledger[2].title : "Alphamega") + " · " + ui.money(ledger[2] ? ledger[2].amount : -42, "USD"), when: "5h ago" },
      { icon: "shield", tone: "accent", title: "New login", sub: "MacBook Pro · Limassol, Cyprus", when: "Yesterday" },
      { icon: "vault", tone: "accent", title: "Vault interest paid", sub: "$68.41 added to your Savings vault", when: "3 days ago" },
      { icon: "star", tone: "credit", title: "Cashback earned", sub: "$18.20 from Metal cashback", when: "5 days ago" },
      { icon: "repeat", tone: "", title: "Standing order due", sub: "Seaside Residences · $1,450.00 on 3 Oct", when: "Last week" },
    ];
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Notifications", "Everything, as it happens"),
      h("div.card", {}, [
        h("div.card-title", { text: "Preferences" }),
        h("div.rows", {}, [
          switchRow("Push notifications", "Payments, security, product news", app.state.settings.notifications, function (v) { app.state.settings.notifications = v; app.save(); }),
          switchRow("Instant payment alerts", "A push for every card payment", app.state.settings.instantAlerts, function (v) { app.state.settings.instantAlerts = v; app.save(); }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Recent" }),
        h("div.rows", {}, items.map(function (n) {
          return h("div.row", {}, [
            h("div", { class: "glyph" + (n.tone ? " is-" + n.tone : "") }, ui.icon(n.icon, 20)),
            h("div.row-main", {}, [
              h("div.row-title", { text: n.title }),
              h("div.row-sub", { text: n.sub }),
            ]),
            h("div.row-value-sub", { text: n.when }),
          ]);
        })),
      ]),
      ui.footerNote(),
    ]);
  };

  /* ------------------------------------------------------------- support */

  V.support = function (app) {
    var faq = [
      ["How fast are transfers?", "RBU-to-RBU is instant, SEPA Instant lands in under 10 seconds, SWIFT in one business day."],
      ["What does it cost?", "Standard is free. Premium is $9.99/month, Metal is $19.99/month with 1% cashback."],
      ["Is my money safe?", "Client funds are safeguarded at a partner bank and never used for lending."],
      ["Which currencies?", "Hold and exchange 30+ currencies at the interbank rate on weekdays."],
      ["How do I close my account?", "In two taps from Profile. Your balance is paid out the same day."],
    ];
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Support", "24/7, human"),
      h("div.card", {}, [
        h("div.card-title", { text: "Talk to us" }),
        h("div.rows", {}, [
          navRow("Chat with an agent", "Median reply 47 seconds", "help", function () { ui.toast("Chat opening", "An agent joins in under a minute"); }, "accent"),
          navRow("Report a lost card", "Freeze and replace instantly", "snow", function () { ui.toast("Card frozen", "A replacement is on its way"); }, "warn"),
          navRow("Dispute a transaction", "We hold the merchant to account", "receipt", function () { ui.toast("Dispute started", "We'll email you within 2 hours"); }),
        ]),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "Common questions" }),
        h("div.rows", {}, faq.map(function (f) {
          return h("button.row", { type: "button", onclick: function () { ui.sheet(f[0], null, h("p", { style: "font-size:15.5px;line-height:1.55;color:var(--text-2)", text: f[1] })); } }, [
            h("div.row-main", {}, h("div.row-title", { text: f[0] })),
            h("div.row-chev", {}, ui.icon("chev", 18)),
          ]);
        })),
      ]),
      ui.footerNote(),
    ]);
  };

  /* --------------------------------------------------------------- plans */

  V.plans = function (app) {
    var plans = [
      { name: "Standard", price: "Free", perks: ["Multi-currency account", "Free RBU transfers", "$200/month fee-free ATM", "1 virtual card"] },
      { name: "Premium", price: "$9.99 / month", perks: ["Everything in Standard", "$400/month fee-free ATM", "Unlimited virtual cards", "Travel insurance", "0.5% cashback"] },
      { name: "Metal", price: "$19.99 / month", perks: ["Everything in Premium", "Metal card", "1% cashback", "Priority support", "4.15% savings vault", "Fee-free FX to $12,000"], current: true },
    ];
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Plans", "Pick your level"),
      h("div.stack.is-sm", {}, plans.map(function (p) {
        return h("div", {
          class: "card",
          style: p.current ? "border-color:color-mix(in srgb, var(--accent-1) 52%, transparent)" : "",
        }, [
          h("div", { style: "display:flex;align-items:baseline;justify-content:space-between;gap:10px" }, [
            h("div", { style: "font-size:20px;font-weight:700;letter-spacing:-0.02em", text: p.name }),
            h("div", { class: p.current ? "" : "muted", style: "font-size:15px;font-weight:620", text: p.price }),
          ]),
          h("div", { style: "display:flex;flex-direction:column;gap:7px;margin-top:12px" }, p.perks.map(function (perk) {
            return h("div", { style: "display:flex;align-items:center;gap:9px;font-size:14.5px;color:var(--text-2)" }, [
              h("span", { style: "color:var(--credit);display:grid;place-items:center" }, ui.icon("check", 15)),
              perk,
            ]);
          })),
          p.current
            ? h("div.pill.is-static.is-accent", { style: "margin-top:14px", text: "Your current plan" })
            : h("button.btn.btn-ghost", { style: "margin-top:14px", type: "button", onclick: function () { ui.toast("Plan change", "Switching plans is disabled in the demo"); }, text: "Switch to " + p.name }),
        ]);
      })),
      ui.footerNote(),
    ]);
  };

  /* --------------------------------------------------------------- about */

  V.about = function (app) {
    var pillars = [
      ["One account, every currency", "Hold, spend and exchange 30+ currencies at the interbank rate — no hidden markup."],
      ["Instant by default", "RBU-to-RBU is instant, SEPA Instant clears in seconds, and every payment is pushed to your phone the moment it happens."],
      ["Savings that work", "A 4.15% vault with daily accrual and automatic round-ups, so saving needs no discipline."],
      ["Cards you control", "Freeze, limit, reveal or replace a card in one tap. Virtual and disposable numbers are free and unlimited."],
      ["Money you understand", "Every payment is categorised automatically, with 12-month analytics and exportable statements."],
    ];
    var metrics = [
      ["Target market", "European freelancers and cross-border SMEs"],
      ["Revenue", "Subscriptions, FX spread above allowance, interchange"],
      ["Unit economics", "$11.40 ARPU · $18 CAC target · 62% gross margin"],
      ["Licence path", "EMI licence via partner, own licence in year 2"],
      ["Status", "Clickable MVP · production build in progress"],
    ];
    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:10px;padding:4px 0" }, [
        h("div.logo-mark", { text: "R" }),
        h("div.wordmark", { text: "RBUBANK" }),
        h("div.tagline", { text: "One account for everything money." }),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "What it does" }),
        h("div", { style: "display:flex;flex-direction:column;gap:16px" }, pillars.map(function (p) {
          return h("div", {}, [
            h("div", { style: "font-size:16px;font-weight:660;letter-spacing:-0.02em", text: p[0] }),
            h("div", { style: "font-size:14px;color:var(--text-2);line-height:1.5;margin-top:4px", text: p[1] }),
          ]);
        })),
      ]),
      h("div.card", {}, [
        h("div.card-title", { text: "For investors" }),
        h("div.rows", {}, metrics.map(function (m) {
          return h("div.row", {}, [
            h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: m[0] })),
            h("div.row-value", { style: "font-size:14.5px;max-width:60%;text-align:right;font-weight:600", text: m[1] }),
          ]);
        })),
      ]),
      h("div.demo-note", { text: "This build is a front-end MVP. All balances, counterparties and transactions are simulated and stored only in your browser." }),
      ui.footerNote(),
    ]);
  };
})(window.RBU);
