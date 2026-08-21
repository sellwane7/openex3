import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { fetchMarketTicks } from "../api/marketClient";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip);

const POLL_INTERVAL_MS = 5000;

export default function VolumeChart({ pair = "BTC-USD" }) {
  const [ticks, setTicks] = useState([]);
  const intervalRef = useRef(null);

  async function loadTicks() {
    try {
      const data = await fetchMarketTicks(pair, 100);
      setTicks(data.ticks);
    } catch {
      // Volume is a secondary chart; fail silently rather than disrupt the page.
    }
  }

  useEffect(() => {
    loadTicks();
    intervalRef.current = setInterval(loadTicks, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  if (ticks.length === 0) return null;

  const labels = ticks.map((t) => t.tick);
  const prices = ticks.map((t) => t.price);

  // Color each bar green if price rose vs the previous tick, red if it fell —
  // mirrors how real volume panels tint bars by candle direction.
  const barColors = ticks.map((t, i) => {
    if (i === 0) return "rgba(133, 146, 163, 0.5)";
    return prices[i] >= prices[i - 1]
      ? "rgba(62, 224, 138, 0.55)"
      : "rgba(224, 90, 90, 0.55)";
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "Volume",
        data: ticks.map((t) => t.volume),
        backgroundColor: barColors,
        borderRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: "#8592a3", maxTicksLimit: 8 },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#8592a3" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  return (
    <div className="volume-chart">
      <Bar data={chartData} options={options} />
    </div>
  );
}