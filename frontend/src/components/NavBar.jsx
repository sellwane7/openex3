import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { fetchMarketTicks } from "../api/marketClient";

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
  const { isAuthenticated, logout } = useAuthStore();
  const { price, direction } = useLivePrice("BTC-USD");

  return (
    <nav className="navbar">
      <span className="brand">OpenEx 3.0</span>

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
          <button className="nav-logout" onClick={logout}>Log out</button>
        )}
      </div>
    </nav>
  );
}