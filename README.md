# RBUBANK

A mobile-first neobank MVP — the clickable product an investor can actually hold in their hand.
Pure static HTML/CSS/JS: no build step, no backend, no dependencies. Open `index.html` and the bank runs.

**Live demo:** https://aireden14.github.io/rbubank-app/

## What's inside

**Personal cabinet — Denis Reshetov.** Passcode unlock (any 4 digits, or Face ID), Metal plan, KYC verified.

**Home.** Total balance across five accounts, account switcher, eight quick actions, incoming-payment banner, 30-day money in/out, card widget, recent activity, 12-month income chart, savings vault.

**Incoming.** Twelve monthly contract payments of $6,050–$7,400 that add up to exactly **$80,000 over the year**, from three European payers via SWIFT and SEPA — plus marketplace payouts, contract milestones, dividends, a tax refund, cashback, referral bonuses, card refunds, vault interest and inbound peer transfers.

**Outgoing.** Rent standing order, utilities and direct debits, ten subscriptions, groceries, coffee, restaurants, food delivery, transport, fuel and parking, shopping, electronics, entertainment, beauty, health, education, donations, gifts, travel with foreign-currency spending, ATM cash in four cities, payouts to an external bank, FX conversions, crypto buys and fees.

**~1,170 transactions across thirteen months in 26 categories**, with three statuses that behave differently: completed, pending (an authorisation hold leaves the available balance immediately, an incoming payment does not) and declined (struck through, never touches the balance, with the reason attached).

**Transfer menu.** To an RBU user, to a bank account, international SWIFT, to your own card, request money, split a bill, account details, scheduled payments, add money, exchange, withdraw.

**Periods.** Activity and Analytics both switch between 1M / 3M / 6M / 1Y / All — totals, charts, categories and merchants all recompute. Activity also filters by type (income, card, subscriptions, transfers, cash, exchange, pending, declined), searches by merchant, person, reference or amount, and pages through the ledger 80 rows at a time. Tapping a category bar in Analytics opens every payment inside it.

**Working flows** (they change the balance and write to the ledger):
send money (recipient → amount → confirm → receipt), add money, withdraw, FX exchange, vault deposit/withdraw, crypto buy, card freeze/unfreeze, reveal card details, split a bill, request money.

**The rest of a bank.** Cards (metal + virtual, limits, PIN, per-card toggles), savings vault at 4.15% APY, crypto, multi-currency accounts, analytics (in vs out, categories, top merchants), statements with print/PDF and CSV export, IBAN/BIC/sort code/routing details, security (biometrics, 2FA, devices, deposit protection), notifications, plans and pricing, support, referrals, and an "About" screen written for investors.

## Design

Design code inherited from BurpiOpus: black canvas, one violet accent, aurora glow, hairline rules,
oversized tabular numerals, glass surfaces, bottom sheets, 520px content column centred on any screen.
Dark only, mobile-first, safe-area aware, `prefers-reduced-motion` respected.

## Data

Everything is generated from a single deterministic seed (`src/data.js`), so the numbers on stage tomorrow
are the numbers you rehearsed today. Anything you do in the app is stored in `localStorage` only —
"Reset demo data" in Profile rebuilds the original ledger. No real money, no real people, no network calls.

## Run it

```bash
python3 -m http.server 4479
```

Then open http://localhost:4479 — or just double-click `index.html`.

## Files

```
index.html            shell
styles.css            design system
icon.svg              app icon
src/data.js           seeded ledger, accounts, cards, contacts
src/ui.js             element helper, icon set, money/date formatting, sheets, toasts
src/views-money.js    login, home, activity, wealth, analytics
src/views-flows.js    transfer hub, send, request, top-up, withdraw, exchange, split, vault, crypto
src/views-account.js  cards, profile, details, statements, security, notifications, support, plans, about
src/app.js            state, persistence, routing
```

Powered by [@Denrech](https://t.me/Denrech)
