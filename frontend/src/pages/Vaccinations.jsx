import { useEffect, useState } from "react";
import { Syringe } from "lucide-react";
import client from "../api/client";
import { Button, Card, EmptyState, PageHeader } from "../components/ui";

export default function Vaccinations() {
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    client.get("/vaccinations").then((res) => setVaccinations(res.data.vaccinations)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markDone(id) {
    await client.post(`/vaccinations/${id}/complete`);
    load();
  }

  const pending = vaccinations.filter((v) => !v.completed);
  const completed = vaccinations.filter((v) => v.completed);

  return (
    <div>
      <PageHeader title="Vaccination Scheduler" subtitle="Track upcoming, overdue, and completed vaccinations for every animal." />

      <Card className="mb-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Pending</h2>
        {!loading && pending.length === 0 ? (
          <EmptyState title="Nothing pending" subtitle="Add a vaccination schedule from an animal's profile page." />
        ) : (
          <ul className="space-y-3">
            {pending.map((v) => {
              const overdue = new Date(v.due_date) < new Date();
              return (
                <li key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${overdue ? "bg-red-100" : "bg-pasture-50"}`}>
                      <Syringe size={16} className={overdue ? "text-alertred" : "text-pasture-600"} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{v.vaccine_name}</p>
                      <p className="text-xs text-gray-500">{v.animal_name} · {v.species}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-xs ${overdue ? "font-semibold text-alertred" : "text-gray-400"}`}>
                      {overdue ? "Overdue: " : "Due "}{v.due_date.slice(0, 10)}
                    </p>
                    <Button variant="secondary" className="mt-1.5" onClick={() => markDone(v.id)}>
                      Mark done
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {completed.length > 0 && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Completed</h2>
          <ul className="space-y-2">
            {completed.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 opacity-70">
                <div>
                  <p className="text-sm font-medium text-ink">{v.vaccine_name}</p>
                  <p className="text-xs text-gray-500">{v.animal_name}</p>
                </div>
                <span className="text-xs font-medium text-pasture-600">
                  Completed {v.completed_date?.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
