import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fetchMarketTicks } from "../api/marketClient";

const CURRENCY_META = {
  USD: { label: "US Dollar", symbol: "$", accent: "#3ee08a" },
  BTC: { label: "Bitcoin", symbol: "₿", accent: "#e0a53e" },
};

function formatMoney(value) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [balances, setBalances] = useState(null);
  const [btcPrice, setBtcPrice] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBalances() {
      try {
        const res = await apiFetch("/api/wallets");
        if (!res.ok) {
          if (!cancelled) setError("Could not load balances.");
          return;
        }
        const data = await res.json();
        if (!cancelled) setBalances(data);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      }
    }

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

  const usdBalance = balances?.find((b) => b.currency === "USD")?.balance ?? 0;
  const btcBalance = balances?.find((b) => b.currency === "BTC")?.balance ?? 0;
  const btcValueInUsd = btcPrice ? btcBalance * btcPrice : null;
  const portfolioTotal = btcValueInUsd !== null ? usdBalance + btcValueInUsd : null;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">Your portfolio at a glance.</p>

      {error && <p className="form-error">{error}</p>}

      {!error && !balances && <p className="placeholder-note">Loading balances…</p>}

      {balances && (
        <>
          <div className="portfolio-hero">
            <span className="portfolio-hero__label">Total portfolio value</span>
            <span className="portfolio-hero__value">
              {portfolioTotal !== null ? `$${formatMoney(portfolioTotal)}` : `$${formatMoney(usdBalance)}`}
            </span>
            {btcPrice && (
              <span className="portfolio-hero__note">
                BTC-USD ≈ ${formatMoney(btcPrice)} (live from market simulator)
              </span>
            )}
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
                    {usdEquivalent !== null && ` · ≈ $${formatMoney(usdEquivalent)}`}
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