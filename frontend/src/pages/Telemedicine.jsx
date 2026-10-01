import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select } from "../components/ui";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-pasture-100 text-pasture-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-alertred",
};

export default function Telemedicine() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [appointments, setAppointments] = useState([]);
  const [vets, setVets] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vetId: "", animalId: "", reason: "", scheduledTime: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    client.get("/appointments").then((res) => setAppointments(res.data.appointments)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (user.role === "farmer") {
      client.get("/appointments/vets").then((res) => setVets(res.data.vets));
      client.get("/animals").then((res) => setAnimals(res.data.animals));
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => load();
    const onStatus = () => load();
    socket.on("appointment:new", onNew);
    socket.on("appointment:status", onStatus);
    return () => {
      socket.off("appointment:new", onNew);
      socket.off("appointment:status", onStatus);
    };
  }, [socket]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/appointments", form);
      setShowForm(false);
      setForm({ vetId: "", animalId: "", reason: "", scheduledTime: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    await client.post(`/appointments/${id}/status`, { status });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Telemedicine"
        subtitle="Book and manage remote veterinary consultations."
        action={
          user.role === "farmer" && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <Video size={16} /> Book consultation
            </Button>
          )
        }
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ErrorBanner message={error} />
            <Select label="Veterinarian" value={form.vetId} onChange={(e) => setForm({ ...form, vetId: e.target.value })} required>
              <option value="">Select a vet</option>
              {vets.map((v) => (
                <option key={v.id} value={v.id}>Dr. {v.name}{v.specialty ? ` — ${v.specialty}` : ""}</option>
              ))}
            </Select>
            <Select label="Animal (optional)" value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}>
              <option value="">General consultation</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.species})</option>
              ))}
            </Select>
            <Input
              label="Preferred date & time"
              type="datetime-local"
              value={form.scheduledTime}
              onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
              required
            />
            <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Reduced appetite for 2 days" />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit">Request appointment</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {!loading && appointments.length === 0 ? (
        <EmptyState title="No appointments yet" subtitle="Booked consultations will appear here." />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">
                  {user.role === "farmer" ? `Dr. ${a.vet_name}` : a.farmer_name}
                  {a.animal_name ? ` · ${a.animal_name}` : ""}
                </p>
                <p className="text-sm text-gray-500">{a.reason || "General consultation"}</p>
                <p className="mt-1 font-mono text-xs text-gray-400">
                  {new Date(a.scheduled_time).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[a.status]}`}>
                  {a.status}
                </span>
                {user.role === "vet" && a.status === "pending" && (
                  <Button variant="secondary" onClick={() => updateStatus(a.id, "confirmed")}>Confirm</Button>
                )}
                {a.status !== "cancelled" && a.status !== "completed" && (
                  <Link to={`/telemedicine/${a.id}`}>
                    <Button>Open room</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
