import { useEffect, useRef, useState } from "react";
import { fetchMarketTicks } from "../api/marketClient";

const POLL_INTERVAL_MS = 5000;

/**
 * Polls the market simulator for a pair's recent tick series (price +
 * moving averages) and keeps it in state. Lifted out of MarketChart so
 * the Trading page can share one poll loop across the chart, the stats
 * strip, and anything else that needs the same series.
 */
export function useMarketTicks(pair = "BTC-USD", count = 100) {
  const [ticks, setTicks] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  async function loadTicks() {
    try {
      const data = await fetchMarketTicks(pair, count);
      setTicks(data.ticks);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTicks();
    intervalRef.current = setInterval(loadTicks, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, count]);

  return { ticks, error };
}
