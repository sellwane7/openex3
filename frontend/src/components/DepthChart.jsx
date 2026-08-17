import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Filler);

// Turns a list of {price, quantity} levels into a running total, walking
// away from the spread outward — the same math every exchange's depth
// chart uses to show how much size sits between the market price and a
// given level.
function cumulative(levels) {
  let total = 0;
  return levels.map((lvl) => {
    total += Number(lvl.quantity);
    return { x: Number(lvl.price), y: total };
  });
}

export default function DepthChart({ bids, asks }) {
  if (bids.length === 0 && asks.length === 0) {
    return (
      <p className="placeholder-note">
        Not enough resting orders to chart depth yet — place a limit order to see it fill in.
      </p>
    );
  }

  // bids arrive best-first (highest price first); walking outward from the
  // spread means walking toward lower prices, so cumulate in that order,
  // then reverse so the chart still reads low-to-high price, left to right.
  const bidPoints = [...cumulative(bids)].reverse();
  // asks arrive best-first (lowest price first) already in outward order.
  const askPoints = cumulative(asks);

  const data = {
    datasets: [
      {
        label: "Bids",
        data: bidPoints,
        borderColor: "#d69a3f",
        backgroundColor: "rgba(214, 154, 63, 0.18)",
        stepped: "after",
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: "Asks",
        data: askPoints,
        borderColor: "#d1574f",
        backgroundColor: "rgba(209, 87, 79, 0.18)",
        stepped: "before",
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => `$${Number(items[0].parsed.x).toLocaleString()}`,
          label: (item) => `${item.dataset.label}: ${item.parsed.y} BTC resting at or better`,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Price (USD)", color: "#8592a3", font: { size: 11 } },
        ticks: { color: "#8592a3" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        title: { display: true, text: "Cumulative BTC", color: "#8592a3", font: { size: 11 } },
        ticks: { color: "#8592a3" },
        grid: { color: "rgba(255,255,255,0.05)" },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="market-chart depth-chart">
      <Line data={data} options={options} />
    </div>
  );
}
