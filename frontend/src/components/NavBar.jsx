import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
export default function NavBar() {
  const { isAuthenticated, logout } = useAuthStore();
  return (
    <nav className="navbar">
      <span className="brand">OpenEx 3.0</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
        <NavLink to="/trading" className={({ isActive }) => (isActive ? "active" : "")}>Trading</NavLink>
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
