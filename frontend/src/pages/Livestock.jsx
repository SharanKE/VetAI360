import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, PawPrint } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select } from "../components/ui";

const SPECIES = ["Cattle", "Buffalo", "Goat", "Sheep", "Poultry", "Other"];

export default function Livestock() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", species: "Cattle", breed: "", gender: "Female", ageMonths: "", tagId: "" });

  function load() {
    client.get("/animals").then((res) => setAnimals(res.data.animals)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/animals", { ...form, ageMonths: form.ageMonths ? Number(form.ageMonths) : null });
      setShowForm(false);
      setForm({ name: "", species: "Cattle", breed: "", gender: "Female", ageMonths: "", tagId: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Livestock"
        subtitle="Every registered animal, its records, and its monitoring status."
        action={
          user.role === "farmer" && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <Plus size={16} /> Add animal
            </Button>
          )
        }
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ErrorBanner message={error} />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
              {SPECIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Input label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Female</option>
              <option>Male</option>
            </Select>
            <Input
              label="Age (months)"
              type="number"
              value={form.ageMonths}
              onChange={(e) => setForm({ ...form, ageMonths: e.target.value })}
            />
            <Input label="Tag ID" value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit">Save animal</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!loading && animals.length === 0 ? (
        <EmptyState
          title="No animals registered yet"
          subtitle="Add your first animal to start monitoring its health."
          action={
            user.role === "farmer" && (
              <Button onClick={() => setShowForm(true)}>
                <Plus size={16} /> Add animal
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((animal) => (
            <Link key={animal.id} to={`/livestock/${animal.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-pasture-50">
                  <PawPrint size={20} className="text-pasture-600" />
                </div>
                <p className="font-display text-lg font-semibold text-ink">{animal.name}</p>
                <p className="text-sm text-gray-500">
                  {animal.species}
                  {animal.breed ? ` · ${animal.breed}` : ""}
                </p>
                {animal.tag_id && <p className="mt-2 font-mono text-xs text-gray-400">Tag: {animal.tag_id}</p>}
                {animal.owner_name && <p className="mt-1 text-xs text-gray-400">Owner: {animal.owner_name}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
