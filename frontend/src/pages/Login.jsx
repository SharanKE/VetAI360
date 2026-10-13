import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner } from "../components/ui";
import AuthShell from "../components/AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.message || "Failed to sign in. Please check your credentials.");
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
      title="Sign In"
      subtitle="Enter your email and password to access your dashboard."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        {/* Email with Hover & Focus Animation */}
        <div className="group">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 transition-colors group-hover:text-pasture-700">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="farmer@vetai360.dev"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm focus:border-pasture-600 focus:bg-white focus:ring-4 focus:ring-pasture-100"
          />
        </div>

        {/* Password with Hover & Eye Animation */}
        <div className="group">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 transition-colors group-hover:text-pasture-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm focus:border-pasture-600 focus:bg-white focus:ring-4 focus:ring-pasture-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-all duration-200 hover:scale-125 hover:text-pasture-700 active:scale-95"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button with Hover Lift and Arrow Slide */}
        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-pasture-700 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-pasture-800 hover:shadow-lg hover:shadow-pasture-900/15 active:translate-y-0 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </>
          )}
        </button>
      </form>

      {/* Interactive Quick Demo Pills with Bounce & Hover Effects */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Quick Demo Sign-In
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("farmer@vetai360.dev", "farmer123")}
            disabled={loading}
            className="group rounded-lg border border-pasture-200 bg-pasture-50/70 px-2 py-1.5 text-center text-xs font-medium text-pasture-800 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-pasture-100 hover:shadow-md hover:border-pasture-400 active:scale-95"
          >
            <span className="inline-block transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-12 mr-1">
              🌾
            </span>
            Farmer
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("vet@vetai360.dev", "vet123")}
            disabled={loading}
            className="group rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1.5 text-center text-xs font-medium text-blue-800 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-blue-100 hover:shadow-md hover:border-blue-400 active:scale-95"
          >
            <span className="inline-block transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12 mr-1">
              🩺
            </span>
            Vet
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("admin@vetai360.dev", "admin123")}
            disabled={loading}
            className="group rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-1.5 text-center text-xs font-medium text-purple-800 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-purple-100 hover:shadow-md hover:border-purple-400 active:scale-95"
          >
            <span className="inline-block transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6 mr-1">
              🛡️
            </span>
            Admin
          </button>
        </div>
      </div>

      {/* Switch to Register with Slide Hover Effect */}
      <p className="mt-5 text-center text-xs text-gray-500">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="inline-flex items-center gap-0.5 font-semibold text-pasture-700 transition-all duration-150 hover:text-pasture-900 hover:translate-x-0.5"
        >
          <span>Create one here</span>
          <ArrowRight size={12} />
        </Link>
      </p>
    </AuthShell>
  );
}
