import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fetchMarketTicks } from "../api/marketClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const POLL_INTERVAL_MS = 5000;

export default function MarketChart({ pair = "BTC-USD" }) {
  const [ticks, setTicks] = useState([]);
  const [error, setError] = useState(null);
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

  const labels = ticks.map((t) => t.tick);

  const chartData = {
    labels,
    datasets: [
      {
        label: `${pair} price`,
        data: ticks.map((t) => t.price),
        borderColor: "#3ee08a",
        backgroundColor: "rgba(62, 224, 138, 0.1)",
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.25,
      },
      {
        label: "SMA (short)",
        data: ticks.map((t) => t.sma_short),
        borderColor: "#e0a53e",
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [4, 4],
        tension: 0.25,
      },
      {
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

  const options = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { labels: { color: "#c7d0da" } },
    },
    scales: {
      x: {
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
      <Line data={chartData} options={options} />
    </div>
  );
}