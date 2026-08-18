import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import OrderForm from "../components/OrderForm";
import OrderBook from "../components/OrderBook";
import MarketChart from "../components/MarketChart";
import DepthChart from "../components/DepthChart";
import MarketStats from "../components/MarketStats";
import WalletPanel from "../components/WalletPanel";
import { useOrderBookSocket } from "../hooks/useOrderBookSocket";
import { useMarketTicks } from "../hooks/useMarketTicks";

const CURRENCY_PAIR = "BTC-USD";

export default function Trading() {
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);

  const { bids, asks, connected } = useOrderBookSocket(CURRENCY_PAIR);
  const { ticks, error: ticksError } = useMarketTicks(CURRENCY_PAIR, 100);

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

  // Placing an order can fill it immediately against the book, which
  // moves real money through the ledger — so every time an order is
  // placed OR cancelled, re-fetch both the order list and the wallet.
  async function handleOrderPlaced() {
    await loadOrders();
    setWalletRefreshKey((k) => k + 1);
  }

  async function handleCancel(orderId) {
    setCancellingId(orderId);
    setOrdersError("");
    try {
      const res = await apiFetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        setOrdersError(res.status === 409 ? "That order already settled — nothing to cancel." : "Could not cancel that order.");
        return;
      }
      await loadOrders();
      setWalletRefreshKey((k) => k + 1);
    } catch {
      setOrdersError("Could not reach the server.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="page page--wide">
      <h1>Trading</h1>
      <p className="subtitle">{CURRENCY_PAIR} · live matching engine, real-time order book.</p>

      <MarketStats ticks={ticks} />

      <div className="terminal-layout">
        <div className="terminal-main">
          <div className="panel market-chart-panel">
            <h2>Market Chart · {CURRENCY_PAIR}</h2>
            <MarketChart pair={CURRENCY_PAIR} ticks={ticks} error={ticksError} />
          </div>

          <div className="panel market-chart-panel">
            <h2>Order Book Depth · {CURRENCY_PAIR}</h2>
            <DepthChart bids={bids} asks={asks} />
          </div>

          <div className="panel my-orders">
            <h2>Your Orders</h2>
            {ordersError && <p className="form-error">{ordersError}</p>}
            {!ordersError && orders.length === 0 && (
              <p className="placeholder-note">No orders yet — place one from the panel on the right.</p>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const cancellable = o.status === "OPEN" || o.status === "PARTIALLY_FILLED";
                    return (
                      <tr key={o.id}>
                        <td className={o.side === "BUY" ? "side-buy" : "side-sell"}>{o.side}</td>
                        <td>{o.type}</td>
                        <td>{o.price ?? "market"}</td>
                        <td>{o.quantity}</td>
                        <td>{o.filledQuantity}</td>
                        <td>{o.status}</td>
                        <td>
                          {cancellable && (
                            <button
                              className="order-cancel"
                              onClick={() => handleCancel(o.id)}
                              disabled={cancellingId === o.id}
                            >
                              {cancellingId === o.id ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="terminal-sidebar">
          <OrderForm currencyPair={CURRENCY_PAIR} onOrderPlaced={handleOrderPlaced} />
          <WalletPanel refreshKey={walletRefreshKey} />
          <OrderBook currencyPair={CURRENCY_PAIR} bids={bids} asks={asks} connected={connected} />
        </div>
      </div>
    </div>
  );
}