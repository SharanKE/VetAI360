import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function formatTime(iso) {
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SensorChart({ data, dataKey, label, unit, color = "#2f7d57", referenceRange }) {
  const chartData = data.map((d) => ({
    time: formatTime(d.recorded_at),
    value: d[dataKey],
  }));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {chartData.length > 0 && (
          <p className="font-mono text-lg font-semibold" style={{ color }}>
            {chartData[chartData.length - 1].value}
            <span className="ml-1 text-xs font-normal text-gray-400">{unit}</span>
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef5f0" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8ca396" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#8ca396" }} axisLine={false} tickLine={false} domain={referenceRange ? "auto" : undefined} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#d3e6da" }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
