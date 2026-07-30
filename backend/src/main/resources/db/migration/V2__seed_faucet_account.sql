-- V2: A system "faucet" user + accounts, used as the DEBIT counterparty when we
-- credit a real user with simulated funds. This keeps deposits double-entry too:
-- nothing is credited out of thin air without an equal, traceable debit somewhere.

INSERT INTO users (id, email, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'system-faucet@openex.internal', 'not-a-real-login')
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, user_id, currency)
VALUES
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', 'USD'),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000001', 'BTC')
ON CONFLICT (user_id, currency) DO NOTHING;
