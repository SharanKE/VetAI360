import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PawPrint,
  Activity,
  MapPin,
  Stethoscope,
  Mic,
  Camera,
  Syringe,
  Bell,
  Video,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import client from "../api/client";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["farmer", "vet", "admin"], end: true },
  { to: "/livestock", label: "Livestock", icon: PawPrint, roles: ["farmer", "vet", "admin"] },
  { to: "/monitoring", label: "IoT Monitoring", icon: Activity, roles: ["farmer", "vet", "admin"] },
  { to: "/pasture-map", label: "GPS Pasture Map", icon: MapPin, roles: ["farmer", "vet", "admin"] },
  { to: "/voice-assistant", label: "AI Voice Assistant", icon: Mic, roles: ["farmer", "vet"] },
  { to: "/symptom-checker", label: "Symptom Checker", icon: Stethoscope, roles: ["farmer", "vet"] },
  { to: "/image-diagnosis", label: "Image Diagnosis", icon: Camera, roles: ["farmer", "vet"] },
  { to: "/vaccinations", label: "Vaccinations", icon: Syringe, roles: ["farmer", "vet", "admin"] },
  { to: "/telemedicine", label: "Telemedicine", icon: Video, roles: ["farmer", "vet"] },
  { to: "/alerts", label: "Alerts", icon: Bell, roles: ["farmer", "vet", "admin"] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [unresolvedAlerts, setUnresolvedAlerts] = useState(0);

  useEffect(() => {
    client.get("/alerts").then((res) => {
      setUnresolvedAlerts(res.data.alerts.filter((a) => !a.resolved).length);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onAlert = () => setUnresolvedAlerts((n) => n + 1);
    socket.on("alert:new", onAlert);
    return () => socket.off("alert:new", onAlert);
  }, [socket]);

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-white">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-pasture-100 bg-pasture-900">
        <div className="px-6 py-7">
          <p className="font-display text-xl font-semibold tracking-tight text-white">
            VetAI <span className="text-amber-300">360</span>
          </p>
          <p className="mt-1 text-xs text-pasture-300">Smart Veterinary Healthcare</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-pasture-700 text-white"
                    : "text-pasture-200 hover:bg-pasture-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
              {label === "Alerts" && unresolvedAlerts > 0 && (
                <span className="ml-auto rounded-full bg-alertred px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unresolvedAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-pasture-800 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 font-display text-sm font-semibold text-pasture-900">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs capitalize text-pasture-300">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-pasture-200 hover:bg-pasture-800 hover:text-white"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
