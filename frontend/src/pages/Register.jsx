import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner } from "../components/ui";
import AuthShell from "../components/AuthShell";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "farmer",
    phone: "",
    specialty: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(form);
      if (data.notice) {
        setNotice(data.notice);
        setLoading(false);
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please check your details.");
      setLoading(false);
    }
  }

  if (notice) {
    return (
      <AuthShell title="Account Created" subtitle="One step remaining before sign-in.">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-sm animate-fade-in">
          {notice}
        </div>
        <div className="mt-5 text-center">
          <Link
            to="/login"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-pasture-700 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-pasture-800 hover:shadow-md"
          >
            <span>Go to Sign In</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Register as a livestock farmer or practicing veterinarian."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <ErrorBanner message={error} />

        {/* Role Selector Tabs with Hover Animations */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">
            I am registering as:
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100/80 p-1">
            <button
              type="button"
              onClick={() => update("role", "farmer")}
              className={`group flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                form.role === "farmer"
                  ? "bg-white text-pasture-800 shadow-sm scale-[1.01]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <span className="transition-transform duration-200 group-hover:scale-125">🌾</span>
              <span>Livestock Farmer</span>
            </button>
            <button
              type="button"
              onClick={() => update("role", "vet")}
              className={`group flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                form.role === "vet"
                  ? "bg-white text-blue-800 shadow-sm scale-[1.01]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <span className="transition-transform duration-200 group-hover:scale-125">🩺</span>
              <span>Veterinarian</span>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div className="group">
          <label className="mb-1 block text-xs font-semibold text-gray-700 transition-colors group-hover:text-pasture-700">
            Full Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={form.role === "vet" ? "Dr. Ramesh Gowda" : "Sharan Kumar"}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm focus:border-pasture-500 focus:bg-white focus:ring-4 focus:ring-pasture-100"
          />
        </div>

        {/* Email */}
        <div className="group">
          <label className="mb-1 block text-xs font-semibold text-gray-700 transition-colors group-hover:text-pasture-700">
            Email Address
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="farmer@example.com"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm focus:border-pasture-500 focus:bg-white focus:ring-4 focus:ring-pasture-100"
          />
        </div>

        {/* Phone */}
        <div className="group">
          <label className="mb-1 block text-xs font-semibold text-gray-700 transition-colors group-hover:text-pasture-700">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm focus:border-pasture-500 focus:bg-white focus:ring-4 focus:ring-pasture-100"
          />
        </div>

        {/* Specialty (for Vet only) */}
        {form.role === "vet" && (
          <div className="group animate-fade-in">
            <label className="mb-1 block text-xs font-semibold text-blue-800 transition-colors group-hover:text-blue-900">
              Veterinary Specialty
            </label>
            <input
              type="text"
              value={form.specialty}
              onChange={(e) => update("specialty", e.target.value)}
              placeholder="e.g. Large Animal Medicine & Cattle Surgery"
              required
              className="w-full rounded-xl border border-blue-200 bg-blue-50/30 px-3.5 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-blue-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        )}

        {/* Password */}
        <div className="group">
          <label className="mb-1 block text-xs font-semibold text-gray-700 transition-colors group-hover:text-pasture-700">
            Password (min 6 characters)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 pr-10 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm focus:border-pasture-500 focus:bg-white focus:ring-4 focus:ring-pasture-100"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-pasture-700 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-pasture-800 hover:shadow-lg hover:shadow-pasture-900/15 active:translate-y-0 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </>
          )}
        </button>
      </form>

      {/* OR Divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="w-full border-t border-gray-100" />
        <span className="absolute bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          or continue with
        </span>
      </div>

      {/* Google Sign Up Button */}
      <GoogleAuthButton
        mode="signup"
        role={form.role}
        onError={(err) => setError(err)}
      />

      {/* Switch to Login */}
      <p className="mt-5 text-center text-xs text-gray-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="inline-flex items-center gap-0.5 font-semibold text-pasture-700 transition-all duration-150 hover:text-pasture-900 hover:translate-x-0.5"
        >
          <span>Sign in</span>
          <ArrowRight size={12} />
        </Link>
      </p>
    </AuthShell>
  );
}
