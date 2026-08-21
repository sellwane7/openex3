import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Trading from "./pages/Trading.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="app-shell">
      <NavBar />
      {/* key={path} isn't needed here since each Route already mounts its
          own element, but wrapping each route individually (rather than
          once around <Routes>) means a crash on /trading doesn't also
          take down navigation to /  — only that page's content goes
          blank, and the reset button lets you retry without a full reload. */}
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary><Dashboard /></ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trading"
          element={
            <ProtectedRoute>
              <ErrorBoundary><Trading /></ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      {isAuthenticated && <ChatWidget />}
    </div>
  );
}