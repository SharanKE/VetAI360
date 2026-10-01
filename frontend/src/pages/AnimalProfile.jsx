import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import SensorChart from "../components/SensorChart";
import { Button, Card, ErrorBanner, Input, PageHeader, Textarea } from "../components/ui";

export default function AnimalProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [animal, setAnimal] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [history, setHistory] = useState([]);
  const [referenceRange, setReferenceRange] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordForm, setRecordForm] = useState({ diagnosis: "", treatment: "", notes: "" });
  const [showVaxForm, setShowVaxForm] = useState(false);
  const [vaxForm, setVaxForm] = useState({ vaccineName: "", dueDate: "" });
  const [error, setError] = useState("");

  function load() {
    Promise.all([
      client.get(`/animals/${id}`),
      client.get(`/sensors/${id}/history?limit=40`),
    ]).then(([a, s]) => {
      setAnimal(a.data.animal);
      setHealthRecords(a.data.healthRecords);
      setVaccinations(a.data.vaccinations);
      setHistory(s.data.history);
      setReferenceRange(s.data.referenceRange);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("animal:subscribe", id);
    const onUpdate = (payload) => {
      if (String(payload.animalId) !== String(id)) return;
      setHistory((h) => [...h.slice(-49), payload.reading]);
    };
    socket.on("sensor:update", onUpdate);
    return () => socket.off("sensor:update", onUpdate);
  }, [socket, id]);

  async function addHealthRecord(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/animals/${id}/health-records`, recordForm);
      setRecordForm({ diagnosis: "", treatment: "", notes: "" });
      setShowRecordForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addVaccination(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/animals/${id}/vaccinations`, vaxForm);
      setVaxForm({ vaccineName: "", dueDate: "" });
      setShowVaxForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markVaccinationDone(vid) {
    await client.post(`/vaccinations/${vid}/complete`);
    load();
  }

  if (loading || !animal) return <p className="text-gray-500">Loading animal profile…</p>;

  return (
    <div>
      <PageHeader
        title={animal.name}
        subtitle={`${animal.species}${animal.breed ? " · " + animal.breed : ""}${animal.tag_id ? " · Tag " + animal.tag_id : ""}`}
      />

      <ErrorBanner message={error} />

      <Card className="mb-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Live vitals</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No sensor data yet — monitoring may be disabled, or the simulator just started.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <SensorChart data={history} dataKey="temperature_c" label="Temperature" unit="°C" color="#c67f22" />
            <SensorChart data={history} dataKey="heart_rate_bpm" label="Heart rate" unit="bpm" color="#b3452f" />
            <SensorChart data={history} dataKey="activity_level" label="Activity" unit="/100" color="#2f7d57" />
          </div>
        )}
        {referenceRange && (
          <p className="mt-4 font-mono text-xs text-gray-400">
            Normal range for {animal.species}: {referenceRange.temp[0]}–{referenceRange.temp[1]}°C · {referenceRange.hr[0]}–{referenceRange.hr[1]} bpm
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Health records</h2>
            {(user.role === "vet" || user.role === "farmer") && (
              <Button variant="secondary" onClick={() => setShowRecordForm((s) => !s)}>
                <Plus size={14} /> Add
              </Button>
            )}
          </div>

          {showRecordForm && (
            <form onSubmit={addHealthRecord} className="mb-4 space-y-3 rounded-lg border border-gray-100 p-4">
              <Input label="Diagnosis" value={recordForm.diagnosis} onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })} required />
              <Input label="Treatment" value={recordForm.treatment} onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })} />
              <Textarea label="Notes" rows={3} value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} />
              <Button type="submit">Save record</Button>
            </form>
          )}

          {healthRecords.length === 0 ? (
            <p className="text-sm text-gray-500">No health records yet.</p>
          ) : (
            <ul className="space-y-3">
              {healthRecords.map((r) => (
                <li key={r.id} className="rounded-lg border border-gray-100 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{r.diagnosis}</p>
                    <span className="font-mono text-[11px] text-gray-400">{r.record_date.slice(0, 10)}</span>
                  </div>
                  {r.treatment && <p className="mt-1 text-sm text-gray-500">Treatment: {r.treatment}</p>}
                  {r.notes && <p className="mt-1 text-xs text-gray-400">{r.notes}</p>}
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                    {r.source === "manual" ? (r.vet_name ? `Dr. ${r.vet_name}` : "Manual entry") : r.source.replace("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Vaccinations</h2>
            <Button variant="secondary" onClick={() => setShowVaxForm((s) => !s)}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {showVaxForm && (
            <form onSubmit={addVaccination} className="mb-4 space-y-3 rounded-lg border border-gray-100 p-4">
              <Input label="Vaccine name" value={vaxForm.vaccineName} onChange={(e) => setVaxForm({ ...vaxForm, vaccineName: e.target.value })} required />
              <Input label="Due date" type="date" value={vaxForm.dueDate} onChange={(e) => setVaxForm({ ...vaxForm, dueDate: e.target.value })} required />
              <Button type="submit">Save schedule</Button>
            </form>
          )}

          {vaccinations.length === 0 ? (
            <p className="text-sm text-gray-500">No vaccinations scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {vaccinations.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{v.vaccine_name}</p>
                    <p className="font-mono text-xs text-gray-400">Due {v.due_date.slice(0, 10)}</p>
                  </div>
                  {v.completed ? (
                    <span className="text-xs font-semibold text-pasture-600">Completed</span>
                  ) : (
                    <Button variant="secondary" onClick={() => markVaccinationDone(v.id)}>
                      Mark done
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
