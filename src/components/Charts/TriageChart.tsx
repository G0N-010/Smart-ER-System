// Patient Triage Breakdown — Donut Chart
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { SimulationSummary } from '../../simulation/types';
import { TRIAGE_CONFIG } from '../../constants/medicalData';

interface TriageChartProps {
  summary: SimulationSummary;
}

const COLORS = [
  TRIAGE_CONFIG.P1.color,
  TRIAGE_CONFIG.P2.color,
  TRIAGE_CONFIG.P3.color,
  TRIAGE_CONFIG.P4.color,
];

export default function TriageChart({ summary }: TriageChartProps) {
  const data = [
    { name: 'P1 Critical', value: summary.triageBreakdown.p1, color: COLORS[0] },
    { name: 'P2 Urgent', value: summary.triageBreakdown.p2, color: COLORS[1] },
    { name: 'P3 Semi-Urgent', value: summary.triageBreakdown.p3, color: COLORS[2] },
    { name: 'P4 Non-Urgent', value: summary.triageBreakdown.p4, color: COLORS[3] },
  ];

  const total = data.reduce((s, d) => s + d.value, 0);



  return (
    <div className="glass-card p-4 animate-fade-in-up">
      <h3 className="text-sm font-semibold text-white mb-1">Triage Breakdown</h3>
      <p className="text-[10px] text-slate-500 mb-3">Distribution of patient severity levels</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props: any) => {
            const { active, payload } = props;
            if (active && payload && payload.length) {
              const entry = payload[0];
              const percent = ((entry.value / total) * 100).toFixed(1);
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-sm font-semibold" style={{ color: entry.payload.color }}>
                    {entry.name}
                  </p>
                  <p className="text-xs text-slate-300">
                    {entry.value} patients ({percent}%)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {entry.name.includes('Critical') && 'Highest priority — life-threatening conditions'}
                    {entry.name.includes('Urgent') && 'High priority — requires rapid treatment'}
                    {entry.name.includes('Semi') && 'Moderate priority — stable but needs attention'}
                    {entry.name.includes('Non') && 'Low priority — can safely wait'}
                  </p>
                </div>
              );
            }
            return null;
          }} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => <span className="text-xs text-slate-400">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-20px' }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-[10px] text-slate-500">Total</div>
        </div>
      </div>
    </div>
  );
}
