-- V3: Orders + idempotency cache

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type VARCHAR(6) NOT NULL CHECK (type IN ('LIMIT', 'MARKET')),
    price DECIMAL(18, 8),                 -- NULL for MARKET orders
    quantity DECIMAL(18, 8) NOT NULL CHECK (quantity > 0),
    filled_quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL DEFAULT 'OPEN', -- OPEN, PARTIALLY_FILLED, FILLED, CANCELLED
    currency_pair VARCHAR(10) NOT NULL DEFAULT 'BTC-USD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_pair ON orders(currency_pair, status);

-- Every write request that carries an Idempotency-Key gets one row here.
-- If the same key comes in again, we return the cached response instead of
-- re-executing the request (and therefore never create a duplicate order).
CREATE TABLE idempotency_keys (
    idempotency_key UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    request_path VARCHAR(255) NOT NULL,
    response_status INT NOT NULL,
    response_body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
