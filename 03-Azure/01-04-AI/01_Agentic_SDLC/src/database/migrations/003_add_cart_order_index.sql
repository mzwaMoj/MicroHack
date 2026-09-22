-- Enforce one active shopping cart per branch.
-- Manual rollback: DROP INDEX IF EXISTS idx_orders_one_cart_per_branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_one_cart_per_branch
ON orders(branch_id)
WHERE status = 'cart';