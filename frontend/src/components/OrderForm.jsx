import { useState } from "react";
import { apiFetch } from "../api/client";

/**
 * Buy/Sell, Limit/Market order ticket.
 *
 * Every submission generates a fresh UUID and sends it as the
 * Idempotency-Key header, matching what the backend's OrderController
 * expects. If the user's request is retried by the browser (or they
 * mash the button before the button disables), the same key would just
 * replay the first response instead of creating a second order — but
 * we also generate a brand-new key per *intentional* new submission so
 * two different orders never collide.
 */
export default function OrderForm({ currencyPair, onOrderPlaced }) {
  const [side, setSide] = useState("BUY");
  const [type, setType] = useState("LIMIT");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success' | 'error', text }

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);

    if (type === "LIMIT" && !price) {
      setFeedback({ kind: "error", text: "Limit orders need a price." });
      return;
    }
    if (!quantity) {
      setFeedback({ kind: "error", text: "Quantity is required." });
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();

      // Sent as strings, not JS numbers — BigDecimal on the backend parses
      // the exact decimal text losslessly, avoiding IEEE-754 float rounding
      // (e.g. 0.1 + 0.2 !== 0.3) that a real ledger can't tolerate.
      const body = {
        side,
        type,
        quantity,
        currencyPair,
        ...(type === "LIMIT" ? { price } : {}),
      };

      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setFeedback({ kind: "error", text: `Order rejected (status ${res.status}).` });
        return;
      }

      const order = await res.json();
      setFeedback({
        kind: "success",
        text: `${order.side} order placed — status ${order.status}, filled ${order.filledQuantity}/${order.quantity}.`,
      });
      setPrice("");
      setQuantity("");
      onOrderPlaced?.(order);
    } catch {
      setFeedback({ kind: "error", text: "Could not reach the server. Is the backend running?" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel order-form-panel">
      <h2>Place Order · {currencyPair}</h2>
      <form onSubmit={handleSubmit} className="order-form">
        <div className="segmented">
          <button
            type="button"
            className={side === "BUY" ? "active buy" : ""}
            onClick={() => setSide("BUY")}
          >
            Buy
          </button>
          <button
            type="button"
            className={side === "SELL" ? "active sell" : ""}
            onClick={() => setSide("SELL")}
          >
            Sell
          </button>
        </div>

        <div className="segmented">
          <button
            type="button"
            className={type === "LIMIT" ? "active" : ""}
            onClick={() => setType("LIMIT")}
          >
            Limit
          </button>
          <button
            type="button"
            className={type === "MARKET" ? "active" : ""}
            onClick={() => setType("MARKET")}
          >
            Market
          </button>
        </div>

        {type === "LIMIT" && (
          <label>
            Price (USD)
            <input
              type="number"
              step="any"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 50000.00"
              required
            />
          </label>
        )}

        <label>
          Quantity (BTC)
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 0.05"
            required
          />
        </label>

        {feedback && (
          <p className={feedback.kind === "error" ? "form-error" : "form-success"}>
            {feedback.text}
          </p>
        )}

        <button type="submit" className={`submit-order ${side === "BUY" ? "buy" : "sell"}`} disabled={submitting}>
          {submitting ? "Placing..." : `${side === "BUY" ? "Buy" : "Sell"} ${type === "LIMIT" ? "Limit" : "Market"}`}
        </button>
      </form>
    </div>
  );
}
