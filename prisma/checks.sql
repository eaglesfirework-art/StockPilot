-- Database safety checks. Safe to run many times.
ALTER TABLE "Item"         DROP CONSTRAINT IF EXISTS item_qty_not_negative;
ALTER TABLE "Item"         ADD  CONSTRAINT item_qty_not_negative CHECK ("qtyOnHand" >= 0);
ALTER TABLE "PurchaseLine" DROP CONSTRAINT IF EXISTS purchaseline_qty_positive;
ALTER TABLE "PurchaseLine" ADD  CONSTRAINT purchaseline_qty_positive CHECK (qty > 0);
ALTER TABLE "SaleLine"     DROP CONSTRAINT IF EXISTS saleline_qty_positive;
ALTER TABLE "SaleLine"     ADD  CONSTRAINT saleline_qty_positive CHECK (qty > 0);
ALTER TABLE "Payment"      DROP CONSTRAINT IF EXISTS payment_amount_positive;
ALTER TABLE "Payment"      ADD  CONSTRAINT payment_amount_positive CHECK (amount > 0);
