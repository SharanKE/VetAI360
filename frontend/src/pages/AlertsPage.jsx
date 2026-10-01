import { useEffect, useState } from "react";
import client from "../api/client";
import { useSocket } from "../context/SocketContext";
import { Button, Card, EmptyState, PageHeader, SeverityBadge } from "../components/ui";

export default function AlertsPage() {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    client.get("/alerts").then((res) => setAlerts(res.data.alerts)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!socket) return;
    const onAlert = (alert) => setAlerts((prev) => [alert, ...prev]);
    socket.on("alert:new", onAlert);
    return () => socket.off("alert:new", onAlert);
  }, [socket]);

  async function resolve(id) {
    await client.post(`/alerts/${id}/resolve`);
    load();
  }

  const active = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Automatic alerts from IoT vitals and vaccination reminders." />

      <Card className="mb-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Active ({active.length})</h2>
        {!loading && active.length === 0 ? (
          <EmptyState title="All clear" subtitle="No active alerts right now." />
        ) : (
          <ul className="space-y-3">
            {active.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3">
                <div className="flex items-start gap-3">
                  <SeverityBadge severity={a.severity} />
                  <div>
                    <p className="text-sm font-medium text-ink">{a.animal_name}</p>
                    <p className="text-sm text-gray-600">{a.message}</p>
                    <p className="mt-1 font-mono text-[11px] text-gray-400">{a.created_at}</p>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => resolve(a.id)}>
                  Resolve
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {resolved.length > 0 && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Resolved</h2>
          <ul className="space-y-2">
            {resolved.slice(0, 20).map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 opacity-60">
                <p className="text-sm text-gray-600">{a.animal_name}: {a.message}</p>
                <SeverityBadge severity={a.severity} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
