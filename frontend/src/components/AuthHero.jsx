const FEATURES = [
  "Real double-entry ledger, not simple math",
  "Live order book over WebSockets",
  "AI trading assistant powered by a local LLM",
  "Safe to experiment — no real money, ever",
];

// Hand-authored candlestick series — an original chart visual, not a photo.
// Loosely trending up, left to right, so the panel reads as "the market is alive."
const CANDLES = [
  { x: 20, open: 300, close: 285, high: 310, low: 278 },
  { x: 44, open: 285, close: 296, high: 300, low: 276 },
  { x: 68, open: 296, close: 270, high: 300, low: 264 },
  { x: 92, open: 270, close: 282, high: 288, low: 262 },
  { x: 116, open: 282, close: 260, high: 284, low: 254 },
  { x: 140, open: 260, close: 268, high: 274, low: 250 },
  { x: 164, open: 268, close: 244, high: 270, low: 238 },
  { x: 188, open: 244, close: 252, high: 258, low: 234 },
  { x: 212, open: 252, close: 226, high: 254, low: 218 },
  { x: 236, open: 226, close: 236, high: 242, low: 214 },
  { x: 260, open: 236, close: 208, high: 238, low: 200 },
  { x: 284, open: 208, close: 218, high: 224, low: 198 },
  { x: 308, open: 218, close: 190, high: 220, low: 182 },
  { x: 332, open: 190, close: 202, high: 208, low: 178 },
  { x: 356, open: 202, close: 172, high: 204, low: 164 },
  { x: 380, open: 172, close: 184, high: 190, low: 160 },
  { x: 404, open: 184, close: 156, high: 186, low: 148 },
  { x: 428, open: 156, close: 168, high: 174, low: 144 },
  { x: 452, open: 168, close: 138, high: 170, low: 130 },
  { x: 476, open: 138, close: 150, high: 156, low: 126 },
  { x: 500, open: 150, close: 118, high: 152, low: 110 },
  { x: 524, open: 118, close: 130, high: 136, low: 106 },
  { x: 548, open: 130, close: 100, high: 132, low: 92 },
];

const CANDLE_WIDTH = 12;

export default function AuthHero() {
  return (
    <div className="auth-hero">
      <svg
        className="auth-hero__chart"
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="authHeroGlow" cx="82%" cy="12%" r="60%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="600" height="420" fill="var(--bg)" />
        <rect x="0" y="0" width="600" height="420" fill="url(#authHeroGlow)" />

        {[70, 140, 210, 280, 350].map((y) => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--panel-border)" strokeWidth="1" />
        ))}

        {CANDLES.map((c) => {
          const up = c.close < c.open; // lower value = higher price on screen (y grows down)
          const color = up ? "var(--accent)" : "var(--danger)";
          const bodyTop = Math.min(c.open, c.close);
          const bodyHeight = Math.max(Math.abs(c.close - c.open), 2);
          return (
            <g key={c.x} opacity="0.55">
              <line x1={c.x + CANDLE_WIDTH / 2} y1={c.high} x2={c.x + CANDLE_WIDTH / 2} y2={c.low} stroke={color} strokeWidth="1.5" />
              <rect x={c.x} y={bodyTop} width={CANDLE_WIDTH} height={bodyHeight} fill={color} rx="1" />
            </g>
          );
        })}

        <circle className="auth-hero__pulse" cx="554" cy="100" r="4" fill="var(--accent)" />
      </svg>

      <div className="auth-hero__content">
        <span className="auth-hero__eyebrow">OpenEx 3.0</span>
        <h1 className="auth-hero__title">A simulated crypto exchange, built to feel real.</h1>
        <p className="auth-hero__lede">
          Every order routes through a real matching engine and a live order book.
          The built-in assistant can check your balance or an order for you.
          Funds are simulated, so nothing here is real money.
        </p>
        <ul className="auth-hero__features">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
