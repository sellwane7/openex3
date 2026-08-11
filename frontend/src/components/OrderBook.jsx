import { useOrderBookSocket } from "../hooks/useOrderBookSocket";

/**
 * Live order book, stacked exchange-style:
 *   - Asks (sell side, red) on top, highest price at the very top,
 *     lowest/best ask sitting just above the spread.
 *   - A spread divider in the middle.
 *   - Bids (buy side, green) below, best/highest bid just under the
 *     spread, lowest bid at the bottom.
 *
 * Fed entirely by the /topic/orderbook STOMP feed — no polling, no manual
 * refresh. Re-renders whenever the backend broadcasts a new snapshot.
 */
export default function OrderBook({ currencyPair }) {
  const { bids, asks, connected } = useOrderBookSocket(currencyPair);

  // Display order: best ask nearest the spread (i.e. lowest ask price at
  // the bottom of the asks block), so reverse the ascending-price list
  // the backend sends.
  const asksDisplay = [...asks].reverse();
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const spread = bestBid && bestAsk ? (bestAsk - bestBid).toFixed(2) : null;

  return (
    <div className="panel order-book">
      <div className="order-book-header">
        <h2>Order Book · {currencyPair}</h2>
        <span className={`ws-status ${connected ? "ws-connected" : "ws-disconnected"}`}>
          {connected ? "● live" : "○ connecting..."}
        </span>
      </div>

      <div className="order-book-columns">
        <span>Price</span>
        <span>Quantity</span>
      </div>

      <div className="order-book-side asks">
        {asksDisplay.length === 0 && <p className="placeholder-note">No resting asks.</p>}
        {asksDisplay.map((level) => (
          <div className="order-book-row ask-row" key={`ask-${level.price}`}>
            <span className="row-price">{level.price}</span>
            <span className="row-qty">{level.quantity}</span>
          </div>
        ))}
      </div>

      <div className="order-book-spread">
        {spread ? `spread ${spread}` : "no spread yet"}
      </div>

      <div className="order-book-side bids">
        {bids.length === 0 && <p className="placeholder-note">No resting bids.</p>}
        {bids.map((level) => (
          <div className="order-book-row bid-row" key={`bid-${level.price}`}>
            <span className="row-price">{level.price}</span>
            <span className="row-qty">{level.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
