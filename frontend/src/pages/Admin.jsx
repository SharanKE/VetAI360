import { useEffect, useState } from "react";
import client from "../api/client";
import { Button, Card, PageHeader } from "../components/ui";

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [vets, setVets] = useState([]);

  function load() {
    client.get("/admin/overview").then((res) => setOverview(res.data));
    client.get("/admin/vets").then((res) => setVets(res.data.vets));
  }

  useEffect(load, []);

  async function verify(id) {
    await client.post(`/admin/vets/${id}/verify`);
    load();
  }

  async function revoke(id) {
    await client.post(`/admin/vets/${id}/revoke`);
    load();
  }

  return (
    <div>
      <PageHeader title="Admin" subtitle="Platform oversight and veterinarian verification." />

      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Users", overview.totalUsers],
            ["Farmers", overview.totalFarmers],
            ["Vets", overview.totalVets],
            ["Pending vets", overview.pendingVets],
            ["Animals", overview.totalAnimals],
            ["Open alerts", overview.unresolvedAlerts],
          ].map(([label, value]) => (
            <Card key={label} className="text-center">
              <p className="font-display text-2xl font-semibold text-ink">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Veterinarians</h2>
        <ul className="space-y-3">
          {vets.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Dr. {v.name}</p>
                <p className="text-xs text-gray-500">{v.email}{v.specialty ? ` · ${v.specialty}` : ""}</p>
              </div>
              {v.verified ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-pasture-600">Verified</span>
                  <Button variant="ghost" onClick={() => revoke(v.id)}>Revoke</Button>
                </div>
              ) : (
                <Button onClick={() => verify(v.id)}>Verify</Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
