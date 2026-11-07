# StockPilot: change request, test-first, with evidence (7 Nov 2026)

Run it yourself: `npm run test:setup` once, then `npm test` (77 unit + DB tests) and `npm run e2e` (32 Playwright tests, real browser, starts from an empty database with one admin). Screenshots below are written by the Playwright run into `docs/evidence/`.

| Requirement | Where it is checked | Evidence |
|---|---|---|
| Show/hide on every password box (login, add user, edit user, change password) | `e2e/01-setup.spec.ts` login + users + worker profile tests | `01-login-password-shown.png`, `02-users-created.png` |
| Profile icon on the worker pages | `01-setup` "worker sees a profile icon…" | `05-worker-home-profile-icon.png` |
| Vendors: "For bill" removed | `02-forms` "vendor payment: no 'For bill' choice" | `07-vendor-statement.png` |
| Clear statement wording instead of "PAY-3" | `tests/statement.test.ts`, `03-insights` statement tests | `07-vendor-statement.png` |
| No duplicate vendors (case, spaces, punctuation, same phone, rename, two saves at once) | `tests/features.db.test.ts`, `01-setup` duplicate test | `04-duplicate-vendor-blocked.png` |
| Outstanding balance editable after creation (logged; negatives refused) | `features.db.test.ts`, `01-setup` outstanding test | audit log row checked in the test |
| Admin creates worker accounts, raw materials, products, mapping, vendors, customers, labour | `01-setup.spec.ts` | `02-users-created.png`, `03-product-mapped.png` |
| Every form, by the right person (Ravi/Suresh as workers, admin for sales and payments) | `02-forms.spec.ts` | `06-worker-production-saved.png` |
| The nine business questions | `tests/insights.test.ts` (maths), `features.db.test.ts` (from the database), `03-insights.spec.ts` (on screen, exact sentences) | `08-insights-october.png`, `09-dashboard-october.png` |

## The worked example behind the numbers (October compared with September)

| | September | October |
|---|---|---|
| Flour bought | 100 kg @ ₹40, paid | 100 kg @ ₹46, ₹2,000 paid |
| Sugar bought | 50 kg @ ₹50, paid | 50 kg @ ₹56, on credit |
| Batch of 400 packs | 50 kg flour, 20 kg sugar, labour ₹2,000, gas ₹500 | 60 kg flour, 25 kg sugar, labour ₹2,400, gas ₹600 |
| Sale | Metro Mart 300 @ ₹30, paid in full | City Bakers 200 @ ₹32, ₹2,000 + ₹1,500 received |
| Other | — | labour advance ₹500, ₹1,000 paid to Anand; Shree's outstanding balance corrected 1,000 → 1,200 |

| Question | Answer shown |
|---|---|
| Q1 Spent | ₹6,500 paid out (was ₹9,000); ₹7,400 of purchase bills |
| Q2 Earned | ₹3,500 received; ₹6,400 of sales (was ₹9,000) |
| Q3 Customers owe us | ₹2,900 (City Bakers) |
| Q4 We owe vendors | ₹5,600: Shree ₹4,000 (1,200 + 2,500 + 2,800 − 2,500), Anand ₹1,600 |
| Q5 Dearer materials | Flour +15%, Sugar +12% |
| Q6 More material per unit | Sugar +25%, Flour +20% |
| Q7 Cost per pack | ₹13.75 → ₹17.46 (+27%): material ₹9.96, labour ₹6.00, other ₹1.50 |
| Q8 Profitability | Declining: net margin 54.2% → 39.9% (−14.2 points) |
| Q9 Where money goes | Vendors 46.2%, Labour 44.6%, Other 9.2% |

## Found while testing
- The pre-written Q4 test expected ₹5,350 using old rates (44/55); the purchases in the same test are at 46/56, so the right total is ₹5,600. The test was corrected.
- Raw materials allowed "flour" next to "Flour". Item names are now unique ignoring case, spaces and punctuation (new test added).
- After "User created", the password box stayed in "shown" mode for the next user. It now hides itself when the form clears.
- Editing a party without the balance field used to reset its outstanding balance to 0. Leaving it out now keeps it.
- A refused sale uses up a sale number (database sequences never go back), so numbers can skip. This is expected.
