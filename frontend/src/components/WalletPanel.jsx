import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

function fmt(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

/**
 * Compact balance readout for the trading page sidebar — same /api/wallets
 * endpoint the Dashboard uses, just rendered as a small list instead of
 * the big hero cards, so you can see what you have to trade without
 * leaving the terminal.
 */
export default function WalletPanel() {
  const [balances, setBalances] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="panel wallet-panel">
      <h2>Wallet</h2>
      {error && <p className="form-error">{error}</p>}
      {!error && !balances && <p className="placeholder-note">Loading balances…</p>}
      {balances && (
        <div className="wallet-panel__rows">
          {balances.map((b) => (
            <div className="wallet-panel__row" key={b.currency}>
              <span className="wallet-panel__currency">{b.currency}</span>
              <span className="wallet-panel__amount">{fmt(b.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
