import React from "react";
import { apiFetch } from "../api/client";

export function Dashboard() {
  const [rates, setRates] = React.useState<any[]>([]);
  const [me, setMe] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      const m = await apiFetch("/auth/me");
      setMe(m);
      const r = await apiFetch("/rates/current");
      setRates(r);
    })().catch(console.error);
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="text-sm text-gray-600">{me ? `${me.username} (${me.role})` : "..."}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-2xl p-4 bg-black text-white">New BUY</button>
        <button className="rounded-2xl p-4 bg-black text-white">New SELL</button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="font-semibold mb-3">Current Rates</div>
        <div className="space-y-2">
          {rates.map(r => (
            <div key={r.id} className="flex justify-between text-sm">
              <div className="font-medium">{r.currencyCode}</div>
              <div className="text-gray-700">Buy {Number(r.buyRate).toFixed(2)} / Sell {Number(r.sellRate).toFixed(2)}</div>
            </div>
          ))}
          {rates.length === 0 && <div className="text-sm text-gray-500">No rates yet</div>}
        </div>
      </div>
    </div>
  );
}
