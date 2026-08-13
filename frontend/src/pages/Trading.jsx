import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import OrderForm from "../components/OrderForm";
import OrderBook from "../components/OrderBook";
import MarketChart from "../components/MarketChart";

const CURRENCY_PAIR = "BTC-USD";

export default function Trading() {
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiFetch("/api/orders");
      if (!res.ok) {
        setOrdersError("Could not load your orders.");
        return;
      }
      setOrders(await res.json());
      setOrdersError("");
    } catch {
      setOrdersError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="page">
      <h1>Trading</h1>
      <p className="subtitle">Place limit and market orders, watch the live book move.</p>

      <div className="trading-grid">
        <OrderForm currencyPair={CURRENCY_PAIR} onOrderPlaced={loadOrders} />
        <OrderBook currencyPair={CURRENCY_PAIR} />
      </div>

      <div className="panel market-chart-panel">
        <h2>Market Chart · {CURRENCY_PAIR}</h2>
        <MarketChart pair={CURRENCY_PAIR} />
      </div>

      <div className="panel my-orders">
        <h2>Your Orders</h2>
        {ordersError && <p className="form-error">{ordersError}</p>}
        {!ordersError && orders.length === 0 && (
          <p className="placeholder-note">No orders yet — place one above.</p>
        )}
        {orders.length > 0 && (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Side</th>
                <th>Type</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Filled</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={o.side === "BUY" ? "side-buy" : "side-sell"}>{o.side}</td>
                  <td>{o.type}</td>
                  <td>{o.price ?? "market"}</td>
                  <td>{o.quantity}</td>
                  <td>{o.filledQuantity}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}