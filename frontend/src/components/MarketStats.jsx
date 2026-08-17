function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * A small stats strip derived from the same tick series the chart already
 * has — last price, session high/low, and change since the first tick in
 * the window. "Session" rather than "24h" because the simulator generates
 * a fresh random-walk window each time, not a real rolling day.
 */
export default function MarketStats({ ticks }) {
  if (!ticks || ticks.length === 0) return null;

  const prices = ticks.map((t) => t.price);
  const last = prices[prices.length - 1];
  const first = prices[0];
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const changePct = ((last - first) / first) * 100;
  const up = changePct >= 0;

  return (
    <div className="market-stats">
      <div className="market-stats__item">
        <span className="market-stats__label">Last</span>
        <span className="market-stats__value">${fmt(last)}</span>
      </div>
      <div className="market-stats__item">
        <span className="market-stats__label">Session change</span>
        <span className={`market-stats__value ${up ? "stat-up" : "stat-down"}`}>
          {up ? "+" : ""}
          {changePct.toFixed(2)}%
        </span>
      </div>
      <div className="market-stats__item">
        <span className="market-stats__label">Session high</span>
        <span className="market-stats__value">${fmt(high)}</span>
      </div>
      <div className="market-stats__item">
        <span className="market-stats__label">Session low</span>
        <span className="market-stats__value">${fmt(low)}</span>
      </div>
    </div>
  );
}
