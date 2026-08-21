import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

function fmt(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

/**
 * Read-only balance readout for the trading page sidebar. Adding funds
 * lives on the Dashboard now — this panel just shows current USD/BTC
 * balances. `refreshKey` lets a parent force a re-fetch (e.g. after an
 * order fills) by changing its value.
 */
export default function WalletPanel({ refreshKey }) {
  const [balances, setBalances] = useState(null);
  const [error, setError] = useState("");

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
    loadBalances();
  }, [refreshKey]);

  return (
    <div className="panel wallet-panel">
      <h2>Wallet</h2>
      {error && <p className="form-error">{error}</p>}
      {!error && !balances && <p className="placeholder-note">Loading balances...</p>}
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