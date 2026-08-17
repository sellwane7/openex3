import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
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
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      {isAuthenticated && <ChatWidget />}
    </div>
  );
}