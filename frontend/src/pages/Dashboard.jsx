import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export default function Dashboard() {
  const [balances, setBalances] = useState(null);
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
    loadBalances();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">Your wallet balances.</p>
      <div className="panel">
        {error && <p className="form-error">{error}</p>}
        {!error && !balances && <p className="placeholder-note">Loading balances...</p>}
        {balances && (
          <ul className="balance-list">
            {balances.map((b) => (
              <li key={b.currency}>
                <span className="balance-currency">{b.currency}</span>
                <span className="balance-amount">{b.balance}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
