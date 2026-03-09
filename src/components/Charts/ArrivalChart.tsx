// Patient Arrival Rate — Area Chart with surge peaks
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceArea
} from 'recharts';
import type { HourlyStats } from '../../simulation/types';

interface ArrivalChartProps {
  hourlyStats: HourlyStats[];
}

export default function ArrivalChart({ hourlyStats }: ArrivalChartProps) {
  const surgeHours = hourlyStats.filter(h => h.isSurge).map(h => h.hour);

  return (
    <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
      <h3 className="text-sm font-semibold text-white mb-1">Patient Arrival Rate</h3>
      <p className="text-[10px] text-slate-500 mb-3">Arrivals per hour (Poisson distributed, surge peaks highlighted)</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={hourlyStats}>
          <defs>
            <linearGradient id="arrivalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            label={{ value: 'Patients', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
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
                  <p className="text-xs text-cyan-400">
                    Arrivals: {payload[0]?.value} patients
                  </p>
                  {stat?.isSurge && (
                    <p className="text-[10px] text-red-400 mt-1">
                      🚨 Surge event — arrival rate multiplied by 2.5×
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    Patient arrivals follow a Poisson distribution
                  </p>
                </div>
              );
            }
            return null;
          }} />
          <Legend
            formatter={() => <span className="text-xs text-slate-400">Arrivals / Hour</span>}
          />
          {surgeHours.map(h => (
            <ReferenceArea
              key={h}
              x1={h - 0.4}
              x2={h + 0.4}
              fill="#ff4444"
              fillOpacity={0.1}
              strokeOpacity={0}
            />
          ))}
          <Area
            type="monotone"
            dataKey="arrivals"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#arrivalGradient)"
            dot={{ fill: '#06b6d4', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#06b6d4', stroke: '#0a0f1e', strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
            name="Arrivals"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
