/* RBUBANK — the receipt.
   Every transaction opens a full document, not a tooltip: a paper-style slip
   with a torn edge, a status stamp, the parties, the money trail and a
   verification code. Salary credits swap the middle section for a payslip —
   gross, tax, social insurance, net — because that is the row a client
   actually screenshots and forwards. */

window.RBU = window.RBU || {};
window.RBU.views = window.RBU.views || {};
(function (NS) {
  "use strict";

  var ui = NS.ui, data = NS.data, h = ui.h;
  var V = NS.views;

  function screen(children, cls) { return NS.components.screen(children, cls); }
  function accCur(id) { return NS.components.accCur(id); }

  var STATUS = {
    completed: { label: "Completed", cls: "is-ok" },
    pending: { label: "Pending", cls: "is-hold" },
    declined: { label: "Declined", cls: "is-bad" },
  };

  function line(label, value, opts) {
    opts = opts || {};
    return h("div", { class: "receipt-line" + (opts.strong ? " is-strong" : "") }, [
      h("div.receipt-label", { text: label }),
      h("div", { class: "receipt-value selectable" + (opts.tone ? " " + opts.tone : ""), text: value }),
    ]);
  }

  function block(title, rows) {
    return h("div.receipt-block", {}, [
      title ? h("div.receipt-block-title", { text: title }) : null,
      h("div", {}, rows.filter(Boolean)),
    ]);
  }

  /* A short, human-readable verification code — the thing support asks for. */
  function verifyCode(t) {
    var base = (t.ref || t.id).replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return (base + "RBU2026").slice(0, 12).replace(/(.{4})(.{4})(.{4})/, "$1-$2-$3");
  }

  V.receipt = function (app, params) {
    var t = app.txById(params.id);
    if (!t) { app.back(); return screen([h("div.demo-note", { text: "Transaction not found." })]); }

    var cur = accCur(t.account);
    var acc = app.account(t.account);
    var cat = data.categories[t.category] || { label: "Other" };
    var st = STATUS[t.status] || STATUS.completed;
    var credit = t.amount > 0;
    var isSalary = t.category === "salary";
    var slip = t.payslip;

    /* Balance the account carried right after this transaction settled. */
    var balanceAfter = (function () {
      var sum = acc.opening;
      var list = app.ledger().slice().reverse(); // oldest first
      for (var i = 0; i < list.length; i++) {
        var x = list[i];
        if (x.account !== t.account || x.status === "declined") continue;
        if (!(x.status === "pending" && x.amount > 0)) sum += x.amount;
        if (x.id === t.id) break;
      }
      return sum;
    })();

    var parties = credit
      ? [line("From", t.title), line(isSalary ? "Employer account" : "Their account", t.counterparty || t.subtitle || "—"), line("To", data.profile.firstName + " " + data.profile.lastName), line("Your account", data.profile.iban)]
      : [line("From", data.profile.firstName + " " + data.profile.lastName), line("Your account", acc.name + " · " + acc.currency), line("To", t.title), t.city ? line("Where", t.city) : null];

    return screen([
      h("div.receipt-head", {}, [
        ui.backBtn(function () { app.back(); }),
        h("div", { style: "display:flex;gap:8px" }, [
          h("button.icon-btn", {
            type: "button", "aria-label": "Share",
            onclick: function () { ui.copy("https://rbubank.app/receipt/" + verifyCode(t), "Receipt link copied"); },
          }, ui.icon("link", 20)),
          h("button.icon-btn", {
            type: "button", "aria-label": "Save as PDF",
            onclick: function () { window.print(); },
          }, ui.icon("download", 20)),
        ]),
      ]),

      h("div.receipt", {}, [
        h("div.receipt-top", {}, [
          h("div", {}, [
            h("div.receipt-brand", { text: "RBUBANK" }),
            h("div.receipt-kind", { text: isSalary ? "Payslip & payment receipt" : credit ? "Credit receipt" : "Payment receipt" }),
          ]),
          h("div", { class: "receipt-stamp " + st.cls, text: st.label }),
        ]),

        h("div.receipt-hero", {}, [
          h("div", { class: "glyph is-lg" + (credit ? " is-credit" : " is-accent") }, ui.icon(cat.icon || "card", 26)),
          h("div", { class: "receipt-amount" + (credit ? " credit" : ""), text: ui.money(t.amount, cur, { signed: credit }) }),
          h("div.receipt-sub", { text: t.title + (isSalary ? " · " + (slip ? slip.period : "") : "") }),
          h("div.receipt-date", { text: ui.fullDate(t.date) }),
        ]),

        h("div.tear"),

        isSalary && slip ? block("Payslip · " + slip.period, [
          line("Employer", slip.employer),
          line("Role", slip.role),
          line("Employee ID", slip.employeeId),
          line("Gross pay", ui.money(slip.gross, cur)),
          line("Income tax (15%)", ui.money(-slip.tax, cur)),
          line("Social insurance (7.5%)", ui.money(-slip.social, cur)),
          line("Net pay", ui.money(slip.net, cur), { strong: true, tone: "credit" }),
        ]) : null,

        block(isSalary ? "Payment" : "Details", [
          line("Status", st.label, { tone: t.status === "declined" ? "is-bad" : "" }),
          line("Method", t.method),
          line("Category", cat.label),
          t.card ? line("Card", "RBU •••• " + t.card) : null,
          t.fee ? line("Fee", ui.money(-t.fee, cur)) : line("Fee", "Free"),
          t.fx ? line("Exchange rate", "1 " + t.fx.from + " = " + t.fx.rate.toFixed(4) + " " + t.fx.to) : null,
          t.reason ? line("Reason", t.reason) : null,
          t.note ? line("Note", t.note) : null,
        ]),

        block("Parties", parties),

        block(null, [
          line("Reference", t.ref),
          line("Verification code", verifyCode(t)),
          t.status !== "declined" ? line("Balance after", ui.money(balanceAfter, cur)) : null,
        ]),

        h("div.tear.is-bottom"),

        h("div.receipt-foot", {}, [
          h("div.receipt-code", {}, barcode(verifyCode(t))),
          h("div.receipt-legal", { text: "Verify this receipt at rbubank.app/verify · RBUBANK is an electronic money institution. Client funds are safeguarded and never lent out." }),
          h("div.footer-brand", { text: "Powered by REBANK" }),
        ]),
      ]),

      h("div.actions", {}, [
        t.amount < 0 && t.status !== "declined" ? h("button.btn.btn-primary", {
          type: "button",
          onclick: function () {
            app.flow = { type: "send", step: "amount", recipient: { name: t.title, detail: t.subtitle, bank: "" }, amount: String(Math.abs(t.amount)) };
            app.go("send");
          },
          text: "Repeat this payment",
        }) : null,
        isSalary ? h("button.btn.btn-primary", {
          type: "button",
          onclick: function () { ui.toast("Payslip exported", "PDF saved to your documents (demo)"); },
          text: "Download payslip",
        }) : null,
        h("button.btn.btn-ghost", {
          type: "button",
          onclick: function () { ui.copy(verifyCode(t), "Verification code copied"); },
          text: "Copy verification code",
        }),
        h("button.btn.btn-ghost", {
          type: "button",
          onclick: function () { app.go("statement", { month: ui.monthKey(t.date) }); },
          text: "Open " + ui.monthLabel(ui.monthKey(t.date)) + " statement",
        }),
        h("button.btn.btn-ghost.btn-danger", {
          type: "button",
          onclick: function () { ui.toast("Dispute opened", "Our team replies within 2 hours"); },
          text: "Report an issue",
        }),
      ]),
    ]);
  };

  /* A decorative code strip, drawn from the verification code so the same
     transaction always draws the same bars. */
  function barcode(code) {
    var bars = [];
    for (var i = 0; i < 44; i++) {
      var c = code.charCodeAt(i % code.length) + i * 7;
      bars.push(h("span.bar", { style: "width:" + (1 + (c % 3)) + "px;opacity:" + (c % 2 ? 0.9 : 0.45) }));
    }
    return h("div.barcode", {}, bars.concat(h("div.barcode-text", { text: code })));
  }
})(window.RBU);
