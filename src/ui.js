/* RBUBANK — rendering primitives: element helper, icon set, money and date
   formatting, bottom sheets, toasts. No framework, no dependencies. */

window.RBU = window.RBU || {};
(function (NS) {
  "use strict";

  /* ------------------------------------------------------------ element */

  function h(tag, props, children) {
    var parts = String(tag).split(".");
    var el = document.createElement(parts[0] || "div");
    if (parts.length > 1) el.className = parts.slice(1).join(" ");
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var val = props[key];
      if (val === null || val === undefined || val === false) return;
      if (key === "class") el.className = el.className ? el.className + " " + val : val;
      else if (key === "text") el.textContent = val;
      else if (key === "html") el.innerHTML = val;
      else if (key === "style") el.setAttribute("style", val);
      else if (key.slice(0, 2) === "on" && typeof val === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === "value") el.value = val;
      else el.setAttribute(key, val === true ? "" : val);
    });
    append(el, children);
    return el;
  }

  function append(el, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) { children.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(children.nodeType ? children : document.createTextNode(String(children)));
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /* --------------------------------------------------------------- icons */

  var SVG = "http://www.w3.org/2000/svg";
  var PATHS = {
    home: ["M3 10.6 12 3.2l9 7.4", "M5.6 9.4V20.8h12.8V9.4"],
    activity: ["M3 12.2h4.2l2.7-7.4 4.2 14.4 2.6-7h4.3"],
    send: ["M21.2 2.8 10.4 13.6", "M21.2 2.8 14.6 21.2l-3.9-7.5-7.6-3.7 18.1-7.2Z"],
    wealth: ["M4 20.4V11.6", "M9.4 20.4V4.6", "M14.8 20.4v-6.6", "M20.2 20.4v-9.8"],
    person: ["M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z", "M3.8 20.6c1.7-3.7 4.6-5.6 8.2-5.6s6.5 1.9 8.2 5.6"],
    bell: ["M18 16.2v-5.1a6 6 0 1 0-12 0v5.1L4 19.2h16l-2-3Z", "M10 22h4"],
    gear: ["M3.6 8.2h4.6", "M12.4 8.2h8", "M10.3 10.3a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z", "M3.6 15.8h8", "M15.8 15.8h4.6", "M13.7 17.9a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z"],
    chev: ["m9.5 5.5 7 6.5-7 6.5"],
    back: ["m14.5 5.5-7 6.5 7 6.5"],
    search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m17 17 4.4 4.4"],
    plus: ["M12 4.8v14.4", "M4.8 12h14.4"],
    minus: ["M4.8 12h14.4"],
    download: ["M12 3.6v11", "m6.8 10 5.2 5.2 5.2-5.2", "M4.6 20.4h14.8"],
    upload: ["M12 20.4v-11", "m6.8 14 5.2-5.2 5.2 5.2", "M4.6 3.6h14.8"],
    swap: ["M7.2 3.6v15.2", "m3.6 15.6 3.6 3.6 3.6-3.6", "M16.8 20.4V5.2", "m13.2 8.4 3.6-3.6 3.6 3.6"],
    atm: ["M2.8 6.2h18.4v11.6H2.8z", "M12 14.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z", "M6 9.2h.01", "M18 14.8h.01"],
    vault: ["M3.4 4.4h17.2v15.2H3.4z", "M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z", "M12 12h4.6"],
    coin: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 6.6v10.8", "M14.8 9.2c-.6-.9-1.6-1.3-2.8-1.3-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2.1c1.9.4 3 1 3 2.3 0 1.3-1.2 2.1-3 2.1-1.4 0-2.5-.5-3-1.5"],
    card: ["M2.8 5.6h18.4v12.8H2.8z", "M2.8 10h18.4", "M6.4 14.6h4"],
    star: ["m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8L12 3.6Z"],
    repeat: ["m16.6 2.6 3.8 3.8-3.8 3.8", "M3.6 11.4V9.8a3.4 3.4 0 0 1 3.4-3.4h13.4", "m7.4 21.4-3.8-3.8 3.8-3.8", "M20.4 12.6v1.6a3.4 3.4 0 0 1-3.4 3.4H3.6"],
    cart: ["M2.8 4h2.4l2.6 11.4h10L20.6 8H6.2", "M9.6 20.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z", "M17.4 20.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z"],
    cup: ["M4.6 6.8h11.2v6a5.6 5.6 0 0 1-11.2 0v-6Z", "M15.8 8.4h2.4a2.6 2.6 0 0 1 0 5.2h-2.4", "M3.6 20.8h13.4"],
    car: ["m4.6 11.4 1.7-4.5a2 2 0 0 1 1.9-1.3h7.6a2 2 0 0 1 1.9 1.3l1.7 4.5", "M3.8 11.4h16.4v5.4H3.8z", "M7.2 20v-3.2", "M16.8 20v-3.2"],
    bag: ["M5.8 7.6h12.4l1 12.8H4.8l1-12.8Z", "M9 7.6V6a3 3 0 0 1 6 0v1.6"],
    plane: ["M21 15.2v-2l-7.8-4.9V3.8a1.4 1.4 0 0 0-2.8 0v4.5L2.6 13.2v2l7.8-2.4v4.5l-2.2 1.5v1.4l3.6-1 3.6 1v-1.4L13.2 17.3v-4.5L21 15.2Z"],
    heart: ["M12 20.4S4.6 16 4.6 10.7A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.4 2.9c0 5.3-7.4 9.7-7.4 9.7Z"],
    bolt: ["M13.4 3 4.6 14h5.8l-1 7 8.8-11h-5.8l1-7Z"],
    receipt: ["M6 3.2h12v17.6l-3-1.8-3 1.8-3-1.8-3 1.8V3.2Z", "M9.2 8.4h5.6", "M9.2 12.4h5.6"],
    check: ["m5.4 12.8 4.4 4.4 8.8-10"],
    close: ["M6 6l12 12", "M18 6 6 18"],
    copy: ["M8.6 8.6h11.8v11.8H8.6z", "M15.4 5.6H4.6a1 1 0 0 0-1 1v10.8"],
    lock: ["M5.6 10.6h12.8v9.8H5.6z", "M8.4 10.6V7.8a3.6 3.6 0 0 1 7.2 0v2.8"],
    snow: ["M12 3v18", "m5.2 7 13.6 10", "m18.8 7-13.6 10", "m9 5.6 3 2.4 3-2.4", "m9 18.4 3-2.4 3 2.4", "m4.6 10.6.3 3.6 3.4 1", "m19.4 10.6-.3 3.6-3.4 1", "m4.6 13.4-.3-3.6 3.4-1", "m19.4 13.4.3-3.6-3.4-1"],
    qr: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h2.6v2.6H14z", "M20 14v6h-6"],
    eye: ["M2.4 12S6 5.8 12 5.8 21.6 12 21.6 12 18 18.2 12 18.2 2.4 12 2.4 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
    backspace: ["M9.2 4.6h11a1.2 1.2 0 0 1 1.2 1.2v12.4a1.2 1.2 0 0 1-1.2 1.2h-11L2.4 12l6.8-7.4Z", "m12.6 9 5 6", "m17.6 9-5 6"],
    shield: ["M12 3.2 20 6v6.2c0 5-3.6 8.2-8 9.2-4.4-1-8-4.2-8-9.2V6l8-2.8Z"],
    doc: ["M6.8 3.2h7.4l5 5v12.6H6.8z", "M14.2 3.2v5h5", "M9.8 13h6", "M9.8 16.6h4"],
    globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.2 12h17.6", "M12 3a13.8 13.8 0 0 1 0 18 13.8 13.8 0 0 1 0-18Z"],
    users: ["M9 11.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z", "M2.6 20.2c1.4-3.1 3.8-4.7 6.4-4.7s5 1.6 6.4 4.7", "M16.4 5.2a3.4 3.4 0 0 1 0 6.6", "M18 14.8c2 .7 3.2 2 4 4"],
    help: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.4 2-2.4 3.6", "M12 17.2h.01"],
    link: ["M10 13.6a3.8 3.8 0 0 0 5.6.4l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.4 1.4", "M14 10.4a3.8 3.8 0 0 0-5.6-.4l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.4-1.4"],
    scan: ["M4 8.6V4h4.6", "M15.4 4H20v4.6", "M20 15.4V20h-4.6", "M8.6 20H4v-4.6", "M4 12h16"],
    logout: ["M14.4 7.2V4.6H4.6v14.8h9.8v-2.6", "M9.6 12h11.8", "m17.8 8.4 3.6 3.6-3.6 3.6"],
    wallet: ["M3.4 7.8h17.2v11.4H3.4z", "m3.4 7.8 12.2-3.4 1.2 3.4", "M17 14.4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"],
    briefcase: ["M3.4 7.6h17.2v12H3.4z", "M8.8 7.6V5.4a1.4 1.4 0 0 1 1.4-1.4h3.6a1.4 1.4 0 0 1 1.4 1.4v2.2", "M3.4 12.6h17.2"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5.2l3.4 2"],
    sparkle: ["m12 3.4 1.9 4.9 4.9 1.8-4.9 1.9-1.9 4.9-1.8-4.9-4.9-1.9 4.9-1.8L12 3.4Z", "M18.6 16.4l.9 2.2 2.1.8-2.1.9-.9 2.1-.8-2.1-2.2-.9 2.2-.8.8-2.2Z"],
  };

  var FILLED = { star: true, plane: true, bolt: true, sparkle: true };

  function icon(name, size) {
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    if (size) { svg.setAttribute("width", size); svg.setAttribute("height", size); }
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    (PATHS[name] || PATHS.help).forEach(function (d) {
      var p = document.createElementNS(SVG, "path");
      p.setAttribute("d", d);
      if (FILLED[name]) {
        p.setAttribute("fill", "currentColor");
      } else {
        p.setAttribute("stroke", "currentColor");
        p.setAttribute("stroke-width", "1.7");
        p.setAttribute("stroke-linecap", "round");
        p.setAttribute("stroke-linejoin", "round");
      }
      svg.appendChild(p);
    });
    return svg;
  }

  /* ------------------------------------------------------------ formatting */

  var SYMBOL = { USD: "$", EUR: "€", GBP: "£", BTC: "₿" };

  function symbolFor(cur) { return SYMBOL[cur] || (cur + " "); }

  function money(amount, currency, opts) {
    opts = opts || {};
    currency = currency || "USD";
    var neg = amount < 0;
    var abs = Math.abs(amount);
    var digits = currency === "BTC" ? 6 : 2;
    if (opts.round && abs >= 1000) digits = 0;
    var body = abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    var sign = neg ? "−" : (opts.signed ? "+" : "");
    if (currency === "BTC") return sign + body + " ₿";
    return sign + symbolFor(currency) + body;
  }

  /* Big hero numbers split the cents down so the eye lands on the whole part. */
  function heroMoney(amount, currency) {
    var parts = money(amount, currency).split(".");
    return [
      h("span", { text: parts[0] }),
      parts[1] ? h("span.cents", { text: "." + parts[1] }) : null,
      h("span.cur", { text: currency }),
    ];
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function d(x) { return x instanceof Date ? x : new Date(x); }

  function dayKey(date) { return d(date).toISOString().slice(0, 10); }

  function dayLabel(date, today) {
    var key = dayKey(date);
    var t = dayKey(today || NS.data.TODAY);
    var y = new Date(d(today || NS.data.TODAY).getTime() - 864e5).toISOString().slice(0, 10);
    if (key === t) return "Today";
    if (key === y) return "Yesterday";
    var dt = d(date);
    return DAYS[dt.getUTCDay()].slice(0, 3) + ", " + dt.getUTCDate() + " " + MONTHS_SHORT[dt.getUTCMonth()] +
      (dt.getUTCFullYear() !== d(today || NS.data.TODAY).getUTCFullYear() ? " " + dt.getUTCFullYear() : "");
  }

  function timeLabel(date) {
    var dt = d(date);
    var hh = String(dt.getUTCHours()).padStart(2, "0");
    var mm = String(dt.getUTCMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }

  function fullDate(date) {
    var dt = d(date);
    return dt.getUTCDate() + " " + MONTHS[dt.getUTCMonth()] + " " + dt.getUTCFullYear() + ", " + timeLabel(dt);
  }

  function monthKey(date) { return d(date).toISOString().slice(0, 7); }
  function monthLabel(key) {
    var p = key.split("-");
    return MONTHS[Number(p[1]) - 1] + " " + p[0];
  }
  function monthShort(key) {
    var p = key.split("-");
    return MONTHS_SHORT[Number(p[1]) - 1];
  }

  /* ------------------------------------------------------------- feedback */

  function haptic(kind) {
    if (!navigator.vibrate) return;
    var map = { light: 8, medium: 14, heavy: 22, error: [18, 60, 18] };
    try { navigator.vibrate(map[kind] || 10); } catch (e) { /* ignore */ }
  }

  function toast(title, sub) {
    var root = document.getElementById("toast-root");
    var el = h("div.toast", {}, [
      h("div.toast-title", { text: title }),
      sub ? h("div.toast-sub", { text: sub }) : null,
    ]);
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, 2600);
  }

  /* ---------------------------------------------------------------- sheet */

  var sheetOpen = false;

  function sheet(title, sub, body, footer) {
    closeSheet();
    var root = document.getElementById("sheet-root");
    var panel = h("div.sheet", {}, [
      h("div.sheet-grab"),
      title ? h("h2.sheet-title", { text: title }) : null,
      sub ? h("p.sheet-sub", { text: sub }) : null,
      body,
      footer,
    ]);
    var backdrop = h("div.sheet-backdrop", {
      onclick: function (e) { if (e.target === backdrop) closeSheet(); },
    }, panel);
    root.appendChild(backdrop);
    sheetOpen = true;
    return { backdrop: backdrop, panel: panel };
  }

  function closeSheet() {
    var root = document.getElementById("sheet-root");
    if (root) clear(root);
    sheetOpen = false;
  }

  function isSheetOpen() { return sheetOpen; }

  function copy(text, label) {
    var done = function () { toast(label || "Copied", text); haptic("light"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  function fallbackCopy(text) {
    var ta = h("textarea", { style: "position:fixed;opacity:0;top:0;left:0" });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------- shared blocks */

  function backBtn(onclick, label) {
    return h("button.back-btn", { type: "button", onclick: onclick }, [icon("back", 16), label || "Back"]);
  }

  function glyphFor(t) {
    var cat = NS.data.categories[t.category] || {};
    /* Salary is named by its label, not painted: its glyph stays neutral. */
    if (t.category === "salary") return h("div.glyph", {}, icon(cat.icon || "wallet", 20));
    var tone = t.amount > 0 ? "credit" : cat.tone === "credit" ? "credit" : cat.tone;
    var cls = "glyph" + (tone === "credit" ? " is-credit" : tone === "accent" ? " is-accent" : tone === "warn" ? " is-warn" : "");
    return h("div", { class: cls }, icon(cat.icon || "card", 20));
  }

  function initialsGlyph(name, cls) {
    var bits = String(name).split(" ").filter(Boolean);
    var text = (bits[0] || "?")[0] + (bits[1] ? bits[1][0] : "");
    return h("div", { class: "avatar" + (cls ? " " + cls : ""), text: text.toUpperCase() });
  }

  function footerNote() {
    return h("div.footer", {}, [
      h("div.footer-brand", { text: "Powered by REBANK" }),
    ]);
  }

  NS.ui = {
    h: h, clear: clear, icon: icon, money: money, heroMoney: heroMoney,
    symbolFor: symbolFor, dayKey: dayKey, dayLabel: dayLabel, timeLabel: timeLabel,
    fullDate: fullDate, monthKey: monthKey, monthLabel: monthLabel, monthShort: monthShort,
    MONTHS: MONTHS, MONTHS_SHORT: MONTHS_SHORT,
    toast: toast, haptic: haptic, sheet: sheet, closeSheet: closeSheet, isSheetOpen: isSheetOpen,
    copy: copy, backBtn: backBtn, glyphFor: glyphFor, initialsGlyph: initialsGlyph,
    footerNote: footerNote,
  };
})(window.RBU);
