/**
 * Live order book, stacked exchange-style:
 *   - Asks (sell side, red) on top, highest price at the very top,
 *     lowest/best ask sitting just above the spread.
 *   - A spread divider in the middle.
 *   - Bids (buy side, green) below, best/highest bid just under the
 *     spread, lowest bid at the bottom.
 *
 * Bids/asks/connected are passed down from the page, which owns the one
 * STOMP connection to /topic/orderbook — that way this panel and the
 * depth chart share a single socket instead of each opening their own.
 */
export default function OrderBook({ currencyPair, bids, asks, connected }) {
  // Guard against bids/asks ever being null/undefined (e.g. a snapshot
  // response that doesn't match the expected shape). Without this,
  // [...asks] throws synchronously during render and — since there's no
  // error boundary above this in older builds — silently blanks the
  // entire app instead of just this panel.
  const safeBids = Array.isArray(bids) ? bids : [];
  const safeAsks = Array.isArray(asks) ? asks : [];

  // Display order: best ask nearest the spread (i.e. lowest ask price at
  // the bottom of the asks block), so reverse the ascending-price list
  // the backend sends.
  const asksDisplay = [...safeAsks].reverse();
  const bestBid = safeBids[0]?.price;
  const bestAsk = safeAsks[0]?.price;
  const spread = bestBid && bestAsk ? (bestAsk - bestBid).toFixed(2) : null;

  return (
    <div className="panel order-book">
      <div className="order-book-header">
        <h2>Order Book · {currencyPair}</h2>
        <span className={`ws-status ${connected ? "ws-connected" : "ws-disconnected"}`}>
          <span className="ws-dot" aria-hidden="true"></span>
          {connected ? "live" : "connecting..."}
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
        {safeBids.length === 0 && <p className="placeholder-note">No resting bids.</p>}
        {safeBids.map((level) => (
          <div className="order-book-row bid-row" key={`bid-${level.price}`}>
            <span className="row-price">{level.price}</span>
            <span className="row-qty">{level.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
