import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, ErrorBanner, Input } from "../components/ui";
import AuthShell from "../components/AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to sign in. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickLogin(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
    setLoading(true);
    login(demoEmail, demoPassword)
      .then(() => navigate("/"))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to monitor your livestock, get AI health screens, and reach a vet."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="farmer@vetai360.dev"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Quick Demo Logins for Live Presentations */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
          1-Click Quick Demo Sign In
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("farmer@vetai360.dev", "farmer123")}
            disabled={loading}
            className="rounded-lg border border-pasture-200 bg-pasture-50/70 px-2 py-1.5 text-center text-xs font-medium text-pasture-800 transition hover:bg-pasture-100"
          >
            🌾 Farmer
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("vet@vetai360.dev", "vet123")}
            disabled={loading}
            className="rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1.5 text-center text-xs font-medium text-blue-800 transition hover:bg-blue-100"
          >
            🩺 Vet
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("admin@vetai360.dev", "admin123")}
            disabled={loading}
            className="rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-1.5 text-center text-xs font-medium text-purple-800 transition hover:bg-purple-100"
          >
            🛡️ Admin
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-pasture-700 hover:underline">
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
