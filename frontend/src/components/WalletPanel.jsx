import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

function fmt(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

/**
 * Compact balance readout for the trading page sidebar. Also lets the
 * user add simulated funds in any amount, any time, via the real
 * /api/wallets/deposit endpoint. `refreshKey` lets a parent force a
 * re-fetch (e.g. after an order fills) by changing its value.
 */
export default function WalletPanel({ refreshKey }) {
  const [balances, setBalances] = useState(null);
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
    loadBalances();
  }, [refreshKey]);

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
      setDepositMessage(`Added ${fmt(parsed)} ${currency}.`);
      setAmount("");
      await loadBalances();
    } catch {
      setDepositMessage("Could not reach the server.");
    } finally {
      setDepositing(false);
    }
  }

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

      <form onSubmit={handleAddFunds} style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
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
  );
}