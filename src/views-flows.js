/* RBUBANK — money movement: the transfer hub and every flow that actually
   creates a transaction (send, request, top-up, withdraw, exchange, split,
   vault, crypto). Each flow is a small state machine held on app.flow. */

window.RBU = window.RBU || {};
window.RBU.views = window.RBU.views || {};
(function (NS) {
  "use strict";

  var ui = NS.ui, data = NS.data, h = ui.h;
  var V = NS.views;

  function screen(children, cls) { return NS.components.screen(children, cls); }
  function quick(l, i, f) { return NS.components.quick(l, i, f); }
  function sectionHead(t, a, f) { return NS.components.sectionHead(t, a, f); }

  function head(title, eyebrow, right) {
    return h("div.head", {}, [
      h("div", {}, [
        eyebrow ? h("div.eyebrow", { text: eyebrow }) : null,
        h("h1.head-title", { text: title }),
      ]),
      right || null,
    ]);
  }

  /* --------------------------------------------------------- amount pad */

  function amountPad(opts) {
    var value = opts.value || "";
    var symbol = ui.symbolFor(opts.currency || "USD");
    var display = h("div.amount-value", {});
    var sub = h("div.amount-sub", { text: opts.sub || "" });

    function paint() {
      ui.clear(display);
      var shown = value === "" ? "0" : value;
      display.appendChild(h("span", { text: symbol + shown }));
      if (opts.onchange) opts.onchange(parseFloat(value || "0"), sub);
    }

    function press(k) {
      ui.haptic("light");
      if (k === "del") value = value.slice(0, -1);
      else if (k === ".") { if (value.indexOf(".") === -1) value = (value || "0") + "."; }
      else {
        var dot = value.indexOf(".");
        if (dot > -1 && value.length - dot > 2) return;
        if (value.replace(".", "").length > 8) return;
        value = value === "0" ? k : value + k;
      }
      paint();
    }

    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(function (n) {
      return h("button.key", { type: "button", text: n, onclick: function () { press(n); } });
    });
    keys.push(h("button.key", { type: "button", text: ".", onclick: function () { press("."); } }));
    keys.push(h("button.key", { type: "button", text: "0", onclick: function () { press("0"); } }));
    keys.push(h("button.key", { type: "button", "aria-label": "Delete", onclick: function () { press("del"); } }, ui.icon("backspace", 26)));

    paint();

    return {
      node: h("div.stack.is-sm", {}, [
        h("div.amount-view", {}, [display, sub]),
        opts.chips || null,
        h("div.keypad", {}, keys),
      ]),
      get: function () { return parseFloat(value || "0"); },
      set: function (v) { value = String(v); paint(); },
      sub: sub,
    };
  }

  function chipRow(items) {
    return h("div.pill-row", { style: "justify-content:center" }, items);
  }

  /* --------------------------------------------------------- transfers */

  V.transfers = function (app) {
    var recent = app.ledger().filter(function (t) {
      return t.category === "transfer" && t.amount < 0;
    }).slice(0, 5);

    return screen([
      head("Transfer", "Move money"),
      h("div.scroll-row", {}, data.contacts.filter(function (c) { return c.fav; }).concat([{ id: "new", name: "New", handle: "" }]).map(function (c) {
        return h("button", {
          type: "button",
          style: "display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:0;color:inherit;font-family:inherit;cursor:pointer;width:72px",
          onclick: function () {
            if (c.id === "new") return newRecipientSheet(app);
            app.flow = { type: "send", step: "amount", recipient: c };
            app.go("send");
          },
        }, [
          c.id === "new"
            ? h("div", { class: "avatar", style: "background:var(--surface);border:1px dashed var(--hairline);box-shadow:none" }, ui.icon("plus", 20))
            : ui.initialsGlyph(c.name),
          h("div", { style: "font-size:11.5px;color:var(--text-2);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%", text: c.name.split(" ")[0] }),
        ]);
      })),

      h("div.card", {}, [
        h("div.card-title", { text: "Send money" }),
        h("div.rows", {}, [
          menuRow(app, "To an RBU user", "Instant · free · 24/7", "send", function () { app.flow = null; app.go("send"); }),
          menuRow(app, "To a bank account", "SEPA & Faster Payments · free", "briefcase", function () { newRecipientSheet(app); }),
          menuRow(app, "International transfer", "SWIFT · 30+ currencies · from $3", "globe", function () { newRecipientSheet(app, true); }),
          menuRow(app, "To my card", "Debit card payout · instant", "card", function () { app.go("withdraw"); }),
        ]),
      ]),

      h("div.card", {}, [
        h("div.card-title", { text: "Receive & split" }),
        h("div.rows", {}, [
          menuRow(app, "Request money", "Send a payment link or QR", "download", function () { app.go("request"); }),
          menuRow(app, "Split a bill", "Share a cost with friends", "users", function () { app.go("split"); }),
          menuRow(app, "Account details", "IBAN, BIC, sort code", "doc", function () { app.go("details"); }),
        ]),
      ]),

      h("div.card", {}, [
        h("div.card-title", { text: "Manage" }),
        h("div.rows", {}, [
          menuRow(app, "Scheduled payments", data.scheduled.length + " standing orders & direct debits", "repeat", function () { app.go("scheduled"); }),
          menuRow(app, "Add money", "From a card or bank transfer", "plus", function () { app.go("topup"); }),
          menuRow(app, "Exchange", "USD · EUR · GBP · interbank rate", "swap", function () { app.go("exchange"); }),
          menuRow(app, "Withdraw", "To an external account", "atm", function () { app.go("withdraw"); }),
        ]),
      ]),

      recent.length ? h("div", {}, [
        sectionHead("Recent transfers", "All activity", function () { app.go("activity"); }),
        NS.components.txList(recent, { flat: true }),
      ]) : null,

      ui.footerNote(),
    ]);
  };

  function menuRow(app, title, sub, iconName, onclick) {
    return h("button.row", { type: "button", onclick: onclick }, [
      h("div.glyph.is-accent", {}, ui.icon(iconName, 20)),
      h("div.row-main", {}, [
        h("div.row-title", { text: title }),
        h("div.row-sub", { text: sub }),
      ]),
      h("div.row-chev", {}, ui.icon("chev", 18)),
    ]);
  }

  function newRecipientSheet(app, international) {
    var name = h("input.input", { type: "text", placeholder: "Full name" });
    var acct = h("input.input", { type: "text", placeholder: international ? "IBAN or account number" : "IBAN" });
    var bank = h("input.input", { type: "text", placeholder: international ? "BIC / SWIFT" : "Bank name" });
    ui.sheet(international ? "International transfer" : "New recipient", "We check the details before the money leaves your account.", h("div.stack.is-sm", {}, [
      h("div.field", {}, [h("label.field-label", { text: "Recipient" }), name]),
      h("div.field", {}, [h("label.field-label", { text: "Account" }), acct]),
      h("div.field", {}, [h("label.field-label", { text: international ? "BIC / SWIFT" : "Bank" }), bank]),
      h("button.btn.btn-primary", {
        type: "button",
        onclick: function () {
          var n = name.value.trim() || "New recipient";
          ui.closeSheet();
          app.flow = {
            type: "send",
            step: "amount",
            recipient: { id: data.uid("c"), name: n, bank: bank.value.trim() || "External bank", detail: acct.value.trim() || "•••• 0000" },
            international: !!international,
          };
          app.go("send");
        },
        text: "Continue",
      }),
    ]));
  }

  /* --------------------------------------------------------------- send */

  V.send = function (app) {
    var flow = app.flow && app.flow.type === "send" ? app.flow : (app.flow = { type: "send", step: "who" });
    if (flow.step === "who") return sendWho(app, flow);
    if (flow.step === "amount") return sendAmount(app, flow);
    if (flow.step === "confirm") return sendConfirm(app, flow);
    return sendDone(app, flow);
  };

  function sendWho(app, flow) {
    var query = "";
    var list = h("div.rows", {});

    function paint() {
      ui.clear(list);
      data.contacts
        .filter(function (c) { return !query || c.name.toLowerCase().indexOf(query.toLowerCase()) > -1; })
        .forEach(function (c) {
          list.appendChild(h("button.row", {
            type: "button",
            onclick: function () { flow.recipient = c; flow.step = "amount"; app.render(); },
          }, [
            ui.initialsGlyph(c.name),
            h("div.row-main", {}, [
              h("div.row-title", { text: c.name }),
              h("div.row-sub", { text: c.bank + " · " + c.detail }),
            ]),
            h("div.row-chev", {}, ui.icon("chev", 18)),
          ]));
        });
    }
    paint();

    return screen([
      ui.backBtn(function () { app.flow = null; app.back(); }),
      head("Send to", "Step 1 of 3"),
      h("div.search", {}, [
        ui.icon("search", 18),
        h("input", { type: "search", placeholder: "Name, @handle, phone or IBAN", oninput: function (e) { query = e.target.value; paint(); } }),
      ]),
      h("button.btn.btn-ghost", { type: "button", onclick: function () { newRecipientSheet(app); }, text: "+ New bank recipient" }),
      list,
      ui.footerNote(),
    ]);
  }

  function sendAmount(app, flow) {
    var accountId = flow.account || "usd";
    var acc = app.account(accountId);
    var pad;
    var balanceLine = h("div.amount-sub", {});

    function paintSub(v) {
      var bal = app.balance(accountId);
      balanceLine.textContent = ui.money(bal, acc.currency) + " available in " + acc.name +
        (v > bal ? " · not enough funds" : "");
      balanceLine.style.color = v > bal ? "var(--danger)" : "var(--text-3)";
      cont.disabled = !(v > 0 && v <= bal);
    }

    var cont = h("button.btn.btn-primary", {
      type: "button",
      disabled: true,
      onclick: function () {
        flow.amount = pad.get();
        flow.account = accountId;
        flow.note = note.value.trim();
        flow.step = "confirm";
        ui.haptic("medium");
        app.render();
      },
      text: "Continue",
    });

    var note = h("input.input", { type: "text", placeholder: "What's it for? (optional)", value: flow.note || "" });

    var accountChips = chipRow(data.accounts.filter(function (a) { return a.kind === "current"; }).map(function (a) {
      return h("button", {
        class: "pill" + (a.id === accountId ? " is-on" : ""),
        type: "button",
        text: a.currency + " " + ui.money(app.balance(a.id), a.currency, { round: true }),
        onclick: function () { flow.account = a.id; app.render(); },
      });
    }));

    pad = amountPad({
      currency: acc.currency,
      value: flow.amount ? String(flow.amount) : "",
      onchange: function (v) { paintSub(v); },
    });
    paintSub(pad.get());

    return screen([
      ui.backBtn(function () { flow.step = "who"; app.render(); }),
      head("How much?", "Step 2 of 3"),
      h("div", { style: "display:flex;align-items:center;gap:12px" }, [
        ui.initialsGlyph(flow.recipient.name),
        h("div.row-main", {}, [
          h("div.row-title", { text: flow.recipient.name }),
          h("div.row-sub", { text: (flow.recipient.bank || "External bank") + " · " + (flow.recipient.detail || "") }),
        ]),
      ]),
      accountChips,
      h("div.amount-view", {}, []),
      pad.node,
      balanceLine,
      h("div.field", {}, [h("label.field-label", { text: "Reference" }), note]),
      cont,
      ui.footerNote(),
    ]);
  }

  function sendConfirm(app, flow) {
    var acc = app.account(flow.account);
    var instant = flow.recipient.bank === "RBUBANK";
    var fee = instant ? 0 : flow.international ? 3 : 0;
    var rows = [
      ["To", flow.recipient.name],
      ["Account", flow.recipient.detail || "RBU instant"],
      ["From", acc.name + " · " + acc.currency],
      ["Fee", fee ? ui.money(-fee, acc.currency) : "Free"],
      ["Arrives", instant ? "Instantly" : flow.international ? "In 1 business day" : "Within 10 seconds (SEPA Instant)"],
    ];
    if (flow.note) rows.push(["Reference", flow.note]);

    return screen([
      ui.backBtn(function () { flow.step = "amount"; app.render(); }),
      head("Confirm", "Step 3 of 3"),
      h("div.hero", { style: "align-items:center;text-align:center" }, [
        h("div.hero-label", { text: "Sending" }),
        h("div.hero-number", {}, ui.heroMoney(flow.amount, acc.currency)),
      ]),
      h("div.card", {}, h("div.rows", {}, rows.map(function (r) {
        return h("div.row", {}, [
          h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: r[0] })),
          h("div.row-value", { style: "font-size:15px", text: r[1] }),
        ]);
      }))),
      h("div.demo-note", { text: "Demo build — no real money moves. On the live product this step is confirmed with Face ID and a 3-D Secure challenge." }),
      h("button.btn.btn-primary", {
        type: "button",
        onclick: function () {
          var t = app.commit({
            title: flow.recipient.name,
            subtitle: instant ? "Sent · RBU instant" : "Sent · " + (flow.recipient.detail || flow.recipient.bank),
            amount: -flow.amount,
            account: flow.account,
            category: "transfer",
            method: instant ? "RBU instant transfer" : flow.international ? "SWIFT wire transfer" : "SEPA credit transfer",
            status: instant ? "completed" : "pending",
            fee: fee,
            note: flow.note || "",
          });
          flow.tx = t;
          flow.step = "done";
          ui.haptic("heavy");
          app.render();
        },
        text: "Send " + ui.money(flow.amount, acc.currency),
      }),
      ui.footerNote(),
    ]);
  }

  function sendDone(app, flow) {
    var acc = app.account(flow.account);
    return screen([
      h("div.spacer"),
      h("div.success-mark", {}, ui.icon("check", 46)),
      h("div", { style: "text-align:center" }, [
        h("h1.head-title", { style: "font-size:26px", text: "Money sent" }),
        h("div.muted", { style: "margin-top:6px", text: ui.money(flow.amount, acc.currency) + " to " + flow.recipient.name }),
        h("div.muted", { style: "margin-top:2px;font-size:13px", text: "Reference " + (flow.tx ? flow.tx.ref : "—") }),
      ]),
      h("div.card", {}, h("div.rows", {}, [
        h("div.row", {}, [
          h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: "New balance" })),
          h("div.row-value", { text: ui.money(app.balance(flow.account), acc.currency) }),
        ]),
        h("div.row", {}, [
          h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: "Status" })),
          h("div.row-value", { text: flow.tx && flow.tx.status === "pending" ? "Processing" : "Completed" }),
        ]),
      ])),
      h("div.actions", {}, [
        h("button.btn.btn-ghost", { type: "button", onclick: function () { ui.copy("https://rbubank.app/r/" + (flow.tx ? flow.tx.ref : "demo"), "Receipt link copied"); }, text: "Share receipt" }),
        h("button.btn.btn-primary", { type: "button", onclick: function () { app.flow = null; app.tab("home"); }, text: "Done" }),
      ]),
      h("div.spacer"),
      ui.footerNote(),
    ]);
  }

  /* ------------------------------------------------------------ request */

  V.request = function (app) {
    var pad = amountPad({ currency: "USD", sub: "Request into your Main account" });
    var link = "https://rbubank.app/pay/denis";
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Request money", "Get paid"),
      pad.node,
      h("div.card", {}, [
        h("div.card-title", { text: "Your payment link" }),
        h("div", { class: "selectable", style: "font-size:15px;font-weight:600;word-break:break-all", text: link }),
        h("div.row-sub", { style: "margin-top:6px", text: "Works with any bank, card or RBU account." }),
      ]),
      h("div.actions", {}, [
        h("button.btn.btn-ghost", { type: "button", onclick: function () { ui.copy(link + "?amount=" + (pad.get() || ""), "Link copied"); }, text: "Copy link with amount" }),
        h("button.btn.btn-primary", {
          type: "button",
          onclick: function () {
            var amt = pad.get();
            if (!amt) return ui.toast("Enter an amount first");
            ui.toast("Request sent", ui.money(amt, "USD") + " requested · we'll notify you when it's paid");
            app.tab("home");
          },
          text: "Send request",
        }),
      ]),
      ui.footerNote(),
    ]);
  };

  /* ------------------------------------------------------------- top-up */

  V.topup = function (app) {
    var accountId = "usd";
    var source = "Visa •••• 2291";
    var pad = amountPad({ currency: "USD", sub: "From " + source + " · instant, free" });

    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Add money", "Top up"),
      chipRow([
        h("button.pill.is-on", { type: "button", text: "Card" }),
        h("button.pill", { type: "button", text: "Bank transfer", onclick: function () { app.go("details"); } }),
        h("button.pill", { type: "button", text: "Apple Pay", onclick: function () { ui.toast("Apple Pay", "Available on the live build"); } }),
      ]),
      pad.node,
      chipRow([100, 250, 500, 1000].map(function (v) {
        return h("button.pill", { type: "button", text: "$" + v, onclick: function () { pad.set(v); } });
      })),
      h("button.btn.btn-primary", {
        type: "button",
        onclick: function () {
          var amt = pad.get();
          if (!amt) return ui.toast("Enter an amount first");
          app.commit({
            title: "Top-up from " + source,
            subtitle: "Added to Main account",
            amount: amt,
            account: accountId,
            category: "transfer",
            method: "Card top-up",
            type: "credit",
          });
          ui.haptic("heavy");
          ui.toast("Money added", ui.money(amt, "USD") + " is in your Main account");
          app.tab("home");
        },
        text: "Add money",
      }),
      ui.footerNote(),
    ]);
  };

  /* ----------------------------------------------------------- withdraw */

  V.withdraw = function (app) {
    var targets = [
      { name: "Bank of Cyprus", detail: "CY17 •••• 0090 · own account", days: "Same day" },
      { name: "Revolut", detail: "LT12 •••• 6640 · own account", days: "Instant (SEPA)" },
      { name: "Visa •••• 2291", detail: "Debit card payout", days: "Within 30 minutes" },
    ];
    var target = targets[0];
    var pad = amountPad({ currency: "USD", sub: "To " + target.name + " · " + target.days });

    var chips = chipRow(targets.map(function (t) {
      return h("button", {
        class: "pill" + (t === target ? " is-on" : ""),
        type: "button",
        text: t.name,
        onclick: function () {
          target = t;
          pad.sub.textContent = "To " + t.name + " · " + t.days;
          Array.prototype.forEach.call(chips.children, function (c) { c.classList.remove("is-on"); });
          this.classList.add("is-on");
        },
      });
    }));

    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Withdraw", "Money out"),
      chips,
      pad.node,
      chipRow([500, 1000, 2500].map(function (v) {
        return h("button.pill", { type: "button", text: "$" + v, onclick: function () { pad.set(v); } });
      }).concat([
        h("button.pill.is-accent", { type: "button", text: "All available", onclick: function () { pad.set(Math.floor(app.balance("usd") * 100) / 100); } }),
      ])),
      h("div.demo-note", { text: "Withdrawals to your own verified accounts are free. Third-party payouts are screened for fraud before release." }),
      h("button.btn.btn-primary", {
        type: "button",
        onclick: function () {
          var amt = pad.get();
          if (!amt) return ui.toast("Enter an amount first");
          if (amt > app.balance("usd")) return ui.toast("Not enough funds", "Available " + ui.money(app.balance("usd"), "USD"));
          app.commit({
            title: "Withdrawal to " + target.name,
            subtitle: target.detail,
            amount: -amt,
            account: "usd",
            category: "cash",
            method: "Payout",
            status: "pending",
          });
          ui.haptic("heavy");
          ui.toast("Withdrawal started", ui.money(amt, "USD") + " · " + target.days);
          app.tab("activity");
        },
        text: "Withdraw",
      }),
      ui.footerNote(),
    ]);
  };

  /* ----------------------------------------------------------- exchange */

  V.exchange = function (app) {
    var from = "usd", to = "eur";
    var pad;
    var result = h("div.amount-sub", {});

    function rateOf(a, b) {
      var ca = app.account(a).currency, cb = app.account(b).currency;
      return (data.rates[cb] || 1) / (data.rates[ca] || 1) * 1; // units of B per unit of A
    }

    function convert(v) {
      var ca = app.account(from).currency, cb = app.account(to).currency;
      var usd = v * (data.rates[ca] || 1);
      return usd / (data.rates[cb] || 1);
    }

    function paint(v) {
      var cb = app.account(to).currency;
      result.textContent = "You get " + ui.money(convert(v || 0), cb) + " · rate " +
        (convert(1)).toFixed(4) + " " + cb + " per " + app.account(from).currency;
    }

    var selector = h("div.card.is-tight", {}, [
      h("div", { style: "display:flex;align-items:center;gap:12px" }, [
        h("div.row-main", {}, [
          h("div.row-sub", { style: "margin:0", text: "From" }),
          h("div.row-title", { id: "fx-from", text: app.account(from).name + " · " + app.account(from).currency }),
        ]),
        h("button.icon-btn", {
          type: "button", "aria-label": "Swap",
          onclick: function () {
            var t = from; from = to; to = t;
            app.render();
          },
        }, ui.icon("swap", 20)),
        h("div.row-main", { style: "text-align:right" }, [
          h("div.row-sub", { style: "margin:0", text: "To" }),
          h("div.row-title", { text: app.account(to).name + " · " + app.account(to).currency }),
        ]),
      ]),
    ]);

    pad = amountPad({ currency: app.account(from).currency, onchange: function (v) { paint(v); } });
    paint(0);

    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Exchange", "Interbank rate"),
      selector,
      h("div.scroll-row", {}, data.accounts.filter(function (a) { return a.kind === "current"; }).map(function (a) {
        return h("button", {
          class: "pill" + (a.id === from ? " is-on" : ""),
          type: "button",
          text: "From " + a.currency,
          onclick: function () { from = a.id; if (to === a.id) to = a.id === "usd" ? "eur" : "usd"; app.render(); },
        });
      })),
      h("div.scroll-row", {}, data.accounts.filter(function (a) { return a.kind === "current" && a.id !== from; }).map(function (a) {
        return h("button", {
          class: "pill" + (a.id === to ? " is-on" : ""),
          type: "button",
          text: "To " + a.currency,
          onclick: function () { to = a.id; app.render(); },
        });
      })),
      pad.node,
      result,
      h("button.btn.btn-primary", {
        type: "button",
        onclick: function () {
          var amt = pad.get();
          var ca = app.account(from).currency, cb = app.account(to).currency;
          if (!amt) return ui.toast("Enter an amount first");
          if (amt > app.balance(from)) return ui.toast("Not enough funds", "Available " + ui.money(app.balance(from), ca));
          var got = Math.round(convert(amt) * 100) / 100;
          var pair = data.uid("pair");
          var rate = Math.round(convert(1) * 1e4) / 1e4;
          app.commit({
            title: "Exchanged to " + cb, subtitle: ca + " → " + cb + " @ " + rate,
            amount: -amt, account: from, category: "exchange", method: "Instant exchange",
            pairId: pair, fx: { from: ca, to: cb, rate: rate },
          });
          app.commit({
            title: "Exchanged from " + ca, subtitle: ca + " → " + cb + " @ " + rate,
            amount: got, account: to, category: "exchange", method: "Instant exchange",
            type: "credit", pairId: pair, fx: { from: ca, to: cb, rate: rate },
          });
          ui.haptic("heavy");
          ui.toast("Exchanged", ui.money(amt, ca) + " → " + ui.money(got, cb));
          app.tab("wealth");
        },
        text: "Exchange",
      }),
      h("div.demo-note", { text: "Interbank rate with no markup on weekdays. Fair-usage limit $12,000/month on the Metal plan, then 0.5%." }),
      ui.footerNote(),
    ]);
  };

  /* -------------------------------------------------------------- split */

  V.split = function (app) {
    var chosen = {};
    var total = 0;
    var pad;
    var summary = h("div.amount-sub", { text: "Pick who was there" });

    function refresh() {
      var n = Object.keys(chosen).length + 1;
      var each = total / n;
      summary.textContent = n > 1
        ? ui.money(each, "USD") + " each · " + n + " people"
        : "Pick who was there";
    }

    pad = amountPad({ currency: "USD", onchange: function (v) { total = v; refresh(); } });

    var people = h("div.rows", {}, data.contacts.slice(0, 6).map(function (c) {
      var row = h("button.row", {
        type: "button",
        onclick: function () {
          if (chosen[c.id]) { delete chosen[c.id]; row.style.opacity = "1"; mark.textContent = ""; }
          else { chosen[c.id] = c; row.style.opacity = "1"; mark.textContent = "✓"; }
          ui.haptic("light");
          refresh();
        },
      }, [
        ui.initialsGlyph(c.name),
        h("div.row-main", {}, [
          h("div.row-title", { text: c.name }),
          h("div.row-sub", { text: c.bank }),
        ]),
      ]);
      var mark = h("div.row-value.credit", { text: "" });
      row.appendChild(mark);
      return row;
    }));

    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Split a bill", "Share a cost"),
      pad.node,
      summary,
      h("div.card", {}, [h("div.card-title", { text: "Split with" }), people]),
      h("button.btn.btn-primary", {
        type: "button",
        onclick: function () {
          var n = Object.keys(chosen).length;
          if (!total || !n) return ui.toast("Add an amount and at least one person");
          ui.toast("Requests sent", ui.money(total / (n + 1), "USD") + " requested from " + n + " " + (n === 1 ? "person" : "people"));
          app.tab("home");
        },
        text: "Request their share",
      }),
      ui.footerNote(),
    ]);
  };

  /* ---------------------------------------------------------- scheduled */

  V.scheduled = function (app) {
    return screen([
      ui.backBtn(function () { app.back(); }),
      head("Scheduled", "Standing orders & direct debits"),
      h("div.card", {}, [
        h("div.card-title", { text: "Upcoming this month" }),
        h("div.rows", {}, data.scheduled.map(function (s) {
          return h("button.row", {
            type: "button",
            onclick: function () {
              ui.sheet(s.title, s.sub, h("div.stack.is-sm", {}, [
                h("div.rows", {}, [
                  ["Amount", ui.money(s.amount, "USD")],
                  ["Next payment", s.next],
                  ["Frequency", s.every],
                  ["From", "Main account · USD"],
                ].map(function (r) {
                  return h("div.row", {}, [
                    h("div.row-main", {}, h("div.row-sub", { style: "margin:0", text: r[0] })),
                    h("div.row-value", { style: "font-size:15px", text: r[1] }),
                  ]);
                })),
                h("button.btn.btn-ghost", { type: "button", onclick: function () { ui.closeSheet(); ui.toast("Payment skipped", "Next one resumes as normal"); }, text: "Skip next payment" }),
                h("button.btn.btn-ghost.btn-danger", { type: "button", onclick: function () { ui.closeSheet(); ui.toast("Cancelled", s.title + " will not be charged again"); }, text: "Cancel this payment" }),
              ]));
            },
          }, [
            h("div.glyph", {}, ui.icon("repeat", 20)),
            h("div.row-main", {}, [
              h("div.row-title", { text: s.title }),
              h("div.row-sub", { text: s.sub + " · " + s.next }),
            ]),
            h("div.row-value", { text: ui.money(s.amount, "USD") }),
          ]);
        })),
      ]),
      h("button.btn.btn-ghost", { type: "button", onclick: function () { ui.toast("Standing order", "Create flow opens on the live build"); }, text: "New standing order" }),
      ui.footerNote(),
    ]);
  };

  /* -------------------------------------------------------------- vault */

  V.vault = function (app) {
    var bal = app.balance("vault");
    var interest = app.ledger().filter(function (t) { return t.account === "vault" && t.category === "income"; })
      .reduce(function (s, t) { return s + t.amount; }, 0);

    function move(dir) {
      var pad = amountPad({ currency: "USD", sub: dir === "in" ? "From Main account" : "To Main account" });
      ui.sheet(dir === "in" ? "Add to vault" : "Withdraw from vault", dir === "in" ? "Earn 4.15% APY, paid monthly. Withdraw any time." : "Money lands in your Main account instantly.",
        h("div.stack.is-sm", {}, [
          pad.node,
          h("button.btn.btn-primary", {
            type: "button",
            onclick: function () {
              var amt = pad.get();
              if (!amt) return ui.toast("Enter an amount first");
              var src = dir === "in" ? "usd" : "vault";
              if (amt > app.balance(src)) return ui.toast("Not enough funds");
              var pair = data.uid("pair");
              app.commit({ title: dir === "in" ? "Savings vault" : "To Main account", subtitle: "Vault transfer", amount: -amt, account: src, category: "savings", method: "Internal transfer", pairId: pair });
              app.commit({ title: dir === "in" ? "From Main account" : "From Savings vault", subtitle: "Vault transfer", amount: amt, account: dir === "in" ? "vault" : "usd", category: "savings", method: "Internal transfer", type: "credit", pairId: pair });
              ui.closeSheet();
              ui.haptic("heavy");
              ui.toast(dir === "in" ? "Added to vault" : "Moved to Main account", ui.money(amt, "USD"));
              app.render();
            },
            text: dir === "in" ? "Add money" : "Withdraw",
          }),
        ]));
    }

    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div.hero", {}, [
        h("div.hero-label", { text: "Savings vault" }),
        h("div.hero-number", {}, ui.heroMoney(bal, "USD")),
        h("div.hero-note", { text: "4.15% APY · interest paid monthly · withdraw any time" }),
      ]),
      h("div.stat-grid", {}, [
        h("div.stat", {}, [
          h("div.stat-label", { text: "Interest earned" }),
          h("div.stat-value.credit", { text: ui.money(interest, "USD") }),
          h("div.stat-sub", { text: "Since the vault was opened" }),
        ]),
        h("div.stat", {}, [
          h("div.stat-label", { text: "Auto top-up" }),
          h("div.stat-value", { text: "$500" }),
          h("div.stat-sub", { text: "Every month on the 6th" }),
        ]),
      ]),
      h("div.actions", {}, [
        h("button.btn.btn-primary", { type: "button", onclick: function () { move("in"); }, text: "Add money" }),
        h("button.btn.btn-ghost", { type: "button", onclick: function () { move("out"); }, text: "Withdraw" }),
      ]),
      h("div", {}, [
        sectionHead("Vault activity", null),
        NS.components.txList(app.ledger().filter(function (t) { return t.account === "vault"; }), { limit: 40 }),
      ]),
      ui.footerNote(),
    ]);
  };

  /* ------------------------------------------------------------- crypto */

  V.crypto = function (app) {
    var btc = app.balance("btc");
    return screen([
      ui.backBtn(function () { app.back(); }),
      h("div.hero", {}, [
        h("div.hero-label", { text: "Bitcoin" }),
        h("div.hero-number", {}, ui.heroMoney(app.balanceInUSD("btc"), "USD")),
        h("div.hero-note", { text: btc.toFixed(6) + " BTC · $" + data.rates.BTC.toLocaleString("en-US") + " per coin" }),
      ]),
      h("div.actions", {}, [
        h("button.btn.btn-primary", {
          type: "button",
          onclick: function () {
            var pad = amountPad({ currency: "USD", sub: "Funded from your Main account" });
            ui.sheet("Buy Bitcoin", "Instant buy at the market price. 0.99% fee on the Metal plan.", h("div.stack.is-sm", {}, [
              pad.node,
              h("button.btn.btn-primary", {
                type: "button",
                onclick: function () {
                  var amt = pad.get();
                  if (!amt) return ui.toast("Enter an amount first");
                  if (amt > app.balance("usd")) return ui.toast("Not enough funds");
                  var pair = data.uid("pair");
                  app.commit({ title: "Bought Bitcoin", subtitle: "BTC @ $" + data.rates.BTC.toLocaleString("en-US"), amount: -amt, account: "usd", category: "crypto", method: "Instant buy", pairId: pair });
                  app.commit({ title: "Bitcoin purchase", subtitle: "Funded from Main account", amount: amt / data.rates.BTC, account: "btc", category: "crypto", method: "Instant buy", type: "credit", pairId: pair });
                  ui.closeSheet();
                  ui.toast("Bought", (amt / data.rates.BTC).toFixed(6) + " BTC");
                  app.render();
                },
                text: "Buy",
              }),
            ]));
          },
          text: "Buy",
        }),
        h("button.btn.btn-ghost", { type: "button", onclick: function () { ui.toast("Sell", "Selling is enabled once KYC tier 2 is live"); }, text: "Sell" }),
      ]),
      h("div.demo-note", { text: "Crypto is held with a regulated custodian and is not covered by deposit protection. Demo prices are static." }),
      h("div", {}, [
        sectionHead("Crypto activity", null),
        NS.components.txList(app.ledger().filter(function (t) { return t.account === "btc" || t.category === "crypto"; }), { limit: 30 }),
      ]),
      ui.footerNote(),
    ]);
  };

  NS.flows = { amountPad: amountPad, menuRow: menuRow, head: head };
})(window.RBU);
