// Waiting Time Over Simulation Hours — Line Chart with surge highlighting
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, Legend
} from 'recharts';
import type { HourlyStats } from '../../simulation/types';

interface WaitTimeChartProps {
  hourlyStats: HourlyStats[];
}

export default function WaitTimeChart({ hourlyStats }: WaitTimeChartProps) {
  const surgeHours = hourlyStats.filter(h => h.isSurge).map(h => h.hour);



  return (
    <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <h3 className="text-sm font-semibold text-white mb-1">Wait Time Over Time</h3>
      <p className="text-[10px] text-slate-500 mb-3">Average patient wait time per hour (minutes)</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={hourlyStats}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="hour"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            label={{ value: 'Hour', position: 'insideBottomRight', offset: -5, style: { fontSize: 10, fill: '#64748b' } }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
          />
          <Tooltip content={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props: any) => {
            const { active, payload, label } = props;
            if (active && payload && payload.length) {
              const stat = hourlyStats.find(h => h.hour === label);
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-sm font-semibold text-white">Hour {label}</p>
                  <p className="text-xs text-emerald-400">
                    Avg Wait: {payload[0]?.value?.toFixed(1)} min
                  </p>
                  {stat?.isSurge && (
                    <p className="text-[10px] text-red-400 mt-1">⚠️ Surge hour — 2.5× arrival rate</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    Average wait time across all patients arriving this hour
                  </p>
                </div>
              );
            }
            return null;
          }} />
          <Legend
            formatter={() => <span className="text-xs text-slate-400">Avg Wait Time</span>}
          />
          {/* Surge hour shading */}
          {surgeHours.map(h => (
            <ReferenceArea
              key={h}
              x1={h - 0.4}
              x2={h + 0.4}
              fill="#ff4444"
              fillOpacity={0.08}
              strokeOpacity={0}
            />
          ))}
          <Line
            type="monotone"
            dataKey="avgWaitTime"
            stroke="#00ff88"
            strokeWidth={2.5}
            dot={{ fill: '#00ff88', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#00ff88', stroke: '#0a0f1e', strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
            name="Avg Wait Time"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
