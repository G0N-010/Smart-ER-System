// Resource Utilization — Grouped Bar Chart
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import type { ResourceUtilization } from '../../simulation/types';

interface ResourceChartProps {
  utilization: ResourceUtilization;
}

export default function ResourceChart({ utilization }: ResourceChartProps) {
  const data = [
    {
      name: 'Doctors',
      Used: utilization.doctorsUsed,
      Available: utilization.doctorsAvailable,
      utilPercent: Math.round((utilization.doctorsUsed / utilization.doctorsAvailable) * 100),
    },
    {
      name: 'ICU Beds',
      Used: utilization.icuUsed,
      Available: utilization.icuAvailable,
      utilPercent: Math.round((utilization.icuUsed / utilization.icuAvailable) * 100),
    },
    {
      name: 'Ventilators',
      Used: utilization.ventilatorsUsed,
      Available: utilization.ventilatorsAvailable,
      utilPercent: Math.round((utilization.ventilatorsUsed / utilization.ventilatorsAvailable) * 100),
    },
  ];

  const getBarColor = (percent: number) => {
    if (percent >= 90) return '#ff4444';
    if (percent >= 70) return '#ff8c00';
    if (percent >= 50) return '#ffd700';
    return '#00ff88';
  };



  return (
    <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="text-sm font-semibold text-white mb-1">Resource Utilization</h3>
      <p className="text-[10px] text-slate-500 mb-3">Used vs. available hospital resources</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip content={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props: any) => {
            const { active, payload, label } = props;
            if (active && payload && payload.length) {
              const item = data.find(d => d.name === label);
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-emerald-400">Used: {payload[0]?.value}</p>
                  <p className="text-xs text-slate-400">Available: {payload[1]?.value}</p>
                  <p className="text-xs mt-1" style={{ color: getBarColor(item?.utilPercent || 0) }}>
                    {item?.utilPercent}% utilization
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {label === 'Doctors' && 'Physicians assigned to treat patients based on priority'}
                    {label === 'ICU Beds' && 'ICU beds reserved for P1 Critical patients only'}
                    {label === 'Ventilators' && 'Assigned to respiratory failure and critical cases'}
                  </p>
                </div>
              );
            }
            return null;
          }} />
          <Legend
            formatter={(value: string) => <span className="text-xs text-slate-400">{value}</span>}
          />
          <Bar dataKey="Used" radius={[4, 4, 0, 0]} animationDuration={800}>
            {data.map((entry, index) => (
              <Cell key={`used-${index}`} fill={getBarColor(entry.utilPercent)} />
            ))}
          </Bar>
          <Bar dataKey="Available" fill="#1e293b" radius={[4, 4, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
