import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { fetchMarketTicks } from "../api/marketClient";

function useCurrentDate() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    // Recompute once a minute, not every render — a clock only needs to
    // be accurate to the minute here, and this keeps it cheap.
    const interval = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return date;
}

function useLivePrice(pair = "BTC-USD") {
  const [price, setPrice] = useState(null);
  const [direction, setDirection] = useState(null); // "up" | "down" | null
  const prevPriceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchMarketTicks(pair, 1);
        const latest = data.ticks?.[data.ticks.length - 1]?.price;
        if (cancelled || latest === undefined) return;

        if (prevPriceRef.current !== null) {
          setDirection(latest > prevPriceRef.current ? "up" : latest < prevPriceRef.current ? "down" : null);
        }
        prevPriceRef.current = latest;
        setPrice(latest);
      } catch {
        // Ticker is a nice-to-have; fail silently rather than disrupt navigation.
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pair]);

  return { price, direction };
}

export default function NavBar() {
  const { isAuthenticated, email, logout } = useAuthStore();
  const { price, direction } = useLivePrice("BTC-USD");
  const date = useCurrentDate();

  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <nav className="navbar">
      <span className="brand">OpenEx 3.0</span>

      {isAuthenticated && <span className="nav-date">{formattedDate}</span>}

      {isAuthenticated && price !== null && (
        <span className={`nav-ticker nav-ticker--${direction ?? "flat"}`}>
          <span className="nav-ticker__pair">BTC-USD</span>
          <span className="nav-ticker__price">
            ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
      )}

      <div className="nav-links">
        {isAuthenticated && (
          <>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
            <NavLink to="/trading" className={({ isActive }) => (isActive ? "active" : "")}>Trading</NavLink>
          </>
        )}
        {!isAuthenticated && (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>Login</NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>Register</NavLink>
          </>
        )}
        {isAuthenticated && (
          <span className="nav-user" title={email ?? "Signed in"}>
            <svg className="nav-user__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="currentColor" />
              <path
                d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="nav-user__email">{email ?? "Account"}</span>
          </span>
        )}
        {isAuthenticated && (
          <button className="nav-logout" onClick={logout}>Log out</button>
        )}
      </div>
    </nav>
  );
}