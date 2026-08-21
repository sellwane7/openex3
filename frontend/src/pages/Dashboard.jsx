import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fetchMarketTicks } from "../api/marketClient";

const CURRENCY_META = {
  USD: { label: "US Dollar", symbol: "$", accent: "#3ee08a" },
  BTC: { label: "Bitcoin", symbol: "\u20BF", accent: "#e0a53e" },
};

function formatMoney(value) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [balances, setBalances] = useState(null);
  const [btcPrice, setBtcPrice] = useState(null);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");

  async function loadBalances() {
    try {
      const res = await apiFetch("/api/wallets");
      if (!res.ok) {
        setError("Could not load balances.");
        return;
      }
      const data = await res.json();
      setBalances(data);
      setError("");
    } catch {
      setError("Could not reach the server.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPrice() {
      try {
        const data = await fetchMarketTicks("BTC-USD", 1);
        if (!cancelled && data.ticks?.length) {
          setBtcPrice(data.ticks[data.ticks.length - 1].price);
        }
      } catch {
        // Price is a nice-to-have here; don't block the balances view on it.
      }
    }

    loadBalances();
    loadPrice();
    const interval = setInterval(loadPrice, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleAddFunds(e) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setDepositMessage("Enter an amount greater than 0.");
      return;
    }
    setDepositing(true);
    setDepositMessage("");
    try {
      const res = await apiFetch("/api/wallets/deposit", {
        method: "POST",
        body: JSON.stringify({ currency, amount: parsed }),
      });
      if (!res.ok) {
        setDepositMessage("Could not add funds. Please try again.");
        return;
      }
      setDepositMessage(`Added ${amount} ${currency}.`);
      setAmount("");
      await loadBalances();
    } catch {
      setDepositMessage("Could not reach the server.");
    } finally {
      setDepositing(false);
    }
  }

  const usdBalance = balances?.find((b) => b.currency === "USD")?.balance ?? 0;
  const btcBalance = balances?.find((b) => b.currency === "BTC")?.balance ?? 0;
  const btcValueInUsd = btcPrice ? btcBalance * btcPrice : null;
  const portfolioTotal = btcValueInUsd !== null ? usdBalance + btcValueInUsd : null;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">Your portfolio at a glance.</p>

      {error && <p className="form-error">{error}</p>}

      {!error && !balances && <p className="placeholder-note">Loading balances...</p>}

      {balances && (
        <>
          <div className="portfolio-hero">
            <span className="portfolio-hero__label">Total portfolio value</span>
            <span className="portfolio-hero__value">
              {portfolioTotal !== null ? `$${formatMoney(portfolioTotal)}` : `$${formatMoney(usdBalance)}`}
            </span>
            {btcPrice && (
              <span className="portfolio-hero__note">
                BTC-USD ~ ${formatMoney(btcPrice)} (live from market simulator)
              </span>
            )}
          </div>

          <div className="panel" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginTop: 0 }}>Add funds</h2>
            <p className="placeholder-note" style={{ marginBottom: "0.75rem" }}>
              Add simulated USD or BTC to your wallet any time.
            </p>
            <form onSubmit={handleAddFunds} style={{ display: "flex", gap: "0.5rem" }}>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ background: "#1a1e24", color: "#fff", border: "1px solid #333", borderRadius: "4px", padding: "0.4rem" }}
              >
                <option value="USD">USD</option>
                <option value="BTC">BTC</option>
              </select>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ flex: 1, background: "#1a1e24", color: "#fff", border: "1px solid #333", borderRadius: "4px", padding: "0.4rem" }}
              />
              <button type="submit" className="submit-order buy" disabled={depositing} style={{ padding: "0.4rem 0.8rem" }}>
                {depositing ? "Adding..." : "Add"}
              </button>
            </form>
            {depositMessage && <p className="placeholder-note" style={{ marginTop: "0.5rem" }}>{depositMessage}</p>}
          </div>

          <div className="balance-cards">
            {balances.map((b) => {
              const meta = CURRENCY_META[b.currency] ?? { label: b.currency, symbol: "", accent: "#8592a3" };
              const usdEquivalent =
                b.currency === "BTC" && btcPrice ? b.balance * btcPrice : null;

              return (
                <div key={b.currency} className="balance-card" style={{ "--accent": meta.accent }}>
                  <div className="balance-card__header">
                    <span className="balance-card__symbol">{meta.symbol}</span>
                    <span className="balance-card__currency">{b.currency}</span>
                  </div>
                  <div className="balance-card__amount">{formatMoney(b.balance)}</div>
                  <div className="balance-card__meta">
                    {meta.label}
                    {usdEquivalent !== null && ` - ~ $${formatMoney(usdEquivalent)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}