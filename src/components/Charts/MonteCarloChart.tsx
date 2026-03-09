// Monte Carlo Output — Line chart with confidence interval band + animated stats
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import type { MonteCarloOutput } from '../../simulation/types';
import { useCountUp } from '../../hooks/useCountUp';

interface MonteCarloChartProps {
  mcData: MonteCarloOutput;
}

// Animated stat cell for the Monte Carlo stats row
function MCStatCell({
  value,
  suffix,
  prefix,
  decimals,
  label,
  color,
  delay,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
  color: string;
  delay: number;
}) {
  const { count, ref, hasStarted } = useCountUp({
    end: value,
    duration: 1800,
    delay,
    decimals: decimals ?? 1,
  });

  return (
    <div ref={ref} className="text-center p-2 rounded-lg bg-slate-800/50">
      <div
        className={`text-lg font-bold ${color} tabular-nums transition-all duration-500 ${
          hasStarted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-90'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {prefix}{count}{suffix}
      </div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

export default function MonteCarloChart({ mcData }: MonteCarloChartProps) {
  // Sample iterations for display (show every 10th point for performance)
  const sampledData = mcData.iterationData
    .filter((_, i) => i % 5 === 0 || i === mcData.iterationData.length - 1)
    .map(d => ({
      ...d,
      upperBound: mcData.avgWaitTimeUpper,
      lowerBound: mcData.avgWaitTimeLower,
      mean: mcData.avgWaitTimeMean,
    }));



  return (
    <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Monte Carlo Analysis</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
          {mcData.iterations} iterations
        </span>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">
        Wait time distribution with 95% confidence interval band
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={sampledData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="iteration"
            stroke="#64748b"
            tick={{ fontSize: 10 }}
            label={{ value: 'Iteration', position: 'insideBottomRight', offset: -5, style: { fontSize: 10, fill: '#64748b' } }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 10 }}
            label={{ value: 'Wait (min)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
          />
          <Tooltip content={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props: any) => {
            const { active, payload, label } = props;
            if (active && payload && payload.length) {
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-sm font-semibold text-white">Iteration #{label}</p>
                  <p className="text-xs text-amber-400">
                    Wait Time: {payload[0]?.value?.toFixed(1)} min
                  </p>
                  <p className="text-xs text-emerald-400">
                    Mean: {mcData.avgWaitTimeMean.toFixed(1)} min
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    95% CI: [{mcData.avgWaitTimeLower.toFixed(1)} – {mcData.avgWaitTimeUpper.toFixed(1)}] min
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Each iteration uses the same config but different random seed
                  </p>
                </div>
              );
            }
            return null;
          }} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-slate-400">
                {value === 'avgWaitTime' ? 'Iteration Result' : value === 'mean' ? 'Mean' : '95% CI Band'}
              </span>
            )}
          />
          {/* CI Band */}
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="#f59e0b"
            fillOpacity={0.1}
            name="95% CI Band"
            animationDuration={800}
          />
          {/* Individual iteration line */}
          <Line
            type="monotone"
            dataKey="avgWaitTime"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            name="avgWaitTime"
            animationDuration={800}
          />
          {/* Mean line */}
          <Line
            type="monotone"
            dataKey="mean"
            stroke="#00ff88"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="mean"
            animationDuration={800}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Stats row — with count-up animations */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MCStatCell
          value={mcData.avgWaitTimeMean}
          suffix="m"
          decimals={1}
          label="Mean Wait"
          color="text-emerald-400"
          delay={0}
        />
        <MCStatCell
          value={Math.round((mcData.avgWaitTimeUpper - mcData.avgWaitTimeMean) * 10) / 10}
          prefix="±"
          suffix="m"
          decimals={1}
          label="95% CI"
          color="text-amber-400"
          delay={200}
        />
        <MCStatCell
          value={mcData.exhaustionMean}
          decimals={1}
          label="Avg Exhaustion"
          color="text-red-400"
          delay={400}
        />
      </div>
    </div>
  );
}
