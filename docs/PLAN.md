# StockPilot – Simple Plan (v2.1)

**Goal: a small version where everything works. Nothing extra.**

| Item | Value |
|---|---|
| Version | 2.1 – Simplified, with product mapping (no quantity in the mapping). A working build is in `stockpilot/` |
| Date | 1 November 2026 |
| Stack | Next.js + TypeScript + PostgreSQL + Prisma |
| Users | Workers on mobile (data entry). Admin mostly on desktop. |
| Connectivity | Online only. No offline mode. |
| Size | **12 database tables** (was 20+). About **5–6 weeks** (was 9–10). |

---

## 0. What we removed to keep it simple

| Removed | What we do instead |
|---|---|
| Draft documents | Save = post. Mistakes are fixed by an admin cancel |
| Recipes with quantities and versions | Replaced by a **product → raw materials mapping with no quantities**. The worker types the quantity used in every batch. Past batches keep their own numbers |
| Unit table | `unit` is a text field on the item (kg, piece) |
| Worker table | Workers are a type of Party |
| LabourPayment, BatchExpense, BatchInput tables | Labour and expenses are **Payment** rows linked to the batch. Material use is read from the stock log |
| PaymentAllocation table | A payment can point to one bill, or just to a party |
| Counter table (document numbers) | Auto-number IDs (shown as `PUR-12`, `BAT-4`) |
| Discount and extra charges | Bill total = sum of lines |
| Permission map, many roles | Two roles: `ADMIN`, `WORKER`. Two helper checks |
| Money method (cash/UPI/bank) | Not recorded |
| Excel and PDF export | CSV only |
| Hindi / Marathi, i18n | English only |
| Nightly integrity job, integrity screen | One script run by hand, plus database safety checks |
| FIFO, multi-business, approval mode | Weighted average. One business. Entries post at once |

**Can be added later without redesign:** drafts, approvals, formal returns, Excel/PDF, more roles, GST, more languages.

---

## 1. What we are building

A web app (installable on a phone) that answers:

1. What stock do we have, and what is it worth?
2. Where does money come in and go out?
3. Who owes us, and who do we owe?
4. What does one finished unit cost to make?

**Core idea:** every change is a row in a log. Stock and money are never typed in as totals. They are calculated from rows. This gives a full history ("flour 500 → 400, by Ravi, Batch #4").

**Workers (mobile):** receive raw materials, record production (materials used, labour, expenses), record labour payments.
**Admin (desktop):** create raw materials and finished products, map each product to its raw materials, money flow dashboard, full log, customers and vendors with dues, sales, reports, users, corrections.

---

## 2. Decisions

### Locked (change only if you object)

| Topic | Decision |
|---|---|
| Business | One business per installation |
| Stock value | Weighted average cost |
| Costing | Per batch |
| Negative stock | Blocked |
| Entries | Post immediately when saved. Admin can cancel with a reason |
| Money flow | Cash basis: money in = customer receipts. Money out = vendor payments + labour + expenses. A bill is not "money out" until paid |
| Labour | Recorded when paid. No wage accrual |
| Other expenses | Recorded as paid. No unpaid expenses |
| Units | One unit per item. No conversion |
| Language and currency | English, INR, IST time zone |

### Please confirm (2 questions left)

1. **Can workers see rates and amounts on their own forms?** Default: yes, only on their own entry screens. No dashboards or totals.
2. **Can workers create sales?** Default: no. Admin only.
3. ~~Can workers add a new vendor, worker, or item?~~ **Decided: no.** Only the admin creates items, parties and mappings.

---

## 3. Roles

| Action | ADMIN | WORKER |
|---|---|---|
| Receive materials (purchase) | Yes | Yes |
| Create raw materials and finished products, map products to raw materials | Yes | No |
| Record production batch (with labour and expenses) | Yes | Yes |
| Record labour payment | Yes | Yes |
| Add or edit items, parties, rates, mapping | Yes | No |
| Sales, customer receipts, vendor payments | Yes | No |
| Dashboard, reports, logs, dues | Yes | No (own recent entries only) |
| Cancel an entry, adjust stock | Yes | No |
| Manage users | Yes | No |

**Rule:** checks happen **on the server** in every action. Two helpers only: `requireUser()` and `requireAdmin()`.

---

## 4. Features

### Worker (mobile)

**W1. Receive materials** (one form = purchase)
- Vendor, date, reference number (optional), item lines (item, qty, rate), "paid now" amount (optional).
- On save: stock up, average cost updated, bill created, payment created if paid.
- Accept: stock rises by exactly the quantity. Double tap makes one entry. Quantity ≤ 0 or empty lines are rejected.

**W2. Product mapping** (admin only, desktop)
- Admin creates raw materials and finished products (Items), then ticks which raw materials each product is made from (Product mapping).
- The mapping has **no quantity**. It only says "Product P uses materials A, B, C".
- Accept: mapping can be changed any time. Old batches are not affected. Every change is in the audit log.

**W3. Production batch** (one form does everything)
- Product, date. The form lists the product's **mapped raw materials** and the worker types the quantity actually used for each (a material not in the mapping is blocked). Then: quantity produced, quantity rejected, **labour lines** (worker, amount, note), **expense lines** (description, amount).
- On save (one transaction):
  1. Check stock for every material.
  2. Reduce materials at current average cost.
  3. Create labour and expense payments linked to the batch.
  4. Good units = produced − rejected (must be > 0).
  5. Cost per unit = (material + labour + expenses) ÷ good units.
  6. Add finished goods and update their average cost.
- Accept: numbers match section 6. Zero good units or low stock is blocked and nothing is saved.

**W4. Labour payment** (outside a batch)
- Worker, amount, date, note, optional batch.
- Accept: appears in the labour list and in money flow.

### Admin (desktop)

**A1. Dashboard**
- Money in, money out, net (today, 7 days, this month, custom).
- Chart of money in and out by day or month.
- Money out by type (vendor, labour, expenses).
- Customers owe (total, top 5). We owe vendors (total, top 5).
- Stock value (raw materials, finished goods). Low-stock list.

**A2. Log**
- **Stock log:** time, item, change, before, after, reason, document, user.
- **Audit log:** time, user, action, details (cancels, edits to items and mapping, adjustments, logins).
- Filters: date, item, user. Rows cannot be edited or deleted in the app.

**A3. Customers and vendors**
- List with balance. Open one for a statement (bills and payments with running balance).
- Record a customer receipt or vendor payment, in full or in part, to one bill or to the party.

**A4. Sales** (admin)
- Customer, date, lines (product, qty, rate), "received now".
- Stock check, cost at sale saved, customer balance updated.

**A5. Corrections**
- **Cancel** a purchase, sale, batch, or payment (reason required).
- **Stock adjustment** for damage, count error, or opening stock (reason required).

**A6. Items, parties, users** (admin)
- Create, edit, deactivate. Items and parties with history are never deleted.

---

## 5. Rules and formulas

| # | Rule |
|---|---|
| R1 | Stock quantity = sum of stock log changes for the item |
| R2 | **On stock in:** new average = (old qty × old avg + new qty × new cost) ÷ (old qty + new qty) |
| R3 | **On stock out:** leaves at the current average. The average does not change |
| R4 | Stock value = quantity × average cost |
| R5 | Bill total = sum of lines. Bill due = total − payments linked to that bill |
| R6 | Party balance = opening balance + bills − payments (cancelled items excluded) |
| R7 | Good units = produced − rejected. Must be > 0 |
| R8 | Batch cost = materials + labour + expenses. Cost per unit = batch cost ÷ good units (4 decimals stored, 2 shown) |
| R9 | Gross profit on a sale line = amount − (qty × cost at sale) |
| R10 | Stock can never go below zero. Anything that would do so is blocked |
| R11 | Saved entries cannot be edited. Fix by cancel, then enter again |
| R12 | **Cancel stock-in** (purchase, batch output): removes the quantity at the current average. Blocked if stock would go below zero |
| R13 | **Cancel stock-out** (sale, batch materials): adds the quantity back at its original cost (normal R2) |
| R14 | Cancelling a bill (purchase, sale) or batch also cancels the payments linked to it. The confirmation screen lists them |
| R15 | Cancelled entries are excluded from every total and shown (greyed) in lists and logs |
| R16 | Money flow reads only the Payment table. Every rupee that moves is one Payment row |
| R17 | Money and quantity use decimals (never floating point). Money 2 dp, quantity 3 dp, unit cost 4 dp |
| R18 | Store time in UTC. Show in IST |

*Known simplification:* cancelling an old purchase does not restate the cost of earlier batches. This is acceptable for a small business and is shown in the log.

---

## 6. Worked example (also the main test)

### Setup
Raw materials: Flour (kg), Sugar (kg). Product: Biscuit pack (piece). Vendors A (flour), B (sugar). Customer C. Worker team: Ramesh. Mapping: Biscuit pack uses Flour and Sugar. In the batch the worker types 50 kg flour and 20 kg sugar for 400 packs.

### Events

| Step | Event | Result |
|---|---|---|
| 1 | Receive 100 kg flour @ ₹40 from A = ₹4,000. Paid ₹2,000 | Flour 100 kg, avg ₹40. A due ₹2,000 |
| 2 | Receive 100 kg flour @ ₹44 from A = ₹4,400. Paid ₹3,000 | Flour 200 kg, **avg ₹42**. A due ₹3,400 |
| 3 | Receive 20 kg sugar @ ₹50 from B = ₹1,000. Paid ₹1,000 | Sugar 20 kg, avg ₹50. B due ₹0 |
| 4 | Batch: uses 50 kg flour + 20 kg sugar. Labour ₹3,000 (Ramesh). Expense ₹900 (gas). Produced 400, rejected 20 | See below |
| 5 | Sale: 100 packs @ ₹30 = ₹3,000 to C. Received ₹1,000 | C owes ₹2,000 |

### Expected numbers after step 4

| Item | Calculation | Result |
|---|---|---|
| Material cost | 50 × 42 + 20 × 50 | ₹3,100 |
| Labour | | ₹3,000 |
| Expenses | | ₹900 |
| Batch cost | 3,100 + 3,000 + 900 | **₹7,000** |
| Good units | 400 − 20 | 380 |
| Cost per unit | 7,000 ÷ 380 | **₹18.4211** (shown ₹18.42) |
| Flour left | 200 − 50 | 150 kg, avg ₹42, value ₹6,300 |
| Sugar left | | 0 |
| Packs | | 380, value ≈ ₹7,000 |

### Expected numbers after step 5

| Item | Result |
|---|---|
| Packs left | 280, value ≈ ₹5,157.91 |
| Cost of 100 packs sold | ≈ ₹1,842.11 |
| Gross profit | ≈ ₹1,157.89 |
| Customers owe | ₹2,000 |
| We owe vendors | ₹3,400 (vendor A) |
| Money in | ₹1,000 |
| Money out | ₹9,900 = vendors 6,000 (2,000 + 3,000 + 1,000) + labour 3,000 + expense 900 |
| Net | **−₹8,900** |

### Must be blocked

| Try | Expected |
|---|---|
| Sell 300 packs (280 left) | "Only 280 available" |
| Batch with 0 good units | "Good units must be more than 0" |
| Batch using 500 kg flour (150 left) | Blocked, shows available quantity |
| Purchase with qty 0 or negative | Blocked at the field |
| Tap Save twice quickly | One entry only |
| Worker opens an admin page | "Not allowed" |
| Admin cancels the batch after 100 packs were sold | Blocked: "Need to remove 380 packs, only 280 in stock" |
| Admin cancels the sale, then the batch | Allowed. Flour back to 200 kg at ₹42, sugar back to 20 kg at ₹50, packs 0, labour and expense payments cancelled |

---

## 7. Technology and structure

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript. Server Actions for writes |
| Database | PostgreSQL + Prisma |
| Login and roles | Better Auth (or Auth.js) with a `role` field |
| UI | Tailwind + shadcn/ui. Plain tables with server-side paging |
| Forms | React Hook Form + Zod (same schema on client and server) |
| Charts | Recharts (two charts) |
| Money math | Prisma Decimal / decimal.js |
| Export | CSV |
| PWA | Web manifest + icons only. No offline caching |
| Tests | Vitest (with real Postgres in Docker), one Playwright test |
| Hosting | Vercel + managed Postgres (India or nearest region), or any container host |

**PWA note:** online-only means no service-worker data caching. We need a manifest, icons, HTTPS, and a simple "You are offline" page.

### Folder structure

```
stockpilot/
├─ prisma/  schema.prisma, migrations/, seed.ts      (seed = section 6 example)
├─ src/
│  ├─ app/
│  │  ├─ login/
│  │  ├─ w/          worker area: receive/, production/, labour/, history/
│  │  ├─ admin/      dashboard, stock, log, customers, vendors, purchases, sales,
│  │  │              production, payments, items, parties, users, reports
│  │  └─ manifest.ts
│  ├─ server/
│  │  ├─ db.ts, auth.ts        (requireUser, requireAdmin)
│  │  ├─ stock.ts              (moveStock – the ONLY code that changes stock)
│  │  ├─ actions/              purchase.ts, sale.ts, batch.ts, payment.ts, cancel.ts, adjust.ts
│  │  └─ queries/              dashboard.ts, dues.ts, reports.ts
│  └─ lib/       money.ts, validators/ (Zod)
└─ tests/        unit/, integration/ (section 6 scenario), e2e/
```

**Rule:** all business rules live in `server/`. Screens only call actions and queries. The dashboard and reports use the same query functions, so the numbers always agree.

---

## 8. Database schema (12 tables)

Adjust the generator and datasource to your Prisma version. If the auth library creates its own user table, add `role` and `active` to it instead of creating `User`.

```prisma
enum Role           { ADMIN WORKER }
enum ItemType       { RAW_MATERIAL FINISHED_GOOD }
enum PartyType      { VENDOR CUSTOMER WORKER }
enum PaymentKind    { VENDOR_PAYMENT CUSTOMER_RECEIPT LABOUR EXPENSE }
enum MovementReason { OPENING PURCHASE SALE PRODUCTION_USE PRODUCTION_OUTPUT ADJUSTMENT REVERSAL }

// 1. Users
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role      Role     @default(WORKER)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

// 2. Items (raw materials and finished goods)
model Item {
  id           String   @id @default(cuid())
  name         String   @unique
  type         ItemType
  unit         String                                   // "kg", "piece"
  minStock     Decimal  @default(0) @db.Decimal(14, 3)
  sellingPrice Decimal? @db.Decimal(14, 2)
  qtyOnHand    Decimal  @default(0) @db.Decimal(14, 3)  // kept in step with StockMovement
  avgCost      Decimal  @default(0) @db.Decimal(14, 4)
  active       Boolean  @default(true)
  movements    StockMovement[]
  purchaseLines PurchaseLine[]
  saleLines    SaleLine[]
  asProduct    ProductMaterial[] @relation("PM_Product")
  asMaterial   ProductMaterial[] @relation("PM_Material")
  batches      ProductionBatch[] @relation("BatchProduct")
}

// 3. Parties: vendors, customers, workers/teams
model Party {
  id             String    @id @default(cuid())
  name           String
  type           PartyType
  phone          String?
  openingBalance Decimal   @default(0) @db.Decimal(14, 2)  // vendor: we owe. customer: they owe
  active         Boolean   @default(true)
  purchases      Purchase[]
  sales          Sale[]
  payments       Payment[]
}

// 4–5. Purchases (raw material receipts)
model Purchase {
  id           Int       @id @default(autoincrement())     // shown as PUR-12
  requestId    String    @unique                           // blocks double save
  vendorId     String
  vendor       Party     @relation(fields: [vendorId], references: [id])
  date         DateTime
  refNo        String?
  total        Decimal   @db.Decimal(14, 2)
  note         String?
  createdById  String
  createdAt    DateTime  @default(now())
  cancelledAt  DateTime?
  cancelReason String?
  lines        PurchaseLine[]
  payments     Payment[]
  @@index([vendorId, date])
}
model PurchaseLine {
  id         Int      @id @default(autoincrement())
  purchaseId Int
  purchase   Purchase @relation(fields: [purchaseId], references: [id])
  itemId     String
  item       Item     @relation(fields: [itemId], references: [id])
  qty        Decimal  @db.Decimal(14, 3)
  rate       Decimal  @db.Decimal(14, 4)
  amount     Decimal  @db.Decimal(14, 2)
}

// 6–7. Sales
model Sale {
  id           Int       @id @default(autoincrement())     // SAL-7
  requestId    String    @unique
  customerId   String
  customer     Party     @relation(fields: [customerId], references: [id])
  date         DateTime
  total        Decimal   @db.Decimal(14, 2)
  note         String?
  createdById  String
  createdAt    DateTime  @default(now())
  cancelledAt  DateTime?
  cancelReason String?
  lines        SaleLine[]
  payments     Payment[]
  @@index([customerId, date])
}
model SaleLine {
  id         Int     @id @default(autoincrement())
  saleId     Int
  sale       Sale    @relation(fields: [saleId], references: [id])
  itemId     String
  item       Item    @relation(fields: [itemId], references: [id])
  qty        Decimal @db.Decimal(14, 3)
  rate       Decimal @db.Decimal(14, 4)
  amount     Decimal @db.Decimal(14, 2)
  costAtSale Decimal @db.Decimal(14, 4)                    // average cost when sold → profit
}

// 8. Money ledger: every rupee in or out is one row
//    IN = CUSTOMER_RECEIPT.  OUT = VENDOR_PAYMENT, LABOUR, EXPENSE.
model Payment {
  id           Int         @id @default(autoincrement())   // PAY-31
  requestId    String      @unique
  kind         PaymentKind
  partyId      String?                                     // vendor, customer, or worker
  party        Party?      @relation(fields: [partyId], references: [id])
  amount       Decimal     @db.Decimal(14, 2)
  date         DateTime
  note         String?                                     // e.g. "gas" for an expense
  purchaseId   Int?                                        // pays this bill (optional)
  purchase     Purchase?   @relation(fields: [purchaseId], references: [id])
  saleId       Int?                                        // receipt for this sale (optional)
  sale         Sale?       @relation(fields: [saleId], references: [id])
  batchId      Int?                                        // labour/expense of this batch (optional)
  batch        ProductionBatch? @relation(fields: [batchId], references: [id])
  createdById  String
  createdAt    DateTime    @default(now())
  cancelledAt  DateTime?
  cancelReason String?
  @@index([date, kind])
}

// 9. Product -> raw material mapping. NO quantity: quantities are typed in each batch.
model ProductMaterial {
  id         Int    @id @default(autoincrement())
  productId  String
  product    Item   @relation("PM_Product",  fields: [productId],  references: [id])
  materialId String
  material   Item   @relation("PM_Material", fields: [materialId], references: [id])
  @@unique([productId, materialId])
}

// 10. Production batch (inputs are in StockMovement, labour/expenses are in Payment)
model ProductionBatch {
  id           Int       @id @default(autoincrement())     // BAT-4
  requestId    String    @unique
  productId    String
  product      Item      @relation("BatchProduct", fields: [productId], references: [id])
  date         DateTime
  qtyProduced  Decimal   @db.Decimal(14, 3)
  qtyRejected  Decimal   @default(0) @db.Decimal(14, 3)
  materialCost Decimal   @db.Decimal(14, 2)
  labourCost   Decimal   @db.Decimal(14, 2)
  otherCost    Decimal   @db.Decimal(14, 2)
  costPerUnit  Decimal   @db.Decimal(14, 4)
  note         String?
  createdById  String
  createdAt    DateTime  @default(now())
  cancelledAt  DateTime?
  cancelReason String?
  payments     Payment[]
}

// 11. Stock log (add-only). Shows "500 → 400".
model StockMovement {
  id           Int            @id @default(autoincrement())
  itemId       String
  item         Item           @relation(fields: [itemId], references: [id])
  reason       MovementReason
  qtyChange    Decimal        @db.Decimal(14, 3)           // + in, − out
  qtyBefore    Decimal        @db.Decimal(14, 3)
  qtyAfter     Decimal        @db.Decimal(14, 3)
  unitCost     Decimal        @db.Decimal(14, 4)
  refType      String?                                     // "Purchase" | "Sale" | "Batch" | "Adjustment"
  refId        String?
  note         String?
  createdById  String
  createdAt    DateTime       @default(now())
  @@index([itemId, createdAt])
  @@index([refType, refId])
}

// 12. Audit log: cancels, edits to items/mapping/parties, adjustments, logins
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    String?
  action    String
  entity    String?
  entityId  String?
  detail    Json?
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

**Safety checks to add in a raw SQL migration**
- `CHECK ("qtyOnHand" >= 0)` on `Item`.
- `CHECK (qty > 0)` on purchase and sale lines. `CHECK (amount > 0)` on `Payment`.
- Give the app's database user only `INSERT` and `SELECT` on `StockMovement` and `AuditLog`.

**How to read the data (no extra tables needed)**
- Bill due = `total` − sum of non-cancelled `Payment.amount` with that `purchaseId` / `saleId`.
- Party balance = `openingBalance` + non-cancelled bills − non-cancelled payments for that party.
- Batch materials = `StockMovement` rows with `refType = "Batch"` and `reason = PRODUCTION_USE`.
- Batch labour and expenses = `Payment` rows with that `batchId`.
- Money in/out = `Payment` grouped by `kind` and `date`, where `cancelledAt` is null.

---

## 9. How saving works (the important part)

Every action that changes stock or money follows the same steps:

1. Check the user (`requireUser` or `requireAdmin`) and validate input with Zod.
2. Open **one database transaction**.
3. If a row with the same `requestId` exists, return it (stops double save).
4. Lock the affected `Item` rows (`SELECT … FOR UPDATE`, sorted by id), so two people cannot change the same stock at once.
5. Check the rules (enough stock, good units > 0).
6. Write stock with `moveStock()` and write payments.
7. Commit. If anything fails, nothing is saved and the user sees a clear message.

### `moveStock` – the only code that changes stock

```ts
async function moveStock(tx, { item, qtyChange, unitCost, reason, ref, userId, note }) {
  const qtyBefore = item.qtyOnHand;
  const qtyAfter  = qtyBefore.plus(qtyChange);
  if (qtyAfter.lt(0)) throw new BusinessError(`Not enough ${item.name}. Available: ${qtyBefore}`);

  // Average changes only when stock comes IN
  let avgCost = item.avgCost;
  if (qtyChange.gt(0)) {
    avgCost = qtyBefore.times(item.avgCost).plus(qtyChange.times(unitCost)).div(qtyAfter).toDecimalPlaces(4);
  }

  await tx.stockMovement.create({ data: {
    itemId: item.id, reason, qtyChange, qtyBefore, qtyAfter, unitCost,
    refType: ref?.type, refId: ref ? String(ref.id) : null, note, createdById: userId,
  }});
  await tx.item.update({ where: { id: item.id }, data: { qtyOnHand: qtyAfter, avgCost } });
  item.qtyOnHand = qtyAfter; item.avgCost = avgCost;
}
```

### `createBatch` – the costing step

```ts
export async function createBatch(input, user) {
  requireUser(user);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.productionBatch.findUnique({ where: { requestId: input.requestId } });
    if (existing) return existing;                                  // double tap

    const good = input.qtyProduced.minus(input.qtyRejected);
    if (good.lte(0)) throw new BusinessError("Good units must be more than 0");

    const items = await lockItems(tx, [...input.materials.map(m => m.itemId), input.productId]);

    const batch = await tx.productionBatch.create({ data: { /* header fields, costs = 0 for now */ } });

    let materialCost = new Decimal(0);
    for (const m of input.materials) {                              // 1. use materials
      const item = items.get(m.itemId);
      materialCost = materialCost.plus(m.qty.times(item.avgCost));
      await moveStock(tx, { item, qtyChange: m.qty.neg(), unitCost: item.avgCost,
        reason: "PRODUCTION_USE", ref: { type: "Batch", id: batch.id }, userId: user.id });
    }

    let labourCost = new Decimal(0), otherCost = new Decimal(0);    // 2. labour and expenses = payments
    for (const l of input.labour)   { await createPayment(tx, "LABOUR",  l, batch.id, user); labourCost = labourCost.plus(l.amount); }
    for (const e of input.expenses) { await createPayment(tx, "EXPENSE", e, batch.id, user); otherCost  = otherCost.plus(e.amount); }

    const costPerUnit = materialCost.plus(labourCost).plus(otherCost).div(good).toDecimalPlaces(4);

    await moveStock(tx, { item: items.get(input.productId), qtyChange: good, unitCost: costPerUnit,
      reason: "PRODUCTION_OUTPUT", ref: { type: "Batch", id: batch.id }, userId: user.id });

    return tx.productionBatch.update({ where: { id: batch.id },
      data: { materialCost, labourCost, otherCost, costPerUnit } });
  });
}
```

### Cancel (admin)

Follows R12–R15. In one transaction: reverse each stock row of the document with `moveStock` (reason `REVERSAL`), set `cancelledAt` and `cancelReason`, cancel the linked payments, and write an `AuditLog` row. If stock would go below zero, nothing happens and the message says why.

---

## 10. Screens

### Worker (mobile, one task per screen)

| Screen | Content |
|---|---|
| Home | 3 big buttons: Receive materials, Production, Labour. Below: my recent entries |
| Receive materials | Vendor → items (search, qty, rate) → paid now → summary → **Save** |
| Production | Product → mapped materials (type quantity used) → produced and rejected → labour lines → expense lines → summary → **Save** |
| Labour | Worker → amount → note → **Save** |

**Mobile rules**
- 48 px touch targets. One main button, fixed at the bottom.
- Number keypad for quantity and money. Show the unit next to every quantity.
- Show a summary before the final Save. After saving, show the number (e.g. "PUR-12 saved") and "Enter another".
- Disable the Save button after one tap. If the connection fails, show "Not saved. Check internet." and **keep the typed data**.
- Errors next to the field in plain words ("Only 150 kg available").

### Admin (desktop)

Dashboard · Stock (click an item for its log) · Items · Product mapping · Log (stock + audit) · Customers · Vendors · Purchases · Sales · Production · Payments · Items · Parties · Users · Reports.

**Admin rules:** server-side paging, date filters (today, 7 days, this month, custom), document numbers are links, Indian number format (₹1,25,000.00), simple status badges: Saved (green), Cancelled (red).

---

## 11. Reports (all with date filter and CSV export)

| Report | Columns |
|---|---|
| Stock summary | Item, unit, quantity, average cost, value, minimum, low flag |
| Stock log (per item) | Time, change, before, after, reason, document, user |
| Money flow | Period, money in, money out, net. Out split by vendor / labour / expense |
| Purchases | Number, date, vendor, total, paid, due |
| Sales | Number, date, customer, total, received, due, gross profit |
| Customer dues / Vendor dues | Party, billed, paid, balance, oldest unpaid bill age |
| Party statement | Date, document, amount, running balance |
| Labour payments | Date, worker, amount, batch, note |
| Production cost | Batch, product, date, material, labour, other, good units, cost per unit |

---

## 12. Security, backup, hosting (short)

- **Security:** HTTPS, secure cookies, login rate limit, server-side checks in every action, Zod validation, totals recalculated on the server, no secrets in the repo.
- **Before launch, test:** worker calling admin actions, changing an ID in a URL to see another record, double save.
- **Backup:** daily automatic database backup (hosting feature), plus a weekly `pg_dump` to separate storage. **Do one restore test before launch.**
- **Monitoring:** `/api/health` page with an uptime check, and error logs from the host (Sentry optional).
- **Environment variables:** `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `TZ=Asia/Kolkata`.
- **Integrity check (manual script):** compare `Item.qtyOnHand` with the sum of `StockMovement.qtyChange` and report any difference. Run weekly or after any incident.

---

## 13. Testing (keep it small but real)

| What | How |
|---|---|
| Costing and money functions | Vitest unit tests (weighted average, cost per unit, rounding) |
| **Section 6 scenario** | One integration test on a real Postgres: runs steps 1–5 and checks every number |
| Blocked cases | Tests for each row in "Must be blocked" |
| Double save | Same `requestId` twice → one entry |
| Two at once | Two parallel sales of the last 10 units → one succeeds, one is blocked, stock never below 0 |
| Permissions | Worker calls every admin action → all fail |
| Screens | One Playwright test on a phone-size screen: log in, receive materials, save a batch |
| Business check (UAT) | The business repeats section 6 on a real phone and a desktop |

---

## 14. Delivery plan (1–2 developers, rough)

| Phase | Work | Time |
|---|---|---|
| **0. Setup** | Repo, Next.js, Postgres (Docker), Prisma, auth with roles, worker and admin layouts, CI, staging | 2–3 days |
| **1. Basics** | Items, parties, users (create/edit/deactivate), opening stock and balances, audit log helper | 3–4 days |
| **2. Purchases** | `moveStock`, purchase form, payments to vendors, stock screen and item log, vendor balance and statement, cancel purchase | ~1 week |
| **3. Production** | Product mapping screen (admin), batch form (mapped materials, labour, expenses), costing, labour payment form, batch detail, cancel batch | 1–1.5 weeks |
| **4. Sales** | Sale form, customer receipts, customer balance and statement, cancel sale | 4–5 days |
| **5. Dashboard and reports** | Money flow, dues, stock value, low-stock, log screen, reports and CSV, stock adjustment, integrity script | ~1 week |
| **6. Finish** | PWA manifest and icons, mobile polish on a real phone, security checks, restore test, UAT, deploy, short user guide | 4–5 days |
| **Total** | | **about 5–6 weeks** |

**Build costing first.** After Phase 1, write `moveStock` and `createBatch` with the section 6 test before building polished screens. If those numbers are right, the rest is straightforward.

**Phase exit checks**
- Phase 2: steps 1–3 of section 6 match exactly.
- Phase 3: cost per unit is **18.4211**, stock numbers match.
- Phase 4–5: all "after step 5" numbers match, and dashboard totals equal the sum of the ledgers.

---

## 15. Coverage of the BRD

| BRD | Covered by | Note |
|---|---|---|
| BR-01 Dashboard | A1 | |
| BR-02 Item master | A6, Item table | Unit is plain text |
| BR-03 Stock and valuation | R1–R4 | Weighted average |
| BR-04, BR-05 Raw material and purchase | W1 | One form. No discount or charges |
| BR-06 Sales | A4 | |
| BR-07 Vendor ledger and payments | A3 | |
| BR-08 Labour payments | W3, W4 | |
| BR-09, BR-10 Costing and production | W3, R7–R8 | |
| BR-11 Transaction history | A2, lists with filters | |
| BR-12 Reports | Section 11 | |
| BR-13 Validation | Sections 6 and 9 | |
| BR-14 Access and audit | Section 3, A2 | |
| BR-15 Backup and export | Section 12, CSV | No Excel or PDF in v1 |

**Your highlighted needs:** money flow (A1) · every event logged, "500 → 400" (stock log) · customers owing (A3) · raw materials entry (W1) · raw material → product mapping (W2, W3: admin maps, worker types quantities) · labour cost (W3, W4).

---

## 16. Risks (the few that matter)

| Risk | What we do |
|---|---|
| Wrong stock from double save or two people at once | `requestId`, one transaction, row locks, database checks |
| Wrong cost per unit | Test with the section 6 numbers before building screens |
| Workers enter wrong data | Summary before save, units shown, admin cancel, audit log |
| Data loss | Daily backup, weekly dump, restore test before launch |
| Extra features creep in | Use section 0 and section 17 as the list. Add only after launch |

---

## 17. Later (not in this version)

Drafts and approval of worker entries · formal returns and credit notes · discount and charges on bills · unpaid expenses and wage accrual · Excel and PDF · Hindi and Marathi · more roles · GST invoices · push alerts · barcode scanning · multiple businesses · offline mode.

---

## 18. Launch checklist

- [ ] Two questions in section 2 answered
- [ ] Section 6 scenario passes in an automated test and in manual UAT
- [ ] All "Must be blocked" cases are blocked
- [ ] Worker cannot reach any admin page or action
- [ ] Backup is running and a **restore test passed**
- [ ] HTTPS, secure cookies, login rate limit verified
- [ ] Opening stock and opening balances entered and checked by the business
- [ ] Admin and worker accounts created, passwords set
- [ ] One-page worker guide and short admin guide handed over
- [ ] Rollback plan written (how to return to the previous version)

---

*Next step: run the working build in `stockpilot/` (see its README), answer the two questions in section 2, then test with the business.*
