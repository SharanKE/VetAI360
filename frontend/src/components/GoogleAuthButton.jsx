import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { X, ArrowRight, Check } from "lucide-react";

// Official Google Multi-Color G Logo SVG
export function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function GoogleAuthButton({
  role = "farmer",
  mode = "signin", // "signin" | "signup"
  onError,
}) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [loading, setLoading] = useState(false);

  // Common quick Google accounts for one-tap simulation or custom email entry
  const suggestedAccounts = [
    {
      name: "Google User",
      email: "farmer.google@gmail.com",
      avatar: "🌾",
      subtitle: "Personal Google Account",
    },
    {
      name: "Dr. Vet Google",
      email: "vet.clinic@gmail.com",
      avatar: "🩺",
      subtitle: "Professional Google Workspace",
    },
  ];

  async function handleGoogleLogin(emailToUse, nameToUse) {
    setLoading(true);
    try {
      await loginWithGoogle({
        email: emailToUse,
        name: nameToUse || emailToUse.split("@")[0],
        role: role || "farmer",
      });
      setShowModal(false);
      navigate("/");
    } catch (err) {
      if (onError) {
        onError(err.message || "Google authentication failed.");
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    if (!googleEmail.trim()) return;
    handleGoogleLogin(googleEmail.trim(), googleName.trim());
  }

  return (
    <>
      {/* ======================================================== */}
      {/* GOOGLE SIGN IN BUTTON (Clean, Official Styling)          */}
      {/* ======================================================== */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50/80 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
      >
        <GoogleIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
        <span>
          {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
        </span>
      </button>

      {/* ======================================================== */}
      {/* GOOGLE ACCOUNT SELECTION MODAL                           */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl transition-all">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-3.5 top-3.5 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X size={16} />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-5">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-200">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-gray-900">
                Sign in with Google
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Choose an account to continue to <span className="font-semibold text-gray-700">VetAI 360</span>
              </p>
            </div>

            {/* Quick Suggested Accounts */}
            <div className="space-y-2 mb-4">
              {suggestedAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleLogin(acc.email, acc.name)}
                  disabled={loading}
                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-pasture-400 hover:bg-pasture-50/20 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg group-hover:scale-105 transition-transform">
                    {acc.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{acc.email}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-gray-400 group-hover:text-pasture-700 group-hover:translate-x-1 transition-all"
                  />
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-gray-200" />
              <span className="absolute bg-white px-2 text-[10px] uppercase font-bold text-gray-400">
                Or enter Google email
              </span>
            </div>

            {/* Custom Google Email Entry */}
            <form onSubmit={handleCustomSubmit} className="space-y-2.5">
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pasture-500 focus:ring-2 focus:ring-pasture-100"
              />
              <button
                type="submit"
                disabled={loading || !googleEmail.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-pasture-700 hover:bg-pasture-800 py-2 text-xs font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-[10px] text-gray-400 leading-tight">
              To continue, Google will share your name and email address with VetAI 360.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
