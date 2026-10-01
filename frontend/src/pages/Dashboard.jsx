import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PawPrint, Bell, Syringe, Stethoscope, Camera, Video } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, PageHeader, SeverityBadge, EmptyState } from "../components/ui";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={20} strokeWidth={2} className="text-white" />
      </div>
      <div>
        <p className="font-display text-2xl font-semibold text-ink">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get("/animals"),
      client.get("/alerts"),
      client.get("/vaccinations/upcoming?days=14"),
    ])
      .then(([a, al, v]) => {
        setAnimals(a.data.animals);
        setAlerts(al.data.alerts);
        setVaccinations(v.data.vaccinations);
      })
      .finally(() => setLoading(false));
  }, []);

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={
          user.role === "farmer"
            ? "Here's what's happening across your livestock today."
            : user.role === "vet"
            ? "Here's what needs your attention today."
            : "Platform-wide snapshot."
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={PawPrint} label="Registered animals" value={loading ? "…" : animals.length} accent="bg-pasture-600" />
        <StatCard icon={Bell} label="Active alerts" value={loading ? "…" : unresolvedAlerts.length} accent="bg-alertred" />
        <StatCard icon={Syringe} label="Vaccinations due (14d)" value={loading ? "…" : vaccinations.length} accent="bg-amber-500" />
        <StatCard icon={Stethoscope} label="Your role" value={<span className="capitalize">{user.role}</span>} accent="bg-pasture-800" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent alerts</h2>
            <Link to="/alerts" className="text-sm font-medium text-pasture-700 hover:underline">
              View all
            </Link>
          </div>
          {unresolvedAlerts.length === 0 ? (
            <EmptyState title="No active alerts" subtitle="Sensor readings and vaccination reminders will show up here." />
          ) : (
            <ul className="space-y-3">
              {unresolvedAlerts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{a.animal_name}</p>
                    <p className="text-sm text-gray-500">{a.message}</p>
                  </div>
                  <SeverityBadge severity={a.severity} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Upcoming vaccinations</h2>
            <Link to="/vaccinations" className="text-sm font-medium text-pasture-700 hover:underline">
              View all
            </Link>
          </div>
          {vaccinations.length === 0 ? (
            <EmptyState title="Nothing due soon" subtitle="Vaccinations due in the next 14 days will appear here." />
          ) : (
            <ul className="space-y-3">
              {vaccinations.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{v.vaccine_name}</p>
                    <p className="text-sm text-gray-500">{v.animal_name}</p>
                  </div>
                  <span className="font-mono text-xs text-gray-500">{v.due_date.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(user.role === "farmer" || user.role === "vet") && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link to="/symptom-checker" className="group">
            <Card className="flex items-center gap-3 transition-shadow group-hover:shadow-md">
              <Stethoscope size={20} className="text-pasture-600" />
              <span className="text-sm font-medium text-ink">Run a symptom check</span>
            </Card>
          </Link>
          <Link to="/image-diagnosis" className="group">
            <Card className="flex items-center gap-3 transition-shadow group-hover:shadow-md">
              <Camera size={20} className="text-pasture-600" />
              <span className="text-sm font-medium text-ink">Diagnose from a photo</span>
            </Card>
          </Link>
          <Link to="/telemedicine" className="group">
            <Card className="flex items-center gap-3 transition-shadow group-hover:shadow-md">
              <Video size={20} className="text-pasture-600" />
              <span className="text-sm font-medium text-ink">Book a vet consultation</span>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
