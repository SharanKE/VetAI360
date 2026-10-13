import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { X, ExternalLink, ShieldCheck, KeyRound, Check } from "lucide-react";

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

const DEFAULT_CLIENT_ID = "106746031691-qm6nhqcpujag2bfc3aa9cgals5alh34v.apps.googleusercontent.com";

export default function GoogleAuthButton({
  role = "farmer",
  mode = "signin", // "signin" | "signup"
  onError,
}) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  // 1. Check for real Google Client ID from environment or fallback
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem("vetai360_google_client_id") || envClientId;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  // 2. Initialize Real Google Identity Services (GSI)
  useEffect(() => {
    if (!clientId) return;

    function setupGoogleButton() {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          // Initialize official Google Identity Services
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              // response.credential is the real, verified Google ID token from accounts.google.com
              setLoading(true);
              try {
                await loginWithGoogle({
                  credential: response.credential,
                  role: role || "farmer",
                });
                navigate("/");
              } catch (err) {
                if (onError) onError(err.message || "Failed to sign in with Google.");
              } finally {
                setLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button from Google's secure servers
          googleBtnRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: googleBtnRef.current.parentElement?.offsetWidth || 340,
            text: mode === "signup" ? "signup_with" : "continue_with",
            shape: "pill",
            logo_alignment: "left",
          });

          setGsiLoaded(true);
        } catch (err) {
          console.warn("Failed to render Google button:", err);
        }
      }
    }

    if (window.google?.accounts?.id) {
      setupGoogleButton();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          setupGoogleButton();
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [clientId, mode, role]);

  function handleSaveClientId(e) {
    e.preventDefault();
    if (!inputClientId.trim()) return;
    const cleanId = inputClientId.trim();
    localStorage.setItem("vetai360_google_client_id", cleanId);
    setClientId(cleanId);
    setShowConfigModal(false);
  }

  function handleButtonClick() {
    if (!clientId) {
      setShowConfigModal(true);
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  }

  return (
    <div className="w-full">
      {/* -------------------------------------------------------- */}
      {/* REAL OFFICIAL GOOGLE BUTTON CONTAINER                    */}
      {/* -------------------------------------------------------- */}
      <div
        ref={googleBtnRef}
        className={`w-full flex justify-center ${clientId ? "" : "hidden"}`}
      />

      {/* Fallback button if Client ID is not yet entered */}
      {!clientId && (
        <button
          type="button"
          onClick={handleButtonClick}
          className="group relative flex w-full items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50/80 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
        >
          <GoogleIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          <span>
            {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
          </span>
        </button>
      )}

      {/* -------------------------------------------------------- */}
      {/* GOOGLE CLOUD OAUTH CONFIGURATION MODAL                   */}
      {/* -------------------------------------------------------- */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl transition-all">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute right-3.5 top-3.5 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200 shadow-sm">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold text-gray-900">
                Connect Real Google Sign-In
              </h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                To sign in through your <strong>real Google account</strong> (`accounts.google.com`), Google security requires a free OAuth 2.0 Web Client ID.
              </p>
            </div>

            <div className="rounded-xl bg-pasture-50/70 border border-pasture-200 p-3.5 text-xs text-pasture-900 space-y-1.5 mb-4">
              <p className="font-bold flex items-center gap-1.5 text-pasture-800">
                <ShieldCheck size={14} className="text-pasture-600" />
                How to get your free Google Client ID (2 mins):
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-pasture-800/90 leading-tight">
                <li>
                  Open{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline text-pasture-900 inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink size={10} />
                  </a>
                </li>
                <li>Click <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></li>
                <li>Select <strong>Web application</strong></li>
                <li>
                  Add Authorized JavaScript origin:{" "}
                  <code className="bg-pasture-100 px-1 py-0.5 rounded text-[10px] font-mono">
                    {window.location.origin}
                  </code>
                </li>
                <li>Copy the generated <strong>Client ID</strong> and paste below:</li>
              </ol>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Google OAuth 2.0 Client ID:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 font-mono outline-none transition placeholder:text-gray-400 focus:border-pasture-500 focus:ring-2 focus:ring-pasture-100"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="w-1/3 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inputClientId.trim()}
                  className="flex-1 rounded-xl bg-pasture-700 hover:bg-pasture-800 py-2 text-xs font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
                >
                  Activate Real Google Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
