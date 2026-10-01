import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Thermometer, HeartPulse, Activity } from "lucide-react";
import client from "../api/client";
import { useSocket } from "../context/SocketContext";
import { Card, EmptyState, PageHeader } from "../components/ui";

export default function Monitoring() {
  const { socket } = useSocket();
  const [animals, setAnimals] = useState([]);
  const [latest, setLatest] = useState({}); // animalId -> reading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/animals").then(async (res) => {
      const list = res.data.animals.filter((a) => a.monitoring_enabled);
      setAnimals(list);
      const readings = await Promise.all(
        list.map((a) =>
          client.get(`/sensors/${a.id}/history?limit=1`).then((r) => [a.id, r.data.history[0]])
        )
      );
      setLatest(Object.fromEntries(readings.filter(([, r]) => r)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!socket || animals.length === 0) return;
    animals.forEach((a) => socket.emit("animal:subscribe", a.id));
    const onUpdate = ({ animalId, reading }) => {
      setLatest((prev) => ({ ...prev, [animalId]: reading }));
    };
    socket.on("sensor:update", onUpdate);
    return () => socket.off("sensor:update", onUpdate);
  }, [socket, animals]);

  return (
    <div>
      <PageHeader
        title="IoT Monitoring"
        subtitle="Live temperature, heart rate, and activity from each animal's smart collar."
      />

      {!loading && animals.length === 0 ? (
        <EmptyState title="No monitored animals" subtitle="Enable monitoring on an animal's profile to see live vitals here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((animal) => {
            const r = latest[animal.id];
            return (
              <Link key={animal.id} to={`/livestock/${animal.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-display font-semibold text-ink">{animal.name}</p>
                    <span className="flex items-center gap-1.5 text-xs text-pasture-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pasture-500" /> Live
                    </span>
                  </div>
                  {r ? (
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <Vital icon={Thermometer} value={`${r.temperature_c}°`} color="text-amber-600" />
                      <Vital icon={HeartPulse} value={`${r.heart_rate_bpm}`} color="text-alertred" />
                      <Vital icon={Activity} value={`${r.activity_level}`} color="text-pasture-600" />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Waiting for first reading…</p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Vital({ icon: Icon, value, color }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-50 py-2.5">
      <Icon size={14} className={color} />
      <span className={`mt-1 text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
