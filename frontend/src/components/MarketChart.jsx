import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
} from "chartjs-chart-financial";
import { Chart } from "react-chartjs-2";
import { fetchMarketTicks } from "../api/marketClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
);

const POLL_INTERVAL_MS = 5000;

const CHART_TYPES = [
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "candlestick", label: "Candlestick" },
  { value: "ohlc", label: "OHLC Bars" },
];

// There's no OHLC feed from the backend — just a raw price tick series —
// so we group consecutive ticks into synthetic candles for the financial views.
function bucketToCandles(ticks, bucketSize) {
  const candles = [];
  for (let i = 0; i < ticks.length; i += bucketSize) {
    const slice = ticks.slice(i, i + bucketSize);
    if (slice.length === 0) continue;
    const prices = slice.map((t) => t.price);
    const last = slice[slice.length - 1];
    candles.push({
      x: candles.length,
      o: prices[0],
      h: Math.max(...prices),
      l: Math.min(...prices),
      c: prices[prices.length - 1],
      tick: last.tick,
      smaShort: last.sma_short,
      smaLong: last.sma_long,
    });
  }
  return candles;
}

export default function MarketChart({ pair = "BTC-USD" }) {
  const [ticks, setTicks] = useState([]);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("line");
  const intervalRef = useRef(null);

  async function loadTicks() {
    try {
      const data = await fetchMarketTicks(pair, 100);
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
  }, [pair]);

  // ~24 candles regardless of how many raw ticks come back
  const candles = useMemo(() => {
    const bucketSize = Math.max(2, Math.ceil(ticks.length / 24));
    return bucketToCandles(ticks, bucketSize);
  }, [ticks]);

  if (error) {
    return (
      <div className="market-chart market-chart--error">
        Couldn't load market data: {error}
      </div>
    );
  }

  if (ticks.length === 0) {
    return <div className="market-chart market-chart--loading">Loading chart…</div>;
  }

  const isFinancial = chartType === "candlestick" || chartType === "ohlc";
  const labels = ticks.map((t) => t.tick);

  const lineData = {
    labels,
    datasets: [
      {
        type: "line",
        label: `${pair} price`,
        data: ticks.map((t) => t.price),
        borderColor: "#3ee08a",
        backgroundColor: "rgba(62, 224, 138, 0.18)",
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.25,
        fill: chartType === "area",
      },
      {
        type: "line",
        label: "SMA (short)",
        data: ticks.map((t) => t.sma_short),
        borderColor: "#e0a53e",
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [4, 4],
        tension: 0.25,
      },
      {
        type: "line",
        label: "SMA (long)",
        data: ticks.map((t) => t.sma_long),
        borderColor: "#e05a5a",
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [4, 4],
        tension: 0.25,
      },
    ],
  };

  const financialData = {
    datasets: [
      {
        type: chartType, // "candlestick" or "ohlc"
        label: `${pair} OHLC`,
        data: candles,
        color: { up: "#3ee08a", down: "#e05a5a", unchanged: "#8592a3" },
        borderColor: "#8592a3",
      },
      {
        type: "line",
        label: "SMA (short)",
        data: candles.map((c) => ({ x: c.x, y: c.smaShort })),
        borderColor: "#e0a53e",
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [4, 4],
      },
      {
        type: "line",
        label: "SMA (long)",
        data: candles.map((c) => ({ x: c.x, y: c.smaLong })),
        borderColor: "#e05a5a",
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [4, 4],
      },
    ],
  };

  const options = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { labels: { color: "#c7d0da" } },
    },
    scales: {
      x: isFinancial
        ? {
            type: "linear",
            ticks: {
              color: "#8592a3",
              maxTicksLimit: 8,
              callback: (value) => candles[value]?.tick ?? "",
            },
            grid: { color: "rgba(255,255,255,0.05)" },
          }
        : {
            ticks: { color: "#8592a3", maxTicksLimit: 8 },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
      y: {
        ticks: { color: "#8592a3" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  return (
    <div className="market-chart">
      <div className="market-chart__toolbar">
        <label htmlFor="chart-type-select">Chart type</label>
        <select
          id="chart-type-select"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
        >
          {CHART_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <Chart
        type={isFinancial ? chartType : "line"}
        data={isFinancial ? financialData : lineData}
        options={options}
      />
    </div>
  );
}