const MARKET_API_BASE = "http://localhost:5000";

export async function fetchMarketTicks(pair = "BTC-USD", ticks = 100) {
  const res = await fetch(
    `${MARKET_API_BASE}/api/market/ticks?pair=${pair}&ticks=${ticks}`
  );
  if (!res.ok) {
    throw new Error(`Market API error: ${res.status}`);
  }
  return res.json();
}

export async function sendChatMessage(message, token) {
  const res = await fetch(`${MARKET_API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status}`);
  }
  return res.json();
}