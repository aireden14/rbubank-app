/* RBUBANK — controller: state, persistence, routing between screens.
   The ledger is regenerated from the seed on every load and merged with
   whatever the user did in this session (transfers, exchanges, top-ups). */

window.RBU = window.RBU || {};
(function (NS) {
  "use strict";

  var ui = NS.ui;
  var data = NS.data;
  var h = ui.h;

  var STORAGE_KEY = "rbubank.v1";

  var TABS = [
    { id: "home", label: "Home", icon: "home" },
    { id: "activity", label: "Activity", icon: "activity" },
    { id: "transfers", label: "Transfer", icon: "send" },
    { id: "wealth", label: "Wealth", icon: "wealth" },
    { id: "profile", label: "Profile", icon: "person" },
  ];

  var TAB_OF = {
    home: "home", activity: "activity", receipt: "activity", transfers: "transfers", wealth: "wealth", profile: "profile",
    send: "transfers", request: "transfers", topup: "transfers", withdraw: "transfers",
    exchange: "transfers", split: "transfers", scheduled: "transfers", recipients: "transfers",
    analytics: "wealth", cards: "wealth", card: "wealth", vault: "wealth", crypto: "wealth",
    account: "wealth", statements: "profile", statement: "profile", security: "profile", details: "profile",
    notifications: "profile", support: "profile", about: "profile", plans: "profile", limits: "profile",
  };

  function defaults() {
    return {
      unlocked: false,
      frozen: { metal: false, virtual: false },
      revealed: {},
      settings: {
        notifications: true,
        instantAlerts: true,
        travelMode: false,
        roundUps: true,
        biometrics: true,
      },
      extra: [],
      seen: [],
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var saved = JSON.parse(raw);
      var base = defaults();
      return {
        unlocked: false,
        frozen: Object.assign(base.frozen, saved.frozen || {}),
        revealed: {},
        settings: Object.assign(base.settings, saved.settings || {}),
        extra: Array.isArray(saved.extra) ? saved.extra : [],
        seen: saved.seen || [],
      };
    } catch (e) { return defaults(); }
  }

  var app = {
    state: load(),
    base: data.buildLedger(),
    view: "login",
    params: {},
    stack: [],
    flow: null,
    filter: "all",
    query: "",
    listLimit: 60,

    /* ------------------------------------------------------- persistence */

    save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          frozen: this.state.frozen,
          settings: this.state.settings,
          extra: this.state.extra,
          seen: this.state.seen,
        }));
      } catch (e) { /* private mode — the demo still runs, it just forgets */ }
    },

    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      this.state = defaults();
      this.state.unlocked = true;
      this.base = data.buildLedger();
      this._ledger = null;
      this.stack = [];
      this.go("home", {}, { replace: true });
      ui.toast("Demo data restored", "Ledger rebuilt from the original seed");
    },

    /* ------------------------------------------------------------ ledger */

    /* The ledger is read dozens of times per render (every balance, every
       filter), so it is sorted once and cached until the user adds something. */
    ledger: function () {
      if (this._ledger && this._ledgerN === this.state.extra.length) return this._ledger;
      var all = this.base.concat(this.state.extra);
      all.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      this._ledger = all;
      this._ledgerN = this.state.extra.length;
      return all;
    },

    addTx: function (t) {
      this.state.extra.push(t);
      this.save();
      return t;
    },

    account: function (id) {
      return data.accounts.filter(function (a) { return a.id === id; })[0];
    },

    balance: function (id) {
      var acc = this.account(id);
      if (!acc) return 0;
      var sum = acc.opening;
      /* Pending debits are authorisation holds: they leave the available
         balance straight away. Pending credits have not landed yet, and a
         declined payment never left the account at all. */
      this.ledger().forEach(function (t) {
        if (t.account !== id) return;
        if (t.status === "declined") return;
        if (t.status === "pending" && t.amount > 0) return;
        sum += t.amount;
      });
      return Math.round(sum * 1e8) / 1e8;
    },

    balanceInUSD: function (id) {
      var acc = this.account(id);
      return this.balance(id) * (data.rates[acc.currency] || 1);
    },

    totalUSD: function () {
      var self = this;
      return data.accounts.reduce(function (sum, a) { return sum + self.balanceInUSD(a.id); }, 0);
    },

    spendableUSD: function () {
      var self = this;
      return data.accounts.reduce(function (sum, a) {
        return a.kind === "current" ? sum + self.balanceInUSD(a.id) : sum;
      }, 0);
    },

    /* Periods drive Activity and Analytics. "all" keeps the whole ledger. */
    period: "7d",
    loading: false,

    periodStart: function (period) {
      var id = period || this.period;
      if (id === "7d") return new Date(data.TODAY.getTime() - 6 * 864e5).toISOString().slice(0, 10);
      var months = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 }[id];
      if (!months) return null;
      var d = new Date(data.TODAY.getTime());
      d.setUTCMonth(d.getUTCMonth() - months);
      return d.toISOString();
    },

    txById: function (id) {
      return this.ledger().filter(function (t) { return t.id === id; })[0] || null;
    },

    inPeriod: function (t, period) {
      var cut = this.periodStart(period);
      return !cut || t.date >= cut;
    },

    /* Sums over a period, in USD, for the headline numbers on Home/Analytics.
       Internal moves (vault, FX, crypto) are not income or spending. */
    stats: function (period) {
      var self = this;
      var income = 0, spend = 0, salary = 0, count = 0;
      var INTERNAL = { savings: 1, exchange: 1, crypto: 1 };
      this.ledger().forEach(function (t) {
        if (!self.inPeriod(t, period) || t.status !== "completed") return;
        var acc = data.accounts.filter(function (a) { return a.id === t.account; })[0];
        if (!acc || acc.currency === "BTC") return;
        count += 1;
        if (INTERNAL[t.category]) return;
        var usd = t.amount * (data.rates[acc.currency] || 1);
        if (usd > 0) { income += usd; if (t.stream === "salary") salary += usd; }
        else spend += -usd;
      });
      return { income: income, spend: spend, salary: salary, net: income - spend, count: count };
    },

    /* --------------------------------------------------------- navigation */

    go: function (view, params, opts) {
      opts = opts || {};
      if (!opts.replace && this.view !== view) this.stack.push({ view: this.view, params: this.params });
      if (opts.reset) this.stack = [];
      this.view = view;
      this.params = params || {};
      ui.closeSheet();
      this.render();
      var v = document.getElementById("view");
      if (v) v.scrollTop = 0;
    },

    back: function () {
      var prev = this.stack.pop();
      ui.closeSheet();
      if (!prev) { this.view = "home"; this.params = {}; }
      else { this.view = prev.view; this.params = prev.params; }
      this.render();
    },

    tab: function (id) {
      ui.haptic("light");
      this.loading = false;
      this.stack = [];
      this.flow = null;
      this.listLimit = 60;
      this.go(id, {}, { replace: true, reset: true });
    },

    /* ------------------------------------------------------------- render */

    render: function () {
      var root = document.getElementById("view");
      ui.clear(root);
      var fn = NS.views[this.view] || NS.views.home;
      root.appendChild(fn(this, this.params));
      this.renderTabs();
    },

    renderTabs: function () {
      var bar = document.getElementById("tabbar");
      var self = this;
      ui.clear(bar);
      if (!this.state.unlocked || this.view === "login") { bar.classList.add("is-hidden"); return; }
      bar.classList.remove("is-hidden");
      var active = TAB_OF[this.view] || "home";
      TABS.forEach(function (t) {
        bar.appendChild(h("button", {
          class: "tab" + (t.id === active ? " is-on" : ""),
          type: "button",
          "aria-label": t.label,
          onclick: function () { self.tab(t.id); },
        }, [ui.icon(t.icon, 24), h("span.tab-label", { text: t.label })]));
      });
    },

    /* ------------------------------------------------------------- helpers */

    /* Every money-moving flow lands here, so one place creates transactions,
       plays the confirmation and drops the user back into the ledger. */
    commit: function (opts) {
      var now = new Date(data.TODAY.getTime() + 3600e3).toISOString();
      var t = data.tx(Object.assign({ date: now, status: "completed" }, opts));
      this.addTx(t);
      return t;
    },
  };

  NS.app = app;

  /* --------------------------------------------------------------- boot */

  function boot() {
    app.view = "login";
    app.render();
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && ui.isSheetOpen()) ui.closeSheet();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.RBU);
