-- Record simulated payment outcomes without storing card or TOTP secrets.
-- Manual rollback: DROP TABLE IF EXISTS payment_attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
    payment_attempt_id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_reference TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status TEXT NOT NULL CHECK (status IN ('approved', 'declined')),
    payment_method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id
ON payment_attempts(order_id);